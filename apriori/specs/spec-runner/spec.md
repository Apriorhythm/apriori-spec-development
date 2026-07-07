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
- THEN it prints valid JSON — clean, result (GREEN/GAPS), specFiles, boundGreen/boundRed (with pass/fail counts), unbound, orphan, unidentified — and the exit code still encodes GREEN(0)/GAPS(1)
