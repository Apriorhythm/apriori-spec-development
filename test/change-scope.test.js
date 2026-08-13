'use strict';
// verify-change-scope — SR-56..SR-64, GT-26..GT-27: the change verdict judges the change
// scope; the store report keeps the whole projection visible; failure signals stay fail-closed.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const sr = require('../lib/spec-runner');
const gate = require('../lib/gate');

const STORE_AB = '### Requirement: R-A\n\n#### Scenario: XA-01 a\n- t\n\n### Requirement: R-B\n\n#### Scenario: XB-01 b\n- t\n';
const DELTA_C = '## ADDED Requirements\n\n### Requirement: R-C\n\n#### Scenario: XC-01 c\n- t\n';
const FLOW = (n) => `change: ${n}\ntier: medium\ntrack: harden\ntrack-rationale: r\nlineage: main\ncurrent-step: STEP5\nround: 1\nnext-action: x\ngates:\n  - 2026-08-13T00:00 note: n\n`;
const LEDGER = '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n| Q-1 | a | low | 1 | verified |\n';

function proj(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-vcs-'));
  for (const [rel, c] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), c);
  }
  return root;
}
// TAP emitter with a controlled exit code
function tap(lines, exit = 0) {
  const body = lines.map((l) => `console.log(${JSON.stringify(l)})`).join(';');
  return `node -e "${body.replace(/"/g, '\\"')};process.exit(${exit})"`;
}
const vrun = (root, args) => spawnSync('node', [BIN, 'verify', ...args], { encoding: 'utf8', cwd: root });
const chg = (root, extra = []) => vrun(root, ['--change', 'c', ...extra]);
function mkChange(store, delta, extra = {}) {
  return proj({
    'apriori/specs/m/spec.md': store,
    'apriori/changes/c/flow-state.md': FLOW('c'),
    'apriori/changes/c/specs/m/spec.md': delta,
    ...extra,
  });
}

test('SR-56 the change verdict judges only the change scope', () => {
  const root = mkChange(STORE_AB, DELTA_C);
  const good = ['ok 1 - XC-01 c', 'ok 2 - XA-01 a', 'ok 3 - XZ-99 orphan', 'not ok 4 - XA-01 again'];
  const r = chg(root, ['--test-cmd', tap(good, 1), '--json']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const j = JSON.parse(r.stdout);
  assert.strictEqual(j.clean, true);
  assert.deepStrictEqual(j.storeReport.unbound, ['XB-01']);
  assert.deepStrictEqual(j.storeReport.orphan, ['XZ-99']);
  assert.deepStrictEqual(j.storeReport.boundRed, ['XA-01']);
  // the same store through --specs behaves exactly as today (GAPS)
  const s = vrun(root, ['--specs', 'apriori/specs', '--test-cmd', tap(good, 1), '--json']);
  assert.strictEqual(s.status, 1);
  assert.ok(!('storeReport' in JSON.parse(s.stdout)));
  // counter-examples: unprovable failures stay blocking
  const idless = chg(root, ['--test-cmd', tap(['ok 1 - XC-01 c', 'not ok 2 - naked'], 1), '--json']);
  assert.strictEqual(idless.status, 1, 'ID-less failure blocks');
  const forphan = chg(root, ['--test-cmd', tap(['ok 1 - XC-01 c', 'not ok 2 - XQ-77 ghost'], 1), '--json']);
  assert.strictEqual(forphan.status, 1, 'failing orphan blocks');
});

test('SR-57 change gaps still fail', () => {
  const root = mkChange(STORE_AB, DELTA_C);
  const un = chg(root, ['--test-cmd', tap(['ok 1 - XA-01 a']), '--json']);
  assert.strictEqual(un.status, 1);
  assert.deepStrictEqual(JSON.parse(un.stdout).unbound, ['XC-01']);
  const red = chg(root, ['--test-cmd', tap(['not ok 1 - XC-01 c'], 1), '--json']);
  assert.strictEqual(red.status, 1);
  assert.deepStrictEqual(JSON.parse(red.stdout).boundRed.map((x) => x.id || x), ['XC-01']);
});

test('SR-58 operation semantics bound the scope', () => {
  // MODIFIED brings both scenarios of the replaced block into scope
  const mod = mkChange(STORE_AB,
    '## MODIFIED Requirements\n\n### Requirement: R-A\n\n#### Scenario: XA-01 a\n- t\n\n#### Scenario: XA-02 a2\n- t\n');
  const rm = chg(mod, ['--test-cmd', tap(['ok 1 - XA-01 a', 'ok 2 - XA-02 a2']), '--json']);
  const jm = JSON.parse(rm.stdout);
  assert.strictEqual(rm.status, 0, rm.stdout + rm.stderr);
  assert.deepStrictEqual(jm.changeScope.scenarioIds, ['XA-01', 'XA-02']);
  // REMOVED: not demanded; lingering test is a store-report orphan
  const rem = mkChange(STORE_AB, DELTA_C + '\n## REMOVED Requirements\n\n### Requirement: R-B\n\n#### Scenario: XB-01 b\n- t\n');
  const rr = chg(rem, ['--test-cmd', tap(['ok 1 - XC-01 c', 'ok 2 - XB-01 lingering']), '--json']);
  const jr = JSON.parse(rr.stdout);
  assert.strictEqual(rr.status, 0, rr.stdout + rr.stderr);
  assert.deepStrictEqual(jr.storeReport.orphan, ['XB-01']);
  // RENAMED keeps scenario IDs; the renamed block is in scope
  const ren = mkChange(STORE_AB, '## RENAMED Requirements\n\n- R-A -> R-G\n');
  const rn = chg(ren, ['--test-cmd', tap(['ok 1 - XA-01 a']), '--json']);
  const jn = JSON.parse(rn.stdout);
  assert.strictEqual(rn.status, 0, rn.stdout + rn.stderr);
  assert.deepStrictEqual(jn.changeScope.requirements, [{ file: 'm/spec.md', name: 'R-G', operations: ['RENAMED'] }]);
  assert.deepStrictEqual(jn.changeScope.scenarioIds, ['XA-01']);
  // rename-then-modify: final block in scope with both operations
  const rtm = mkChange(STORE_AB,
    '## RENAMED Requirements\n\n- R-A -> R-G\n\n## MODIFIED Requirements\n\n### Requirement: R-G\n\n#### Scenario: XA-01 a\n- t\n');
  const rtmr = chg(rtm, ['--test-cmd', tap(['ok 1 - XA-01 a']), '--json']);
  const jrtm = JSON.parse(rtmr.stdout);
  assert.strictEqual(rtmr.status, 0, rtmr.stdout + rtmr.stderr);
  assert.deepStrictEqual(jrtm.changeScope.requirements, [{ file: 'm/spec.md', name: 'R-G', operations: ['RENAMED', 'MODIFIED'] }]);
  // rename-then-remove: final deprecated block is out of scope; lingering test is an orphan
  const rtr = mkChange(STORE_AB,
    '## RENAMED Requirements\n\n- R-A -> R-G\n\n## REMOVED Requirements\n\n### Requirement: R-G\n\n#### Scenario: XA-01 a\n- t\n');
  const rtrr = chg(rtr, ['--test-cmd', tap(['ok 1 - XA-01 lingering']), '--json']);
  const jrtr = JSON.parse(rtrr.stdout);
  assert.strictEqual(rtrr.status, 0, rtrr.stdout + rtrr.stderr);
  assert.ok(!jrtr.changeScope.requirements.some((q) => q.name === 'R-G'), 'deprecated final block out of scope');
  assert.deepStrictEqual(jrtr.storeReport.orphan, ['XA-01']);
});

test('SR-59 in-scope strictness blocks the verdict', () => {
  // scoped unidentified
  const uni = mkChange(STORE_AB, '## ADDED Requirements\n\n### Requirement: R-C\n\n#### Scenario: no id here\n- t\n');
  assert.strictEqual(chg(uni, ['--test-cmd', tap(['ok 1 - XA-01 a'])]).status, 1);
  // cross-boundary duplicate: scoped XA-01 collides with untouched store XA-01
  const dup = mkChange(STORE_AB, '## ADDED Requirements\n\n### Requirement: R-C\n\n#### Scenario: XA-01 clash\n- t\n');
  const rd = chg(dup, ['--test-cmd', tap(['ok 1 - XA-01 a', 'ok 2 - XB-01 b']), '--json']);
  assert.strictEqual(rd.status, 1, 'cross-boundary duplicate blocks');
  assert.ok(JSON.parse(rd.stdout).duplicates.some((d) => d.id === 'XA-01'));
  // duplicate entirely outside the scope stays informative
  const outsideDup = mkChange(STORE_AB + '\n### Requirement: R-B2\n\n#### Scenario: XB-01 again\n- t\n', DELTA_C);
  const ro = chg(outsideDup, ['--test-cmd', tap(['ok 1 - XC-01 c', 'ok 2 - XA-01 a', 'ok 3 - XB-01 b']), '--json']);
  assert.strictEqual(ro.status, 0, ro.stdout + ro.stderr);
  assert.ok(JSON.parse(ro.stdout).storeReport.duplicates.some((d) => d.id === 'XB-01'));
});

test('SR-60 the store report loses nothing', () => {
  const store = STORE_AB + '\n### Requirement: R-B2\n\n#### Scenario: XB-01 again\n- t\n\n### Requirement: R-D\n\n#### Scenario: nameless one\n- t\n';
  const root = mkChange(store, DELTA_C);
  const r = chg(root, ['--test-cmd', tap(['ok 1 - XC-01 c', 'not ok 2 - XA-01 a', 'ok 3 - XB-01 b'], 1), '--json']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const j = JSON.parse(r.stdout);
  assert.deepStrictEqual(j.storeReport.boundRed, ['XA-01']);
  assert.ok(j.storeReport.duplicates.some((d) => d.id === 'XB-01'));
  assert.strictEqual(j.storeReport.unidentified.length, 1);
});

test('SR-61 explained non-zero status can be GREEN, unexplained stays ERROR', () => {
  const root = mkChange(STORE_AB, DELTA_C);
  const ok = chg(root, ['--test-cmd', tap(['ok 1 - XC-01 c', 'not ok 2 - XA-01 a'], 1), '--json']);
  assert.strictEqual(ok.status, 0, 'out-of-scope bound red explains exit 1: ' + ok.stdout + ok.stderr);
  const un = chg(root, ['--test-cmd', tap(['ok 1 - XC-01 c', 'not ok 2 - naked'], 1)]);
  assert.strictEqual(un.status, 1, 'unattributed blocks');
  const fo = chg(root, ['--test-cmd', tap(['ok 1 - XC-01 c', 'not ok 2 - XQ-77 g'], 1)]);
  assert.strictEqual(fo.status, 1, 'failing orphan blocks');
  const unexplained = chg(root, ['--test-cmd', `node -e "console.log('ok 1 - XC-01 c');process.exit(7)"`]);
  assert.strictEqual(unexplained.status, 2, 'unexplained non-zero stays ERROR');
});

test('SR-62 the zero-scope truth table holds', () => {
  // removal-only over a non-empty projection: GREEN + dedicated note
  const remOnly = mkChange(STORE_AB, '## REMOVED Requirements\n\n### Requirement: R-B\n\n#### Scenario: XB-01 b\n- t\n');
  const r1 = chg(remOnly, ['--test-cmd', tap(['1..0'])]);
  assert.strictEqual(r1.status, 0, r1.stdout + r1.stderr);
  assert.match(r1.stdout, /0 scenario\(s\) in change scope \(removal-only change\)/);
  // mixed empty scope: generic note + ops summary, never removal-only
  const mixed = mkChange(STORE_AB, '## ADDED Requirements\n\n### Requirement: R-E\nprose only\n\n## REMOVED Requirements\n\n### Requirement: R-B\n\n#### Scenario: XB-01 b\n- t\n');
  const r2 = chg(mixed, ['--test-cmd', tap(['1..0'])]);
  assert.strictEqual(r2.status, 0, r2.stdout + r2.stderr);
  assert.match(r2.stdout, /0 scenario\(s\) in change scope \(ops:/);
  assert.doesNotMatch(r2.stdout, /removal-only/);
  // all-empty projection: global vacuous ERROR
  const empty = mkChange('### Requirement: R-A\nprose\n', '## ADDED Requirements\n\n### Requirement: R-E\nprose\n');
  assert.strictEqual(chg(empty, ['--test-cmd', tap(['1..0'])]).status, 2);
  // scope whose only occurrences are unidentified: GAPS (SR-59 case, asserted here for the table)
  const uni = mkChange(STORE_AB, '## ADDED Requirements\n\n### Requirement: R-C\n\n#### Scenario: nameless\n- t\n');
  assert.strictEqual(chg(uni, ['--test-cmd', tap(['ok 1 - XA-01 a'])]).status, 1);
  // malformed delta keeps today's projection-failure ERROR
  const bad = mkChange(STORE_AB, '## NONSENSE Requirements\n\n### Requirement: R-X\n');
  assert.strictEqual(chg(bad, ['--test-cmd', tap(['1..0'])]).status, 2);
});

test('SR-63 one projection, one test run, one parse — and exactly two matcher batches', () => {
  const marker = (root) => path.join(root, 'spawned.count');
  const countingTap = (root) => `node -e "require('fs').appendFileSync(${JSON.stringify(marker(root)).replace(/"/g, '\\"')},'x');console.log('ok 1 - XC-01 c');console.log('ok 2 - XA-01 a');console.log('ok 3 - XB-01 b')"`;
  const root = mkChange(STORE_AB, DELTA_C, { 'apriori/process-config.md': '| id-pattern | [A-Z]+-\\d+ |\n' });
  const calls = [];
  sr._setChildRunner((payload) => {
    const { texts } = JSON.parse(payload);
    calls.push(texts);
    const re = new RegExp('[A-Z]+-\\d+');
    return { status: 0, signal: null, stdout: JSON.stringify({ ids: texts.map((t) => sr.leadId(t, re)) }), error: null };
  });
  let run;
  try {
    run = sr.verify({ change: 'c', cwd: root, testCmd: countingTap(root) });
  } finally { sr._setChildRunner(null); }
  assert.strictEqual(run.errors.length, 0, JSON.stringify(run.errors));
  assert.strictEqual(calls.length, 2, 'exactly two matcher batches (titles, TAP descriptions)');
  assert.ok(calls[0].some((t) => t.startsWith('XC-01')) && calls[0].some((t) => t.startsWith('XA-01')), 'first batch = projection titles');
  assert.ok(calls[1].some((t) => t.startsWith('XC-01 c')), 'second batch = TAP descriptions');
  assert.strictEqual(fs.readFileSync(marker(root), 'utf8'), 'x', 'exactly one test spawn');
  // title-batch failure: zero spawns
  const root2 = mkChange(STORE_AB, DELTA_C, { 'apriori/process-config.md': '| id-pattern | [A-Z]+-\\d+ |\n' });
  let n2 = 0;
  sr._setChildRunner(() => { n2++; return { status: 1, signal: null, stdout: '', error: null }; });
  let run2;
  try { run2 = sr.verify({ change: 'c', cwd: root2, testCmd: countingTap(root2) }); }
  finally { sr._setChildRunner(null); }
  assert.ok(run2.errors.length > 0);
  assert.ok(!fs.existsSync(marker(root2)), 'title-batch failure spawns nothing');
  // TAP-batch failure: exactly one spawn, still fails closed
  const root3 = mkChange(STORE_AB, DELTA_C, { 'apriori/process-config.md': '| id-pattern | [A-Z]+-\\d+ |\n' });
  let n3 = 0;
  sr._setChildRunner((payload) => {
    n3++;
    const { texts } = JSON.parse(payload);
    if (n3 === 1) return { status: 0, signal: null, stdout: JSON.stringify({ ids: texts.map((t) => sr.leadId(t, new RegExp('[A-Z]+-\\d+'))) }), error: null };
    return { status: null, signal: 'SIGKILL', stdout: '', error: null };
  });
  let run3;
  try { run3 = sr.verify({ change: 'c', cwd: root3, testCmd: countingTap(root3) }); }
  finally { sr._setChildRunner(null); }
  assert.ok(run3.errors.length > 0, 'TAP-batch failure fails closed');
  assert.strictEqual(fs.readFileSync(marker(root3), 'utf8'), 'x', 'exactly one spawn before the TAP batch failed');
});

test('SR-64 the JSON contract is pinned for all four outcome classes', () => {
  const root = mkChange(STORE_AB, DELTA_C);
  // GREEN
  const g = JSON.parse(chg(root, ['--test-cmd', tap(['ok 1 - XC-01 c', 'ok 2 - XA-01 a', 'ok 3 - XB-01 b']), '--json']).stdout);
  assert.strictEqual(g.result, 'GREEN');
  assert.ok(g.storeReport && g.changeScope);
  assert.strictEqual(typeof g.storeReport.boundGreen, 'number');
  assert.ok(Array.isArray(g.storeReport.unbound));
  assert.deepStrictEqual(g.changeScope.requirements, [{ file: 'm/spec.md', name: 'R-C', operations: ['ADDED'] }]);
  // GAPS
  const p = JSON.parse(chg(root, ['--test-cmd', tap(['ok 1 - XA-01 a']), '--json']).stdout);
  assert.strictEqual(p.result, 'GAPS');
  assert.ok(p.storeReport && p.changeScope);
  // pre-test ERROR (invalid config pattern): both fields absent
  const pre = mkChange(STORE_AB, DELTA_C, { 'apriori/process-config.md': '| id-pattern | ( |\n' });
  const e1 = JSON.parse(chg(pre, ['--test-cmd', tap(['1..0']), '--json']).stdout);
  assert.strictEqual(e1.result, 'ERROR');
  assert.ok(!('storeReport' in e1) && !('changeScope' in e1));
  // post-TAP ERROR (unexplained non-zero): both fields absent
  const e2raw = chg(root, ['--test-cmd', `node -e "console.log('ok 1 - XC-01 c');process.exit(7)"`, '--json']);
  const e2 = JSON.parse(e2raw.stdout);
  assert.strictEqual(e2.result, 'ERROR');
  assert.ok(!('storeReport' in e2) && !('changeScope' in e2));
  // --specs run object own-properties never include the new fields
  const solo = proj({ 'specs/spec.md': '#### Scenario: XX-01 a\n' });
  const run = sr.verify({ specs: [path.join(solo, 'specs')], testCmd: tap(['ok 1 - XX-01 a']), cwd: solo });
  assert.ok(!('storeReport' in run) && !('changeScope' in run));
});

test('SR-64 --specs outputs stay byte-identical to the state-A goldens', () => {
  const G = path.join(__dirname, 'fixtures', 'specs-golden');
  const manifest = JSON.parse(fs.readFileSync(path.join(G, 'manifest.json'), 'utf8'));
  const root = path.join(G, 'proj');
  // The goldens were captured on POSIX (see capture.mjs). Spec file paths in the JSON come
  // from a filesystem walk, so they are platform-NATIVE by construction — and were in state A
  // too, which is what this guard is comparing against. So the byte compare folds the
  // separator, and only the separator: in the JSON text a path separator is two backslashes,
  // while an escape like \n carries one, so folding pairs leaves escapes untouched.
  const foldSep = (s) => (path.sep === '\\' ? s.split('\\\\').join('/') : s);
  assert.strictEqual(foldSep('a\\\\b "x\\n"'), path.sep === '\\' ? 'a/b "x\\n"' : 'a\\\\b "x\\n"', 'the fold takes separators, not escapes');
  for (const [key, c] of Object.entries(manifest)) {
    const r = spawnSync('node', [BIN, ...c.args], { encoding: 'utf8', cwd: root });
    assert.strictEqual(r.status, c.status, `${key}: exit`);
    assert.strictEqual(foldSep(r.stdout), fs.readFileSync(path.join(G, `${key}.stdout`), 'utf8'), `${key}: stdout bytes`);
    assert.strictEqual(foldSep(r.stderr), fs.readFileSync(path.join(G, `${key}.stderr`), 'utf8'), `${key}: stderr bytes`);
  }
});

// ---- GT: gate ----

function gateProj(extraStore, tapLines, exit) {
  const store = STORE_AB;
  const root = proj({
    'apriori/specs/m/spec.md': extraStore || store,
    'apriori/changes/a/flow-state.md': FLOW('a'),
    'apriori/changes/a/tasks.md': '- [x] T1\n',
    'apriori/changes/a/review/issues.md': LEDGER,
    'apriori/changes/a/specs/m/spec.md': '## ADDED Requirements\n\n### Requirement: R-CA\n\n#### Scenario: YA-01 a\n- t\n',
    'apriori/changes/b/flow-state.md': FLOW('b'),
    'apriori/changes/b/tasks.md': '- [x] T1\n',
    'apriori/changes/b/review/issues.md': LEDGER,
    'apriori/changes/b/specs/m/spec.md': '## ADDED Requirements\n\n### Requirement: R-CB\n\n#### Scenario: YB-01 b\n- t\n',
  });
  return { root, cmd: tap(tapLines, exit) };
}

test('GT-26 parallel changes go green independently', () => {
  const { root, cmd } = gateProj(null,
    ['ok 1 - YA-01 a', 'not ok 2 - YB-01 b', 'ok 3 - XA-01 a', 'ok 4 - XB-01 b'], 1);
  const ra = gate.runGate({ cwd: root, change: 'a', testCmd: cmd });
  const c1a = ra.checks.find((c) => c.id === 'C1');
  assert.strictEqual(c1a.status, 'pass', c1a.detail);
  assert.match(c1a.detail, /change-scoped/);
  assert.match(c1a.detail, /store:/);
  const rb = gate.runGate({ cwd: root, change: 'b', testCmd: cmd });
  const c1b = rb.checks.find((c) => c.id === 'C1');
  assert.strictEqual(c1b.status, 'blocked', c1b.detail);
});

test('GT-27 only provably out-of-scope reds are non-blocking for C1', () => {
  // out-of-scope bound red only: change a passes
  const { root, cmd } = gateProj(null, ['ok 1 - YA-01 a', 'not ok 2 - XB-01 b', 'ok 3 - XA-01 a', 'ok 4 - YB-01 b'], 1);
  const ra = gate.runGate({ cwd: root, change: 'a', testCmd: cmd });
  const c1 = ra.checks.find((c) => c.id === 'C1');
  assert.strictEqual(c1.status, 'pass', c1.detail);
  assert.match(c1.detail, /store: 1 red/);
  // an ID-less failure blocks whatever change a's own scenarios say
  const { root: r2, cmd: cmd2 } = gateProj(null, ['ok 1 - YA-01 a', 'ok 2 - YB-01 b', 'ok 3 - XA-01 a', 'ok 4 - XB-01 b', 'not ok 5 - naked'], 1);
  const ra2 = gate.runGate({ cwd: r2, change: 'a', testCmd: cmd2 });
  assert.strictEqual(ra2.checks.find((c) => c.id === 'C1').status, 'blocked', 'unattributed blocks C1');
  // a failing orphan blocks too
  const { root: r3, cmd: cmd3 } = gateProj(null, ['ok 1 - YA-01 a', 'ok 2 - YB-01 b', 'ok 3 - XA-01 a', 'ok 4 - XB-01 b', 'not ok 5 - ZZ-99 ghost'], 1);
  const ra3 = gate.runGate({ cwd: r3, change: 'a', testCmd: cmd3 });
  assert.strictEqual(ra3.checks.find((c) => c.id === 'C1').status, 'blocked', 'failing orphan blocks C1');
});

// ---- P8 r1 hardening: strict sibling trust model, containment, stronger oracles ----

test('SR-56 sibling attribution is strict: anomalies grant nothing', () => {
  const mk = (siblingFiles) => proj({
    'apriori/specs/m/spec.md': STORE_AB,
    'apriori/changes/c/flow-state.md': FLOW('c'),
    'apriori/changes/c/specs/m/spec.md': DELTA_C,
    ...siblingFiles,
  });
  const failTap = tap(['ok 1 - XC-01 c', 'ok 2 - XA-01 a', 'ok 3 - XB-01 b', 'not ok 4 - ZZ-99 red'], 1);
  // malformed sibling delta (bare scenario, zero ops): grants nothing → failing orphan blocks
  const m1 = mk({ 'apriori/changes/s/specs/m/spec.md': '#### Scenario: ZZ-99 laundered\n- t\n' });
  assert.strictEqual(chg(m1, ['--test-cmd', failTap]).status, 1, 'malformed sibling grants nothing');
  // the ID only inside the sibling's REMOVED block: grants nothing
  const m2 = mk({ 'apriori/changes/s/specs/m/spec.md': '## REMOVED Requirements\n\n### Requirement: R-Z\n\n#### Scenario: ZZ-99 gone\n- t\n' });
  assert.strictEqual(chg(m2, ['--test-cmd', failTap]).status, 1, 'REMOVED-block title grants nothing');
  // a cleanly-parsed ADDED sibling declaring the ID: attributed, non-blocking
  const m3 = mk({ 'apriori/changes/s/specs/m/spec.md': '## ADDED Requirements\n\n### Requirement: R-Z\n\n#### Scenario: ZZ-99 owned\n- t\n' });
  assert.strictEqual(chg(m3, ['--test-cmd', failTap]).status, 0, 'valid sibling ADDED attributes');
  // an escaping symlinked sibling specs dir grants nothing
  const outside = proj({ 'evil.md': '## ADDED Requirements\n\n### Requirement: R-Z\n\n#### Scenario: ZZ-99 outside\n- t\n' });
  const m4 = mk({});
  fs.mkdirSync(path.join(m4, 'apriori/changes/s'), { recursive: true });
  fs.symlinkSync(outside, path.join(m4, 'apriori/changes/s/specs'));
  assert.strictEqual(chg(m4, ['--test-cmd', failTap]).status, 1, 'escaping specs symlink grants nothing');
  // a symlinked .md file inside a real specs dir grants nothing
  const m5 = mk({});
  fs.mkdirSync(path.join(m5, 'apriori/changes/s/specs'), { recursive: true });
  fs.symlinkSync(path.join(outside, 'evil.md'), path.join(m5, 'apriori/changes/s/specs/evil.md'));
  assert.strictEqual(chg(m5, ['--test-cmd', failTap]).status, 1, 'symlinked sibling file grants nothing');
});

test('SR-59 cross-boundary duplicate provenance carries every occurrence file', () => {
  const root = proj({
    'apriori/specs/m/spec.md': STORE_AB,
    'apriori/specs/n/spec.md': '### Requirement: R-N\n\n#### Scenario: XN-01 n\n- t\n',
    'apriori/changes/c/flow-state.md': FLOW('c'),
    'apriori/changes/c/specs/m/spec.md': '## ADDED Requirements\n\n### Requirement: R-C\n\n#### Scenario: XN-01 clash across files\n- t\n',
  });
  const r = chg(root, ['--test-cmd', tap(['ok 1 - XN-01 n', 'ok 2 - XA-01 a', 'ok 3 - XB-01 b']), '--json']);
  assert.strictEqual(r.status, 1);
  const dup = JSON.parse(r.stdout).duplicates.find((d) => d.id === 'XN-01');
  assert.deepStrictEqual([...dup.files].sort(), ['m/spec.md', 'n/spec.md'], 'both files named');
});

test('SR-63 the projection builds exactly once per path, and sibling titles ride the first batch', () => {
  const amMod = require('../lib/archive-merge');
  const realBuild = amMod.buildProjection;
  let builds = 0;
  amMod.buildProjection = function (...a) { builds++; return realBuild.apply(this, a); };
  const marker = (root) => path.join(root, 'ran.marker');
  const mCmd = (root) => `node -e "require('fs').writeFileSync(${JSON.stringify(marker(root)).replace(/"/g, '\\"')},'x');console.log('ok 1 - XC-01 c');console.log('ok 2 - XA-01 a');console.log('ok 3 - XB-01 b');console.log('ok 4 - YS-01 s')"`;
  try {
    // normal path with a config-origin matcher and a sibling: exactly 1 projection, 2 batches,
    // sibling titles inside the FIRST payload
    const root = proj({
      'apriori/specs/m/spec.md': STORE_AB,
      'apriori/changes/c/flow-state.md': FLOW('c'),
      'apriori/changes/c/specs/m/spec.md': DELTA_C,
      'apriori/changes/s/specs/m/spec.md': '## ADDED Requirements\n\n### Requirement: R-S\n\n#### Scenario: YS-01 s\n- t\n',
      'apriori/process-config.md': '| id-pattern | [A-Z]+-\\d+ |\n',
    });
    const payloads = [];
    sr._setChildRunner((payload) => {
      const { texts } = JSON.parse(payload);
      payloads.push(texts);
      return { status: 0, signal: null, stdout: JSON.stringify({ ids: texts.map((t) => sr.leadId(t, /[A-Z]+-\d+/)) }), error: null };
    });
    builds = 0;
    const run = sr.verify({ change: 'c', cwd: root, testCmd: mCmd(root) });
    sr._setChildRunner(null);
    assert.strictEqual(run.errors.length, 0, JSON.stringify(run.errors));
    assert.strictEqual(builds, 1, 'exactly one projection build');
    assert.strictEqual(payloads.length, 2, 'exactly two matcher batches');
    assert.ok(payloads[0].some((t) => t.startsWith('YS-01')), 'sibling titles ride the FIRST batch');
    // invalid pattern: zero projection builds, zero spawns
    const bad = proj({
      'apriori/specs/m/spec.md': STORE_AB,
      'apriori/changes/c/flow-state.md': FLOW('c'),
      'apriori/changes/c/specs/m/spec.md': DELTA_C,
      'apriori/process-config.md': '| id-pattern | ( |\n',
    });
    builds = 0;
    const r2 = sr.verify({ change: 'c', cwd: bad, testCmd: mCmd(bad) });
    assert.ok(r2.errors.length > 0);
    assert.strictEqual(builds, 0, 'invalid pattern: no projection build');
    assert.ok(!fs.existsSync(marker(bad)), 'invalid pattern: no spawn');
    // projection failure: one build, zero spawns
    const conflicted = proj({
      'apriori/specs/m/spec.md': STORE_AB,
      'apriori/changes/c/flow-state.md': FLOW('c'),
      'apriori/changes/c/specs/m/spec.md': '## MODIFIED Requirements\n\n### Requirement: R-MISSING\n\n#### Scenario: XM-01 m\n- t\n',
    });
    builds = 0;
    const r3 = sr.verify({ change: 'c', cwd: conflicted, testCmd: mCmd(conflicted) });
    assert.ok(r3.errors.length > 0, 'merge conflict fails');
    assert.strictEqual(builds, 1, 'projection failure: exactly one build');
    assert.ok(!fs.existsSync(marker(conflicted)), 'projection failure: no spawn');
  } finally {
    amMod.buildProjection = realBuild;
    sr._setChildRunner(null);
  }
});

test('SR-58 an idempotent rerun keeps the block in the change scope', () => {
  // the delta's ADDED block already exists identically in the store (rerun signature)
  const stamp = `<!-- apriori-base: sha256:${require('crypto').createHash('sha256').update(STORE_AB + '\n### Requirement: R-C\n\n#### Scenario: XC-01 c\n- t\n', 'utf8').digest('hex')} -->`;
  const root = proj({
    'apriori/specs/m/spec.md': STORE_AB + '\n### Requirement: R-C\n\n#### Scenario: XC-01 c\n- t\n',
    'apriori/changes/c/flow-state.md': FLOW('c'),
    'apriori/changes/c/specs/m/spec.md': DELTA_C,
  });
  const r = chg(root, ['--test-cmd', tap(['ok 1 - XC-01 c', 'ok 2 - XA-01 a', 'ok 3 - XB-01 b']), '--json']);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  const j = JSON.parse(r.stdout);
  assert.deepStrictEqual(j.changeScope.scenarioIds, ['XC-01'], 'rerun block still in scope');
});

test('SR-64 module-level absence: ERROR runs own neither storeReport nor changeScope', () => {
  const pre = proj({
    'apriori/specs/m/spec.md': STORE_AB,
    'apriori/changes/c/flow-state.md': FLOW('c'),
    'apriori/changes/c/specs/m/spec.md': DELTA_C,
    'apriori/process-config.md': '| id-pattern | ( |\n',
  });
  const r1 = sr.verify({ change: 'c', cwd: pre, testCmd: 'node -e ""' });
  assert.strictEqual(Object.hasOwn(r1, 'storeReport'), false);
  assert.strictEqual(Object.hasOwn(r1, 'changeScope'), false);
  const post = proj({
    'apriori/specs/m/spec.md': STORE_AB,
    'apriori/changes/c/flow-state.md': FLOW('c'),
    'apriori/changes/c/specs/m/spec.md': DELTA_C,
  });
  const r2 = sr.verify({ change: 'c', cwd: post, testCmd: `node -e "console.log('ok 1 - XC-01 c');process.exit(7)"` });
  assert.ok(r2.errors.length > 0, 'unexplained non-zero is ERROR');
  assert.strictEqual(Object.hasOwn(r2, 'storeReport'), false);
  assert.strictEqual(Object.hasOwn(r2, 'changeScope'), false);
});

test('GT-26 the gate detail carries the exact six-count store suffix', () => {
  const { root, cmd } = (function () {
    const root = proj({
      'apriori/specs/m/spec.md': STORE_AB,
      'apriori/changes/a/flow-state.md': FLOW('a'),
      'apriori/changes/a/tasks.md': '- [x] T1\n',
      'apriori/changes/a/review/issues.md': LEDGER,
      'apriori/changes/a/specs/m/spec.md': '## ADDED Requirements\n\n### Requirement: R-CA\n\n#### Scenario: YA-01 a\n- t\n',
    });
    return { root, cmd: tap(['ok 1 - YA-01 a', 'ok 2 - XA-01 a']) };
  })();
  const r = gate.runGate({ cwd: root, change: 'a', testCmd: cmd });
  const c1 = r.checks.find((c) => c.id === 'C1');
  assert.strictEqual(c1.detail,
    'verify GREEN (in-flight, change-scoped); store: 0 red, 1 unbound, 0 orphan, 0 unidentified, 0 unattributed, 0 duplicate(s) outstanding');
});

// ---- P8 r2 hardening: enumeration faults, human report intent, full JSON oracles ----

test('SR-56 sibling enumeration faults never throw and never exempt', () => {
  const root = proj({
    'apriori/specs/m/spec.md': STORE_AB,
    'apriori/changes/c/flow-state.md': FLOW('c'),
    'apriori/changes/c/specs/m/spec.md': DELTA_C,
    'apriori/changes/s/specs/m/spec.md': '## ADDED Requirements\n\n### Requirement: R-Z\n\n#### Scenario: ZZ-99 owned\n- t\n',
  });
  const sibSpecs = path.join(root, 'apriori', 'changes', 's', 'specs');
  const realReaddir = fs.readdirSync;
  fs.readdirSync = function (p, ...a) {
    if (String(p).startsWith(sibSpecs)) { const e = new Error('EACCES: injected'); e.code = 'EACCES'; throw e; }
    return realReaddir.call(fs, p, ...a);
  };
  let run;
  try {
    run = sr.verify({ change: 'c', cwd: root,
      testCmd: tap(['ok 1 - XC-01 c', 'ok 2 - XA-01 a', 'ok 3 - XB-01 b', 'not ok 4 - ZZ-99 red'], 1) });
  } finally { fs.readdirSync = realReaddir; }
  assert.strictEqual(run.errors.length, 0, 'no infra ERROR from the broken sibling');
  assert.strictEqual(run.verdict.clean, false, 'the unattributed red still blocks as GAPS');
  assert.deepStrictEqual(run.verdict.orphan, ['ZZ-99']);
});

test('SR-60 the human store report renders its complete six-class intent', () => {
  const many = Array.from({ length: 21 }, (_, i) => `not ok ${i + 10} - naked ${i}${i === 0 ? ' ' + 'L'.repeat(200) : ''}`);
  const root = proj({
    'apriori/specs/m/spec.md': STORE_AB + '\n### Requirement: R-B2\n\n#### Scenario: XB-01 again\n- t\n\n### Requirement: R-D\n\n#### Scenario: nameless one\n- t\n',
    'apriori/specs/n/spec.md': '### Requirement: R-N\n\n#### Scenario: XN-01 n\n- t\n',
    'apriori/changes/c/flow-state.md': FLOW('c'),
    'apriori/changes/c/specs/m/spec.md': DELTA_C,
  });
  const lines = ['ok 1 - XC-01 c', 'not ok 2 - XA-01 a', 'ok 3 - XZ-99 pass-orphan', ...many];
  const r = chg(root, ['--test-cmd', tap(lines, 1)]);
  const out = r.stdout;
  assert.match(out, /— STORE REPORT/);
  assert.match(out, /bound-green: 1\b/);
  assert.match(out, /bound-red: 1  \(XA-01\)/);
  assert.match(out, /unbound: 2  \(XB-01, XN-01\)/);
  assert.match(out, /orphan: 1  \(XZ-99\)/);
  assert.match(out, /unidentified: 1\n\s+spec\.md: nameless one/);
  assert.match(out, /unattributed failures: 21/);
  assert.match(out, /… and 1 more/);
  const storeSection = out.slice(out.indexOf('— STORE REPORT'));
  const listed = (storeSection.match(/naked \d+/g) || []).length;
  assert.strictEqual(listed, 20, 'exactly 20 unattributed lines listed in the store section');
  assert.match(storeSection, /… and 1 more/);
  const dupLine = storeSection.split('\n').find((l) => l.includes('duplicate IDs:'));
  assert.match(dupLine, /duplicate IDs: 1  \(XB-01: [^)]*spec\.md[^)]*\)/, 'duplicate files listed: ' + dupLine);
  const longLine = storeSection.split('\n').find((l) => l.includes('naked 0'));
  assert.ok(longLine.trimStart().length <= 120, 'single-line 120-char cap: ' + longLine.length);
  assert.ok(longLine.endsWith('…'), 'truncation ellipsis');
  // empty classes still print stable zero counts (a GREEN run with nothing outstanding)
  const groot = proj({
    'apriori/specs/m/spec.md': '### Requirement: R-A\n\n#### Scenario: XA-01 a\n- t\n',
    'apriori/changes/c/flow-state.md': FLOW('c'),
    'apriori/changes/c/specs/m/spec.md': DELTA_C,
  });
  const gout = chg(groot, ['--test-cmd', tap(['ok 1 - XC-01 c', 'ok 2 - XA-01 a'])]).stdout;
  const gsec = gout.slice(gout.indexOf('— STORE REPORT'));
  for (const lbl of ['bound-red: 0', 'unbound: 0', 'orphan: 0', 'unidentified: 0', 'unattributed failures: 0', 'duplicate IDs: 0'])
    assert.ok(gsec.includes(lbl), 'stable zero count: ' + lbl);
});

test('SR-63 the post-TAP-error path keeps one build, one spawn, two batches', () => {
  const amMod = require('../lib/archive-merge');
  const realBuild = amMod.buildProjection;
  let builds = 0;
  amMod.buildProjection = function (...a) { builds++; return realBuild.apply(this, a); };
  const marker = (root) => path.join(root, 'ran.marker');
  const root = proj({
    'apriori/specs/m/spec.md': STORE_AB,
    'apriori/changes/c/flow-state.md': FLOW('c'),
    'apriori/changes/c/specs/m/spec.md': DELTA_C,
    'apriori/process-config.md': '| id-pattern | [A-Z]+-\\d+ |\n',
  });
  let batches = 0;
  sr._setChildRunner((payload) => {
    batches++;
    const { texts } = JSON.parse(payload);
    return { status: 0, signal: null, stdout: JSON.stringify({ ids: texts.map((t) => sr.leadId(t, /[A-Z]+-\d+/)) }), error: null };
  });
  let run;
  try {
    // unexplained non-zero: TAP all green but exit 7 → post-TAP infra ERROR
    run = sr.verify({ change: 'c', cwd: root,
      testCmd: `node -e "require('fs').writeFileSync(${JSON.stringify(marker(root)).replace(/"/g, '\\"')},'x');console.log('ok 1 - XC-01 c');console.log('ok 2 - XA-01 a');console.log('ok 3 - XB-01 b');process.exit(7)"` });
  } finally { amMod.buildProjection = realBuild; sr._setChildRunner(null); }
  assert.ok(run.errors.length > 0, 'post-TAP ERROR');
  assert.strictEqual(builds, 1, 'exactly one projection build');
  assert.strictEqual(batches, 2, 'exactly two matcher batches');
  assert.strictEqual(fs.readFileSync(marker(root), 'utf8'), 'x', 'exactly one spawn');
  assert.strictEqual(Object.hasOwn(run, 'storeReport'), false);
});

test('SR-64 four full deep-equal JSON oracles', () => {
  const mk = (cfg) => proj({
    'apriori/specs/m/spec.md': STORE_AB,
    'apriori/changes/c/flow-state.md': FLOW('c'),
    'apriori/changes/c/specs/m/spec.md': DELTA_C,
    ...(cfg ? { 'apriori/process-config.md': cfg } : {}),
  });
  // GREEN
  const g = mk(null);
  const rg = chg(g, ['--test-cmd', tap(['ok 1 - XC-01 c', 'not ok 2 - XA-01 a', 'ok 3 - XZ-99 pass'], 1), '--json']);
  assert.deepStrictEqual(JSON.parse(rg.stdout), {
    clean: true, result: 'GREEN', errors: [], specFiles: 1,
    exec: { status: 1, signal: null, error: null },
    duplicates: [],
    boundGreen: [{ id: 'XC-01', pass: 1, fail: 0, skip: 0 }],
    boundRed: [], unbound: [], orphan: [], unidentified: [],
    unattributedFailures: { count: 0, lines: [] },
    stderr: '',
    projection: { change: 'c', modules: ['m/spec.md'], conflicts: [], unstampedMutations: [], notes: [] },
    storeReport: {
      boundGreen: 1, boundRed: ['XA-01'], unbound: ['XB-01'], orphan: ['XZ-99'],
      unidentified: [], unattributedFailures: { count: 0, lines: [] }, duplicates: [],
    },
    changeScope: { requirements: [{ file: 'm/spec.md', name: 'R-C', operations: ['ADDED'] }], scenarioIds: ['XC-01'] },
    modifiedIntegrity: [],
  });
  // GAPS
  const p2 = mk(null);
  const rp = chg(p2, ['--test-cmd', tap(['ok 1 - XA-01 a', 'ok 2 - XB-01 b']), '--json']);
  assert.deepStrictEqual(JSON.parse(rp.stdout), {
    clean: false, result: 'GAPS', errors: [], specFiles: 1,
    exec: { status: 0, signal: null, error: null },
    duplicates: [],
    boundGreen: [], boundRed: [], unbound: ['XC-01'], orphan: [], unidentified: [],
    unattributedFailures: { count: 0, lines: [] },
    stderr: '',
    projection: { change: 'c', modules: ['m/spec.md'], conflicts: [], unstampedMutations: [], notes: [] },
    storeReport: {
      boundGreen: 2, boundRed: [], unbound: ['XC-01'], orphan: [],
      unidentified: [], unattributedFailures: { count: 0, lines: [] }, duplicates: [],
    },
    changeScope: { requirements: [{ file: 'm/spec.md', name: 'R-C', operations: ['ADDED'] }], scenarioIds: ['XC-01'] },
    modifiedIntegrity: [],
  });
  // pre-test ERROR (invalid config pattern)
  const e1 = mk('| id-pattern | ( |\n');
  const re1 = chg(e1, ['--test-cmd', tap(['1..0']), '--json']);
  const je1 = JSON.parse(re1.stdout);
  assert.deepStrictEqual(je1, {
    clean: false, result: 'ERROR',
    errors: [je1.errors[0]], specFiles: 0,
    exec: { status: null, signal: null, error: null },
    duplicates: [], boundGreen: [], boundRed: [], unbound: [], orphan: [], unidentified: [],
    unattributedFailures: { count: 0, lines: [] }, stderr: '',
    projection: { change: 'c', modules: ['m/spec.md'], conflicts: [], unstampedMutations: [] },
  });
  assert.match(je1.errors[0], /process-config/);
  // post-TAP ERROR (unexplained non-zero)
  const e2 = mk(null);
  const re2 = chg(e2, ['--test-cmd', `node -e "console.log('ok 1 - XC-01 c');console.log('ok 2 - XA-01 a');console.log('ok 3 - XB-01 b');process.exit(7)"`, '--json']);
  const je2 = JSON.parse(re2.stdout);
  assert.deepStrictEqual(je2, {
    clean: false, result: 'ERROR',
    errors: [je2.errors[0]], specFiles: 1,
    exec: { status: 7, signal: null, error: null },
    duplicates: [],
    boundGreen: [
      { id: 'XA-01', pass: 1, fail: 0, skip: 0 },
      { id: 'XB-01', pass: 1, fail: 0, skip: 0 },
      { id: 'XC-01', pass: 1, fail: 0, skip: 0 },
    ],                                              // ERROR runs keep the full-projection verdict (no scope split)
    boundRed: [],
    unbound: [],
    orphan: [],
    unidentified: [],
    unattributedFailures: { count: 0, lines: [] },
    stderr: '',
    projection: { change: 'c', modules: ['m/spec.md'], conflicts: [], unstampedMutations: [], notes: [] },
  });
  assert.match(je2.errors[0], /no parsed TAP failure explains it/);
});
