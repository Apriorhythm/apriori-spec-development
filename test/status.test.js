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
    if (ledger) fs.writeFileSync(path.join(root, 'apriori', 'review', `${name}-issues.md`), ledger);
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
  assert.match(out, /open ledger:  2 — D-1, D-3/);
});

test('ST-02 no args lists active changes, excluding archive/', () => {
  const root = project({ demo: { flow: FLOW, ledger: LEDGER }, other: { flow: 'change: other\ncurrent-step: STEP0\n' } });
  fs.mkdirSync(path.join(root, 'apriori', 'changes', 'archive', '2026-07-01-old'), { recursive: true });
  const active = status.activeChanges(root);
  assert.deepStrictEqual(active, ['demo', 'other']);   // archive/ excluded
});

test('ST-03 open detection ignores fixed/verified/advisory-acked', () => {
  const rows = status.parseLedger(LEDGER);
  const open = rows.filter((r) => /^open\b/i.test(r.status));
  assert.strictEqual(open.length, 2);
  assert.ok(!open.some((r) => r.status.includes('advisory')));
});
