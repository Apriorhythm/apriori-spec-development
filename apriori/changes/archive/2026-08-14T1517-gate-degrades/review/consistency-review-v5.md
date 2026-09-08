# consistency-review-v5 — gate-degrades

## 1. IMPL-2 verification

The five round-four locations were corrected successfully:

- The delta parent Requirement now states observable three-state structural equality and explicitly disclaims pre-seam byte identity.
- Design D1.4 no longer claims byte identity and points to the amendment.
- `req-final.md` §3.1c and O5 point to the narrowed B4 contract.
- AC-GD-04 now requires the exercised ERROR/2 plus flow-state diagnostic contract.
- SR-75 distinguishes exported projection-resolver identity from private runner-resolver behavior, and the new static assertion mechanically checks the latter.
- The same-process `deepStrictEqual` comparison includes the non-empty `verify().results` Map and proves the complete-result three-state equality claim.

However, the final sweep found two remaining contradictions in the same compatibility-evidence issue.

### IMPL-2 — reopened

- Description:
  1. `step5-amendment.md` evidence C says all 375 state-A tests pass with “not one assertion modified.” That is factually false: the pre-existing DR-07 test was deliberately rewritten, removing its old missing-command=`n/a` assertions and replacing them with the new finding behavior.
  2. `tasks.md` T18 still says configured gate checks/details/JSON/exit are identical to before and claims an explicit assertion was added. That is the pre-amendment guarantee, not the narrowed three-state contract. No state-A comparison or full pre-change assertion exists.
  3. Design D1.4 still says configured `verify()`’s “call sequence and parameters” are unchanged. The implementation necessarily inserts `currentProjectionBuilder()` and `currentTestRunner()` resolver calls, so the call sequence is not literally unchanged; the tests prove result equality and call-time routing, not an unchanged internal sequence.
- Risk: med. The executable SR-75 contract is now sound, but the amendment’s stated evidence and the completed task/design record still overstate what happened and what was tested.
- Suggested fix:
  - Narrow evidence C to the truthful subset: pre-existing configured-path gate/spec-runner tests remained unchanged and pass; explicitly acknowledge that DR-07 was intentionally rewritten for the target behavior.
  - Rewrite T18 to cite the recorded three-state structural comparison, resolver checks, and unaffected regression suite rather than pre-change identity.
  - Remove “call sequence unchanged” from D1.4, or replace it with the narrower tested statement that the underlying builder and runner retain their configured-path behavior and the complete public results are structurally equal after clearing overrides.

No state-A golden is required once these remaining claims are made consistent with the named amendment.

## 2. Semantic faithfulness

The executable scenario coverage is complete:

- GT-30..GT-38 cover the seven-row input classification and eight-row missing-command matrix.
- GT-11 exercises all JSON outcome classes and the independent strict-parser serializer.
- DR-07 matches doctor’s actual branch order and intended changed behavior.
- SR-73 proves shared call-time projection routing and six-fixture equivalence.
- SR-74 proves zero test-runner calls.
- SR-75 now correctly exercises complete Map-safe three-state result equality, runner divergence, exported resolver identity, and private resolver default selection.

## 3. Required behavior versus implementation

No implementation defect found. Gate, doctor, and spec-runner conform to the executable delta contract.

## 4. Continue, skip, and user visibility

No gap found. Skips, blocks, evaluation errors, projection failures, and doctor findings remain visible with the required precedence and diagnostics.

## 5. External input and security

No security gap found. Input validation, config read-failure handling, process isolation, path containment, and error sanitization remain correct.

## 6. Guarantee-claim sweep

Apart from IMPL-2’s remaining record inconsistencies:

- All new zero-call, exact-key, single-implementation, call-time-resolution, and cleanup guarantees have matching tests.
- The current CHANGELOG entry and user documentation make no untested pre-seam byte-identity claim.
- Historical CHANGELOG guarantees and retained GT-21 wording were excluded as instructed.
- KB reconciliation remains the expected STEP6 operation.

## Advisories

None.

## Ledger delta

Apply this exact status change:

- IMPL-2: `fixed (r4) → open` — reopened because `step5-amendment.md` falsely says no old assertion changed, tasks T18 retains the rejected pre-change-identity claim, and design D1.4 still promises an unchanged call sequence that the implementation and tests do not preserve.

IMPL-1, IMPL-3, IMPL-4, IMPL-5, and IMPL-6 remain `verified`. ADV-STEP5-r1 remains `advisory-acked`.

No new ledger rows.

VERDICT: 1 issues open
