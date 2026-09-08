# P1 requirement review — ledger-states (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/ledger-states-req-review-v1-raw.txt

# ledger-states requirement review v1

## Formal issues

### LS-1 — `waived` requires a human gate entry, but C4 is specified to pass without checking it

**Description:** The vocabulary says `waived + reason` means the human accepted the risk and a `gates:` entry records the decision. DD-3 then says C4 only checks the row reason and does not parse flow-state. I2 also says `waived+reason` passes. That makes a producer-written `waived — reason` mechanically indistinguishable from a human waiver.

**Risk:** This recreates the self-rejection hole under a new terminal state.

**Suggested fix:** Require archived C4 to verify a matching `gates:` entry for each `waived` row, at least by issue ID plus `waived`/`waiver` text. If that is intentionally protocol-only, state that `waived` remains human-audited and not mechanically proven, and adjust the risk/acceptance text accordingly.

### LS-2 — Archived-stage C4 is not tied to a required post-archive gate run

**Description:** The stricter rule only applies when `gate` resolves a change as archived. But the requirement does not say who runs `apriori gate --change <name>` after `archive` moves the change directory, nor does it update the STEP6/gate④ protocol to require that archived-stage check.

**Risk:** A change can pass the in-flight gate with `fixed` or reasoned `rejected`, archive, and never exercise the terminal-only C4 rule.

**Suggested fix:** Add an acceptance criterion and runbook/protocol requirement: after archive moves the change and before gate④/KBS sign-off, `apriori gate --change <name>` is run against the archived change, and C4’s archived terminal-state rule is part of that gate packet.

### LS-3 — Unknown status handling is only specified for archived ledgers

**Description:** I1 says archived unknown statuses block. The in-flight rule lists `open`, `fixed`, `rejected`, `rejected-verified`, and `waived`, but does not say whether unknown statuses such as `verifed`, `done`, or `advisory` block while in flight.

**Risk:** Typos or invented states can pass the in-flight gate, which matters if LS-2 is not closed or if humans rely on in-flight gate output.

**Suggested fix:** Define a legal-status parser for both stages. Unknown statuses should block in all stages, while known prefixes may remain stage-aware. Also declare whether matching is lower-case canonical or case-insensitive.

### LS-4 — `rejected-verified + reason` does not say whose reason must be preserved

**Description:** The state means “reviewer concurred with the rejection,” but the requirement does not say whether the status reason must preserve the producer’s original rejection reason, the reviewer’s concurrence reason, or both. The live UMIMPL-1 case matters because the audit trail needs to show what was rejected and why the reviewer agreed.

**Risk:** Rejections can become terminal while losing the original rationale, weakening human review and postmortem traceability.

**Suggested fix:** Define the required form, e.g. `rejected-verified — <original rejection reason>; reviewer concurred: <review/evidence ref>`, or explicitly require the original rejection reason to remain visible in the status cell or issue text.

### LS-5 — Repo hygiene migration is asserted, not made mechanically complete

**Description:** The requirement says UMIMPL-1 will be upgraded and “scan done: none,” but the acceptance criteria only name UMIMPL-1 and `gate --change update-manifest`. It does not require a deterministic scan/report over all archived changes and their ledgers after the new vocabulary is applied.

**Risk:** Other archived ledgers with `fixed`, plain `rejected`, or unknown statuses could survive unnoticed, especially as the repository grows.

**Suggested fix:** Add an acceptance criterion that scans every archived change with a ledger and reports all non-terminal archived statuses, with zero remaining except intentionally migrated rows. The implementation/test plan should prove that scan or include its recorded output.

## Dimension verdicts

1. **Target state B clarity:** Mostly clear, but `waived`, in-flight unknown statuses, and `rejected-verified` reason provenance need tightening.
2. **Edge cases and exception paths:** Missing archived enforcement timing, unknown status behavior, and migration completeness.
3. **Undeclared side effects:** The UMIMPL-1 ledger mutation is declared. No extra file-format side effects found.
4. **Acceptance testability:** I1-I7 are mostly testable, but need additional if/then cases for waiver evidence, post-archive gate invocation, unknown in-flight statuses, and migration scanning.
5. **Conflicts with state A:** The background matches state A: current C4 blocks only `open` and reasonless `rejected`; docs currently carry the narrower vocabulary.
6. **Lineage:** Declared and consistent.

## Advisories

- `advisory-acked` as terminal is acceptable if the existing reviewer-only advisory labeling and “correctness/security never advisory” rules remain cross-referenced.
- No separate `reopened` status is required; “reopened” can remain an event where the old ID returns to `open`. The docs should say this explicitly to avoid implementers adding a status.
- The archived-stage cure message can be content-tested rather than exact-string-tested, unless the producer wants a stable CLI contract.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| LS-1 | `waived` requires a human `gates:` entry, but C4 is specified to pass `waived+reason` without checking that entry. | Producer can self-waive a formal issue and pass the mechanical gate. | STEP0 r1 | open |
| LS-2 | Archived-stage C4 is not tied to a required post-archive gate run. | Terminal-only ledger checks may never be exercised for real archived changes. | STEP0 r1 | open |
| LS-3 | Unknown status handling is unspecified for in-flight ledgers, and case/canonical matching is undeclared. | Typos or invented statuses can pass in-flight gate output. | STEP0 r1 | open |
| LS-4 | `rejected-verified + reason` does not define whether the original rejection reason must be preserved. | Terminal rejection audit trail can lose the actual rationale. | STEP0 r1 | open |
| LS-5 | Repo hygiene migration lacks a deterministic all-archived-ledger scan acceptance criterion. | Hidden non-terminal archived rows can remain after the migration. | STEP0 r1 | open |
| LS-ADV-1 | Advisory batch: `advisory-acked` is acceptable with existing scope discipline; `reopened` can stay an event returning the row to `open`; cure message exactness can be left to design. | Low. | STEP0 r1 | open |

VERDICT: 5 issues open
