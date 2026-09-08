# P1 requirement review — change-bundle (round 2)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: change-bundle-req-review-v2-raw.txt

# P1 Requirement Review — change-bundle v2

## Resolution Check

CB-1 is resolved for scope: CK-10 is now explicitly re-rooted to bundle `review/` dirs and O10 binds a bundle raw secret case.

CB-3 is resolved. The atomic-flip invariant is explicit and acceptance criteria reference the post-boundary command state.

CB-4 is resolved for requirement-history filenames. The table now covers the real hand-copy classes, prefixed req docs, final docs, intent cards, and anomalies.

CB-5 is resolved. The strip-scan is now mechanically testable and scoped to the four live protocol docs.

CB-6 is resolved. O9 binds `package.json.version === 4.0.0`, the changelog entry, and release ordering.

CB-ADV-1 is resolved. O6 covers every `setup-node` job and O10 covers comment hygiene.

CB-2 should be reopened.

## Formal Issues

### CB-2 — P5 design raw mapping is still not deterministic for the real corpus

Description: The migration table says `apriori/design/<name>-review-vN.md + its raw in review/` becomes `review/spec-review-vN.md + review/spec-review-vN-raw.*`, but it does not define the legacy raw filename patterns that count as “its raw.” The real corpus includes `apriori/design/change-projection-review-v1.md` with raw evidence named `apriori/review/change-projection-step2-review-v1-raw.txt`, not `change-projection-review-v1-raw.txt`.

Risk: A literal migration can leave `step2-review-v1-raw.txt` as an “other X” file while the migrated doc becomes `spec-review-v1.md`, causing C5 to fail or miss evidence.

Suggested fix: Add explicit rows for P5 raw aliases, at least `apriori/review/<name>-review-vN-raw.*` and `apriori/review/<name>-step2-review-vN-raw.*` → `review/spec-review-vN-raw.*`, with collision abort if both exist.

### CB-7 — CK-10 bundle-root traversal lacks containment rules

Description: CK-10 now scans every `review/` under active and archived changes, but the requirement does not say how to handle symlinked change dirs, symlinked archived dirs, or symlinked `review/` dirs. The old flat scan only had one root; the new root discovery is itself an input surface.

Risk: The secret scanner can read outside the workspace or silently skip/scan the wrong evidence tree. This is a security/correctness gap.

Suggested fix: Require realpath containment before scanning any discovered change dir and `review/` dir. Symlinked dirs/files should be warn-skip or fail-closed consistently, and the test should cover an escaping bundle `review/`.

### CB-8 — `spike/` deletion conflicts with the “no post-commit writes” archive claim

Description: O2 says `spike/` is deleted first on the explore track, but also says archive has no post-commit writes. Current archive ordering commits stores before moving the change dir, so command-deleting `spike/` before the move would be a post-commit write unless the requirement specifies a new pre-commit deletion phase.

Risk: Implementers can place deletion in different phases, changing failure atomicity and rerun behavior.

Suggested fix: Define exactly who deletes `spike/`, when, and with what failure taxonomy. If command-owned, specify a pre-store-commit phase or explicitly allow a post-commit pre-move deletion with rerun behavior. Add acceptance for explore-track `spike/`.

### CB-9 — Missing-ledger behavior is ambiguous for trivial tier

Description: O1 says missing-ledger failure modes report bundle paths, but current gate behavior allows trivial-tier changes to have no ledger (`C4 n/a`). The v2 requirement does not explicitly preserve that rule under the bundle path.

Risk: The bundle migration could accidentally make trivial changes require ledgers, conflicting with current gate semantics.

Suggested fix: State that C4 still treats absent `review/issues.md` as n/a for `tier: trivial`, and blocks medium/large changes with a message naming `<changeDir>/review/issues.md`.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| CB-1 | `check`/CK-10 secret scan omitted from the bundle layout. | Security tripwire stops covering the evidence that matters. | STEP0·r1 | verified |
| CB-2 | Review doc naming + raw-stem migration under-specified for the real corpus. | C5 misses evidence or migration collides. | STEP0·r1 | open |
| CB-3 | Single-layout flip lacked the atomic-ordering rule for self-migration. | Bundle-only code runs while artifacts still flat. | STEP0·r1 | verified |
| CB-4 | Requirement-history normalization did not cover actual archived filename classes. | History misnamed/left behind/overwritten. | STEP0·r1 | verified |
| CB-5 | O5's negative was untestable as written. | Brittle or blind binding. | STEP0·r1 | verified |
| CB-6 | 4.0.0 release state declared but not accepted. | Breaking layout ships under stale 3.x metadata. | STEP0·r1 | verified |
| CB-7 | CK-10 bundle-root traversal lacks containment rules. | Secret scan may read outside the workspace or scan the wrong evidence tree. | STEP0·r2 | open |
| CB-8 | `spike/` deletion conflicts with the “no post-commit writes” archive claim. | Archive failure atomicity and rerun behavior are undefined. | STEP0·r2 | open |
| CB-9 | Missing-ledger behavior is ambiguous for trivial tier. | Trivial changes may wrongly require a ledger. | STEP0·r2 | open |
| CB-ADV-1 | Advisory: every `setup-node` job to 22; init/update comments drop legacy `review/` language. | Low. | STEP0·r1 | verified |

VERDICT: 4 issues open
