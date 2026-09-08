# P1 requirement review — change-bundle (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: change-bundle-req-review-v1-raw.txt

# P1 Requirement Review — change-bundle v1

## Dimension Verdicts

1. Target state B: clear at the high level, but several migration and evidence details are not precise enough for implementation.
2. Edge cases and exception paths: incomplete for self-migration, historical artifact normalization, and secret/evidence scans.
3. Side effects: major tree moves are declared, but the required atomic ordering of code flip plus repo migration is not.
4. Acceptance criteria: mostly testable, but O5’s negative path rule is not mechanically defined.
5. Conflicts with state A: yes, especially `check` CK-10 and the real archived artifact corpus.
6. Lineage: declared as v3 / 4.0.0 and matches the repo reality.

## Formal Issues

### CB-1 — `check`/CK-10 is omitted from the bundle layout

Description: The requirement says `check` is untouched, but `lib/check.js` and CK-10 currently scan `apriori/review/` for committed secrets in review evidence. Target B removes `apriori/review/` and moves raws under `apriori/changes/<name>/review/` and archived bundles.

Risk: A security tripwire silently stops scanning the review evidence that now matters.

Suggested fix: Include `check`/CK-10 in scope. Define the new scan roots as active and archived bundle `review/` dirs, preserve recursive regular-file-only behavior, symlink warnings, absent-dir skip semantics, and add acceptance for a secret inside a bundle raw.

### CB-2 — Review document naming and raw-stem migration are under-specified for the real corpus

Description: The target bundle lists `req-review-v{N}`, `spec-review-v{N}`, `step5-review-v{N}`, and `extraction-review-v{N}`, but the actual repo has legacy stems such as `*-p8-review-v*`, `*-impl-review-v*`, `*-kb-check-raw.txt`, `*-review-v*-raw.txt`, and P5 docs split between `apriori/design/` and raw files in `apriori/review/`.

Risk: C5 can miss evidence, require the wrong raw stem, or collide/overwrite during migration.

Suggested fix: Add an explicit migration table from every legacy review/design/raw stem class to the new bundle basename. Include a uniqueness check per bundle and a C5 scenario proving docs and raws live in the same `review/` dir with the unchanged `<stem>-raw.*` rule.

### CB-3 — Single-layout flip lacks an atomic ordering rule for this repo’s self-migration

Description: DD-3 says no dual support and change-bundle migrates itself mid-flight, but it does not state the ordering invariant: code that reads only bundle paths and the repo artifact migration must land together before any gate/status/check run relies on the new code.

Risk: The implementation can temporarily strand the in-flight change in the old layout while `gate`, `status`, or tests have already flipped to bundle-only, creating a self-inflicted broken state.

Suggested fix: Add a requirement/acceptance criterion: the code flip, tests, docs, and repository artifact migration are one atomic task/commit boundary; after that boundary `apriori gate --change change-bundle`, `status`, `check --self`, and the corpus checks use only the bundle layout.

### CB-4 — Requirement-history normalization does not cover the actual archived filenames precisely

Description: The migration text mentions existing archived `requirement/` subdirs and old `requirement-req-*.md` files, but the repo has mixed forms: `req-prefix-req-v1.md`, `req-sweep-req-v1.md`, top-level archived `requirement-req-v*.md`, and `README-req-v1-lost.md`.

Risk: Requirement history may be renamed inconsistently, left outside `requirement/`, or overwritten when plain names collide.

Suggested fix: Define exact normalization rules for each current class, including collision behavior. Example: `<change>-req-vN.md` → `req-vN.md`, `requirement-req-vN.md` → `req-vN.md`, `<change>-req-final.md` → `req-final.md`, and explicitly disposition anomalous files like `README-req-v1-lost.md`.

### CB-5 — O5’s “legacy literals appear nowhere as write targets” is not mechanically testable

Description: O5 scopes negative assertions to “write targets,” but a test only sees text. The literal `requirement/` can appear legitimately inside bundle paths, prose about requirements, historical notes, or “no requirement/spec files” rules.

Risk: Implementers can write either a brittle false-positive test or a weak test that misses old write instructions.

Suggested fix: Define exact document scope and exact forbidden patterns. For example, limit to live protocol docs (`RUNBOOK*`, `docs/concepts*`) and forbid specific old path forms such as `` `requirement/<change>-` ``, `` `apriori/review/<change>-` ``, `` `apriori/design/<change>-` ``, `` `apriori/explore/` ``, and root `` `spike/` `` when used as an artifact path, with explicit allowlisted bundle paths.

### CB-6 — The 4.0.0 release state is declared but not accepted

Description: The requirement says this is major 4.0.0 and Node floor rides along, but acceptance only binds `engines.node >=22` and CI. It does not require `package.json.version` to become `4.0.0`, nor a changelog/release-note entry for the major layout break.

Risk: The CLI can ship the breaking layout under a stale 3.x package version or without a coherent release record.

Suggested fix: Add acceptance for `package.json.version === "4.0.0"` and a CHANGELOG 4.0.0 entry that states the bundle layout break and Node >=22 floor.

## Advisories

- The Node-floor CI rule should explicitly cover all `actions/setup-node` uses, including golden-path and python-example jobs currently pinned to 20.
- `init`/`update` comments and docs that describe `review/` as a user-owned top-level dir should be updated as part of doc/code truth hygiene.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| CB-1 | `check`/CK-10 is omitted from the bundle layout. | Review-evidence secret scanning stops covering the new evidence location. | STEP0 r1 | open |
| CB-2 | Review document naming and raw-stem migration are under-specified for the real corpus. | C5 can miss evidence, require the wrong raw, or collide during migration. | STEP0 r1 | open |
| CB-3 | Single-layout flip lacks an atomic ordering rule for this repo’s self-migration. | Bundle-only code can run while artifacts are still flat. | STEP0 r1 | open |
| CB-4 | Requirement-history normalization does not cover the actual archived filenames precisely. | Requirement history can be left behind, misnamed, or overwritten. | STEP0 r1 | open |
| CB-5 | O5’s “legacy literals appear nowhere as write targets” is not mechanically testable. | Tests may be brittle or too weak to catch old write instructions. | STEP0 r1 | open |
| CB-6 | The 4.0.0 release state is declared but not accepted. | A breaking layout can ship under stale 3.x release metadata. | STEP0 r1 | open |
| CB-ADV-1 | Advisory: CI Node-floor wording should cover every setup-node job; comments/docs should drop top-level `review/` ownership language. | Low drift risk. | STEP0 r1 | open |

VERDICT: 6 issues open
