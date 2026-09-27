<!-- provenance: provider=codex model=gpt-6-astra session=01a0e250-702e-7302-89cc-b47b6c252edb date=2026-09-27 -->
# code-review — limit-ruling (round 5)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript.

Review destination: `apriori/changes/limit-ruling/review/code-review-v5.md`. Read-only session: producer to land this body verbatim under RUNBOOK R2.

- LR-06: ADDRESSED — Both the established-cycle assignment and the shared floor predicate exclude escalated families from the ruling-path exemption. A `tests` reframe therefore retains the non-forceable unresolved-review blocker; the existing explicit `accept-risk` exception remains separate. GT-71 asserts the floor before and after a limit raise, the non-forceable readiness blocker with force enabled, and archive refusal.

No newly found substantive issues within this round’s scope. Earlier findings remain addressed.

Examined: both requested diffs, current and established ruling paths, floor classification, owner acknowledgment versus risk acceptance, gate/archive-readiness consumers, and GT-71’s assertions. The gate now reports no progress-record finding; its remaining C8 blockers are the preceding REVISE and the missing round-5 summary.

Not examined dynamically: tests, archive writes, or live producer/reviewer behavior. The reported 872-test result was not independently reproduced. No raw transcripts or sensitive files were read.

Advisories: none.

VERDICT: no spec-vs-code gaps
