<!-- provenance: provider=codex model=gpt-6-astra session=01a0e250-702e-7302-89cc-b47b6c252edb date=2026-09-27 -->
# code-review — limit-ruling (round 2)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript.

Review destination: `apriori/changes/limit-ruling/review/code-review-v2.md`. Read-only session: producer to land this body verbatim under RUNBOOK R2.

- LR-01: ADDRESSED — The original raised-limit counterexample now reaches `rulingPath`; GT-67 asserts that rejected/follow-up IDs still require pending items after the raise. The extended checking introduces LR-04 below.
- LR-02: ADDRESSED — An arbitrary parsed ruling no longer unconditionally exempts the next round. GT-68 checks both the illegal kind and the missing progress record.
- LR-03: ADDRESSED — AM-136 now invokes `--write` and asserts the completed move, merged store, declaration, and absence of forcing.

Two substantive issues remain:

- **LR-04 — P2: A later owner-released review cannot close historical residuals after a limit raise.** The established-cycle loop at [lib/review.js:750](/root/terra/wt-d/lib/review.js:750) repeatedly calls `rulingPath`, which consults only the original re-review and current Open items. Consider rulings at round 3, round 4 marking R-01 NOT ADDRESSED, and R-01 correctly registered pending. The owner raises the limit to 6 and authorizes the fix; round 5 explicitly marks R-01 ADDRESSED and accepts. Removing the now-resolved Open item still produces the historical round-4 “no ADDRESSED line and is not a pending” blocker at [line 663](/root/terra/wt-d/lib/review.js:663). Keeping it instead leaves C9/R5 blocked. S4 expressly permits closure through an owner-released later review; the implementation effectively requires evidence acceptance despite that review. GT-67 retains its pending items throughout, so it does not exercise this exit. **Suggested fix:** distinguish enduring evidence-integrity checks from residual obligations that a valid, owner-released later review can discharge; preserve the historical verdict.

- **LR-05 — P1: The current ruling cycle escapes historical validation at R+2.** The new established-cycle scan skips `a === R` at [lib/review.js:747](/root/terra/wt-d/lib/review.js:747), but the separate current-cycle branch calls `rulingPath` only through R+1. With limit 3, record conflicting `fixed` and `rejected` rulings for R-01 at round 3, then land rounds 4 and 5 as ACCEPT, with valid progress records and an owner `reframe` for round 4. At round 5, the scan skips the round-3 cycle; the R+2 branch checks only release and latest verdict. The conflicting rulings disappear from C8/R4 findings, and the ACCEPT clears the floor. Assuming other readiness conditions pass, archive can proceed despite a non-forceable ruling-integrity defect. **Suggested fix:** validate the current established cycle beyond R+1 as well; avoid duplicate checking without skipping it entirely. A release authorizes further review, not waiver of malformed or conflicting ruling evidence.

Examined: both requested diffs, the changed cycle/exemption logic, per-ID checks, owner-release branches, gate and archive-readiness consumers, GT-65–68, AM-136, and the changed EN/CN rule sentences. The wording remains aligned between editions, but the two implementation paths above do not satisfy it.

The current Open section is empty. The requested gate reports the prior REVISE and the missing round-2 summary, expected before this review lands. I did not rerun tests, execute an archive, inspect raw transcripts, or revisit unrelated surfaces. Findings are based on static control-flow inspection; the reported 869-test run was not independently reproduced.

Advisories: none. These are implementation defects, not grounds to escalate the approach or split the change.

VERDICT: 2 issues open
