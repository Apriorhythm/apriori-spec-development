# consistency-review-v7 — gate-degrades

## 1. Semantic faithfulness

The executable SR-75 contract remains sound:

- The complete `[runGate(), verify()]` results are compared in one process.
- The populated Map is compared by content through `deepStrictEqual`.
- The installed runner override must produce a different result.
- Clearing either override restores structural equality with the virgin state.
- Default projection resolution is checked by identity, while the private runner resolver is checked statically.

The revised `lib/spec-runner.js` comment now states exactly this observable contract and explicitly disclaims pre-seam byte identity.

### IMPL-2 — reopened

- Description: `gap-report.md` §二, “状态 B（目标）”, item 4 still states `有配置的路径逐字节不变`. This is presented as the target state, not merely as a historical quotation, and it has no amendment marker. It therefore remains an operative-looking copy of the retired, untestable pre-seam guarantee. It is also absent from `step5-amendment.md` §四, so the ten-location inventory is not yet complete.
- Risk: med. The implementation and executable specification are correct, but the component-level implementation handoff document still promises a stronger result than the amended contract.
- Suggested fix: annotate or replace gap-report item 4 with the narrowed A/B/C regression-evidence contract and explicitly state that pre-seam byte identity is not claimed. Add `gap-report.md` to the amendment inventory.

The full sweep otherwise found no surviving copy:

- `lib/spec-runner.js` is correctly narrowed.
- Test comments refer only to same-process virgin/cleared-state equality, which SR-75 exercises.
- Proposal, tasks, design, delta specs, touched docs, and the current CHANGELOG entry are aligned.
- Flow-state references are chronological records of earlier findings and corrections, not current guarantees.
- Historical CHANGELOG entries, GT-21, and the `--specs` golden guarantees were excluded as instructed.

The inventory is therefore not complete: `gap-report.md` is the remaining unrecorded location.

## 2. Required behavior versus implementation

No runtime implementation gap found. Gate, doctor, and spec-runner continue to implement every changed scenario and acceptance matrix outcome.

## 3. Continue, skip, and user visibility

No gap found. Skipped C1, continued checks, blocking results, projection failures, configuration errors, and doctor findings remain visible with the specified precedence and diagnostics.

## 4. External input and security

No security gap found. External command input, configuration read failures, id-pattern validation, child-process isolation, and diagnostic handling remain consistent with the specification.

## 5. Guarantee claims

Except for the stale gap-report statement under IMPL-2, all change-owned guarantee claims are exercised:

- The three zero-call guarantees use their respective independent seams.
- `blocked` counts blocked checks only.
- JSON has exactly six keys and no `code` across every required outcome path.
- Projection construction has exactly one implementation and both consumers resolve it at call time.
- Six success/failure fixtures compare the complete projection and errors.
- Seam cleanup and the exact public export set are checked.

## 6. Classification and matrix conformance

The seven-row test-command classification and eight-row per-check matrix remain aligned with `lib/gate.js`. All declared rows are reachable where intended, mutually exclusive under their precedence rules, and produce the specified status, visibility, and exit code.

No other falsely bound leading scenario ID was found. The in-flight store-only ORPHANs remain expected until the delta is merged.

## Advisories

None.

## Ledger delta

Apply this exact status change:

- IMPL-2: `fixed (r6) → open` — reopened because `gap-report.md` §二 still presents configured-path byte identity as target state and is missing from the amendment’s claimed complete inventory.

IMPL-1, IMPL-3, IMPL-4, IMPL-5, and IMPL-6 remain `verified`. No new ledger rows.

VERDICT: 1 issues open
