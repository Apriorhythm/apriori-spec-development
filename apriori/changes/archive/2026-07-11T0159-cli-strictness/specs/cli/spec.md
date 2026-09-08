<!-- apriori-base: sha256:0f70116eb937ff2465cf4f5ab18166697b56186264c6c45fcfb4461ef8e16817 -->
# Delta — cli (cli-strictness)

## ADDED Requirements

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
