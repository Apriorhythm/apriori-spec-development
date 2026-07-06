'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { parseDelta, merge, archiveStamp, archiveChangeDir, cli } = require('../lib/archive-merge');
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
