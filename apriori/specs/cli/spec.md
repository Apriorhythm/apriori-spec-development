### Requirement: single self-contained apriori CLI
The toolchain SHALL ship as one npm package `apriori-cli` exposing a `bin` named `apriori` with subcommands `init | new | hotfix | status | verify | archive | check | update | stamp | gate | doctor` plus a `--version` flag, requiring zero npm runtime dependencies (pure Node stdlib), runnable via global install or `npx`, and failing cleanly (one-line error, no stack trace) on unexpected errors.

#### Scenario: CL-01 subcommand dispatch
- WHEN `apriori <sub> ...` is invoked with sub in {init, new, hotfix, status, verify, archive, check, update, stamp, gate, doctor}
- THEN it dispatches to that subcommand; an unknown sub prints usage and exits non-zero

#### Scenario: CL-02 verify subcommand is the spec-runner
- WHEN `apriori verify --specs <dir> --test-cmd <cmd>` (or `apriori verify --change <name>`) runs
- THEN it behaves per the spec-runner requirements (SR-01..25)

#### Scenario: CL-03 archive subcommand is archive-merge
- WHEN `apriori archive --store <f> --delta <f> --change <name> [--write]` or `apriori archive --change <name> [--write] [--changes-dir <dir>]` runs
- THEN it behaves per the archive-merge requirements (AM-01..27)

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

#### Scenario: CL-18 hotfix subcommand appears in usage and dispatches by verb
- WHEN `apriori` runs with no arguments or `--help`, and separately `apriori hotfix new <name>` / `apriori hotfix archive <name>` / `apriori hotfix nonsense` run
- THEN the usage lists `hotfix`; the two known verbs dispatch to the lane (behavior per HF-01..42); an unknown verb prints the hotfix usage on stderr and exits 2; a bare `apriori hotfix` prints its usage on stdout and exits 0

### Requirement: uniform argument strictness across subcommands
Every subcommand SHALL parse argv through one shared helper with three uniform behaviors: `--help`/`-h` prints that subcommand's usage on stdout and exits 0 (checked before any other validation); an unknown `-`-prefixed token prints `unknown flag` naming it plus the usage on stderr and exits 2 — nothing is silently ignored; positional arity is enforced (`new`, `stamp` and each `hotfix` verb exactly one — the verb itself is consumed by the dispatcher before the shared helper sees argv — all others zero). Known-flag semantics: `value` flags consume exactly the next token (missing → exit 2 naming the flag; repeats last-write-wins), `multi` flags consume until the next `-`-prefixed token (empty set → exit 2 naming the flag; repeats accumulate), boolean flags are idempotent. Success paths of all documented invocations are unchanged; the three declared behavior changes are: `new` extras now error (previously ignored), `stamp --foo` is now an unknown flag (previously its positional), and multi consumption stops at single-dash tokens (previously `--`-only).

#### Scenario: CL-11 every subcommand answers --help
- WHEN `apriori <sub> --help` (or `-h`) runs for each sub in {new, hotfix, status, verify, archive, check, init, update, stamp, gate, doctor}
- THEN usage containing `apriori <sub>` prints on stdout and the exit code is 0, even where required args are missing

#### Scenario: CL-12 unknown flags fail loudly everywhere, before any action
- WHEN `apriori <sub> --no-such-flag` runs for each subcommand — and, for the test-spawning commands (verify, gate, doctor), in an OTHERWISE-VALID project fixture whose configured test command writes a sentinel file
- THEN stderr names `--no-such-flag` alongside the usage, the exit code is 2, and no action is performed: nothing written, and the sentinel proves the test command never executed

#### Scenario: CL-13 positional arity is enforced
- WHEN a zero-positional subcommand receives a stray positional, or `new`/`stamp`/`hotfix new` receive zero or two positionals
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
