### Requirement: doctor diagnoses the project-apriori seam
`apriori doctor` SHALL run seven read-only checks (D1 Node floor · D2 init scaffold · D3 runbook freshness · D4 tool pointers · D5 TAP probe · D6 store health · D7 changes overview), each reporting ok/finding/not-applicable with a fix hint on findings, and SHALL encode the aggregate in its exit code: 0 = zero findings (`DOCTOR: HEALTHY`), 1 = ≥1 finding (`DOCTOR: <n> finding(s)`), 2 = unusable (Node below floor, `apriori/` missing entirely, positional-arg usage error) — printing whatever checks already ran. Doctor never repairs and never writes; its ONLY side effect is D5 executing the project's test command once, removed by `--no-run`.

#### Scenario: DR-01 a healthy initialized project reports HEALTHY
- WHEN every applicable check passes on a freshly initialized project with a valid TAP test command
- THEN each check reports ok or not-applicable, the final line is `DOCTOR: HEALTHY`, and the exit code is 0

#### Scenario: DR-02 an uninitialized project is unusable, with guidance
- WHEN `apriori/` does not exist under the target root
- THEN doctor exits 2, the message names `apriori init`, and `--json` reports `result: "UNUSABLE"` with the already-run checks (D1) listed

#### Scenario: DR-03 init-scaffold gaps are findings with their fixer
- WHEN `apriori/runbook.md`, `apriori/specs/`, `apriori/.gitignore` (with its `tmp/` line), or the `apriori/tmp/` dir is missing
- THEN D2 emits ONE check entry PER GAP (each with id `D2`, status finding, naming the file and its fixer `apriori init` / `apriori update`) — the aggregate `findings` count equals the number of finding-status entries; a missing `apriori/process-config.md` is not-applicable (optional, defaults apply), never a finding

#### Scenario: DR-04 runbook freshness points at update, and never contradicts D2
- WHEN the runbook copy differs by any byte from the packaged RUNBOOK.md
- THEN D3 is a finding naming `apriori update`; WHEN the copy is absent THEN D3 is not-applicable ("see D2") — absence is D2's finding alone

#### Scenario: DR-05 detected tools must keep their pointers
- WHEN a tool that `detectTools` finds has a missing rules file, a rules file without the `apriori/runbook.md` pointer, or (command-level tools) a missing command file
- THEN D4 reports a finding per tool naming the file and `apriori init`; a project with no known tool markers reports not-applicable

#### Scenario: DR-06 the TAP probe classifies every plumbing edge
- WHEN the test command (from `--test-cmd` or the config row) runs
- THEN D5 classifies: spawn error, signal kill, `Bail out!`, empty output, zero parsed TAP without a version/plan line (naming `--test-reporter=tap`), a TAP version or non-`1..0` plan with zero result lines ("truncated or malformed"), and a non-zero exit unexplained by parsed TAP failures — each a finding; parsed TAP whose failures explain any non-zero exit is ok (counts as info — test failures are NOT doctor findings), and an exactly-`1..0` plan with exit status 0 is ok ("empty suite") — a `1..0` plan with a NON-ZERO exit is the unexplained-exit finding, classified first

#### Scenario: DR-07 the probe is skippable and degrades honestly
- WHEN no test command is configured anywhere, or `--no-run` is given
- THEN D5 reports not-applicable with the reason (the `apriori init --test-cmd` hint, or "probe skipped") — never a finding

#### Scenario: DR-08 store health flags unbindable and ambiguous scenarios
- WHEN `apriori/specs/` contains scenarios without a leading default-pattern ID, or the same ID in more than one scenario
- THEN D6 reports findings listing them (detail names the default ID pattern); an empty store or zero scenario files is not-applicable ("normal for a new project"); a missing specs dir is not-applicable here ("see D2")

#### Scenario: DR-09 changes overview validates flow-states and surfaces pending gates
- WHEN an active change dir has no readable flow-state.md, or `parseFlowState` yields an empty `change`, or its `change` mismatches the dir name
- THEN D7 reports a finding naming the dir and the failed clause; healthy active changes are info lines; archived candidates (basenames matching `<YYYY-MM-DDThhmm>-<name>`, directories only) are read ONLY when they satisfy realpath containment under `apriori/changes/archive/` — an escaping symlinked entry is skipped with an info note, never read; contained not-DONE/ABANDONED archived changes are listed as info ("gate ④ possibly pending") — never a finding

#### Scenario: DR-10 output is machine-consumable in every class
- WHEN `apriori doctor --json` runs — HEALTHY, FINDINGS, or UNUSABLE (incl. the positional-arg usage error)
- THEN stdout parses as JSON shaped `{ result, findings, checks: [{id, status: "ok"|"finding"|"n/a", detail, fix?}], errors }`

#### Scenario: DR-11 doctor is read-only and rejects stray arguments
- WHEN doctor runs with `--no-run` against any project tree
- THEN no file is created, modified, or deleted; WHEN any positional argument is given THEN doctor exits 2 with usage (pure JSON under `--json`)

#### Scenario: DR-12 the Node floor is enforced testably
- WHEN the detected Node major version (injectable for tests) is below 18
- THEN D1 is a finding entry and doctor exits 2 (`result: "UNUSABLE"`), with D1 listed in the checks; at or above 18 → ok

### Requirement: doctor detects legacy 3.x layout roots
Doctor SHALL check (D8) for the five pre-4.0 scattered roots — top-level `requirement/`, top-level `spike/`, `apriori/review/`, `apriori/design/`, `apriori/explore/` — using existence-level probes only (lstat/exists, never following or reading through); any hit is a finding listing every root found, with a fix pointing at the MIGRATING.md 4.0 section. A clean 4.0 project reports D8 ok; the check performs zero writes.

#### Scenario: DR-13 mixed 3.x layouts are named, clean ones pass
- WHEN a project carries any of the five legacy roots (a directory or a symlink at that path both count), and another project carries none
- THEN doctor reports a D8 finding naming exactly the roots present with a fix pointing at the migration guidance, and the clean project's D8 is ok — with no file content read and nothing written

### Requirement: the probe speaks the same TAP as verify
`classifyProbe` SHALL consume the shared version-aware lexer and judge by the D5 matrix: probe TAP containing failures (any shape, unattributed included) is D5 **ok** with a detail noting the failures are verify's business and the TAP channel itself is healthy; an unsupported TAP version is D5 **finding** naming the version and the supported matrix; a stdout-empty probe whose stderr carries TAP-shaped output is D5 **finding** with a `2>&1` fix; every other classification and doctor's exit taxonomy stay unchanged.

#### Scenario: DR-14 the D5 matrix follows the lexer
- WHEN probes emit: a failing `not ok` with exit 0; a `TAP version 99` stream; TAP on stderr with empty stdout; and a healthy TAP-13 stream
- THEN D5 reports ok (failures noted as verify's business), finding (version named), finding (`2>&1` fix), and ok respectively — with doctor's exit taxonomy unchanged
