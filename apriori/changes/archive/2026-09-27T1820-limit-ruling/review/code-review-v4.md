<!-- provenance: provider=codex model=gpt-6-astra session=01a0e250-702e-7302-89cc-b47b6c252edb date=2026-09-27 -->
# code-review — limit-ruling (round 4)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript.

Review destination: `apriori/changes/limit-ruling/review/code-review-v4.md`. Read-only session: producer to land this body verbatim under RUNBOOK R2.

- LR-05: ADDRESSED — The limit-derived current cycle now reaches `rulingPath` independently of record presence and later releases. GT-70 covers conflicting, absent, and wholly unreadable rulings, including their non-forceable archive-readiness blockers.

One substantive issue remains:

- **LR-06 — P1: An escalated established cycle can bypass the unresolved-review floor after a limit raise.** The current-cycle assignment correctly excludes an `escalate` verdict at [lib/review.js:785](/root/terra/wt-d/lib/review.js:785), but the established-cycle assignment at [line 774](/root/terra/wt-d/lib/review.js:774) has no equivalent guard. It assigns `ruling` even when `rulingPath` returns the new `escalated` state.

  Counterexample: limit 3; round 3 REVISE with complete valid rulings; round 4 ESCALATE; owner records `reframe spec-review round 4 tests — add coverage` and raises the limit to 6. Supply valid progress records for rounds 3 and 4, complete review evidence, and no Open items. There is no later accepting review and no `accept-risk`.

  The current `R` becomes null. The established scan returns `state: escalated` without problems and assigns `f.ruling`. The owner reframe acknowledges the escalation, while `!f.ruling` at [line 829](/root/terra/wt-d/lib/review.js:829) removes the family from the unresolved floor. Consequently C8 can pass. Archive readiness sees only an acknowledged, forceable escalation, so `--force` can archive despite the latest verdict remaining ESCALATE and the owner having requested tests rather than accepted risk.

  **Risk:** the change weakens the established distinction between permission to continue and permission to deliver an unresolved review, contrary to S2.

  **Suggested fix:** keep escalated families in the unresolved floor on both current and established paths unless the existing explicit `accept-risk` exception applies. Cover the raised-limit case through C8 and readiness: `tests`/`redo`/`split` must retain the non-forceable floor.

Examined: both requested diffs, current-cycle validation, the new escalated return, established-cycle assignment, floor and release predicates, shared archive-readiness handling, and GT-70. No additional substantive finding was established.

The requested gate reports the preceding REVISE, missing round-4 summary, and a missing round-3 progress record. The latter is a bundle-record issue, not a new product finding.

Tests and archive execution were not rerun; the reported 871-test result was not independently reproduced. No raw transcripts or unrelated sensitive files were read.

Advisories: none. No approach escalation or split is warranted.

VERDICT: 1 issues open
