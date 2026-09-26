<!-- apriori-base: sha256:784f2003a2ba9e3dffd5e2f103e2bb51d603f70cabfc2ac09019d854d2b5ac76 -->
# Delta — protocol (review-round-scope)

## ADDED Requirements

### Requirement: a later review round is scoped to what changed
Both runbook editions SHALL carry, in §4 Review & Deliver right after the one-independent-review bullet, the scope of rounds 2+: the producer's resume message (R2) asks the reviewer to judge each finding still open from the previous round as ADDRESSED or NOT ADDRESSED and to review the fix diff together with what it affects (callers, shared state, tests — never trimmed to the edited lines); a new finding outside that diff still counts when it violates the current contract or a safety constraint, and anything else is advisory and does not extend the loop; a finding is wording only when fixing it changes neither the contract nor how anyone would execute it, and its location in a document does not make it advisory. That scope rides on a resumed reviewer session: a later round run in a fresh reviewer session (R2's non-Codex path when not resumed, or the fresh `claude` session that finishes a round after transport recovery failed) gets only the default input and reviews the whole change as round 1 does, and the previous round's conclusions are not repackaged into it. R2's resume clause (both editions) SHALL point the message at that scope. The P3 block stays byte-identical to its frozen form (RIB-10), and neither the round limit, the stop points nor the verdict vocabulary change. Evidence: across five real multi-round families, 13 findings from round 3 on were 9 wording, 2 repeats, 1 new contract gap and 1 other (2026-09-26 diagnosis).

#### Scenario: PR-59 §4 states the scope of a later round (both editions)
- WHEN §4 Review & Deliver of `RUNBOOK.md` and `RUNBOOK_cn.md` is read
- THEN inside each edition's Review & Deliver section, as the bullet immediately after the one-independent-review bullet and immediately before the disposition bullet, each says that from round 2 on the resume message asks for ADDRESSED / NOT ADDRESSED on each still-open finding and a review of the fix diff with its callers, shared state and tests; that a new finding outside the diff counts when it violates the current contract or a safety constraint while anything else is advisory and does not extend the loop; that wording is judged by effect on the contract or execution, never by location; and that a later round run in a fresh reviewer session (the non-Codex path when not resumed, or the fresh `claude` session after failed transport recovery) gets only the default input and reviews the whole change as round 1 does, without the previous round's conclusions repackaged into it

#### Scenario: PR-60 R2's resume clause points at that scope, and P3 stays frozen (both editions)
- WHEN R2 of both editions and the P3 blocks are read
- THEN R2's rounds-2+ clause says the resume message is scoped as §4 Review & Deliver says, and both P3 blocks are byte-identical to their frozen form

## Notes

Why: the review loop already resumes one reviewer session, but nothing said what a later round judges, so rounds 3+ in real projects kept producing wording findings that extended the loop. The rule is carried by §4 and R2, not by P3, which a recorded human ruling freezes (Claude × Astra consensus NI-CONSENSUS §一 C).
