# Technical Review — change-projection STEP2 r2

## Resolution Check

SPEC-1: verified. AM-12 is now explicitly scoped to the single-file form, and it cross-references AM-18 for the high-level `--change` move-failure rule. The contradiction is resolved.

SPEC-2: verified. AM-24 and AM-25 now explicitly require both archive surfaces, high-level `--change` and single-file `--store/--delta`, to be exercised.

SPEC-3: verified. AM-22 now includes the move destination, including a symlinked `archive/` case, and `design.md` upgrades `archiveChangeDir` to realpath containment on both source and destination.

## New Issues

No new formal issues found in the amended text.

## Advisories

No new advisories. The prior ADV-3 items were addressed: stamping now occurs before final dogfood verify, and AM-27 subtest coverage is called out in T1.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SPEC-1 | AM-12 retained single-file move-failure semantics but conflicted with high-level AM-18 move-failure semantics. | Tests and implementation could require opposite store states for `--write --changes-dir` move failure. | STEP2·r1 | verified |
| SPEC-2 | Archive CAS scenarios did not explicitly require coverage for both single-file and high-level archive forms. | CAS could be implemented or tested on only one archive surface, leaving the other unsafe. | STEP2·r1 | verified |
| SPEC-3 | Change-dir move destination containment did not cover a symlinked `<changes-dir>/archive/` path. | Archive could move a change outside the intended changes root via symlink traversal. | STEP2·r1 | verified |

VERDICT: no major issues, ready to proceed to execution
