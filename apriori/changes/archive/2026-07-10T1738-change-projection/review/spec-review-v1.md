# Technical Review — change-projection STEP2

## Issues

### SPEC-1 — AM-12 now conflicts with high-level archive move semantics

Description: The delta keeps AM-12 wording: when `--write --changes-dir` runs and the change-dir move fails, “the store on disk stays byte-for-byte untouched.” New AM-18 says high-level `archive --change --write --changes-dir` moves only after all stores commit, so a move failure leaves committed stores in place. Both scenarios will exist in the same archive-merge spec after archive.

Risk: Tests or implementers can satisfy one scenario and fail the other. This is especially likely because both use the same visible flag phrase, `--write --changes-dir`, but require opposite store state after move failure.

Suggestion: Scope AM-12 explicitly to the single-file form, for example: `apriori archive --store <f> --delta <f> --change <name> --write --changes-dir <dir>`. Keep AM-18 as the high-level form’s rule.

### SPEC-2 — Archive CAS scenarios do not force both archive surfaces to be tested

Description: The requirement says present base stamps are checked by both single-file `archive --store/--delta` and high-level `archive --change`. The delta spec’s AM-24/AM-25/AM-26 say “archive” generically, so one implementation test could cover only one archive surface while leaving the other unchecked.

Risk: A regression can ship where CAS works for `archive --change` but not for the existing single-file form, or vice versa. That is a correctness issue on a compatibility-sensitive path.

Suggestion: Amend AM-24 or add a scenario requiring the same stamped mismatch to fail in both forms. Also make AM-25 explicit that stamp-free behavior remains pre-3.1 for both forms.

### SPEC-3 — Move destination containment is not designed for symlinked `archive/`

Description: v3 requires realpath containment for participating paths, but the design says `archiveChangeDir` may stay string-based. The move destination `<changes-dir>/archive/<stamp>-<name>` is external shared state. If `<changes-dir>/archive` is a symlink outside the changes root, a move can place the change outside the intended tree.

Risk: This is a symlink/path traversal security gap around an external-input path. It also undermines the declared change-dir move invariant.

Suggestion: Treat the archive destination as a participating path. Before moving, validate the realpath of an existing `archive/` directory, or the nearest existing destination ancestor, is strictly inside the realpath of `changesDir`; reject symlink escape with exit 2 before any move.

## Advisories

ADV-3 batch: scenario ID ranges are clean: existing SR-01..15/AM-01..12/CL-01..07 do not collide with new SR-16..25/AM-13..27/CL-08. The CLI MODIFIED block preserves current behavior apart from declared amendments. Consider moving task T7 before the final dogfood verify, or rerun `verify --change change-projection` after stamping, so the final stamped deltas are what STEP5 proves. AM-27 combines several stamp CLI cases under one scenario; use subtests so every branch is exercised.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SPEC-1 | AM-12 retained single-file move-failure semantics but now conflicts with high-level AM-18 move-failure semantics. | Tests and implementation can require opposite store states for `--write --changes-dir` move failure. | STEP2·r1 | open |
| SPEC-2 | Archive CAS scenarios do not explicitly require coverage for both single-file and high-level archive forms. | CAS can be implemented or tested on only one archive surface, leaving the other unsafe. | STEP2·r1 | open |
| SPEC-3 | Change-dir move destination containment does not cover a symlinked `<changes-dir>/archive/` path. | Archive can move a change outside the intended changes root via symlink traversal. | STEP2·r1 | open |
| ADV-3 | Advisory batch: clean ID ranges; T7 should not mutate deltas after the final dogfood verify; AM-27 should use subtests for each stamp CLI branch. | Low. | STEP2·r1 | advisory |

VERDICT: 3 issues open
