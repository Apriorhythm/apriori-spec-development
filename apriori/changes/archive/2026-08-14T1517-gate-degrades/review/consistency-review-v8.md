# consistency-review-v8 — gate-degrades

## 1. IMPL-2 verification

IMPL-2 is verified.

The `gap-report.md` correction is accurate: its target-state summary now states only the exercised resolver defaults, same-process three-state structural equality with the reverse guard, and unchanged configured-path regression tests. It explicitly disclaims pre-change byte identity.

Leaving `requirement/req-v1.md` through `req-v5.md` untouched is the correct decision:

- They are named STEP0 version-history artifacts, not the requirement in force.
- `req-final.md` is explicitly authoritative and carries the amendment marker.
- `step5-amendment.md` names the historical files and explains why their superseded wording remains.
- Rewriting them would falsify the review lineage and obscure how the requirement evolved.

With that named distinction, the old versions do not present an operative promise.

The inventory is now complete. The remaining search hits are one of:

- Explicit disclaimers or historical quotations in the amendment and current artifacts.
- The exercised same-process virgin/cleared-state claim in SR-75 and its test.
- Preserved STEP0 version history.
- Earlier changes’ tested guarantees, including GT-21, `--specs` golden behavior, and historical CHANGELOG entries.

No current artifact still promises untested pre-seam byte identity.

## 2. Semantic faithfulness

No gap found. GT-30..GT-38, modified GT-11 and DR-07, and SR-73..SR-75 remain backed by tests that assert their described behavior rather than merely carrying their IDs.

## 3. Required behavior versus implementation

No gap found. Gate, doctor, and spec-runner implement the complete delta contract, including projection reuse, test-command classification, call-time seam resolution, deterministic error handling, and doctor branch precedence.

## 4. Continue, skip, and user visibility

No gap found. Skipped C1, continued C2–C7 evaluation, blocks, projection failures, configuration errors, and doctor findings are visible with the required detail and aggregate precedence.

## 5. External input and security

No security gap found. External command values, non-string API input, unreadable configuration, id-pattern validation, process execution, and diagnostic serialization remain handled according to the specification.

## 6. Guarantee and matrix conformance

All change-owned guarantees remain exercised:

- The matcher child, projection builder, and test runner each have an independent zero-call observation.
- `blocked` counts blocked checks only.
- JSON has exactly six keys and never adds `code`.
- Projection construction has one implementation and is resolved at call time.
- All projection fixtures compare complete projections and errors.
- Seam restoration, default resolution, cleanup, and the exact export surface are checked.

The seven-row test-command classification and eight-row per-check matrix remain exhaustive, correctly ordered, and aligned with `lib/gate.js`. No falsely bound scenario ID or additional spec-versus-code discrepancy was found.

## Advisories

None.

## Ledger delta

Apply this exact status change:

- IMPL-2: `fixed (r7) → verified` — the gap-report target statement is correctly narrowed, the amendment inventory is complete, and preserved `req-v1..v5.md` files are explicitly identified as non-operative audit history.

IMPL-1, IMPL-3, IMPL-4, IMPL-5, and IMPL-6 remain `verified`. No new ledger rows.

VERDICT: no spec-vs-code gaps
