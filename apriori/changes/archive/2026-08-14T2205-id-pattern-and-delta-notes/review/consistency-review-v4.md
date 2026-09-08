# STEP5 Consistency Review — Round 4

## Summary

The AM-47 remediation is verified, and SR-54’s primary benign control is now sound. However, IMPL-8 must be reopened because a second SR-54 successful config-origin control remains non-discriminating at the end of `test/id-pattern.test.js`.

No production-code or security defect was found.

## IMPL-8 verification

### AM-47 — verified

`titleChanged` is genuinely pattern-dependent.

`compareModifiedBlock` groups scenario headings as follows:

- When `idOf(title)` returns an ID, that ID is the pairing key.
- When no ID is recognized, the normalized complete title becomes the key.

For the amended fixture:

- With the lowercase config pattern, both headings bind as `ac-08a`. They share a key, so the changed title produces `titleChanged: ac-08a old title -> ac-08a new title`.
- Without the row, the default recognizes neither lowercase ID. The normalized old and new titles differ, so they do not pair; the result is dropped plus added, with no `titleChanged`.

The test asserts the distinguishing `titleChanged` presence and absence and the dropped old title. That is sufficient to prove that the config row changes the integrity comparison.

### SR-54 primary benign control — verified

The new control is sound:

- Configured tree: lowercase IDs `ac-01` and `ac-bis-01` are recognized by `[a-z]+(-[a-z]+)*-\d+`, producing GREEN.
- Otherwise-identical tree without the row: the uppercase-only built-in default cannot recognize those IDs, and the result must not be GREEN.

Because the spec and TAP inputs are otherwise identical, ignoring the config row would make the configured assertion fail. The row is therefore behaviorally discriminating.

### IMPL-8 — reopened

A second SR-54 control remains at the end of `test/id-pattern.test.js`, inside:

`SR-54 a TAP-batch failure after the test command still fails closed, and the real pattern passes the same store`

Its successful contrast still configures:

`[A-Z]+(-[A-Z]+)*-\d+[a-z]*`

This is language-equivalent to the widened built-in default. Its assertions—GAPS, no matcher error, and one unidentified adversarial title—would all remain true if the config row were ignored and matching fell back to the in-process default.

- **Risk:** med
- **Suggested fix:** Instrument the child seam for this successful contrast and assert the expected title and TAP batches pass through it, or replace its benign fixture with a pattern/title language the built-in default rejects and add a no-row reverse control.

## P8 dimension review

### 1. Semantic faithfulness

All twelve scenarios added or amended by this change remain faithfully covered:

| Scenario | Result |
|---|---|
| SR-08 | Faithful |
| SR-13 | Faithful |
| SR-50 | Faithful |
| SR-53 | Faithful collectively |
| CK-13 | Faithful |
| CF-12 | Faithful |
| CF-18 | Faithful |
| DR-19 | Faithful |
| DR-20 | Faithful |
| AM-71 | Faithful |
| AM-72 | Faithful |
| AM-73 | Faithful |

The remaining issue concerns an existing SR-54 successful config-origin assertion affected by the widened default.

### 2. Required behavior missing from code

No required production behavior is missing. The unresolved issue is test discrimination: current code uses the child correctly, but the remaining SR-54 control would not detect fallback to the default path.

### 3. Continue, skip, and silently ignored branches

The archive parser still matches the required order:

- Legal operation h2.
- Notes h2.
- Generic unrecognized h2.
- Skipped-region continuation.
- Notes opacity.
- Stamp processing.
- Requirement processing.
- Guarded non-Requirement h3 problem.
- Requirement-body accumulation.

No ignored branch requires an additional user-visible result.

### 4. External input and security

No security gap found.

Config-origin patterns remain isolated in the terminable child. Diagnostics are bounded. Notes opacity cannot authorize mutations because hidden stamps are ignored and CAS default-deny remains effective.

### 5. Guarantee claims

The explicit guarantees remain covered:

- Systematic byte-identical old-binding compatibility.
- Real-store compatibility.
- Archive-corpus clean parsing.
- D5 independence from `DEFAULT_ID`.
- D6 class count, sample order, sample cap, source, and origin.
- Template synchronization across all three locations.
- Notes-only refusal.
- Hidden-stamp CAS default-deny.
- Four-consumer fresh-init agreement.

### 6. Updated and affected pre-existing tests

The six implementation-updated tests remain faithful rather than loosened:

1. Config CF-12 — faithful.
2. SR-50 — faithful and discriminating.
3. CK-13 — faithful and discriminating.
4. DR-16 — faithful; origin remains asserted.
5. Documentation/template CF-12 — faithful.
6. SR-13 — faithful and strengthened.

The broader affected-test sweep concludes:

- GT-22 and GT-23 are now discriminating.
- AM-47 is now discriminating.
- SR-54’s primary benign control is now discriminating.
- SR-54’s later same-store success contrast remains non-discriminating — reopened IMPL-8.
- No loose zero-count assertion remains.
- No other custom-pattern fixture was found whose scenario proof became vacuous because of the widened default.

## Advisories

The retired SR-08 and SR-53 test titles have been corrected. No remaining advisory warrants recording.

## Ledger delta

### Status update

| ID | Previous status | New status | Review note |
|---|---|---|---|
| IMPL-8 | fixed (r3) | open | Reopened: AM-47 and the primary SR-54 control are fixed, but the later SR-54 same-store success contrast still uses a pattern language-equivalent to the default and does not prove successful config-origin child execution |

No new ledger IDs.

VERDICT: 1 issues open
