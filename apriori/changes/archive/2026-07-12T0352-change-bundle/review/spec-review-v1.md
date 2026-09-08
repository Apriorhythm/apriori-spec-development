# P5 design review — change-bundle (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: change-bundle-review-v1-raw.txt

# P5 Design Review — change-bundle v1

## Checks

REMOVED+ADDED scenario reuse is mechanically sound. `collectScenarios` calls `stripDeprecatedBlocks` before scanning scenarios, so the removed AM-36..39 blocks will not duplicate the re-added AM-36..39 IDs. PR-19/PR-20 tests must be deleted because their scenarios become deprecated; keeping those tests would correctly produce ORPHANs.

The gate MODIFIED block is faithful to the store text apart from the intended path updates in GT-03, GT-05, GT-09, the C4 ledger-location sentence, and GT-15. `checkEvidence` is internal to `lib/gate.js`; no exported caller blocks the signature shrink. `status.js` currently reads `apriori/review/<change>-issues.md`, so the planned flip is real and necessary.

Coverage is broad: PR-21 covers O5/O8 docs, AM-36..39 cover O2, GT updates cover O1 and O7, CK-10 covers O10, NW-05 covers O3, status/design covers O4, init/package/CI tasks cover O6/O9. Two design gaps remain.

## Issues

### CBSPEC-1 — The PR-21 strip-scan regex does not handle archived bundle paths

Description: The design proposes stripping `/changes\/[a-z0-9<][^ )`"']*\//g` before asserting zero legacy roots. For an archived bundle path such as `apriori/changes/archive/<stamp>-<change>/requirement/`, that regex strips only `changes/archive/`, leaving `<stamp>-<change>/requirement/` behind. The legitimate bundle mention can then fail the `requirement/` negative.

Risk: PR-21 can either false-fail on valid archived bundle prose or be weakened during implementation, missing real legacy write targets.

Suggested fix: Replace the strip rule with one that removes whole bundle path tokens, including archived forms: `apriori/changes/<name>/...`, `apriori/changes/<change>/...`, concrete examples, and `apriori/changes/archive/<stamp>-<name>/...`. Alternatively, avoid strip-scan and assert exact forbidden legacy write-target patterns with explicit allowlists.

### CBSPEC-2 — Gate C5 does not specify containment for the bundle `review/` directory itself

Description: GT-05 and the design move C5 to `<changeDir>/review/*.md`, but only mention regular files and raw lstat checks. If `<changeDir>/review` is a symlink to another location, `readdir` plus per-file `lstat` can treat outside files as regular evidence docs. `resolveChange` only proves the change dir is contained; it does not prove the nested `review/` root is.

Risk: Gate can read and validate evidence outside the bundle, which is a security/correctness gap in the new layout.

Suggested fix: Require `containsReal(changeDir, reviewDir)` before C5 scans. A symlinked or escaping `review/` should block C5 or exit 2 naming the path. Add a GT-05 subcase for an escaping bundle `review/`.

## Advisories

No advisory findings.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| CBSPEC-1 | PR-21 strip-scan regex does not handle archived bundle paths. | Valid bundle prose can false-fail, or the guard may be weakened and miss legacy paths. | STEP2 r1 | open |
| CBSPEC-2 | Gate C5 lacks containment for the bundle `review/` directory itself. | Evidence scan can read or validate files outside the bundle. | STEP2 r1 | open |

VERDICT: 2 issues open