'use strict';
// AM-74..AM-85, AM-107/108, AM-112..AM-115, RY-11 — archive refuses a change that is not ready.
// Everything here asserts ARCHIVE behaviour, so it lands in B4 (the batch that wires readiness
// in), not in B3 where the helpers exist but nothing calls them.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');

const am = require('../lib/archive-merge');
const rd = require('../lib/readiness');
const { readyFiles, FLOW, TASKS, LEDGER } = require('./helpers/ready-bundle');
const { canSymlink } = require('./helpers/can-symlink');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 a\n- t\n';
const ADD = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-09 n\n- t\n';

function proj(over = {}, tier = 'medium') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-rdy-'));
  const files = {
    ...readyFiles('c', { tier }),
    'apriori/specs/a/spec.md': STORE,
    'apriori/changes/c/specs/a/spec.md': ADD,
    ...over,
  };
  for (const [rel, c] of Object.entries(files)) {
    if (c === null) continue;
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, c);
  }
  return root;
}
const bundle = (root) => path.join(root, 'apriori', 'changes', 'c');
const storeText = (root) => fs.readFileSync(path.join(root, 'apriori/specs/a/spec.md'), 'utf8');
const rm = (p) => fs.rmSync(p, { recursive: true, force: true });

// ---------------------------------------------------------------------------

test('AM-74 the safe layer classifies every artifact defect, and tier decides only absence', () => {
  const artifacts = ['flow-state.md', 'tasks.md', path.join('review', 'issues.md')];
  for (const tier of ['trivial', 'medium']) {
    for (const rel of artifacts) {
      // missing — the ONLY kind the tier rule may soften
      {
        const root = proj({}, tier);
        rm(path.join(bundle(root), rel));
        const r = run(['archive', '--change', 'c'], root);
        const softenable = rel !== 'flow-state.md' && tier === 'trivial';
        assert.strictEqual(r.status, softenable ? 0 : 1, `${tier}/${rel} missing`);
      }
      // symlink, not-file, bad-ancestor, escape — structural at BOTH tiers
      for (const [label, build] of [
        ['not-file', (p) => { rm(p); fs.mkdirSync(p); }],
        ...(canSymlink() ? [
          ['symlink', (p) => { const t2 = p + '.real'; fs.writeFileSync(t2, 'x'); rm(p); fs.symlinkSync(t2, p); }],
          ['escape', (p) => { const out = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-out-')); fs.writeFileSync(path.join(out, 'f'), 'x'); rm(p); fs.symlinkSync(path.join(out, 'f'), p); }],
        ] : []),
      ]) {
        const root = proj({}, tier);
        build(path.join(bundle(root), rel));
        const r = run(['archive', '--change', 'c'], root);
        assert.strictEqual(r.status, 1, `${tier}/${rel}/${label} must refuse`);
        assert.match(r.stdout, /RESULT: NOT READY/, `${tier}/${rel}/${label}`);
      }
    }
  }
});

test('AM-75 an external STEP6 file cannot launder an ABANDONED bundle', { skip: canSymlink() ? false : 'platform refuses symlinks' }, () => {
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-out-'));
  fs.writeFileSync(path.join(outside, 'flow-state.md'), FLOW('c'));      // a perfectly good STEP6
  const root = proj();
  const fsPath = path.join(bundle(root), 'flow-state.md');
  fs.writeFileSync(fsPath + '.real', FLOW('c').replace('STEP6', 'ABANDONED'));
  rm(fsPath);
  fs.symlinkSync(path.join(outside, 'flow-state.md'), fsPath);
  for (const extra of [[], ['--force']]) {
    const r = run(['archive', '--change', 'c', ...extra], root);
    assert.strictEqual(r.status, 1, `--force ${extra.length ? 'on' : 'off'}`);
    assert.match(r.stderr, /flow-state\.md: symlink/);
  }
});

test('AM-76 the review root is guarded before the ledger leaf', { skip: canSymlink() ? false : 'platform refuses symlinks' }, () => {
  const root = proj();
  const b = bundle(root);
  fs.mkdirSync(path.join(b, 'elsewhere'));
  fs.writeFileSync(path.join(b, 'elsewhere', 'issues.md'), LEDGER);      // a perfectly good ledger
  rm(path.join(b, 'review'));
  fs.symlinkSync(path.join(b, 'elsewhere'), path.join(b, 'review'));
  const r = run(['archive', '--change', 'c'], root);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /review\/: symlink/);
});

test('AM-77 a read that fails after the guard is structural and carries the code', () => {
  const root = proj();
  const res = am.archiveChange({
    cwd: root, change: 'c', write: false,
    readinessOf: (opts) => rd.readinessOf({
      ...opts,
      fsImpl: { readFileSync: (p, e) => { if (String(p).endsWith('tasks.md')) { const err = new Error('boom'); err.code = 'EIO'; throw err; } return fs.readFileSync(p, e); } },
    }),
  });
  assert.strictEqual(res.code, 1);
  assert.ok(res.err.join('\n').includes('tasks.md: unreadable (EIO)'), res.err.join('\n'));
});

test('AM-107 a non-ENOENT at any probe point refuses, at every tier', () => {
  const points = [
    ['artifact lstat', (b) => ({ lstatSync: (p) => { if (String(p).endsWith('tasks.md')) throw code('EACCES'); return fs.lstatSync(p); }, realpathSync: fs.realpathSync })],
    ['ancestor walk', (b) => ({ lstatSync: (p) => { if (String(p).endsWith('tasks.md')) throw code('ENOENT'); if (p === b) throw code('EIO'); return fs.lstatSync(p); }, realpathSync: fs.realpathSync })],
    ['review-root lstat', () => ({ lstatSync: (p) => { if (String(p).endsWith(path.sep + 'review')) throw code('ELOOP'); return fs.lstatSync(p); }, realpathSync: fs.realpathSync })],
    ['artifact realpath', () => ({ lstatSync: fs.lstatSync, realpathSync: (p) => { if (String(p).endsWith('tasks.md')) throw code('EACCES'); return fs.realpathSync(p); } })],
    ['review-root realpath', () => ({ lstatSync: fs.lstatSync, realpathSync: (p) => { if (String(p).endsWith(path.sep + 'review')) throw code('EACCES'); return fs.realpathSync(p); } })],
  ];
  function code(c) { const e = new Error(c); e.code = c; return e; }
  for (const tier of ['trivial', 'medium']) {
    for (const [label, mkOps] of points) {
      const root = proj({}, tier);
      const b = bundle(root);
      const res = am.archiveChange({
        cwd: root, change: 'c', write: false,
        readinessOf: (opts) => rd.readinessOf({ ...opts, ops: mkOps(b) }),
      });
      assert.strictEqual(res.code, 1, `${tier}/${label} must refuse`);
      assert.match(res.err.join('\n'), /io-error \((EACCES|EIO|ELOOP)\)/, `${tier}/${label}`);
    }
  }
});

test('AM-108 a true ENOENT still takes the tier-sensitive branch', () => {
  for (const rel of ['tasks.md', path.join('review', 'issues.md')]) {
    const trivial = proj({}, 'trivial'); rm(path.join(bundle(trivial), rel));
    assert.strictEqual(run(['archive', '--change', 'c'], trivial).status, 0, `trivial/${rel}`);
    const medium = proj({}, 'medium'); rm(path.join(bundle(medium), rel));
    assert.strictEqual(run(['archive', '--change', 'c'], medium).status, 1, `medium/${rel}`);
  }
});

test('AM-115 an ENOENT raised at the realpath stage is not a structural defect either', () => {
  function code(c) { const e = new Error(c); e.code = c; return e; }
  // artifact side: falls through to the ancestor walk and ends as missing → tier decides
  for (const [tier, want] of [['trivial', 0], ['medium', 1]]) {
    const root = proj({}, tier);
    const res = am.archiveChange({
      cwd: root, change: 'c', write: false,
      readinessOf: (o) => rd.readinessOf({ ...o, ops: { lstatSync: fs.lstatSync, realpathSync: (p) => { if (String(p).endsWith('tasks.md')) throw code('ENOENT'); return fs.realpathSync(p); } } }),
    });
    assert.strictEqual(res.code, want, `artifact realpath ENOENT at ${tier}`);
  }
  // review-root side: reports nothing at all
  const root = proj();
  const res = am.archiveChange({
    cwd: root, change: 'c', write: false,
    readinessOf: (o) => rd.readinessOf({ ...o, ops: { lstatSync: fs.lstatSync, realpathSync: (p) => { if (String(p).endsWith(path.sep + 'review')) throw code('ENOENT'); return fs.realpathSync(p); } } }),
  });
  assert.strictEqual(res.code, 0, res.err.join('\n'));
});

test('AM-112 a completely normal bundle stays archivable', () => {
  const root = proj();
  const dry = run(['archive', '--change', 'c'], root);
  assert.strictEqual(dry.status, 0, dry.stdout + dry.stderr);
  assert.match(dry.stdout, /RESULT: MERGED \(dry-run/);
  const w = run(['archive', '--change', 'c', '--write', '--changes-dir', 'apriori/changes'], root);
  assert.strictEqual(w.status, 0, w.stdout + w.stderr);
  assert.match(storeText(root), /Beta/);
});

test('AM-113 an absent review directory is not a structural defect', () => {
  for (const [tier, want] of [['trivial', 0], ['medium', 1]]) {
    const root = proj({}, tier);
    rm(path.join(bundle(root), 'review'));
    const r = run(['archive', '--change', 'c'], root);
    assert.strictEqual(r.status, want, tier);
    if (want) assert.match(r.stderr, /ledger missing/);
  }
});

test('AM-78 an unready change is refused with nothing written and nothing moved', () => {
  const cases = [
    ['step', { 'apriori/changes/c/flow-state.md': FLOW('c').replace('STEP6', 'STEP2') }],
    ['tasks', { 'apriori/changes/c/tasks.md': '- [x] a\n- [ ] b\n' }],
    ['ledger', { 'apriori/changes/c/review/issues.md': LEDGER.replace('verified', 'open') }],
  ];
  for (const [label, over] of cases) {
    const root = proj(over);
    const before = storeText(root);
    const r = run(['archive', '--change', 'c', '--write', '--changes-dir', 'apriori/changes'], root);
    assert.strictEqual(r.status, 1, label);
    assert.match(r.stdout, /RESULT: NOT READY — nothing written/, label);
    assert.strictEqual(storeText(root), before, `${label}: store must be untouched`);
    assert.ok(fs.existsSync(bundle(root)), `${label}: bundle must not have moved`);
    assert.ok(!fs.existsSync(path.join(root, 'apriori/changes/archive')), `${label}: no archive dir`);
  }
});

test('AM-79 R1 reports first and alone, R2 and R3 report together', () => {
  // all three broken → only R1 surfaces
  const root = proj({
    'apriori/changes/c/flow-state.md': FLOW('c').replace('STEP6', 'STEP2'),
    'apriori/changes/c/tasks.md': '- [ ] b\n',
    'apriori/changes/c/review/issues.md': LEDGER.replace('verified', 'open'),
  });
  const r1 = run(['archive', '--change', 'c'], root);
  assert.match(r1.stderr, /R1 /);
  assert.doesNotMatch(r1.stderr, /R2 |R3 /);
  // R1 fine, R2 and R3 broken → both listed in one report
  const root2 = proj({
    'apriori/changes/c/tasks.md': '- [ ] b\n',
    'apriori/changes/c/review/issues.md': LEDGER.replace('verified', 'open'),
  });
  const r2 = run(['archive', '--change', 'c'], root2);
  assert.match(r2.stderr, /R2 tasks\.md has 1 unchecked/);
  assert.match(r2.stderr, /R3 Q-1 is open/);
});

test('AM-80 ABANDONED and DONE carry their own wording and are not forceable', () => {
  const ab = proj({ 'apriori/changes/c/flow-state.md': FLOW('c').replace('STEP6', 'ABANDONED') });
  const rA = run(['archive', '--change', 'c', '--force'], ab);
  assert.strictEqual(rA.status, 1);
  assert.match(rA.stderr, /ABANDONED/);
  assert.match(rA.stderr, /writes nothing to the KB or the spec store/);

  const dn = proj({ 'apriori/changes/c/flow-state.md': FLOW('c').replace('STEP6', 'DONE') });
  const rD = run(['archive', '--change', 'c', '--force'], dn);
  assert.strictEqual(rD.status, 1);
  assert.match(rD.stderr, /in-flight bundle declares DONE; expected STEP6/);
  assert.doesNotMatch(rD.stderr, /already archived/);
});

test('AM-81 a broken flow-state reports the C3 diagnosis, not the step wording', () => {
  const broken = FLOW('c').replace('STEP6', 'ABANDONED').replace(/^lineage: .*$/m, 'lineage: <fill me>');
  const root = proj({ 'apriori/changes/c/flow-state.md': broken });
  const r = run(['archive', '--change', 'c'], root);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /unfilled placeholder/);
  assert.doesNotMatch(r.stderr, /ABANDONED/);
});

test('AM-82 tier decides what a missing artifact means, and absence is never forceable', () => {
  for (const rel of ['tasks.md', path.join('review', 'issues.md')]) {
    const root = proj({}, 'medium');
    rm(path.join(bundle(root), rel));
    // even with a grant on record, an ABSENT artifact is not a progress blocker
    const flow = FLOW('c') + '  - 2026-08-15T18:00 gate⑤ (owner): archive-force tasks — 补一条授权\n' +
                             '  - 2026-08-15T18:00 gate⑤ (owner): archive-force ledger — 补一条授权\n';
    fs.writeFileSync(path.join(bundle(root), 'flow-state.md'), flow);
    assert.strictEqual(run(['archive', '--change', 'c', '--force'], root).status, 1, rel);
  }
});

test('AM-83 existing preflight failures keep their diagnosis and never reach readiness', () => {
  let calls = 0;
  const countingReadiness = (o) => { calls++; return rd.readinessOf(o); };
  const cases = [
    ['no such change', (root) => rm(bundle(root))],
    ['no delta files', (root) => rm(path.join(bundle(root), 'specs'))],
    ['cas denial', (root) => fs.writeFileSync(path.join(bundle(root), 'specs/a/spec.md'),
      '## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 a\n- CHANGED\n')],
  ];
  for (const [label, breakIt] of cases) {
    const root = proj();
    breakIt(root);
    calls = 0;
    const res = am.archiveChange({ cwd: root, change: 'c', write: false, readinessOf: countingReadiness });
    assert.notStrictEqual(res.code, 0, label);
    assert.doesNotMatch(res.out.join('\n'), /NOT READY/, label);
    assert.strictEqual(calls, 0, `${label}: readiness must not be evaluated once an existing guard failed`);
  }
});

test('AM-84 the integrity section is not printed for an unready change', () => {
  const MOD = '## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-02 replaced\n- t\n';
  const stamped = `<!-- apriori-base: ${am.fingerprint(STORE)} -->\n\n` + MOD;
  const ready = proj({ 'apriori/changes/c/specs/a/spec.md': stamped });
  assert.match(run(['archive', '--change', 'c'], ready).stdout, /MODIFIED INTEGRITY/);
  const unready = proj({ 'apriori/changes/c/specs/a/spec.md': stamped, 'apriori/changes/c/tasks.md': '- [ ] x\n' });
  const r = run(['archive', '--change', 'c'], unready);
  assert.strictEqual(r.status, 1);
  assert.doesNotMatch(r.stdout, /MODIFIED INTEGRITY/);
});

test('AM-85 dry-run predicts what --write would do', () => {
  const root = proj({ 'apriori/changes/c/tasks.md': '- [ ] x\n' });
  const before = storeText(root);
  const r = run(['archive', '--change', 'c'], root);
  assert.strictEqual(r.status, 1);
  assert.doesNotMatch(r.stdout, /RESULT: MERGED \(dry-run/);
  assert.strictEqual(storeText(root), before);
});

test('AM-114 readiness is a single look, not a commit-time guarantee', () => {
  const root = proj();
  let fired = 0;
  const res = am.archiveChange({
    cwd: root, change: 'c', write: true, changesDir: path.join(root, 'apriori', 'changes'),
    ops: {
      writeFileSync: fs.writeFileSync.bind(fs), renameSync: fs.renameSync.bind(fs), rmSync: fs.rmSync.bind(fs),
      afterReadiness: () => { fired++; fs.writeFileSync(path.join(bundle(root), 'tasks.md'), '- [ ] snuck in\n'); },
    },
  });
  assert.strictEqual(fired, 1, 'the hook must fire once, after readiness and before the first write');
  assert.strictEqual(res.code, 0, 'archive does not re-read and does not detect the change');
  assert.match(storeText(root), /Beta/);
});

test('RY-11 the readiness entry point reuses the overlay rather than restating it', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'readiness.js'), 'utf8');
  const body = src.slice(src.indexOf('function readinessOf'), src.indexOf('module.exports'));
  assert.match(body, /stepOverlay\(/, 'readinessOf must call the named overlay');
  assert.doesNotMatch(body, /['"]STEP6['"]/,
    'a restated STEP6 comparison would let the acceptance pass before the production path exists');
});
