**Resolution Checks**

SREQ-1 is reopened. The new flag table is present, but it does not match State A: `init` lists `--dry-run`, while actual `lib/init.js` recognizes only `--tools`, `--test-cmd`, `--language`, `--yes`, and `-y`. `--dry-run` belongs to `update`, not `init`. This conflicts with “no new flags” and “known-flag behavior unchanged.”

SREQ-2 is reopened. The helper contract now says `multi` stops at any `-`-prefixed token, but the “Known-flag behavior” paragraph still says `verify --specs` consumes values “until the next `--` token.” Those two rules conflict.

SREQ-3 is verified. Empty `multi` values now exit 2 naming `--specs`.

SREQ-4 is verified. Repeat semantics are declared: value last-wins, multi accumulates, flag idempotent.

SREQ-5 is verified. S9-S12 cover repeated flags, multi stop, empty multi, and aliases.

SREQ-6 is verified. The requirement now accurately calls out `new` extra-positionals and `stamp --foo` as declared behavior changes.

**Issues By Dimension**

**1. Target State B Clarity**

SREQ-1 — Flag table includes non-existent `init --dry-run`.

Description: The table declares `init --dry-run`, but State A `init` has no such CLI flag. Adding it would violate the out-of-scope “any new flags” rule.

Risk: Implementation may add a new `init` flag by mistake, changing the public surface beyond strictness.

Suggested fix: Remove `--dry-run` from `init` in the flag table. Keep `--dry-run` only on `update`.

SREQ-2 — `verify --specs` stop rule is contradictory.

Description: The helper says `multi` consumes until any `-`-prefixed token, while the flag-table note still says `verify --specs` consumes until the next `--` token.

Risk: Implementers can preserve the old `--` rule or implement the new `-` rule and both claim textual support.

Suggested fix: Update the known-flag paragraph to say `verify --specs` consumes values until the next `-`-prefixed token, with the declared micro-change noted once.

**2. Edge Cases And Exception Paths**

No new issue beyond SREQ-2’s multi-stop ambiguity.

**3. Undeclared Side Effects**

No issue. Parse errors are declared to happen before writes or test-command execution.

**4. Acceptance Criteria Testability**

No new issue. S9-S13 make the helper edge cases testable once the contradictory multi wording is fixed.

**5. State-A Conflicts**

SREQ-1 is the remaining State-A conflict: `init --dry-run` is not real today.

**6. Lineage**

No issue. Target lineage is declared, and the out-of-scope section exists.

**Advisories**

The background still opens with “Every subcommand” silently ignoring unknown args, then later lists `doctor` and `stamp` as strictness islands. The later sentence resolves the factual point, so this is wording only.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SREQ-1 | Flag table declares `init --dry-run`, which is not a State-A flag and would be a new flag. | Public CLI surface can change beyond strictness. | STEP0·r1 | open |
| SREQ-2 | `multi` stop rule still conflicts between “any `-`-prefixed token” and “next `--` token.” | `verify --specs` parsing can be implemented inconsistently. | STEP0·r1 | open |
| SREQ-3 | Empty `multi` values now exit 2 naming `--specs`. | Previously ambiguous. | STEP0·r1 | verified |
| SREQ-4 | Repeat semantics are now declared. | Previously accumulate vs last-wins could diverge. | STEP0·r1 | verified |
| SREQ-5 | S9-S12 now cover helper parser edge cases. | Previously helper edges could ship untested. | STEP0·r1 | verified |
| SREQ-6 | State-A corrections for `new` and `stamp` are now explicit. | Previously behavior changes could be hidden as unchanged. | STEP0·r1 | verified |
| ADV-S1 | Advisory batch remains wording-only: “every subcommand” phrasing is softened by later strictness-island text. | Low; clarity only. | STEP0·r2 | advisory |

VERDICT: 2 issues open
