'use strict';
// hotfix-lane T2/T3 — state-file parsing, the field contract and the blast-radius grader
// (HF-01..HF-17). The grader runs ONLY on contract-valid input and returns an ordered-first
// (radius, subtype) pair; fail-up is the rule — an unannotated delta never reaches R2.
const test = require('node:test');
const assert = require('node:assert');

const { parseState, checkFields, grade, PLACEHOLDER, DECISION_CAP } = require('../lib/hotfix.js');

const VOCAB = ['gate', 'spec-runner', 'config', 'archive-merge'];

function stateText(header, sections) {
  const lines = [];
  for (const [k, v] of Object.entries(header)) lines.push(`${k}: ${v}`);
  lines.push('');
  for (const [name, body] of Object.entries(sections)) { lines.push(`## ${name}`, '', body, ''); }
  return lines.join('\n');
}
const CONCLUSION = 'The channel filter returned nothing because the venue rebuild orphaned the address rows.';
function baseState(over = {}, sections = {}) {
  return stateText(
    { hotfix: 'venue-orphan', date: '2026-08-14', kinds: '2', 'change-kind': 'no-code', ...over },
    { Conclusion: CONCLUSION, ...sections },
  );
}
// a parsed bundle as the grader consumes it (delta wiring to archive-merge lands in T7)
function bundle(over = {}) {
  return {
    delta: { ops: [], modules: [] },
    decisions: [],
    storeBlocks: new Map(),
    vocabulary: VOCAB,
    ...over,
  };
}
const op = (type, o = {}) => ({ type, module: 'gate', title: 'Requirement: the binding gate', scenarios: ['GT-01'], blastLow: false, ...o });

// ---------- HF-01..HF-04 — state file structure ----------

test('HF-01 the header block parses by key with fixed vocabulary', () => {
  const r = parseState(baseState());
  assert.deepStrictEqual(r.problems, [], 'clean parse');
  assert.strictEqual(r.header.get('hotfix'), 'venue-orphan');
  assert.strictEqual(r.header.get('change-kind'), 'no-code');
  assert.ok(r.sections.has('Conclusion'), 'section boundary recognized');
  assert.strictEqual(r.sections.get('Conclusion').trim(), CONCLUSION);
});

test('HF-02 unknown or repeated header keys are fatal', () => {
  const unknown = parseState(baseState({ severity: 'high' }));
  assert.ok(unknown.problems.some((p) => /unknown header key/i.test(p) && p.includes('severity')), `unknown key named: ${unknown.problems}`);

  const dup = parseState(['hotfix: x', 'date: 2026-08-14', 'kinds: 2', 'change-kind: no-code', 'change-kind: no-code', '', '## Conclusion', '', CONCLUSION].join('\n'));
  assert.ok(dup.problems.some((p) => /repeated header key/i.test(p) && p.includes('change-kind')), `duplicate key named: ${dup.problems}`);
  assert.ok(!unknown.problems.some((p) => /repeated/i.test(p)), 'unknown and duplicate are distinct messages');
});

test('HF-03 unknown sections are fatal, known process sections are not business content', () => {
  const unknown = parseState(baseState({}, { Notes: 'free text' }));
  assert.ok(unknown.problems.some((p) => /unknown section/i.test(p) && p.includes('Notes')), `section named: ${unknown.problems}`);

  const withGates = parseState(baseState({}, { Gates: '- 2026-08-14 note: scaffolded' }));
  assert.deepStrictEqual(withGates.problems, [], 'Gates is legal');
  assert.deepStrictEqual(withGates.businessSections, ['Conclusion'], 'Gates is not business content');
  assert.ok(withGates.sections.has('Gates'), 'Gates still parsed');
});

test('HF-04 the conclusion is unconditionally required and must be filled in', () => {
  const absent = parseState(stateText({ hotfix: 'x', date: '2026-08-14', kinds: '2', 'change-kind': 'no-code' }, {}));
  assert.ok(absent.problems.some((p) => /conclusion/i.test(p) && /missing/i.test(p)), `absent named: ${absent.problems}`);

  const blank = parseState(baseState({}, { Conclusion: '   ' }));
  assert.ok(blank.problems.some((p) => /conclusion/i.test(p) && /blank/i.test(p)), `blank named: ${blank.problems}`);

  const placeholder = parseState(baseState({}, { Conclusion: PLACEHOLDER }));
  assert.ok(placeholder.problems.some((p) => /placeholder/i.test(p)), `placeholder named: ${placeholder.problems}`);
});

// ---------- HF-05..HF-10 — field contract ----------

const codeHeader = {
  hotfix: 'fix', date: '2026-08-14', kinds: '1', 'change-kind': 'code-trivial',
  'touched-modules': 'gate', 'fix-ref': 'a1b2c3d', 'frontend-touched': 'no', 'backend-touched': 'yes',
  'affected-scenario-ids': 'GT-01',
};
const fieldsOf = (over = {}, b = {}) => checkFields(parseState(baseState({ ...codeHeader, ...over })), bundle(b));

test('HF-05 change-kind is required with a closed vocabulary', () => {
  const missing = checkFields(parseState(stateText({ hotfix: 'x', date: '2026-08-14', kinds: '2' }, { Conclusion: CONCLUSION })), bundle());
  assert.ok(missing.some((p) => /change-kind/.test(p) && /missing|required/i.test(p)), `missing named: ${missing}`);

  const unknown = fieldsOf({ 'change-kind': 'hotfix' });
  assert.ok(unknown.some((p) => /change-kind/.test(p) && p.includes('hotfix')), `unknown value named: ${unknown}`);
  assert.ok(!unknown.some((p) => /missing/i.test(p)), 'missing and unknown are distinguishable');
});

test('HF-06 locator headers are paired, required for code and doc kinds, forbidden for no-code', () => {
  const noModules = parseState(baseState({ ...codeHeader }));
  noModules.header.delete('touched-modules');
  assert.ok(checkFields(noModules, bundle()).some((p) => /touched-modules/.test(p)), 'missing touched-modules');

  const noRef = parseState(baseState({ ...codeHeader }));
  noRef.header.delete('fix-ref');
  assert.ok(checkFields(noRef, bundle()).some((p) => /fix-ref/.test(p)), 'missing fix-ref (pairing)');

  const forbidden = checkFields(parseState(baseState({ 'touched-modules': 'gate', 'fix-ref': 'a1b2c3d' })), bundle());
  assert.ok(forbidden.some((p) => /touched-modules|fix-ref/.test(p) && /no-code/.test(p)), `forbidden on no-code: ${forbidden}`);
});

test('HF-07 touch signals are radius inputs, independent of the profile', () => {
  const st = parseState(baseState({ ...codeHeader, 'change-kind': 'code-behavior' }));
  st.header.delete('frontend-touched');
  assert.ok(checkFields(st, bundle()).some((p) => /frontend-touched/.test(p)), 'required with no profile in play');

  const onNoCode = checkFields(parseState(baseState({ 'backend-touched': 'yes' })), bundle());
  assert.ok(onNoCode.some((p) => /backend-touched/.test(p) && /no-code/.test(p)), `forbidden on no-code: ${onNoCode}`);
});

test('HF-08 affected-scenario-ids is required and non-empty for code kinds', () => {
  const st = parseState(baseState({ ...codeHeader }));
  st.header.delete('affected-scenario-ids');
  assert.ok(checkFields(st, bundle()).some((p) => /affected-scenario-ids/.test(p)), 'missing');
  assert.ok(fieldsOf({ 'affected-scenario-ids': '' }).some((p) => /affected-scenario-ids/.test(p)), 'empty');
});

test('HF-09 kinds is a constrained subset with cross-field implications', () => {
  assert.ok(fieldsOf({ kinds: '1,2' }).some((p) => /kinds/.test(p) && /exclusive/i.test(p)), 'kinds 1 and 2 are exclusive');
  assert.ok(checkFields(parseState(baseState({ kinds: '1' })), bundle()).some((p) => /kinds/.test(p)), 'kinds 1 implies a code/doc kind');
  assert.ok(fieldsOf({ kinds: '2' }).some((p) => /kinds/.test(p)), 'kinds 2 implies no-code');
  assert.ok(fieldsOf({ kinds: '1,3' }).some((p) => /kinds/.test(p) && /decision/i.test(p)), 'kinds 3 implies decisions present');

  // pure business fact: no-code + decisions + kinds 3 alone is legal
  const pure = checkFields(parseState(baseState({ kinds: '3' })), bundle({ decisions: [{ module: 'gate', supersedes: null }] }));
  assert.deepStrictEqual(pure, [], `pure business fact legal: ${pure}`);
});

test('HF-10 touched-modules is a clean vocabulary superset of the delta', () => {
  assert.ok(fieldsOf({ 'touched-modules': '' }).some((p) => /touched-modules/.test(p)), 'empty');
  assert.ok(fieldsOf({ 'touched-modules': 'gate, gate' }).some((p) => /touched-modules/.test(p) && /duplicate/i.test(p)), 'duplicate');
  assert.ok(fieldsOf({ 'touched-modules': 'nope' }).some((p) => /nope/.test(p)), 'outside the vocabulary');

  const missingDeltaModule = fieldsOf({ 'touched-modules': 'gate' }, { delta: { ops: [op('MODIFIED', { module: 'config' })], modules: ['config'] } });
  assert.ok(missingDeltaModule.some((p) => /config/.test(p)), `superset violated: ${missingDeltaModule}`);

  // doc-fix demands equality, not just superset
  const docExtra = checkFields(
    parseState(baseState({ hotfix: 'doc', date: '2026-08-14', kinds: '1', 'change-kind': 'doc-fix', 'touched-modules': 'gate, config', 'fix-ref': 'a1b2c3d' })),
    bundle({ delta: { ops: [op('MODIFIED')], modules: ['gate'] } }),
  );
  assert.ok(docExtra.some((p) => /touched-modules/.test(p) && /equal/i.test(p)), `doc-fix equality: ${docExtra}`);
});

// ---------- HF-11..HF-17 — the grader ----------

const gradeOf = (over, b = {}) => grade(parseState(baseState({ ...codeHeader, ...over })), bundle(b));

test('HF-11 structural deltas and cross-module bundles grade R3', () => {
  const removed = gradeOf({}, { delta: { ops: [op('REMOVED')], modules: ['gate'] } });
  assert.deepStrictEqual({ radius: removed.radius, subtype: removed.subtype }, { radius: 'R3', subtype: 'n/a' });
  assert.match(removed.reason, /formal|正式/i, 'points at the formal process');

  const renamed = gradeOf({}, { delta: { ops: [op('RENAMED')], modules: ['gate'] } });
  assert.strictEqual(renamed.radius, 'R3');

  const crossDelta = gradeOf({ 'touched-modules': 'gate, config' }, { delta: { ops: [op('MODIFIED'), op('MODIFIED', { module: 'config' })], modules: ['gate', 'config'] } });
  assert.strictEqual(crossDelta.radius, 'R3', 'two delta modules');

  // a code module plus a decisions-target module also spans two
  const codePlusDecision = gradeOf({}, { delta: { ops: [], modules: [] }, decisions: [{ module: 'config', supersedes: null }] });
  assert.strictEqual(codePlusDecision.radius, 'R3', 'code module + decision module');
});

test('HF-12 decision shape and dual-end touches grade R3', () => {
  const supersede = gradeOf({}, { decisions: [{ module: 'gate', supersedes: 'D-GT-3' }] });
  assert.strictEqual(supersede.radius, 'R3', 'supersession');

  const overCap = gradeOf({}, { decisions: Array.from({ length: DECISION_CAP + 1 }, () => ({ module: 'gate', supersedes: null })) });
  assert.strictEqual(overCap.radius, 'R3', `more than ${DECISION_CAP} decisions in one module`);

  const atCap = gradeOf({}, { decisions: Array.from({ length: DECISION_CAP }, () => ({ module: 'gate', supersedes: null })) });
  assert.notStrictEqual(atCap.radius, 'R3', 'the cap itself still admits');

  const dualEnd = gradeOf({ 'frontend-touched': 'yes', 'backend-touched': 'yes' });
  assert.strictEqual(dualEnd.radius, 'R3', 'dual-end touch — the defect account front/back miss');
});

test('HF-13 an unannotated delta grades R3, an annotated one demotes to R2-whitelist', () => {
  const delta = { ops: [op('MODIFIED')], modules: ['gate'] };
  const bare = gradeOf({}, { delta });
  assert.deepStrictEqual({ radius: bare.radius, subtype: bare.subtype }, { radius: 'R3', subtype: 'n/a' }, 'fail-up on an unannotated rewrite');

  // the delta block must RETAIN the marker (dropping it is a revocation, refused separately)
  const annotated = gradeOf({}, {
    delta: { ops: [op('MODIFIED', { blastLow: true })], modules: ['gate'] },
    storeBlocks: new Map([['gate::Requirement: the binding gate', { blastLow: true }]]),
  });
  assert.deepStrictEqual({ radius: annotated.radius, subtype: annotated.subtype }, { radius: 'R2', subtype: 'whitelist' });
});

test('HF-14 an ADDED-only delta still grades R3 without an annotation', () => {
  const added = gradeOf({}, { delta: { ops: [op('ADDED')], modules: ['gate'] } });
  assert.deepStrictEqual({ radius: added.radius, subtype: added.subtype }, { radius: 'R3', subtype: 'n/a' });
});

test('HF-15 a scenario-less delta block grades R3 whatever its annotation', () => {
  const g = gradeOf({}, {
    delta: { ops: [op('MODIFIED', { scenarios: [], blastLow: true })], modules: ['gate'] },
    storeBlocks: new Map([['gate::Requirement: the binding gate', { blastLow: true }]]),
  });
  assert.deepStrictEqual({ radius: g.radius, subtype: g.subtype }, { radius: 'R3', subtype: 'n/a' }, 'no executable target to bind');
});

test('HF-16 zero-delta kinds grade by declaration', () => {
  const behavior = gradeOf({ 'change-kind': 'code-behavior' });
  assert.deepStrictEqual({ radius: behavior.radius, subtype: behavior.subtype }, { radius: 'R2', subtype: 'behavior' });

  const trivial = gradeOf({ 'change-kind': 'code-trivial' });
  assert.deepStrictEqual({ radius: trivial.radius, subtype: trivial.subtype }, { radius: 'R1', subtype: 'n/a' });

  const noCode = grade(parseState(baseState()), bundle());
  assert.deepStrictEqual({ radius: noCode.radius, subtype: noCode.subtype }, { radius: 'R0', subtype: 'n/a' });
});

test('HF-17 a delta may neither self-grant nor revoke the marker', () => {
  const selfGrant = gradeOf({}, {
    delta: { ops: [op('MODIFIED', { blastLow: true })], modules: ['gate'] },
    storeBlocks: new Map([['gate::Requirement: the binding gate', { blastLow: false }]]),
  });
  assert.ok(selfGrant.problems.some((p) => /blast/.test(p)), `self-grant refused: ${JSON.stringify(selfGrant)}`);

  const revoke = gradeOf({}, {
    delta: { ops: [op('MODIFIED', { blastLow: false })], modules: ['gate'] },
    storeBlocks: new Map([['gate::Requirement: the binding gate', { blastLow: true }]]),
  });
  assert.ok(revoke.problems.some((p) => /blast/.test(p)), `revocation refused: ${JSON.stringify(revoke)}`);
});
