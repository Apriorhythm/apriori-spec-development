# P5 design review — tap-plan (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/tap-plan-review-v1-raw.txt

**Issues**

**TPSPEC-1 — `infraErrors` compatibility with existing run shapes is not specified**

Description: The design says `parseTap` adds fields and “existing callers destructure what they need,” but the new guards are in exported `infraErrors(run)`, not only in `parseTap`. Existing unit callers already call `infraErrors` with the current run shape and no `plans`, `points`, or `dupNumbers`. If the implementation follows the design literally with `run.plans.length`, that path will throw instead of returning infra errors.

Risk: This is a signature break on an exported helper and can fail existing tests or external callers. It also violates the design’s “no signature breaks” claim.

Suggestion: Specify defensive defaults in `infraErrors`: `plans = run.plans || []`, `points = run.points || 0`, `dupNumbers = run.dupNumbers || []`. Also state the verify-created run object carries the real fields, while direct/legacy infraErrors callers remain valid.

**TPSPEC-2 — Duplicate-number extraction regex can false-positive on non-numbered point text**

Description: The design’s duplicate-number collector uses `/^(?:ok|not ok)\s+(\d+)/`. That captures digits even when they are not a complete TAP test-point number token, e.g. `ok 1abc`. The point-count matcher intentionally treats broader unnumbered/undescribed result tokens as points, but the duplicate-number rule should only apply to actual numeric point numbers.

Risk: A legal-ish unnumbered point whose description begins with digits, or garbled diagnostic output that still starts with `ok `, can trigger a duplicate-number infra error incorrectly.

Suggestion: Require a boundary after the numeric point token, e.g. `/^(?:ok|not ok)\s+(\d+)(?:\s|$)/`, and keep unnumbered points exempt from `dupNumbers`.

**Coverage Notes**

SR-26..31 faithfully cover req-final E1-E9:
- SR-26 maps E1.
- SR-27 maps E2, including numeric `01` vs `1`.
- SR-28 maps E3.
- SR-29 maps E4.
- SR-30 maps E5/E6/E7 and the repo green-chain part of E9.
- SR-31 maps E8.

The CAS stamp matches the current `apriori/specs/spec-runner/spec.md`, and SR-26..31 do not collide with the existing SR-01..25 range. Tasks reference the correct SR-26..31 range.

**Advisories**

None.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| TPSPEC-1 | `infraErrors` compatibility with existing run shapes is not specified for callers lacking `plans`, `points`, and `dupNumbers`. | Exported helper can throw, creating a signature break despite the “no signature breaks” design claim. | STEP2·r1 | open |
| TPSPEC-2 | Duplicate-number extraction regex can capture digits that are not a complete TAP point number token. | False duplicate-number infra errors on unnumbered/gargled point text beginning with digits. | STEP2·r1 | open |

VERDICT: 2 issues open
