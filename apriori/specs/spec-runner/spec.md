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

### Requirement: the TAP plan is a checked promise
When the test command's stdout carries exactly one top-level TAP plan line (`/^1\.\.(\d+)\s*(#.*)?$/` — a trailing `# SKIP`/`# TODO` directive is legal and `N` still parses), the run SHALL be trusted only if the plan total equals the count of top-level TAP result tokens (unnumbered, undescribed, and dashless points count; `ok:`-prefixed diagnostic-like lines, top-level `pragma [+-]<word>` lines, and indented subtest/YAML lines never count) and no top-level test-point number repeats (compared numerically, so `01` duplicates `1`; unnumbered points are exempt). More than one top-level plan SHALL itself be an infra error naming the cure (one TAP stream per verify). A plan appearing MID-STREAM — with top-level test points both before and after it — SHALL be an infra error; a numbered test point OUTSIDE the plan's declared range (e.g. `ok 2` under `1..1`) SHALL be an infra error. Absent plans keep today's behavior — no promise made, none checked. Violations are infra errors (verify exits 2 / RESULT: ERROR; gate exits 2 / ERROR reporting the verify plan error — an untrustworthy run outranks a C1 binding block), never bindings; `verify`, `verify --change`, and `gate` inherit through `infraErrors` with no new wiring.

#### Scenario: SR-26 a truncated plan refuses to verify
- WHEN the test command emits a plan `1..2`, a single passing result, and exit 0
- THEN verify reports RESULT: ERROR (exit 2) naming 2 declared vs 1 parsed, and nothing verifies GREEN

#### Scenario: SR-27 duplicate test-point numbers are untrustworthy
- WHEN one plan is present and two top-level results carry the same number (including `ok 01` vs `ok 1`)
- THEN verify reports RESULT: ERROR naming the duplicated number(s)

#### Scenario: SR-28 multiple plans fail closed even when totals mask
- WHEN the output carries two top-level plans whose declared totals happen to equal the parsed points (`1..2`, one point, `1..1`, two points)
- THEN verify reports RESULT: ERROR naming multiple plans and advising one TAP stream per verify

#### Scenario: SR-29 the point count speaks TAP, not prefixes
- WHEN a plan `1..2` is followed by a numbered described result and a bare `ok`, with an `ok: note` diagnostic line nearby
- THEN the bare point counts toward the plan, the `ok:` line does not, and no plan error is raised

#### Scenario: SR-30 plan-less, skip-all, and nested TAP stay legal
- WHEN output has no plan at all, or a `1..0 # SKIP reason` plan with zero points, or node-style nested TAP whose indented subtest lines carry their own plans and results
- THEN no plan infra error is raised and verification behaves exactly as before

#### Scenario: SR-31 projected verify and gate inherit the plan check
- WHEN a change's projected verify (or `gate --change`) runs against a test command whose TAP plan does not match its results
- THEN `verify --change` exits 2 (RESULT: ERROR) and gate exits 2 reporting the verify plan error (an untrustworthy run is gate ERROR, like every other infra failure — not a mere BLOCKED)

#### Scenario: SR-39 a mid-stream plan is untrustworthy
- WHEN top-level test points appear both before and after a `1..N` plan line
- THEN verify reports RESULT: ERROR naming the mid-stream plan — a plan promises the whole stream, not a suffix

#### Scenario: SR-40 out-of-plan point numbers are untrustworthy
- WHEN the plan is `1..1` and a top-level `ok 2` (or any numbered point outside 1..N) appears
- THEN verify reports RESULT: ERROR naming the out-of-range number

### Requirement: projected verify surfaces unstamped mutation deltas
`verify --change` SHALL print one stderr warning per unstamped mutation delta (same message class as archive's) without affecting the verdict — an otherwise-GREEN run stays GREEN — and `--json` SHALL carry `projection.unstampedMutations` (the store-suffix-relative paths from buildProjection, `[]` when none; the field exists only where `projection` already does).

#### Scenario: SR-32 the projection warns but does not judge
- WHEN a change's delta carries mutation ops without a stamp
- THEN verify --change warns on stderr naming the file and the stamp cure, the run can still be GREEN, --json carries projection.unstampedMutations with the suffix, and an ADDED-only unstamped delta yields an empty list and no warning

### Requirement: unattributed test failures block GREEN
Any top-level non-SKIP/TODO `not ok` SHALL block GREEN regardless of shape. Classification rides the shared TAP lexer: a column-0 point line whose remainder carries a directive (first UNESCAPED `#`, then a word starting with SKIP/TODO case-insensitively) is not a failure; a failing point whose DECODED description (escape table: `\\`→`\`, `\#`→`#`, other backslash pairs literal) leads with a scenario ID — dash-separated or dashless — stays attributed to its scenario; every other failing top-level point is an **unattributed failure**. Unattributed failures make the verdict GAPS (exit 1) even when the test command exits 0; they never downgrade an infra ERROR — when `run.errors` is non-empty both are reported and the exit is 2. `exec.status !== 0` SHALL never produce exit 0. The human report lists a new group (first 20 lines; a line longer than 120 chars is cut to 119 + `…` for a 120-char total; then `… and N more`); `--json` gains top-level `unattributedFailures: {count, lines[]}` with untruncated lines, present with a stable shape in EVERY outcome class (GREEN carries `{count: 0, lines: []}`); `parseTap`'s exported `untaggedFails` field stays present and compatible (doctor consumes it); untagged `ok` points block nothing and change no report/JSON shape beyond the new group.

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

### Requirement: TAP is a version-aware protocol
The TAP stream SHALL be handled by a version-aware line lexer over **stdout only**. Line endings normalize first (CRLF and lone-CR both end a line). The version matrix is CLOSED: no version line, or `TAP version 12|13|14`, is accepted; any other numeric version (0..11, 15+) is an infra ERROR naming the version and the supported matrix; a column-0, YAML-outside line starting `TAP version ` that does not match exact digits is an infra ERROR; at most ONE version line is legal and it must precede every plan/point/bail-out — later or repeated version lines are infra ERRORs; indented or YAML-embedded version strings are diagnostics. Directive detection splits at the first UNESCAPED `#` (backslash escapes the next character); the description decodes `\\`→`\` and `\#`→`#` (other backslash pairs stay literal) before scenario-ID extraction, so `\#` is never a directive delimiter; directives are words STARTING with SKIP/TODO, case-insensitive (`# SKIPPED: platform` skips). `bail out!` matches case-insensitively at any indentation and aborts the run (infra ERROR). A top-level `---` opens a YAML diagnostic block whose lines never participate in any judgment; an unterminated top-level block is an infra ERROR naming its opening line. The ONLY ignored TAP-14 construct is a top-level line exactly shaped `pragma [+-]<word>` (never counted as a point). stderr is a separate diagnostics channel: `--json` carries top-level `stderr: string` in every outcome class (empty string when none, untruncated); the human report lists an `STDERR DIAGNOSTICS` group only when non-empty (first 20 lines, 119+`…` cap, `… and N more`); zero-TAP is judged on stdout alone and its hint names the `2>&1` remedy.

#### Scenario: SR-41 the version matrix is closed
- WHEN streams declare `TAP version 12`, `13`, `14`, no version, and each of `TAP version 0`, `9`, `11`, `15`, `99`, `banana` (column 0, outside YAML)
- THEN the first four verify normally; every version in {0, 9, 11, 15, 99, banana} is RESULT: ERROR (exit 2) naming the version and the supported matrix — while an indented `    TAP version 99` AND a `TAP version 99` inside a closed top-level YAML block both stay diagnostics (TCSPEC-1)

#### Scenario: SR-42 a version line is single and leading
- WHEN a second `TAP version 13` line appears, or a version line appears after the first test point
- THEN each is RESULT: ERROR — the version promise covers the whole stream

#### Scenario: SR-43 escaped hashes are description, not directives
- WHEN a TAP-14 stream carries `not ok 2 - XX-01 cleanup \# TODO is literal text` with exit 0 (the reviewer's reproduced false-green)
- THEN the point is a REAL failure (bound red for XX-01), never a TODO skip; `ok 1 - XX-01 pass \# SKIP nope` stays a pass attributed to XX-01, its decoded description containing a literal `#`; and `not ok 3 - XX-01 x \\# SKIP later` IS a directive skip — the first backslash escapes the second, leaving the `#` unescaped (escape order, TCSPEC-2)

#### Scenario: SR-44 bail-out is case-insensitive and indentation-blind
- WHEN the stream carries `bAiL OuT! environment lost` (any casing, optionally indented)
- THEN the run aborts as an infra ERROR exactly like `Bail out!` today

#### Scenario: SR-45 lone-CR streams cannot hide failures
- WHEN the whole TAP stream uses `\r` (lone CR) line endings and carries a failing point
- THEN the failure is seen (GAPS/bound-red as its shape dictates) — line-ending style never swallows a line

#### Scenario: SR-46 dashless descriptions bind and SKIP-suffixes skip
- WHEN a stream carries `ok 1 XX-01 pass` (legal dashless description) and `not ok 2 - XX-01 cleanup # SKIPPED: platform`
- THEN the first binds to XX-01 as a pass and the second is a directive skip — neither a false UNBOUND nor a false BOUND-RED

#### Scenario: SR-47 stderr is a diagnostics channel with an exact contract
- WHEN a logger writes `not ok 2 - noise` to STDERR while stdout carries a clean plan-matched stream; and a second run has empty stdout with TAP-shaped stderr
- THEN the first run is GREEN with the stderr listed under STDERR DIAGNOSTICS (first 20 lines, 119+`…` cap) and `--json` `stderr` carrying it verbatim — the field present as a string in EVERY outcome class, empty string when silent; the second stays zero-TAP with a `2>&1` remedy in the hint

#### Scenario: SR-48 YAML must close and pragma is the only pass
- WHEN one stream opens a top-level `---` never closed before EOF; another carries `pragma +bail` between points under a matching plan
- THEN the first is RESULT: ERROR naming the unterminated block\'s opening line; the second raises no plan error and no point-count drift (pragma lines are never points)

### Requirement: the configured test command parses as structure
`configTestCmd` SHALL read through the shared structured reader: fenced/commented `test-cmd` rows never take effect, and a `test-cmd` CONFLICT (two live rows, different values) is an infra ERROR (exit 2) naming the conflict — verify never silently picks a row; a missing row keeps today's usage-error path; gate inherits through verify.

#### Scenario: SR-49 a conflicted test-cmd refuses to run
- WHEN process-config carries two live `test-cmd` rows with different values (and, separately, only a fenced `test-cmd` row) and verify runs without --test-cmd
- THEN the conflicted run is RESULT: ERROR (exit 2) naming the config conflict, and the fenced-only run behaves as if no test-cmd were configured (usage error) — never executing the fenced example

### Requirement: the effective id-pattern resolves flag over config over default
`verify` SHALL resolve its effective id-pattern in this order: the `--id-pattern` flag; else the `id-pattern` row of `apriori/process-config.md` (read through the shared structured reader, inheriting the full config-contract — fenced/commented rows inert, same-value duplicates tolerated, different-value rows a consumption-time CONFLICT); else `DEFAULT_ID`. When the flag is present the config key is NOT consumed — a broken or conflicting config row is invisible to a flagged run. The resolved source SHALL be validated (compiled) BEFORE any spec file is read and BEFORE the test command is spawned; an invalid effective pattern is an infra ERROR (exit 2) whose message names its origin — the flag message contains `--id-pattern`, the config message contains `process-config` — through the existing error contract (text mode `error:` lines + `RESULT: ERROR`; `--json` the existing ERROR shape with the message in `errors[]`). Flag presence is judged by PRESENCE, never truthiness: a present-but-empty `--id-pattern` is a flag-origin validation error (`empty --id-pattern`) and never falls back to the config. Pattern-error messages are sanitized AS A WHOLE — the assembled message (raw engine `e.message` never concatenated verbatim) is control-char-stripped and capped at 200 characters INCLUDING any ellipsis, so the raw source can never re-leak through the engine's own message. The two origins carry DIFFERENT trust contracts. The flag is operator-interactive input: compile validation only, matching runs in-process (documented trust assumption); `leadId`'s public semantics are untouched for every origin. A config-sourced pattern is repository input that CI consumes automatically, so EVERY actual application of it (scenario titles before the test command runs; TAP descriptions after) executes inside a terminable child process: a fixed child script shipped with the CLI (never source-interpolated code), spawned `shell:false` with the pattern and the text batch passed as data on stdin, answering on stdout, under a kill budget (SIGKILL). ANY child failure — timeout, spawn error, signal, non-zero exit, malformed output — fails closed through the config-origin sanitized error channel of the consuming command (verify/gate/check exit 2; doctor per its D6 finding rule); a title-batch failure aborts BEFORE the test command is spawned. On a `--change` run the error path still carries the existing `projection` JSON field (`{change, modules, conflicts, unstampedMutations}` with modules from delta discovery — a directory enumeration only; no spec content is read and no test command is spawned on the error path). The recognition contract itself is `leadId` semantics, shared by every consumer: the match starts at the title's first character, a following `[A-Za-z0-9_]` rejects the match, no `\b` is appended, the source compiles as written.

#### Scenario: SR-50 the config row takes effect without a flag
- WHEN `apriori/process-config.md` carries `| id-pattern | [A-Z]+(-[A-Z]+)*-\d+[a-z]* |` and `apriori verify --specs <dir>` runs without `--id-pattern` over scenarios `AC-01`, `AC-08a`, `AC-BIS-01`
- THEN all three are identified (0 UNIDENTIFIED) — whereas the same run without the config row identifies only `AC-01` and reports 2 UNIDENTIFIED

#### Scenario: SR-51 the flag overrides and shields the config
- WHEN `--id-pattern` is passed while the config carries a different — or even a syntactically invalid — `id-pattern` row
- THEN the run binds by the flag's pattern and reports no config error (the overridden key was never consumed)

#### Scenario: SR-52 an invalid effective pattern refuses to run
- WHEN the effective pattern comes from a flag whose source does not compile (or is empty), or from a config row whose source does not compile (no flag given) — including a `--change --json` run
- THEN the run is an infra ERROR (exit 2), the message names `--id-pattern` (flag origin, empty included) or `process-config` (config origin), the WHOLE message is control-char-free and ≤200 chars including ellipsis (the raw source does not re-leak via the engine message — asserted on both origins), the test command is never spawned, no spec content is read, `--json` output keeps the existing ERROR shape with the message in `errors[]`, and a `--change --json` run still carries the `projection` field with its discovered `modules`

#### Scenario: SR-54 catastrophic config matching is terminated, adversarial titles included
- WHEN the config row carries a syntactically valid catastrophic pattern AND the spec titles are crafted to trigger its backtracking (both under the same repository's control) and verify runs without a flag
- THEN the title-matching child is killed within its budget and the run is an infra ERROR (exit 2) whose sanitized message names `process-config` and the termination, with NO test command spawned; the same pattern via `--id-pattern` runs in-process (operator-trusted, documented); the project's real multi-segment pattern over the same store completes normally through the child

#### Scenario: SR-55 every child failure class fails closed
- WHEN the config-origin child runner (via its injectable test seam) is made to fail in each class — timeout, spawn error, signal, non-zero exit, and malformed output (non-JSON stdout; parseable JSON whose `ids` length differs from the input batch; an `ids` element that is neither string nor null)
- THEN every class resolves to the same config-origin sanitized failure (verify: infra ERROR exit 2 naming `process-config`; the flag/default origins never touch the child), and a well-formed child response binds normally — the success shape is exactly one JSON document `{ids}` with `ids.length` equal to the batch length and each element `string|null`

#### Scenario: SR-53 absent flag and config the default binds unchanged
- WHEN neither a flag nor a config row exists
- THEN the effective pattern is `DEFAULT_ID` and the run behaves exactly as before this change
