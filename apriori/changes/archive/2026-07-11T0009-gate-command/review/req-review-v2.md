# Review — gate-command req-v2

## Round-1 Verification

GREQ-1: verified. Stage resolution now defines the archived-dir regex, sort order, deterministic last-candidate selection, and not-found behavior.

GREQ-2: verified. C3 now defines required keys, exact enums, placeholder handling, `change` mismatch handling, and missing/unreadable flow-state behavior.

GREQ-3: verified. C5 now defines doc globs, exclusions, regular-file/symlink behavior, verdict regex, raw glob, containment, and duplicate raw behavior.

GREQ-4: verified. Validation now requires `CHANGE_NAME_RE` and realpath containment before reading further.

GREQ-5: verified. C6 now defines git invocation and classifies nonzero/failure modes as `n/a` rather than false blockers.

GREQ-6: verified. C1 now defines the internal verify calls, test command fallback, missing test command behavior, default id-pattern limitation, and exit classification.

GREQ-7: verified. Ledger path is explicitly `<cwd>/apriori/review/<name>-issues.md` for both stages.

## Dimension Results

1. Target state B clear and unambiguous: issue open — GREQ-8.
2. Edge cases and exception paths covered: issue open — GREQ-8.
3. Implied but undeclared state changes or side effects: no major issues; read-only remains explicit.
4. Each acceptance criterion testable as if/then: issue open — GREQ-8.
5. Conflicts with current state A: no major issues.
6. Target lineage declared and matches repo reality: no major issues. Repo is `v3`; package is currently `3.1.0`; target is next minor, expected `3.2.0`.

## Issues

### GREQ-8 — JSON shape is impossible for some exit-2 outcomes

Description: The JSON contract requires `{ change, stage: "in-flight"|"archived", checks, result, blocked }` and says stdout is pure JSON in every outcome. But some exit-2 outcomes have no valid stage: `--change` missing, invalid change name before lookup, change found nowhere, and potentially unreadable/missing flow-state after stage resolution. The requirement does not define what `stage` and `checks` contain for those cases.

Risk: Implementers may omit `stage`, invent a third value, write errors to stderr, or produce non-JSON for usage errors. A10 cannot be tested consistently.

Suggested fix: Define an error JSON shape. For example: `stage: null` before resolution, `checks: [{id:"validation", status:"blocked", detail:"..."}]`, `result:"BLOCKED"`, `blocked:1`, or add `result:"ERROR"` and allow `stage:null` for exit-2 outcomes.

## Advisories

ADV-G2 batch: C4’s rejected-reason rule would be easier to test with a regex such as `/^rejected\b\s+\S+/i`. C2 only counts literal `- [ ]`; if `- [x]` and `- [X]` are both acceptable, say so, though this is not blocking. The explicit exclusion of `--id-pattern` is fine, but docs should mention that projects using custom ID patterns must keep using `verify` directly until gate grows that flag.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| GREQ-1 | Archived stage resolution is ambiguous when multiple archive dirs match a change name. | Gate may read different archived artifacts across implementations. | STEP0·r1 | verified |
| GREQ-2 | Flow-state legality vocabulary and required fields are underspecified. | Valid flow states may be rejected or invalid placeholders accepted inconsistently. | STEP0·r1 | verified |
| GREQ-3 | Verdict raw matching lacks exact file, regex, symlink, and duplicate handling rules. | The simulated-review backstop can be bypassed or inconsistently enforced. | STEP0·r1 | verified |
| GREQ-4 | `gate --change` lacks explicit change-name validation and realpath containment. | Path traversal or symlink escapes can make gate read outside intended roots. | STEP0·r1 | verified |
| GREQ-5 | C6 git freshness check does not define git failure and invalid-commit handling. | CI/shallow/non-git environments can produce inconsistent PASS/BLOCKED/N/A results. | STEP0·r1 | verified |
| GREQ-6 | C1 verify invocation details and missing test-command handling are incomplete. | Gate can run the wrong verify target or classify verify setup failures inconsistently. | STEP0·r1 | verified |
| GREQ-7 | Ledger path is undeclared for archived changes and conflicts with status convention if inferred from resolved dir. | Gate may miss the actual issue ledger and falsely pass C4. | STEP0·r1 | verified |
| GREQ-8 | `--json` contract has no defined shape for exit-2 outcomes before a stage exists. | Usage/validation/not-found errors cannot be implemented or tested consistently as pure JSON. | STEP0·r2 | open |
| ADV-G2 | Advisory batch: rejected-row reason regex, task checkbox casing, and custom id-pattern limitation docs. | Low. | STEP0·r2 | advisory |

VERDICT: 1 issues open
