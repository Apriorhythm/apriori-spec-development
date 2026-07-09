'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { parseDelta, deltaOpCount, merge, archiveStamp, archiveChangeDir, cli } = require('../lib/archive-merge');
const fs = require('fs');
const os = require('os');
const path = require('path');

function tmpFile(content) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-amc-'));
  const f = path.join(d, 'f.md');
  fs.writeFileSync(f, content);
  return f;
}

const STORE = [
  '# Store', '',
  '### Requirement: Alpha', 'Alpha behaves.', '',
  '#### Scenario: AL-01 alpha', '- THEN ok', '',
  '### Requirement: Beta', 'Beta old.', '',
  '#### Scenario: BE-01 beta', '- THEN ok', '',
].join('\n');

test('AM-01 ADDED appends a new requirement', () => {
  const delta = parseDelta('## ADDED Requirements\n### Requirement: Gamma\nNew.\n');
  const r = merge(STORE, delta, 'c');
  assert.deepStrictEqual(r.merged, ['Gamma']);
  assert.ok(r.store.has('Gamma'));
  assert.strictEqual(r.conflicts.length, 0);
});

test('AM-02 MODIFIED replaces the existing block', () => {
  const delta = parseDelta('## MODIFIED Requirements\n### Requirement: Beta\nBeta NEW.\n');
  const r = merge(STORE, delta, 'c');
  assert.deepStrictEqual(r.modified, ['Beta']);
  assert.match(r.store.get('Beta'), /Beta NEW\./);
});

test('AM-03 REMOVED marks the block deprecated, not deleted', () => {
  const delta = parseDelta('## REMOVED Requirements\n### Requirement: Alpha\nGone.\n');
  const r = merge(STORE, delta, 'drop-alpha');
  assert.deepStrictEqual(r.deprecated, ['Alpha']);
  assert.ok(r.store.has('Alpha'));
  assert.match(r.store.get('Alpha'), /deprecated \(superseded by drop-alpha\)/);
});

test('AM-04 same-ID conflict stops without writing', () => {
  const dupAdd = merge(STORE, parseDelta('## ADDED Requirements\n### Requirement: Beta\nDup.\n'), 'c');
  assert.strictEqual(dupAdd.conflicts.length, 1);
  const missMod = merge(STORE, parseDelta('## MODIFIED Requirements\n### Requirement: Ghost\nX.\n'), 'c');
  assert.strictEqual(missMod.conflicts.length, 1);
  // CLI layer: conflict → exit 1 and the store file is left byte-for-byte untouched
  const store = tmpFile(STORE);
  const delta = tmpFile('## ADDED Requirements\n### Requirement: Beta\nDup.\n');
  const before = fs.readFileSync(store, 'utf8');
  const code = cli(['--store', store, '--delta', delta, '--change', 'c', '--write']);
  assert.strictEqual(code, 1);
  assert.strictEqual(fs.readFileSync(store, 'utf8'), before);   // nothing written
});

test('AM-05 the action lists every merged/modified/deprecated ID', () => {
  const delta = parseDelta(
    '## ADDED Requirements\n### Requirement: Gamma\nG.\n' +
    '## MODIFIED Requirements\n### Requirement: Beta\nB2.\n' +
    '## REMOVED Requirements\n### Requirement: Alpha\nA.\n');
  const r = merge(STORE, delta, 'c');
  assert.deepStrictEqual([r.merged, r.modified, r.deprecated], [['Gamma'], ['Beta'], ['Alpha']]);
  // CLI layer: clean dry-run → exit 0, store untouched (no --write), and stdout lists IDs by category
  const store = tmpFile(STORE);
  const dfile = tmpFile('## ADDED Requirements\n### Requirement: Gamma\nG.\n' +
    '## MODIFIED Requirements\n### Requirement: Beta\nB2.\n' +
    '## REMOVED Requirements\n### Requirement: Alpha\nA.\n');
  const before = fs.readFileSync(store, 'utf8');
  const orig = console.log; const out = [];
  console.log = (...a) => out.push(a.join(' '));
  try { assert.strictEqual(cli(['--store', store, '--delta', dfile, '--change', 'c']), 0); }
  finally { console.log = orig; }
  const printed = out.join('\n');
  assert.match(printed, /merged \(ADDED\): Gamma/);
  assert.match(printed, /modified \(MODIFIED\): Beta/);
  assert.match(printed, /deprecated \(REMOVED\): Alpha/);
  assert.strictEqual(fs.readFileSync(store, 'utf8'), before);   // dry-run doesn't write
});

test('AM-07 RENAMED renames a requirement in place, preserving content', () => {
  const delta = parseDelta('## RENAMED Requirements\n- Beta -> Bravo\n');
  const r = merge(STORE, delta, 'c');
  assert.deepStrictEqual(r.renamed, ['Beta -> Bravo']);
  assert.ok(r.store.has('Bravo') && !r.store.has('Beta'));
  assert.match(r.store.get('Bravo'), /### Requirement: Bravo/);
  assert.match(r.store.get('Bravo'), /Beta old\./);            // content preserved
  assert.match(r.store.get('Bravo'), /BE-01 beta/);            // its scenario preserved
  // conflicts: missing source, or target already exists
  assert.strictEqual(merge(STORE, parseDelta('## RENAMED Requirements\n- Ghost -> X\n'), 'c').conflicts.length, 1);
  assert.strictEqual(merge(STORE, parseDelta('## RENAMED Requirements\n- Beta -> Alpha\n'), 'c').conflicts.length, 1);
  // CLI layer: success prints "renamed (RENAMED)"; a conflict exits 1 and writes nothing
  const store = tmpFile(STORE);
  const orig = console.log, out = [];
  console.log = (...a) => out.push(a.join(' '));
  try { assert.strictEqual(cli(['--store', store, '--delta', tmpFile('## RENAMED Requirements\n- Beta -> Bravo\n'), '--change', 'c']), 0); }
  finally { console.log = orig; }
  assert.match(out.join('\n'), /renamed \(RENAMED\): Beta -> Bravo/);
  const store2 = tmpFile(STORE), before = fs.readFileSync(store2, 'utf8');
  assert.strictEqual(cli(['--store', store2, '--delta', tmpFile('## RENAMED Requirements\n- Ghost -> X\n'), '--change', 'c', '--write']), 1);
  assert.strictEqual(fs.readFileSync(store2, 'utf8'), before);   // conflict → nothing written
});

test('AM-06 archive moves the in-flight change under a dated (date-time) archive dir', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-am-'));
  const changes = path.join(base, 'changes');
  fs.mkdirSync(path.join(changes, 'add-playback'), { recursive: true });
  fs.writeFileSync(path.join(changes, 'add-playback', 'flow-state.md'), 'x');
  const now = new Date(2026, 6, 6, 6, 57); // 2026-07-06T0657
  const dest = archiveChangeDir(changes, 'add-playback', now);
  assert.strictEqual(path.basename(dest), '2026-07-06T0657-add-playback');
  assert.ok(fs.existsSync(path.join(dest, 'flow-state.md')));
  assert.ok(!fs.existsSync(path.join(changes, 'add-playback')));
  // stamp is colon-free date-time
  assert.strictEqual(archiveStamp(now), '2026-07-06T0657');
});

test('AM-08 a content-bearing delta that parses to zero operations is a hard error', () => {
  // pure helper: opcount of an empty vs real delta
  assert.strictEqual(deltaOpCount(parseDelta('nothing here\n')), 0);
  assert.ok(deltaOpCount(parseDelta('## ADDED Requirements\n\n### Requirement: X\ntext\n')) > 0);
  // cli: wrong heading level (h3 section instead of h2) → parses to 0 ops → error, nothing written, exit 1
  const store = tmpFile('# spec\n\n### Requirement: Old\nbody\n');
  const before = fs.readFileSync(store, 'utf8');
  const badDelta = tmpFile('### ADDED Requirements\n\n#### Requirement: New\nstuff\n');   // wrong levels
  const errs = [], outs = [];
  const origErr = console.error, origLog = console.log;
  console.error = (...a) => errs.push(a.join(' '));
  console.log = (...a) => outs.push(a.join(' '));
  let code;
  try { code = cli(['--store', store, '--delta', badDelta, '--change', 'c', '--write']); }
  finally { console.error = origErr; console.log = origLog; }
  assert.strictEqual(code, 1);
  const err = errs.join('\n');
  assert.match(err, /parsed 0 delta operations/);
  assert.match(err, /## ADDED\|MODIFIED\|REMOVED Requirements/);
  assert.match(err, /### Requirement:/);
  assert.match(err, /RENAMED/);
  assert.doesNotMatch(outs.join('\n'), /RESULT: MERGED/);        // never claims a merge happened
  assert.strictEqual(fs.readFileSync(store, 'utf8'), before);    // nothing written
  // a genuinely empty (whitespace-only) delta is NOT flagged by this guard — it reaches the
  // normal path: clean dry-run, exit 0, and no "0 delta operations" error
  const emptyDelta = tmpFile('   \n\n');
  const e2 = [], o2 = [];
  console.error = (...a) => e2.push(a.join(' ')); console.log = (...a) => o2.push(a.join(' '));
  let code2;
  try { code2 = cli(['--store', store, '--delta', emptyDelta, '--change', 'c']); }
  finally { console.error = origErr; console.log = origLog; }
  assert.strictEqual(code2, 0);
  assert.doesNotMatch(e2.join('\n'), /0 delta operations/);
  assert.match(o2.join('\n'), /RESULT: MERGED \(dry-run/);
});

test('AM-09 the first archive in a repo creates the store file', () => {
  const os = require('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-am9-'));
  const store = path.join(dir, 'specs', 'kv', 'spec.md');   // nested, nonexistent
  const delta = tmpFile('## ADDED Requirements\n### Requirement: Fresh\nNew stuff.\n');
  const out = [];
  const orig = console.log; console.log = (...a) => out.push(a.join(' '));
  let code;
  try { code = cli(['--store', store, '--delta', delta, '--change', 'c', '--write']); }
  finally { console.log = orig; }
  assert.strictEqual(code, 0);
  assert.match(out.join('\n'), /does not exist yet — will be created/);
  assert.match(fs.readFileSync(store, 'utf8'), /### Requirement: Fresh/);
});

test('AM-10 re-running an already-merged delta is an idempotent no-op', () => {
  const block = '## ADDED Requirements\n### Requirement: Gamma\nG content.\n';
  const store = tmpFile('### Requirement: Gamma\nG content.\n');   // already merged
  const delta = tmpFile(block);
  const before = fs.readFileSync(store, 'utf8');
  const out = [];
  const orig = console.log; console.log = (...a) => out.push(a.join(' '));
  let code;
  try { code = cli(['--store', store, '--delta', delta, '--change', 'c', '--write']); }
  finally { console.log = orig; }
  assert.strictEqual(code, 0);                                    // no conflict
  assert.match(out.join('\n'), /already merged \(no-op\): Gamma/);
  assert.doesNotMatch(out.join('\n'), /CONFLICT/);
  assert.strictEqual(fs.readFileSync(store, 'utf8').trim(), before.trim());
  // genuinely different content with the same ID is still a conflict
  const delta2 = tmpFile('## ADDED Requirements\n### Requirement: Gamma\nDIFFERENT.\n');
  const code2 = cli(['--store', store, '--delta', delta2, '--change', 'c', '--write']);
  assert.strictEqual(code2, 1);
});

test('AM-10b rename-aware idempotency: same-delta RENAMED+ADDED collides; rename rerun is a no-op', () => {
  // same delta renames Alpha->Gamma AND adds an identical Gamma → collision, not no-op
  const d1 = parseDelta('## RENAMED Requirements\n- Alpha -> Gamma\n## ADDED Requirements\n### Requirement: Gamma\nAlpha behaves.\n\n#### Scenario: AL-01 alpha\n- THEN ok\n');
  const r1 = merge(STORE, d1, 'c');
  assert.ok(r1.conflicts.some((c) => /ADDED 'Gamma' already exists/.test(c)));
  // rerun of a rename-only delta: source gone, target present → already-renamed no-op
  const renamedStore = STORE.replace('### Requirement: Beta', '### Requirement: Bravo');
  const r2 = merge(renamedStore, parseDelta('## RENAMED Requirements\n- Beta -> Bravo\n'), 'c');
  assert.strictEqual(r2.conflicts.length, 0);
  assert.ok(r2.unchanged.some((u) => /Beta -> Bravo \(already renamed\)/.test(u)));
});
