<!-- apriori-base: sha256:b80253ac9a3b7eff5d62d2d8ed9d631fbedb0f86afe86935b30e860ff730ecd7 -->

## ADDED Requirements

### Requirement: change-scoped verify separates the change verdict from the store report
On a `--change` run, `verify` SHALL judge its verdict (exit 0/1) on the CHANGE SCOPE only, while reporting the whole projection informatively. The change scope is defined by requirement-block provenance over the projection: the blocks produced or renamed by the delta's ADDED / MODIFIED / RENAMED operations (idempotent reruns included; blocks whose final projected state is deprecated — including rename-then-remove — are excluded), with their scenario occurrences collected at occurrence level. `RENAMED` keeps its store semantics (requirement name only; scenario IDs preserved). The change verdict is GREEN iff every scoped scenario has ≥1 passing test and none red, no scoped occurrence is unidentified, and no scoped scenario ID occurs more than once ACROSS THE WHOLE PROJECTION (a cross-boundary collision is a binding ambiguity of this change; collisions entirely outside the scope go to the store report only). Out-of-scope PASSING tests are never ORPHAN for the verdict; a passing test whose leading ID exists nowhere in the projection is a true orphan, reported in the store report. FAILURE SIGNALS stay fail-closed: a failure is non-blocking ONLY when it is provably attributable — bound to a projection scenario outside the change scope, OR carrying an ID declared as a scenario inside a SIBLING active change's cleanly-parsed delta (strict parse, zero problems, >0 operations; only ADDED/MODIFIED block bodies count — a parallel change's own red is that change's business; the sibling scan is part of the same single title batch; malformed, escaping, symlinked or unreadable sibling material grants NO exemption — skipping is the fail-closed direction; broken sibling material never INDEPENDENTLY creates an infra ERROR, and any failure left unattributed still blocks as GAPS); every `unattributedFailures` entry (no ID, no provenance — it may be this change's own test missing its ID) and every FAILING orphan whose ID appears in NEITHER the projection NOR any sibling delta blocks the change verdict exactly as today. The store report is a COMPLETE informative evaluation of the whole projection against the same TAP snapshot: `boundRed`, `unbound`, true-`orphan`, `unidentified`, `unattributedFailures`, `duplicates` (each a full list whose length is its count; `boundGreen` as a bare count) — out-of-scope reds, duplicates and unidentified MUST stay visible there. Execution follows a conditional single-run contract: invalid pattern → 0 projection builds / 0 content reads / 0 test spawns / 0 TAP parses (the fail-early order stands); projection or title-batch matcher failure → exactly 1 projection, 0 spawns; the normal and post-TAP-error paths → exactly 1 projection, 1 spawn, 1 parse; both views share the one projection and the one parsed TAP snapshot — the report never re-runs tests. Exit semantics: infra ERROR classes are unchanged; solely for `--change`, a non-zero test-process status that is EXPLAINED by parsed failures (`failCount > 0`) with no infra error no longer forces a non-zero exit — a clean change verdict is GREEN exit 0 (a scoped amendment to the non-zero rule; an unexplained non-zero stays ERROR exit 2). `--specs` runs are byte-identical to before.

#### Scenario: SR-56 the change verdict judges only the change scope
- WHEN the store has `R-A`(XA-01) and `R-B`(XB-01), the delta ADDs `R-C`(XC-01), and the test command prints `ok XC-01`, `ok XA-01`, `ok XZ-99` (a PASSING orphan), `not ok XA-01 again` (an out-of-scope bound red), then exits 1
- THEN `verify --change` is GREEN exit 0; the store report carries unbound=[XB-01], orphan=[XZ-99], boundRed=[XA-01]; and the same fixture through `--specs apriori/specs` behaves exactly as today (GAPS). Conversely an ID-less `not ok`, or a FAILING orphan whose ID no sibling change declares (`not ok XQ-77`), turns the change verdict GAPS — unprovable failures stay blocking; a failing test whose ID is declared in a sibling active change's delta is that sibling's business and does not block

#### Scenario: SR-57 change gaps still fail
- WHEN XC-01 has no test (and separately: its only test is `not ok`)
- THEN the run is GAPS exit 1 with the change verdict carrying unbound=[XC-01] (respectively boundRed=[XC-01])

#### Scenario: SR-58 operation semantics bound the scope
- WHEN a delta MODIFIES a block to contain XA-01 and XA-02, REMOVEs a block whose scenario still has a lingering test, RENAMEs `R-A -> R-G` (block contains XA-01), and separately renames-then-modifies (`RENAMED R-A -> R-G` + `MODIFIED R-G`) and renames-then-removes
- THEN the modified block's XA-01 and XA-02 are both in scope; the removed block's scenario is not demanded and its lingering test lands in the store report's orphan; the renamed block's XA-01 stays in scope under its unchanged ID; the rename-then-modify final block is in scope with `operations: ["RENAMED","MODIFIED"]`; the rename-then-remove final deprecated block is out of scope

#### Scenario: SR-59 in-scope strictness blocks the verdict
- WHEN a scoped block contains an unidentified scenario, or a scoped scenario ID also occurs in an untouched store block
- THEN the change verdict is not GREEN (scoped unidentified and cross-boundary duplicates count); a duplicate entirely outside the scope leaves the verdict GREEN-able and appears in the store report's duplicates

#### Scenario: SR-60 the store report loses nothing
- WHEN out-of-scope tests are red, an out-of-scope duplicate exists, and an out-of-scope block carries an unidentified scenario
- THEN none of them blocks the change verdict, and every one of them appears in the store report (boundRed / duplicates / unidentified respectively)

#### Scenario: SR-61 explained non-zero status can be GREEN, unexplained stays ERROR
- WHEN the test command exits 1 and every parsed failure is bound to an out-of-scope projection scenario (known out-of-scope red) and the change verdict is clean
- THEN the run is GREEN exit 0; WHEN the only failures are unattributed or failing orphans THEN the run is GAPS (they block, per the fail-closed rule); and WHEN the command exits non-zero with `failCount === 0` THEN the run stays ERROR exit 2 (the unexplained-non-zero rule is untouched)

#### Scenario: SR-62 the zero-scope truth table holds
- WHEN the change scope is empty
- THEN a pure-REMOVED delta over a non-empty projection is GREEN with the note `0 scenario(s) in change scope (removal-only change)`; a mixed/empty-block delta (ADDED/MODIFIED/RENAMED yielding no scenarios) is GREEN with the generic note plus an ops summary and never the removal-only wording; an all-empty projection is ERROR exit 2 (the global vacuous rule); a scope whose only occurrences are unidentified is GAPS exit 1; a zero-op or malformed delta keeps today's projection-failure ERROR

#### Scenario: SR-63 one projection, one test run, one parse
- WHEN a config-origin `--change` run completes with a counting child-runner seam and a sentinel test command
- THEN the matcher child ran EXACTLY twice — first the full projection-title batch (once, never re-run for the scoped view), second the TAP-description batch — the sentinel counted exactly one test spawn, exactly one projection was built, and both views agree on the same TAP snapshot; a title-batch failure spawns no test (0 spawn), a TAP-batch failure comes after exactly 1 spawn; the invalid-pattern and projection-failure paths spawn nothing (existing assertions)

#### Scenario: SR-64 the JSON contract is pinned for all four outcome classes
- WHEN `--change --json` runs end GREEN, GAPS, pre-test ERROR, and post-TAP ERROR
- THEN GREEN/GAPS carry top-level change-scoped `clean/result/boundGreen/boundRed/unbound/orphan/unidentified/unattributedFailures/duplicates` plus `storeReport` (six classes; array length = count; `boundGreen` a bare count; `unattributedFailures` keeps `{count, lines}`) and `changeScope` (`requirements` as sorted `{file, name, operations[]}`, `scenarioIds` sorted); BOTH ERROR classes omit `storeReport` and `changeScope` entirely (absent, never null); `projection` keeps its existing shape; a `--specs --json` run is unchanged and never carries either field — proven byte-level: golden captures of `--specs` human and JSON outputs (GREEN/GAPS/ERROR, duplicates/unidentified/unattributed/stderr classes) taken against state A compare byte-identical after the change, and the `--specs` run object's own properties never include `storeReport`/`changeScope`

## MODIFIED Requirements

### Requirement: projected verify binds against the candidate merged store
`apriori verify --change <name>` SHALL construct the projection — the store as `apriori archive` would leave it after merging every delta spec under `apriori/changes/<name>/specs/` — in memory, never writing to the living store's location, and SHALL bind scenarios against that projection using the same `merge()` semantics archive uses. Discovery maps `changes/<name>/specs/<suffix>` to `apriori/specs/<suffix>` (`.md` files only); roots resolve against `--cwd` exactly as `apriori status` resolves change dirs.

#### Scenario: SR-16 ADDED delta scenarios join the projection
- WHEN a change carries an ADDED-only delta for a module and `verify --change <name>` runs
- THEN the delta's scenarios join the projection alongside every existing store scenario — the CHANGE VERDICT demands the delta's scenarios while the untouched store scenarios' bindings report in the store report (change-scoped verify), with no duplicate-ID error from the overlay (genuinely duplicate IDs against a scoped scenario remain GAPS)

#### Scenario: SR-17 MODIFIED delta replaces the demanded scenario set
- WHEN a delta MODIFIES a requirement, changing its scenario set
- THEN verification demands exactly the delta's version of that requirement's scenarios; scenarios the modification drops are not demanded

#### Scenario: SR-18 REMOVED delta scenarios are not demanded and their tests orphan
- WHEN a delta REMOVES a requirement whose scenarios have tests still tagged with their IDs
- THEN the projection deprecates the block, its scenarios are not demanded, and each lingering test is reported ORPHAN in the store report — a PASSING lingering test no longer blocks the change verdict (a FAILING one still does unless a sibling change declares its ID)

#### Scenario: SR-19 RENAMED delta demands the post-rename picture
- WHEN a delta RENAMES a requirement Old → New
- THEN verification demands exactly the projected picture — the block's scenarios under their unchanged IDs, with no demand arising from the pre-rename block

#### Scenario: SR-20 merge conflicts make the projection untrustworthy
- WHEN any module's merge reports one or more conflicts
- THEN `verify --change` prints every conflict and exits 2 — it never verifies a partial or wrong projection

#### Scenario: SR-21 projection inputs fail closed
- WHEN the change name is invalid or fails realpath containment, the change dir does not exist, zero delta files are discovered, or any delta file violates a hygiene guard (empty/whitespace-only, content with zero operations, malformed or duplicated base stamp, duplicate requirement names)
- THEN `verify --change` exits 2 with a message naming the offending path or file, and runs no tests

#### Scenario: SR-22 --specs and --change are mutually exclusive
- WHEN `apriori verify --change <name> --specs <dir>` is invoked
- THEN it exits 2 explaining the projection defines the spec set

#### Scenario: SR-23 --json carries the projection contract
- WHEN `verify --change --json` runs — success, gaps, merge conflict, or any projection failure
- THEN stdout is pure JSON in every class: the 3.0.1 fields plus `projection: {change, modules, conflicts}` where modules lists discovered store-relative suffixes (sorted) and conflicts carries merge-conflict strings verbatim; non-`--change` runs never emit a `projection` field

#### Scenario: SR-24 a diverged base stamp blocks projection
- WHEN a discovered delta file carries a base stamp that does not match the current fingerprint of its mapped store file
- THEN `verify --change` exits 2 naming the store path and the expected vs actual fingerprint, and runs no tests
