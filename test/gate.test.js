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
const FLOW = (name, tier = 'medium') => `change: ${name}\ntier: ${tier}\ntrack: harden\ntrack-rationale: r\nlineage: v3\ncurrent-step: STEP5\nround: 1\nnext-action: x\ngates:\n  - 2026-07-11T00:00 note: n\n`;
const LEDGER_OK = '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n| Q-1 | a | low | 1 | verified |\n';

// a healthy in-flight medium change
function healthy(name = 'c') {
  return mkProject({
    'apriori/specs/kv/spec.md': STORE,
    [`apriori/changes/${name}/flow-state.md`]: FLOW(name),
    [`apriori/changes/${name}/tasks.md`]: '- [x] T1 done\n- [X] T2 done\n',
    [`apriori/changes/${name}/specs/kv/spec.md`]: DELTA,
    [`apriori/changes/${name}/review/issues.md`]: LEDGER_OK,
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

test('GT-02 an unchecked task blocks', () => {
  const root = healthy();
  fs.appendFileSync(path.join(root, 'apriori/changes/c/tasks.md'), '- [ ] T3 not done\n');
  const r = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
  assert.strictEqual(r.code, 1);
  assert.strictEqual(r.result, 'BLOCKED');
  const c2 = r.checks.find((x) => x.id === 'C2');
  assert.strictEqual(c2.status, 'blocked');
  assert.match(c2.detail, /tasks\.md/);
});

test('GT-03 ledger blocks on open rows and reasonless rejections', () => {
  for (const [row, blocked] of [
    ['| Q-2 | b | high | 1 | open |', true],
    ['| Q-2 | b | high | 1 | rejected |', true],
    ['| Q-2 | b | high | 1 | rejected: |', true],
    ['| Q-2 | b | high | 1 | rejected - |', true],
    ['| Q-2 | b | high | 1 | rejected: duplicate of Q-1 |', false],
    ['| Q-2 | b | high | 1 | advisory-acked |', false],
  ]) {
    const root = healthy();
    fs.appendFileSync(path.join(root, 'apriori/changes/c/review/issues.md'), row + '\n');
    const r = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
    const c4 = r.checks.find((x) => x.id === 'C4');
    assert.strictEqual(c4.status, blocked ? 'blocked' : 'pass', row);
    if (blocked) assert.match(c4.detail, /Q-2/);
  }
});

test('GT-04 flow-state legality is enforced', () => {
  for (const [flow, offender] of [
    [FLOW('c').replace('tier: medium', 'tier: <trivial | medium | large>'), /tier/],
    [FLOW('c').replace('current-step: STEP5', 'current-step: STEP9'), /current-step/],
    [FLOW('c').replace('tier: medium', 'tier: huge'), /tier/],
    [FLOW('wrong-name'), /change/],
    [FLOW('c').replace('lineage: v3\n', ''), /lineage/],
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
    // a DANGLING review/ symlink is a defect, not absence — C4 and C5 both block, in-flight…
    const dang = healthy();
    fs.rmSync(path.join(dang, 'apriori/changes/c/review'), { recursive: true });
    fs.symlinkSync(path.join(dang, 'no-such-target'), path.join(dang, 'apriori/changes/c/review'));
    r = gate.runGate({ cwd: dang, change: 'c', testCmd: TAP_OK });
    for (const id of ['C4', 'C5']) {
      const c = r.checks.find((x) => x.id === id);
      assert.strictEqual(c.status, 'blocked', `${id}: ${c.detail}`);
      assert.match(c.detail, /symlink/);
    }
    // …and archived
    const darch = mkProject({
      'apriori/specs/kv/spec.md': STORE + '\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n',
      'apriori/changes/archive/2026-07-10T1200-c/flow-state.md': FLOW('c'),
      'apriori/changes/archive/2026-07-10T1200-c/tasks.md': '- [x] T1\n',
      'apriori/changes/archive/2026-07-10T1200-c/specs/kv/spec.md': DELTA,
    });
    fs.symlinkSync(path.join(darch, 'no-such-target'), path.join(darch, 'apriori/changes/archive/2026-07-10T1200-c/review'));
    r = gate.runGate({ cwd: darch, change: 'c', testCmd: TAP_OK });
    for (const id of ['C4', 'C5']) {
      const c = r.checks.find((x) => x.id === id);
      assert.strictEqual(c.status, 'blocked', `${id}: ${c.detail}`);
      assert.match(c.detail, /symlink/);
    }
  }
});

test('GT-06 the binding gate is stage-aware (in-flight projected; archived plain)', () => {
  // in-flight: XB-01 exists only in the delta — passing C1 proves the projection ran
  const inflight = healthy();
  const r1 = gate.runGate({ cwd: inflight, change: 'c', testCmd: TAP_OK });
  assert.strictEqual(r1.checks.find((x) => x.id === 'C1').status, 'pass');
  // gaps → blocked with counts
  const r1b = gate.runGate({ cwd: inflight, change: 'c', testCmd: tapCmd('ok 1 - XA-01 a') });
  const c1b = r1b.checks.find((x) => x.id === 'C1');
  assert.strictEqual(c1b.status, 'blocked');
  assert.match(c1b.detail, /unbound/);
  // archived: change only under archive/, store already merged, plain verify runs
  const arch = mkProject({
    'apriori/specs/kv/spec.md': STORE + '\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n',
    'apriori/changes/archive/2026-07-10T1200-c/flow-state.md': FLOW('c'),
    'apriori/changes/archive/2026-07-10T1200-c/tasks.md': '- [x] T1\n',
    'apriori/changes/archive/2026-07-10T1200-c/specs/kv/spec.md': DELTA,
    'apriori/changes/archive/2026-07-10T1200-c/review/issues.md': LEDGER_OK,
  });
  const r2 = gate.runGate({ cwd: arch, change: 'c', testCmd: TAP_OK });
  assert.strictEqual(r2.stage, 'archived');
  assert.strictEqual(r2.code, 0, JSON.stringify(r2.checks));
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
    'apriori/changes/archive/2026-07-10T1200-c/tasks.md': '- [ ] stale unchecked\n',
    'apriori/changes/archive/2026-07-10T1200-c/specs/kv/spec.md': DELTA,
    'apriori/changes/archive/2026-07-10T1400-c/flow-state.md': FLOW('c'),
    'apriori/changes/archive/2026-07-10T1400-c/tasks.md': '- [x] fresh checked\n',
    'apriori/changes/archive/2026-07-10T1400-c/specs/kv/spec.md': DELTA,
    'apriori/changes/archive/2026-07-10T1400-c/review/issues.md': LEDGER_OK,
  });
  const r = gate.runGate({ cwd: arch, change: 'c', testCmd: TAP_OK });
  assert.strictEqual(r.checks.find((x) => x.id === 'C2').status, 'pass');   // newer dir used
  // a stray FILE with a stamp-shaped name is ignored, older real dir still wins deterministically
  fs.writeFileSync(path.join(arch, 'apriori/changes/archive/2026-07-10T1600-c'), 'not a dir');
  const r2 = gate.runGate({ cwd: arch, change: 'c', testCmd: TAP_OK });
  assert.strictEqual(r2.stage, 'archived');
  assert.strictEqual(r2.checks.find((x) => x.id === 'C2').status, 'pass'); // still the 1400 dir, not the file
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

test('GT-09 trivial tier is not asked for artifacts it never produces', () => {
  const root = mkProject({
    'apriori/specs/kv/spec.md': STORE,
    'apriori/changes/c/flow-state.md': FLOW('c', 'trivial'),
    'apriori/changes/c/specs/kv/spec.md': DELTA,
  });
  const r = gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK });
  assert.strictEqual(r.checks.find((x) => x.id === 'C2').status, 'n/a');
  assert.strictEqual(r.checks.find((x) => x.id === 'C4').status, 'n/a');
  assert.strictEqual(r.code, 0, JSON.stringify(r.checks));
  // medium: same absences block
  const root2 = mkProject({
    'apriori/specs/kv/spec.md': STORE,
    'apriori/changes/c/flow-state.md': FLOW('c'),
    'apriori/changes/c/specs/kv/spec.md': DELTA,
  });
  const r2 = gate.runGate({ cwd: root2, change: 'c', testCmd: TAP_OK });
  assert.strictEqual(r2.checks.find((x) => x.id === 'C2').status, 'blocked');
  assert.strictEqual(r2.checks.find((x) => x.id === 'C4').status, 'blocked');
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
  // BLOCKED class
  fs.appendFileSync(path.join(root, 'apriori/changes/c/tasks.md'), '- [ ] nope\n');
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

// ---- ledger-states (GT-13..15): C4 speaks the terminal-state vocabulary ----

const LEDGER_HDR = '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n';
const ledgerWith = (...rows) => LEDGER_HDR + rows.map((r) => `| ${r[0]} | i | low | 1 | ${r[1]} |\n`).join('');
// FLOW plus an extra gates: entry line (the human waive record)
const FLOW_G = (name, extra) => FLOW(name) + (extra ? `  - ${extra}\n` : '');

function archProject(ledger, flowExtra) {
  return mkProject({
    'apriori/specs/kv/spec.md': STORE + '\n### Requirement: Beta\n\n#### Scenario: XB-01 new\n- t\n',
    'apriori/changes/archive/2026-07-10T1200-c/flow-state.md': FLOW_G('c', flowExtra),
    'apriori/changes/archive/2026-07-10T1200-c/tasks.md': '- [x] T1\n',
    'apriori/changes/archive/2026-07-10T1200-c/specs/kv/spec.md': DELTA,
    'apriori/changes/archive/2026-07-10T1200-c/review/issues.md': ledger,
  });
}
const c4Of = (root) => gate.runGate({ cwd: root, change: 'c', testCmd: TAP_OK }).checks.find((x) => x.id === 'C4');

test('GT-13 archived ledgers must be terminal', () => {
  // fixed at archived stage → blocked with the reviewer-verify cure
  const f = c4Of(archProject(ledgerWith(['Q-1', 'fixed (v2)'])));
  assert.strictEqual(f.status, 'blocked');
  assert.match(f.detail, /reviewer must verify|never verified/);
  // plain reasoned rejected → blocked with the concurrence cure
  const r = c4Of(archProject(ledgerWith(['Q-1', 'rejected — cosmetic, out of scope'])));
  assert.strictEqual(r.status, 'blocked');
  assert.match(r.detail, /rejected-verified|reviewer concurrence/);
  // unknown status → blocked naming the vocabulary
  const u = c4Of(archProject(ledgerWith(['Q-1', 'done'])));
  assert.strictEqual(u.status, 'blocked');
  assert.match(u.detail, /vocabulary/);
  // all-terminal → pass (waived backed by a gates: entry naming the ID)
  const ok = c4Of(archProject(
    ledgerWith(['Q-1', 'verified'],
               ['Q-2', 'rejected-verified — cosmetic; reviewer concurred (review-v2)'],
               ['Q-3', 'waived — owner accepts the perf risk'],
               ['Q-4', 'advisory-acked']),
    '2026-07-12T01:00 gate: owner waived Q-3 (perf risk accepted for this release)'));
  assert.strictEqual(ok.status, 'pass', ok.detail);
});

test('GT-14 waives belong to humans, unknown states belong to nobody', () => {
  // in-flight: waived without any gates: evidence → blocked
  const root1 = healthy();
  fs.writeFileSync(path.join(root1, 'apriori/changes/c/review/issues.md'), ledgerWith(['Q-1', 'waived — accepted']));
  const w1 = c4Of(root1);
  assert.strictEqual(w1.status, 'blocked');
  assert.match(w1.detail, /gates: entry/);
  // same row passes once the human decision is recorded in gates:
  const root2 = healthy();
  fs.writeFileSync(path.join(root2, 'apriori/changes/c/review/issues.md'), ledgerWith(['Q-1', 'waived — accepted']));
  fs.appendFileSync(path.join(root2, 'apriori/changes/c/flow-state.md'),
    '  - 2026-07-12T01:00 owner waived Q-1: risk accepted\n');
  assert.strictEqual(c4Of(root2).status, 'pass');
  // exact ID token: an entry waiving Q-10 never satisfies row Q-1
  const root3 = healthy();
  fs.writeFileSync(path.join(root3, 'apriori/changes/c/review/issues.md'), ledgerWith(['Q-1', 'waived — accepted']));
  fs.appendFileSync(path.join(root3, 'apriori/changes/c/flow-state.md'),
    '  - 2026-07-12T01:00 owner waived Q-10: a different row\n');
  assert.strictEqual(c4Of(root3).status, 'blocked');
  // ID in one entry + 'waived' in another entry never passes (same-entry rule)
  const root4 = healthy();
  fs.writeFileSync(path.join(root4, 'apriori/changes/c/review/issues.md'), ledgerWith(['Q-1', 'waived — accepted']));
  fs.appendFileSync(path.join(root4, 'apriori/changes/c/flow-state.md'),
    '  - 2026-07-12T01:00 note: Q-1 discussed\n  - 2026-07-12T01:01 something else waived here\n');
  assert.strictEqual(c4Of(root4).status, 'blocked');
  // unknown status blocks IN-FLIGHT too; reasonless terminals block
  const root5 = healthy();
  fs.writeFileSync(path.join(root5, 'apriori/changes/c/review/issues.md'), ledgerWith(['Q-1', 'verifed']));
  assert.strictEqual(c4Of(root5).status, 'blocked');
  const root6 = healthy();
  fs.writeFileSync(path.join(root6, 'apriori/changes/c/review/issues.md'), ledgerWith(['Q-1', 'rejected-verified']));
  assert.strictEqual(c4Of(root6).status, 'blocked');
  // in-flight fixed and reasoned rejected still pass (the loop is running)
  const root7 = healthy();
  fs.writeFileSync(path.join(root7, 'apriori/changes/c/review/issues.md'),
    ledgerWith(['Q-1', 'fixed (v2)'], ['Q-2', 'rejected — cosmetic, out of scope']));
  assert.strictEqual(c4Of(root7).status, 'pass');
});

test('GT-15 every archived ledger in this repo parses legal and terminal', () => {
  const archRoot = path.join(__dirname, '..', 'apriori', 'changes', 'archive');
  if (!fs.existsSync(archRoot)) return;                     // corpus is local-only
  const { classifyStatus } = gate;
  assert.strictEqual(typeof classifyStatus, 'function');
  for (const d of fs.readdirSync(archRoot)) {
    const name = d.replace(/^\d{4}-\d{2}-\d{2}T\d{4}-/, '');
    const lp = path.join(archRoot, d, 'review', 'issues.md');
    if (!fs.existsSync(lp)) continue;
    const { parseLedger } = require('../lib/status');
    for (const row of parseLedger(fs.readFileSync(lp, 'utf8'))) {
      const c = classifyStatus(row.status);
      assert.ok(c.legal, `${name} ${row.id}: illegal status '${row.status}'`);
      assert.ok(c.terminal, `${name} ${row.id}: non-terminal archived status '${row.status}'`);
      if (c.needsReason) assert.ok(c.hasReason, `${name} ${row.id}: reasonless '${row.status}'`);
    }
  }
});

// ---- cas-enforcement (GT-16): C7 denies unstamped mutation deltas unless visibly waived ----

const MOD_DELTA = '## MODIFIED Requirements\n\n### Requirement: Alpha\n\n#### Scenario: XA-01 base\n- tightened\n';
function modProject(extraFiles = {}) {
  return mkProject({
    'apriori/specs/kv/spec.md': STORE,
    'apriori/changes/c/flow-state.md': FLOW('c'),
    'apriori/changes/c/tasks.md': '- [x] T1 done\n',
    'apriori/changes/c/specs/kv/spec.md': MOD_DELTA,
    'apriori/changes/c/review/issues.md': LEDGER_OK,
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
    'apriori/changes/archive/2026-07-10T1200-c/tasks.md': '- [x] T1\n',
    'apriori/changes/archive/2026-07-10T1200-c/specs/kv/spec.md': DELTA,
    'apriori/changes/archive/2026-07-10T1200-c/review/issues.md': LEDGER_OK,
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
