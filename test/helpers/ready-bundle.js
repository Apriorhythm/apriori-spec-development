'use strict';
// The process files a bundle needs before `apriori archive` will merge it
// (change archive-readiness, R1/R3, plus R4's one independent review). Fixtures that only
// ever exercised the merge engine predate these preconditions; this helper adds them WITHOUT
// touching a single assertion.
//
// Spread it FIRST in a fixture map so a test that deliberately wants a broken bundle
// can still override any of them.

// The `## Evidence` section is the ONE thing 6.0 added to this list, and it is not paperwork:
// C9/R5 ask whether the change's own state still owes something real, and a bundle that answers
// nothing has not answered. A standard fixture therefore carries the two rows a standard change
// owes — the producer's own diff (hygiene) and one substantive row naming a §6 risk and what was
// run for it. It sits BEFORE `gates:` because fixtures append their own gates entries.
// `contract-mutation` is here because much of this corpus merges MODIFIED/REMOVED/RENAMED
// deltas, and a mutating delta is the one §6 risk the CLI PROVES: the state must answer it by
// name or nothing archives. The predicate itself is covered by its own adversarial tests.
const EVIDENCE = '\n## Evidence\n'
  + '- producer-diff: done — read the whole diff, known P0/P1 zero\n'
  + '- data-schema: done — ran the migration against a copy of the real schema\n'
  + '- contract-mutation: done — re-ran the published scenarios against the new store text\n\n';

// Replace the fixture's evidence with a test's own rows (`[]` removes the section entirely).
// A test that APPENDS a second `## Evidence` gets ignored — the reader takes the first section,
// which is the one this helper already wrote.
const withEvidence = (flow, rows) =>
  flow.replace(EVIDENCE, rows.length ? `\n## Evidence\n${rows.map((r) => `- ${r}`).join('\n')}\n\n` : '\n');

const FLOW = (name, mode = 'standard') =>
  `change: ${name}\nmode: ${mode}\n` +
  `lineage: fixture\nphase: review\n` + EVIDENCE +
  `gates:\n  - 2026-07-11T00:00 note: fixture\n`;

// 6.0 requires NEITHER of these two. They stay in the helper because a large part of the
// archive corpus was written against bundles that carried them, and keeping them proves the
// subtraction is a subtraction: the same bundles still archive, and so do bundles without them.
const TASKS = '- [x] T1 done\n';
const LEDGER = '| ID | Issue | Risk | Round found | Status |\n|---|---|---|---|---|\n| Q-1 | i | low | 1 | verified |\n';
// One complete, attributable review round — a classifiable verdict plus the raw transcript
// that attributes it. Neither mode ever waives this (R4).
const REVIEW = '# code review, round 1\n\nVERDICT: no major issues\n';
const REVIEW_RAW = '<!-- provenance: provider=fixture model=fixture session=fixture date=2026-01-01 -->\nraw\n';

// readyFiles('c') → { …flow-state.md, …review/issues.md, …review/code-review-v1{,-raw} }
function readyFiles(name, opts = {}) {
  const base = opts.base || `apriori/changes/${name}`;
  return {
    [`${base}/flow-state.md`]: FLOW(name, opts.mode),
    [`${base}/review/issues.md`]: LEDGER,
    [`${base}/review/code-review-v1.md`]: REVIEW,
    [`${base}/review/code-review-v1-raw.txt`]: REVIEW_RAW,
  };
}

module.exports = { readyFiles, FLOW, EVIDENCE, withEvidence, TASKS, LEDGER, REVIEW, REVIEW_RAW };
