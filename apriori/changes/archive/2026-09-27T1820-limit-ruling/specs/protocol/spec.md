<!-- apriori-base: sha256:fae193281762425559bf0dd18fcaca58431949cd8d6b91041d352c8fd1e3be20 -->
# Delta — protocol (limit-ruling)

## MODIFIED Requirements

### Requirement: the runbook states the review-round limit and retires the fixed control points
The runbook (both language editions) SHALL state in §1 R4 that the round limit is the owner's `review-round-limit` row (missing row = 8, integers >= 1, the agent never writes the file), that `revise` below the limit never stops the loop on its own, that no fixed round-2, round-3 or round-5 stop applies, that a `review-progress <family> round <n>` note entry with `issues / actions / evidence / approach` is required before round n >= 3 and is checked by C8 structurally without ever becoming an owner gate, that a `revise` AT the limit does not stop either — the producer writes one `note: ruling <family> round <n> — <ID>: <fixed|rejected|follow-up|owner> — <basis>` line per open finding (a necessary fix is never set aside) and exactly one independent re-review follows, the same reviewer session resumed and answering each ruled id `- <ID>: ADDRESSED — <basis>` or `- <ID>: NOT ADDRESSED — <basis>`, whose unresolved ids become pending `## Open` items for the owner — that the loop stops for the owner only on an explicit `escalate` or on a round past that one re-review, that only an owner reframe releases that stop with the cumulative count never resetting, that `--force` alone bypasses neither a stopped loop nor an evidence problem, and that the rulings and the one re-review do not guarantee the approach is right. §1 R1's third stop class SHALL name a family past its one automatic re-review; §1 R3 SHALL name the one configured number that governs review rounds; the operator guide (both editions) SHALL carry one `/goal` recipe from Build & Test through archive beside the same five-stop list, and the concepts doc (both editions) the same five-stop list; "converge within 2 rounds" MAY remain only as advisory wording.

#### Scenario: PR-40 R4 carries the limit rule in both editions
- WHEN `RUNBOOK.md` and `RUNBOOK_cn.md` §1 are read
- THEN each names `review-round-limit`, the default 8, `review-progress`, the `note: ruling` line with its four kinds, the one re-review with its `ADDRESSED` / `NOT ADDRESSED` line, and the two owner stops (`escalate`, a round past the one re-review), and neither still says that a `revise` at the limit stops the loop, that a family "still `revise` after ITS round 2" stops the loop or that "reaching ITS round 5" is an escalation

#### Scenario: PR-41 the derived documents follow the runbook
- WHEN `docs/operator.md`, `docs/concepts.md`, `docs/cli.md` and their `_cn` editions are read
- THEN none describes a round-2 stop, a fixed round-5 stop-loss or a stop at the limit as a current rule; `docs/cli.md` §8.0 documents the `review-round-limit` key with its default 8; and `CHANGELOG.md` records the change under the current version

#### Scenario: PR-61 the rest of the runbook agrees, and the rulings are disclosed
- WHEN both editions' operating principles, the Fix Packet paragraph, §1 R1, the archive `--force` sentence and the Specify exit are read
- THEN none says the loop stops at the limit; R1's third class is a family past its one automatic re-review; each edition says the rulings and the one re-review do not guarantee the approach and that the owner may reframe or raise the limit at any time, and that the final report and the archive declaration list every ruling

#### Scenario: PR-62 one /goal carries a change from Build & Test to archive, and the templates follow
- WHEN `docs/operator.md` and `docs/operator_cn.md`, `templates/command.md` and `templates/process-config.md` are read
- THEN each operator edition carries one recipe that runs Build & Test, review and archive in a single `/goal`, going back to the failing stage and stopping only at R1's stops, and its decision list names a family past its one automatic re-review instead of a family at its limit; the command template's R1 list does the same; the process-config template ships `8`

## Notes

Why: the human approved DA-CONSENSUS §三 (2026-09-27) with two conditions of their own — the default limit raised to 8, and a flow that stays simple and can run under one `/goal`. PR-40 and PR-41 keep their ids with the new rule; PR-61 and PR-62 pin the places the old stop was described outside R4.
