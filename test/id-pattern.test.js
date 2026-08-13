'use strict';
// gate-id-pattern — SR-50..SR-55, GT-22..GT-25, CK-13..CK-16, DR-16..DR-18:
// the effective id-pattern resolves flag > config > default, one contract for four consumers.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const PATTERN = '[A-Z]+(-[A-Z]+)*-\\d+[a-z]*';
const SPEC3 = '#### Scenario: AC-01 plain\n#### Scenario: AC-08a suffixed\n#### Scenario: AC-BIS-01 multi\n';
const TAP3 = `node -e "['AC-01 plain','AC-08a suffixed','AC-BIS-01 multi'].forEach((t,i)=>console.log('ok '+(i+1)+' - '+t))"`;
const CTRL = new RegExp('[\\x00-\\x1f\\x7f]');

function proj(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-idp-'));
  for (const [rel, c] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), c);
  }
  return root;
}
const run = (root, args) => spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd: root });
const vrun = (root, args) => run(root, ['verify', ...args]);
const marker = (root) => path.join(root, 'ran.marker');
const markerCmd = (root) => `node -e "require('fs').writeFileSync(${JSON.stringify(marker(root)).replace(/"/g, '\\"')},'x');console.log('1..0')"`;

// ---- SR: verify ----

test('SR-50 the config row takes effect without a flag', () => {
  const files = { 'apriori/specs/m/spec.md': SPEC3 };
  const bare = proj(files);
  const r1 = JSON.parse(vrun(bare, ['--specs', 'apriori/specs', '--test-cmd', TAP3, '--json']).stdout);
  assert.strictEqual(r1.unidentified.length, 2, 'without the row only AC-01 is identified');
  const cfg = proj({ ...files, 'apriori/process-config.md': `| id-pattern | ${PATTERN} |\n` });
  const out = vrun(cfg, ['--specs', 'apriori/specs', '--test-cmd', TAP3, '--json']);
  const r2 = JSON.parse(out.stdout);
  assert.strictEqual(r2.unidentified.length, 0, 'config row identifies all three: ' + out.stdout + out.stderr);
  assert.strictEqual(r2.result, 'GREEN');
});

test('SR-51 the flag overrides and shields the config', () => {
  const root = proj({
    'apriori/specs/m/spec.md': SPEC3,
    'apriori/process-config.md': '| id-pattern | ( |\n',        // syntactically INVALID row
  });
  const r = vrun(root, ['--specs', 'apriori/specs', '--id-pattern', PATTERN, '--test-cmd', TAP3, '--json']);
  const j = JSON.parse(r.stdout);
  assert.strictEqual(j.result, 'GREEN', r.stdout + r.stderr);   // flag binds; broken config never consulted
  assert.strictEqual(r.status, 0);
});

test('SR-52 an invalid effective pattern refuses to run', () => {
  // flag origin
  const a = proj({ 'apriori/specs/m/spec.md': SPEC3 });
  const ra = vrun(a, ['--specs', 'apriori/specs', '--id-pattern', '(', '--test-cmd', markerCmd(a), '--json']);
  assert.strictEqual(ra.status, 2, ra.stdout + ra.stderr);
  const ja = JSON.parse(ra.stdout);
  assert.strictEqual(ja.result, 'ERROR');
  assert.match(ja.errors.join(' '), /--id-pattern/);
  assert.ok(!fs.existsSync(marker(a)), 'test command never spawned (flag origin)');
  // empty flag never falls back to config
  const e = proj({ 'apriori/specs/m/spec.md': SPEC3, 'apriori/process-config.md': `| id-pattern | ${PATTERN} |\n` });
  const re = vrun(e, ['--specs', 'apriori/specs', '--id-pattern', '', '--test-cmd', markerCmd(e), '--json']);
  assert.strictEqual(re.status, 2);
  assert.match(JSON.parse(re.stdout).errors.join(' '), /empty --id-pattern/);
  assert.ok(!fs.existsSync(marker(e)));
  // config origin
  const c = proj({ 'apriori/specs/m/spec.md': SPEC3, 'apriori/process-config.md': '| id-pattern | ( |\n' });
  const rc = vrun(c, ['--specs', 'apriori/specs', '--test-cmd', markerCmd(c), '--json']);
  assert.strictEqual(rc.status, 2);
  assert.match(JSON.parse(rc.stdout).errors.join(' '), /process-config/);
  assert.ok(!fs.existsSync(marker(c)), 'test command never spawned (config origin)');
  // whole-message sanitization: control chars stripped, bounded incl. ellipsis, no engine re-leak
  const evil = '(' + 'x'.repeat(300);
  const rs = vrun(a, ['--specs', 'apriori/specs', '--id-pattern', evil, '--test-cmd', markerCmd(a), '--json']);
  const errs = JSON.parse(rs.stdout).errors;
  for (const piece of errs) {
    assert.doesNotMatch(piece, CTRL, 'no control characters');
    assert.ok(piece.length <= 200, `bounded incl ellipsis: ${piece.length}`);
  }
  // --change --json keeps the projection field on the error path
  const ch = proj({
    'apriori/specs/m/spec.md': '### Requirement: R1\n\n#### Scenario: AC-01 plain\n- t\n',
    'apriori/changes/z/flow-state.md': 'change: z\ntier: medium\n',
    'apriori/changes/z/specs/m/spec.md': '## ADDED Requirements\n\n### Requirement: R2\n\n#### Scenario: AC-02 b\n- t\n',
    'apriori/process-config.md': '| id-pattern | ( |\n',
  });
  const rch = vrun(ch, ['--change', 'z', '--test-cmd', markerCmd(ch), '--json']);
  assert.strictEqual(rch.status, 2, rch.stdout + rch.stderr);
  const jch = JSON.parse(rch.stdout);
  assert.ok(jch.projection, 'projection survives the early exit');
  assert.deepStrictEqual(jch.projection.modules, ['m/spec.md']);
  assert.ok(!fs.existsSync(marker(ch)));
});

test('SR-52 validation precedes every spec read, and sanitization survives adversarial sources', () => {
  // invalid flag + NONEXISTENT specs target: the error must be about the pattern, not the
  // missing target — proof that validation fires before any spec I/O
  const a = proj({});
  const r = vrun(a, ['--specs', 'no/such/dir', '--id-pattern', '(', '--test-cmd', 'node -e ""', '--json']);
  assert.strictEqual(r.status, 2);
  const j = JSON.parse(r.stdout);
  assert.match(j.errors.join(' '), /--id-pattern/);
  assert.doesNotMatch(j.errors.join(' '), /does not exist/);
  // control characters in BOTH origins are stripped; the raw source never re-leaks whole
  const evilFlag = '(\x01' + 'x'.repeat(300) + '\x7f';
  const rf = vrun(a, ['--specs', 'no/such/dir', '--id-pattern', evilFlag, '--test-cmd', 'node -e ""', '--json']);
  for (const piece of JSON.parse(rf.stdout).errors) {
    assert.doesNotMatch(piece, CTRL);
    assert.ok(piece.length <= 200);
    assert.ok(!piece.includes('x'.repeat(150)), 'raw source does not re-leak');
  }
  const c = proj({ 'apriori/specs/m/spec.md': SPEC3,
    'apriori/process-config.md': '| id-pattern | (\x01' + 'y'.repeat(300) + ' |\n' });
  const rc = vrun(c, ['--specs', 'apriori/specs', '--test-cmd', 'node -e ""', '--json']);
  assert.strictEqual(rc.status, 2);
  for (const piece of JSON.parse(rc.stdout).errors) {
    assert.match(piece, /process-config/);
    assert.doesNotMatch(piece, CTRL);
    assert.ok(piece.length <= 200);
    assert.ok(!piece.includes('y'.repeat(150)));
  }
  // text mode keeps the existing error contract
  const rt = vrun(c, ['--specs', 'apriori/specs', '--test-cmd', 'node -e ""']);
  assert.strictEqual(rt.status, 2);
  assert.match(rt.stderr, /error: .*process-config/);
  assert.match(rt.stdout, /RESULT: ERROR/);
});

test('SR-53 absent flag and config the default binds unchanged', () => {
  const root = proj({ 'apriori/specs/m/spec.md': '#### Scenario: XX-01 a\n' });
  const r = JSON.parse(vrun(root, ['--specs', 'apriori/specs', '--test-cmd', `node -e "console.log('ok 1 - XX-01 a')"`, '--json']).stdout);
  assert.strictEqual(r.result, 'GREEN');
});

test('SR-54 catastrophic config matching is terminated, adversarial titles included', () => {
  const evilTitle = 'a'.repeat(40) + '!';
  const root = proj({
    'apriori/specs/m/spec.md': `#### Scenario: ${evilTitle}\n`,
    'apriori/process-config.md': '| id-pattern | (a+)+$ |\n',
  });
  const t0 = Date.now();
  const r = vrun(root, ['--specs', 'apriori/specs', '--test-cmd', markerCmd(root), '--json']);
  const elapsed = Date.now() - t0;
  // the deterministic 2000ms budget proof lives in the CHILD_SPAWN_OPTS assertion; here we
  // only need termination evidence — a tight lower bound flakes under full-suite load
  assert.ok(elapsed < 15000, `terminated within budget (${elapsed}ms)`);
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  const errText = JSON.parse(r.stdout).errors.join(' ');
  assert.match(errText, /process-config/);
  assert.match(errText, /timeout|terminated/, 'the message names the termination, not a spawn error');
  assert.ok(!fs.existsSync(marker(root)), 'test command never spawned');
  // the real multi-segment pattern completes normally through the child
  const ok = proj({ 'apriori/specs/m/spec.md': SPEC3, 'apriori/process-config.md': `| id-pattern | ${PATTERN} |\n` });
  const rok = vrun(ok, ['--specs', 'apriori/specs', '--test-cmd', TAP3, '--json']);
  assert.strictEqual(JSON.parse(rok.stdout).result, 'GREEN');
});

test('SR-55 every child failure class fails closed', () => {
  const sr = require('../lib/spec-runner');
  const resolvedCfg = { source: '[A-Z]+-\\d+', origin: 'config' };
  const etimedout = new Error('spawnSync ETIMEDOUT'); etimedout.code = 'ETIMEDOUT';
  const classes = [
    ['timeout', { status: null, signal: 'SIGKILL', stdout: '', error: null }, /^timeout/],
    ['timeout-etimedout', { status: null, signal: 'SIGKILL', stdout: '', error: etimedout }, /^timeout/],   // real spawnSync timeout carries BOTH
    ['spawn-error', { status: null, signal: null, stdout: '', error: new Error('ENOENT') }, /^spawn-error/],
    ['signal', { status: null, signal: 'SIGSEGV', stdout: '{"ids":[]}', error: null }, /^signal/],
    ['non-zero-exit', { status: 1, signal: null, stdout: '', error: null }, /^non-zero-exit/],
    ['malformed-not-json', { status: 0, signal: null, stdout: 'nope', error: null }, /^malformed/],
    ['malformed-length', { status: 0, signal: null, stdout: '{"ids":[]}', error: null }, /^malformed/],       // batch of 1 vs length 0
    ['malformed-element', { status: 0, signal: null, stdout: '{"ids":[42]}', error: null }, /^malformed/],
    ['malformed-extra-field', { status: 0, signal: null, stdout: '{"ids":["AC-01"],"extra":true}', error: null }, /^malformed/],   // strict {ids}-only shape
    ['malformed-missing-ids', { status: 0, signal: null, stdout: '{"nope":[]}', error: null }, /^malformed/],
  ];
  for (const [label, fake, expect] of classes) {
    sr._setChildRunner(() => fake);
    const m = sr.makeIdMatcher(resolvedCfg);
    const out = m.batch(['AC-01 x']);
    assert.ok(out.failure, `${label} fails closed`);
    assert.match(out.failure, expect, `${label} classified correctly: ${out.failure}`);
  }
  // well-formed response binds
  sr._setChildRunner(() => ({ status: 0, signal: null, stdout: '{"ids":["AC-01"]}', error: null }));
  assert.deepStrictEqual(sr.makeIdMatcher(resolvedCfg).batch(['AC-01 x']), { ids: ['AC-01'] });
  // flag/default origins never touch the child
  sr._setChildRunner(() => { throw new Error('child must not be called'); });
  for (const origin of ['flag', 'default']) {
    const m = sr.makeIdMatcher({ source: '[A-Z]+-\\d+', origin });
    assert.deepStrictEqual(m.batch(['AC-01 x']), { ids: ['AC-01'] });
  }
  sr._setChildRunner(null);   // restore default
});

// ---- GT: gate ----
const gate = require('../lib/gate');
const FLOW = (name) => `change: ${name}\ntier: medium\ntrack: harden\ntrack-rationale: r\nlineage: main\ncurrent-step: STEP5\nround: 1\nnext-action: x\ngates:\n  - 2026-08-13T00:00 note: n\n`;
const LEDGER_OK = '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n| Q-1 | a | low | 1 | verified |\n';
const SUFFIX_STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01b base\n- t\n';
const PLAIN_DELTA = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const SUFFIX_PATTERN = '[A-Z]+-\\d+[a-z]*';
const SUFFIX_TAP = `node -e "console.log('ok 1 - XA-01b a');console.log('ok 2 - XB-01 b')"`;

function gateProj(extra) {
  return proj({
    'apriori/specs/kv/spec.md': SUFFIX_STORE,
    'apriori/changes/c/flow-state.md': FLOW('c'),
    'apriori/changes/c/tasks.md': '- [x] T1 done\n',
    'apriori/changes/c/specs/kv/spec.md': PLAIN_DELTA,
    'apriori/changes/c/review/issues.md': LEDGER_OK,
    ...extra,
  });
}

test('GT-22 gate accepts --id-pattern for C1', () => {
  // in-flight stage
  const root = gateProj({});
  const r = gate.runGate({ cwd: root, change: 'c', testCmd: SUFFIX_TAP, idPattern: SUFFIX_PATTERN });
  const c1 = r.checks.find((x) => x.id === 'C1');
  assert.strictEqual(c1.status, 'pass', c1 && c1.detail);
  const bare = gate.runGate({ cwd: root, change: 'c', testCmd: SUFFIX_TAP });
  const c1b = bare.checks.find((x) => x.id === 'C1');
  assert.match(c1b.detail, /unidentified/, 'without the pattern the suffixed ID is unidentified');
  // archived stage
  const aroot = proj({
    'apriori/specs/kv/spec.md': SUFFIX_STORE,
    'apriori/changes/archive/2026-01-01T0000-z/flow-state.md': FLOW('z'),
    'apriori/changes/archive/2026-01-01T0000-z/tasks.md': '- [x] T1\n',
    'apriori/changes/archive/2026-01-01T0000-z/review/issues.md': LEDGER_OK,
  });
  const ra = gate.runGate({ cwd: aroot, change: 'z', testCmd: `node -e "console.log('ok 1 - XA-01b a')"`, idPattern: SUFFIX_PATTERN });
  const c1a = ra.checks.find((x) => x.id === 'C1');
  assert.strictEqual(c1a.status, 'pass', c1a && c1a.detail);
});

test('GT-23 gate falls back to the config row', () => {
  const root = gateProj({ 'apriori/process-config.md': `| id-pattern | ${SUFFIX_PATTERN} |\n` });
  const r = gate.runGate({ cwd: root, change: 'c', testCmd: SUFFIX_TAP });
  const c1 = r.checks.find((x) => x.id === 'C1');
  assert.strictEqual(c1.status, 'pass', c1 && c1.detail);
});

test('GT-24 an invalid effective pattern is a gate ERROR', () => {
  const root = gateProj({});
  // uncompilable flag
  const r1 = gate.runGate({ cwd: root, change: 'c', testCmd: SUFFIX_TAP, idPattern: '(' });
  assert.strictEqual(r1.code, 2);
  assert.strictEqual(r1.result, 'ERROR');
  assert.match(r1.errors.join(' '), /--id-pattern/);
  // empty flag over a VALID config row: flag origin, never falls back
  const root2 = gateProj({ 'apriori/process-config.md': `| id-pattern | ${SUFFIX_PATTERN} |\n` });
  const r2 = gate.runGate({ cwd: root2, change: 'c', testCmd: SUFFIX_TAP, idPattern: '' });
  assert.strictEqual(r2.code, 2);
  assert.match(r2.errors.join(' '), /--id-pattern/);
  assert.doesNotMatch(r2.errors.join(' '), /process-config/);
  // uncompilable config row, no flag
  const root3 = gateProj({ 'apriori/process-config.md': '| id-pattern | ( |\n' });
  const r3 = gate.runGate({ cwd: root3, change: 'c', testCmd: SUFFIX_TAP });
  assert.strictEqual(r3.code, 2);
  assert.match(r3.errors.join(' '), /process-config/);
  // --json stays pure JSON through the CLI
  const rj = run(root, ['gate', '--change', 'c', '--id-pattern', '(', '--test-cmd', SUFFIX_TAP, '--json']);
  assert.strictEqual(rj.status, 2);
  const j = JSON.parse(rj.stdout);
  assert.strictEqual(j.result, 'ERROR');
  assert.match(j.errors.join(' '), /--id-pattern/);
});

test('GT-25 a terminated config-pattern match is a gate ERROR', () => {
  const evilTitle = 'a'.repeat(40) + '!';
  const root = proj({
    'apriori/specs/kv/spec.md': `### Requirement: Alpha\n\n#### Scenario: ${evilTitle}\n- t\n`,
    'apriori/changes/c/flow-state.md': FLOW('c'),
    'apriori/changes/c/tasks.md': '- [x] T1 done\n',
    'apriori/changes/c/specs/kv/spec.md': PLAIN_DELTA,
    'apriori/changes/c/review/issues.md': LEDGER_OK,
    'apriori/process-config.md': '| id-pattern | (a+)+$ |\n',
  });
  // through the REAL CLI: exit 2, stdout is EXACTLY one JSON document, termination named
  const rj = run(root, ['gate', '--change', 'c', '--test-cmd', SUFFIX_TAP, '--json']);
  assert.strictEqual(rj.status, 2, rj.stdout + rj.stderr);
  const j = JSON.parse(rj.stdout);                        // throws if anything pollutes stdout
  assert.strictEqual(j.result, 'ERROR');
  assert.match(j.errors.join(' '), /process-config/);
  assert.match(j.errors.join(' '), /timeout|terminated/);
});

test('GT-24 the gate CLI error matrix holds end to end', () => {
  const mk = (config) => proj({
    'apriori/specs/kv/spec.md': SUFFIX_STORE,
    'apriori/changes/c/flow-state.md': FLOW('c'),
    'apriori/changes/c/tasks.md': '- [x] T1 done\n',
    'apriori/changes/c/specs/kv/spec.md': PLAIN_DELTA,
    'apriori/changes/c/review/issues.md': LEDGER_OK,
    ...(config === null ? {} : { 'apriori/process-config.md': config }),
  });
  const cases = [
    [mk(null), ['--id-pattern', '('], /--id-pattern/],                                    // invalid flag
    [mk(`| id-pattern | ${SUFFIX_PATTERN} |\n`), ['--id-pattern', ''], /--id-pattern/],   // empty flag over VALID config
    [mk('| id-pattern | ( |\n'), ['--id-pattern', ''], /--id-pattern/],                   // empty flag over INVALID config (still flag origin)
    [mk('| id-pattern | ( |\n'), [], /process-config/],                                   // invalid config, no flag
  ];
  for (const [root, extra, origin] of cases) {
    const r = run(root, ['gate', '--change', 'c', '--test-cmd', SUFFIX_TAP, ...extra, '--json']);
    assert.strictEqual(r.status, 2, r.stdout + r.stderr);
    const j = JSON.parse(r.stdout);                       // exactly one JSON document on stdout
    assert.strictEqual(j.result, 'ERROR');
    assert.match(j.errors.join(' '), origin);
    if (extra.includes('')) assert.doesNotMatch(j.errors.join(' '), /process-config/, 'empty flag never falls back');
  }
});

// ---- CK: check ----

test('CK-13 CK-04 honors the config id-pattern row', () => {
  const files = { 'apriori/specs/m/spec.md': '#### Scenario: AC-08a suffixed\n#### Scenario: AC-BIS-01 multi\n' };
  const bare = proj(files);
  const r1 = run(bare, ['check']);
  assert.strictEqual(r1.status, 1, r1.stdout);
  assert.match(r1.stdout, /without a bindable ID/);
  const cfg = proj({ ...files, 'apriori/process-config.md': `| id-pattern | ${PATTERN} |\n` });
  const r2 = run(cfg, ['check']);
  assert.strictEqual(r2.status, 0, r2.stdout + r2.stderr);
});

test('CK-14 check and verify judge identically at the edges', () => {
  const { checkScenarioIds } = require('../lib/check');
  const sr = require('../lib/spec-runner');
  // EXPECTED is the independent oracle (never derived from the implementation): each case
  // states whether the title's leading token is a legal ID under the pattern.
  const cases = [
    ['[A-Z]+-\\d+[a-z]*', 'AC-08a suffixed', true],
    ['[A-Z]+(-[A-Z]+)*-\\d+', 'AC-BIS-01 multi', true],
    ['[A-Z]+-\\d+', 'AC-01_tail underscore-adjacent', false],
    ['[A-Z]+-\\d+', 'AC-01x alnum-adjacent', false],
    ['X\\d+\\.', 'X1. dot-ending pattern', true],
    ['^AC-\\d+', 'AC-1 self-anchored', true],
    ['(AC|BR)-\\d+', 'BR-2 alternation', true],
  ];
  for (const [pattern, title, expected] of cases) {
    // path 1: checkScenarioIds (CK-04's helper)
    const checkSide = checkScenarioIds(`#### Scenario: ${title}\n`, 'f.md', pattern).length === 0;
    assert.strictEqual(checkSide, expected, `check: ${pattern} vs '${title}'`);
    // path 2: verify's collection (inline matcher)
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-ck14-'));
    fs.writeFileSync(path.join(d, 'spec.md'), `#### Scenario: ${title}\n`);
    const col = sr.collectScenarios([d], new RegExp(pattern));
    assert.strictEqual(col.unidentified.length === 0, expected, `collect: ${pattern} vs '${title}'`);
    // path 3: the config-origin CHILD matcher (real child round-trip)
    const child = sr.makeIdMatcher({ source: pattern, origin: 'config' }).batch([title]);
    assert.ok(!child.failure, `child ok: ${child.failure}`);
    assert.strictEqual(child.ids[0] !== null, expected, `child: ${pattern} vs '${title}'`);
  }
});

test('CK-15 an invalid config id-pattern is a check ERROR', () => {
  const root = proj({
    'apriori/specs/m/spec.md': '#### Scenario: AC-01 a\n',
    'apriori/process-config.md': '| id-pattern | ( |\n',
  });
  const r = run(root, ['check']);
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /RESULT: ERROR/);
  assert.match(r.stderr + r.stdout, /process-config/);
});

test('CK-16 a terminated config-pattern match is a check ERROR', () => {
  const evilTitle = 'a'.repeat(40) + '!';
  const root = proj({
    'apriori/specs/m/spec.md': `#### Scenario: ${evilTitle}\n`,
    'apriori/process-config.md': '| id-pattern | (a+)+$ |\n',
  });
  const t0 = Date.now();
  const r = run(root, ['check']);
  assert.ok(Date.now() - t0 < 15000, 'terminated within budget');
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /RESULT: ERROR/);
  assert.match(r.stderr + r.stdout, /process-config/);
});

// ---- DR: doctor ----
const doctor = require('../lib/doctor');
const PKG_RUNBOOK = fs.readFileSync(path.join(__dirname, '..', 'RUNBOOK.md'), 'utf8');

function drProject(extraConfigRows, specContent) {
  const root = proj({
    'apriori/runbook.md': PKG_RUNBOOK,
    'apriori/.gitignore': 'tmp/\n',
    'apriori/specs/m/spec.md': specContent,
    'apriori/process-config.md': '| language | auto |\n' + extraConfigRows,
    'CLAUDE.md': 'Development follows `apriori/runbook.md`.\n',
    '.claude/commands/apriori.md': 'cmd\n',
  });
  fs.mkdirSync(path.join(root, 'apriori', 'tmp'), { recursive: true });
  fs.mkdirSync(path.join(root, 'apriori', 'changes'), { recursive: true });
  return root;
}
const DR_TAP = `node -e "console.log('TAP version 13');console.log('1..1');console.log('ok 1 - fine')"`;

test('DR-16 D6 names its pattern source', () => {
  const cfg = drProject(`| id-pattern | ${PATTERN} |\n`, '#### Scenario: AC-08a s\n');
  const r1 = doctor.runDoctor({ cwd: cfg, testCmd: DR_TAP });
  const d6a = r1.checks.find((c) => c.id === 'D6');
  assert.strictEqual(d6a.status, 'ok', d6a.detail);
  assert.match(d6a.detail, /config/, 'names the config source');
  const bare = drProject('', '#### Scenario: AC-08a s\n');
  const r2 = doctor.runDoctor({ cwd: bare, testCmd: DR_TAP });
  const d6b = r2.checks.find((c) => c.id === 'D6');
  assert.strictEqual(d6b.status, 'finding', d6b.detail);   // suffixed ID unbindable under default
  assert.match(d6b.detail, /default/, 'names the default source');
});

test('DR-17 an invalid config id-pattern is a D6 finding and skips the probe', () => {
  const root = drProject('| id-pattern | ( |\n', '#### Scenario: AC-01 a\n');
  const cmd = markerCmd(root);
  // scan-not-happened proof: any matcher child call under an invalid config is a bug
  const sr = require('../lib/spec-runner');
  let childCalls = 0;
  sr._setChildRunner(() => { childCalls++; throw new Error('must not scan'); });
  const r = doctor.runDoctor({ cwd: root, testCmd: cmd });
  sr._setChildRunner(null);
  assert.strictEqual(childCalls, 0, 'no scenario scan under an invalid config');
  const d6 = r.checks.find((c) => c.id === 'D6');
  assert.strictEqual(d6.status, 'finding', JSON.stringify(r.checks));
  assert.match(d6.detail, /process-config/);
  assert.match(String(d6.fix), /id-pattern/, 'the finding carries its repair fix');
  const d5 = r.checks.find((c) => c.id === 'D5');
  assert.strictEqual(d5.status, 'n/a');
  assert.match(d5.detail, /probe skipped \(invalid id-pattern config\)/);
  assert.ok(!fs.existsSync(marker(root)), 'sentinel: the command never ran');
  assert.strictEqual(r.result, 'FINDINGS');
  assert.strictEqual(r.code, 1);
});

test('DR-18 a terminated config-pattern scan is a D6 finding and skips the probe', () => {
  const evilTitle = 'a'.repeat(40) + '!';
  const root = drProject('| id-pattern | (a+)+$ |\n', `#### Scenario: ${evilTitle}\n`);
  const cmd = markerCmd(root);
  const r = doctor.runDoctor({ cwd: root, testCmd: cmd });
  const d6 = r.checks.find((c) => c.id === 'D6');
  assert.strictEqual(d6.status, 'finding', JSON.stringify(r.checks));
  assert.match(d6.detail, /process-config/);
  const d5 = r.checks.find((c) => c.id === 'D5');
  assert.strictEqual(d5.status, 'n/a');
  assert.match(d5.detail, /probe skipped \(invalid id-pattern config\)/);
  assert.ok(!fs.existsSync(marker(root)), 'sentinel: the command never ran');
  assert.strictEqual(r.result, 'FINDINGS');
  assert.strictEqual(r.code, 1);
});

// ---- IMPL-1/IMPL-7 hardening: unreadable-config consumer matrix, template/doc completeness ----

test('CF-11 an unreadable config fails closed across all four consumers', () => {
  const mk = () => {
    const root = proj({ 'apriori/specs/m/spec.md': '#### Scenario: AC-01 a\n' });
    fs.mkdirSync(path.join(root, 'apriori', 'process-config.md'), { recursive: true });   // a DIRECTORY
    return root;
  };
  const v = vrun(mk(), ['--specs', 'apriori/specs', '--test-cmd', 'node -e ""', '--json']);
  assert.strictEqual(v.status, 2);
  assert.match(JSON.parse(v.stdout).errors.join(' '), /process-config/);
  const groot = mk();
  fs.mkdirSync(path.join(groot, 'apriori/changes/c/specs/m'), { recursive: true });
  fs.writeFileSync(path.join(groot, 'apriori/changes/c/flow-state.md'), 'change: c\ntier: medium\ntrack: harden\ntrack-rationale: r\nlineage: main\ncurrent-step: STEP5\nround: 1\nnext-action: x\n');
  fs.writeFileSync(path.join(groot, 'apriori/changes/c/specs/m/spec.md'), '## ADDED Requirements\n\n### Requirement: R\n\n#### Scenario: AC-02 b\n- t\n');
  const g = run(groot, ['gate', '--change', 'c', '--test-cmd', 'node -e ""', '--json']);
  assert.strictEqual(g.status, 2);
  assert.match(JSON.parse(g.stdout).errors.join(' '), /process-config/);
  const c = run(mk(), ['check']);
  assert.strictEqual(c.status, 2);
  assert.match(c.stdout, /RESULT: ERROR/);
  const droot = mk();
  const dr = require('../lib/doctor').runDoctor({ cwd: droot, testCmd: markerCmd(droot) });
  const d6 = dr.checks.find((x) => x.id === 'D6');
  assert.strictEqual(d6.status, 'finding');
  assert.match(d6.detail, /process-config/);
  const d5 = dr.checks.find((x) => x.id === 'D5');
  assert.strictEqual(d5.status, 'n/a');
  assert.ok(!fs.existsSync(marker(droot)));
});

test('CF-12 template, docs and changelog carry the full id-pattern story', () => {
  const { parseConfig } = require('../lib/config');
  const repo = path.join(__dirname, '..');
  const tpl = fs.readFileSync(path.join(repo, 'templates', 'process-config.md'), 'utf8');
  // the whole template table survives parsing: full expected key/value map
  const { values, conflicts } = parseConfig(tpl);
  assert.strictEqual(conflicts.size, 0);
  for (const [k, v] of [['language', 'auto'], ['id-pattern', '[A-Z]+-\\d+'], ['cas', 'required'],
    ['step0-cap', '5'], ['step2-cap', '4'], ['step5-cap', '25'], ['step6-cap', '4'],
    ['spike-cap', '10'], ['extraction-review-cap', '2'], ['shrink-state', 'none'],
    ['rejected-ratio-guard', '50%'], ['shrink-proposal-freq', '5'], ['post-merge-review-freq', '1 in 5']])
    assert.strictEqual(values.get(k), v, `template key ${k}`);
  // the escaping guidance lives in an HTML comment (non-content), stating both layers
  const comments = [...tpl.matchAll(/<!--[\s\S]*?-->/g)].map((m) => m[0]);
  const guide = comments.find((c) => c.includes('id-pattern'));
  assert.ok(guide, 'an id-pattern comment exists');
  assert.ok(guide.includes('\\|'), 'comment shows the in-cell escape');
  assert.ok(guide.includes('[\\|]'), 'comment shows the literal-pipe class form');
  // EN/CN docs both carry the two-layer wording
  for (const doc of ['docs/cli.md', 'docs/cli_cn.md']) {
    const text = fs.readFileSync(path.join(repo, doc), 'utf8');
    assert.ok(text.includes('\\|'), `${doc} shows the in-cell escape`);
    assert.ok(text.includes('[\\|]'), `${doc} shows the literal-pipe class form`);
    assert.match(text, /id-pattern/, `${doc} documents the key`);
  }
  // CHANGELOG names the change
  assert.match(fs.readFileSync(path.join(repo, 'CHANGELOG.md'), 'utf8'), /id-pattern/);
  // check --self stays green with the doc edits
  const self = spawnSync('node', [BIN, 'check', '--self'], { encoding: 'utf8', cwd: repo });
  assert.strictEqual(self.status, 0, self.stdout);
});

// ---- P8 r2 hardening: IMPL-1 dangling symlink, IMPL-2 budget contract, IMPL-3 end-to-end
// sanitization, IMPL-9 second-application branch + same-store contrast ----

test('CF-11 a dangling-symlink config is present-but-unreadable, never absent', () => {
  const { getConfig } = require('../lib/config');
  const root = proj({ 'apriori/specs/m/spec.md': '#### Scenario: AC-01 a\n' });
  fs.symlinkSync(path.join(root, 'no-such-target.md'), path.join(root, 'apriori', 'process-config.md'));
  const { value, problem } = getConfig(root, 'id-pattern');
  assert.strictEqual(value, null);
  assert.match(String(problem), /process-config/, 'fails closed, not silent-absent');
  const v = vrun(root, ['--specs', 'apriori/specs', '--test-cmd', 'node -e ""', '--json']);
  assert.strictEqual(v.status, 2);
  assert.match(JSON.parse(v.stdout).errors.join(' '), /process-config/);
});

test('SR-54 the child spawn contract pins the budget deterministically', () => {
  const sr = require('../lib/spec-runner');
  assert.strictEqual(sr.CHILD_SPAWN_OPTS.timeout, 2000);
  assert.strictEqual(sr.CHILD_SPAWN_OPTS.killSignal, 'SIGKILL');
  assert.strictEqual(sr.CHILD_SPAWN_OPTS.shell, false);
});

test('SR-55 every child failure class surfaces sanitized through verify, check and doctor', () => {
  const sr = require('../lib/spec-runner');
  const dirtyDetail = 'X\x01\x02' + 'z'.repeat(400);
  const dirtyErr = new Error(dirtyDetail);
  const classes = [
    ['timeout', { status: null, signal: 'SIGKILL', stdout: '', error: null }],
    ['spawn-error-dirty', { status: null, signal: null, stdout: '', error: dirtyErr }],
    ['signal', { status: null, signal: 'SIGSEGV', stdout: '{"ids":[]}', error: null }],
    ['non-zero-exit', { status: 1, signal: null, stdout: '', error: null }],
    ['malformed', { status: 0, signal: null, stdout: 'nope', error: null }],
  ];
  const root = proj({
    'apriori/specs/m/spec.md': '#### Scenario: AC-01 a\n',
    'apriori/process-config.md': '| id-pattern | [A-Z]+-\\d+ |\n',
  });
  for (const [label, fake] of classes) {
    sr._setChildRunner(() => fake);
    // through verify(): the final errors[] is the sanitized config-origin channel
    const run2 = sr.verify({ specs: [path.join(root, 'apriori/specs')], testCmd: 'node -e ""', cwd: root });
    assert.strictEqual(run2.errors.length > 0, true, `${label}: verify fails closed`);
    for (const e of run2.errors) {
      assert.match(e, /process-config/, `${label}: origin named`);
      assert.doesNotMatch(e, CTRL, `${label}: no control chars`);
      assert.ok(e.length <= 200, `${label}: bounded (${e.length})`);
      assert.ok(!e.includes('z'.repeat(250)), `${label}: dirty detail does not re-leak whole`);
    }
  }
  // doctor's final finding is sanitized too
  sr._setChildRunner(() => ({ status: null, signal: null, stdout: '', error: dirtyErr }));
  const droot = drProject('| id-pattern | [A-Z]+-\\d+ |\n', '#### Scenario: AC-01 a\n');
  const dr = require('../lib/doctor').runDoctor({ cwd: droot, testCmd: markerCmd(droot) });
  const d6 = dr.checks.find((c) => c.id === 'D6');
  assert.strictEqual(d6.status, 'finding');
  assert.match(d6.detail, /process-config/);
  assert.doesNotMatch(d6.detail, CTRL);
  assert.ok(d6.detail.length <= 200);
  assert.ok(!fs.existsSync(marker(droot)), 'D5 probe skipped');
  // check's final error is sanitized (in-process cli with captured console)
  const checkMod = require('../lib/check');
  const croot = proj({
    'apriori/specs/m/spec.md': '#### Scenario: AC-01 a\n',
    'apriori/process-config.md': '| id-pattern | [A-Z]+-\\d+ |\n',
  });
  const oldCwd = process.cwd(); const logs = [], errsOut = [];
  const oldLog = console.log, oldErr = console.error;
  console.log = (...a) => logs.push(a.join(' ')); console.error = (...a) => errsOut.push(a.join(' '));
  let code;
  try { process.chdir(croot); code = checkMod.cli([]); }
  finally { process.chdir(oldCwd); console.log = oldLog; console.error = oldErr; sr._setChildRunner(null); }
  assert.strictEqual(code, 2);
  assert.match(logs.join('\n'), /RESULT: ERROR/);
  const errLine = errsOut.join('\n');
  assert.match(errLine, /process-config/);
  assert.doesNotMatch(errLine, CTRL);
  assert.ok(!errLine.includes('z'.repeat(250)));
});

test('SR-54 a TAP-batch failure after the test command still fails closed, and the real pattern passes the same store', () => {
  const sr = require('../lib/spec-runner');
  const evilTitle = 'a'.repeat(40) + '!';
  const root = proj({
    'apriori/specs/m/spec.md': `#### Scenario: AC-01 ok\n#### Scenario: ${evilTitle}\n`,
    'apriori/process-config.md': '| id-pattern | [A-Z]+-\\d+ |\n',
  });
  // sequential seam: title batch answers well-formed; the TAP-description batch times out
  for (const [label, second] of [
    ['tap-timeout', { status: null, signal: 'SIGKILL', stdout: '', error: null }],
    ['tap-malformed', { status: 0, signal: null, stdout: '{"ids":"nope"}', error: null }],
  ]) {
    let call = 0;
    sr._setChildRunner((payload) => {
      call++;
      const { texts } = JSON.parse(payload);
      if (call === 1) return { status: 0, signal: null, stdout: JSON.stringify({ ids: texts.map((t) => (t.startsWith('AC-01') ? 'AC-01' : null)) }), error: null };
      return second;
    });
    const run2 = sr.verify({ specs: [path.join(root, 'apriori/specs')], testCmd: markerCmd(root), cwd: root });
    sr._setChildRunner(null);
    assert.strictEqual(call >= 2, true, `${label}: both application branches went through the child`);
    assert.ok(fs.existsSync(marker(root)), `${label}: the test command DID run before the TAP batch`);
    fs.rmSync(marker(root));
    assert.ok(run2.errors.length > 0, `${label}: fails closed`);
    assert.match(run2.errors.join(' '), /process-config/);
    for (const e of run2.errors) { assert.doesNotMatch(e, CTRL); assert.ok(e.length <= 200); }
  }
  // same-store contrast: the real multi-segment pattern over the SAME adversarial-title store
  // completes through the child — no matcher failure (the evil title is merely unidentified)
  const sameStore = proj({
    'apriori/specs/m/spec.md': `#### Scenario: AC-01 ok\n#### Scenario: ${evilTitle}\n`,
    'apriori/process-config.md': `| id-pattern | ${PATTERN} |\n`,
  });
  const rok = vrun(sameStore, ['--specs', 'apriori/specs', '--test-cmd', `node -e "console.log('ok 1 - AC-01 ok')"`, '--json']);
  const jok = JSON.parse(rok.stdout);
  assert.strictEqual(jok.result, 'GAPS', rok.stdout);                 // ordinary gap, not a matcher failure
  assert.strictEqual(jok.errors.length, 0, 'no matcher failure');
  assert.strictEqual(jok.unidentified.length, 1);
});
