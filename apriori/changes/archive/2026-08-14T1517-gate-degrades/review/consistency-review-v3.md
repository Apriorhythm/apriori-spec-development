# consistency-review-v3 — gate-degrades

## 1. Prior finding verification

### IMPL-2 — reopened

The same-process correction is valid, and the installed-runner divergence guard is sound: a no-op `_setTestRunner` would leave the snapshot equal to the virgin result and fail the assertion.

Two gaps remain:

- `JSON.stringify([g, v])` does not snapshot the complete public results as SR-75 claims. `sr.verify()` returns a `Map` in `results`; JSON serialization collapses it to `{}`. It also drops undefined-valued properties. Changes within those parts would not be detected.
- Pre-seam identity was not fully scoped out. The parent requirement still says configured paths are “byte-identical,” frozen B4/AC-GD-09 still require complete pre-change identity, and SR-75’s parenthetical still says that identity is “evidenced” by the old suite passing. The pre-existing tests demonstrate their individual assertions, but they are not a byte-level state-A golden and do not prove that stronger claim.

Risk: med. The test now proves same-process restoration for JSON-representable portions, but it still does not prove its “complete result” wording or the remaining pre-seam guarantee.

Suggested fix:

- Return `[g, v]` directly from `snap()` and use `assert.deepStrictEqual`/`assert.notDeepStrictEqual`, which compare `Map` contents, or recursively normalize Maps and other non-JSON structures without information loss.
- Either add an actual frozen state-A golden for B4/AC-GD-09, or formally narrow the remaining parent requirement, SR-75 parenthetical, and frozen acceptance wording. “The old suite still passes” should be described as regression evidence, not byte-identity proof.

### IMPL-5 — verified

`gate stray --change c --json` is a genuine strict-parser rejection:

- `parseStrict` rejects the unexpected positional argument.
- `withStrict` sees `--json` and invokes the independent `jsonError` serializer.
- The test applies the exact six-key and no-`code` assertions to its output.

This closes the original gap.

## 2. Semantic faithfulness

All scenarios other than the remaining SR-75 mismatch are faithfully exercised.

GT-30..GT-38, modified GT-11, DR-07, SR-73, and SR-74 retain their previously verified coverage. The supplemental GT-30 and SR-73 tests now carry exact bindable IDs.

## 3. Required behavior versus implementation

No new implementation behavior gap found.

Gate’s classification and aggregate ordering, projection reuse, archived behavior, doctor branch precedence, JSON serializers, and human-readable output continue to match their specs.

## 4. Continue, skip, and user visibility

No gap found.

Skipped C1, BLOCKED precedence, ERROR precedence, projection failure, hotfix refusal, flow-state failure, and doctor’s D5 branches remain visible with the required diagnostics.

## 5. External input and security

No security gap found.

The round-three changes affect tests and specification wording only. Input validation, permission-error handling, process boundaries, containment checks, and diagnostic sanitization remain unchanged.

## 6. Guarantee claims and shared state

The projection-builder, test-runner, and matcher-child zero-call guarantees remain independently proven through their respective seams. Override cleanup remains protected by `finally`, and call-time resolution remains tested.

SR-75’s installed-runner guard and same-process structure are now correct, but its complete-result and remaining pre-seam claims are not yet fully supported, as described under IMPL-2.

## Advisories

None.

The corrected SR-73 comment and CHANGELOG test count now match the current tree. The truth-document reconciliation remains the expected STEP6 responsibility.

## Ledger delta

Apply these exact status changes:

- IMPL-2: `fixed (r2) → open` — reopened because JSON serialization omits `verify()`’s Map contents and the artifacts still claim pre-seam byte identity without a state-A golden.
- IMPL-5: `fixed (r2) → verified`.
- IMPL-1, IMPL-3, IMPL-4, and IMPL-6 remain `verified`.
- ADV-STEP5-r1 remains `advisory-acked`.

No new ledger rows.

VERDICT: 1 issues open
