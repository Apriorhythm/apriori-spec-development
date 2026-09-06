'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');
const gate = require('../lib/gate');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
function run(args, cwd) { return spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd }); }
function tapCmd(...lines) {
  return `node -e "${lines.map((l) => `console.log('${l}')`).join(';')}"`;
}

function mkProject(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-gate-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return root;
}

const STORE = '### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t\n';
const DELTA = '## ADDED Requirements\n\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n';
// the `## Evidence` section is what C9/R5 read: a bundle that answers nothing has not
// answered. These fixtures are about other checks, so they carry the two rows a standard
// change owes and fail on their own subject.
const FLOW = (name, mode = 'standard') => `change: ${name}\nmode: ${mode}\nlineage: v3\nphase: build\nnext-action: x\n\n## Evidence\n- producer-diff: done — read the whole diff, known P0/P1 zero\n- data-schema: done — ran the migration against a copy of the real schema\n\ngates:\n  - 2026-07-11T00:00 note: n\n`;
// 6.2 reads neither of these; they appear below only where a test proves they are inert
const LEDGER_OPEN = '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n| Q-1 | a | low | 1 | open |\n';

// a healthy in-flight medium change
function healthy(name = 'c') {
  return mkProject({
    'apriori/specs/kv/spec.md': STORE,
    [`apriori/changes/${name}/flow-state.md`]: FLOW(name),
    [`apriori/changes/${name}/specs/kv/spec.md`]: DELTA,
    // a healthy bundle carries its one independent review — the floor is not fast's alone
    [`apriori/changes/${name}/review/code-review-v1.md`]: 'VERDICT: no major issues\n',
    [`apriori/changes/${name}/review/code-review-v1-raw.txt`]: 'raw\n',
  });
}
const TAP_OK = tapCmd('ok 1 - XA-01 a', 'ok 2 - XB-01 b');

test('GT-01 a clean in-flight change passes (exit 0, all checks ✓)', () => {
  const root = healthy();
  const r = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
  assert.strictEqual(r.code, 0);
  assert.strictEqual(r.result, 'PASS');
  assert.strictEqual(r.stage, 'in-flight');
  for (const id of ['C1', 'C2', 'C3', 'C4', 'C5']) {
    const c = r.checks.find((x) => x.id === id);
    assert.ok(c && c.status !== 'blocked', `${id}: ${c && c.detail}`);
  }
});

test('GT-02 C2 is a placeholder — tasks.md is never read', () => {
  // 6.2 retired the diagnostic with the artifact: the check id stays in `checks[]` for --json
  // shape compatibility and says so, whatever file sits in the bundle.
  const PLACEHOLDER = { id: 'C2', status: 'n/a', detail: 'retired in 6.2 — nothing is read' };
  const root = healthy();
  fs.writeFileSync(path.join(root, 'apriori/changes/c/tasks.md'), '- [x] T1 done\n- [ ] T3 not done\n');
  let r = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
  assert.deepStrictEqual(r.checks.find((x) => x.id === 'C2'), PLACEHOLDER);
  assert.strictEqual(r.code, 0, 'a legacy task list must not block the gate');
  fs.rmSync(path.join(root, 'apriori/changes/c/tasks.md'));
  r = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
  assert.deepStrictEqual(r.checks.find((x) => x.id === 'C2'), PLACEHOLDER, 'present or absent, the same answer');
  assert.ok(!('checkTasks' in require('../lib/readiness')), 'the reader must be gone, not merely unused');
});

test('GT-03 C4 is a placeholder — review/issues.md is never read', () => {
  const PLACEHOLDER = { id: 'C4', status: 'n/a', detail: 'ledger retired in 6.2 — open items live in ## Open' };
  const root = healthy();
  fs.writeFileSync(path.join(root, 'apriori/changes/c/review/issues.md'), LEDGER_OPEN);
  const r = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
  assert.deepStrictEqual(r.checks.find((x) => x.id === 'C4'), PLACEHOLDER);
  assert.strictEqual(r.code, 0, 'an open ledger row is not a fact the tool reads any more');
  // an unreadable ledger is not read either — only the review ROOT is still guarded, at C5
  fs.rmSync(path.join(root, 'apriori/changes/c/review/issues.md'));
  fs.mkdirSync(path.join(root, 'apriori/changes/c/review/issues.md'));
  const r2 = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
  assert.deepStrictEqual(r2.checks.find((x) => x.id === 'C4'), PLACEHOLDER);
  assert.strictEqual(r2.code, 0);
  const rd = require('../lib/readiness');
  for (const gone of ['checkLedger', 'ledgerFindings', 'classifyStatus', 'waiveEvidence', 'SUBSTANTIVE_LEDGER'])
    assert.ok(!(gone in rd), `${gone} must be gone, not merely unused`);
  assert.ok(!('parseLedger' in require('../lib/status')), 'the ledger parser must be gone');
});

test('GT-04 flow-state legality is enforced', () => {
  for (const [flow, offender] of [
    [FLOW('c').replace('mode: standard', 'mode: <fast | standard>'), /mode/],
    [FLOW('c').replace('phase: build', 'phase: STEP9'), /not in the legal vocabulary/],
    [FLOW('c').replace('phase: build', 'current-step: STEP6'), /5\.x identity/],
    [FLOW('c').replace('mode: standard', 'mode: huge'), /mode/],
    [FLOW('c').replace('mode: standard', 'tier: medium\ntrack: harden'), /5\.x identity/],
    [FLOW('wrong-name'), /change/],
    [FLOW('c').replace('lineage: v3\n', ''), /lineage/],
    [FLOW('c').replace('phase: build', ''), /required key 'phase' missing/],
  ]) {
    const root = healthy();
    fs.writeFileSync(path.join(root, 'apriori/changes/c/flow-state.md'), flow);
    const r = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
    const c3 = r.checks.find((x) => x.id === 'C3');
    assert.strictEqual(c3.status, 'blocked');
    assert.match(c3.detail, offender);
  }
});

test('GT-05 verdict evidence is mechanical (missing raw blocks; raw fixes; symlink blocks)', () => {
  const root = healthy();
  fs.writeFileSync(path.join(root, 'apriori/changes/c/review/req-review-v1.md'), 'body\nVERDICT: no major issues\n');
  let r = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
  let c5 = r.checks.find((x) => x.id === 'C5');
  assert.strictEqual(c5.status, 'blocked');
  assert.match(c5.detail, /req-review-v1/);
  fs.writeFileSync(path.join(root, 'apriori/changes/c/review/req-review-v1-raw.txt'), 'raw transcript');
  r = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
  c5 = r.checks.find((x) => x.id === 'C5');
  assert.strictEqual(c5.status, 'pass', c5.detail);
  // design-dir docs participate too
  fs.writeFileSync(path.join(root, 'apriori/changes/c/review/spec-review-v1.md'), 'VERDICT: 1 issues open\n');
  r = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
  assert.strictEqual(r.checks.find((x) => x.id === 'C5').status, 'blocked');
  fs.writeFileSync(path.join(root, 'apriori/changes/c/review/spec-review-v1-raw.txt'), 'raw');
  r = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
  assert.strictEqual(r.checks.find((x) => x.id === 'C5').status, 'pass');
  // a VERDICT-free doc needs no raw
  fs.writeFileSync(path.join(root, 'apriori/changes/c/review/kb-check.md'), 'notes only\n');
  assert.strictEqual(gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK }).checks.find((x) => x.id === 'C5').status, 'pass');
  // symlinked doc-glob match blocks (where the platform allows symlinks)
  let canSymlink = true;
  try { fs.symlinkSync(path.join(root, 'apriori/changes/c/review/req-review-v1.md'), path.join(root, 'apriori/changes/c/review/c-linked.md')); }
  catch { canSymlink = false; }
  if (canSymlink) {
    r = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
    c5 = r.checks.find((x) => x.id === 'C5');
    assert.strictEqual(c5.status, 'blocked');
    assert.match(c5.detail, /c-linked/);
    fs.rmSync(path.join(root, 'apriori/changes/c/review/c-linked.md'));
    // a SYMLINKED raw is not evidence: replace the real raw with a symlink → blocked again
    fs.renameSync(path.join(root, 'apriori/changes/c/review/req-review-v1-raw.txt'), path.join(root, 'apriori/changes/c/review/elsewhere.txt'));
    fs.symlinkSync(path.join(root, 'apriori/changes/c/review/elsewhere.txt'), path.join(root, 'apriori/changes/c/review/req-review-v1-raw.txt'));
    r = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
    assert.strictEqual(r.checks.find((x) => x.id === 'C5').status, 'blocked');
    // a DANGLING review/ symlink is a defect, not absence — C5 blocks (C4 is a placeholder
    // in 6.2 and never reads through it), in-flight…
    const dang = healthy();
    fs.rmSync(path.join(dang, 'apriori/changes/c/review'), { recursive: true });
    fs.symlinkSync(path.join(dang, 'no-such-target'), path.join(dang, 'apriori/changes/c/review'));
    r = gate.runGate({ cwd: dang, change: 'c', testCmd: TAP_OK });
    assert.strictEqual(r.checks.find((x) => x.id === 'C5').status, 'blocked');
    assert.match(r.checks.find((x) => x.id === 'C5').detail, /symlink/);
    assert.strictEqual(r.checks.find((x) => x.id === 'C4').status, 'n/a');
    // …and archived
    const darch = mkProject({
      'apriori/specs/kv/spec.md': STORE + '\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n',
      'apriori/changes/archive/2026-07-10T1200-c/flow-state.md': FLOW('c'),
      'apriori/changes/archive/2026-07-10T1200-c/specs/kv/spec.md': DELTA,
    });
    fs.symlinkSync(path.join(darch, 'no-such-target'), path.join(darch, 'apriori/changes/archive/2026-07-10T1200-c/review'));
    r = gate.runGate({ cwd: darch, change: 'c', testCmd: TAP_OK });
    assert.strictEqual(r.checks.find((x) => x.id === 'C5').status, 'blocked');
    assert.match(r.checks.find((x) => x.id === 'C5').detail, /symlink/);
    assert.strictEqual(r.checks.find((x) => x.id === 'C4').status, 'n/a');
  }
});

test('GT-06 the binding gate is stage-aware (in-flight projected; archived plain)', () => {
  // in-flight: XB-01 exists only in the delta — passing C1 proves the projection ran
  const inflight = healthy();
  const r1 = gate.runGate({ cwd: inflight, change: 'c', testCmd: TAP_OK });
  assert.strictEqual(r1.checks.find((x) => x.id === 'C1').status, 'pass');
  // a missing scenario-to-TAP binding (XB-01 unbound) is advisory, non-blocking by default:
  // the native test command still succeeded and left real evidence for the scenarios it did cover
  const r1b = gate.runGate({ cwd: inflight, change: 'c', testCmd: tapCmd('ok 1 - XA-01 a') });
  const c1b = r1b.checks.find((x) => x.id === 'C1');
  assert.strictEqual(c1b.status, 'pass', c1b.detail);
  assert.match(c1b.detail, /advisory.*unbound/);
  // archived: change only under archive/, store already merged, plain verify runs
  const arch = mkProject({
    'apriori/specs/kv/spec.md': STORE + '\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n',
    'apriori/changes/archive/2026-07-10T1200-c/flow-state.md': FLOW('c'),
    'apriori/changes/archive/2026-07-10T1200-c/specs/kv/spec.md': DELTA,
  });
  const r2 = gate.runGate({ cwd: arch, change: 'c', testCmd: TAP_OK });
  assert.strictEqual(r2.stage, 'archived');
  assert.strictEqual(r2.code, 0, JSON.stringify(r2.checks));
});

// R02 subtraction #1: scenario-to-TAP binding is advisory, never a forced merger/promoter script.
// Facts still fail closed: a real failing test, or zero parsed test evidence, still blocks C1.
test('R02-01 unbound/orphan/unidentified/duplicate binding never blocks a real green run', () => {
  const root = healthy();
  // native, unrelated-looking test names — none of them carry a bound scenario ID at all
  const r = gate.runGate({ cwd: root, change: 'c', testCmd: tapCmd('ok 1 - renders the widget', 'ok 2 - handles click') });
  const c1 = r.checks.find((x) => x.id === 'C1');
  assert.strictEqual(c1.status, 'pass', c1.detail);
  assert.match(c1.detail, /advisory/);
  assert.strictEqual(r.code, 0, 'a producer must not be forced to write a TAP merger/scenario-ID promoter to pass C1');
});

test('R02-02 a real bound failure still blocks C1 (fail-closed preserved)', () => {
  const root = healthy();
  // XB-01 is this change's own in-scope scenario (from DELTA); XA-01 is store-only/out-of-scope
  const r = gate.runGate({ cwd: root, change: 'c', testCmd: tapCmd('ok 1 - XA-01 a', 'not ok 2 - XB-01 b') });
  const c1 = r.checks.find((x) => x.id === 'C1');
  assert.strictEqual(c1.status, 'blocked', c1.detail);
  assert.match(c1.detail, /red/);
  assert.strictEqual(r.code, 1);
});

test('R02-03 zero parsed test evidence still blocks C1 even on a clean exit', () => {
  const root = healthy();
  // the command exits 0 and prints nothing TAP-shaped at all — no evidence anything ran
  const r = gate.runGate({ cwd: root, change: 'c', testCmd: 'node -e "1"' });
  const c1 = r.checks.find((x) => x.id === 'C1');
  assert.strictEqual(c1.status, 'blocked', c1.detail);
  assert.match(c1.detail, /no evidence of tests actually running/);
});

test('GT-07 resolution is validated and deterministic', () => {
  const root = healthy();
  // invalid name → exit 2 (spawned: also proves usage surface)
  const bad = run(['gate', '--change', '../evil', '--test-cmd', TAP_OK], root);
  assert.strictEqual(bad.status, 2);
  // not found → exit 2 naming both locations
  const nf = gate.runGate({ cwd: root, change: 'nope', testCmd: TAP_OK });
  assert.strictEqual(nf.code, 2);
  assert.ok(nf.errors.some((e) => e.includes('apriori/changes') || e.includes('archive')), nf.errors.join());
  // two archived dirs → lexicographically last basename wins
  const arch = mkProject({
    'apriori/specs/kv/spec.md': STORE + '\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n',
    'apriori/changes/archive/2026-07-10T1200-c/flow-state.md': FLOW('c'),
    'apriori/changes/archive/2026-07-10T1200-c/specs/kv/spec.md': DELTA,
    'apriori/changes/archive/2026-07-10T1400-c/flow-state.md': FLOW('c').replace('phase: build', 'phase: review'),
    'apriori/changes/archive/2026-07-10T1400-c/specs/kv/spec.md': DELTA,
  });
  // the two dirs differ only by phase, and C3's detail prints it — that is what says which dir was read
  const readTasks = (res) => res.checks.find((x) => x.id === 'C3').detail;
  const r = gate.runGate({ cwd: arch, change: 'c', testCmd: TAP_OK });
  assert.match(readTasks(r), /review\)/);   // newer dir used
  // a stray FILE with a stamp-shaped name is ignored, older real dir still wins deterministically
  fs.writeFileSync(path.join(arch, 'apriori/changes/archive/2026-07-10T1600-c'), 'not a dir');
  const r2 = gate.runGate({ cwd: arch, change: 'c', testCmd: TAP_OK });
  assert.strictEqual(r2.stage, 'archived');
  assert.match(readTasks(r2), /review\)/); // still the 1400 dir, not the file
  // an archived entry symlinking OUTSIDE archive/ (but inside changes/) is an escape → exit 2
  let canSymlink = true;
  const elsewhere = path.join(arch, 'apriori/changes/elsewhere-c');
  fs.mkdirSync(elsewhere, { recursive: true });
  fs.writeFileSync(path.join(elsewhere, 'flow-state.md'), FLOW('c'));
  try { fs.symlinkSync(elsewhere, path.join(arch, 'apriori/changes/archive/2026-07-10T1700-c')); }
  catch { canSymlink = false; }
  if (canSymlink) {
    const r3 = gate.runGate({ cwd: arch, change: 'c', testCmd: TAP_OK });
    assert.strictEqual(r3.code, 2);
    assert.ok(r3.errors.some((e) => /escape|symlink/.test(e)), r3.errors.join());   // resolver-trust: a symlinked candidate is structural before containment even runs
  }
});

test('GT-08 a missing or mismatched flow-state fails closed', () => {
  const root = healthy();
  fs.rmSync(path.join(root, 'apriori/changes/c/flow-state.md'));
  const r = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
  assert.strictEqual(r.code, 2);
  assert.strictEqual(r.result, 'ERROR');
  // mismatch case is GT-04's /change/ row (C3-blocked, not exit 2) — assert the distinction here too
  const root2 = healthy();
  fs.writeFileSync(path.join(root2, 'apriori/changes/c/flow-state.md'), FLOW('other'));
  assert.strictEqual(gate.runGate({ cwd: root2, change: 'c', testCmd: TAP_OK }).code, 1);
});

test('GT-09 neither mode is asked for artifacts 6.0 does not require', () => {
  // The review round is NOT one of them: every change keeps its one independent review, so the
  // fixture carries it and the absent tasks.md / ledger stay the subject. 6.2 retired both
  // readers outright: C2 and C4 are placeholders whatever `mode:` says.
  const REVIEWED = {
    'apriori/changes/c/review/code-review-v1.md': 'VERDICT: no major issues\n',
    'apriori/changes/c/review/code-review-v1-raw.txt': 'raw\n',
  };
  for (const mode of ['fast', 'standard']) {
    const root = mkProject({
      'apriori/specs/kv/spec.md': STORE,
      'apriori/changes/c/flow-state.md': FLOW('c', mode),
      'apriori/changes/c/specs/kv/spec.md': DELTA,
      ...REVIEWED,
    });
    const r = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
    assert.strictEqual(r.checks.find((x) => x.id === 'C2').status, 'n/a', mode);
    assert.strictEqual(r.checks.find((x) => x.id === 'C4').status, 'n/a', mode);
    assert.strictEqual(r.code, 0, `${mode}: ${JSON.stringify(r.checks)}`);
  }
});

test('GT-10 KB freshness degrades honestly', () => {
  // n/a branches need no git: no truth doc at all
  const root = healthy();
  const na = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK }).checks.find((x) => x.id === 'C6');
  assert.strictEqual(na.status, 'n/a');
  // truth doc without lib file → n/a
  fs.mkdirSync(path.join(root, 'apriori/truth'), { recursive: true });
  fs.writeFileSync(path.join(root, 'apriori/truth/kv.md'), 'source-commit: deadbeef\n');
  const na2 = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK }).checks.find((x) => x.id === 'C6');
  assert.strictEqual(na2.status, 'n/a');
  // full git fixture — guarded on git availability
  const g = spawnSync('git', ['--version'], { encoding: 'utf8' });
  if (!g.error && g.status === 0) {
    const root3 = healthy();
    const env = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };
    const git = (...a) => { const r = spawnSync('git', ['-C', root3, ...a], { encoding: 'utf8', env }); assert.strictEqual(r.status, 0, r.stderr); return r; };
    git('init', '-q');
    fs.mkdirSync(path.join(root3, 'lib'), { recursive: true });
    fs.writeFileSync(path.join(root3, 'lib/kv.js'), '1');
    git('add', '-A'); git('commit', '-q', '-m', 'one');
    const c1 = git('rev-parse', 'HEAD').stdout.trim();
    fs.mkdirSync(path.join(root3, 'apriori/truth'), { recursive: true });
    fs.writeFileSync(path.join(root3, 'apriori/truth/kv.md'), `source-commit: ${c1}\n`);
    let c6 = gate.runGate({ cwd: root3, change: 'c', testCmd: TAP_OK }).checks.find((x) => x.id === 'C6');
    assert.strictEqual(c6.status, 'pass', c6.detail);           // stamp up to date
    fs.writeFileSync(path.join(root3, 'lib/kv.js'), '2');
    git('add', '-A'); git('commit', '-q', '-m', 'two');
    c6 = gate.runGate({ cwd: root3, change: 'c', testCmd: TAP_OK }).checks.find((x) => x.id === 'C6');
    assert.strictEqual(c6.status, 'blocked');                   // stale stamp
    fs.writeFileSync(path.join(root3, 'apriori/truth/kv.md'), 'source-commit: 0000000\n');
    c6 = gate.runGate({ cwd: root3, change: 'c', testCmd: TAP_OK }).checks.find((x) => x.id === 'C6');
    assert.strictEqual(c6.status, 'n/a');                       // bad commit = infra, never a block
  }
});

test('GT-11 --json is pure JSON in every outcome class', () => {
  const root = healthy();
  const cases = [
    [['gate', '--change', 'c', '--test-cmd', TAP_OK, '--json'], 0, 'PASS', 'in-flight'],
    [['gate', '--change', 'nope', '--test-cmd', TAP_OK, '--json'], 2, 'ERROR', null],
    [['gate', '--change', '../evil', '--test-cmd', TAP_OK, '--json'], 2, 'ERROR', null],
    [['gate', '--json'], 2, 'ERROR', null],                                   // usage: --change missing
  ];
  for (const [args, code, result, stage] of cases) {
    const r = run(args, root);
    assert.strictEqual(r.status, code, args.join(' ') + ': ' + r.stdout + r.stderr);
    const j = JSON.parse(r.stdout);
    assert.strictEqual(j.result, result);
    assert.strictEqual(j.stage, stage);
    assert.ok(Array.isArray(j.checks) && Array.isArray(j.errors));
  }
  assert.strictEqual(JSON.parse(run(['gate', '--json'], root).stdout).change, null);
  // BLOCKED class — an `## Open` item nobody closed, which is the finding that still refuses
  fs.writeFileSync(path.join(root, 'apriori/changes/c/flow-state.md'),
    FLOW('c').replace('\ngates:', '\n## Open\n- the retry path is unproven\n\ngates:'));
  const b = run(['gate', '--change', 'c', '--test-cmd', TAP_OK, '--json'], root);
  assert.strictEqual(b.status, 1);
  assert.strictEqual(JSON.parse(b.stdout).result, 'BLOCKED');
  // missing flow-state class: still pure JSON, stage resolved, result ERROR
  fs.rmSync(path.join(root, 'apriori/changes/c/flow-state.md'));
  const nofs = run(['gate', '--change', 'c', '--test-cmd', TAP_OK, '--json'], root);
  assert.strictEqual(nofs.status, 2);
  const jn = JSON.parse(nofs.stdout);
  assert.strictEqual(jn.result, 'ERROR');
  assert.ok(jn.errors.length > 0);
  // verify-untrustworthy class (broken delta → projection fails): pure JSON, ERROR
  const bad = healthy('d');
  fs.writeFileSync(path.join(bad, 'apriori/changes/d/specs/kv/spec.md'), '# prose, zero ops\n');
  const vu = run(['gate', '--change', 'd', '--test-cmd', TAP_OK, '--json'], bad);
  assert.strictEqual(vu.status, 2);
  assert.strictEqual(JSON.parse(vu.stdout).result, 'ERROR');
});

test('GT-12 gate is read-only', () => {
  const root = healthy();
  const snap = () => {
    const out = [];
    const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else out.push(p + ':' + fs.statSync(p).size + ':' + fs.statSync(p).mtimeMs); } };
    walk(root);
    return out.sort().join('\n');
  };
  const before = snap();
  gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
  gate.runGate({ cwd: root, change: 'nope', testCmd: TAP_OK });
  assert.strictEqual(snap(), before);
});

// ---- cas-enforcement (GT-16): C7 denies unstamped mutation deltas unless visibly waived ----

const MOD_DELTA = '## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- tightened\n';
function modProject(extraFiles = {}) {
  return mkProject({
    'apriori/specs/kv/spec.md': STORE,
    'apriori/changes/c/flow-state.md': FLOW('c'),
    'apriori/changes/c/specs/kv/spec.md': MOD_DELTA,
    ...extraFiles,
  });
}
const MOD_TAP = tapCmd('ok 1 - XA-01 a');
const c7Of = (root, opts = {}) => gate.runGate({ cwd: root, change: 'c', testCmd: MOD_TAP, ...opts }).checks.find((x) => x.id === 'C7');

test('GT-16 C7 blocks, and waivers are loud', () => {
  // unstamped mutation delta → blocked naming the suffix + cure
  const b = c7Of(modProject());
  assert.ok(b, 'C7 missing from checks');
  assert.strictEqual(b.status, 'blocked');
  assert.match(b.detail, /kv[\/\\]spec\.md/);
  assert.match(b.detail, /apriori stamp/);
  // --no-cas → loud waiver, not blocked
  const w = c7Of(modProject(), { noCas: true });
  assert.notStrictEqual(w.status, 'blocked');
  assert.match(w.detail, /waived \(--no-cas\)/);
  // config row | cas | optional | → waived naming the config
  const rootC = modProject({ 'apriori/process-config.md': '| Field | Value |\n|---|---|\n| cas | optional |\n' });
  const wc = c7Of(rootC);
  assert.notStrictEqual(wc.status, 'blocked');
  assert.match(wc.detail, /process-config/);
  // the flag wins over a required config
  const rootR = modProject({ 'apriori/process-config.md': '| Field | Value |\n|---|---|\n| cas | required |\n' });
  assert.strictEqual(c7Of(rootR).status, 'blocked');
  assert.match(c7Of(rootR, { noCas: true }).detail, /waived \(--no-cas\)/);
  // stamped or ADDED-only → silent pass
  const okA = c7Of(healthy());                                   // ADDED-only fixture
  assert.strictEqual(okA.status, 'pass');
  // archived stage → n/a (deltas already merged)
  const arch = mkProject({
    'apriori/specs/kv/spec.md': STORE + '\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n',
    'apriori/changes/archive/2026-07-10T1200-c/flow-state.md': FLOW('c'),
    'apriori/changes/archive/2026-07-10T1200-c/specs/kv/spec.md': DELTA,
  });
  const na = gate.runGate({ cwd: arch, change: 'c', testCmd: TAP_OK }).checks.find((x) => x.id === 'C7');
  assert.strictEqual(na.status, 'n/a');
  // CLI: --no-cas is a legal flag
  const cli = run(['gate', '--change', 'c', '--no-cas', '--test-cmd', MOD_TAP], modProject());
  assert.match(cli.stdout, /waived/);
});

test('SR-38 gate C1 inherits the unattributed-failure GAPS class', () => {
  const root = healthy();
  const cmd = tapCmd('ok 1 - XA-01 a', 'ok 2 - XB-01 b', 'not ok 3 - teardown failed');
  const r = gate.runGate({ cwd: root, change: 'c', testCmd: cmd });
  const c1 = r.checks.find((x) => x.id === 'C1');
  assert.strictEqual(c1.status, 'blocked', c1.detail);
  assert.match(c1.detail, /unattributed/, 'the gap count names the unattributed class');
});

test('GT-17 bad cas config blocks instead of waiving', () => {
  const conflicted = healthy();
  fs.writeFileSync(path.join(conflicted, 'apriori/process-config.md'), '| cas | optional |\n| cas | required |\n');
  fs.writeFileSync(path.join(conflicted, 'apriori/changes/c/specs/kv/spec.md'),
    '## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t2\n');
  const r = gate.runGate({ cwd: conflicted, change: 'c', testCmd: tapCmd('ok 1 - XA-01 a') });
  const c7 = r.checks.find((x) => x.id === 'C7');
  assert.strictEqual(c7.status, 'blocked', c7.detail);
  assert.match(c7.detail, /conflict/i);
  const fenced = healthy();
  fs.writeFileSync(path.join(fenced, 'apriori/process-config.md'), '```\n| cas | optional |\n```\n');
  fs.writeFileSync(path.join(fenced, 'apriori/changes/c/specs/kv/spec.md'),
    '## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- t2\n');
  const r2 = gate.runGate({ cwd: fenced, change: 'c', testCmd: tapCmd('ok 1 - XA-01 a') });
  assert.strictEqual(r2.checks.find((x) => x.id === 'C7').status, 'blocked', 'fenced rows grant nothing');
  const r3 = gate.runGate({ cwd: fenced, change: 'c', testCmd: tapCmd('ok 1 - XA-01 a'), noCas: true });
  assert.strictEqual(r3.checks.find((x) => x.id === 'C7').status, 'pass', '--no-cas waives either way');
});

// ---- c6-truth-binding (GT-18..21): C6 binds through the truth index ----
function gitKB(root) {
  const env = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };
  const git = (...a) => { const r = spawnSync('git', ['-C', root, ...a], { encoding: 'utf8', env }); assert.strictEqual(r.status, 0, r.stderr); return r; };
  return git;
}
// a change touching store module `mod`, with a clean projected verify under TAP_OK
function kbProject(mod, extra = {}) {
  return mkProject({
    [`apriori/specs/${mod}/spec.md`]: STORE,
    'apriori/changes/c/flow-state.md': FLOW('c'),
    [`apriori/changes/c/specs/${mod}/spec.md`]: DELTA,
    ...extra,
  });
}
const c6of = (root) => gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK }).checks.find((x) => x.id === 'C6');
const gitAvail = (() => { const g = spawnSync('git', ['--version'], { encoding: 'utf8' }); return !g.error && g.status === 0; })();

test('GT-18 the truth index binds by declaration, not filename', () => {
  if (!gitAvail) return;
  // store module `quick-poll`, truth doc under a DIFFERENT basename declaring store-module
  const root = kbProject('quick-poll', {
    'apriori/truth/poll.md': 'no fields yet',   // overwritten below after commit
  });
  const git = gitKB(root);
  git('init', '-q');
  fs.mkdirSync(path.join(root, 'lib'), { recursive: true });
  fs.writeFileSync(path.join(root, 'lib/quick-poll.js'), '1');
  git('add', '-A'); git('commit', '-q', '-m', 'one');
  const c1 = git('rev-parse', 'HEAD').stdout.trim();
  fs.writeFileSync(path.join(root, 'apriori/truth/poll.md'), `store-module: quick-poll\nsource-commit: ${c1}\n\n## Contract\n`);
  assert.strictEqual(c6of(root).status, 'pass', c6of(root).detail);   // found via store-module, up to date
  fs.writeFileSync(path.join(root, 'lib/quick-poll.js'), '2');
  git('add', '-A'); git('commit', '-q', '-m', 'two');
  assert.strictEqual(c6of(root).status, 'blocked');                    // stale, no longer a silent skip
  // two truth docs declaring the same module → conflict block
  fs.writeFileSync(path.join(root, 'apriori/truth/other.md'), 'store-module: quick-poll\nsource-commit: abc1234\n');
  const conf = c6of(root);
  assert.strictEqual(conf.status, 'blocked');
  assert.match(conf.detail, /quick-poll|conflict|two/i);
});

test('GT-19 an explicit source-files declaration is a complete promise', () => {
  if (!gitAvail) return;
  const root = kbProject('kv');
  const git = gitKB(root);
  git('init', '-q');
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src/a.js'), '1');
  git('add', '-A'); git('commit', '-q', '-m', 'one');
  const c1 = git('rev-parse', 'HEAD').stdout.trim();
  fs.mkdirSync(path.join(root, 'apriori/truth'), { recursive: true });
  // src-layout: declared source-files points outside lib/
  fs.writeFileSync(path.join(root, 'apriori/truth/kv.md'), `source-files: src/a.js\nsource-commit: ${c1}\n`);
  assert.strictEqual(c6of(root).status, 'pass', c6of(root).detail);
  fs.writeFileSync(path.join(root, 'src/a.js'), '2');
  git('add', '-A'); git('commit', '-q', '-m', 'two');
  assert.strictEqual(c6of(root).status, 'blocked');                    // git logged the declared src path
  // an explicit token that is missing → blocked (a declaration is a complete promise)
  fs.writeFileSync(path.join(root, 'apriori/truth/kv.md'), `source-files: src/a.js src/gone.js\nsource-commit: ${c1}\n`);
  const miss = c6of(root);
  assert.strictEqual(miss.status, 'blocked');
  assert.match(miss.detail, /gone\.js/);
  // an escaping token → blocked
  fs.writeFileSync(path.join(root, 'apriori/truth/kv.md'), `source-files: ../outside.js\nsource-commit: ${c1}\n`);
  assert.strictEqual(c6of(root).status, 'blocked');
  // a malformed absolute token → blocked even if path.join would resolve it inside the repo (C6IMPL-1)
  fs.writeFileSync(path.join(root, 'apriori/truth/kv.md'), `source-files: /src/a.js\nsource-commit: ${c1}\n`);
  const mal = c6of(root);
  assert.strictEqual(mal.status, 'blocked');
  assert.match(mal.detail, /malformed/);
});

test('GT-20 malformed source-commit stamps are diagnosed, not silently skipped', () => {
  const root = kbProject('kv', {
    'apriori/truth/kv.md': '# T\n\n> `source-commit: deadbeef`\n',   // blockquote form, not the bare line
  });
  const c6 = c6of(root);
  assert.strictEqual(c6.status, 'n/a');
  assert.match(c6.detail, /canonical|line-start/i);        // points at the format, not vague "no source-commit"
  // a source-commit only inside a code fence raises no diagnostic
  fs.writeFileSync(path.join(root, 'apriori/truth/kv.md'), '# T\n\n```\nsource-commit: deadbeef\n```\n');
  const fenced = c6of(root);
  assert.strictEqual(fenced.status, 'n/a');
  assert.doesNotMatch(fenced.detail, /format|line-start/i);           // fenced example → no diagnostic (just "no truth"/"no stamp")
});

test('GT-21 field-less truth docs behave exactly as before', () => {
  if (!gitAvail) return;
  // this is the pre-change default-layout path: bare stamp + lib/<module>.js
  const root = kbProject('kv');
  const git = gitKB(root);
  git('init', '-q');
  fs.mkdirSync(path.join(root, 'lib'), { recursive: true });
  fs.writeFileSync(path.join(root, 'lib/kv.js'), '1');
  git('add', '-A'); git('commit', '-q', '-m', 'one');
  const c1 = git('rev-parse', 'HEAD').stdout.trim();
  fs.mkdirSync(path.join(root, 'apriori/truth'), { recursive: true });
  fs.writeFileSync(path.join(root, 'apriori/truth/kv.md'), `source-commit: ${c1}\n`);   // no fields
  assert.strictEqual(c6of(root).status, 'pass', c6of(root).detail);   // default fallback: module=kv, lib/kv.js
  // default lib file absent (no declaration) stays a note/n-a, never a block
  const root2 = kbProject('kv', { 'apriori/truth/kv.md': 'source-commit: deadbeef\n' });
  assert.strictEqual(c6of(root2).status, 'n/a');
});
