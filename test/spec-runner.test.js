'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { collectScenarios, parseTap, evaluate, verify, DEFAULT_ID } = require('../lib/spec-runner');
const fs = require('fs');
const os = require('os');
const path = require('path');

const idRe = new RegExp(DEFAULT_ID);

function tmpSpec(content) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sr-'));
  const f = path.join(d, 'spec.md');
  fs.writeFileSync(f, content);
  return { dir: d, file: f };
}

// Build an evaluate() result from a spec string + a fake TAP string.
function run(spec, tap) {
  const { file } = tmpSpec(spec);
  const { byId, unidentified } = collectScenarios([file], idRe);
  const { results } = parseTap(tap, idRe);
  return { verdict: evaluate(byId, unidentified, results), results };
}

test('SR-01 every scenario bound and green → clean, exit 0', () => {
  const { verdict } = run(
    '#### Scenario: XX-01 a\n#### Scenario: XX-02 b\n',
    'ok 1 - XX-01 a\nok 2 - XX-02 b\n');
  assert.deepStrictEqual(verdict.boundGreen, ['XX-01', 'XX-02']);
  assert.strictEqual(verdict.clean, true);
});

test('SR-02 a scenario with no test is UNBOUND → not clean', () => {
  const { verdict } = run('#### Scenario: XX-01 a\n#### Scenario: XX-02 b\n', 'ok 1 - XX-01 a\n');
  assert.deepStrictEqual(verdict.unbound, ['XX-02']);
  assert.strictEqual(verdict.clean, false);
});

test('SR-03 a failing test makes its scenario BOUND-RED', () => {
  const { verdict } = run('#### Scenario: XX-01 a\n', 'not ok 1 - XX-01 a\n');
  assert.deepStrictEqual(verdict.boundRed, ['XX-01']);
  assert.strictEqual(verdict.clean, false);
});

test('SR-04 one scenario many tests — green iff all pass', () => {
  const green = run('#### Scenario: XX-01 a\n', 'ok 1 - XX-01 part a\nok 2 - XX-01 part b\n');
  assert.deepStrictEqual(green.verdict.boundGreen, ['XX-01']);
  const red = run('#### Scenario: XX-01 a\n', 'ok 1 - XX-01 part a\nnot ok 2 - XX-01 part b\n');
  assert.deepStrictEqual(red.verdict.boundRed, ['XX-01']);
});

test('SR-05 a test with no matching scenario is ORPHAN', () => {
  const { verdict } = run('#### Scenario: XX-01 a\n', 'ok 1 - XX-01 a\nok 2 - XX-99 orphan\n');
  assert.deepStrictEqual(verdict.orphan, ['XX-99']);
  assert.strictEqual(verdict.clean, false);
});

test('SR-06 a scenario with no ID is UNIDENTIFIED', () => {
  const { verdict } = run('#### Scenario: no id here\n', '');
  assert.strictEqual(verdict.unidentified.length, 1);
  assert.strictEqual(verdict.clean, false);
});

test('SR-07 delegates execution to the given test command (TAP is the only coupling)', () => {
  const { file } = tmpSpec('#### Scenario: XX-01 a\n');
  const { verdict } = verify({ specs: [file], testCmd: 'printf "ok 1 - XX-01 a\\n"', cwd: '.' });
  assert.strictEqual(verdict.clean, true);
  assert.deepStrictEqual(verdict.boundGreen, ['XX-01']);
});

test('SR-08 the id-pattern is configurable, default [A-Z]+-\\d+', () => {
  // default pattern ignores lowercase-led ids
  const def = run('#### Scenario: ab-1 lower\n', '');
  assert.strictEqual(def.verdict.unidentified.length, 1);
  // custom pattern picks them up in BOTH spec extraction and TAP/test extraction
  const { file } = tmpSpec('#### Scenario: ab-1 lower\n');
  const custom = collectScenarios([file], /[a-z]+-\d+/);
  assert.ok(custom.byId.has('ab-1'));
  const lowRe = /[a-z]+-\d+/;
  const { results: defTap } = parseTap('ok 1 - ab-1 lower\n', idRe);   // default pattern misses it
  assert.strictEqual(defTap.size, 0);
  const { results: cust } = parseTap('ok 1 - ab-1 lower\n', lowRe);    // custom pattern binds it
  assert.ok(cust.has('ab-1'));
  // end-to-end: same custom pattern governs spec + test → BOUND-GREEN
  const e2e = verify({ specs: [file], testCmd: 'printf "ok 1 - ab-1 lower\\n"', idPattern: '[a-z]+-\\d+' });
  assert.deepStrictEqual(e2e.verdict.boundGreen, ['ab-1']);
});
