'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('node:child_process');
const doctor = require('../lib/doctor');

const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const PKG_RUNBOOK = fs.readFileSync(path.join(__dirname, '..', 'RUNBOOK.md'), 'utf8');
function run(args, cwd) { return spawnSync('node', [BIN, ...args], { encoding: 'utf8', cwd }); }
function tapCmd(...lines) {
  return `node -e "${lines.map((l) => `console.log('${l}')`).join(';')}"`;
}

function mkProject(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-dr-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    if (content === null) fs.mkdirSync(p, { recursive: true });
    else fs.writeFileSync(p, content);
  }
  return root;
}

// a fully healthy consumer project
function healthy() {
  return mkProject({
    'apriori/runbook.md': PKG_RUNBOOK,
    'apriori/.gitignore': 'tmp/\n',
    'apriori/tmp': null,
    'apriori/specs': null,
    'apriori/changes': null,
    'apriori/process-config.md': '| language | auto |\n',
    'CLAUDE.md': 'Development follows `apriori/runbook.md`.\n',
    '.claude/commands/apriori.md': 'cmd\n',
  });
}
const TAP_OK = tapCmd('TAP version 13', '1..1', 'ok 1 - fine');

function byId(res, id) { return res.checks.filter((c) => c.id === id); }

test('DR-01 a healthy initialized project reports HEALTHY (exit 0)', () => {
  const r = doctor.runDoctor({ cwd: healthy(), testCmd: TAP_OK });
  assert.strictEqual(r.code, 0, JSON.stringify(r.checks));
  assert.strictEqual(r.result, 'HEALTHY');
  assert.strictEqual(r.findings, 0);
  assert.ok(r.checks.every((c) => c.status !== 'finding'));
});

test('DR-02 an uninitialized project is unusable, with guidance', () => {
  const root = mkProject({ 'readme.txt': 'x' });
  const r = run(['doctor', '--json'], root);
  assert.strictEqual(r.status, 2);
  const j = JSON.parse(r.stdout);
  assert.strictEqual(j.result, 'UNUSABLE');
  assert.ok(JSON.stringify(j).includes('apriori init'));
  assert.ok(j.checks.some((c) => c.id === 'D1'));   // already-run checks listed
});

test('DR-03 init-scaffold gaps are findings with their fixer (one entry per gap)', () => {
  const root = healthy();
  fs.rmSync(path.join(root, 'apriori/runbook.md'));
  fs.rmSync(path.join(root, 'apriori/.gitignore'));
  fs.rmdirSync(path.join(root, 'apriori/tmp'));
  fs.rmdirSync(path.join(root, 'apriori/specs'));
  const r = doctor.runDoctor({ cwd: root, testCmd: TAP_OK });
  const d2 = byId(r, 'D2').filter((c) => c.status === 'finding');
  assert.strictEqual(d2.length, 4, JSON.stringify(d2));          // one per gap
  assert.strictEqual(r.findings, r.checks.filter((c) => c.status === 'finding').length);
  assert.ok(d2.every((c) => /init|update/.test(c.fix || '')));
  // file-vs-dir swaps are findings too, never false passes or crashes (DIMPL-1)
  const swapped = healthy();
  fs.rmdirSync(path.join(swapped, 'apriori/specs'));
  fs.writeFileSync(path.join(swapped, 'apriori/specs'), 'a file impersonating the store dir');
  fs.rmdirSync(path.join(swapped, 'apriori/tmp'));
  fs.writeFileSync(path.join(swapped, 'apriori/tmp'), 'file');
  fs.rmSync(path.join(swapped, 'apriori/.gitignore'));
  fs.mkdirSync(path.join(swapped, 'apriori/.gitignore'));
  const rs = doctor.runDoctor({ cwd: swapped, testCmd: TAP_OK });
  assert.ok(byId(rs, 'D2').filter((c) => c.status === 'finding').length >= 3, JSON.stringify(byId(rs, 'D2')));
  // missing process-config is NOT a finding
  const root2 = healthy();
  fs.rmSync(path.join(root2, 'apriori/process-config.md'));
  const r2 = doctor.runDoctor({ cwd: root2, testCmd: TAP_OK });
  assert.ok(byId(r2, 'D2').every((c) => c.status !== 'finding'));
});

test('DR-04 runbook freshness points at update, and never contradicts D2', () => {
  const stale = healthy();
  fs.appendFileSync(path.join(stale, 'apriori/runbook.md'), 'local edit\n');
  const r = doctor.runDoctor({ cwd: stale, testCmd: TAP_OK });
  const d3 = byId(r, 'D3')[0];
  assert.strictEqual(d3.status, 'finding');
  assert.match(d3.fix || d3.detail, /apriori update/);
  const absent = healthy();
  fs.rmSync(path.join(absent, 'apriori/runbook.md'));
  const r2 = doctor.runDoctor({ cwd: absent, testCmd: TAP_OK });
  assert.strictEqual(byId(r2, 'D3')[0].status, 'n/a');           // D2 owns the absence
  // runbook.md as a DIRECTORY: D2 finding + D3 n/a — never a crash (DIMPL-1 r2)
  const dirRb = healthy();
  fs.rmSync(path.join(dirRb, 'apriori/runbook.md'));
  fs.mkdirSync(path.join(dirRb, 'apriori/runbook.md'));
  const r3 = doctor.runDoctor({ cwd: dirRb, testCmd: TAP_OK });
  assert.ok(byId(r3, 'D2').some((c) => c.status === 'finding' && /runbook/.test(c.detail)));
  assert.strictEqual(byId(r3, 'D3')[0].status, 'n/a');
});

test('DR-05 detected tools must keep their pointers', () => {
  const root = healthy();
  fs.writeFileSync(path.join(root, 'CLAUDE.md'), 'no pointer anymore\n');   // pointer lost
  fs.rmSync(path.join(root, '.claude/commands/apriori.md'));                 // command file gone
  const r = doctor.runDoctor({ cwd: root, testCmd: TAP_OK });
  const d4 = byId(r, 'D4').filter((c) => c.status === 'finding');
  assert.ok(d4.length >= 1);
  assert.ok(d4.some((c) => /CLAUDE\.md|apriori\.md/.test(c.detail)));
  // a rules path that is a DIRECTORY is a finding, not a crash (DIMPL-1)
  const dirRules = healthy();
  fs.rmSync(path.join(dirRules, 'CLAUDE.md'));
  fs.mkdirSync(path.join(dirRules, 'CLAUDE.md'));
  const rd = doctor.runDoctor({ cwd: dirRules, testCmd: TAP_OK });
  assert.ok(byId(rd, 'D4').some((c) => c.status === 'finding' && /CLAUDE\.md/.test(c.detail)));
  // no tool markers at all → n/a
  const bare = mkProject({
    'apriori/runbook.md': PKG_RUNBOOK, 'apriori/.gitignore': 'tmp/\n',
    'apriori/tmp': null, 'apriori/specs': null, 'apriori/changes': null,
  });
  assert.strictEqual(byId(doctor.runDoctor({ cwd: bare, testCmd: TAP_OK }), 'D4')[0].status, 'n/a');
});

test('DR-06 the TAP probe classifies every plumbing edge', () => {
  const root = healthy();
  const probe = (testCmd) => byId(doctor.runDoctor({ cwd: root, testCmd }), 'D5')[0];
  // spawn failure
  assert.strictEqual(probe('no-such-binary-zzz --x').status, 'finding');
  // signal kill — unit-level via the classifier (Windows-safe)
  const sig = doctor.classifyProbe({ out: '', status: null, signal: 'SIGKILL', error: null });
  assert.strictEqual(sig.status, 'finding');
  assert.match(sig.detail, /SIGKILL/);
  // bailout
  assert.strictEqual(probe(tapCmd('TAP version 13', 'Bail out! oom')).status, 'finding');
  // empty output
  assert.strictEqual(probe('node -e "0"').status, 'finding');
  // non-TAP output
  const nontap = probe('node -e "console.log(\'hello world\')"');
  assert.strictEqual(nontap.status, 'finding');
  assert.match(nontap.detail, /--test-reporter=tap/);
  // exit 7 with all-green TAP → unexplained
  const unexplained = probe(`node -e "console.log('ok 1 - a fine');process.exit(7)"`);
  assert.strictEqual(unexplained.status, 'finding');
  assert.match(unexplained.detail, /unexplained/);
  // failing TAP with matching non-zero exit → ok (failures are NOT findings)
  const failing = probe(`node -e "console.log('not ok 1 - b bad');process.exit(1)"`);
  assert.strictEqual(failing.status, 'ok', failing.detail);
  // 1..0 with exit 0 → ok; 1..0 with non-zero exit → finding (unexplained, classified first)
  assert.strictEqual(probe(tapCmd('TAP version 13', '1..0')).status, 'ok');
  assert.strictEqual(probe(`node -e "console.log('1..0');process.exit(3)"`).status, 'finding');
  // TAP version with zero result lines → truncated/malformed
  const trunc = probe(tapCmd('TAP version 13'));
  assert.strictEqual(trunc.status, 'finding');
  assert.match(trunc.detail, /truncated|malformed/);
  const planOnly = probe(tapCmd('1..3'));
  assert.strictEqual(planOnly.status, 'finding');
});

test('DR-07 the probe is skippable and degrades honestly', () => {
  const root = healthy();   // healthy() has no test-cmd row in its config
  const none = byId(doctor.runDoctor({ cwd: root }), 'D5')[0];
  assert.strictEqual(none.status, 'n/a');
  assert.match(none.detail, /--test-cmd|init/);
  const skipped = byId(doctor.runDoctor({ cwd: root, testCmd: TAP_OK, noRun: true }), 'D5')[0];
  assert.strictEqual(skipped.status, 'n/a');
  assert.match(skipped.detail, /skipped/);
});

test('DR-08 store health flags unbindable and ambiguous scenarios', () => {
  const root = healthy();
  fs.mkdirSync(path.join(root, 'apriori/specs/m'), { recursive: true });
  fs.writeFileSync(path.join(root, 'apriori/specs/m/spec.md'),
    '### Requirement: R\n\n#### Scenario: no id here\n- t\n\n#### Scenario: XD-01 a\n- t\n\n#### Scenario: XD-01 b\n- t\n');
  const r = doctor.runDoctor({ cwd: root, testCmd: TAP_OK });
  const d6 = byId(r, 'D6').filter((c) => c.status === 'finding');
  assert.ok(d6.length >= 1);
  const all = d6.map((c) => c.detail).join(' ');
  assert.match(all, /no id here/);
  assert.match(all, /XD-01/);
  // empty store → n/a
  assert.strictEqual(byId(doctor.runDoctor({ cwd: healthy(), testCmd: TAP_OK }), 'D6')[0].status, 'n/a');
});

test('DR-09 changes overview validates flow-states and surfaces pending gates', () => {
  const root = healthy();
  fs.mkdirSync(path.join(root, 'apriori/changes/no-flow'), { recursive: true });                        // missing file
  fs.mkdirSync(path.join(root, 'apriori/changes/no-key'), { recursive: true });
  fs.writeFileSync(path.join(root, 'apriori/changes/no-key/flow-state.md'), 'tier: medium\n');          // no change:
  fs.mkdirSync(path.join(root, 'apriori/changes/wrong'), { recursive: true });
  fs.writeFileSync(path.join(root, 'apriori/changes/wrong/flow-state.md'), 'change: other\n');          // mismatch
  fs.mkdirSync(path.join(root, 'apriori/changes/good'), { recursive: true });
  fs.writeFileSync(path.join(root, 'apriori/changes/good/flow-state.md'), 'change: good\ncurrent-step: STEP5\n');
  fs.mkdirSync(path.join(root, 'apriori/changes/archive/2026-07-10T1200-old'), { recursive: true });
  fs.writeFileSync(path.join(root, 'apriori/changes/archive/2026-07-10T1200-old/flow-state.md'), 'change: old\ncurrent-step: STEP6\n');
  const r = doctor.runDoctor({ cwd: root, testCmd: TAP_OK });
  const findings = byId(r, 'D7').filter((c) => c.status === 'finding');
  const details = findings.map((c) => c.detail).join(' ');
  assert.match(details, /no-flow/);
  assert.match(details, /no-key/);
  assert.match(details, /wrong/);
  assert.doesNotMatch(details, /\bgood\b/);
  const info = byId(r, 'D7').map((c) => c.detail).join(' ');
  assert.match(info, /old/);                       // archived not-DONE surfaced as info
  assert.match(info, /gate ④|pending/);
  // symlinked archived entry escaping archive/ is skipped, never read (where symlinks work)
  let canSymlink = true;
  const outside = path.join(root, 'elsewhere');
  fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(path.join(outside, 'flow-state.md'), 'change: evil\ncurrent-step: STEP0\n');
  try { fs.symlinkSync(outside, path.join(root, 'apriori/changes/archive/2026-07-10T1300-evil')); }
  catch { canSymlink = false; }
  if (canSymlink) {
    const r2 = doctor.runDoctor({ cwd: root, testCmd: TAP_OK });
    const t = byId(r2, 'D7').map((c) => c.detail).join(' ');
    assert.doesNotMatch(t, /change: evil/);        // never read
    assert.match(t, /skipped|escape/);             // and the skip is surfaced as info
    // per-FILE containment: an active change whose flow-state.md symlinks outside is diagnosed, never read
    const secret = path.join(outside, 'secret-flow.md');
    fs.writeFileSync(secret, 'change: leak-me\ncurrent-step: STEP0\n');
    fs.mkdirSync(path.join(root, 'apriori/changes/linked'), { recursive: true });
    fs.symlinkSync(secret, path.join(root, 'apriori/changes/linked/flow-state.md'));
    const r3 = doctor.runDoctor({ cwd: root, testCmd: TAP_OK });
    const t3 = byId(r3, 'D7').map((c) => c.detail).join(' ');
    assert.doesNotMatch(t3, /leak-me/);
    assert.match(t3, /linked.*escape|escape.*linked/);
  }
});

test('DR-10 output is machine-consumable in every class', () => {
  const healthyRoot = healthy();
  for (const [args, cwd, code, result] of [
    [['doctor', '--test-cmd', TAP_OK, '--json'], healthyRoot, 0, 'HEALTHY'],
    [['doctor', '--json', '--no-run'], mkProject({ 'apriori/specs': null, 'apriori/changes': null }), 1, 'FINDINGS'],
    [['doctor', '--json'], mkProject({ 'x.txt': 'x' }), 2, 'UNUSABLE'],
    [['doctor', 'stray-arg', '--json'], healthyRoot, 2, 'UNUSABLE'],
  ]) {
    const r = run(args, cwd);
    assert.strictEqual(r.status, code, args.join(' ') + r.stdout + r.stderr);
    const j = JSON.parse(r.stdout);
    assert.strictEqual(j.result, result);
    assert.ok(Array.isArray(j.checks) && Array.isArray(j.errors) && typeof j.findings === 'number');
  }
});

test('DR-11 doctor is read-only and rejects stray arguments', () => {
  const root = healthy();
  const snap = () => {
    const out = [];
    (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else { const st = fs.statSync(p); out.push(p + ':' + st.size + ':' + st.mtimeMs); } } })(root);
    return out.sort().join('\n');
  };
  const before = snap();
  doctor.runDoctor({ cwd: root, noRun: true });
  assert.strictEqual(snap(), before);
  const stray = run(['doctor', 'oops'], root);
  assert.strictEqual(stray.status, 2);
  assert.match(stray.stderr, /usage/i);
});

test('DR-12 the Node floor is enforced testably', () => {
  const root = healthy();
  const low = doctor.runDoctor({ cwd: root, testCmd: TAP_OK, nodeVersion: '20.11.0' });
  assert.strictEqual(low.code, 2);
  assert.strictEqual(low.result, 'UNUSABLE');
  assert.strictEqual(byId(low, 'D1')[0].status, 'finding');
  const ok = doctor.runDoctor({ cwd: root, testCmd: TAP_OK, nodeVersion: '22.0.0' });
  assert.strictEqual(byId(ok, 'D1')[0].status, 'ok');
});
