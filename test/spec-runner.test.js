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

test('SR-09 --json emits a machine-consumable verify report; exit still encodes GREEN/GAPS', () => {
  const { verifyJson } = require('../lib/spec-runner');
  const { file } = tmpSpec('#### Scenario: XX-01 a\n#### Scenario: XX-02 b\n');
  const r = verify({ specs: [file], testCmd: 'printf "ok 1 - XX-01 a\\nnot ok 2 - XX-02 b\\nok 3 - XX-99 orphan\\n"' });
  const j = verifyJson(r.verdict, r.results, r.fileCount);
  const parsed = JSON.parse(JSON.stringify(j));            // round-trips as valid JSON
  assert.strictEqual(parsed.clean, false);
  assert.strictEqual(parsed.result, 'GAPS');
  assert.deepStrictEqual(parsed.boundGreen, [{ id: 'XX-01', pass: 1, fail: 0 }]);
  assert.deepStrictEqual(parsed.boundRed, [{ id: 'XX-02', pass: 0, fail: 1 }]);
  assert.deepStrictEqual(parsed.orphan, [{ id: 'XX-99', pass: 1, fail: 0 }]);
  // CLI: --json prints pure JSON and exits 1 on GAPS, 0 on GREEN
  const { cli } = require('../lib/spec-runner');
  const log = console.log, out = [];
  console.log = (...a) => out.push(a.join(' '));
  let code;
  try { code = cli(['--specs', file, '--test-cmd', 'printf "ok 1 - XX-01 a\\nok 2 - XX-02 b\\n"', '--json']); }
  finally { console.log = log; }
  assert.strictEqual(code, 0);
  const green = JSON.parse(out.join('\n'));
  assert.strictEqual(green.result, 'GREEN');
  // GAPS via CLI: exit 1 and pure JSON with result GAPS
  const out2 = [];
  console.log = (...a) => out2.push(a.join(' '));
  let code2;
  try { code2 = cli(['--specs', file, '--test-cmd', 'printf "not ok 1 - XX-01 a\\n"', '--json']); }
  finally { console.log = log; }
  assert.strictEqual(code2, 1);
  assert.strictEqual(JSON.parse(out2.join('\n')).result, 'GAPS');
});

test('SR-10 zero parsed TAP results triggers a reporter hint', () => {
  const { zeroTapParsed, parseTap } = require('../lib/spec-runner');
  const idRe = /[A-Z]+-\d+/;
  // human "spec" reporter output: content but no TAP lines → flagged
  const human = '✔ KV-01 stores a value (1.2ms)\n✔ KV-02 expires (0.8ms)\npass 2\n';
  const p1 = parseTap(human, idRe);
  assert.strictEqual(zeroTapParsed(human, p1.results, p1.untagged), true);
  // real TAP → not flagged
  const tap = 'ok 1 - KV-01 stores a value\nok 2 - KV-02 expires\n';
  const p2 = parseTap(tap, idRe);
  assert.strictEqual(zeroTapParsed(tap, p2.results, p2.untagged), false);
  // empty output (test cmd produced nothing) → not this warning's business
  const p3 = parseTap('', idRe);
  assert.strictEqual(zeroTapParsed('', p3.results, p3.untagged), false);
  // valid TAP with an EMPTY suite (version/plan lines only) is not a reporter problem
  const emptySuite = 'TAP version 13\n1..0\n';
  const p4 = parseTap(emptySuite, idRe);
  assert.strictEqual(zeroTapParsed(emptySuite, p4.results, p4.untagged), false);
  // through the CLI: warning lands on stderr, UNBOUND report still prints
  const { spawnSync } = require('node:child_process');
  const os = require('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sr10-'));
  fs.writeFileSync(path.join(dir, 'spec.md'), '### Requirement: R\n#### Scenario: KV-01 x\n- THEN y\n');
  const r = spawnSync('node', [path.join(__dirname, '..', 'bin', 'apriori.js'), 'verify',
    '--specs', dir, '--test-cmd', 'echo "not tap at all"'], { encoding: 'utf8' });
  assert.match(r.stderr, /ZERO TAP results were parsed/);
  assert.match(r.stderr, /--test-reporter=tap/);
  assert.match(r.stdout, /UNBOUND/);
});
