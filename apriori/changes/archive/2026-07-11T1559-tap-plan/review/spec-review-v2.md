# P5 design review — tap-plan (round 2)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/tap-plan-review-v2-raw.txt

**Round-1 Confirmations**

TPSPEC-1: **verified**. The design now explicitly defaults `plans`, `points`, and `dupNumbers` inside exported `infraErrors`, preserving legacy/direct caller compatibility while allowing verify-created runs to trigger the new guards.

TPSPEC-2: **verified**. The duplicate-number collector now requires a complete numeric point token with `/^(?:ok|not ok)\s+(\d+)(?:\s|$)/`, so `ok 1abc` remains unnumbered and duplicate-exempt.

**New Issues**

None.

**Advisories**

None.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| TPSPEC-1 | `infraErrors` guards lacked defaults for legacy run shapes without `plans`, `points`, and `dupNumbers`. | Existing tests or external direct callers could crash. | STEP2·r1 | verified |
| TPSPEC-2 | Duplicate-number regex captured incomplete numeric tokens such as `ok 1abc`. | False duplicate-number infra errors. | STEP2·r1 | verified |

VERDICT: no major issues, ready to proceed to execution
