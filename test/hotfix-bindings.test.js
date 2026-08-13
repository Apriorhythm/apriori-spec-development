'use strict';
// hotfix-lane T4 — bindings live in the state file (carrier c1') and cover every delta
// target key exactly once (HF-18..HF-20). The ruled lane has no no-test escape and no
// second carrier.
const test = require('node:test');
const assert = require('node:assert');

const { parseState, checkBindings } = require('../lib/hotfix.js');

const CONCLUSION = 'Rewrote the display wording of the binding gate summary line.';
function state(kind, bindings, over = {}) {
  const head = {
    hotfix: 'fix', date: '2026-08-14', kinds: '1', 'change-kind': kind,
    'touched-modules': 'gate', 'fix-ref': 'a1b2c3d', 'frontend-touched': 'no', 'backend-touched': 'yes',
    'affected-scenario-ids': 'GT-01', ...over,
  };
  const lines = Object.entries(head).map(([k, v]) => `${k}: ${v}`);
  lines.push('', '## Conclusion', '', CONCLUSION, '');
  if (bindings !== null) lines.push('## Bindings', '', ...bindings, '');
  return parseState(lines.join('\n'));
}
const op = (o = {}) => ({ type: 'MODIFIED', module: 'gate', title: 'Requirement: the binding gate', scenarios: ['GT-01'], blastLow: true, ...o });
const bundle = (over = {}) => ({ delta: { ops: [op()], modules: ['gate'] }, decisions: [], storeBlocks: new Map(), vocabulary: ['gate'], ...over });

test('HF-18 every delta target key carries exactly one binding line', () => {
  const two = { delta: { ops: [op({ scenarios: ['GT-01', 'GT-02'] })], modules: ['gate'] } };

  const clean = checkBindings(state('code-trivial', ['GT-01: tests: gate.test.js covers the summary line', 'GT-02: tests: gate.test.js covers the count suffix']), bundle(two));
  assert.deepStrictEqual(clean, [], `two keys declared once each: ${clean}`);

  const missing = checkBindings(state('code-trivial', ['GT-01: tests: gate.test.js']), bundle(two));
  assert.ok(missing.some((p) => p.includes('GT-02')), `missing key named: ${missing}`);

  const dup = checkBindings(state('code-trivial', ['GT-01: tests: a', 'GT-01: tests: b', 'GT-02: tests: c']), bundle(two));
  assert.ok(dup.some((p) => /duplicate/i.test(p) && p.includes('GT-01')), `duplicate key named: ${dup}`);

  const stranger = checkBindings(state('code-trivial', ['GT-01: tests: a', 'GT-02: tests: b', 'GT-99: tests: c']), bundle(two));
  assert.ok(stranger.some((p) => p.includes('GT-99')), `unknown key named: ${stranger}`);

  // a scenario-less block binds by its requirement title instead
  const byTitle = checkBindings(
    state('code-trivial', ['Requirement: the binding gate: tests: gate.test.js']),
    bundle({ delta: { ops: [op({ scenarios: [] })], modules: ['gate'] } }),
  );
  assert.deepStrictEqual(byTitle, [], `title key accepted: ${byTitle}`);
});

test('HF-19 kinds that must not declare bindings are refused when they do', () => {
  const line = ['GT-01: tests: gate.test.js'];

  const doc = checkBindings(state('doc-fix', line), bundle({ delta: { ops: [op()], modules: ['gate'] } }));
  assert.ok(doc.some((p) => /doc-fix/.test(p)), `doc-fix refused: ${doc}`);

  const zeroDelta = checkBindings(state('code-behavior', line), bundle({ delta: { ops: [], modules: [] } }));
  assert.ok(zeroDelta.some((p) => /zero-delta|p1/i.test(p)), `zero-delta refused: ${zeroDelta}`);

  const noCode = checkBindings(state('no-code', line, { kinds: '2' }), bundle({ delta: { ops: [], modules: [] } }));
  assert.ok(noCode.some((p) => /no-code/.test(p)), `no-code refused: ${noCode}`);
});

test('HF-20 no-test lines and out-of-carrier declarations are refused', () => {
  const noTest = checkBindings(state('code-trivial', ['GT-01: no-test: not worth it']), bundle());
  assert.ok(noTest.some((p) => /no-test/.test(p)), `no-test refused: ${noTest}`);

  const inDelta = checkBindings(state('code-trivial', ['GT-01: tests: gate.test.js']), bundle({
    delta: { ops: [op({ body: 'some prose\nGT-01: tests: gate.test.js\n' })], modules: ['gate'] },
  }));
  assert.ok(inDelta.some((p) => /carrier/i.test(p)), `in-delta declaration refused: ${inDelta}`);

  const standalone = checkBindings(state('code-trivial', ['GT-01: tests: gate.test.js']), bundle({ standaloneBindingsFile: true }));
  assert.ok(standalone.some((p) => /carrier/i.test(p)), `standalone file refused: ${standalone}`);
});
