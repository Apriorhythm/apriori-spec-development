**Resolution Checks**

SREQ-1 is verified. The flag table now matches the State A surfaces: `init` no longer lists `--dry-run`; `update` still owns `--dry-run`.

SREQ-2 is verified. The stale `verify --specs` “until the next `--` token” wording is gone; the known-flag paragraph now defers to the helper’s single-dash `multi` rule.

**New Issues**

No new formal issues found. The target is now precise enough to hand to implementation.

**Advisories**

The background still starts with “Every subcommand” silently ignores unknown args, then immediately carves out `doctor`, `stamp`, and `new` nuances. This is harmless now, but could be made less absolute.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SREQ-1 | Flag table corrected; `init --dry-run` removed and State A flag surfaces now match. | Previously risked adding a non-existent init flag. | STEP0·r1 | verified |
| SREQ-2 | `verify --specs` wording now defers to the helper’s single-dash `multi` stop rule. | Previously allowed conflicting parser interpretations. | STEP0·r1 | verified |
| ADV-S2 | Advisory batch: soften absolute “every subcommand silently ignores” wording if desired. | Low; clarity only. | STEP0·r3 | advisory |

VERDICT: no major issues
