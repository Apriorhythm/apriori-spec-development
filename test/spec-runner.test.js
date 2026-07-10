'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { collectScenarios, parseTap, evaluate, verify, DEFAULT_ID } = require('../lib/spec-runner');
const fs = require('fs');
const os = require('os');
const path = require('path');

const idRe = new RegExp(DEFAULT_ID);

// cross-platform TAP emitter: node -e works identically under cmd.exe, PowerShell and sh
function tapCmd(...lines) {
  return `node -e "${lines.map((l) => `console.log('${l}')`).join(';')}"`;
}

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
  const { verdict } = verify({ specs: [file], testCmd: tapCmd('ok 1 - XX-01 a'), cwd: '.' });
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
  const e2e = verify({ specs: [file], testCmd: tapCmd('ok 1 - ab-1 lower'), idPattern: '[a-z]+-\\d+' });
  assert.deepStrictEqual(e2e.verdict.boundGreen, ['ab-1']);
});

test('SR-09 --json emits a machine-consumable verify report; exit still encodes GREEN/GAPS', () => {
  const { verifyJson } = require('../lib/spec-runner');
  const { file } = tmpSpec('#### Scenario: XX-01 a\n#### Scenario: XX-02 b\n');
  const r = verify({ specs: [file], testCmd: tapCmd('ok 1 - XX-01 a', 'not ok 2 - XX-02 b', 'ok 3 - XX-99 orphan') });
  const parsed = JSON.parse(JSON.stringify(verifyJson(r)));   // round-trips as valid JSON
  assert.strictEqual(parsed.clean, false);
  assert.strictEqual(parsed.result, 'GAPS');
  assert.deepStrictEqual(parsed.boundGreen, [{ id: 'XX-01', pass: 1, fail: 0, skip: 0 }]);
  assert.deepStrictEqual(parsed.boundRed, [{ id: 'XX-02', pass: 0, fail: 1, skip: 0 }]);
  assert.deepStrictEqual(parsed.orphan, [{ id: 'XX-99', pass: 1, fail: 0, skip: 0 }]);
  assert.deepStrictEqual(parsed.errors, []);
  assert.strictEqual(parsed.exec.status, 0);
  assert.deepStrictEqual(parsed.duplicates, []);
  // CLI: --json prints pure JSON and exits 1 on GAPS, 0 on GREEN
  const { cli } = require('../lib/spec-runner');
  const log = console.log, out = [];
  console.log = (...a) => out.push(a.join(' '));
  let code;
  try { code = cli(['--specs', file, '--test-cmd', tapCmd('ok 1 - XX-01 a', 'ok 2 - XX-02 b'), '--json']); }
  finally { console.log = log; }
  assert.strictEqual(code, 0);
  const green = JSON.parse(out.join('\n'));
  assert.strictEqual(green.result, 'GREEN');
  // GAPS via CLI: exit 1 and pure JSON with result GAPS
  const out2 = [];
  console.log = (...a) => out2.push(a.join(' '));
  let code2;
  try { code2 = cli(['--specs', file, '--test-cmd', tapCmd('not ok 1 - XX-01 a'), '--json']); }
  finally { console.log = log; }
  assert.strictEqual(code2, 1);
  assert.strictEqual(JSON.parse(out2.join('\n')).result, 'GAPS');
  // ERROR via CLI --json: silent crash → result ERROR, exit 2, errors[] populated
  const out3 = [];
  console.log = (...a2) => out3.push(a2.join(' '));
  let code3;
  try { code3 = cli(['--specs', file, '--test-cmd', 'node -e "process.exit(7)"', '--json']); }
  finally { console.log = log; }
  assert.strictEqual(code3, 2);
  const errJson = JSON.parse(out3.join('\n'));
  assert.strictEqual(errJson.result, 'ERROR');
  assert.ok(errJson.errors.length > 0);
  assert.strictEqual(errJson.exec.status, 7);
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
    '--specs', dir, '--test-cmd', tapCmd('not tap at all')], { encoding: 'utf8' });
  assert.match(r.stderr, /ZERO TAP results were parsed/);
  assert.match(r.stderr, /--test-reporter=tap/);
  assert.match(r.stdout, /UNBOUND/);
});

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const { spawnSync } = require('node:child_process');
function runCli(args, opts = {}) { return spawnSync('node', [BIN, 'verify', ...args], { encoding: 'utf8', ...opts }); }

test('SR-11 execution status is part of the verdict — never GREEN past a broken run', () => {
  const { file } = tmpSpec('#### Scenario: XX-01 a\n');
  // all-green TAP but nonzero exit → ERROR (exit 2), never GREEN
  const r1 = runCli(['--specs', file, '--test-cmd', `node -e "console.log('ok 1 - XX-01 a');process.exit(7)"`]);
  assert.strictEqual(r1.status, 2);
  assert.match(r1.stderr, /exited with status 7/);
  assert.doesNotMatch(r1.stdout, /RESULT: GREEN/);
  // nonzero exit WITH matching red TAP is ordinary GAPS (exit 1) — the failure is visible
  const r2 = runCli(['--specs', file, '--test-cmd', `node -e "console.log('not ok 1 - XX-01 a');process.exit(1)"`]);
  assert.strictEqual(r2.status, 1);
  // command not found (shell exits 127 with no TAP failure) → ERROR
  const r3 = runCli(['--specs', file, '--test-cmd', 'definitely-not-a-real-command-xyz']);
  assert.strictEqual(r3.status, 2);
  // the spawn-error taxonomy path itself (exec.error), exercised at the unit level
  const { infraErrors } = require('../lib/spec-runner');
  const spawnErr = infraErrors({ missingTargets: [], fileCount: 1, scenarioCount: 1, failCount: 0,
    bailout: null, noTap: false, verdict: { clean: false },
    exec: { status: null, signal: null, error: 'spawn ENOENT' } });
  assert.ok(spawnErr.some((e) => /failed to spawn: spawn ENOENT/.test(e)));
  // nonzero exit with NO parsed TAP failure at all (silent crash) → ERROR, not plain GAPS
  const r4 = runCli(['--specs', file, '--test-cmd', 'node -e "process.exit(7)"']);
  assert.strictEqual(r4.status, 2);
  assert.match(r4.stderr, /no parsed TAP failure explains it/);
});

test('SR-12 vacuous inputs fail closed — missing target, zero files, zero scenarios', () => {
  // nonexistent spec path → ERROR, not vacuous GREEN
  const miss = runCli(['--specs', path.join(os.tmpdir(), 'no-such-dir-xyz'), '--test-cmd', 'node -e ""']);
  assert.strictEqual(miss.status, 2);
  assert.match(miss.stderr, /does not exist/);
  // empty dir (zero spec files) → ERROR
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sr12-'));
  const zf = runCli(['--specs', empty, '--test-cmd', 'node -e ""']);
  assert.strictEqual(zf.status, 2);
  assert.match(zf.stderr, /no spec files found/);
  // spec file with zero scenarios → ERROR
  const { file } = tmpSpec('# just prose, no scenarios\n');
  const zs = runCli(['--specs', file, '--test-cmd', 'node -e ""']);
  assert.strictEqual(zs.status, 2);
  assert.match(zs.stderr, /zero scenarios/);
});

test('SR-13 spec hygiene: duplicate IDs fail; fenced examples excluded; ID suffix never truncated', () => {
  // duplicate scenario IDs across files → GAPS with a DUPLICATE report
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sr13-'));
  fs.writeFileSync(path.join(d, 'a.md'), '#### Scenario: XX-01 first\n');
  fs.writeFileSync(path.join(d, 'b.md'), '#### Scenario: XX-01 second\n');
  const dup = runCli(['--specs', d, '--test-cmd', `node -e "console.log('ok 1 - XX-01 x')"`]);
  assert.strictEqual(dup.status, 1);
  assert.match(dup.stdout, /DUPLICATE scenario IDs/);
  assert.match(dup.stdout, /XX-01: a\.md, b\.md/);
  // a scenario inside a code fence is documentation, not a spec
  const { byId } = collectScenarios([tmpSpec('```\n#### Scenario: YY-01 example only\n```\n#### Scenario: YY-02 real\n').file], idRe);
  assert.ok(!byId.has('YY-01'));
  assert.ok(byId.has('YY-02'));
  // XX-01b is NOT XX-01: the ID must end at a word boundary
  const { leadId } = require('../lib/spec-runner');
  assert.strictEqual(leadId('XX-01b something', idRe), null);
  assert.strictEqual(leadId('XX-01_more', idRe), null);      // underscore is a word character too
  assert.strictEqual(leadId('XX-01 something', idRe), 'XX-01');
  assert.strictEqual(leadId('XX-01: colon ok', idRe), 'XX-01');
});

test('SR-14 TAP directives and aborts: SKIP/TODO never count green; Bail out! is an error', () => {
  // a scenario whose only result is SKIP stays UNBOUND
  const { results } = parseTap('ok 1 - XX-01 a # SKIP flaky\n', idRe);
  assert.deepStrictEqual(results.get('XX-01'), { pass: 0, fail: 0, skip: 1 });
  const { file } = tmpSpec('#### Scenario: XX-01 a\n');
  const skip = runCli(['--specs', file, '--test-cmd', `node -e "console.log('ok 1 - XX-01 a # SKIP flaky')"`]);
  assert.strictEqual(skip.status, 1);                       // UNBOUND → GAPS, not GREEN
  assert.match(skip.stdout, /UNBOUND/);
  // TODO likewise never counts as pass
  const { results: todo } = parseTap('not ok 1 - XX-01 a # TODO later\n', idRe);
  assert.deepStrictEqual(todo.get('XX-01'), { pass: 0, fail: 0, skip: 1 });
  // Bail out! → ERROR even if earlier lines were green
  const bail = runCli(['--specs', file, '--test-cmd', `node -e "console.log('ok 1 - XX-01 a');console.log('Bail out! db down')"`]);
  assert.strictEqual(bail.status, 2);
  assert.match(bail.stderr, /aborted/);
});

test('SR-15 --test-cmd falls back to the test-cmd row in apriori/process-config.md', () => {
  const { configTestCmd } = require('../lib/spec-runner');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-sr15-'));
  fs.mkdirSync(path.join(root, 'apriori'), { recursive: true });
  fs.writeFileSync(path.join(root, 'apriori', 'process-config.md'),
    '| Field | Value |\n|---|---|\n| test-cmd | node -e "console.log(\'ok 1 - XX-01 a\')" |\n');
  assert.match(configTestCmd(root), /^node -e/);
  assert.strictEqual(configTestCmd(os.tmpdir()), null);      // no config → null
  // CLI end-to-end: omit --test-cmd, cwd carries the config
  fs.writeFileSync(path.join(root, 'spec.md'), '#### Scenario: XX-01 a\n');
  const r = runCli(['--specs', path.join(root, 'spec.md'), '--cwd', root]);
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /RESULT: GREEN/);
});
