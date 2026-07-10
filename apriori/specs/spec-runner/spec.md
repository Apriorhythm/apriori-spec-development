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
