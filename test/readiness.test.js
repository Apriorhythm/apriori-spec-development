'use strict';
// RY-01..RY-07 — the base layer of lib/readiness.js against the STATE-A oracle.
//
// The oracle is test/fixtures/gate-state-a.golden.json, captured BEFORE gate.js delegated
// here. Comparing the base layer against the refactored gate would compare a function with
// its own wrapper and pass even if the move broke a detail string (STEP2·r1 SPEC-4).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const corpus = require('./helpers/gate-corpus');
const rd = require('../lib/readiness');
const gate = require('../lib/gate');
const resolve = require('../lib/resolve');
const { canSymlink } = require('./helpers/can-symlink');

const GOLDEN = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'gate-state-a.golden.json'), 'utf8')).cases;

// same scrubbing the capture used, so a diagnosis carrying the temp root still compares
// The golden was captured on one platform; path separators must not decide the comparison.
// Normalising to '/' is a no-op where the details already use it.
function scrub(value, roots) {
  if (typeof value === 'string') {
    let s = value;
    for (const r of roots) s = s.split(r).join('<CORPUS>');
    return s.split('\\').join('/');
  }
  if (Array.isArray(value)) return value.map((v) => scrub(v, roots));
  if (value && typeof value === 'object') {
    const o = {}; for (const [k, v] of Object.entries(value)) o[k] = scrub(v, roots); return o;
  }
  return value;
}
const rootsOf = (root) => {
  const rs = [root];
  try { const rp = fs.realpathSync(root); if (rp !== root) rs.push(rp); } catch { /* root only */ }
  return rs;
};

test('RY-01 the base predicates and the gate agree item by item', () => {
  let compared = 0;
  for (const c of corpus.CASES) {
    const g = GOLDEN[c.id];
    assert.ok(g, `golden has no case '${c.id}' — regenerate only if the corpus grew, never after the move`);
    if (g.threw) continue;
    if (c.needsSymlink && !canSymlink()) continue;   // the platform, not the code
    const { root, change } = corpus.build(c);
    const roots = rootsOf(root);
    const loc = gate.resolveChange(root, change);
    const state = require('../lib/status').parseFlowState(fs.readFileSync(path.join(loc.dir, 'flow-state.md'), 'utf8'));
    const tier = rd.TIER_ENUM.includes(state.tier) ? state.tier : null;

    const mine = {
      C2: scrub(rd.checkTasks(loc.dir, tier), roots),
      C3: scrub(rd.checkFlowState(state, change), roots),
      // C4 is only reached when the review root is clean — the gate short-circuits otherwise
      C4: rd.reviewDirDefect(loc.dir)
        ? scrub({ id: 'C4', status: 'blocked', detail: rd.reviewDirDefect(loc.dir) }, roots)
        : scrub(rd.checkLedger(tier, loc.stage, loc.dir), roots),
    };
    for (const id of ['C2', 'C3', 'C4']) {
      const want = g.result.checks.find((x) => x.id === id);
      assert.deepStrictEqual(mine[id], want, `${c.id} · ${id}`);
      compared++;
    }
  }
  assert.ok(compared >= 60, `expected the whole corpus to be compared, got ${compared}`);
});

test('RY-02 the gate observable behaviour does not move', () => {
  for (const c of corpus.CASES) {
    const g = GOLDEN[c.id];
    if (c.needsSymlink && !canSymlink()) continue;
    const { root, change } = corpus.build(c);
    const roots = rootsOf(root);
    let got;
    try {
      got = { threw: false, result: scrub(gate.runGate({ cwd: root, change, testCmd: corpus.TAP_OK }), roots) };
    } catch (e) {
      // no stack: moving a function necessarily changes its file and line
      got = { threw: true, error: scrub({ name: e.constructor.name, code: e.code ?? null, message: e.message }, roots) };
    }
    assert.deepStrictEqual(got, g, `runGate drifted on '${c.id}'`);
  }
});

test('RY-03 STEP6 is an overlay on C3, not a replacement', () => {
  const st = (over) => ({
    change: 'c', tier: 'medium', track: 'harden', lineage: 'v4', 'current-step': 'STEP6', ...over,
  });
  // C3 failure surfaces the C3 diagnosis, never the STEP6 wording
  for (const [over, needle] of [
    [{ tier: undefined }, /required key 'tier' missing/],
    [{ lineage: '<fill me>' }, /unfilled placeholder/],
    [{ change: 'other' }, /'change' is 'other'/],
    [{ 'current-step': 'STEP9' }, /not in the legal vocabulary/],
    [{ tier: 'huge' }, /'tier' 'huge' not in/],
  ]) {
    const o = rd.stepOverlay(st(over), 'c');
    assert.strictEqual(o.class, 'legality', JSON.stringify(over));
    assert.match(o.detail, needle);
    assert.doesNotMatch(o.detail, /STEP6/);
  }
  // a legal flow-state at the wrong step surfaces the step wording, and STEP6 passes
  assert.strictEqual(rd.stepOverlay(st({}), 'c'), null);
  assert.strictEqual(rd.stepOverlay(st({ 'current-step': 'ABANDONED' }), 'c').class, 'step');
  assert.match(rd.stepOverlay(st({ 'current-step': 'DONE' }), 'c').detail,
    /in-flight bundle declares DONE; expected STEP6/);
  assert.doesNotMatch(rd.stepOverlay(st({ 'current-step': 'DONE' }), 'c').detail, /already archived/);
});

test('RY-04 archive readiness is strictly stronger than the gate C3', () => {
  const base = { change: 'c', tier: 'medium', track: 'harden', lineage: 'v4' };
  for (const step of rd.STEP_ENUM) {
    const state = { ...base, 'current-step': step };
    const c3 = rd.checkFlowState(state, 'c');
    const overlay = rd.stepOverlay(state, 'c');
    assert.strictEqual(c3.status, 'pass', `C3 should accept every legal step, rejected ${step}`);
    if (step === 'STEP6') assert.strictEqual(overlay, null);
    else assert.strictEqual(overlay.class, 'step', `${step} must not be archivable`);
  }
  // the implication, in the direction the requirement states it
  const ready = (s) => rd.stepOverlay({ ...base, 'current-step': s }, 'c') === null;
  const c3pass = (s) => rd.checkFlowState({ ...base, 'current-step': s }, 'c').status === 'pass';
  for (const s of rd.STEP_ENUM) if (ready(s)) assert.ok(c3pass(s), `${s}: ready must imply C3 pass`);
  assert.ok(rd.STEP_ENUM.some((s) => c3pass(s) && !ready(s)), 'the converse must NOT hold');
});

test('RY-05 no layer reaches back into its caller', () => {
  const am = fs.readFileSync(path.join(__dirname, '..', 'lib', 'archive-merge.js'), 'utf8');
  assert.doesNotMatch(am, /require\(['"]\.\/gate['"]\)/, 'archive-merge must not require gate');
  const g = fs.readFileSync(path.join(__dirname, '..', 'lib', 'gate.js'), 'utf8');
  for (const fn of ['function checkFlowState', 'function checkTasks', 'function checkLedger', 'function classifyStatus'])
    assert.doesNotMatch(g, new RegExp(fn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `gate must not reimplement ${fn}`);
  assert.strictEqual(typeof gate.classifyStatus, 'function', 'gate must keep re-exporting classifyStatus (GT-15 corpus test)');
});

// comments explain WHY the base layer stays bare and necessarily name the helper it must not
// call; the property under test is about CODE, so strip comments before asserting.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

test('RY-06 the base layer stays bare', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'readiness.js'), 'utf8');
  const base = stripComments(src.slice(0, src.indexOf('module.exports')));
  assert.doesNotMatch(base, /fileReadDefect/, 'a guard in the base layer would change gate behaviour (RY-02)');
  // control: the stripper must not be doing the work for us
  assert.match(base, /function checkLedger/, 'stripComments removed real code');
});

test('RY-07 the base layer takes its containment check from resolve', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'readiness.js'), 'utf8');
  assert.doesNotMatch(src, /require\(['"]\.\/archive-merge['"]\)/,
    'readiness must not require archive-merge — that closes archive-merge → readiness → archive-merge');
  assert.match(src, /require\(['"]\.\/resolve['"]\)/);

  // five-case differential: swapping containsReal must not move a single answer
  const am = require('../lib/archive-merge');
  const os = require('os');
  const mk = (build) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-ry07-'));
    build(root);
    return root;
  };
  const cases = [
    ['clean dir', (r) => fs.mkdirSync(path.join(r, 'review'))],
    ['absent', () => {}],
    ['not a dir', (r) => fs.writeFileSync(path.join(r, 'review'), 'x')],
    ...(canSymlink() ? [
      ['symlink', (r) => { fs.mkdirSync(path.join(r, 'other')); fs.symlinkSync(path.join(r, 'other'), path.join(r, 'review')); }],
      ['escaping', (r) => { const out = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-out-')); fs.symlinkSync(out, path.join(r, 'review')); }],
    ] : []),
  ];
  for (const [label, build] of cases) {
    const dir = mk(build);
    const target = path.join(dir, 'review');
    let st = null;
    try { st = fs.lstatSync(target); } catch { /* absent */ }
    if (!st || st.isSymbolicLink() || !st.isDirectory()) continue;   // containment only decides the clean-dir branch
    assert.strictEqual(resolve.containsReal(dir, target), am.containsReal(dir, target),
      `${label}: the two containsReal implementations must agree at this call shape`);
  }
  // and the reviewDirDefect answers themselves, against the state-A goldens that carry them
  for (const id of canSymlink() ? ['review-root-symlink', 'review-root-file'] : ['review-root-file']) {
    const c = corpus.CASES.find((x) => x.id === id);
    const { root, change } = corpus.build(c);
    const loc = gate.resolveChange(root, change);
    const got = rd.reviewDirDefect(loc.dir);
    const want = GOLDEN[id].result.checks.find((x) => x.id === 'C4').detail;
    assert.strictEqual(scrub(got, rootsOf(root)), want, id);
  }
});
