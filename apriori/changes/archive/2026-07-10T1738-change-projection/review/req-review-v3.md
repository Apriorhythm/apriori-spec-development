# Review — change-projection req-v3

## Round-3 Verification

REQ-5: verified. v3 now defines realpath containment for existing participating paths, symlink behavior, and not-yet-existing store targets.

REQ-8: verified. v3 now defines the pre-existing temp-file guard, exit behavior, and this-run-only cleanup ownership.

REQ-9: verified. v3 now defines pure-JSON output for `verify --change --json` across success, gaps, merge conflicts, and non-conflict projection failures.

## Dimension Results

1. Target state B clear and unambiguous: no major issues.
2. Edge cases and exception paths covered: no major issues.
3. Implied but undeclared state changes or side effects: no major issues.
4. Acceptance criteria testable as if/then: no major issues.
5. Conflicts with current state A: no major issues beyond explicitly declared behavior changes.
6. Target lineage declared and matches repo reality: no major issues.

## New v3 Material Review

The realpath containment rule is precise enough for implementation, including symlinked paths and new-module store targets.

The temp-ownership guard closes the fixed-temp-path risk: pre-existing temp files are treated as preflight failures and this run only cleans files it created.

The JSON contract is now testable: stdout is always pure JSON in `--json`, `projection` is present only for `--change`, and failure classes have defined locations for `errors[]`, `projection.modules`, and `projection.conflicts`.

The stamp argument contract and deprecated-marker regex are concrete enough to implement and test.

No new formal issues found.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-5 | Path validation still lacks symlink/realpath containment semantics. | New `--change` surfaces can read or fingerprint outside intended roots through symlinks. | STEP0·r1 | verified |
| REQ-8 | Transaction staging uses fixed temp paths without defining ownership or pre-existing-temp behavior. | Archive can overwrite/delete stale or user-owned temp files and undermine manual recovery. | STEP0·r2 | verified |
| REQ-9 | `verify --change --json` failure output shape is underspecified. | Machine consumers and tests cannot rely on a stable projection-error contract. | STEP0·r2 | verified |

VERDICT: no major issues
