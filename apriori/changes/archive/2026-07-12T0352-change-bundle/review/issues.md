# Issue ledger — change-bundle

Rows recorded on behalf of the reviewer (codex session 019f4b30-68f9-7222-9b64-17f52a333b4c; raws: review/*-raw.txt, plain bundle stems).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| CB-1 | check/CK-10 secret scan omitted from the bundle layout. | Security tripwire stops covering the evidence that matters. | STEP0·r1 | verified |
| CB-2 | Review doc naming + raw-stem migration under-specified for the REAL corpus (r2 reopened: P5 raw aliases — step2-review raws). | C5 misses evidence or migration collides. | STEP0·r1 | verified |
| CB-3 | Single-layout flip lacked the atomic-ordering rule for self-migration. | Bundle-only code runs while artifacts still flat. | STEP0·r1 | verified |
| CB-4 | Requirement-history normalization didn't cover actual archived filename classes. | History misnamed/left behind/overwritten. | STEP0·r1 | verified |
| CB-5 | O5's negative untestable as written. | Brittle or blind binding. | STEP0·r1 | verified |
| CB-6 | 4.0.0 release state declared but not accepted. | Breaking layout ships under stale 3.x metadata. | STEP0·r1 | verified |
| CB-ADV-1 | Advisory: every setup-node job to 22; init/update comments drop legacy review/ language. | Low. | STEP0·r1 | verified |
| CB-7 | CK-10 bundle-root traversal lacked containment. | Secret scan reads outside the workspace. | STEP0·r2 | verified |
| CB-8 | spike/ deletion vs no-post-commit-writes conflict. | Undefined archive atomicity. | STEP0·r2 | verified |
| CB-9 | Trivial-tier missing-ledger n/a not preserved. | Trivial wrongly requires a ledger. | STEP0·r2 | verified |
| CBSPEC-1 | Strip-scan regex broke on archived bundle paths (stripped only changes/archive/, stranding the tail). | PR-21 false-fails or gets weakened. | STEP2·r1 | verified |
| CBSPEC-2 | C5/C4 lacked containment on the bundle review/ dir itself. | Evidence read through an escaping symlink. | STEP2·r1 | verified |
| CBSPEC-3 | Non-directory <changeDir>/review unspecified. | Crash or inconsistent C4/C5 on malformed bundles. | STEP2·r2 | verified |
| CBIMPL-1 | Gate treats a dangling bundle review/ symlink as absent because existsSync runs before lstat, so C4/C5 do not block on the review-dir defect required by GT-05. | Malformed review roots can avoid the stage-identical C4/C5 fail-closed guard. | STEP5·r1 | verified |
| CBIMPL-2 | CK-10 discovery follows symlinked change dirs and silently skips dangling review/ symlinks instead of warn-skipping symlinked dirs. | Secret scanning can read unexpected symlinked bundle roots or lose required user-visible warnings. | STEP5·r1 | verified |
| CBIMPL-ADV-1 | Advisory: AM-37 test can more directly assert the legacy bystander is not copied into the archived bundle. | Regression-coverage hardening only. | STEP5·r1 | advisory-acked |
