'use strict';
// The process files a bundle needs before `apriori archive` will merge it
// (change archive-readiness, R1/R2/R3, plus R4's one independent review). Fixtures that only
// ever exercised the merge engine predate these preconditions; this helper adds them WITHOUT
// touching a single assertion — see tasks.md B1.
//
// Spread it FIRST in a fixture map so a test that deliberately wants a broken bundle
// can still override any of them.

const FLOW = (name, mode = 'standard') =>
  `change: ${name}\nmode: ${mode}\n` +
  `lineage: fixture\ncurrent-step: STEP6\nnext-action: archive\n` +
  `gates:\n  - 2026-07-11T00:00 note: fixture\n`;

const TASKS = '- [x] T1 done\n';
const LEDGER = '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n| Q-1 | i | low | 1 | verified |\n';
// One complete, attributable review round — a classifiable verdict plus the raw transcript
// that attributes it. `fast` waives tasks and the ledger; it never waives this (R4).
const REVIEW = '# step5 review, round 1\n\nVERDICT: no major issues\n';
const REVIEW_RAW = '<!-- provenance: provider=fixture model=fixture session=fixture date=2026-01-01 -->\nraw\n';

// readyFiles('c') → { …flow-state.md, …tasks.md, …review/issues.md, …review/step5-review-v1{,-raw} }
function readyFiles(name, opts = {}) {
  const base = opts.base || `apriori/changes/${name}`;
  return {
    [`${base}/flow-state.md`]: FLOW(name, opts.mode),
    [`${base}/tasks.md`]: TASKS,
    [`${base}/review/issues.md`]: LEDGER,
    [`${base}/review/step5-review-v1.md`]: REVIEW,
    [`${base}/review/step5-review-v1-raw.txt`]: REVIEW_RAW,
  };
}

module.exports = { readyFiles, FLOW, TASKS, LEDGER, REVIEW, REVIEW_RAW };
