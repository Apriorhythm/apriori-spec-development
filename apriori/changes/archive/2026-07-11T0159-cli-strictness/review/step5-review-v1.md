**Issues**

SIMPL-1 — Help does not win over earlier parse errors.

Description: CL-11/S6 require `--help`/`-h` anywhere to be checked before any other validation. `parseStrict` scans left-to-right, so `apriori verify --nope --help` returns an unknown-flag error before seeing `--help`. The same applies to a known value flag before help, e.g. `--test-cmd --help`.

Risk: The new uniform help contract is only partially implemented; users can still get exit 2 instead of help depending on argument order.

Suggested fix: Pre-scan argv for `--help` or `-h` after alias resolution before validating any other token, and add tests for `--no-such-flag --help` and `--test-cmd --help`.

SIMPL-2 — `value` flags incorrectly reject dash-prefixed values.

Description: The requirement says a `value` flag “consumes exactly the next token”; only `multi` flags stop at a `-`-prefixed token. `parseStrict` currently treats a next token starting with `-` as missing: `parseStrict(['--test-cmd','-e'], ...)` returns `flag '--test-cmd' needs a value`.

Risk: This is an undeclared behavior change beyond the three allowed changes. It can break documented success paths for known value flags such as `--test-cmd`, `--id-pattern`, `--cwd`, `--change`, `--store`, `--delta`, `--tools`, and `--language` when their legitimate value begins with `-`.

Suggested fix: For `kind === 'value'`, only error when the next token is `undefined`; otherwise consume it verbatim. Keep dash-stopping only for `multi`.

**Advisories**

The unit test name `CL-11..16 parseStrict unit edges` is stale now that CL-17 exists. Low risk, but renaming avoids future review confusion.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SIMPL-1 | `--help`/`-h` does not win over earlier parse errors. | Help behavior depends on argument order, violating CL-11/S6. | STEP5·r1 | open |
| SIMPL-2 | `value` flags reject dash-prefixed values instead of consuming the next token verbatim. | Undeclared success-path behavior change for known flags. | STEP5·r1 | open |
| ADV-SIMPL-1 | Advisory batch: stale parseStrict unit-test name still says CL-11..16. | Low; naming clarity only. | STEP5·r1 | advisory |

VERDICT: 2 issues open
