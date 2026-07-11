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

// ---- tap-plan (SR-26..31): the TAP plan is a checked promise ----

function planProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-srplan-'));
  const files = {
    'apriori/specs/kv/spec.md': '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n',
    'apriori/changes/c/flow-state.md': 'change: c\ntier: medium\ntrack: harden\ntrack-rationale: r\nlineage: v3\ncurrent-step: STEP5\nround: 1\nnext-action: x\ngates:\n  - 2026-07-11T00:00 note: n\n',
    'apriori/changes/c/tasks.md': '- [x] T1 done\n',
    'apriori/changes/c/specs/kv/spec.md': '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n',
    'apriori/changes/c/review/issues.md': '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n| Q-1 | a | low | 1 | verified |\n',
  };
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return root;
}

test('SR-26 a truncated plan refuses to verify', () => {
  const { file } = tmpSpec('#### Scenario: XX-01 a\n');
  const r = runCli(['--specs', file, '--test-cmd', tapCmd('TAP version 13', '1..2', 'ok 1 - XX-01 a')]);
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /declares 2 test point\(s\) but 1/);
  assert.doesNotMatch(r.stdout, /RESULT: GREEN/);
});

test('SR-27 duplicate test-point numbers are untrustworthy', () => {
  const u = parseTap('1..2\nok 1 - XX-01 a\nok 01 - XX-02 b\n', idRe);
  assert.deepStrictEqual(u.plans, [2]);
  assert.strictEqual(u.points, 2);
  assert.deepStrictEqual(u.dupNumbers, [1]);      // numeric comparison: 01 duplicates 1
  const { file } = tmpSpec('#### Scenario: XX-01 a\n#### Scenario: XX-02 b\n');
  const r = runCli(['--specs', file, '--test-cmd', tapCmd('1..2', 'ok 1 - XX-01 a', 'ok 1 - XX-02 b')]);
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /duplicate TAP test-point number\(s\): 1/);
});

test('SR-28 multiple plans fail closed even when totals mask', () => {
  const { file } = tmpSpec('#### Scenario: XX-01 a\n');
  // the P1 masking fixture verbatim: totals add up (3 declared / 3 parsed), still untrustworthy
  const r = runCli(['--specs', file, '--test-cmd',
    tapCmd('1..2', 'ok 1 - XX-01 a', '1..1', 'ok 1 - XX-02 b', 'ok 2 - XX-03 c')]);
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /multiple TAP plans/);
  assert.match(r.stderr, /one TAP stream per verify/);
});

test('SR-29 the point count speaks TAP, not prefixes', () => {
  const u = parseTap('1..2\nok 1 - XX-01 a\nok\nok: note\nnot ok: also a note\n', idRe);
  assert.deepStrictEqual(u.plans, [2]);
  assert.strictEqual(u.points, 2);                 // bare `ok` counts; `ok:`/`not ok:` never do
  assert.deepStrictEqual(u.dupNumbers, []);        // `ok 1abc` style stays unnumbered too
  assert.strictEqual(parseTap('1..1\nok 1abc trailing\n', idRe).dupNumbers.length, 0);
  const { file } = tmpSpec('#### Scenario: XX-01 a\n');
  const r = runCli(['--specs', file, '--test-cmd', tapCmd('1..2', 'ok 1 - XX-01 a', 'ok', 'ok: note')]);
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /RESULT: GREEN/);
});

test('SR-30 plan-less, skip-all, and nested TAP stay legal', () => {
  const { file } = tmpSpec('#### Scenario: XX-01 a\n');
  // no plan at all → no promise, no new error
  const r1 = runCli(['--specs', file, '--test-cmd', tapCmd('ok 1 - XX-01 a')]);
  assert.strictEqual(r1.status, 0);
  // skip-all plan with a directive → zero plan, zero points, consistent; UNBOUND → GAPS as today
  const r2 = runCli(['--specs', file, '--test-cmd', tapCmd('TAP version 13', '1..0 # SKIP no backend')]);
  assert.strictEqual(r2.status, 1);
  assert.doesNotMatch(r2.stderr, /TAP plan declares/);
  // nested node-style TAP: indented subtest plans/results are invisible to plan/point/dup collection
  const nested = 'TAP version 13\n# Subtest: outer\n    ok 1 - inner a\n    ok 2 - inner b\n    1..2\nok 1 - XX-01 a\n1..1\n';
  const u = parseTap(nested, idRe);
  assert.deepStrictEqual(u.plans, [1]);
  assert.strictEqual(u.points, 1);
  assert.deepStrictEqual(u.dupNumbers, []);
});

test('SR-31 projected verify and gate inherit the plan check', () => {
  const root = planProject();
  const badTap = tapCmd('1..3', 'ok 1 - XA-01 a', 'ok 2 - XB-01 b');   // plan lies: 3 declared, 2 parsed
  const v = spawnSync('node', [BIN, 'verify', '--change', 'c', '--test-cmd', badTap], { encoding: 'utf8', cwd: root });
  assert.strictEqual(v.status, 2);
  assert.match(v.stderr, /declares 3 test point\(s\) but 2/);
  const g = spawnSync('node', [BIN, 'gate', '--change', 'c', '--test-cmd', badTap], { encoding: 'utf8', cwd: root });
  assert.strictEqual(g.status, 2);   // untrustworthy run = gate ERROR, like every other infra failure
  assert.match(g.stdout + g.stderr, /declares 3 test point\(s\) but 2/);
});

// ---- unattributed-fail (SR-33..37): unattributed test failures block GREEN ----

test('SR-33 the teardown false-green is dead', () => {
  const { file } = tmpSpec('#### Scenario: XX-01 a\n');
  const r = runCli(['--specs', file, '--test-cmd',
    `node -e "console.log('ok 1 - XX-01 pass');console.log('not ok 2 - global teardown failed');console.log('1..2');process.exit(1)"`]);
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout, /RESULT: GREEN/);
  assert.match(r.stdout, /UNATTRIBUTED FAILURES[^\n]*: 1/);
  assert.match(r.stdout, /global teardown failed/);
});

test('SR-34 bare and half-shaped not-ok points block even on exit 0', () => {
  const { file } = tmpSpec('#### Scenario: XX-01 a\n');
  for (const bad of ['not ok', 'not ok 3', 'not ok 4 teardown', 'not ok - teardown failed']) {
    const r = runCli(['--specs', file, '--test-cmd',
      `node -e "console.log('ok 1 - XX-01 a');console.log('${bad}');console.log('1..2')"`]);
    assert.strictEqual(r.status, 1, `${bad}: ${r.stdout}`);
    assert.match(r.stdout, /UNATTRIBUTED FAILURES/);
  }
  // bare/untagged ok points block nothing
  const ok = runCli(['--specs', file, '--test-cmd',
    `node -e "console.log('ok 1 - XX-01 a');console.log('ok');console.log('1..2')"`]);
  assert.strictEqual(ok.status, 0, ok.stdout);
  assert.match(ok.stdout, /RESULT: GREEN/);
  // an unattributed-ONLY stream (no tagged result, no plan) is a real failure, not a reporter problem
  const only = runCli(['--specs', file, '--test-cmd', `node -e "console.log('not ok')"`]);
  assert.strictEqual(only.status, 1, only.stdout + only.stderr);
  assert.match(only.stdout, /UNATTRIBUTED FAILURES/);
  assert.doesNotMatch(only.stderr, /ZERO TAP results/);
});

test('SR-35 directives, nesting, and prefix look-alikes stay exempt', () => {
  const { file } = tmpSpec('#### Scenario: XX-01 a\n');
  const lines = [
    "console.log('ok 1 - XX-01 a')",
    "console.log('not ok 5 # SKIP flaky')",
    "console.log('not ok 6 # TODO later')",
    "console.log('    not ok 1 - subtest detail')",
    "console.log('not ok: summary')",
  ].join(';');
  const r = runCli(['--specs', file, '--test-cmd', `node -e "${lines}"`]);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /RESULT: GREEN/);
  assert.doesNotMatch(r.stdout, /UNATTRIBUTED FAILURES/);
});

test('SR-36 infra errors keep precedence', () => {
  const { file } = tmpSpec('#### Scenario: XX-01 a\n');
  // plan mismatch + unattributed failure → exit 2, both reported
  const r = runCli(['--specs', file, '--test-cmd',
    `node -e "console.log('ok 1 - XX-01 a');console.log('not ok 2 - teardown');console.log('1..5')"`]);
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /plan declares 5/);
  assert.match(r.stdout, /UNATTRIBUTED FAILURES/);
  // Bail out! + unattributed failure → exit 2
  const b = runCli(['--specs', file, '--test-cmd',
    `node -e "console.log('not ok 1 - x');console.log('Bail out! stop')"`]);
  assert.strictEqual(b.status, 2, b.stdout + b.stderr);
});

test('SR-37 the reporting contract is exact', () => {
  const { file } = tmpSpec('#### Scenario: XX-01 a\n');
  const mk = [
    "console.log('ok 1 - XX-01 a')",
    "for(let i=0;i<25;i++)console.log('not ok '+(i+2)+' - fail'+(i===0?' '+'x'.repeat(150):' '+i))",
  ].join(';');
  const r = runCli(['--specs', file, '--test-cmd', `node -e "${mk}"`, '--json']);
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  const j = JSON.parse(r.stdout);
  assert.strictEqual(j.unattributedFailures.count, 25);
  assert.strictEqual(j.unattributedFailures.lines.length, 25);
  assert.ok(j.unattributedFailures.lines[0].length > 120, 'JSON lines untruncated');
  // human report: first 20, 120-char cap incl. ellipsis, "and N more"
  const h = runCli(['--specs', file, '--test-cmd', `node -e "${mk}"`]);
  const seg = h.stdout.slice(h.stdout.indexOf('UNATTRIBUTED'));
  const listed = seg.split('\n').filter((l) => /fail/.test(l));
  assert.strictEqual(listed.length, 20, 'first 20 listed');
  const long = listed.find((l) => l.includes('x'.repeat(10)));
  assert.ok(long.trim().length <= 120 && long.trim().endsWith('…'), 'cut to 119 + ellipsis');
  assert.match(seg, /and 5 more/);
  // GREEN carries the stable empty shape
  const g = runCli(['--specs', file, '--test-cmd', `node -e "console.log('ok 1 - XX-01 a')"`, '--json']);
  const gj = JSON.parse(g.stdout);
  assert.deepStrictEqual(gj.unattributedFailures, { count: 0, lines: [] });
});
