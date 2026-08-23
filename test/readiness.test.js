'use strict';
// RY-01..RY-07 — the base layer of lib/readiness.js against the IMMUTABLE state-A oracle.
//
// test/fixtures/gate-state-a.golden.json was captured from 5.0.0's gate BEFORE lib/readiness.js
// existed, and it is never regenerated — a file rewritten from the current implementation cannot
// testify about the current implementation. 6.0 slice 1 deliberately changed the WORDING of the
// C2/C3/C4 details (tier → mode), so the comparison can no longer be byte-for-byte.
//
// What it compares instead is the DECISION: result, exit code, and each check's status. Those
// are what the oracle exists to protect, and they must not move for a rename. The five renamed
// corpus ids are mapped, not re-captured; the new legacy-identity case is not in the oracle at
// all and is covered by MD-08 instead.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const corpus = require('./helpers/gate-corpus');
const rd = require('../lib/readiness');
const gate = require('../lib/gate');
const resolve = require('../lib/resolve');
const { canSymlink } = require('./helpers/can-symlink');

const ORACLE_PATH = path.join(__dirname, 'fixtures', 'gate-state-a.golden.json');
const ORACLE = JSON.parse(fs.readFileSync(ORACLE_PATH, 'utf8'));
const GOLDEN = ORACLE.cases;

// 6.0 id → 5.x id. Only names moved; every one of these is the same bundle shape it was.
const TO_ORACLE = {
  'healthy-standard': 'healthy-medium',
  'fast-no-tasks-no-ledger': 'trivial-no-tasks-no-ledger',
  'standard-tasks-missing': 'medium-tasks-missing',
  'standard-ledger-missing': 'medium-ledger-missing',
  'flow-illegal-mode': 'flow-illegal-tier',
};
// born in 6.0: the oracle cannot have an opinion about it (MD-08 owns its behaviour)
const NOT_IN_ORACLE = new Set(['flow-legacy-identity']);
const oracleId = (id) => TO_ORACLE[id] || id;
// checks that did not exist when the oracle was captured. The oracle is silent about them by
// construction, so they are compared out — but the SET is pinned here, so a future check
// cannot be added to gate without this line changing and someone noticing (RL-17 owns C8).
const BORN_IN_6 = new Set(['C8']);

// the decision, with every detail string dropped and the post-oracle checks held aside
const decisions = (res) => ({
  result: res.result, code: res.code,
  checks: res.checks.filter((c) => !BORN_IN_6.has(c.id)).map((c) => ({ id: c.id, status: c.status })),
});

// 6.0 slice 3 moves two things the 5.0 oracle recorded. Both are DECLARED here instead of by
// re-running the capture — regenerating it would legalise whatever else moved alongside them,
// which is the one thing this oracle exists to prevent.
//
//   1. C5 over an EMPTY review/ was a vacuous `pass`: "every verdict has raw evidence" is true
//      of zero verdicts and attests nothing. It is `n/a` now. Every oracle case carries an
//      empty review/, so the substitution is uniform — and it is applied in that one direction
//      only, so a C5 that moves any OTHER way still fails here.
//   2. The REVIEW FLOOR. §7 lists a missing independent review as blocking and says nothing
//      about mode, so C8 refuses an in-flight change with no completed round. NOT ONE corpus
//      case carries review evidence, so every case the 5.0 capture recorded as PASS/0 is
//      BLOCKED/1 now — one rule, one uniform effect, not eight unrelated drifts. The set is
//      pinned BY NAME so a ninth cannot appear without this line changing, and each member is
//      re-checked below to have actually been a PASS in the oracle, so the declaration cannot
//      launder a case that was failing for some other reason. FF-01/FF-16 own the behaviour.
const EMPTY_REVIEW_C5 = { from: 'pass', to: 'n/a' };
const REVERSED_BY_REVIEW_FLOOR = new Set([
  'healthy-standard', 'fast-no-tasks-no-ledger', 'flow-step-abandoned', 'flow-step-done',
  'flow-step6', 'ledger-rejected-with-reason', 'ledger-waived-with-evidence', 'ledger-fixed-in-flight',
]);

// the oracle's decision with those two divergences applied — and nothing else
function oracleExpectation(caseId, result) {
  const d = decisions(result);
  d.checks = d.checks.map((c) =>
    (c.id === 'C5' && c.status === EMPTY_REVIEW_C5.from) ? { id: 'C5', status: EMPTY_REVIEW_C5.to } : c);
  if (!REVERSED_BY_REVIEW_FLOOR.has(caseId)) return d;
  assert.deepStrictEqual({ result: d.result, code: d.code }, { result: 'PASS', code: 0 },
    `'${caseId}' is declared reversed by the review floor, but the oracle did not record it as a pass`);
  return { ...d, result: 'BLOCKED', code: 1 };
}

test('RY-00 the oracle is the 5.0 capture, untouched', () => {
  assert.match(ORACLE.note, /Do not regenerate/, 'the oracle stopped being an oracle if this changed');
  assert.strictEqual(Object.keys(GOLDEN).length, 25, 'the 5.0 capture had 25 cases; growth means someone re-ran it');
  // every corpus case is either mapped onto the oracle or explicitly declared new
  for (const c of corpus.CASES)
    assert.ok(NOT_IN_ORACLE.has(c.id) || oracleId(c.id) in GOLDEN,
      `corpus case '${c.id}' has no oracle entry and is not declared new`);
  // and nothing in the oracle was silently dropped from the corpus
  const covered = new Set(corpus.CASES.map((c) => oracleId(c.id)));
  for (const id of Object.keys(GOLDEN)) assert.ok(covered.has(id), `oracle case '${id}' left the corpus`);
});

test('RY-01 the base predicates decide what the oracle recorded', () => {
  let compared = 0;
  for (const c of corpus.CASES) {
    if (NOT_IN_ORACLE.has(c.id)) continue;
    const g = GOLDEN[oracleId(c.id)];
    if (g.threw) continue;
    if (c.needsSymlink && !canSymlink()) continue;   // the platform, not the code
    const { root, change } = corpus.build(c);
    const loc = gate.resolveChange(root, change);
    const flowText = fs.readFileSync(path.join(loc.dir, 'flow-state.md'), 'utf8');
    const state = require('../lib/status').parseFlowState(flowText);
    const mode = rd.MODE_ENUM.includes(state.mode) ? state.mode : null;

    const mine = {
      C2: rd.checkTasks(loc.dir, mode).status,
      C3: rd.checkFlowState(state, change, flowText).status,
      // C4 is only reached when the review root is clean — the gate short-circuits otherwise
      C4: rd.reviewDirDefect(loc.dir) ? 'blocked' : rd.checkLedger(mode, loc.stage, loc.dir).status,
    };
    for (const id of ['C2', 'C3', 'C4']) {
      const want = g.result.checks.find((x) => x.id === id).status;
      assert.strictEqual(mine[id], want, `${c.id} · ${id}: 5.0 decided '${want}', 6.0 decides '${mine[id]}'`);
      compared++;
    }
  }
  assert.ok(compared >= 60, `expected the whole mapped corpus to be compared, got ${compared}`);
});

test('RY-02 no gate decision drifts across the rename', () => {
  let compared = 0;
  for (const c of corpus.CASES) {
    if (NOT_IN_ORACLE.has(c.id)) continue;
    if (c.needsSymlink && !canSymlink()) continue;
    const g = GOLDEN[oracleId(c.id)];
    const { root, change } = corpus.build(c);
    let got, live = null;
    try { live = gate.runGate({ cwd: root, change, testCmd: corpus.TAP_OK }); got = { threw: false, ...decisions(live) }; }
    catch (e) { got = { threw: true, name: e.constructor.name }; }
    const want = g.threw
      ? { threw: true, name: g.error.name }
      : { threw: false, ...oracleExpectation(c.id, g.result) };
    assert.deepStrictEqual(got, want, `gate decision drifted on '${c.id}'`);
    // whatever gate grew since the capture must be exactly the declared set — never a surprise
    if (live) {
      const oracleIds = new Set(g.result.checks.map((x) => x.id));
      const extra = live.checks.map((x) => x.id).filter((id) => !oracleIds.has(id));
      assert.deepStrictEqual(new Set(extra), BORN_IN_6, `unexpected post-oracle check on '${c.id}'`);
    }
    compared++;
  }
  assert.ok(compared >= 24, `expected every mapped case, got ${compared}`);
});

test('RY-02b the case the oracle cannot speak for is still pinned', () => {
  // a 5.x bundle had no meaning in 5.0 — the oracle is silent, so the decision is asserted here
  const c = corpus.CASES.find((x) => x.id === 'flow-legacy-identity');
  assert.ok(c, 'the legacy-identity case must stay in the corpus');
  const { root, change } = corpus.build(c);
  const res = gate.runGate({ cwd: root, change, testCmd: corpus.TAP_OK });
  assert.strictEqual(res.result, 'BLOCKED');
  assert.strictEqual(res.code, 1);
  assert.strictEqual(res.checks.find((x) => x.id === 'C3').status, 'blocked');
  assert.match(res.checks.find((x) => x.id === 'C3').detail, /5\.x identity/);
});

test('RY-03 STEP6 is an overlay on C3, not a replacement', () => {
  const st = (over) => ({
    change: 'c', mode: 'standard', lineage: 'v4', 'current-step': 'STEP6', ...over,
  });
  // C3 failure surfaces the C3 diagnosis, never the STEP6 wording
  for (const [over, needle] of [
    [{ mode: undefined }, /required key 'mode' missing/],
    [{ lineage: '<fill me>' }, /unfilled placeholder/],
    [{ change: 'other' }, /'change' is 'other'/],
    [{ 'current-step': 'STEP9' }, /not in the legal vocabulary/],
    [{ mode: 'huge' }, /'mode' 'huge' not in/],
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
  const base = { change: 'c', mode: 'standard', lineage: 'v4' };
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
  // and the reviewDirDefect answers themselves: the oracle recorded C4 blocked for both
  for (const id of canSymlink() ? ['review-root-symlink', 'review-root-file'] : ['review-root-file']) {
    const c = corpus.CASES.find((x) => x.id === id);
    const { root, change } = corpus.build(c);
    const loc = gate.resolveChange(root, change);
    assert.ok(rd.reviewDirDefect(loc.dir), `${id}: the review root must still be diagnosed`);
    assert.strictEqual(GOLDEN[id].result.checks.find((x) => x.id === 'C4').status, 'blocked', id);
  }
});
