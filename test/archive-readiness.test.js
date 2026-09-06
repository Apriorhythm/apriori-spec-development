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
const { readyFiles, FLOW, withOpen } = require('./helpers/ready-bundle');
const LEDGER_OPEN = '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n| Q-1 | i | low | 1 | open |\n';
const { canSymlink } = require('./helpers/can-symlink');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const run = (args, cwd) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd });

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 a\n- t\n';
const ADD = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-09 n\n- t\n';

// `mode` is written into the flow-state when given — 6.2 keeps it optional and inert, and the
// "both modes" loops below now prove exactly that: the answer never depends on it.
function proj(over = {}, mode = null) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-rdy-'));
  const files = {
    ...readyFiles('c'),
    ...(mode ? { 'apriori/changes/c/flow-state.md': FLOW('c').replace('change: c\n', `change: c\nmode: ${mode}\n`) } : {}),
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

test('AM-74 the safe layer classifies every flow-state defect, in both modes', () => {
  // tasks.md left the rule set in slice 5 and the ledger left it in 6.2 — readiness reads
  // neither, so neither can be a defect of any kind. What the safe layer still guards is the
  // flow-state (and the review ROOT, AM-76).
  for (const mode of ['fast', 'standard']) {
    // missing — structural
    {
      const root = proj({}, mode);
      rm(path.join(bundle(root), 'flow-state.md'));
      assert.strictEqual(run(['archive', '--change', 'c'], root).status, 1, `${mode}/flow-state.md missing`);
    }
    // symlink, not-file, escape — structural
    for (const [label, build] of [
      ['not-file', (p) => { rm(p); fs.mkdirSync(p); }],
      ...(canSymlink() ? [
        ['symlink', (p) => { const t2 = p + '.real'; fs.writeFileSync(t2, 'x'); rm(p); fs.symlinkSync(t2, p); }],
        ['escape', (p) => { const out = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-out-')); fs.writeFileSync(path.join(out, 'f'), 'x'); rm(p); fs.symlinkSync(path.join(out, 'f'), p); }],
      ] : []),
    ]) {
      const root = proj({}, mode);
      build(path.join(bundle(root), 'flow-state.md'));
      const r = run(['archive', '--change', 'c'], root);
      assert.strictEqual(r.status, 1, `${mode}/flow-state.md/${label} must refuse`);
      assert.match(r.stdout, /RESULT: NOT READY/, `${mode}/flow-state.md/${label}`);
    }
    // the SAME shapes on the legacy ledger: 6.2 A-5 probes it once, for the migration — a
    // ledger that cannot be read cannot be proven closed, so these are structural at R1 (LM-05)
    for (const [label, build] of [
      ['not-file', (p) => { fs.mkdirSync(p, { recursive: true }); }],
      ...(canSymlink() ? [['symlink', (p) => { fs.writeFileSync(p + '.real', 'x'); fs.symlinkSync(p + '.real', p); }]] : []),
    ]) {
      const root = proj({}, mode);
      build(path.join(bundle(root), 'review', 'issues.md'));
      const r = run(['archive', '--change', 'c'], root);
      assert.strictEqual(r.status, 1, `${mode}/issues.md/${label}: cannot be proven closed`);
      assert.match(r.stderr, new RegExp(`R1 legacy ledger review/issues\\.md: ${label}`), `${mode}/issues.md/${label}`);
    }
  }
});

test('AM-75 an external phase file cannot launder an abandoned bundle', { skip: canSymlink() ? false : 'platform refuses symlinks' }, () => {
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-out-'));
  fs.writeFileSync(path.join(outside, 'flow-state.md'), FLOW('c'));      // a perfectly good `phase: review`
  const root = proj();
  const fsPath = path.join(bundle(root), 'flow-state.md');
  fs.writeFileSync(fsPath + '.real', FLOW('c').replace('phase: review', 'phase: abandoned'));
  rm(fsPath);
  fs.symlinkSync(path.join(outside, 'flow-state.md'), fsPath);
  for (const extra of [[], ['--force']]) {
    const r = run(['archive', '--change', 'c', ...extra], root);
    assert.strictEqual(r.status, 1, `--force ${extra.length ? 'on' : 'off'}`);
    assert.match(r.stderr, /flow-state\.md: symlink/);
  }
});

test('AM-76 the review root is guarded, and the guard is R4\'s', { skip: canSymlink() ? false : 'platform refuses symlinks' }, () => {
  // 6.2: the ledger leaf under it is gone, so the root guard reports under the rule that still
  // reads the directory — the review loop — and stays structural (never forceable)
  const root = proj();
  const b = bundle(root);
  fs.mkdirSync(path.join(b, 'elsewhere'));
  fs.writeFileSync(path.join(b, 'elsewhere', 'code-review-v1.md'), 'VERDICT: no major issues\n');   // a perfectly good round
  rm(path.join(b, 'review'));
  fs.symlinkSync(path.join(b, 'elsewhere'), path.join(b, 'review'));
  const r = run(['archive', '--change', 'c', '--force'], root);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /R4 review\/: symlink/);
  const rdy = rd.readinessOf({ bundleDir: b, name: 'c', force: true });
  assert.deepStrictEqual(rdy.blockers.map((x) => [x.rule, x.class, x.forceable]), [['R4', 'structural', false]]);
});

test('AM-77 a read that fails after the guard is structural and carries the code', () => {
  const root = proj();
  const res = am.archiveChange({
    cwd: root, change: 'c', write: false,
    readinessOf: (opts) => rd.readinessOf({
      ...opts,
      fsImpl: { readFileSync: (p, e) => { if (String(p).endsWith('flow-state.md')) { const err = new Error('boom'); err.code = 'EIO'; throw err; } return fs.readFileSync(p, e); } },
    }),
  });
  assert.strictEqual(res.code, 1);
  assert.ok(res.err.join('\n').includes('flow-state.md: unreadable (EIO)'), res.err.join('\n'));
});

test('AM-107 a non-ENOENT at any probe point refuses, in both modes', () => {
  const points = [
    ['artifact lstat', (b) => ({ lstatSync: (p) => { if (String(p).endsWith('flow-state.md')) throw code('EACCES'); return fs.lstatSync(p); }, realpathSync: fs.realpathSync })],
    ['ancestor walk', (b) => ({ lstatSync: (p) => { if (String(p).endsWith('flow-state.md')) throw code('ENOENT'); if (p === b) throw code('EIO'); return fs.lstatSync(p); }, realpathSync: fs.realpathSync })],
    ['review-root lstat', () => ({ lstatSync: (p) => { if (String(p).endsWith(path.sep + 'review')) throw code('ELOOP'); return fs.lstatSync(p); }, realpathSync: fs.realpathSync })],
    ['artifact realpath', () => ({ lstatSync: fs.lstatSync, realpathSync: (p) => { if (String(p).endsWith('flow-state.md')) throw code('EACCES'); return fs.realpathSync(p); } })],
    ['review-root realpath', () => ({ lstatSync: fs.lstatSync, realpathSync: (p) => { if (String(p).endsWith(path.sep + 'review')) throw code('EACCES'); return fs.realpathSync(p); } })],
  ];
  function code(c) { const e = new Error(c); e.code = c; return e; }
  for (const mode of ['fast', 'standard']) {
    for (const [label, mkOps] of points) {
      const root = proj({}, mode);
      const b = bundle(root);
      const res = am.archiveChange({
        cwd: root, change: 'c', write: false,
        readinessOf: (opts) => rd.readinessOf({ ...opts, ops: mkOps(b) }),
      });
      assert.strictEqual(res.code, 1, `${mode}/${label} must refuse`);
      assert.match(res.err.join('\n'), /io-error \((EACCES|EIO|ELOOP)\)/, `${mode}/${label}`);
    }
  }
});

test('AM-108 a true ENOENT is benign in both modes', () => {
  // 5.x/slice-3 made this the mode-sensitive branch. 6.0 required neither artifact of either
  // mode, and 6.2 reads neither at all — a genuine absence is nothing on both sides. The
  // DISTINCTION under test is absence (benign) versus an unreadable probe (structural, AM-107).
  for (const rel of ['tasks.md', path.join('review', 'issues.md')]) {
    for (const mode of ['fast', 'standard']) {
      const root = proj({}, mode); rm(path.join(bundle(root), rel));
      assert.strictEqual(run(['archive', '--change', 'c'], root).status, 0, `${mode}/${rel}`);
    }
  }
});

test('AM-115 an ENOENT raised at the realpath stage is not a structural defect either', () => {
  function code(c) { const e = new Error(c); e.code = c; return e; }
  // artifact side: falls through to the ancestor walk and ends as `missing` — for the flow-state
  // that is R1's own (non-io-error) refusal, never an io-error
  const gone = rd.artifactDefect(bundle(proj()), path.join(bundle(proj()), 'flow-state.md'),
    { lstatSync: fs.lstatSync, realpathSync: (p) => { if (String(p).endsWith('flow-state.md')) throw code('ENOENT'); return fs.realpathSync(p); } });
  assert.strictEqual(gone.kind, 'missing');
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
  // Removing review/ takes the review round with it. What both modes still owe is the ROUND —
  // but the CLASS is the whole point: absence is never reported as structural.
  for (const [mode, want] of [['fast', /R4 no completed independent review/], ['standard', /R4 no completed independent review/]]) {
    const root = proj({}, mode);
    rm(path.join(bundle(root), 'review'));
    const r = run(['archive', '--change', 'c'], root);
    assert.strictEqual(r.status, 1, mode);
    assert.match(r.stderr, want, `${mode}: ${r.stderr}`);
    const rdy = rd.readinessOf({ bundleDir: bundle(root), name: 'c' });
    assert.ok(rdy.blockers.every((b) => b.class !== 'structural'),
      `${mode}: an absent review/ must never be classified structural — ${JSON.stringify(rdy.blockers)}`);
    assert.deepStrictEqual(rdy.na, [], `${mode}: no rule is left to be n/a`);
  }
});

test('AM-78 an unready change is refused with nothing written and nothing moved', () => {
  const cases = [
    ['phase', { 'apriori/changes/c/flow-state.md': FLOW('c').replace('phase: review', 'phase: specify') }],
    // R5 — the one substantive state predicate is the refusal (the ledger is never read)
    ['open item', { 'apriori/changes/c/flow-state.md': withOpen(FLOW('c'), ['R-01: restart recovery is unverified']) }],
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

test('AM-79 R1 reports first and alone, the later rules report together', () => {
  // everything broken → only R1 surfaces
  const root = proj({
    'apriori/changes/c/flow-state.md': withOpen(FLOW('c'), ['R-01: restart recovery is unverified'])
      .replace('phase: review', 'phase: specify'),
    'apriori/changes/c/review/code-review-v1.md': null,
    'apriori/changes/c/review/code-review-v1-raw.txt': null,
  });
  const r1 = run(['archive', '--change', 'c'], root);
  assert.match(r1.stderr, /R1 /);
  assert.doesNotMatch(r1.stderr, /R4 |R5 /);
  // R1 fine, R4 and R5 broken → both listed in one report
  const root2 = proj({
    'apriori/changes/c/flow-state.md': withOpen(FLOW('c'), ['R-01: restart recovery is unverified']),
    'apriori/changes/c/review/code-review-v1.md': null,
    'apriori/changes/c/review/code-review-v1-raw.txt': null,
  });
  const r2 = run(['archive', '--change', 'c'], root2);
  assert.match(r2.stderr, /R5 open item R-01 is pending/);
  assert.match(r2.stderr, /R4 no completed independent review/);
});

test('AM-80 abandoned and done carry their own wording and are not forceable', () => {
  const ab = proj({ 'apriori/changes/c/flow-state.md': FLOW('c').replace('phase: review', 'phase: abandoned') });
  const rA = run(['archive', '--change', 'c', '--force'], ab);
  assert.strictEqual(rA.status, 1);
  assert.match(rA.stderr, /flow-state declares abandoned/);
  assert.match(rA.stderr, /writes nothing to the KB or the spec store/);

  const dn = proj({ 'apriori/changes/c/flow-state.md': FLOW('c').replace('phase: review', 'phase: done') });
  const rD = run(['archive', '--change', 'c', '--force'], dn);
  assert.strictEqual(rD.status, 1);
  assert.match(rD.stderr, /in-flight bundle declares done; archiving happens at 'phase: review'/);
  assert.doesNotMatch(rD.stderr, /already archived/);
});

test('AM-81 a broken flow-state reports the C3 diagnosis, not the phase wording', () => {
  const broken = FLOW('c').replace('phase: review', 'phase: abandoned').replace(/^lineage: .*$/m, 'lineage: <fill me>');
  const root = proj({ 'apriori/changes/c/flow-state.md': broken });
  const r = run(['archive', '--change', 'c'], root);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /unfilled placeholder/);
  assert.doesNotMatch(r.stderr, /declares abandoned/);
});

test('AM-82 an absent artifact is not an obligation, and R5 is never forceable', () => {
  // 5.x/slice-3: an absent tasks.md or ledger was a `standard` refusal that --force could not
  // cure. 6.2 reads neither, present or absent — while the rule that REPLACED them, R5's
  // pending open item, stays non-forceable in exactly that way.
  for (const rel of ['tasks.md', path.join('review', 'issues.md')]) {
    for (const present of [false, true]) {
      const root = proj({}, 'standard');
      // a legacy ledger whose rows are all closed is nothing; an OPEN row is the A-5 migration (LM-01)
      if (present) fs.writeFileSync(path.join(bundle(root), rel), rel === 'tasks.md' ? '- [ ] b\n' : LEDGER_OPEN.replace('| open |', '| fixed |'));
      assert.strictEqual(run(['archive', '--change', 'c'], root).status, 0, `${rel} ${present ? 'present' : 'absent'}`);
    }
  }
  {
    const root = proj({}, 'standard');
    fs.writeFileSync(path.join(bundle(root), 'review', 'issues.md'), LEDGER_OPEN);
    const r = run(['archive', '--change', 'c', '--force'], root);
    assert.strictEqual(r.status, 1, 'an open legacy row is the migration refusal, and --force cannot buy it');
    assert.match(r.stderr, /R1 legacy ledger has 1 open row/);
  }
  const blocked = proj({ 'apriori/changes/c/flow-state.md':
    withOpen(FLOW('c'), ['R-01: restart recovery is unverified'])
    + '  - 2026-08-15T18:00 owner: archive-force ledger — 补一条授权\n' }, 'standard');
  const r = run(['archive', '--change', 'c', '--force'], blocked);
  assert.strictEqual(r.status, 1, 'a pending open item is not progress and --force cannot buy it');
  assert.match(r.stderr, /R5 open item R-01 is pending/);
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
  const unready = proj({ 'apriori/changes/c/specs/a/spec.md': stamped,
    'apriori/changes/c/flow-state.md': withOpen(FLOW('c'), ['R-01: restart recovery is unverified']) });
  const r = run(['archive', '--change', 'c'], unready);
  assert.strictEqual(r.status, 1);
  assert.doesNotMatch(r.stdout, /MODIFIED INTEGRITY/);
});

test('AM-85 dry-run predicts what --write would do', () => {
  const root = proj({ 'apriori/changes/c/flow-state.md': withOpen(FLOW('c'), ['R-01: restart recovery is unverified']) });
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
      afterReadiness: () => { fired++; fs.writeFileSync(path.join(bundle(root), 'flow-state.md'), withOpen(FLOW('c'), ['R-01: restart recovery is unverified'])); },
    },
  });
  assert.strictEqual(fired, 1, 'the hook must fire once, after readiness and before the first write');
  assert.strictEqual(res.code, 0, 'archive does not re-read and does not detect the change');
  assert.match(storeText(root), /Beta/);
});

test('RY-11 the readiness entry point reuses the overlay rather than restating it', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'readiness.js'), 'utf8');
  const body = src.slice(src.indexOf('function readinessOf'), src.indexOf('module.exports'));
  assert.match(body, /phaseOverlay\(/, 'readinessOf must call the named overlay');
  assert.doesNotMatch(body, /['"]review['"]\s*===|===\s*['"]review['"]/,
    'a restated phase comparison would let the acceptance pass before the production path exists');
});
