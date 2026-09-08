# Gap report — gate-command (STEP1 / P3)

Inputs: requirement/req-final.md · truth/{status,spec-runner,archive-merge}.md (all KB-checked; status captured this change, "KB-CHECK: accurate") · repo at bd8aaec. Facts only.

## Current state A

- All six check ingredients exist as code: `verify()` (projected + plain, 3.1.0), `configTestCmd`, status's `parseFlowState`/`parseLedger`, `CHANGE_NAME_RE`, `containsReal`, archive-dir naming (`archiveStamp`). Nothing aggregates them; the verdict-evidence rule (§1 layer ①) has no implementation anywhere.
- `status.changeStatus` only looks under `apriori/changes/<name>` — no archived-path resolution exists yet in any module (the KB pitfall). Gate needs its own resolver.
- The repo's own review-raw naming is inconsistent (design-dir docs vs `step2-review` raws in change-projection) — C5's stem rule (D1) is satisfiable only for changes that follow the new convention; this change must name its own STEP2 raws `gate-command-review-v{N}-raw.*` to dogfood C5.
- `parseFlowState` doesn't extract `change:`... it does (key list includes `change`). All required C3 keys are covered by the existing parser.

## Gaps

| # | Gap | Where |
|---|---|---|
| G1 | New module `lib/gate.js`: validation, stage resolution (incl. archive regex/ordering), the six checks, text + JSON reporters, exit mapping | new file |
| G2 | `gate` dispatch + USAGE line | bin/apriori.js |
| G3 | Spec: new store module `apriori/specs/gate/spec.md` (GT-01..) via ADDED delta with `new` stamp; cli block MODIFIED (subcommand list + CL-09) | change specs |
| G4 | Tests: fixture projects covering all outcome classes, incl. archived-stage and read-only assertions | test/gate.test.js |
| G5 | Docs: README/README_cn cheat-sheet row; runbook §1 enforcement-layer text can now name `apriori gate` as the available aggregator (EN/CN) | docs |

## Risks (folded into STEP2)

- R1: C1 reuses `verify()` internals — gate must consume the run OBJECT (not shell out) to classify GREEN/GAPS/ERROR without re-parsing text; that keeps one source of truth.
- R2: C5's doc globs must not match the gate's own review docs from OTHER changes (`<name>-` prefix scoping handles it) — test with two changes side by side.
- R3: read-only guarantee — gate must not create tmp files even via `verify` (verify doesn't write; spawnSync only). Assert in tests by fingerprinting the fixture tree.
- R4: Windows — archive regex and path joins use path.sep-independent basenames; git-dependent C6 tests must tolerate git absence (they create their own repo or accept `–`).

No blockers. Proceed to STEP2.
