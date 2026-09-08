# P1 requirement review — req-prefix (round 3)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: req-prefix-req-review-v3-raw.txt

# P1 Requirement Review — req-prefix v3

## Resolution Check

### RP-4 — verified

The amended header now accurately scopes the change as a "Protocol-doc patch PLUS one CLI scaffold-advisory-text edit," and explicitly says there are no CLI parsing or enforcement changes. That removes the contradiction with the required `lib/new.js` edit.

The new L4 acceptance criterion is also testable: `apriori new <name>` must emit `next-action: draft requirement/<name>-req-v1.md …` and must not emit the forbidden old literal. This closes the prior implementation/review ambiguity.

No new issues found in the amended header or acceptance list.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RP-4 | Requirement called the patch docs-only while also requiring a `lib/new.js` scaffold-text change. | Implementer or reviewer may skip or reject the required code-file update as out of scope. | STEP0 r2 | verified |

VERDICT: no major issues, ready to proceed
