# Design — change-projection

## Module layout (R1 from the gap report)

All new pure helpers live in `lib/archive-merge.js` (they are merge-family logic); `lib/spec-runner.js` requires them (`archive-merge` does not require `spec-runner` — no cycle; zero-dep holds). `bin/apriori.js` adds one dispatch case (`stamp`) and one USAGE line.

## New pure functions (archive-merge.js)

- `fingerprint(text)` → `sha256:<64hex>` over text with `\r\n|\r` → `\n` normalization (Node `crypto.createHash`).
- `parseStamp(text)` → `{ stamp: 'sha256:…'|'new'|null, problems: [] }` — scans only the region before the first `## <OP> Requirements` heading for stamp lines, and the whole file for extra/misplaced ones (extra or misplaced or malformed → problems).
- `parseRequirementsStrict(text)` → `{ map, duplicates: [names] }` — same regex walk as `parseRequirements`, counting name collisions.
- `parseDeltaStrict(text)` → `{ delta, problems: [] }` — per-section strict parsing (within-section duplicates), cross-section duplicate names, stamp problems folded in by the caller.
- `merge(storeText, delta, change)` — EXTENDED, same signature/return plus:
  - store-side duplicate names (via strict parse) → conflicts (AM-21);
  - REMOVED rerun signature: target absent but `<name>  _deprecated (superseded by <change>)_` present (THIS change only) → `unchanged` ("already deprecated") (AM-10 amended); deprecated by another change → conflict.
- `DEPRECATED_RE = /^###\s+Requirement:.*_deprecated \(superseded by [^)]*\)_/` — exported; single source for spec-runner's exclusion rule and merge's rerun signature.
- `discoverDeltas(changesDir, name)` → `{ files: [{abs, suffix}], errors: [] }` — recursive `.md` scan under `<changesDir>/<name>/specs/`, sorted by suffix; name-regex + realpath containment checks; missing dir / zero files → errors.
- `containsReal(root, target)` → realpath containment (existing paths: `fs.realpathSync` both sides; missing target: walk to nearest existing ancestor). Used by discoverDeltas, store-target mapping, AND `archiveChangeDir` itself — the move helper's guard upgrades from string-prefix to realpath containment covering both the SOURCE and the DESTINATION (`<changes-dir>/archive/…`; a symlinked `archive/` pointing outside the changes root is rejected before any move). This hardens the single-file form too — its only behavior change beyond the CAS check, and only in the symlink-escape case (SPEC-3).
- `buildProjection(storeRoot, deltaFiles, change)` → `{ texts: Map<suffix, projectedText>, modules: [suffix], perModule: Map<suffix, mergeResult>, conflicts: [], errors: [] }` — for each store file under `storeRoot` (recursive `.md`): pass-through unless a delta targets its suffix; for each delta: strict-parse, hygiene problems → errors; CAS check (stamped only) → errors (verify taxonomy) / conflicts (archive taxonomy decided by caller — the builder returns them tagged `casMismatches` separately); merge against the store text (or `''` + `new`-module flag). Nothing touches disk.

## spec-runner changes

- `collectScenarios` extracted core: `collectFromText(text, file, idRe, acc)`; the exclusion rule drops scenario headings inside deprecated blocks (block boundaries = the same `REQ_RE` walk; simplest correct form: strip deprecated blocks from the text before the scenario scan, after `stripFences`). New sibling `collectScenariosFromTexts(map<label,text>, idRe)` reuses the same core; `collectScenarios` (FS form) keeps its signature and return shape.
- `cli`: `--change <name>` branch — mutual exclusion with `--specs` (exit 2); `discoverDeltas` + `buildProjection` from `require('./archive-merge')`; any errors/casMismatches/conflicts → exit 2 (messages to stderr in text mode; §JSON contract in `--json`); otherwise `collectScenariosFromTexts(projection.texts)` and the existing run/evaluate/report pipeline unchanged.
- `verifyJson(run)`: `projection` field added only when the run carries one (`run.projection`), per the req's JSON contract.

## archive cli changes

- `--change` mode (mutually exclusive with `--store`/`--delta`, exit 2): discovery root `<changes-dir default apriori/changes>/<name>/specs/`; store root `apriori/specs/`.
- Four phases per req §Transaction. Phase boundaries in code: `preflight()` (everything in memory, incl. pre-existing-temp check), `stage(ops)`, `commit(ops)`, `move()`. **DI for fault injection:** stage/commit take an `ops` object defaulting to `{writeFileSync, renameSync, rmSync}` — tests inject failing ops to prove AM-15/AM-16 semantics (root-run CI defeats chmod-based injection; DI is the lab lesson).
- Single-file form: unchanged except the CAS check when `parseStamp` finds a stamp (AM-25/AM-27 path).
- Reporting: per-module blocks (suffix header + existing category lines), then one RESULT line.

## stamp subcommand

`stampCli(argv)` in archive-merge.js; `bin/apriori.js` case `'stamp'`. Exactly one positional arg; directory/unreadable → error exit 2; absent → `<!-- apriori-base: new -->`; else `<!-- apriori-base: ${fingerprint(text)} -->`.

## Exit-code mapping (from req CLI tables)

verify --change: validation/discovery/hygiene/CAS/merge-conflict → 2; TAP gaps → 1; GREEN → 0.
archive --change: usage/invalid name/containment/missing change dir → 2; conflicts/CAS/hygiene/zero-op/pre-existing-temp/stage/commit/move failure → 1; merged or all-no-op → 0.

## Docs

RUNBOOK.md + RUNBOOK_cn.md: §4 artifact-interface archive bullet gains `--change` form + stamp mention; STEP5 gate paragraph gains `verify --change` as the intended in-flight form; delta-authoring guidance references `apriori stamp`. README/README_cn cheat-sheet rows. package.json version → 3.1.0 at release (CL-06 keeps passing).

## Test plan sketch (STEP5)

One failing test per new scenario (SR-16..25, AM-13..27, CL-08), named with IDs. Fixtures: tmp dirs with mini store + change trees (cross-platform `node -e` TAP emitters as in 3.0.1). DI-injected rename/write failures for AM-15/16. Symlink fixtures for AM-22 guarded by `fs.symlinkSync` capability try/catch (Windows non-admin can't symlink — skip with TAP skip and keep AM-22 bound via the ancestor-containment case which needs no symlink).

Wait — a skipped test proves nothing and an only-skips scenario is UNBOUND (SR-14). AM-22 therefore binds via the no-symlink-needed containment cases (escaping relative suffix `../…` in a crafted change tree, and missing-ancestor checks); the symlink case runs additionally where the platform allows.
