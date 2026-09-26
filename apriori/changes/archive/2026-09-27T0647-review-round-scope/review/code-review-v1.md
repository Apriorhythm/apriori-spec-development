<!-- provenance: provider=codex model=gpt-6-astra session=01a0dfe3-2459-7460-84f4-cd9b22cd48e2 date=2026-09-27 -->
# code-review — review-round-scope (round 1)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript.

Independent review of `review-round-scope`, round 1. Intended landing: `apriori/changes/review-round-scope/review/code-review-v1.md`. Returned for verbatim producer transcription because this session is read-only.

Two substantive issues:

1. **RRS-01 — The fresh-Claude path has no defined later-round handoff.** [R2](/root/terra/wt-c/RUNBOOK.md:110) attaches the new scope instruction exclusively to `codex exec resume`; its alternative remains a fresh Claude session receiving P3’s four default inputs. The [new bullet](/root/terra/wt-c/RUNBOOK.md:314) likewise requires a “resume message.” Thus a producer following the non-Codex path has no instruction for delivering the round-2 scope or making every previous unresolved finding available for ADDRESSED / NOT ADDRESSED judgment. Supplying the previous review to compensate would conflict with the adjacent input boundary. This also affects fallback after failed transport recovery. Both language editions share the gap.

   **Risk:** the requested later-round behavior applies reliably only to resumed Codex sessions; fresh reviewers can restart unrestricted review or receive prohibited repackaged conclusions.

   **Suggested fix:** add an explicit fresh-session handoff rule outside P3, explaining how later-round instructions and independently established current evidence satisfy the requirement while preserving the four-input boundary. Cover ordinary non-Codex invocation and recovery fallback.

2. **RRS-02 — PR-59 asserts less than its placement acceptance condition.** [The test](/root/terra/wt-c/test/review-round-scope.test.js:25) checks EN ordering, but never checks CN placement. Its CN checks search the entire document. Moving the complete CN bullet outside §4 would therefore satisfy these assertions despite violating PR-59. EN ordering also does not establish the required immediate adjacency.

   **Risk:** GREEN scenario binding does not establish the explicitly required placement in both editions.

   **Suggested fix:** locate each edition’s Review & Deliver section and assert that the scope bullet immediately follows its independent-review bullet and precedes disposition.

Examined: committed diff and uncommitted flow-state edits; delta contract; relevant store requirements; R2, R4, adjacent review/disposition rules and P3 in both editions; PR-59/60 and RIB-10 assertions; runbook distribution through init/update.

P3 is unchanged, and PR-60 uses the existing RIB-10 frozen hashes. No existing runbook paragraph was deleted. I found no separate change to owner authorization, archive release, verdict vocabulary or R4 counting. Read with the necessary-fix rule, the advisory sentence does not waive existing delivery obligations. ADDED is defensible for this distinct new duty; changing it to MODIFIED alone would resolve neither finding.

Not examined: raw review transcripts, credentials, human-note files, or the optional fixture report. I did not rerun tests or builds. The requested gate reports C8 blocked pending this review’s completed evidence; that is not a product finding.

Advisories: none.

VERDICT: 2 issues open
