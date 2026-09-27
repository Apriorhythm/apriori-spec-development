<!-- provenance: provider=codex model=gpt-6-astra session=01a0e250-702e-7302-89cc-b47b6c252edb date=2026-09-27 -->
# code-review — limit-ruling (round 3)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript.

Review destination: `apriori/changes/limit-ruling/review/code-review-v3.md`. Read-only session: producer to land this body verbatim under RUNBOOK R2.

- LR-04: ADDRESSED — Later exact per-ID answers can now discharge residuals without rewriting the re-review. GT-69 covers both premature removal and successful later resolution, while preserving the owner-ruling boundary.
- LR-05: NOT ADDRESSED — GT-70 closes the conflicting-rulings counterexample, but missing or wholly unreadable rulings still escape validation past R+1.

**LR-05 — P1, remaining case: the historical check depends on the evidence whose absence it must reject.** At [lib/review.js:760](/root/terra/wt-d/lib/review.js:760), historical validation iterates `rulingRecs.values()` and skips records with no parsed rulings. Meanwhile, the separate current-cycle branch still calls `rulingPath` only through R+1.

A concrete counterexample is:

1. Limit 3; rounds 1–3 REVISE, with R-01 opening round 3’s summary.
2. No ruling notes at all.
3. Rounds 4 and 5 ACCEPT, with complete review evidence.
4. The owner records `reframe spec-review round 4 tests — one more look`; ordinary progress records for rounds 3 and 5 are valid.

At round 5, `R` remains 3, but the historical scan has no record to visit. The R+2 branch sees the release and ACCEPT, while round 4 is automatically exempt from progress checking. No ruling-coverage check runs; C8 can pass, and archive readiness receives no corresponding non-forceable R4 blocker. A ruling record containing only unreadable bodies follows the same bypass through `!rec.rulings.length`.

This still violates the requirement that missing rulings remain non-forceable evidence failures. The owner released another review, not the obligation to record rulings.

**Suggested fix:** derive the current required cycle from review history independently of ruling-record presence, and validate it beyond R+1 even when its record is absent or wholly unreadable. Preserve the existing exception for an owner reframe answering R itself. Extend GT-70 to cover these missing-evidence cases.

Examined: both requested diffs, later-answer selection, historical/current-cycle dispatch, progress exemptions, release handling, shared gate/readiness consumers, GT-69/70, and the changed EN/CN clauses. No additional substantive issue was established.

The Open section remains empty. Gate reports the preceding REVISE and missing round-3 summary, expected before this review lands. I did not rerun tests, execute an archive, read raw transcripts, or inspect unrelated surfaces. The reported 871-test result was not independently reproduced.

Advisories: none. This remains an implementation defect; no approach escalation or split is warranted.

VERDICT: 1 issues open
