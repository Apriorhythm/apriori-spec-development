'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');
const am = require('../lib/archive-merge');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
function run(args, cwd) { return spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd }); }

function mkProject(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-arch-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return root;
}

const STORE_A = '### Requirement: Alpha\n\n#### Scenario: XA-01 a\n- t\n';
const STORE_B = '### Requirement: Bravo\n\n#### Scenario: XV-01 b\n- t\n';
const ADD_A = '## ADDED Requirements\n\n### Requirement: Alpha2\n\n#### Scenario: XA-09 n\n- t\n';
const ADD_B = '## ADDED Requirements\n\n### Requirement: Bravo2\n\n#### Scenario: XV-09 n\n- t\n';

function twoModuleProject(extra = {}) {
  return mkProject({
    'apriori/specs/a/spec.md': STORE_A,
    'apriori/specs/b/spec.md': STORE_B,
    'apriori/changes/c/specs/a/spec.md': ADD_A,
    'apriori/changes/c/specs/b/spec.md': ADD_B,
    ...extra,
  });
}

test('AM-13 dry-run reports the whole change per module and writes nothing', () => {
  const root = twoModuleProject();
  const before = [fs.readFileSync(path.join(root, 'apriori/specs/a/spec.md'), 'utf8'),
                  fs.readFileSync(path.join(root, 'apriori/specs/b/spec.md'), 'utf8')];
  const r = run(['archive', '--change', 'c'], root);
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /a[\/\\]spec\.md/);
  assert.match(r.stdout, /b[\/\\]spec\.md/);
  assert.match(r.stdout, /Alpha2/);
  assert.match(r.stdout, /Bravo2/);
  assert.match(r.stdout, /RESULT:/);
  assert.strictEqual(fs.readFileSync(path.join(root, 'apriori/specs/a/spec.md'), 'utf8'), before[0]);
  assert.strictEqual(fs.readFileSync(path.join(root, 'apriori/specs/b/spec.md'), 'utf8'), before[1]);
  assert.ok(!fs.existsSync(path.join(root, 'apriori/specs/a/spec.md.tmp-archive')));
});

test('AM-14 any preflight failure means nothing is written (conflict in one module)', () => {
  const root = twoModuleProject({
    'apriori/changes/c/specs/b/spec.md': '## MODIFIED Requirements\n\n### Requirement: NoSuch\n\n#### Scenario: XN-01 x\n- t\n',
  });
  const beforeA = fs.readFileSync(path.join(root, 'apriori/specs/a/spec.md'), 'utf8');
  const r = run(['archive', '--change', 'c', '--write'], root);
  assert.strictEqual(r.status, 1);
  assert.match(r.stdout + r.stderr, /NoSuch/);
  assert.strictEqual(fs.readFileSync(path.join(root, 'apriori/specs/a/spec.md'), 'utf8'), beforeA);  // module a NOT committed
  assert.ok(!fs.existsSync(path.join(root, 'apriori/specs/a/spec.md.tmp-archive')));                 // no temp residue
});

test('AM-15 a mid-commit failure is reported exactly (DI-injected rename failure)', () => {
  const root = twoModuleProject();
  let renames = 0;
  const ops = {
    writeFileSync: fs.writeFileSync.bind(fs),
    rmSync: fs.rmSync.bind(fs),
    renameSync: (a, b) => { renames++; if (renames === 2) throw new Error('injected rename failure'); fs.renameSync(a, b); },
  };
  const res = am.archiveChange({ cwd: root, change: 'c', write: true, ops });
  assert.strictEqual(res.code, 1);
  const text = res.out.concat(res.err).join('\n');
  assert.match(text, /a[\/\\]spec\.md/);           // committed module named
  assert.match(text, /b[\/\\]spec\.md/);           // not-committed module named
  assert.match(text, /tmp-archive/);               // remaining temp named for manual completion
  assert.match(fs.readFileSync(path.join(root, 'apriori/specs/a/spec.md'), 'utf8'), /Alpha2/);   // first committed, kept
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'apriori/specs/b/spec.md'), 'utf8'), /Bravo2/);
  assert.ok(fs.existsSync(path.join(root, 'apriori/specs/b/spec.md.tmp-archive')));              // artifact remains
});

test('AM-16 a pre-existing temp file blocks the run and stays untouched', () => {
  const root = twoModuleProject({ 'apriori/specs/b/spec.md.tmp-archive': 'RECOVERY ARTIFACT' });
  const beforeA = fs.readFileSync(path.join(root, 'apriori/specs/a/spec.md'), 'utf8');
  const r = run(['archive', '--change', 'c', '--write'], root);
  assert.strictEqual(r.status, 1);
  assert.match(r.stdout + r.stderr, /tmp-archive/);
  assert.strictEqual(fs.readFileSync(path.join(root, 'apriori/specs/b/spec.md.tmp-archive'), 'utf8'), 'RECOVERY ARTIFACT');
  assert.strictEqual(fs.readFileSync(path.join(root, 'apriori/specs/a/spec.md'), 'utf8'), beforeA);
});

test('AM-17 zero discovered delta files fail closed (exit 2 naming the path)', () => {
  const missing = mkProject({ 'apriori/specs/a/spec.md': STORE_A });
  const r1 = run(['archive', '--change', 'c'], missing);
  assert.strictEqual(r1.status, 2);
  assert.match(r1.stderr, /c/);
  const empty = mkProject({ 'apriori/specs/a/spec.md': STORE_A, 'apriori/changes/c/specs/.keep': '' });
  const r2 = run(['archive', '--change', 'c'], empty);
  assert.strictEqual(r2.status, 2);
  assert.match(r2.stderr, /specs/);
});

test('AM-18 the change-dir move waits for every store commit and needs explicit --changes-dir', () => {
  // without --changes-dir: stores written, no move
  const root1 = twoModuleProject();
  const r1 = run(['archive', '--change', 'c', '--write'], root1);
  assert.strictEqual(r1.status, 0);
  assert.match(fs.readFileSync(path.join(root1, 'apriori/specs/a/spec.md'), 'utf8'), /Alpha2/);
  assert.ok(fs.existsSync(path.join(root1, 'apriori/changes/c')));                    // NOT moved
  // with explicit --changes-dir: moved to archive/<stamp>-c after commit
  const root2 = twoModuleProject();
  const r2 = run(['archive', '--change', 'c', '--write', '--changes-dir', 'apriori/changes'], root2);
  assert.strictEqual(r2.status, 0);
  assert.ok(!fs.existsSync(path.join(root2, 'apriori/changes/c')));
  const archived = fs.readdirSync(path.join(root2, 'apriori/changes/archive'));
  assert.strictEqual(archived.length, 1);
  assert.match(archived[0], /^\d{4}-\d{2}-\d{2}T\d{4}-c$/);
  // move failure (DI): stores stay committed, exit 1
  const root3 = twoModuleProject();
  let renames = 0;
  const ops = {
    writeFileSync: fs.writeFileSync.bind(fs),
    rmSync: fs.rmSync.bind(fs),
    renameSync: (a, b) => { renames++; if (renames === 3) throw new Error('injected move failure'); fs.renameSync(a, b); },
  };
  const res = am.archiveChange({ cwd: root3, change: 'c', changesDir: 'apriori/changes', changesDirExplicit: true, write: true, ops });
  assert.strictEqual(res.code, 1);
  assert.match(fs.readFileSync(path.join(root3, 'apriori/specs/a/spec.md'), 'utf8'), /Alpha2/);   // committed stays
  assert.ok(fs.existsSync(path.join(root3, 'apriori/changes/c')));                                // move failed → still in place
});

test('AM-19 high-level and single-file forms are mutually exclusive', () => {
  const root = twoModuleProject();
  for (const extra of [['--store', 'x.md'], ['--delta', 'y.md']]) {
    const r = run(['archive', '--change', 'c', ...extra], root);
    assert.strictEqual(r.status, 2);
  }
});

test('AM-20 per-file delta hygiene guards the whole set', () => {
  const cases = [
    ['   \n', /a[\/\\]spec\.md/],                                        // whitespace-only
    ['# prose only, no sections\n', /a[\/\\]spec\.md/],                  // zero ops despite content
    ['## ADDED Requirements\n\n### Requirement: Dup\n\n#### Scenario: XD-01 a\n- t\n\n### Requirement: Dup\n\n#### Scenario: XD-02 b\n- t\n', /Dup/],  // duplicate names
  ];
  for (const [bad, frag] of cases) {
    const root = twoModuleProject({ 'apriori/changes/c/specs/a/spec.md': bad });
    const beforeB = fs.readFileSync(path.join(root, 'apriori/specs/b/spec.md'), 'utf8');
    const r = run(['archive', '--change', 'c', '--write'], root);
    assert.strictEqual(r.status, 1);
    assert.match(r.stdout + r.stderr, frag);
    assert.strictEqual(fs.readFileSync(path.join(root, 'apriori/specs/b/spec.md'), 'utf8'), beforeB);  // healthy module also not written
  }
});

test('AM-21 duplicate requirement names in the store are corruption (conflict)', () => {
  const dupStore = STORE_A + '\n### Requirement: Alpha\n\n#### Scenario: XA-02 dup\n- t\n';
  const { conflicts } = am.merge(dupStore, am.parseDelta(ADD_A), 'c');
  assert.ok(conflicts.some((c) => c.includes('Alpha')));
});

test('AM-22 realpath containment governs every participating path', () => {
  // unit level (no symlink needed): outside target rejected, inside accepted, missing-ancestor rule
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-cont-'));
  fs.mkdirSync(path.join(root, 'inside', 'sub'), { recursive: true });
  fs.mkdirSync(path.join(root, 'outside'));
  assert.strictEqual(am.containsReal(path.join(root, 'inside'), path.join(root, 'inside', 'sub')), true);
  assert.strictEqual(am.containsReal(path.join(root, 'inside'), path.join(root, 'outside')), false);
  assert.strictEqual(am.containsReal(path.join(root, 'inside'), path.join(root, 'inside', 'new', 'file.md')), true);   // ancestor walk
  assert.strictEqual(am.containsReal(path.join(root, 'inside'), path.join(root, 'outside', 'new', 'file.md')), false);
  assert.strictEqual(am.containsReal(path.join(root, 'inside'), path.join(root, 'inside')), false);                    // strict: root itself not "inside"
  // integration with a symlinked delta escaping the change root — where the platform allows symlinks
  let canSymlink = true;
  const probeTarget = path.join(root, 'outside', 'real.md');
  fs.writeFileSync(probeTarget, ADD_A);
  try { fs.symlinkSync(probeTarget, path.join(root, 'probe-link.md')); } catch { canSymlink = false; }
  if (canSymlink) {
    const proj = twoModuleProject();
    const evil = path.join(root, 'outside', 'evil.md');
    fs.writeFileSync(evil, ADD_A);
    fs.symlinkSync(evil, path.join(proj, 'apriori/changes/c/specs/a/spec.md.evil.md'));
    const r = run(['archive', '--change', 'c'], proj);
    assert.strictEqual(r.status, 2);
    assert.match(r.stderr, /evil/);
    // a symlinked specs/ dir must not become the containment root (IMPL-1)
    const proj2 = mkProject({ 'apriori/specs/a/spec.md': STORE_A });
    fs.mkdirSync(path.join(proj2, 'apriori/changes/c'), { recursive: true });
    const outsideSpecs = path.join(root, 'outside', 'fake-specs');
    fs.mkdirSync(path.join(outsideSpecs, 'a'), { recursive: true });
    fs.writeFileSync(path.join(outsideSpecs, 'a', 'spec.md'), ADD_A);
    fs.symlinkSync(outsideSpecs, path.join(proj2, 'apriori/changes/c/specs'));
    const r2 = run(['archive', '--change', 'c'], proj2);
    assert.strictEqual(r2.status, 2);
    assert.match(r2.stderr, /specs/);
    // a symlinked SUBDIR escaping the tree is an error, never silently skipped (IMPL-1)
    const proj3 = mkProject({ 'apriori/specs/a/spec.md': STORE_A, 'apriori/changes/c/specs/.keep': '' });
    const outsideMod = path.join(root, 'outside', 'mod');
    fs.mkdirSync(outsideMod, { recursive: true });
    fs.writeFileSync(path.join(outsideMod, 'spec.md'), ADD_A);
    fs.symlinkSync(outsideMod, path.join(proj3, 'apriori/changes/c/specs/a'));
    const r3 = run(['archive', '--change', 'c'], proj3);
    assert.strictEqual(r3.status, 2);
    // a symlinked move DESTINATION (archive/) pointing outside is rejected before any move
    const proj4 = twoModuleProject();
    const outsideArch = path.join(root, 'outside', 'arch');
    fs.mkdirSync(outsideArch, { recursive: true });
    fs.symlinkSync(outsideArch, path.join(proj4, 'apriori/changes/archive'));
    const r4 = run(['archive', '--change', 'c', '--write', '--changes-dir', 'apriori/changes'], proj4);
    assert.strictEqual(r4.status, 2);
    assert.match(r4.stderr, /archive destination/);
    assert.doesNotMatch(fs.readFileSync(path.join(proj4, 'apriori/specs/a/spec.md'), 'utf8'), /Alpha2/);  // nothing written
  }
});

test('AM-23 malformed or duplicated stamps are hygiene errors', () => {
  const good = am.fingerprint(STORE_A);
  const cases = [
    `<!-- apriori-base: sha256:zzz -->\n${ADD_A}`,                                        // malformed digest
    `<!-- apriori-base: ${good} -->\n<!-- apriori-base: new -->\n${ADD_A}`,               // two stamps
    `${ADD_A}\n<!-- apriori-base: ${good} -->\n`,                                         // stamp after first section
    `<!-- apriori-base ${good} -->\n${ADD_A}`,                                            // structurally malformed (no colon) — must NOT silently disable CAS
  ];
  for (const bad of cases) {
    const root = twoModuleProject({ 'apriori/changes/c/specs/a/spec.md': bad });
    const r = run(['archive', '--change', 'c', '--write'], root);
    assert.strictEqual(r.status, 1, bad.slice(0, 30));
    assert.match(r.stdout + r.stderr, /a[\/\\]spec\.md/);
  }
});

test('AM-24 a diverged stamp stops archive before any write, on both surfaces', () => {
  const stale = `<!-- apriori-base: sha256:${'0'.repeat(64)} -->\n${ADD_A}`;
  // high-level form
  const root1 = twoModuleProject({ 'apriori/changes/c/specs/a/spec.md': stale });
  const beforeA = fs.readFileSync(path.join(root1, 'apriori/specs/a/spec.md'), 'utf8');
  const r1 = run(['archive', '--change', 'c', '--write'], root1);
  assert.strictEqual(r1.status, 1);
  assert.match(r1.stdout + r1.stderr, /sha256:/);
  assert.strictEqual(fs.readFileSync(path.join(root1, 'apriori/specs/a/spec.md'), 'utf8'), beforeA);
  // single-file form
  const root2 = mkProject({ 'store.md': STORE_A, 'delta.md': stale });
  const r2 = run(['archive', '--store', 'store.md', '--delta', 'delta.md', '--change', 'c', '--write'], root2);
  assert.strictEqual(r2.status, 1);
  assert.match(r2.stdout + r2.stderr, /sha256:/);
  assert.strictEqual(fs.readFileSync(path.join(root2, 'store.md'), 'utf8'), STORE_A);
});

test('AM-25 stamp-free ADDED-only deltas keep the pre-3.1 behavior', () => {
  const root1 = twoModuleProject();
  assert.strictEqual(run(['archive', '--change', 'c', '--write'], root1).status, 0);
  assert.match(fs.readFileSync(path.join(root1, 'apriori/specs/a/spec.md'), 'utf8'), /Alpha2/);
  const root2 = mkProject({ 'store.md': STORE_A, 'delta.md': ADD_A });
  assert.strictEqual(run(['archive', '--store', 'store.md', '--delta', 'delta.md', '--change', 'c', '--write'], root2).status, 0);
  assert.match(fs.readFileSync(path.join(root2, 'store.md'), 'utf8'), /Alpha2/);
  // "no stamp, no check" never means "no stamp, no rules": a mutation falls to the deny rule
  const root3 = twoModuleProject({ 'apriori/changes/c/specs/a/spec.md': MOD_DIFF });
  assert.strictEqual(run(['archive', '--change', 'c', '--write'], root3).status, 1);
});

test('AM-26 the new sentinel matches only an absent store', () => {
  const delta = `<!-- apriori-base: new -->\n${ADD_A}`;
  // store absent → passes, creates module file on write
  const root = mkProject({
    'apriori/specs/b/spec.md': STORE_B,
    'apriori/changes/c/specs/newmod/spec.md': delta,
  });
  const r1 = run(['archive', '--change', 'c', '--write'], root);
  assert.strictEqual(r1.status, 0);
  assert.match(fs.readFileSync(path.join(root, 'apriori/specs/newmod/spec.md'), 'utf8'), /Alpha2/);
  // store now exists → the same stamped delta is a mismatch
  const root2 = mkProject({
    'apriori/specs/newmod/spec.md': STORE_A,
    'apriori/changes/c/specs/newmod/spec.md': delta,
  });
  const r2 = run(['archive', '--change', 'c', '--write'], root2);
  assert.strictEqual(r2.status, 1);
  assert.match(r2.stdout + r2.stderr, /new/);
});

test('AM-27 apriori stamp prints the current stamp line (all CLI branches)', async (t) => {
  const root = mkProject({ 'store.md': 'alpha\r\nbeta\n' });
  await t.test('existing file → matching stamp line, exit 0', () => {
    const r = run(['stamp', 'store.md'], root);
    assert.strictEqual(r.status, 0);
    assert.strictEqual(r.stdout.trim(), `<!-- apriori-base: ${am.fingerprint('alpha\r\nbeta\n')} -->`);
  });
  await t.test('CRLF normalization: same fingerprint as LF content', () => {
    assert.strictEqual(am.fingerprint('alpha\r\nbeta\n'), am.fingerprint('alpha\nbeta\n'));
    assert.strictEqual(am.fingerprint('alpha\rbeta\n'), am.fingerprint('alpha\nbeta\n'));
  });
  await t.test('absent path → the new form, exit 0', () => {
    const r = run(['stamp', 'no-such.md'], root);
    assert.strictEqual(r.status, 0);
    assert.strictEqual(r.stdout.trim(), '<!-- apriori-base: new -->');
  });
  await t.test('directory → error naming the path, exit 2', () => {
    const r = run(['stamp', '.'], root);
    assert.strictEqual(r.status, 2);
  });
  await t.test('zero or multiple arguments → usage, exit 2', () => {
    assert.strictEqual(run(['stamp'], root).status, 2);
    assert.strictEqual(run(['stamp', 'a.md', 'b.md'], root).status, 2);
  });
});

test('AM-10 REMOVED rerun: already-deprecated by this change is a no-op; by another change conflicts', () => {
  const removed = { ADDED: new Map(), MODIFIED: new Map(), REMOVED: new Map([['Alpha', '### Requirement: Alpha\n']]), RENAMED: [] };
  // first application deprecates
  const first = am.merge(STORE_A, removed, 'c');
  assert.deepStrictEqual(first.deprecated, ['Alpha']);
  const afterText = am.renderStore(STORE_A, first.store);
  // rerun on the deprecated store (same change) → no-op, not a conflict
  const rerun = am.merge(afterText, removed, 'c');
  assert.strictEqual(rerun.conflicts.length, 0);
  assert.ok(rerun.unchanged.some((u) => u.includes('Alpha')));
  // deprecated by a DIFFERENT change → conflict
  const other = am.merge(afterText, removed, 'other-change');
  assert.ok(other.conflicts.length > 0);
});

// ---- delta-consumption (AM-28..31): the parser consumes its whole input ----

// reference: the pre-rewrite split()-based parse, kept verbatim so the corpus
// test can assert the walker reproduces it byte-identically on well-formed input
function referenceParseDelta(text) {
  const SECTION = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/m;
  const REQ = /^###\s+Requirement:\s+(.+?)\s*$([\s\S]*?)(?=^###\s+Requirement:|$(?![\s\S]))/gm;
  const buckets = { ADDED: new Map(), MODIFIED: new Map(), REMOVED: new Map(), RENAMED: [] };
  const parts = text.split(SECTION);
  for (let i = 1; i < parts.length; i += 2) {
    const kind = parts[i];
    if (kind === 'RENAMED') {
      for (const m of parts[i + 1].matchAll(/^\s*-\s*(.+?)\s*->\s*(.+?)\s*$/gm))
        buckets.RENAMED.push([m[1].trim(), m[2].trim()]);
    } else {
      let m; REQ.lastIndex = 0;
      while ((m = REQ.exec(parts[i + 1])) !== null) {
        const name = m[1].trim();
        if (!buckets[kind].has(name)) buckets[kind].set(name, m[0].replace(/\s+$/, '') + '\n');
      }
    }
  }
  return buckets;
}

test('AM-28 a misspelled section heading is reported, never absorbed', () => {
  const delta = '# Delta — x (c)\n\n## ADDED Requirements\n\n### Requirement: Fine\n\n#### Scenario: DC-01 a\n- t\n\n## ADDDED Requirements\n\n### Requirement: WronglyClassified\n\n#### Scenario: DC-02 b\n- t\n';
  const { delta: buckets, problems } = am.parseDeltaStrict(delta);
  assert.ok(problems.some((p) => p.includes('ADDDED') && /line 10\b/.test(p)), JSON.stringify(problems));
  for (const kind of ['ADDED', 'MODIFIED', 'REMOVED'])
    assert.ok(!buckets[kind].has('WronglyClassified'), `WronglyClassified leaked into ${kind}`);
  assert.ok(buckets.ADDED.has('Fine'));
  // both surfaces fail closed
  const root = twoModuleProject({ 'apriori/changes/c/specs/a/spec.md': delta });
  assert.strictEqual(run(['archive', '--change', 'c', '--write'], root).status, 1);
  const r = run(['verify', '--change', 'c'], mkProject({
    'apriori/specs/a/spec.md': STORE_A,
    'apriori/changes/c/specs/a/spec.md': delta,
  }));
  assert.strictEqual(r.status, 2);
});

test('AM-29 structure outside its legal home is reported with line numbers', () => {
  const delta = '### Requirement: Early\n\n## RENAMED Requirements\n\n### Requirement: InsideRenamed\n- Old -> New\n\n## ADDED Requirements\n\n#### Scenario: DC-03 stray\n\n### Requirement: Ok\n\n#### Scenario: DC-04 fine\n- t\n';
  const { delta: buckets, problems } = am.parseDeltaStrict(delta);
  assert.ok(problems.some((p) => /line 1\b/.test(p) && /before any section/i.test(p)), JSON.stringify(problems));
  assert.ok(problems.some((p) => /line 5\b/.test(p) && /RENAMED/.test(p)), JSON.stringify(problems));
  assert.ok(problems.some((p) => /line 10\b/.test(p) && /[Ss]cenario/.test(p)), JSON.stringify(problems));
  assert.ok(buckets.ADDED.has('Ok'), 'legal block still parsed');
  assert.ok(!buckets.ADDED.has('Early') && !buckets.ADDED.has('InsideRenamed'));
  assert.deepStrictEqual(buckets.RENAMED, [], 'the illegal block body is never reinterpreted as rename lines');
});

test('AM-30 free text and fences stay legal; CRLF parses identically', () => {
  const delta = '# Delta — archive-merge (c)\n\nA note before any section.\n\n## ADDED Requirements\n\nSection preamble prose is fine.\n\n### Requirement: Fenced\n\nBody prose.\n\n```md\n## Bogus Heading\n### Requirement: InsideFence\n<!-- apriori-base: sha256:zzz -->\n```\n\n#### Scenario: DC-05 f\n- t\n\nTrailing notes without structure markers.\n';
  const lf = am.parseDeltaStrict(delta);
  assert.deepStrictEqual(lf.problems, []);
  assert.ok(lf.delta.ADDED.has('Fenced'));
  assert.ok(!lf.delta.ADDED.has('InsideFence'));
  assert.match(lf.delta.ADDED.get('Fenced'), /Bogus Heading/, 'fenced lines stay in the body');
  const crlf = am.parseDeltaStrict(delta.replace(/\n/g, '\r\n'));
  assert.deepStrictEqual(crlf.problems, []);
  assert.deepStrictEqual([...crlf.delta.ADDED.entries()], [...lf.delta.ADDED.entries()], 'CRLF block text identical to LF');
});

test('AM-30b regression corpus: every archived delta parses clean and identical to the old grammar', () => {
  const archRoot = path.join(__dirname, '..', 'apriori', 'changes', 'archive');
  if (!fs.existsSync(archRoot)) return;   // corpus is local-only (apriori/* untracked)
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && p.includes(`${path.sep}specs${path.sep}`) && p.endsWith('.md')) files.push(p);
    }
  })(archRoot);
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    const r = am.parseDeltaStrict(text);
    assert.deepStrictEqual(r.problems, [], `${f}: ${JSON.stringify(r.problems)}`);
    const ref = referenceParseDelta(text);
    for (const kind of ['ADDED', 'MODIFIED', 'REMOVED']) {
      assert.deepStrictEqual([...r.delta[kind].entries()], [...ref[kind].entries()], `${f} ${kind} differs from old grammar`);
    }
    assert.deepStrictEqual(r.delta.RENAMED, ref.RENAMED, `${f} RENAMED differs from old grammar`);
  }
});

test('AM-31 stamp problems carry line numbers', () => {
  const good = am.fingerprint(STORE_A);
  const cases = [
    [`<!-- apriori-base sha256:${'0'.repeat(64)} -->\n${ADD_A}`, /line 1\b/],   // malformed attempt (no colon)
    [`<!-- apriori-base: ${good} -->\n<!-- apriori-base: new -->\n${ADD_A}`, /line 2\b/],  // duplicate
    [`<!-- apriori-base: sha256:zzz -->\n${ADD_A}`, /line 1\b/],                // malformed digest
    [`${ADD_A}\n<!-- apriori-base: ${good} -->\n`, /line 8\b/],                 // late stamp (ADD_A is 7 lines)
  ];
  for (const [text, lineRe] of cases) {
    const { problems } = am.parseDeltaStrict(text);
    assert.ok(problems.length > 0, text.slice(0, 40));
    assert.ok(problems.some((p) => lineRe.test(p)), `${text.slice(0, 40)} → ${JSON.stringify(problems)}`);
  }
  // a stamp under a skipped unrecognized heading is attributed to NOTHING — never the delta stamp
  const skipped = am.parseDeltaStrict(`## ADDDED Requirements\n\n<!-- apriori-base: new -->\n\n${ADD_A}`);
  assert.strictEqual(skipped.stamp, null);
  assert.ok(skipped.problems.some((p) => p.includes('ADDDED')));
  assert.ok(!skipped.problems.some((p) => /apriori-base/.test(p)), 'covered by the heading problem, no flood');
});

// ---- cas-enforcement (AM-32..35): graded stamps + rerun repair ----

const MOD_SAME = '## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 a\n- t\n';   // trim-equal to STORE_A's block
const MOD_DIFF = '## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 a\n- CHANGED\n';
const STALE = `<!-- apriori-base: sha256:${'0'.repeat(64)} -->\n`;

test('AM-32 unstamped mutation deltas are denied on both archive forms', () => {
  // high-level form: errors, writes nothing
  const root = twoModuleProject({ 'apriori/changes/c/specs/a/spec.md': MOD_DIFF });
  const r = run(['archive', '--change', 'c', '--write'], root);
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /unstamped mutation delta/);
  assert.match(r.stdout + r.stderr, /apriori stamp/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'apriori/specs/a/spec.md'), 'utf8'), /CHANGED/);
  assert.ok(fs.existsSync(path.join(root, 'apriori/changes/c')), 'change dir not moved');
  // single-file form denies too
  const root2 = mkProject({ 'store.md': STORE_A, 'delta.md': MOD_DIFF });
  const r2 = run(['archive', '--store', 'store.md', '--delta', 'delta.md', '--change', 'c', '--write'], root2);
  assert.strictEqual(r2.status, 1);
  assert.match(r2.stdout + r2.stderr, /unstamped mutation delta/);
  assert.doesNotMatch(fs.readFileSync(path.join(root2, 'store.md'), 'utf8'), /CHANGED/);
  // ADDED-only stays exempt and quiet
  const root3 = twoModuleProject();
  const r3 = run(['archive', '--change', 'c', '--write'], root3);
  assert.strictEqual(r3.status, 0);
  assert.doesNotMatch(r3.stdout + r3.stderr, /unstamped mutation delta/);
});

test('AM-33 an already-applied stamped delta reruns to completion', () => {
  // store already carries the merged content; the stamp records a stale base → mismatch + all-unchanged
  const root = mkProject({
    'apriori/specs/a/spec.md': STORE_A,
    'apriori/changes/c/specs/a/spec.md': STALE + MOD_SAME,     // MODIFIED-only, trim-equal (the CE-1 case)
  });
  const before = fs.readFileSync(path.join(root, 'apriori/specs/a/spec.md'), 'utf8');
  const r = run(['archive', '--change', 'c', '--write', '--changes-dir', 'apriori/changes'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /rerun accepted/);
  assert.strictEqual(fs.readFileSync(path.join(root, 'apriori/specs/a/spec.md'), 'utf8'), before);
  assert.ok(!fs.existsSync(path.join(root, 'apriori/changes/c')), 'change dir must have moved');
  assert.ok(fs.readdirSync(path.join(root, 'apriori/changes/archive')).some((b) => b.endsWith('-c')));
});

test('AM-34 divergence with pending work never repairs; the resumed mix completes', () => {
  // (a) stale stamp + a REAL pending op → hard fail, nothing written or moved
  const rootA = mkProject({
    'apriori/specs/a/spec.md': STORE_A,
    'apriori/changes/c/specs/a/spec.md': STALE + MOD_DIFF,
  });
  const beforeA = fs.readFileSync(path.join(rootA, 'apriori/specs/a/spec.md'), 'utf8');
  const rA = run(['archive', '--change', 'c', '--write', '--changes-dir', 'apriori/changes'], rootA);
  assert.strictEqual(rA.status, 1);
  assert.match(rA.stdout + rA.stderr, /base mismatch/);
  assert.strictEqual(fs.readFileSync(path.join(rootA, 'apriori/specs/a/spec.md'), 'utf8'), beforeA);
  assert.ok(fs.existsSync(path.join(rootA, 'apriori/changes/c')), 'change dir must NOT move');
  // (b) the resumed-partial-commit mix: A stale-but-applied + B matching-with-real-ops → completes
  const goodB = am.fingerprint(STORE_B);
  const rootB = mkProject({
    'apriori/specs/a/spec.md': STORE_A,
    'apriori/specs/b/spec.md': STORE_B,
    'apriori/changes/c/specs/a/spec.md': STALE + MOD_SAME,
    'apriori/changes/c/specs/b/spec.md': `<!-- apriori-base: ${goodB} -->\n` + ADD_B,
  });
  const rB = run(['archive', '--change', 'c', '--write', '--changes-dir', 'apriori/changes'], rootB);
  assert.strictEqual(rB.status, 0, rB.stdout + rB.stderr);
  assert.match(rB.stdout + rB.stderr, /rerun accepted/);
  assert.match(fs.readFileSync(path.join(rootB, 'apriori/specs/b/spec.md'), 'utf8'), /Bravo2/);
  // (c) mixed with a diverged pending file → whole preflight fails, B untouched too
  const rootC = mkProject({
    'apriori/specs/a/spec.md': STORE_A,
    'apriori/specs/b/spec.md': STORE_B,
    'apriori/changes/c/specs/a/spec.md': STALE + MOD_SAME,
    'apriori/changes/c/specs/b/spec.md': STALE + '## MODIFIED Requirements\n\n### Requirement: Bravo\n\n#### Scenario: XV-01 b\n- CHANGED\n',
  });
  const rC = run(['archive', '--change', 'c', '--write', '--changes-dir', 'apriori/changes'], rootC);
  assert.strictEqual(rC.status, 1);
  assert.strictEqual(fs.readFileSync(path.join(rootC, 'apriori/specs/b/spec.md'), 'utf8'), STORE_B);
});

test('AM-35 MODIFIED speaks the idempotence vocabulary', () => {
  const sameBlock = '### Requirement: Alpha\n\n#### Scenario: XA-01 a\n- t\n';
  const same = am.merge(STORE_A, { ADDED: new Map(), MODIFIED: new Map([['Alpha', sameBlock]]), REMOVED: new Map(), RENAMED: [] }, 'c');
  assert.deepStrictEqual(same.modified, []);
  assert.ok(same.unchanged.includes('Alpha'), JSON.stringify(same.unchanged));
  const diff = am.merge(STORE_A, { ADDED: new Map(), MODIFIED: new Map([['Alpha', sameBlock.replace('- t', '- x')]]), REMOVED: new Map(), RENAMED: [] }, 'c');
  assert.deepStrictEqual(diff.modified, ['Alpha']);
});


// ---- change-bundle (AM-36..39): the atomic move carries the whole bundle ----

function bundleProject(extra = {}) {
  return mkProject({
    'apriori/specs/a/spec.md': STORE_A,
    'apriori/changes/c/flow-state.md': 'change: c\ntier: medium\n',
    'apriori/changes/c/specs/a/spec.md': ADD_A,
    'apriori/changes/c/requirement/req-v1.md': 'v1',
    'apriori/changes/c/requirement/req-final.md': 'final',
    'apriori/changes/c/requirement/intent-card.md': 'card',
    'apriori/changes/c/review/issues.md': '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n| Q-1 | i | low | 1 | verified |\n',
    'apriori/changes/c/review/req-review-v1.md': 'VERDICT: no major issues\n',
    'apriori/changes/c/review/req-review-v1-raw.txt': 'raw',
    'apriori/changes/c/gap-report.md': 'gap',
    ...extra,
  });
}
const bundleArchived = (root) => {
  const dirs = fs.readdirSync(path.join(root, 'apriori/changes/archive')).filter((b) => b.endsWith('-c'));
  return path.join(root, 'apriori/changes/archive', dirs[0]);
};

test('AM-36 the bundle travels whole', () => {
  const root = bundleProject();
  const r = run(['archive', '--change', 'c', '--write', '--changes-dir', 'apriori/changes'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout, /staged:|copy/);
  const A = bundleArchived(root);
  assert.deepStrictEqual(fs.readdirSync(path.join(A, 'requirement')).sort(), ['intent-card.md', 'req-final.md', 'req-v1.md']);
  assert.deepStrictEqual(fs.readdirSync(path.join(A, 'review')).sort(), ['issues.md', 'req-review-v1-raw.txt', 'req-review-v1.md']);
  assert.strictEqual(fs.readFileSync(path.join(A, 'gap-report.md'), 'utf8'), 'gap');
  assert.ok(!fs.existsSync(path.join(root, 'apriori/changes/c')), 'nothing left behind');
});

test('AM-37 the command touches nothing outside the moved dir', () => {
  // a stray file at the OLD requirement/ location is a bystander now — never read, never moved
  const root = bundleProject({ 'requirement/c-req-v1.md': 'legacy bystander' });
  const r = run(['archive', '--change', 'c', '--write', '--changes-dir', 'apriori/changes'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.strictEqual(fs.readFileSync(path.join(root, 'requirement/c-req-v1.md'), 'utf8'), 'legacy bystander');
  assert.doesNotMatch(r.stdout + r.stderr, /staging|staged/);
  // the archived requirement history is the BUNDLE's content — the bystander was never read in
  const archDir = fs.readdirSync(path.join(root, 'apriori/changes/archive')).find((d) => d.endsWith('-c'));
  assert.strictEqual(fs.readFileSync(path.join(root, 'apriori/changes/archive', archDir, 'requirement/req-v1.md'), 'utf8'), 'v1');
});

test('AM-38 move failure keeps the bundle intact and rerunnable', () => {
  const root = bundleProject();
  let renames = 0;
  const ops = {
    writeFileSync: fs.writeFileSync.bind(fs), rmSync: fs.rmSync.bind(fs),
    renameSync: (a, b) => {
      renames++;
      if (String(b).includes('archive')) throw new Error('injected move failure');
      fs.renameSync(a, b);
    },
  };
  const res = am.archiveChange({ cwd: root, change: 'c', changesDir: 'apriori/changes', changesDirExplicit: true, write: true, ops });
  assert.strictEqual(res.code, 1);
  assert.match(res.err.join('\n'), /rerun to complete/);
  assert.ok(fs.existsSync(path.join(root, 'apriori/changes/c/requirement/req-v1.md')), 'bundle intact in flight');
  const res2 = am.archiveChange({ cwd: root, change: 'c', changesDir: 'apriori/changes', changesDirExplicit: true, write: true });
  assert.strictEqual(res2.code, 0, res2.err.join('\n'));
  assert.ok(fs.existsSync(path.join(bundleArchived(root), 'requirement', 'req-v1.md')));
});

test('AM-39 non-move paths are unaffected', () => {
  const root = bundleProject();
  const rDry = run(['archive', '--change', 'c'], root);
  assert.strictEqual(rDry.status, 0);
  assert.ok(fs.existsSync(path.join(root, 'apriori/changes/c/requirement/req-v1.md')));
  const rNoMove = run(['archive', '--change', 'c', '--write'], root);
  assert.strictEqual(rNoMove.status, 0);
  assert.ok(fs.existsSync(path.join(root, 'apriori/changes/c/requirement/req-v1.md')), 'no move without --changes-dir');
  const root2 = mkProject({ 'store.md': STORE_A, 'delta.md': ADD_A });
  assert.strictEqual(run(['archive', '--store', 'store.md', '--delta', 'delta.md', '--change', 'c', '--write'], root2).status, 0);
});

test('AM-40 the waiver is visible and downgrades to warn-and-merge', () => {
  // --no-cas flag
  const root = twoModuleProject({ 'apriori/changes/c/specs/a/spec.md': MOD_DIFF });
  const r = run(['archive', '--change', 'c', '--write', '--no-cas'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /unstamped mutation delta/);
  assert.match(r.stdout + r.stderr, /waived.*--no-cas|--no-cas.*waiv/i);
  assert.match(fs.readFileSync(path.join(root, 'apriori/specs/a/spec.md'), 'utf8'), /CHANGED/);
  // config row waiver
  const root2 = twoModuleProject({
    'apriori/changes/c/specs/a/spec.md': MOD_DIFF,
    'apriori/process-config.md': '| cas | optional |\n',
  });
  const r2 = run(['archive', '--change', 'c', '--write'], root2);
  assert.strictEqual(r2.status, 0, r2.stdout + r2.stderr);
  assert.match(r2.stdout + r2.stderr, /waived.*process-config|process-config.*waiv/i);
  // flag wins over config (config says optional, flag also present → flag named)
  const root3 = twoModuleProject({
    'apriori/changes/c/specs/a/spec.md': MOD_DIFF,
    'apriori/process-config.md': '| cas | optional |\n',
  });
  const r3 = run(['archive', '--change', 'c', '--write', '--no-cas'], root3);
  assert.strictEqual(r3.status, 0);
  assert.match(r3.stdout + r3.stderr, /--no-cas/);
});

test('AM-41 the projection surface stays informative', () => {
  const root = twoModuleProject({ 'apriori/changes/c/specs/a/spec.md': MOD_DIFF });
  const v = run(['verify', '--change', 'c', '--test-cmd',
    `node -e "console.log('ok 1 - XA-01 a');console.log('ok 2 - XB-01 b')"`], root);
  assert.match(v.stderr, /unstamped mutation delta/);
  assert.notStrictEqual(v.status, 2, 'projection never fails the run for a missing stamp: ' + v.stderr);
});

test('AM-42 the reviewer fenced-waiver bypass is dead', () => {
  const mk = (config) => twoModuleProject({
    'apriori/changes/c/specs/a/spec.md': MOD_DIFF,
    'apriori/process-config.md': config,
  });
  const fenced = mk('```md\n| cas | optional |\n```\n\n| cas | required |\n');
  const r1 = run(['archive', '--change', 'c', '--write'], fenced);
  assert.strictEqual(r1.status, 1, r1.stdout + r1.stderr);
  assert.doesNotMatch(fs.readFileSync(path.join(fenced, 'apriori/specs/a/spec.md'), 'utf8'), /CHANGED/);
  const conflicted = mk('| cas | optional |\n| cas | required |\n');
  const r2 = run(['archive', '--change', 'c', '--write'], conflicted);
  assert.strictEqual(r2.status, 1);
  assert.match(r2.stdout + r2.stderr, /conflict/i);
  // stamped run unaffected by the broken config
  const { fingerprint } = require('../lib/archive-merge');
  const stamped = mk('| cas | optional |\n| cas | required |\n');
  fs.writeFileSync(path.join(stamped, 'apriori/changes/c/specs/a/spec.md'),
    `<!-- apriori-base: ${fingerprint(STORE_A)} -->\n` + MOD_DIFF);
  const r3 = run(['archive', '--change', 'c', '--write'], stamped);
  assert.strictEqual(r3.status, 0, r3.stdout + r3.stderr);
  // --no-cas still waives the fenced case explicitly
  const flag = mk('```md\n| cas | optional |\n```\n\n| cas | required |\n');
  assert.strictEqual(run(['archive', '--change', 'c', '--write', '--no-cas'], flag).status, 0);
});
