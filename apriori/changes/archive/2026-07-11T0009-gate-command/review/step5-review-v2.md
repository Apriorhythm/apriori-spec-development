**Resolution Checks**

GIMPL-1 is resolved. `resolveChange` now filters archived candidates to entries that `stat` as directories, ignores stamp-shaped files, and checks archived containment against `apriori/changes/archive/` rather than the broader `apriori/changes/` root. GT-07 now covers both failure modes from round 1: a stamp-named file decoy and an archived symlink that escapes the archive root.

The prior advisory batch is also addressed: GT-05 now covers symlinked raw evidence, GT-11 covers missing-flow-state and verify-untrustworthy JSON outcomes, and the duplicate README/README_cn gate rows are removed. The remaining GT-12 fingerprint limitation is acceptable because static inspection still shows `gate` itself performs no writes.

**New Gaps**

No new spec-vs-code gaps found in the amended implementation or tests.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| GIMPL-1 | Archived resolution now filters archive candidates to directories and containment-checks against the archive root. | Previously could accept an archived symlink outside `archive/` or select a non-directory candidate. | STEP5·r1 | verified |
| ADV-GIMPL-1 | Advisory batch resolved: raw-symlink, JSON exit-2, and README duplicate-row items addressed; GT-12 fingerprint limitation accepted with static zero-write inspection. | Low; test/doc hygiene only. | STEP5·r1 | advisory-verified |

VERDICT: no spec-vs-code gaps
tokens used
854,237
**Resolution Checks**

GIMPL-1 is resolved. `resolveChange` now filters archived candidates to entries that `stat` as directories, ignores stamp-shaped files, and checks archived containment against `apriori/changes/archive/` rather than the broader `apriori/changes/` root. GT-07 now covers both failure modes from round 1: a stamp-named file decoy and an archived symlink that escapes the archive root.

The prior advisory batch is also addressed: GT-05 now covers symlinked raw evidence, GT-11 covers missing-flow-state and verify-untrustworthy JSON outcomes, and the duplicate README/README_cn gate rows are removed. The remaining GT-12 fingerprint limitation is acceptable because static inspection still shows `gate` itself performs no writes.

**New Gaps**

No new spec-vs-code gaps found in the amended implementation or tests.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| GIMPL-1 | Archived resolution now filters archive candidates to directories and containment-checks against the archive root. | Previously could accept an archived symlink outside `archive/` or select a non-directory candidate. | STEP5·r1 | verified |
| ADV-GIMPL-1 | Advisory batch resolved: raw-symlink, JSON exit-2, and README duplicate-row items addressed; GT-12 fingerprint limitation accepted with static zero-write inspection. | Low; test/doc hygiene only. | STEP5·r1 | advisory-verified |

VERDICT: no spec-vs-code gaps
