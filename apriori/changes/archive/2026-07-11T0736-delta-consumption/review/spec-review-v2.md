# P5 design review — delta-consumption (round 2)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/delta-consumption-review-v2-raw.txt

**Round-1 Findings**

DCSPEC-1: **verified**. The design now matches stamp attempts in every walker state outside fences before body accumulation, and late/duplicate/malformed stamps become line-numbered problems instead of body text.

DCSPEC-2: **verified**. Requirement block accumulation now states the old grammar precisely: `#### Scenario:` and prose stay in the body, blocks flush on the next `### Requirement:`, any `^##` boundary, or EOF, and reassembly uses trim plus final newline.

DCSPEC-3: **verified**. CRLF normalization, line numbering, and fence toggling are now concrete. Inline backticks no longer toggle opacity.

**New Issues**

**DCSPEC-4 — Legal section matcher is written as a precedence-broken regex**

Description: The design’s legal-heading rule is written as ``^## ADDED|MODIFIED|REMOVED|RENAMED Requirements$``. If implemented literally, regex alternation makes this match `MODIFIED` or `REMOVED` without the required `## ` prefix, and it does not mirror the current/state-A section matcher. The spec requires exact legal headings of the form `## ADDED|MODIFIED|REMOVED|RENAMED Requirements`.

Risk: A malformed delta line such as `MODIFIED Requirements` could be treated as a legal section, violating the fail-closed consumption goal.

Suggestion: Replace the design notation with the exact intended matcher, e.g. `/^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/` after the one-trailing-`\r` normalization.

**DCSPEC-5 — Stamp-attempt regex is narrower than current malformed-stamp hygiene**

Description: The revised design says stamp lines are detected with an attempt regex ``/^<!--\s*apriori-base:/``. Current state A uses a broader standalone-comment attempt detector: `STAMP_ATTEMPT_RE = /^\s*<!--(?=[^>]*apriori-base)[^>]*-->\s*$/gm`, then validates against the strict stamp form. The design regex can miss malformed attempts such as a missing colon, or attempts with leading whitespace, allowing them to be consumed as legal free text or requirement body.

Risk: Malformed `apriori-base` attempts can silently disable or evade CAS hygiene, which is exactly the class AM-31 is meant to keep fail-closed.

Suggestion: Specify that the line walker preserves the existing broad stamp-attempt semantics, but adds line numbers and all-state detection. Use the current `STAMP_ATTEMPT_RE` shape on normalized logical lines, then validate with the strict stamp-line regex.

**Advisories**

- Tasks say “corpus test” but not the stronger design promise: old-vs-new parse-result equality over archived deltas. Consider naming that equality check in T1 so it does not degrade to only “zero problems.”
- The CRLF choice is now explicit: parsing normalizes CRLF to LF for accumulated body text. That is acceptable as a declared behavior, but tests should include CRLF input so the choice remains intentional.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DCSPEC-1 | Misplaced stamps could be absorbed as body text because the design only recognized stamps in `FILE_PREAMBLE`. | Hygiene problem silently lost. | STEP2·r1 | verified |
| DCSPEC-2 | Requirement body accumulation and output normalization were underspecified against old `REQ_RE` semantics. | Well-formed inputs could reassemble differently old-vs-new. | STEP2·r1 | verified |
| DCSPEC-3 | CRLF normalization and fence-delimiter precision were undefined. | Platform-dependent parses; inline backticks could toggle opacity. | STEP2·r1 | verified |
| DCSPEC-4 | Legal section matcher is written as a precedence-broken regex. | Malformed section lines could be accepted as legal sections. | STEP2·r2 | open |
| DCSPEC-5 | Stamp-attempt regex is narrower than current malformed-stamp hygiene. | Malformed stamp attempts can be consumed as legal text and evade CAS hygiene. | STEP2·r2 | open |
| DCSPEC-ADV-2 | T1 should name the old-vs-new corpus equality assertion, and CRLF behavior should get a direct test. | Advisory test-plan precision. | STEP2·r2 | open |

VERDICT: 2 issues open
