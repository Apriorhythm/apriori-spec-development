### Requirement: single self-contained apriori CLI
The toolchain SHALL ship as one npm package `apriori-cli` exposing a `bin` named `apriori` with subcommands `init | new | status | verify | archive | check | update` plus a `--version` flag, requiring zero npm runtime dependencies (pure Node stdlib), runnable via global install or `npx`, and failing cleanly (one-line error, no stack trace) on unexpected errors.

#### Scenario: CL-01 subcommand dispatch
- WHEN `apriori <sub> ...` is invoked with sub in {init, new, status, verify, archive, check, update}
- THEN it dispatches to that subcommand; an unknown sub prints usage and exits non-zero

#### Scenario: CL-02 verify subcommand is the spec-runner
- WHEN `apriori verify --specs <dir> --test-cmd <cmd>` runs
- THEN it behaves per the spec-runner requirement (SR-01..08)

#### Scenario: CL-03 archive subcommand is archive-merge
- WHEN `apriori archive --store <f> --delta <f> --change <name> [--write]` runs
- THEN it behaves per the archive-merge requirement (AM-01..06)

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
