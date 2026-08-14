'use strict';
// gate-degrades — a missing test command disables C1 alone, never the whole evaluation
// (GT-30..GT-38) plus the shared projection seam it rests on (SR-73..SR-75).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');

// require BOTH modules before any override is installed — a builder captured at module
// load time must not be able to hide behind a late require (T14 phase ①).
const sr = require('../lib/spec-runner');
const gate = require('../lib/gate');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
function run(args, cwd) { return spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd }); }

function mkProject(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-degrade-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return root;
}

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const DELTA = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
const FLOW = (name, tier = 'medium') => `change: ${name}\ntier: ${tier}\ntrack: harden\ntrack-rationale: r\nlineage: v4\ncurrent-step: STEP5\nround: 1\nnext-action: x\ngates:\n  - 2026-08-14T00:00 note: n\n`;
const LEDGER_OK = '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n| Q-1 | a | low | 1 | verified |\n';

// a healthy in-flight change with NO test-cmd anywhere (no process-config.md at all)
function noCmdProject(name = 'c', extra = {}) {
  return mkProject({
    'apriori/specs/kv/spec.md': STORE,
    [`apriori/changes/${name}/flow-state.md`]: FLOW(name),
    [`apriori/changes/${name}/tasks.md`]: '- [x] T1 done\n',
    [`apriori/changes/${name}/specs/kv/spec.md`]: DELTA,
    [`apriori/changes/${name}/review/issues.md`]: LEDGER_OK,
    ...extra,
  });
}
const cfg = (rows) => `| Field | Value |\n|---|---|\n${rows}`;
const check = (r, id) => r.checks.find((c) => c.id === id);

test('GT-30 an absent test command skips C1 and runs the rest', () => {
  const root = noCmdProject();
  const r = gate.runGate({ cwd: root, change: 'c' });
  assert.strictEqual(r.result, 'INCOMPLETE', `errors: ${r.errors}`);
  assert.strictEqual(r.code, 3);
  const c1 = check(r, 'C1');
  assert.strictEqual(c1.status, 'skipped');
  assert.match(c1.detail, /did not run/, 'the detail states the fact');
  assert.match(c1.detail, /--test-cmd|test-cmd row/, 'the detail carries the cure');
  for (const id of ['C2', 'C3', 'C4', 'C5', 'C6', 'C7']) {
    const c = check(r, id);
    assert.ok(c, `${id} still reported`);
    assert.notStrictEqual(c.status, 'skipped', `${id} is a real conclusion, not a skip`);
  }
});

test('GT-31 a confirmed block outranks an unrun check', () => {
  const root = noCmdProject();
  fs.appendFileSync(path.join(root, 'apriori/changes/c/tasks.md'), '- [ ] T2 open\n');
  const r = gate.runGate({ cwd: root, change: 'c' });
  assert.strictEqual(r.result, 'BLOCKED');
  assert.strictEqual(r.code, 1);
  assert.strictEqual(r.blocked, 1, 'blocked counts blocked only — a skip never inflates it');
  assert.strictEqual(check(r, 'C1').status, 'skipped');
});

test('GT-32 an empty, whitespace-only, or non-string test command is an error, not an absence', () => {
  const root = noCmdProject();
  for (const v of ['', '   ']) {
    const r = gate.runGate({ cwd: root, change: 'c', testCmd: v });
    assert.strictEqual(r.code, 2, `${JSON.stringify(v)} must be an error`);
    assert.strictEqual(r.result, 'ERROR');
    assert.ok(r.errors.some((e) => /test-cmd/.test(e)), `names the flag: ${r.errors}`);
  }
  for (const v of [1, [], {}, true]) {
    const r = gate.runGate({ cwd: root, change: 'c', testCmd: v });
    assert.strictEqual(r.code, 2, `${typeof v} must be an error`);
    assert.ok(r.errors.some((e) => /string/.test(e)), `names the type problem: ${r.errors}`);
  }
  // the CLI judges PRESENCE, never truthiness: an empty flag must not fall back to the config
  const withCfg = noCmdProject('c2', { 'apriori/process-config.md': cfg('| test-cmd | node -e "console.log(1)" |\n') });
  const cli = run(['gate', '--change', 'c2', '--test-cmd', ''], withCfg);
  assert.strictEqual(cli.status, 2, cli.stdout + cli.stderr);
  assert.match(cli.stderr, /test-cmd/);
});

test('GT-33 a broken config is an error while an empty config value is an absence', () => {
  const conflict = noCmdProject('c', { 'apriori/process-config.md': cfg('| test-cmd | a |\n| test-cmd | b |\n') });
  const r1 = gate.runGate({ cwd: conflict, change: 'c' });
  assert.strictEqual(r1.code, 2, 'a conflicting row is a broken config');

  // a whole config that cannot be READ is a broken config too — T4, and it must not be
  // mistaken for T7. A directory standing where the file belongs is deterministic on every
  // platform (a chmod would be defeated by a root-run CI sandbox).
  const unreadable = noCmdProject('c');
  fs.mkdirSync(path.join(unreadable, 'apriori/process-config.md'), { recursive: true });
  const rU = gate.runGate({ cwd: unreadable, change: 'c' });
  assert.strictEqual(rU.code, 2, `an unreadable config is an error, not an absence: ${rU.errors}`);
  assert.notStrictEqual(check(rU, 'C1') && check(rU, 'C1').status, 'skipped');

  // an empty value is normalised to "no such row" by the shared reader — gate treats it as ABSENT
  const empty = noCmdProject('c', { 'apriori/process-config.md': cfg('| test-cmd |  |\n') });
  const r2 = gate.runGate({ cwd: empty, change: 'c' });
  assert.strictEqual(r2.code, 3, `empty value = absent: ${r2.errors}`);
  assert.strictEqual(check(r2, 'C1').status, 'skipped');
});

test('GT-34 a skipped C1 still produces a real C7', () => {
  const stamped = '<!-- apriori-base: sha256:' + '0'.repeat(64) + ' -->\n';
  const root = noCmdProject('c', {
    'apriori/changes/c/specs/kv/spec.md': '## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t2\n',
  });
  // unstamped mutation → C7 blocks; the projection C7 reads was built without any test run
  const r = gate.runGate({ cwd: root, change: 'c' });
  const c7 = check(r, 'C7');
  assert.strictEqual(c7.status, 'blocked', `C7 detail: ${c7 && c7.detail}; errors: ${r.errors}`);
  assert.match(c7.detail, /apriori stamp/);
  assert.strictEqual(check(r, 'C1').status, 'skipped');
  assert.ok(stamped.length > 0);
});

test('GT-35 an untrustworthy projection still fails closed with no test command', () => {
  // (a) merge conflict — the delta ADDs a requirement the store already has, with DIFFERENT
  // content (identical content would be an already-applied rerun, which is not a conflict)
  const conflict = noCmdProject('c', {
    'apriori/changes/c/specs/kv/spec.md': '## ADDED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- different body\n',
  });
  assert.strictEqual(gate.runGate({ cwd: conflict, change: 'c' }).code, 2, 'merge conflict');

  // (b) malformed delta — a requirement block before any section heading
  const malformed = noCmdProject('c', {
    'apriori/changes/c/specs/kv/spec.md': '### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n',
  });
  assert.strictEqual(gate.runGate({ cwd: malformed, change: 'c' }).code, 2, 'malformed delta');

  // (c) diverged CAS base — a MODIFIED delta stamped against a store that has moved
  const diverged = noCmdProject('c', {
    'apriori/changes/c/specs/kv/spec.md': '<!-- apriori-base: sha256:' + 'a'.repeat(64) + ' -->\n\n## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t2\n',
  });
  assert.strictEqual(gate.runGate({ cwd: diverged, change: 'c' }).code, 2, 'diverged CAS base');

  // (d) no delta files at all — a discoverDeltas validation failure, not one of the three above
  const bare = mkProject({
    'apriori/specs/kv/spec.md': STORE,
    'apriori/changes/c/flow-state.md': FLOW('c'),
    'apriori/changes/c/tasks.md': '- [x] T1\n',
    'apriori/changes/c/review/issues.md': LEDGER_OK,
  });
  const rBare = gate.runGate({ cwd: bare, change: 'c' });
  assert.strictEqual(rBare.code, 2, `no delta files: ${rBare.errors}`);
  assert.ok(rBare.errors.some((e) => /no delta spec files/.test(e)), rBare.errors.join('; '));

  // (e) any other error the shared builder reports — e.g. a path escape — reaches gate the same way
  const root = noCmdProject();
  try {
    sr._setProjectionBuilder(() => ({ projection: { change: 'c', modules: [], conflicts: [], unstampedMutations: [] }, errors: ['delta path escapes the change root: /elsewhere/x.md'], texts: null }));
    const r = gate.runGate({ cwd: root, change: 'c' });
    assert.strictEqual(r.code, 2);
    assert.ok(r.errors.some((e) => /escapes/.test(e)), r.errors.join('; '));
  } finally { sr._setProjectionBuilder(null); }

  // (f) no trustworthy texts while errors is EMPTY — gate synthesises its own diagnostic
  try {
    sr._setProjectionBuilder(() => ({ projection: { change: 'c', modules: [], conflicts: [], unstampedMutations: [] }, errors: [], texts: null }));
    const r = gate.runGate({ cwd: root, change: 'c' });
    assert.strictEqual(r.code, 2, 'an untrustworthy projection fails closed even with no stated reason');
    assert.ok(r.errors.length > 0, 'errors is never empty on an ERROR');
    assert.strictEqual(check(r, 'C7'), undefined, 'C7 draws no conclusion');
  } finally { sr._setProjectionBuilder(null); }
});

test('GT-36 a broken id-pattern is an error even when C1 is skipped', () => {
  const bad = [
    ['flag empty', { idPattern: '' }, {}],
    ['flag uncompilable', { idPattern: '[' }, {}],
    ['config uncompilable', {}, { 'apriori/process-config.md': cfg('| id-pattern | [ |\n') }],
    ['config conflicting', {}, { 'apriori/process-config.md': cfg('| id-pattern | [A-Z]+-\\d+ |\n| id-pattern | [a-z]+ |\n') }],
  ];
  for (const [label, opts, extra] of bad) {
    const root = noCmdProject('c', extra);
    const r = gate.runGate({ cwd: root, change: 'c', ...opts });
    assert.strictEqual(r.code, 2, `${label}: ${JSON.stringify(r.errors)}`);
  }
  // archived stage too — a broken pattern outranks the archived degradation
  const arch = mkProject({
    'apriori/specs/kv/spec.md': STORE,
    'apriori/changes/archive/2026-08-14T0000-c/flow-state.md': FLOW('c').replace('STEP5', 'DONE'),
    'apriori/changes/archive/2026-08-14T0000-c/tasks.md': '- [x] T1\n',
    'apriori/changes/archive/2026-08-14T0000-c/review/issues.md': LEDGER_OK,
    'apriori/process-config.md': cfg('| id-pattern | [ |\n'),
  });
  assert.strictEqual(gate.runGate({ cwd: arch, change: 'c' }).code, 2, 'archived + broken pattern');

  // a VALID config-origin pattern is compile-checked but never MATCHED — no matcher child runs
  const okCfg = noCmdProject('c', { 'apriori/process-config.md': cfg('| id-pattern | [A-Z]+-\\d+ |\n') });
  let childCalls = 0;
  try {
    sr._setChildRunner(() => { childCalls++; return { status: 0, signal: null, stdout: '{"ids":[]}', error: null }; });
    const r = gate.runGate({ cwd: okCfg, change: 'c' });
    assert.strictEqual(r.code, 3, `expected INCOMPLETE: ${r.errors}`);
    assert.strictEqual(childCalls, 0, 'a skipped C1 collects no scenarios, so no matcher child is spawned');
  } finally { sr._setChildRunner(null); }
});

test('GT-37 the earlier refusals still win over the degradation', () => {
  const hot = mkProject({
    'apriori/specs/kv/spec.md': STORE,
    'apriori/changes/h/hotfix-state.md': 'hotfix: fix\n',
  });
  const rh = gate.runGate({ cwd: hot, change: 'h' });
  assert.strictEqual(rh.code, 2);
  assert.ok(rh.errors.some((e) => /hotfix archive/.test(e)), `m1 pointer, not a flow-state message: ${rh.errors}`);
  assert.ok(!rh.errors.some((e) => /flow-state\.md/.test(e)), 'a lane bundle is never reported as a missing flow-state');

  const noFlow = mkProject({
    'apriori/specs/kv/spec.md': STORE,
    'apriori/changes/c/tasks.md': '- [x] T1\n',
  });
  const rn = gate.runGate({ cwd: noFlow, change: 'c' });
  assert.strictEqual(rn.code, 2);
  assert.ok(rn.errors.some((e) => /flow-state\.md/.test(e)), rn.errors.join('; '));
});

test('GT-38 the degradation reaches the archived stage too', () => {
  const root = mkProject({
    'apriori/specs/kv/spec.md': STORE,
    'apriori/changes/archive/2026-08-14T0000-c/flow-state.md': FLOW('c').replace('current-step: STEP5', 'current-step: DONE'),
    'apriori/changes/archive/2026-08-14T0000-c/tasks.md': '- [x] T1\n',
    'apriori/changes/archive/2026-08-14T0000-c/review/issues.md': LEDGER_OK,
  });
  let builderCalls = 0;
  let r;
  try {
    sr._setProjectionBuilder((...a) => { builderCalls++; return sr.buildChangeProjection(...a); });
    r = gate.runGate({ cwd: root, change: 'c' });
  } finally { sr._setProjectionBuilder(null); }
  assert.strictEqual(r.stage, 'archived');
  assert.strictEqual(check(r, 'C1').status, 'skipped');
  assert.strictEqual(check(r, 'C7').status, 'n/a');
  assert.strictEqual(builderCalls, 0, 'an archived bundle needs no projection — building one could only manufacture a false block');
  assert.strictEqual(r.code, 3);

  // a non-terminal ledger row still blocks at the archived stage, and that outranks the skip
  fs.writeFileSync(path.join(root, 'apriori/changes/archive/2026-08-14T0000-c/review/issues.md'),
    '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n| Q-1 | a | low | 1 | fixed |\n');
  const r2 = gate.runGate({ cwd: root, change: 'c' });
  assert.strictEqual(r2.code, 1);
  assert.strictEqual(check(r2, 'C4').status, 'blocked');
});

test('GT-11 --json carries the INCOMPLETE class without growing a key', () => {
  const root = noCmdProject();
  const r = run(['gate', '--change', 'c', '--json'], root);
  assert.strictEqual(r.status, 3, r.stdout + r.stderr);
  const j = JSON.parse(r.stdout);
  assert.deepStrictEqual(Object.keys(j).sort(), ['blocked', 'change', 'checks', 'errors', 'result', 'stage']);
  assert.strictEqual(j.result, 'INCOMPLETE');
  assert.strictEqual(j.blocked, 0);
  assert.strictEqual(j.checks.find((c) => c.id === 'C1').status, 'skipped');
  assert.ok(!('code' in j), 'the exit code is the mapping, never a JSON field');

  // the SAME key set in every other outcome class, including the strict-parser error
  // serializer, which builds its JSON on a completely separate path
  const KEYS = ['blocked', 'change', 'checks', 'errors', 'result', 'stage'];
  const withCmd = noCmdProject('p', { 'apriori/process-config.md': cfg('| test-cmd | node -e "console.log(\'ok 1 - XA-01 a\');console.log(\'ok 2 - XB-01 b\')" |\n') });
  const pass = run(['gate', '--change', 'p', '--json'], withCmd);
  assert.strictEqual(pass.status, 0, pass.stdout + pass.stderr);
  fs.appendFileSync(path.join(withCmd, 'apriori/changes/p/tasks.md'), '- [ ] T2 open\n');
  const blocked = run(['gate', '--change', 'p', '--json'], withCmd);
  assert.strictEqual(blocked.status, 1, blocked.stdout + blocked.stderr);
  const resolveErr = run(['gate', '--change', 'nope', '--json'], root);          // resolved ERROR
  // a genuine strict-parser rejection — a stray positional never reaches runGate, so this is
  // the separate jsonError serializer in lib/args, which builds its JSON on its own
  const usageErr = run(['gate', 'stray', '--change', 'c', '--json'], root);
  for (const [label, out] of [['PASS', pass], ['BLOCKED', blocked], ['ERROR(resolve)', resolveErr], ['ERROR(usage)', usageErr]]) {
    const o = JSON.parse(out.stdout);
    assert.deepStrictEqual(Object.keys(o).sort(), KEYS, `${label} key set`);
    assert.ok(!('code' in o), `${label} grows no code field`);
  }
  assert.strictEqual(JSON.parse(resolveErr.stdout).result, 'ERROR');
  assert.strictEqual(JSON.parse(usageErr.stdout).result, 'ERROR');
});

test('GT-30 the human-readable output names the skip and the aggregate', () => {
  const root = noCmdProject();
  const r = run(['gate', '--change', 'c'], root);
  assert.strictEqual(r.status, 3, r.stdout + r.stderr);
  assert.ok(!/undefined/.test(r.stdout), `no undefined marker: ${r.stdout}`);
  assert.match(r.stdout, /C1/);
  assert.match(r.stdout, /GATE: INCOMPLETE/);
});

test('SR-73 both consumers pass through the same replaceable builder', () => {
  const root = noCmdProject();
  const seen = [];
  const A = (...a) => { seen.push('A'); return sr.buildChangeProjection(...a); };
  let viaA;
  try {
    // ① gate module already required above, BEFORE any override existed
    sr._setProjectionBuilder(A);
    const g = gate.runGate({ cwd: root, change: 'c' });
    assert.strictEqual(g.code, 3, `${g.errors}`);
    const v = sr.verify({ change: 'c', cwd: root, testCmd: 'node -e "console.log(\'ok 1 - XA-01 a\');console.log(\'ok 2 - XB-01 b\')"' });
    assert.deepStrictEqual(v.errors, [], 'the configured path still works');
    viaA = seen.slice();
    assert.deepStrictEqual(viaA, ['A', 'A'], 'gate and verify both went through the SAME wrapper');

    // ② the two paths agree on the FULL projection and the errors, fixture by fixture
    const fixtures = [
      ['clean', DELTA],
      ['unstamped mutation', '## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t2\n'],
      ['malformed', '### Requirement: Beta\n\n#### Scenario: XB-01 x\n- t\n'],
      ['diverged CAS', '<!-- apriori-base: sha256:' + 'a'.repeat(64) + ' -->\n\n## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t2\n'],
      ['conflict', '## ADDED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- different body\n'],
    ];
    for (const [label, delta] of fixtures) {
      const p = noCmdProject('c', { 'apriori/changes/c/specs/kv/spec.md': delta });
      const captured = [];
      sr._setProjectionBuilder((...a) => { const out = sr.buildChangeProjection(...a); captured.push(out); return out; });
      gate.runGate({ cwd: p, change: 'c' });
      sr.verify({ change: 'c', cwd: p, testCmd: 'node -e "console.log(1)"' });
      assert.strictEqual(captured.length, 2, `${label}: both paths built a projection`);
      assert.deepStrictEqual(captured[0].projection, captured[1].projection, `${label}: full projection equal`);
      assert.deepStrictEqual(captured[0].errors, captured[1].errors, `${label}: errors equal`);
    }
    // the sixth fixture — no delta files at all
    const bare = mkProject({
      'apriori/specs/kv/spec.md': STORE,
      'apriori/changes/c/flow-state.md': FLOW('c'),
      'apriori/changes/c/tasks.md': '- [x] T1\n',
      'apriori/changes/c/review/issues.md': LEDGER_OK,
    });
    const cap2 = [];
    sr._setProjectionBuilder((...a) => { const out = sr.buildChangeProjection(...a); cap2.push(out); return out; });
    gate.runGate({ cwd: bare, change: 'c' });
    sr.verify({ change: 'c', cwd: bare, testCmd: 'node -e "console.log(1)"' });
    assert.strictEqual(cap2.length, 2, 'no-delta-files: both paths built a projection');
    assert.deepStrictEqual(cap2[0].projection, cap2[1].projection, 'no-delta-files: full projection equal');
    assert.deepStrictEqual(cap2[0].errors, cap2[1].errors);

    // ③ only NOW swap the reference — proving it is resolved at CALL time, not module load
    let bCalls = 0;
    sr._setProjectionBuilder((...a) => { bCalls++; return sr.buildChangeProjection(...a); });
    gate.runGate({ cwd: root, change: 'c' });
    assert.strictEqual(bCalls, 1, 'gate read the NEW reference — nothing was frozen at module load');
  } finally { sr._setProjectionBuilder(null); }
});

test('SR-74 the projection-only path spawns no test process', () => {
  const root = noCmdProject();
  let runs = 0;
  try {
    sr._setTestRunner(() => { runs++; return { out: '', stderr: '', status: 0, signal: null, error: null }; });
    const r = gate.runGate({ cwd: root, change: 'c' });
    assert.strictEqual(r.code, 3);
    assert.strictEqual(runs, 0, 'no test command was configured, so none may be spawned');
  } finally { sr._setTestRunner(null); }
});

test('SR-75 a configured run is identical before an override, and after clearing one', () => {
  // The guarantee is about the CONFIGURED path — the one every existing user is on. It must be
  // observed IN THIS PROCESS: a spawned CLI gets a fresh module registry and would never see
  // the override at all, so a subprocess comparison here would be vacuous.
  const root = noCmdProject('p', { 'apriori/process-config.md': cfg('| test-cmd | node -e "console.log(\'ok 1 - XA-01 a\');console.log(\'ok 2 - XB-01 b\')" |\n') });
  // Take the two public results WHOLE and compare them structurally: verify()'s `results` is a
  // Map, which JSON.stringify would silently flatten to {} — a JSON compare here would be blind
  // to exactly the field a projection seam could disturb.
  const TAP = 'node -e "console.log(\'ok 1 - XA-01 a\');console.log(\'ok 2 - XB-01 b\')"';
  const snap = () => [gate.runGate({ cwd: root, change: 'p' }), sr.verify({ change: 'p', cwd: root, testCmd: TAP })];
  const virgin = snap();
  assert.strictEqual(virgin[0].result, 'PASS', 'the configured path is genuinely healthy');
  assert.ok(virgin[1].results instanceof Map && virgin[1].results.size > 0, 'the Map-valued field really is populated');

  try { sr._setProjectionBuilder((...a) => sr.buildChangeProjection(...a)); } finally { sr._setProjectionBuilder(null); }
  assert.deepStrictEqual(snap(), virgin, 'clearing a projection override restores the configured path exactly');

  try {
    sr._setTestRunner(() => ({ out: '', stderr: '', status: 7, signal: null, error: null }));
    // while installed the runner really is diverted — otherwise the next assertion is vacuous
    assert.notDeepStrictEqual(snap(), virgin, 'the runner seam is real, not decorative');
  } finally { sr._setTestRunner(null); }
  assert.deepStrictEqual(snap(), virgin, 'clearing a runner override restores the configured path exactly');
});

test('SR-75 the seams are inert by default', () => {
  const root = noCmdProject();
  assert.strictEqual(sr.currentProjectionBuilder(), sr.buildChangeProjection, 'default resolves to the real builder');
  const marker = () => ({ projection: {}, errors: ['x'], texts: null });
  try {
    sr._setProjectionBuilder(marker);
    assert.strictEqual(sr.currentProjectionBuilder(), marker);
  } finally { sr._setProjectionBuilder(null); }
  assert.strictEqual(sr.currentProjectionBuilder(), sr.buildChangeProjection, 'clearing restores the default exactly');
  assert.strictEqual(gate.runGate({ cwd: root, change: 'c' }).code, 3, 'behaviour is unchanged after a clear');
  assert.ok(!('currentTestRunner' in sr), 'the test-runner resolver stays module-private');
  // the private resolver's default cannot be compared by identity from outside, so assert it
  // statically instead of merely claiming it — `override || <the real function>`, nothing else
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'spec-runner.js'), 'utf8');
  assert.match(src, /function currentTestRunner\(\)\s*\{\s*return testRunnerOverride \|\| runTestCommand;\s*\}/,
    'the private runner resolver defaults to runTestCommand and to nothing else');
});

// Static half of SR-73: the runtime half proves both paths went through one wrapper; this
// proves gate has no SECOND path built from the raw primitives. Prefixed with the exact
// `SR-73` ID so it is mechanically attributable — an earlier `GT-15a` name would have been
// read as the unrelated GT-15 scenario already in the store.
test('SR-73 gate never rebuilds the projection itself (static half)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'gate.js'), 'utf8');
  for (const forbidden of ['discoverDeltas', 'buildProjection(']) {
    assert.ok(!src.includes(forbidden), `lib/gate.js must not assemble a projection itself (found ${forbidden})`);
  }
  assert.ok(/currentProjectionBuilder/.test(src), 'gate reaches the projection through the shared resolver');
  assert.ok(/require\('\.\/spec-runner'\)/.test(src), 'and it comes from spec-runner');
});
