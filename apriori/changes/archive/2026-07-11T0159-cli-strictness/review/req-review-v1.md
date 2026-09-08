**Issues By Dimension**

**1. Target State B Clarity**

SREQ-1 — Known flag surface is not declared per subcommand.

Description: The requirement says known-flag behavior is “byte-identical to 3.2.0,” but does not list the real flag spec each subcommand must pass to `parseStrict`. This change is specifically a parser rewrite; relying on implementers to rediscover the matrix risks drift.

Risk: A subcommand can accidentally lose or alter a flag while still satisfying the generic helper contract.

Suggested fix: Add a table for each subcommand: `new` positional, `status --change --json`, `verify --specs multi --change --test-cmd --id-pattern --cwd --json`, `archive --store --delta --change --write --changes-dir`, `check --specs --self`, `init --tools --test-cmd --language --yes/-y`, `update --dry-run`, `stamp` positional, `gate --change --test-cmd --cwd --json`, `doctor --test-cmd --no-run --cwd --json`.

SREQ-2 — `multi` consumption conflicts with the “unknown -x” rule.

Description: The helper says a `multi` flag consumes tokens until the next `--`-prefixed token, preserving `verify --specs`. But the goal says unknown `--flag` “or `-x`” must exit 2. With the current `multi` rule, `apriori verify --specs a -x --test-cmd t` consumes `-x` as a spec target instead of rejecting it as an unknown short flag.

Risk: Unknown short flags can still be silently swallowed in the most safety-critical command.

Suggested fix: Define precedence. Either `multi` stops at any dash-prefixed token, or explicitly exempt dash-prefixed spec paths from the unknown-short-flag rule and test that choice.

SREQ-3 — Empty `multi` values are not classified.

Description: The contract defines missing values for `'value'` flags, but not for `'multi'`. `apriori verify --specs --test-cmd x` and `apriori verify --specs` need a deterministic error, ideally naming `--specs`.

Risk: Implementations can fall through to generic usage, consume wrong tokens, or produce inconsistent errors.

Suggested fix: State that a `multi` flag must consume at least one value; if the next token is absent or a terminator flag, exit 2 naming the multi flag.

SREQ-4 — Repeated known flags are not specified.

Description: Current ad-hoc parsers have real repeated-flag behavior: `verify --specs a --specs b` accumulates, many value flags last-write-wins, booleans are idempotent, and `init --tools` currently overwrites if repeated. The requirement says success-path behavior is unchanged but does not encode this.

Risk: Parser helper implementation can change behavior for repeated known flags while the change claims byte-identical known-flag semantics.

Suggested fix: Add duplicate/repeated rules by flag kind: `multi` accumulates across occurrences; `value` last occurrence wins unless otherwise declared; `flag` is true if present; aliases normalize to canonical names.

**2. Edge Cases And Exception Paths**

Covered by SREQ-2 through SREQ-4. `--help` precedence, unknown flags, missing value-at-end, and no-action-on-parse-error are otherwise clear.

**3. Undeclared State Changes Or Side Effects**

No formal issue. The requirement explicitly states strict parse errors must prevent actions, writes, and test-command execution.

**4. Acceptance Criteria Testability**

SREQ-5 — Acceptance criteria do not test the parser edge cases introduced by the helper.

Description: S1-S8 cover help, unknown flags, stray positionals, missing value-at-end, `verify --specs a b c`, and init interactivity. They do not cover empty `multi`, repeated flags, or unknown short flags inside/near `--specs`.

Risk: The helper can pass the listed acceptance criteria while still leaving parser ambiguity in important branches.

Suggested fix: Add acceptance cases for `verify --specs --test-cmd x`, `verify --specs a --specs b --test-cmd x`, and `verify --specs a -x --test-cmd x` with the intended outcome.

**5. Conflicts With Current State A**

SREQ-6 — Current-state claims about `new` and `stamp` are inaccurate.

Description: The requirement says every subcommand silently ignores unrecognized args and that `new`/`stamp` “existing behavior for count violations” is preserved. In State A, `new` takes the first non-flag positional and ignores extra positionals, so `apriori new a b` is not currently a count violation. `stamp` already enforces exactly one argv entry, and a single flag-like token such as `--foo` is treated as the store-file positional, not silently ignored.

Risk: Tests and migration notes can be written against the wrong baseline, making intentional behavior changes look accidental or vice versa.

Suggested fix: Add a State A inventory note that explicitly calls out these exceptions, and mark target behavior for `new` extra args and `stamp --foo` as intentional strictness changes.

**6. Lineage**

No issue. Target lineage is declared as v3 branch and the expected version is stated. The out-of-scope section exists.

**Advisories**

The helper section says it is “required by every cli()”; `stamp` is implemented as `stampCli`, not `cli`. The subcommand behavior is covered elsewhere, so this is wording only.

Consider requiring exact usage strings to include the subcommand name and accepted flags, since S1 only requires they contain `apriori <sub>`.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SREQ-1 | Known flag surface is not declared per subcommand. | Parser rewrite can accidentally alter a command’s accepted flags. | STEP0·r1 | open |
| SREQ-2 | `multi` consumption conflicts with the unknown `-x` rule. | Unknown short flags can still be swallowed by `verify --specs`. | STEP0·r1 | open |
| SREQ-3 | Empty `multi` values are not classified. | `verify --specs --test-cmd x` can be handled inconsistently. | STEP0·r1 | open |
| SREQ-4 | Repeated known flags are not specified. | Claimed unchanged success behavior can drift. | STEP0·r1 | open |
| SREQ-5 | Acceptance criteria omit helper edge cases for empty multi, repeated flags, and short flags near multi. | Green tests can miss parser ambiguity. | STEP0·r1 | open |
| SREQ-6 | Current-state claims about `new` and `stamp` are inaccurate. | Baseline-sensitive tests/migration notes can be wrong. | STEP0·r1 | open |
| ADV-S1 | Advisory batch: wording cleanup for `stampCli` vs `cli()` and stronger usage-string expectations. | Low; clarity only. | STEP0·r1 | advisory |

VERDICT: 6 issues open
