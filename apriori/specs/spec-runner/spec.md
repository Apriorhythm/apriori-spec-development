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

#### Scenario: SR-08 the id-pattern is configurable; the default recognises multi-segment and suffixed IDs
- WHEN neither an `--id-pattern` flag NOR a live `id-pattern` row in `apriori/process-config.md` exists — the built-in default is the LAST resort, never the first
- THEN IDs are matched as `[A-Z]+(?:-[A-Z]+)*-\d+[a-z]*` — a widening of the historical `[A-Z]+-\d+` whose compatibility is stated at the RECOGNITION level, not the raw-regex level: for every title the old pattern's `leadId` BOUND, the new one binds the byte-identical ID. (A raw `.match()` comparison would be false — on `AC-30f` the old regex returns `AC-30` and the new one `AC-30f`; on `AC-BIS-01` the old regex can match `BIS-01` from index 3 — but neither of those was ever a BINDING, because `leadId` requires the match to start at index 0 and rejects a trailing `[A-Za-z0-9_]`.) It additionally recognises multi-segment IDs (`AC-BIS-01`, `LIFE-DWS-01`) and lowercase-suffixed ones (`AC-30f`), which real projects use and which the narrow default left permanently unbindable; when given, the configured pattern governs both spec and test extraction

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
- WHEN the same scenario ID appears in more than one scenario heading, a scenario sits inside a markdown code fence, or a test/scenario name carries an ID followed by a word character the effective pattern cannot consume (`XX-01b2`, `XX-01_x`)
- THEN duplicates are reported with their files and force GAPS; fenced scenarios are excluded as documentation; and an ID is NEVER silently truncated to a shorter one — under the default, `XX-01b` binds as the complete `XX-01b` (the lowercase suffix is part of the ID, not a stray trailing character), while `XX-01b2` and `XX-01_x` stay unidentified/untagged because the trailing digit and underscore are still outside every ID shape

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
- WHEN `apriori/process-config.md` carries a row NARROWER than the built-in default — `| id-pattern | [A-Z]+-\d+ |` — and `apriori verify --specs <dir>` runs without `--id-pattern` over scenarios `AC-01`, `AC-08a`, `AC-BIS-01`
- THEN the row governs: only `AC-01` is identified and 2 are UNIDENTIFIED — whereas the same run WITHOUT the row identifies all three through the built-in default. The precedence is demonstrated by the row making the run STRICTER, so the assertion cannot be satisfied by the default alone

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

#### Scenario: SR-53 absent flag and config, resolution still runs through the default channel
- WHEN neither a flag nor a config row exists
- THEN the effective pattern is `DEFAULT_ID`, resolved through the same order and reported through the same channels as always — the RESOLUTION is unchanged, while the SET of titles that pattern recognises is deliberately wider than it was before the default was widened

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

### Requirement: verify --change carries the modified-block integrity report
On a trustworthy `--change` run, `verify` SHALL attach the integrity engine's report for every MODIFIED operation (rename-then-modify targets included, keyed by the post-rename name with the pre-rename block as baseline). The old blocks' scenario titles ride the EXISTING single title batch as a fourth tag class that never enters binding accumulation, scenario counts or the change scope — the two-batch matcher contract stands. JSON: `modifiedIntegrity` is ALWAYS present on GREEN/GAPS (one entry per MODIFIED operation, empty-diff entries included; `file` = store-relative suffix; element shapes, value choices and orderings per the engine's contract; missingLines carry full untruncated text) and ABSENT on every ERROR class and on every `--specs` run (byte goldens continue to prove the latter). Human: a `— MODIFIED INTEGRITY —` section prints an entry when any of dropped/missingLines/ambiguous/titleChanged is non-empty (`!` prefix on dropped/missingLines/ambiguous lines; a plain one-line note per titleChanged; counts only for retained/added), stays entirely silent when every entry's four classes are empty, and truncates lines the state-A way (`slice(0,119)+'…'`). The report never changes the verdict or the exit code.

#### Scenario: SR-65 the report rides the run without touching the verdict
- WHEN a `--change` run's MODIFIED replacement drops KV-02 and loses one AND line, while every scoped scenario is bound green (TAP covering the replacement's scenarios, exit 0)
- THEN the run is still GREEN exit 0; `modifiedIntegrity` carries dropped=[KV-02] and the missing line with full text; the human section prints them with `!`; and removing one scoped test flips the same run to GAPS exit 1 with the identical report attached

#### Scenario: SR-66 presence follows the outcome class
- WHEN `--change --json` runs end GREEN, GAPS, pre-test ERROR and post-TAP ERROR, and a `--specs --json` run executes
- THEN GREEN/GAPS carry `modifiedIntegrity` (an ADDED-only delta yields `[]`; an idempotent MODIFIED — the trim-equal path AND the stamped-rerun repaired path alike — yields its empty-diff entry); both ERROR classes and the `--specs` run omit the field entirely (absent, never null)

#### Scenario: SR-67 the old-block titles join the one batch and bind nothing
- WHEN a config-origin `--change` run with a MODIFIED delta executes with a counting child seam
- THEN the matcher child still runs EXACTLY twice, the first payload contains the OLD block's titles alongside the projection and sibling titles, and the old titles appear in no binding class, no scenario count, no change scope and no store report

#### Scenario: SR-68 the frozen live-specimen fixture reports exactly as hand-derived
- WHEN the engine runs over the frozen copy of the verify-change-scope change's real MODIFIED block (the nine-scenario `projected verify` requirement) against its frozen old store block
- THEN the report deep-equals the hand-derived expectation: retained = ALL NINE scenarios (the two rewrites changed only THEN lines, never titles — hand derivation corrected the earlier assumption), titleChanged=[], dropped=[], added=[], ambiguous=[], and missingLines = exactly the two replaced old THEN lines (scenario SR-16's and scenario SR-18's), full text

### Requirement: a scoped verdict judges a named scenario set, nothing else
`lib/spec-runner.js` SHALL expose `scopedEvaluate(byId, results, scope)`: given the store projection, one TAP snapshot and an explicit set of scenario IDs, it classifies ONLY the scope — each scoped ID lands in bound-green, bound-red or unbound by the same rules the whole-store verdict uses (a scenario whose only results are skips is UNBOUND), and the verdict is clean exactly when the scope carries no red and no unbound member. Store-wide classes are NOT scope classes: results outside the scope are never orphans of a scoped run, and store-wide unidentified scenarios never dirty it — the whole-store verdict keeps its own meaning, unchanged. A scope naming an ID absent from the projection is a caller error surfaced as `missing`, never a silent pass. An empty scope is clean by construction and says so.

#### Scenario: SR-69 the scope is judged and the rest of the store is not
- WHEN the store carries five scenarios of which two are red and one unbound, and the scope names one green scenario
- THEN the scoped verdict is clean with that one scenario bound-green — the store's red and unbound members are outside the scope and outside the verdict

#### Scenario: SR-70 red and unbound inside the scope dirty the scoped verdict
- WHEN the scope names a scenario whose TAP result fails, and separately one with no result at all, and separately one whose only results are skips
- THEN each scoped verdict is unclean, classifying the member as bound-red, unbound and unbound respectively

#### Scenario: SR-71 out-of-scope results are not orphans and an empty scope is clean
- WHEN the TAP snapshot carries results for IDs the scope does not name (some absent from the store entirely), and separately the scope is empty
- THEN the first verdict reports no orphans and stays clean; the second is clean by construction with every class empty

#### Scenario: SR-72 a scope member absent from the projection is a caller error
- WHEN the scope names an ID that the store projection does not carry
- THEN the scoped verdict reports it under `missing` and is unclean — an unknown target is never silently satisfied

### Requirement: the change projection is one shared implementation, reachable without running tests
The delta-to-store projection SHALL be built by exactly ONE implementation, reachable by every consumer through a single replaceable reference. `spec-runner` SHALL export that reference resolver alongside the builder, and `verify` SHALL itself go through it — so that a consumer which needs the projection WITHOUT executing a test command (gate's skipped-C1 path) provably shares `verify`'s code, its inputs, and its failure classes. Two test-only injection seams SHALL exist: one over the projection builder and one over the test-command runner. Each SHALL default to the real function, and installing an override and clearing it SHALL leave a configured run's complete public results structurally identical — the claim is that observable three-state equality, NOT byte-identity against any earlier implementation, which no test inside this repo can observe.

#### Scenario: SR-73 both consumers pass through the same replaceable builder
- WHEN a test wraps the projection builder through its seam and then runs BOTH `verify --change` (with a test command) AND the projection-only path (without one)
- THEN both calls pass through the SAME wrapper — the reference is read at call time, never captured at module load — and the wrapper observes identical `{projection: {modules, conflicts, unstampedMutations, notes}, errors}` for the same change, across clean, unstamped-mutation, malformed-delta, diverged-CAS-base, merge-conflict, and no-delta-files inputs alike; and no consumer reassembles a projection from the underlying delta-discovery primitives instead of going through the shared reference — statically checkable in the consumer's own source

#### Scenario: SR-74 the projection-only path spawns no test process
- WHEN the projection is built through the projection-only path
- THEN the test-command runner seam records ZERO calls — the projection is produced before, and independently of, any test execution; the id-matcher child seam is a different seam and proves nothing about this

#### Scenario: SR-75 the seams are inert by default
- WHEN no seam override is installed
- THEN the exported projection resolver returns the real builder itself (directly assertable), the private test-command resolver defaults to the real runner (statically assertable in `spec-runner`'s own source, since it is not exported), and the COMPLETE public results of a configured `verify --change` and a configured `gate` are identical in three states observed in ONE process: before any override exists, after a projection override is installed and cleared, and after a test-runner override is installed and cleared — and while a runner override IS installed the configured result must differ, so the after-clear comparison can never be vacuous. Identity against the PRE-seam implementation is deliberately NOT claimed here: no test inside this repo can observe it, and the pre-existing suite passing unchanged is regression EVIDENCE, not a byte-identity proof.
