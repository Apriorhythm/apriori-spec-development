# consistency-review-v6 — gate-degrades

## 1. Semantic faithfulness

### IMPL-2 — reopened

The executable SR-75 fix is now sound:

- `snap()` returns the complete public results of `gate.runGate()` and `sr.verify()` directly.
- `assert.deepStrictEqual` compares the populated `verify().results` Map by content.
- All three states run in the same process.
- The installed runner override produces a `notDeepStrictEqual` result, proving that the seam genuinely diverts execution.
- Both overrides are cleared in `finally`.
- The projection resolver’s default is checked by identity; the private runner resolver’s default is checked statically.

Therefore, the Map-safe comparison does prove SR-75’s narrowed three-state claim.

One contradictory guarantee nevertheless remains. The newly added comment in `lib/spec-runner.js` states:

> “Both overrides default to null, so a configured run is byte-identical to its pre-seam form.”

That is the exact pre-seam byte-identity guarantee which SR-75, the delta’s parent Requirement, `req-final.md`, design D1.4, tasks T18, and `step5-amendment.md` now explicitly disclaim as unobservable. No state-A golden exercises it.

This also makes `step5-amendment.md` §四’s “全部清单” incomplete: the source comment is another copy of the retired guarantee beyond the nine recorded locations.

- Risk: med. Runtime behavior is correct, but the changed implementation artifact directly contradicts the normative amendment and preserves the unverified guarantee that IMPL-2 tracks.
- Suggested fix: replace the source comment with the exercised claim, for example: both overrides default to `null`, so the resolvers select the original builder and runner; after an override is cleared, current-process public results are structurally equal to the virgin state. Do not claim byte identity against the pre-seam implementation. Add this source location to the amendment’s correction inventory.

All other scenario tests remain semantically faithful to GT-30..GT-38, modified GT-11 and DR-07, and SR-73..SR-75.

## 2. Required behavior versus implementation

No runtime implementation gap found. Gate, doctor, and spec-runner implement the revised scenario behavior, including projection reuse, call-time seam resolution, deterministic projection errors, and doctor’s corrected branch classification.

## 3. Continue, skip, and user visibility

No gap found. Skipped C1, continued C2–C7 evaluation, blocking results, evaluation errors, and doctor findings remain visible with the required diagnostics and precedence.

## 4. External input and security

No security gap found. Test-command source validation, unreadable configuration handling, id-pattern resolution, child-process isolation, and diagnostic output remain consistent with the contract.

## 5. Guarantee claims

Apart from the stale `lib/spec-runner.js` comment under IMPL-2:

- The three distinct zero-call guarantees use three distinct seams.
- `blocked` is proven to count only blocked checks.
- Exact JSON keys and absence of `code` are exercised across all result classes and the genuine strict-parser error path.
- Single projection implementation, six-fixture full-object equivalence, call-time resolution, cleanup, and exact export surface are exercised.
- The current requirement, delta specs, design, tasks, proposal, amendment, user documentation, and current CHANGELOG entry contain no other unexercised compatibility guarantee.
- Historical CHANGELOG claims and retained GT-21 wording remain outside this change’s scope as directed.

## 6. Classification and matrix conformance

The seven §3.1/§3.1b test-command classifications and eight §3.2 matrix rows remain aligned with `lib/gate.js`. Their precedence is exhaustive and mutually exclusive over the declared input domain; no row is unreachable, misordered, or produces a different aggregate outcome.

## Advisories

None.

## Ledger delta

Apply this exact status change:

- IMPL-2: `fixed (r5) → open` — reopened because the newly added `lib/spec-runner.js` seam comment still promises byte identity with the pre-seam implementation, contradicting the narrowed contract without a state-A golden; consequently, `step5-amendment.md` §四 also omits this additional copy from its claimed complete inventory.

IMPL-1, IMPL-3, IMPL-4, IMPL-5, and IMPL-6 remain `verified`. No new ledger rows.

VERDICT: 1 issues open
