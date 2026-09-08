# Review — gate-command req-v3

## Round-2 Verification

GREQ-8: verified. The JSON contract now defines `result: "ERROR"`, `errors[]`, `stage: null` before stage resolution, `change: null` when `--change` is missing, and pure JSON stdout for usage and other exit-2 outcomes under `--json`.

## New Material Review

The new ERROR JSON material is precise enough to implement and test. It covers PASS, BLOCKED, and exit-2 classes, including pre-resolution failures.

The prior advisory items were also addressed: rejected rows now have a concrete reason rule, checked task casing is explicit, and the custom `--id-pattern` limitation is declared out of scope.

No new formal issues found.

## Dimension Results

1. Target state B clear and unambiguous: no major issues.
2. Edge cases and exception paths covered: no major issues.
3. Implied but undeclared state changes or side effects: no major issues.
4. Each acceptance criterion testable as if/then: no major issues.
5. Conflicts with current state A: no major issues.
6. Target lineage declared and matches repo reality: no major issues.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| GREQ-8 | `--json` contract had no defined shape for exit-2 outcomes before a stage existed. | Usage/validation/not-found errors could not be implemented or tested consistently as pure JSON. | STEP0·r2 | verified |

VERDICT: no major issues
