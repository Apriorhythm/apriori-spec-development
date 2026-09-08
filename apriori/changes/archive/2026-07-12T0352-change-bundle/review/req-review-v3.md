# P1 requirement review — change-bundle (round 3)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: change-bundle-req-review-v3-raw.txt

# P1 Requirement Review — change-bundle v3

## Resolution Check

CB-2 is resolved. The migration table now explicitly maps both P5 raw alias families, `<name>-review-vN-raw.*` and `<name>-step2-review-vN-raw.*`, to `review/spec-review-vN-raw.*`, with a both-present collision abort.

CB-7 is resolved. CK-10 root discovery now requires discovered change dirs and `review/` dirs to realpath-resolve inside the changes root, with escaping/symlinked dirs warn-skipped consistently with existing file behavior. O10 binds a bundle raw secret case.

CB-8 is resolved. `spike/` disposition is now executor protocol before archive; the command remains track-agnostic and the no-post-commit-writes claim is intact.

CB-9 is resolved. O1 preserves the trivial-tier C4 n/a behavior for absent `<dir>/review/issues.md` and blocks non-trivial changes with the bundle path named.

## New Issues

No new formal issues found.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| CB-2 | Review doc naming + raw-stem migration under-specified for the real corpus; r2 reopened for P5 raw aliases. | C5 misses evidence or migration collides. | STEP0·r1 | verified |
| CB-7 | CK-10 bundle-root traversal lacked containment. | Secret scan reads outside the workspace. | STEP0·r2 | verified |
| CB-8 | `spike/` deletion conflicted with the no-post-commit-writes archive claim. | Undefined archive atomicity. | STEP0·r2 | verified |
| CB-9 | Trivial-tier missing-ledger n/a was not preserved. | Trivial changes wrongly require a ledger. | STEP0·r2 | verified |

VERDICT: no major issues, ready to proceed