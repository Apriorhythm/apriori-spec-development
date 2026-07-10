### Requirement: spec-runner binds scenarios to test runs
`apriori verify` SHALL enumerate scenario IDs from the spec store, run the project's own test command, parse its TAP output, and report each scenario's bound/green state. It SHALL exit 0 iff every identified scenario is bound to at least one test and all its tests pass, with no orphans or unidentified scenarios.

#### Scenario: SR-01 every scenario bound and green
- WHEN every spec scenario ID appears in a passing test name
- THEN each is reported BOUND-GREEN and the process exits 0 with "spec is the test suite"

#### Scenario: SR-02 a scenario with no test is UNBOUND
- WHEN a spec scenario ID appears in no test name
- THEN it is reported UNBOUND and the process exits 1

#### Scenario: SR-03 a failing test makes its scenario BOUND-RED
- WHEN a scenario's test emits `not ok`
- THEN the scenario is reported BOUND-RED (with pass/fail counts) and the process exits 1

#### Scenario: SR-04 one scenario, many tests — green iff all pass
- WHEN a scenario ID leads multiple test names and at least one emits `not ok`
- THEN the scenario is BOUND-RED; it is BOUND-GREEN only when all its tests pass

#### Scenario: SR-05 a test with no matching scenario is ORPHAN
- WHEN a test name leads with an ID that no spec scenario carries
- THEN it is reported ORPHAN and the process exits 1

#### Scenario: SR-06 a scenario with no ID is UNIDENTIFIED
- WHEN a `#### Scenario:` heading has no leading ID matching the id-pattern
- THEN it is reported UNIDENTIFIED (unbindable) and the process exits 1

#### Scenario: SR-07 delegates execution to the project's own test command
- WHEN `--test-cmd` is given any command that emits TAP
- THEN the runner runs it as-is and never assumes a language or framework (TAP is the only coupling)

#### Scenario: SR-08 the id-pattern is configurable, default [A-Z]+-\d+
- WHEN `--id-pattern` is omitted
- THEN IDs are matched as `[A-Z]+-\d+`; when given, that pattern governs both spec and test extraction

#### Scenario: SR-09 --json emits a machine-consumable verify report
- WHEN `apriori verify … --json` runs
- THEN it prints valid JSON — clean, result (GREEN/GAPS/ERROR), errors, exec (status/signal/error), duplicates, specFiles, boundGreen/boundRed (with pass/fail/skip counts), unbound, orphan, unidentified — and the exit code still encodes GREEN(0)/GAPS(1)/ERROR(2)

#### Scenario: SR-10 zero parsed TAP results triggers a reporter hint
- WHEN `apriori verify` runs a test command that produces output but not a single parseable TAP result line
- THEN the report is preceded by a warning that the test command is probably not emitting TAP (naming node's `--test-reporter=tap`), so the all-UNBOUND list is not misread as missing tests

#### Scenario: SR-11 execution status is part of the verdict
- WHEN the test command fails to spawn, is killed by a signal, or exits non-zero while every parsed TAP result is green
- THEN verify reports the run untrustworthy and exits 2 (never GREEN); a non-zero exit with matching red TAP remains ordinary GAPS (exit 1)

#### Scenario: SR-12 vacuous inputs fail closed
- WHEN a spec target does not exist, or the targets contain zero spec files, or the spec files contain zero scenarios
- THEN verify reports the missing input and exits 2 — an empty universe is never a GREEN

#### Scenario: SR-13 spec hygiene is enforced
- WHEN the same scenario ID appears in more than one scenario heading, a scenario sits inside a markdown code fence, or a test/scenario name carries an ID followed by a word character — letter, digit or underscore (`XX-01b`, `XX-01_x`)
- THEN duplicates are reported with their files and force GAPS; fenced scenarios are excluded as documentation; and the suffixed ID never binds to `XX-01` — it is unidentified/untagged instead of silently truncated

#### Scenario: SR-14 TAP directives and aborts never count green
- WHEN a TAP result carries a `# SKIP` or `# TODO` directive, or the output contains `Bail out!`
- THEN skipped results count neither pass nor fail (a scenario with only skips stays UNBOUND), and a bailout makes the run an error (exit 2) regardless of earlier green lines

#### Scenario: SR-15 --test-cmd falls back to the config
- WHEN `apriori verify` is invoked without `--test-cmd` and `apriori/process-config.md` carries a `test-cmd` row (written by `apriori init --test-cmd`)
- THEN that command is used; with neither present, usage exits 2

### Requirement: projected verify binds against the candidate merged store
`apriori verify --change <name>` SHALL construct the projection — the store as `apriori archive` would leave it after merging every delta spec under `apriori/changes/<name>/specs/` — in memory, never writing to the living store's location, and SHALL bind scenarios against that projection using the same `merge()` semantics archive uses. Discovery maps `changes/<name>/specs/<suffix>` to `apriori/specs/<suffix>` (`.md` files only); roots resolve against `--cwd` exactly as `apriori status` resolves change dirs.

#### Scenario: SR-16 ADDED delta scenarios join the projection
- WHEN a change carries an ADDED-only delta for a module and `verify --change <name>` runs
- THEN the delta's scenarios are demanded alongside every existing store scenario, with no duplicate-ID error from the overlay (genuinely duplicate IDs in the projection remain GAPS)

#### Scenario: SR-17 MODIFIED delta replaces the demanded scenario set
- WHEN a delta MODIFIES a requirement, changing its scenario set
- THEN verification demands exactly the delta's version of that requirement's scenarios; scenarios the modification drops are not demanded

#### Scenario: SR-18 REMOVED delta scenarios are not demanded and their tests orphan
- WHEN a delta REMOVES a requirement whose scenarios have tests still tagged with their IDs
- THEN the projection deprecates the block, its scenarios are not demanded, and each lingering test is reported ORPHAN (exit 1 until the tests are deleted)

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

### Requirement: deprecated blocks are excluded from verification
In every verify form (plain `--specs` and `--change`), a requirement block whose heading line matches `/^###\s+Requirement:.*_deprecated \(superseded by [^)]*\)_/` SHALL be excluded from scenario collection: its scenarios are neither demanded nor listed, and a test still tagged with such a scenario's ID counts as ORPHAN. On stores containing no deprecated blocks, behavior is identical to 3.0.1.

#### Scenario: SR-25 deprecated block scenarios stop being demanded
- WHEN a store (or projection) contains a deprecated requirement block with scenarios, and a test still carries one of those scenario IDs
- THEN those scenarios appear in no report group, the lingering test is ORPHAN, and all non-deprecated blocks are unaffected
