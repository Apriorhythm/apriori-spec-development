'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const status = require('../lib/status');

function project(changes) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-st-'));
  for (const [name, { flow, ledger }] of Object.entries(changes)) {
    fs.mkdirSync(path.join(root, 'apriori', 'changes', name), { recursive: true });
    if (flow) fs.writeFileSync(path.join(root, 'apriori', 'changes', name, 'flow-state.md'), flow);
    fs.mkdirSync(path.join(root, 'apriori', 'review'), { recursive: true });
    if (ledger) { fs.mkdirSync(path.join(root, 'apriori', 'changes', name, 'review'), { recursive: true }); fs.writeFileSync(path.join(root, 'apriori', 'changes', name, 'review', 'issues.md'), ledger); }
  }
  return root;
}

const FLOW = `change: demo
tier: medium
track: harden
current-step: STEP2
next-action: spawn P5 reviewer   # 2026-07-07
gates:
  - 2026-07-07T02:00 gate③: approved
`;
const LEDGER = `| ID | Issue | Risk | Round | Status |
|---|---|---|---|---|
| D-1 | x | med | 1 | open |
| D-2 | y | low | 1 | fixed |
| D-3 | z | med | 2 | open |
| D-4 | w | low | 2 | advisory-acked |
`;

test('ST-01 --change reports step, next-action, and open-ledger count/IDs', () => {
  const root = project({ demo: { flow: FLOW, ledger: LEDGER } });
  const s = status.changeStatus(root, 'demo');
  assert.strictEqual(s.state['current-step'], 'STEP2');
  assert.match(s.state['next-action'], /spawn P5 reviewer/);
  assert.deepStrictEqual(s.open.map((r) => r.id), ['D-1', 'D-3']);
  const out = status.formatOne(s);
  assert.match(out, /step:.*STEP2/);
  assert.match(out, /next-action:.*spawn P5 reviewer/);
  assert.match(out, /last gate:.*gate③: approved/);          // last gate surfaced
  assert.match(out, /open ledger:  2 — D-1, D-3/);
});

test('ST-02 no args lists active changes (with step + open count), excluding archive/', () => {
  const root = project({ demo: { flow: FLOW, ledger: LEDGER }, other: { flow: 'change: other\ncurrent-step: STEP0\n' } });
  fs.mkdirSync(path.join(root, 'apriori', 'changes', 'archive', '2026-07-01-old'), { recursive: true });
  assert.deepStrictEqual(status.activeChanges(root), ['demo', 'other']);   // archive/ excluded
  // the no-args CLI output lists each change with its step and open count
  const cwd = process.cwd(), log = console.log, out = [];
  console.log = (...a) => out.push(a.join(' '));
  try { process.chdir(root); assert.strictEqual(status.cli([]), 0); }
  finally { console.log = log; process.chdir(cwd); }
  const printed = out.join('\n');
  assert.match(printed, /demo  —  STEP2, 2 open/);
  assert.match(printed, /other  —  STEP0, 0 open/);
  assert.doesNotMatch(printed, /2026-07-01-old/);            // archive not listed
});

test('ST-03 open detection ignores fixed/verified/advisory-acked', () => {
  const rows = status.parseLedger(LEDGER);
  const open = rows.filter((r) => /^open\b/i.test(r.status));
  assert.strictEqual(open.length, 2);
  assert.ok(!open.some((r) => r.status.includes('advisory')));
});

test('ST-04 --json emits a machine-consumable report (single + list), pure JSON', () => {
  const root = project({ demo: { flow: FLOW, ledger: LEDGER } });
  const cwd = process.cwd(), log = console.log, out = [];
  console.log = (...a) => out.push(a.join(' '));
  try {
    process.chdir(root);
    assert.strictEqual(status.cli(['--change', 'demo', '--json']), 0);
    const single = JSON.parse(out.join('\n'));            // parses = pure JSON, no prose
    assert.strictEqual(single.change, 'demo');
    assert.strictEqual(single.step, 'STEP2');
    assert.strictEqual(single.tier, 'medium');
    assert.strictEqual(single.track, 'harden');
    assert.strictEqual(single.hasFlowState, true);
    assert.match(single.nextAction, /spawn P5 reviewer/);
    assert.match(single.lastGate, /gate③: approved/);
    assert.deepStrictEqual(single.openLedger, ['D-1', 'D-3']);
    out.length = 0;
    assert.strictEqual(status.cli(['--json']), 0);         // list mode
    const list = JSON.parse(out.join('\n'));
    assert.strictEqual(list.changes.length, 1);
    assert.strictEqual(list.changes[0].change, 'demo');
  } finally { console.log = log; process.chdir(cwd); }
});

// ---- cas-mandatory (ST-05..08): archived resolution + path protection ----
const BIN = path.join(__dirname, '..', 'bin', 'apriori.js');
const { spawnSync } = require('node:child_process');
function runStatus(args, cwd) { return spawnSync('node', [BIN, 'status', ...args], { encoding: 'utf8', cwd }); }

function archivedProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-st-'));
  const dir = path.join(root, 'apriori', 'changes', 'archive', '2026-07-10T1200-demo');
  fs.mkdirSync(path.join(dir, 'review'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'flow-state.md'), FLOW.replace('STEP2', 'DONE'));
  fs.writeFileSync(path.join(dir, 'review', 'issues.md'), LEDGER.replace(/open/g, 'verified'));
  return root;
}

test('ST-05 an archived change is visible with its stage', () => {
  const root = archivedProject();
  const r = runStatus(['--change', 'demo'], root);
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /archived/);
  assert.match(r.stdout, /DONE/);
  assert.doesNotMatch(r.stdout, /no flow-state file found/);
});

test('ST-06 bad names and missing changes fail closed', () => {
  const root = archivedProject();
  for (const bad of ['Demo', 'a/b', '..', 'no-such-change']) {
    const r = runStatus(['--change', bad], root);
    assert.strictEqual(r.status, 2, `${bad}: ${r.stdout}${r.stderr}`);
    assert.match(r.stderr, /./);
  }
});

test('ST-07 the read surface is containment-guarded', () => {
  // missing flow-state on a resolved change → exit 2
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'apriori-st-'));
  fs.mkdirSync(path.join(root, 'apriori', 'changes', 'demo', 'review'), { recursive: true });
  const r = runStatus(['--change', 'demo'], root);
  assert.strictEqual(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /flow-state/);
  // symlinked flow-state / ledger → exit 2 (platform-guarded)
  let can = true;
  const root2 = project({ demo: { flow: FLOW, ledger: LEDGER } });
  const outside = path.join(root2, 'outside.md');
  fs.writeFileSync(outside, FLOW);
  try {
    fs.rmSync(path.join(root2, 'apriori/changes/demo/flow-state.md'));
    fs.symlinkSync(outside, path.join(root2, 'apriori/changes/demo/flow-state.md'));
  } catch { can = false; }
  if (can) {
    const r2 = runStatus(['--change', 'demo'], root2);
    assert.strictEqual(r2.status, 2, r2.stdout + r2.stderr);
    assert.match(r2.stderr, /flow-state/);
    const root3 = project({ demo: { flow: FLOW, ledger: LEDGER } });
    fs.rmSync(path.join(root3, 'apriori/changes/demo/review/issues.md'));
    fs.symlinkSync(path.join(root3, 'outside2.md'), path.join(root3, 'apriori/changes/demo/review/issues.md'));
    const r3 = runStatus(['--change', 'demo'], root3);
    assert.strictEqual(r3.status, 2, r3.stdout + r3.stderr);
    assert.match(r3.stderr, /issues\.md/);
  }
  // absent ledger still reads as 0 open
  const root4 = project({ demo: { flow: FLOW } });
  fs.rmSync(path.join(root4, 'apriori/changes/demo/review'), { recursive: true, force: true });
  const r4 = runStatus(['--change', 'demo'], root4);
  assert.strictEqual(r4.status, 0, r4.stdout + r4.stderr);
  assert.match(r4.stdout, /open ledger:  0/);
});

test('ST-08 the JSON contract carries stage and path', () => {
  const active = project({ demo: { flow: FLOW, ledger: LEDGER } });
  const a = JSON.parse(runStatus(['--change', 'demo', '--json'], active).stdout);
  assert.strictEqual(a.stage, 'in-flight');
  assert.match(a.path, /apriori[\/\\]changes[\/\\]demo/);
  assert.strictEqual(a.change, 'demo');
  const arch = archivedProject();
  const b = JSON.parse(runStatus(['--change', 'demo', '--json'], arch).stdout);
  assert.strictEqual(b.stage, 'archived');
  assert.match(b.path, /archive[\/\\]2026-07-10T1200-demo/);
});
