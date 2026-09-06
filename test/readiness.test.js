'use strict';
// RY-03..RY-19 — the readiness predicates of lib/readiness.js.
//
// What used to live at the top of this file was a differential against
// test/fixtures/gate-state-a.golden.json, a capture of 5.0's gate taken before lib/readiness.js
// existed. That oracle protected an EXTRACTION: the move had to change nothing. 6.0 slice 5
// deliberately changed what C2, C3 and C4 DECIDE — and 6.2 retired the C2/C4 readers outright,
// leaving `current-step` → `phase` as C3's business. An oracle whose
// every case would have to be declared divergent is no longer testifying about anything, so it was
// removed together with its fixture rather than rewritten into agreement with the code it watches.
// The behaviours it covered are owned by the tests below plus GT-02/03/09 and MD-08.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const corpus = require('./helpers/gate-corpus');
const rd = require('../lib/readiness');
const gate = require('../lib/gate');
const resolve = require('../lib/resolve');
const { canSymlink } = require('./helpers/can-symlink');

test('RY-03 the archiving phase is an overlay on C3, not a replacement', () => {
  const st = (over) => ({ change: 'c', mode: 'standard', lineage: 'v4', phase: 'review', ...over });
  // a C3 failure surfaces the C3 diagnosis, never the phase wording
  for (const [over, needle] of [
    [{ lineage: undefined }, /required key 'lineage' missing/],
    [{ lineage: '<fill me>' }, /unfilled placeholder/],
    [{ change: 'other' }, /'change' is 'other'/],
    [{ phase: 'STEP6' }, /not in the legal vocabulary/],
    [{ mode: 'huge' }, /'mode' 'huge' not in/],
  ]) {
    const o = rd.phaseOverlay(st(over), 'c');
    assert.strictEqual(o.class, 'legality', JSON.stringify(over));
    assert.match(o.detail, needle);
    assert.doesNotMatch(o.detail, /archiving happens/);
  }
  // a legal flow-state at the wrong phase surfaces the phase wording, and `review` passes —
  // with or without the (inert) mode key
  assert.strictEqual(rd.phaseOverlay(st({}), 'c'), null);
  assert.strictEqual(rd.phaseOverlay(st({ mode: undefined }), 'c'), null, '6.2: mode is optional');
  assert.strictEqual(rd.phaseOverlay(st({ phase: 'abandoned' }), 'c').class, 'phase');
  assert.match(rd.phaseOverlay(st({ phase: 'done' }), 'c').detail,
    /in-flight bundle declares done; archiving happens at 'phase: review'/);
  assert.doesNotMatch(rd.phaseOverlay(st({ phase: 'done' }), 'c').detail, /already archived/);
});

test('RY-04 archive readiness is strictly stronger than the gate C3', () => {
  const base = { change: 'c', mode: 'standard', lineage: 'v4' };
  for (const phase of rd.PHASE_ENUM) {
    const state = { ...base, phase };
    const c3 = rd.checkFlowState(state, 'c');
    const overlay = rd.phaseOverlay(state, 'c');
    assert.strictEqual(c3.status, 'pass', `C3 should accept every legal phase, rejected ${phase}`);
    if (phase === 'review') assert.strictEqual(overlay, null);
    else assert.strictEqual(overlay.class, 'phase', `${phase} must not be archivable`);
  }
  // the implication, in the direction the requirement states it
  const ready = (p) => rd.phaseOverlay({ ...base, phase: p }, 'c') === null;
  const c3pass = (p) => rd.checkFlowState({ ...base, phase: p }, 'c').status === 'pass';
  for (const p of rd.PHASE_ENUM) if (ready(p)) assert.ok(c3pass(p), `${p}: ready must imply C3 pass`);
  assert.ok(rd.PHASE_ENUM.some((p) => c3pass(p) && !ready(p)), 'the converse must NOT hold');
});

test('RY-05 no layer reaches back into its caller', () => {
  const am = fs.readFileSync(path.join(__dirname, '..', 'lib', 'archive-merge.js'), 'utf8');
  assert.doesNotMatch(am, /require\(['"]\.\/gate['"]\)/, 'archive-merge must not require gate');
  const g = fs.readFileSync(path.join(__dirname, '..', 'lib', 'gate.js'), 'utf8');
  for (const fn of ['function checkFlowState', 'function checkEvidenceStatus', 'function evidenceFindings'])
    assert.doesNotMatch(g, new RegExp(fn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `gate must not reimplement ${fn}`);
  // 6.2: the ledger classifier left with its consumer — gate re-exports nothing of it
  assert.ok(!('classifyStatus' in gate), 'the retired ledger classifier must not survive as a gate export');
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
  assert.match(base, /function checkFlowState/, 'stripComments removed real code');
});

test('RY-07 the base layer takes its containment check from resolve', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'readiness.js'), 'utf8');
  assert.doesNotMatch(src, /require\(['"]\.\/archive-merge['"]\)/,
    'readiness must not require archive-merge — that closes archive-merge → readiness → archive-merge');
  assert.match(src, /require\(['"]\.\/resolve['"]\)/);

  // five-case differential: swapping the containment helper must not move a single answer
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
    assert.strictEqual(resolve.containsExistingPath(dir, target), am.containsFuturePath(dir, target),
      `${label}: the two containment helpers must agree at this call shape`);
  }
  // and the reviewDirDefect answers themselves: an unusable review root blocks C5 (C4 is a
  // 6.2 placeholder and reads nothing)
  for (const id of canSymlink() ? ['review-root-symlink', 'review-root-file'] : ['review-root-file']) {
    const c = corpus.CASES.find((x) => x.id === id);
    const { root, change } = corpus.build(c);
    const loc = gate.resolveChange(root, change);
    assert.ok(rd.reviewDirDefect(loc.dir), `${id}: the review root must still be diagnosed`);
    const res = gate.runGate({ cwd: root, change, testCmd: corpus.TAP_OK });
    assert.strictEqual(res.checks.find((x) => x.id === 'C5').status, 'blocked', id);
    assert.strictEqual(res.checks.find((x) => x.id === 'C4').status, 'n/a', id);
  }
});
