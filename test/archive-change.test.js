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

test('AM-25 stamp-free deltas behave exactly as before, on both surfaces', () => {
  const root1 = twoModuleProject();
  assert.strictEqual(run(['archive', '--change', 'c', '--write'], root1).status, 0);
  assert.match(fs.readFileSync(path.join(root1, 'apriori/specs/a/spec.md'), 'utf8'), /Alpha2/);
  const root2 = mkProject({ 'store.md': STORE_A, 'delta.md': ADD_A });
  assert.strictEqual(run(['archive', '--store', 'store.md', '--delta', 'delta.md', '--change', 'c', '--write'], root2).status, 0);
  assert.match(fs.readFileSync(path.join(root2, 'store.md'), 'utf8'), /Alpha2/);
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
