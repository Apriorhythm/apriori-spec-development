### Requirement: single self-contained apriori CLI
The toolchain SHALL ship as one npm package `apriori-cli` exposing a `bin` named `apriori` with subcommands `init | new | status | verify | archive | check | update | stamp | gate | doctor` plus a `--version` flag, requiring zero npm runtime dependencies (pure Node stdlib), runnable via global install or `npx`, and failing cleanly (one-line error, no stack trace) on unexpected errors.

#### Scenario: CL-01 subcommand dispatch
- WHEN `apriori <sub> ...` is invoked with sub in {init, new, status, verify, archive, check, update, stamp, gate, doctor}
- THEN it dispatches to that subcommand; an unknown sub prints usage and exits non-zero

#### Scenario: CL-02 verify subcommand is the spec-runner
- WHEN `apriori verify --specs <dir> --test-cmd <cmd>` (or `apriori verify --change <name>`) runs
- THEN it behaves per the spec-runner requirements (SR-01..25)

#### Scenario: CL-03 archive subcommand is archive-merge
- WHEN `apriori archive --store <f> --delta <f> --change <name> [--write]` or `apriori archive --change <name> [--write] [--changes-dir <dir>] [--force]` runs
- THEN it behaves per the archive-merge requirements (AM-01..AM-98, AM-107..AM-115) — note the flags are no longer symmetric: `--changes-dir` and `--force` belong to the high-level form alone

#### Scenario: CL-04 check subcommand is the doc checker
- WHEN `apriori check` runs
- THEN it behaves per the check requirement (CK-01..06)

#### Scenario: CL-05 zero runtime dependencies
- WHEN the package is installed
- THEN it pulls no npm dependencies; only Node's standard library is used

#### Scenario: CL-06 --version prints the package version
- WHEN `apriori --version` (or `-v`) is invoked
- THEN it prints the installed package version verbatim on stdout and exits 0

#### Scenario: CL-07 unexpected subcommand failures exit cleanly
- WHEN a subcommand throws an unexpected error (e.g. an unreadable input file)
- THEN the CLI prints a single `apriori: <message>` line on stderr and exits 1 — never a raw stack trace

#### Scenario: CL-08 stamp subcommand appears in usage
- WHEN `apriori` runs with no arguments or `--help`
- THEN the printed usage lists `stamp` alongside the other subcommands (behavior per AM-27)

#### Scenario: CL-09 gate subcommand appears in usage
- WHEN `apriori` runs with no arguments or `--help`
- THEN the printed usage lists `gate` alongside the other subcommands (behavior per GT-01..12); `apriori gate` without `--change` prints its own usage and exits 2

#### Scenario: CL-10 doctor subcommand appears in usage
- WHEN `apriori` runs with no arguments or `--help`
- THEN the printed usage lists `doctor` alongside the other subcommands (behavior per DR-01..12); `apriori doctor <positional>` prints its own usage and exits 2

#### Scenario: CL-18 the retired hotfix verb is refused with a pointer and gone from usage
- WHEN `apriori` runs with no arguments or `--help`, and separately any `apriori hotfix …` form runs (the verb was retired in 6.0 and refuses with a pointer)
- THEN the usage never lists `hotfix`; every `hotfix` form exits 2 on stderr naming its removal in 6.0 and the replacement (`apriori new <name>`; 6.2 has no mode to set) — a retired verb is refused with a pointer, never left to the dispatcher's unknown-command path

### Requirement: uniform argument strictness across subcommands
Every subcommand SHALL parse argv through one shared helper with three uniform behaviors: `--help`/`-h` prints that subcommand's usage on stdout and exits 0 (checked before any other validation); an unknown `-`-prefixed token prints `unknown flag` naming it plus the usage on stderr and exits 2 — nothing is silently ignored; positional arity is enforced (`new` and `stamp` exactly one, all others zero). Known-flag semantics: `value` flags consume exactly the next token (missing → exit 2 naming the flag; repeats last-write-wins), `multi` flags consume until the next `-`-prefixed token (empty set → exit 2 naming the flag; repeats accumulate), boolean flags are idempotent. Success paths of all documented invocations are unchanged; the three declared behavior changes are: `new` extras now error (previously ignored), `stamp --foo` is now an unknown flag (previously its positional), and multi consumption stops at single-dash tokens (previously `--`-only).

#### Scenario: CL-11 every subcommand answers --help
- WHEN `apriori <sub> --help` (or `-h`) runs for each sub in {new, status, verify, archive, check, init, update, stamp, gate, doctor}
- THEN usage containing `apriori <sub>` prints on stdout and the exit code is 0, even where required args are missing

#### Scenario: CL-12 unknown flags fail loudly everywhere, before any action
- WHEN `apriori <sub> --no-such-flag` runs for each subcommand — and, for the test-spawning commands (verify, gate, doctor), in an OTHERWISE-VALID project fixture whose configured test command writes a sentinel file
- THEN stderr names `--no-such-flag` alongside the usage, the exit code is 2, and no action is performed: nothing written, and the sentinel proves the test command never executed

#### Scenario: CL-13 positional arity is enforced
- WHEN a zero-positional subcommand receives a stray positional, or `new`/`stamp` receive zero or two positionals
- THEN it exits 2 naming the offender — including the declared changes: `apriori new a b` errors naming `b`; `apriori stamp --foo` errors as an unknown flag

#### Scenario: CL-14 missing values fail closed
- WHEN a `value` flag ends argv with no value (`verify --test-cmd`), or a `multi` flag consumes an empty set (`verify --specs --test-cmd t`)
- THEN it exits 2 naming that flag, never consuming undefined or acting on an empty set

#### Scenario: CL-15 repeats and aliases behave declaredly
- WHEN flags repeat or aliases are used
- THEN `verify --specs a --specs b` accumulates both targets, `status --change a --change b` uses `b`, doubled boolean flags act once, and `init -y` equals `--yes`

#### Scenario: CL-16 multi consumption stops at any dash token
- WHEN `apriori verify --specs a -x --test-cmd t` runs
- THEN `-x` is never consumed as a spec target and the command exits 2 naming `-x`

#### Scenario: CL-17 init's no-flag interactive door survives the migration
- WHEN `apriori init` runs with no arguments
- THEN strict parsing succeeds with empty flags and the EXISTING branch decides: non-interactive (no TTY) → init's own usage naming `--tools`, exit 2; a TTY → the interactive tool picker (IN-10's machinery) — the strict parser never converts the bare invocation into an unknown-usage error

### Requirement: the CLI exits only after its output has drained
`bin/apriori.js` SHALL end every run — the success path and the uncaught-error path alike — only after stdout and stderr have drained: when either stream still holds queued bytes (a pipe, where writes are asynchronous), the exit waits for them to be written; when neither does (a TTY, a file), it exits at once as before. The exit code SHALL be unchanged by this: the command's own code on success, 2 on an uncaught error, with the JSON envelope of the view that was asked for still printed whole. No output SHALL be lost to the exit: an envelope read through a pipe parses whole however much the reader had drained before the exit; a reader that closes early SHALL not change the exit code.

#### Scenario: CL-19 status --json through a pipe arrives whole and parses (JP-1)
- WHEN a project with enough in-flight changes that `status --json` runs to several hundred KiB (300 changes) is run with its stdout piped to a parent that reads concurrently
- THEN the envelope parses as JSON, lists all 300 changes, and the exit code is 0

#### Scenario: CL-20 the uncaught-error path drains its envelope too, and exit codes are unchanged (JP-1)
- WHEN a readable project runs `status` (text), an unknown subcommand is given, and a change view is requested while a preloaded fault makes the read of that flow-state throw an error whose message is 1,000,000 bytes — far past what the pre-fix entry point got through under any reader — in `--json` and in text
- THEN the text run exits 0, the unknown subcommand exits 2 as before, the faulted `--json` view exits 2 with an envelope that parses whole and carries the whole injected message, and the faulted text view exits 2 with the whole message on stderr

#### Scenario: CL-21 a reader that closes early never changes the exit code (JP-1)
- WHEN `status --json` is spawned with both streams queued at exit (a preload has written 300 KB to stderr; the 300-change envelope is on stdout) and its stdout piped to a parent that reads one chunk and then closes the pipe while draining stderr normally
- THEN the process exits with the command's own code, 0 — the EPIPE on the closed stream, raised while the exit still waits on the other, is not surfaced as Node's unhandled-error exit 1 — on POSIX only: on Windows a Node child sets its own stdout/stderr pipes blocking (net.Socket via libuv), so nothing is ever queued at exit (the truncation this requirement closes cannot occur there) and this choreography deadlocks — the preload's 300 KB stderr write exceeds the pipe buffer plus the paused parent's 64 KiB pre-read and blocks until the parent reads stderr, which it does only after stdout's first chunk; the test is skipped on `win32` and says why

#### Scenario: CL-22 an early-closed stdout reader leaves the exit code alone on every platform
- WHEN `status --json` is spawned on the 300-change fixture with stderr read from the start, and the parent destroys its stdout pipe after the first chunk
- THEN the process exits with the command's own code, 0, on POSIX and Windows alike — the Windows-safe companion of CL-21, whose paused-stderr premise is POSIX-only

### Requirement: the 6 line's release identity is 6.0.0
The package SHALL identify itself as release `6.0.0` everywhere a reader meets a version: `package.json` and `apriori --version` say `6.0.0`; the packaged runbook's header says `runbook-version: 6.0` (CK-11 compares major.minor, and a project's copy follows through `apriori update`); the CHANGELOG's first second-level heading is the `6.0.0` release and every entry of the line down to `5.0.0` is a subsection of it (no `## Unreleased` heading remains above `5.0.0`); MIGRATING's opening names 6.0.0 as the first release of the 6 line and no section is labelled `(Unreleased)`; and no runtime message in `lib/` or `bin/` names the retired working stage `6.2` — the gate `C2`/`C4` placeholder details, doctor D7's fix, and readiness's legacy notes say `6.0`. The working-stage names (`6.0 slice N`, `6.2`) remain only in history text: CHANGELOG subsections, MIGRATING sections, specs' prose and code comments. Every install line a reader meets — README (both editions, the Quickstart block included), RUNBOOK §0 and docs/ci (both editions) — installs the published package (`npm i -g apriori-cli`, the CI page pinning the major as `apriori-cli@6`); no `github:Apriorhythm/apriori-spec-development` or `#v6-dev` install form remains in those files, in MIGRATING, guides or templates. Decided by the owner on 2026-10-23: 6.0.0 is tagged `v6.0.0`, `release/v6` and `main` are fast-forwarded to it and the package is published to npm; those steps are the owner's release acts, run after this change archives.

#### Scenario: ID-01 in the packed directory, --version, the runbook header, the installed copy and update's target agree
- WHEN the package is packed with `npm pack` and, from the packed `bin`, `--version`, `init --tools claude --yes` in a fresh project, `update` there and `check --self` in the packed tree are run
- THEN `--version` prints `6.0.0`, the packed runbook header is `6.0` and byte-identical to the source runbook and to the project's installed copy, `update` reports the runbook up-to-date and `everything already matches apriori-cli 6.0.0`, and CK-11 raises nothing

#### Scenario: ID-06 6.0.0 is the release identity everywhere a reader meets it
- WHEN `package.json`, the `RUNBOOK.md` header, the `CHANGELOG.md` second-level headings, the `MIGRATING.md` opening and every `lib/` and `bin/` source with its comments stripped are read
- THEN the version is `6.0.0` and the header `6.0`; the CHANGELOG's first `## ` heading is `6.0.0 — 2026-10-23` and the next one is `5.0.0`, with no `## Unreleased` between them; MIGRATING says 6.0.0 is the first release of the 6 line and carries no `(Unreleased)`; and no source string contains `6.2`, while `lib/gate.js` carries `retired in 6.0 — nothing is read` and `ledger retired in 6.0 — open items live in ## Open`

#### Scenario: ID-07 every install line a reader meets installs the published package
- WHEN README.md, README_cn.md, RUNBOOK.md, docs/ci.md, docs/ci_cn.md, MIGRATING.md, every file under docs/, guides/ and templates/ are read
- THEN README's Quickstart block and its install sentence, RUNBOOK §0 and both CI pages carry `npm i -g apriori-cli` (the CI pages as `apriori-cli@6`), and none of the files contains `github:Apriorhythm/apriori-spec-development` or `#v6-dev`
