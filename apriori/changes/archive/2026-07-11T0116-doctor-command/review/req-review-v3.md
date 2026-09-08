**Resolution Checks**

DREQ-1 is verified. D5 now covers the remaining TAP boundary: zero parsed result lines with exactly `1..0` is plumbing OK, while `TAP version 13` or nonzero plans such as `1..3` with no `ok` / `not ok` lines are findings.

DREQ-6 is verified. Positional arguments are now explicitly a usage error: exit 2, and pure JSON with `result: "UNUSABLE"` when `--json` is present.

**New Issues**

No new formal issues found. The v3 additions make the target state testable and consistent enough for implementation.

**Advisories**

The exit-code summary still names only D1 and missing `apriori/` as exit-2 examples, while positional args are also exit 2. A6b and the CLI contract make the behavior clear, so this is only a wording cleanup.

A11 still omits `parseTap` from the reuse list even though D5 depends on parsed TAP failures and bailout detection.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DREQ-1 | D5 now classifies TAP-version/plan output with zero parsed result lines: exactly `1..0` is OK; other TAP version/nonzero-plan zero-result streams are findings. | Previously truncated or malformed TAP output could be classified inconsistently. | STEP0·r1 | verified |
| DREQ-6 | Positional arguments are now a usage error with exit 2 and pure JSON under `--json`. | Previously CLI behavior and tests could diverge on stray arguments. | STEP0·r2 | verified |
| ADV-D2 | Advisory batch: minor wording cleanup remains for exit-code examples and `parseTap` in the reuse list. | Low; clarity only. | STEP0·r3 | advisory |

VERDICT: no major issues
tokens used
931,263
**Resolution Checks**

DREQ-1 is verified. D5 now covers the remaining TAP boundary: zero parsed result lines with exactly `1..0` is plumbing OK, while `TAP version 13` or nonzero plans such as `1..3` with no `ok` / `not ok` lines are findings.

DREQ-6 is verified. Positional arguments are now explicitly a usage error: exit 2, and pure JSON with `result: "UNUSABLE"` when `--json` is present.

**New Issues**

No new formal issues found. The v3 additions make the target state testable and consistent enough for implementation.

**Advisories**

The exit-code summary still names only D1 and missing `apriori/` as exit-2 examples, while positional args are also exit 2. A6b and the CLI contract make the behavior clear, so this is only a wording cleanup.

A11 still omits `parseTap` from the reuse list even though D5 depends on parsed TAP failures and bailout detection.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DREQ-1 | D5 now classifies TAP-version/plan output with zero parsed result lines: exactly `1..0` is OK; other TAP version/nonzero-plan zero-result streams are findings. | Previously truncated or malformed TAP output could be classified inconsistently. | STEP0·r1 | verified |
| DREQ-6 | Positional arguments are now a usage error with exit 2 and pure JSON under `--json`. | Previously CLI behavior and tests could diverge on stray arguments. | STEP0·r2 | verified |
| ADV-D2 | Advisory batch: minor wording cleanup remains for exit-code examples and `parseTap` in the reuse list. | Low; clarity only. | STEP0·r3 | advisory |

VERDICT: no major issues
