'use strict';
// The process files a bundle needs before `apriori archive` will merge it
// (change archive-readiness, R1, plus R4's one independent review). Fixtures that only
// ever exercised the merge engine predate these preconditions; this helper adds them WITHOUT
// touching a single assertion.
//
// Spread it FIRST in a fixture map so a test that deliberately wants a broken bundle
// can still override any of them.

// The `## Open` section is where a change's unresolved items live (6.2 unified risk acceptance
// on it: `- <ID>: <text>`, accepted by the owner's `evidence-accept <ID>`). A ready fixture
// carries the section EMPTY — nothing owed — so C9/R5 pass on their own subject; a test that
// wants an item in it uses `withOpen`. It sits BEFORE `gates:` because fixtures append their
// own gates entries. No `mode:` line: the field is optional and inert since 6.2.
const OPEN = '\n## Open\n\n';

// Replace the fixture's (empty) Open section with a test's own items (`- ` is added here).
const withOpen = (flow, items) =>
  flow.replace(OPEN, `\n## Open\n${items.map((i) => `- ${i}`).join('\n')}\n\n`);

const FLOW = (name) =>
  `change: ${name}\n` +
  `lineage: fixture\nphase: review\n` + OPEN +
  `gates:\n  - 2026-07-11T00:00 note: fixture\n`;

// One complete, attributable review round — a classifiable verdict plus the raw transcript
// that attributes it. Nothing ever waives this (R4).
const REVIEW = '# code review, round 1\n\nVERDICT: no major issues\n';
const REVIEW_RAW = '<!-- provenance: provider=fixture model=fixture session=fixture date=2026-01-01 -->\nraw\n';

// readyFiles('c') → { …flow-state.md, …review/code-review-v1{,-raw} }
// 6.2 reads neither tasks.md nor review/issues.md, so the helper writes neither.
function readyFiles(name, opts = {}) {
  const base = opts.base || `apriori/changes/${name}`;
  return {
    [`${base}/flow-state.md`]: FLOW(name),
    [`${base}/review/code-review-v1.md`]: REVIEW,
    [`${base}/review/code-review-v1-raw.txt`]: REVIEW_RAW,
  };
}

module.exports = { readyFiles, FLOW, OPEN, withOpen, REVIEW, REVIEW_RAW };
