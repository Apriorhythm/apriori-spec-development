# consistency-review-v4 — gate-degrades

## 1. IMPL-2 verification

### (a) Does the Map-safe comparison prove SR-75’s three-state equality claim?

Yes, for the complete-result structural equality portion.

- `snap()` returns the actual `[runGate(), verify()]` objects from the same process.
- `assert.deepStrictEqual` compares `Map` contents rather than collapsing them.
- The non-empty `verify().results` precondition prevents the Map comparison from being vacuous.
- The installed runner override makes the combined result differ, so the runner clear-and-restore assertion is non-vacuous.
- Projection-seam installation and call-time routing remain independently proven by SR-73.

### (b) Is every surviving guarantee honestly scoped?

No. The amended B4/AC-GD-09 text and SR-75 scenario are honest: they distinguish regression evidence from pre-seam identity and name the residual risk. The rejected-golden rationale is also explicit and technically coherent.

However, stronger untested wording remains in current authoritative artifacts:

- The parent requirement in `specs/spec-runner/spec.md` still says the seams leave “every configured path byte-identical.”
- Design D1.4 still says configured `verify()` calls, parameters, and results remain byte-identical.
- `req-final.md` §3.1c and O5 still say configured behavior is unchanged “character for character.” They cite B4, but carry no amendment marker themselves.
- AC-GD-04 separately promises M5 behavior is byte-identical to state A and is outside the recorded B4/AC-GD-09/SR-75 narrowing.
- SR-75 still says both resolvers return the original functions themselves. Projection identity is asserted directly, but the private test-runner resolver’s exact function identity is not tested; only its behavior and restoration are observed.

The CHANGELOG entry is clean: it does not claim configured paths are pre-seam byte-identical. The touched user docs likewise make no such claim. Existing KB byte-identity statements concern separately tested historical guarantees such as `--specs` goldens, not this seam.

### IMPL-2 — reopened

- Risk: med. The actual three-state test is now sound, but normative prose still promises stronger compatibility than the accepted amendment and evidence provide.
- Suggested fix:
  - Replace the delta parent sentence with the tested three-state structural-equality claim.
  - Update D1.4 and the remaining `req-final` compatibility phrases with explicit amendment markers or narrowed wording.
  - Narrow AC-GD-04 to its exercised outcome and diagnostic contract, or provide state-A evidence.
  - Change “both resolvers return the real functions themselves” to an observable behavioral-default claim, or add a static assertion for the private runner resolver.

## 2. Semantic faithfulness

Apart from IMPL-2’s remaining prose/test mismatch, scenario tests remain faithful:

- GT-30..GT-38 cover classification, continuation, precedence, projection failures, archived behavior, and the three independent zero-call guarantees.
- GT-11 covers every result class and the genuine strict-parser JSON serializer.
- DR-07 matches doctor’s actual branch order.
- SR-73 and SR-74 fully exercise shared projection routing and the no-test-process path.

## 3. Required behavior versus implementation

No new implementation defect found. Gate, doctor, and spec-runner behavior continues to match the narrowed executable contract.

## 4. Continue, skip, and user visibility

No gap found. Skips, blocks, evaluation errors, projection failures, and doctor findings remain visible with the required precedence and diagnostics.

## 5. External input and security

No security gap found. The round-four changes affect tests and specification records, not input validation, permissions, process execution, containment, or logging.

## 6. Shared-state and guarantee audit

The module-level seams have complete initialization, runtime replacement, and cleanup behavior. Every use remains protected by `finally`. Map-safe three-state restoration, call-time projection lookup, and the three distinct zero-call guarantees are exercised.

Only the surviving stronger wording listed under IMPL-2 remains inconsistent with the tested guarantee.

## Advisories

None.

The named amendment is a useful and transparent way to revise a frozen STEP0 artifact; the problem is limited to propagation of that narrowing into all still-authoritative claims.

## Ledger delta

Apply this exact status change:

- IMPL-2: `fixed (r3) → open` — reopened because the Map-safe three-state test is now sound, but the delta parent requirement, design D1.4, several requirement clauses, and the private-runner identity wording still retain guarantees stronger than the recorded narrowing and available evidence.

IMPL-1, IMPL-3, IMPL-4, IMPL-5, and IMPL-6 remain `verified`. ADV-STEP5-r1 remains `advisory-acked`.

No new ledger rows.

VERDICT: 1 issues open
