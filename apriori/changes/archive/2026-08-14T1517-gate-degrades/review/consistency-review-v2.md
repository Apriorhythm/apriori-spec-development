# consistency-review-v2 — gate-degrades

## 1. Semantic faithfulness

### IMPL-1 — verified

DR-07 now matches the implementation and established CF-11 behavior:

- Conflicting `test-cmd` rows reach the D5 config-finding branch.
- An unreadable whole `process-config.md` fails during upstream id-pattern resolution, with D5 reported `n/a`.
- No code change was required.

### IMPL-2 — reopened

- Description: The new runner-diversion guard is sound: while `_setTestRunner` is installed, the in-process configured gate changes from its virgin result, so a no-op setter would fail the test.
- Remaining problem: the three-state byte comparison still does not foreclose seam-induced drift:
  - `virgin` is captured from the already-modified implementation, not from a frozen state-A golden. Drift introduced by the default resolver path appears identically in every snapshot and passes.
  - `snap()` launches fresh CLI processes. Those processes never share the parent process’s installed or cleared module-level overrides, so their stdout/stderr/status comparisons do not exercise the three seam states.
  - The in-process snapshot covers only a partial gate result and does not capture the public `verify()` result shape.
- Risk: med. The test proves restoration of selected in-process gate behavior, but not the frozen configured-path compatibility guarantee in AC-GD-09/SR-75.
- Suggested fix: compare configured gate and verify against checked-in state-A goldens. For seam lifecycle comparisons, invoke their CLI functions in the same process while capturing console output and return status, or otherwise inject the override into the process being observed. Also normalize and compare the complete `runGate()` and `verify()` public results. Keep the installed-runner diversion assertion; that part is valid.

### IMPL-3 — verified

The no-delta-files fixture now compares both the complete projection object and errors array. SR-73 covers all six promised fixtures.

### IMPL-4 — verified

GT-33 now creates a directory at `apriori/process-config.md`, invokes gate without a test-command flag, and asserts ERROR/2 with no skipped C1. This deterministically exercises T4 rather than T7.

### IMPL-5 — reopened

- Description: PASS, BLOCKED, INCOMPLETE, and resolved ERROR now receive the exact six-key/no-`code` assertion. However, the purported strict-parser fixture is `gate --json`. That argv parses successfully and reaches `runGate()`’s missing-change usage error; it does not exercise `withStrict()`’s separate `jsonError` serializer.
- Risk: low. The independent strict-parser JSON path could drift while the test continues to pass.
- Suggested fix: use a genuine parser rejection with `--json`, such as a stray positional or unknown flag, assert exit 2, and apply the exact six-key/no-`code` assertion to that output.

### IMPL-6 — verified

Both troubleshooting documents now condition INCOMPLETE/3 on every other applicable check passing and correctly retain BLOCKED/1 and ERROR/2 precedence.

All other scenario tests remain semantically faithful. The renamed supplemental tests now begin with exact `GT-30` and `SR-73` IDs and are mechanically attributable to the intended scenarios.

## 2. Required behavior versus implementation

No new code behavior gap found.

The projection-only path, synthetic projection diagnostic, archived short-circuit, total result order, doctor branch order, and configured/absent test-command classification still match the frozen requirement and delta specs.

## 3. Continue, skip, and user visibility

No new gap found.

Skipped C1 remains visible with fact and cure text; BLOCKED and ERROR retain precedence; projection failures return diagnostics without a C7 conclusion; doctor distinguishes explicit skip, missing configuration, conflicting configuration, and upstream unreadable-config failure.

## 4. External input, permissions, and security

No security gap found.

Input validation, config failure handling, id-pattern isolation, projection containment, and diagnostic boundaries are unchanged. The new unreadable-config test uses a deterministic wrong-file-type fixture without relying on ineffective root-level permission changes.

## 5. Guarantee claims and shared state

The following guarantees remain adequately exercised:

- Matcher child: zero calls through `_setChildRunner`.
- Archived projection builder: zero calls through `_setProjectionBuilder`.
- Test process: zero calls through `_setTestRunner`.
- `blocked` counts blocked statuses only.
- Projection resolution occurs at call time.
- Both projection consumers use the same implementation.
- Every seam use in the change tests is cleaned up through `finally`.

The configured-path byte-identity guarantee remains incomplete for the reasons under IMPL-2.

## 6. Classification and aggregate matrix

The §3.1 T1–T7 classification and §3.2 M7→M5→M3→M4→M8→M6→M2→M1 ordering are unchanged and still match `lib/gate.js`. No row became unreachable or changed outcome during these fixes.

## Advisories

- The comment above the renamed static SR-73 test still says it is “Named SR-73b.” Update the comment to match the exact `SR-73` prefix.
- CHANGELOG still says “391 tests,” while the reported current suite contains 392. Refresh the count or omit volatile test totals from the entry.
- The state-A truth documents remain intentionally pending STEP6 reconciliation and are not counted as a STEP5 gap.

## Ledger delta

Apply these exact status changes:

- IMPL-1: `fixed (r1) → verified`.
- IMPL-2: `fixed (r1) → open` — reopened because current-process virgin snapshots are not state-A goldens, and subprocess CLI snapshots do not share the seam state being tested.
- IMPL-3: `fixed (r1) → verified`.
- IMPL-4: `fixed (r1) → verified`.
- IMPL-5: `fixed (r1) → open` — reopened because `gate --json` is not a strict-parser rejection and therefore does not exercise `jsonError`.
- IMPL-6: `fixed (r1) → verified`.
- ADV-STEP5-r1 remains `advisory-acked`.

No new ledger rows.

VERDICT: 2 issues open
