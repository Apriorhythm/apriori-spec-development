<!-- provenance: provider=codex model=gpt-6-astra session=01a0dba2-cd48-7bb0-841c-29475aea7134 date=2026-09-26 -->
# code-review — protocol-text-consistency (round 1)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript.

Review for `apriori/changes/protocol-text-consistency/review/code-review-v1.md`. Read-only sandbox: the producer must land this body verbatim under RUNBOOK §1 R2, marked “recorded on behalf of the reviewer.”

Two substantive issues remain:

- **PTC-01 — The replacement contracts still contradict LM-01.** [RY-21](/root/terra/asd-v62-code/apriori/changes/protocol-text-consistency/specs/readiness/spec.md:29) says a ledger containing an open row gates green. The [archive requirement and AM-74](/root/terra/asd-v62-code/apriori/changes/protocol-text-consistency/specs/archive-merge/spec.md:7) still say the ledger cannot stop archive and its defective file shapes change nothing. These contradict the corrected RY-17, RUNBOOK §5, `lib/readiness.js`’s migration predicate, and existing LM-01, RY-21 and AM-74 test assertions. **Risk:** archiving these replacement blocks preserves instructions to bypass an established migration refusal; passing tests conceal contradictory scenario expectations. **Fix:** reconcile these retained clauses with the established migration exception, including unreadable-ledger refusal. Preserve LM-01 and non-forceability; record the old text, basis, replacement and affected checks.

- **PTC-02 — PR-13 retains the review input this change explicitly replaces.** [PR-13](/root/terra/asd-v62-code/apriori/changes/protocol-text-consistency/specs/protocol/spec.md:57) still requires “evidence summary” twice. P3, the corrected handbook, new PR-52 and `test/protocol.test.js`’s PR-13 assertions instead name `## Open` items. **Risk:** the proposed store contract requires a different reviewer input from the preserved protocol, leaving the targeted consistency defect unresolved despite GREEN binding. **Fix:** correct PR-13’s two references against the existing P3 contract and assertions; leave P3 untouched and record the correction’s basis.

Examined: staged and unstaged changes, all five delta modules, Reality Check/Open items, relevant store contracts, gate/readiness/archive force and migration paths, documentation tests, historical runbook edits supporting translation corrections, and the retired Python checker versus `lib/check.js`. R5 remains non-forceable in the implementation; the archive-drop fingerprint and owner-decision requirements remain intact. The approach is coherent and does not require SPLIT.

Not examined: credentials, human-note files, raw review transcripts or other changes’ documents. The permitted consensus file was unavailable at the supplied path; its requirements were taken from the user’s instruction. I did not rerun the reported 830 tests, verify or self-check. Requested gate JSON showed C3/C7/C9 passing, C1 skipped without a test command, and C8 blocked pending this review’s summary; those are not additional findings.

Advisory: the rewritten cross-round-memory paragraph still says the CLI reads the reviewer session and retains “the ledger doubles as the audit trail.” Clarifying those sentences would make the explanation more accurate.

VERDICT: gaps found
