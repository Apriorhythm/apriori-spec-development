# P8 implementation review — delta-consumption (round 2)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/delta-consumption-impl-review-v2-raw.txt

**Round-1 Confirmations**

DCIMPL-1: **verified**. The `SKIP_UNRECOGNIZED` guard now runs before stamp matching, so a stamp under an unrecognized h2 is consumed by the heading problem and never becomes the returned `stamp`. AM-31 now asserts `stamp === null` and no stamp-problem flood for this case.

DCIMPL-2: **verified**. A `### Requirement:` inside RENAMED now enters a discarded requirement block, so rename-looking body lines are accumulated and dropped rather than parsed as `RENAMED` operations. AM-29 now asserts `delta.RENAMED` stays empty for that fixture.

DCIMPL-ADV-1: **verified**. AM-30 now asserts full block-text equality for CRLF vs LF parses, and AM-29/AM-31 cover the prior blind spots.

**Implementation Review**

The revised `parseDeltaStrict` now matches the converged design: legal/illegal section boundaries are processed before skipped-content handling, skipped unrecognized content is unattributed, stamp attempts are line-numbered in every non-skipped state, fences remain opaque, and illegal RENAMED requirement bodies are discarded. Return shape remains `{ delta, stamp, problems }`.

I found no new spec-vs-code gaps in the fixed walker or the updated AM-29/30/31 tests.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DCIMPL-1 | A valid stamp under `SKIP_UNRECOGNIZED` before the first legal section could still become the returned delta stamp. | Skipped content was attributed into parser state, violating the no-rehome rule. | STEP5·r1 | verified |
| DCIMPL-2 | Body lines under an illegal `### Requirement:` inside RENAMED could still be parsed as rename operations. | Invalid structure populated operation buckets despite being reported as a problem. | STEP5·r1 | verified |
| DCIMPL-ADV-1 | CRLF block-text equality and prior skipped-stamp/RENAMED blind spots needed stronger assertions. | Advisory test blind spots. | STEP5·r1 | verified |

VERDICT: no major issues, ready to proceed
