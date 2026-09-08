# P5 design review — delta-consumption (round 3)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/delta-consumption-review-v3-raw.txt

**Round-2 Confirmations**

DCSPEC-4: **verified**. The design now uses the exact grouped legal-section matcher: `/^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/` per normalized line. This preserves the state-A heading shape and prevents bare `MODIFIED Requirements` from being accepted.

DCSPEC-5: **verified**. The design now preserves the existing broad stamp-attempt detector shape, then validates with the strict stamp regex. The walker only adds line numbers and all-state detection, so malformed attempts such as missing-colon stamps remain hygiene errors.

DCSPEC-ADV-2: **verified**. T1 now explicitly requires both zero-problem and old-vs-new parse-result equality over every archived delta, plus a CRLF-input case.

**New Issues**

None.

**Advisories**

None.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DCSPEC-4 | Legal section matcher was written as a precedence-broken regex. | Malformed section lines could be accepted as legal sections. | STEP2·r2 | verified |
| DCSPEC-5 | Stamp-attempt regex was narrower than current malformed-stamp hygiene. | Malformed stamp attempts could be consumed as legal text and evade CAS hygiene. | STEP2·r2 | verified |
| DCSPEC-ADV-2 | T1 needed to name old-vs-new corpus equality and a CRLF-input test. | Advisory test-plan precision. | STEP2·r2 | verified |

VERDICT: no major issues, ready to proceed to execution
