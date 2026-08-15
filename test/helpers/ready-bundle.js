'use strict';
// The three process files a bundle needs before `apriori archive` will merge it
// (change archive-readiness, R1/R2/R3). Fixtures that only ever exercised the merge
// engine predate this precondition; this helper adds it WITHOUT touching a single
// assertion — see tasks.md B1.
//
// Spread it FIRST in a fixture map so a test that deliberately wants a broken bundle
// can still override any of the three.

const FLOW = (name, tier = 'medium') =>
  `change: ${name}\ntier: ${tier}\ntrack: harden\ntrack-rationale: fixture\n` +
  `lineage: fixture\ncurrent-step: STEP6\nround: 1\nnext-action: archive\n` +
  `gates:\n  - 2026-07-11T00:00 note: fixture\n`;

const TASKS = '- [x] T1 done\n';
const LEDGER = '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n| Q-1 | i | low | 1 | verified |\n';

// readyFiles('c') → { 'apriori/changes/c/flow-state.md': …, …tasks.md, …review/issues.md }
function readyFiles(name, opts = {}) {
  const base = opts.base || `apriori/changes/${name}`;
  return {
    [`${base}/flow-state.md`]: FLOW(name, opts.tier),
    [`${base}/tasks.md`]: TASKS,
    [`${base}/review/issues.md`]: LEDGER,
  };
}

module.exports = { readyFiles, FLOW, TASKS, LEDGER };
