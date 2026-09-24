<!-- apriori-base: sha256:15620e1832b09615394866e768e7c093d9174f88f90ad1d3602484ef2caf6dab -->
# Delta — protocol (review-round-limit)

## ADDED Requirements

### Requirement: the runbook states the review-round limit and retires the fixed control points
The runbook (both language editions) SHALL state in §1 R4 that the round limit is the owner's `review-round-limit` row (missing row = 7, integers >= 1, the agent never writes the file), that `revise` below the limit never stops the loop on its own, that no fixed round-2, round-3 or round-5 stop applies, that a `review-progress <family> round <n>` note entry with `issues / actions / evidence / approach` is required before round n >= 3 and is checked by C8 structurally without ever becoming an owner gate, that the loop stops for the owner only on an explicit `escalate` or a `revise` at the effective limit (accept at the limit proceeds), that only an owner reframe releases that stop with the cumulative count never resetting, and that `--force` alone bypasses neither a stopped loop nor an evidence problem. §1 R1's third stop class SHALL name the limit (not round 2); §1 R3 SHALL name the one configured number that governs review rounds; the operator guide and the concepts doc (both editions) SHALL carry the same five-stop list with the limit in place of "stalled after round 2"; "converge within 2 rounds" MAY remain only as advisory wording.

#### Scenario: PR-40 R4 carries the limit rule in both editions
- WHEN `RUNBOOK.md` and `RUNBOOK_cn.md` §1 are read
- THEN each names `review-round-limit`, the default 7, `review-progress`, and the two owner stops (`escalate`, revise at the limit), and neither still says that a family "still `revise` after ITS round 2" stops the loop or that "reaching ITS round 5" is an escalation

#### Scenario: PR-41 the derived documents follow the runbook
- WHEN `docs/operator.md`, `docs/concepts.md`, `docs/cli.md` and their `_cn` editions are read
- THEN none describes a round-2 stop or a fixed round-5 stop-loss as a current rule; `docs/cli.md` §8.0 documents the `review-round-limit` key; and `CHANGELOG.md` records the change under the current version
