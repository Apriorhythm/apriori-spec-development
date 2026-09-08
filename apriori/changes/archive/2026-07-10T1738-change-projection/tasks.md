# Tasks — change-projection (STEP5 consumes this order)

- [x] T1. Failing tests first: one per new scenario — SR-16..25 (test/spec-runner-projection.test.js), AM-13..27 (test/archive-change.test.js; AM-27 covers each stamp-CLI branch via subtests; AM-24/25 exercise BOTH archive surfaces), CL-08 (extend the cli test file) — show the failing run.
- [x] T2. archive-merge.js pure layer: `fingerprint`, `parseStamp`, `parseRequirementsStrict`, `parseDeltaStrict`, `DEPRECATED_RE`, `containsReal`, `discoverDeltas`, `buildProjection`; extend `merge()` (store-dup conflicts, REMOVED already-deprecated rerun signature).
- [x] T3. archive-merge.js cli: `--change` mode (mutual exclusion, four phases with DI `ops`, per-module report); CAS check in single-file form; `stampCli`.
- [x] T4. bin/apriori.js: `stamp` dispatch + USAGE line.
- [x] T5. spec-runner.js: deprecated-block exclusion in collection; `collectScenariosFromTexts`; cli `--change` branch (projection via archive-merge helpers, exit mapping, `--json` projection field in `verifyJson`).
- [x] T6. Stamp this change's own delta files with `apriori stamp` output (dogfood CAS) — BEFORE the final dogfood verify, so the stamped deltas are what STEP5 proves (ADV-3).
- [x] T7. Run full suite green (116/116); `apriori verify --change change-projection` GREEN (dogfood X1: new scenarios bound by T1's tests, stamps in place). NOTE: plain `npm run verify` is GAPS until archive — the new tests are ORPHAN against the pre-merge store, which is precisely the misalignment this change exists to fix; the mid-change gate is the projected form (runbook STEP5 updated accordingly). Plain verify returns GREEN after STEP6's archive.
- [x] T8. Docs: RUNBOOK.md + RUNBOOK_cn.md (§4 archive bullet, STEP5 gate paragraph, delta-authoring stamp reference); README.md + README_cn.md cheat-sheet rows.
- [x] T9. `apriori check --self` PASS; CI matrix considerations verified locally (no printf/echo fixtures; symlink test skip-guarded per design).
