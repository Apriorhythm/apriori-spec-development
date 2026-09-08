<!-- apriori-base: sha256:307eec8f66291573e1d2361b5cf92ce8530e2f2dedbb4f12c4da9ddf79c7e8fb -->

## MODIFIED Requirements

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
