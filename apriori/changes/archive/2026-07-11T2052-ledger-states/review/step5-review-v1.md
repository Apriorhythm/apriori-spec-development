# P8 consistency review — ledger-states (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/ledger-states-impl-review-v1-raw.txt

# ledger-states STEP5 consistency review v1

## Findings

### LSIMPL-1 — PR-18 does not bind the plain `rejected + reason` status in the CN P0 block

**Description:** PR-18 says both editions document the seven statuses and their setters. The EN assertions include `/\brejected\b/`, but the CN status loop checks `open`, `fixed`, `rejected-verified`, `verified`, `waived`, and `advisory-acked` only. Because `rejected-verified` is present, the test can pass even if the CN P0 text drops the plain producer-set `rejected + reason` state.

The landed CN prose currently does include plain `rejected`, so the documentation itself is not wrong. The gap is that the PR-18 binding is weaker than the scenario it claims to bind.

**Risk:** A future CN edit can drop the non-terminal rejected state while PR-18 stays green, weakening translation parity and the ledger vocabulary contract.

**Suggested fix:** Add a CN assertion for the plain status token, e.g. `/\brejected\b/`, preferably scoped near the producer bullet or alongside `open → rejected`.

## No Gap Found

The C4 implementation matches the converged design: `checkLedger` receives `loc.stage` and `loc.dir`, reads the active or archived `flow-state.md`, applies stage-aware terminal rules, blocks unknown statuses in both stages, preserves in-flight `fixed` / reasoned `rejected`, and exports `classifyStatus` for the corpus test.

Waiver evidence is implemented with same-entry matching and exact escaped ID token boundaries, including the Q-1 vs Q-10 test. The `gates:` entry parser handles the current two-space-indented timestamp bullets and continuation lines.

GT-13/14/15 cover the main ledger behavior, including archived terminal-only rows, waived-without-evidence, same-entry enforcement, in-flight unknown status, reasonless `rejected-verified`, and the archived-ledger corpus reason floor.

RUNBOOK EN/CN P0 text carries the four-bullet vocabulary/setter model; STEP6 in both editions requires the post-archive `apriori gate --change <name>` run in the gate④ packet. The UMIMPL-1 migration preserves the original rejection rationale and concurrence reference.

## Advisories

- CN does not include the waived example row that EN adds to the sample table. The CN bullets still document `waived + reason` and the `gates:` requirement clearly, so this is translation polish rather than a blocking gap.
- `classifyStatus` intentionally treats markdown-decorated status cells such as `` `verified` `` or `**verified**` as illegal. That is consistent with the tightened status vocabulary.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| LSIMPL-1 | PR-18’s CN P0 assertions omit the plain `rejected + reason` status; `rejected-verified` can satisfy the only rejected-related CN check. | CN can drop the producer-set rejected state while PR-18 stays green. | STEP5 r1 | open |
| LSIMPL-ADV-1 | Advisory batch: CN lacks the waived example row present in EN; markdown-decorated status cells remain illegal by design. | Low. | STEP5 r1 | open |

VERDICT: 1 issues open
