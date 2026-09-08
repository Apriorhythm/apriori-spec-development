<!-- apriori-base: sha256:a43c26dba632729c85d7bddb1b8a9419683424fffe09e5144f5980ab41d30aff -->
## ADDED Requirements

### Requirement: unattributed test failures block GREEN
Any top-level non-SKIP/TODO `not ok` SHALL block GREEN regardless of shape. The classifier works line-by-line with at most one trailing CR stripped (the plan pre-scan's discipline): a line matching `/^not ok(?:\s|$)/` at column 0 (the plan pre-scan's own point shape — `not ok:`-style diagnostic prefixes stay non-points, per SR-29) (indented lines are nested subtests and stay excluded) whose remainder carries a `/#\s*(SKIP|TODO)\b/i` directive is not a failure; one matching the strict `N - desc` shape with a leading scenario ID stays attributed to its scenario; everything else — numbered-with-description-but-no-ID, bare, number-only, or dash-less forms — is an **unattributed failure**. Unattributed failures make the verdict GAPS (exit 1) even when the test command exits 0; they never downgrade an infra ERROR — when `run.errors` is non-empty (bail-out, plan mismatch, duplicate points, spawn/signal, zero-TAP, unexplained non-zero exit) both are reported and the exit is 2. `exec.status !== 0` SHALL never produce exit 0. The human report lists a new group (first 20 lines; a line longer than 120 chars is cut to 119 + `…` for a 120-char total; then `… and N more`); `--json` gains top-level `unattributedFailures: {count, lines[]}` with untruncated lines, present with a stable shape in EVERY outcome class (GREEN carries `{count: 0, lines: []}`); `parseTap`'s exported `untaggedFails` field stays present and compatible (doctor consumes it); untagged `ok` points block nothing and change no report/JSON shape beyond the new group.

#### Scenario: SR-33 the teardown false-green is dead
- WHEN the TAP stream is `ok 1 - XX-01 pass` / `not ok 2 - global teardown failed` / `1..2` and the test command exits 1 (the reviewer's reproduced input)
- THEN the verdict is GAPS (exit 1) with the unattributed-failures group reporting 1 line — never GREEN, never exit 0

#### Scenario: SR-34 bare and half-shaped not-ok points block even on exit 0
- WHEN the stream carries a bare `not ok`, a number-only `not ok 3`, a dash-less `not ok 4 teardown`, or a number-less `not ok - teardown failed` at column 0 and the test command exits 0
- THEN each counts as an unattributed failure and the verdict is GAPS (exit 1) — while bare or untagged `ok` points continue to block nothing

#### Scenario: SR-35 directives, nesting, and prefix look-alikes stay exempt
- WHEN a column-0 `not ok 5 # SKIP flaky` (or `# TODO`) appears, an indented `    not ok 1 - subtest detail` appears under a nested TAP block, and a diagnostic-prefix line like `not ok: summary` appears
- THEN none counts as an unattributed failure: directives are exempt in any shape, indented lines remain nested-subtest detail, and non-point prefixes keep SR-29's shape discipline

#### Scenario: SR-36 infra errors keep precedence
- WHEN unattributed failures coexist with an infra error (a plan mismatch or a `Bail out!`)
- THEN the run exits 2 with both the infra error and the unattributed-failures group reported — the new GAPS class never masks a fail-closed ERROR

#### Scenario: SR-37 the reporting contract is exact
- WHEN more than 20 unattributed failures occur, one of them longer than 120 characters, under `--json` and the human report
- THEN the human report lists the first 20 lines (>120-char lines cut to 119 + `…`) and appends `… and N more`; the JSON carries `unattributedFailures.count` and the full untruncated `lines`; a GREEN run carries `{count: 0, lines: []}`; all other JSON fields keep their existing shapes

#### Scenario: SR-38 gate C1 inherits the new GAPS class
- WHEN `gate --change <name>` runs a test command whose TAP carries an unattributed failure
- THEN C1 reports blocked with the verify gap counts — the false-green cannot re-enter through the gate
