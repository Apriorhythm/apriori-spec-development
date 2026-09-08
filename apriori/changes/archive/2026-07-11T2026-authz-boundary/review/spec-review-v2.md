# P5 design review — authz-boundary (round 2)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/authz-boundary-review-v2-raw.txt

# authz-boundary STEP2 design review v2

## Resolution review

### ABSPEC-1 — Reopened

**Description:** The revised design correctly stops whole-file matching and starts PR-17 at the new `**External side effects (hard rule).**` / `**外部副作用(硬规则)。**` heading. However, it says to use the existing `block()` helper unchanged. That helper currently ends only at the next `^### ` heading. The proposed heading is a bold paragraph, not a `###` heading, so the extracted “block” would include the new subsection plus later unrelated runbook text until the next `###`.

This closes the specific pre-existing proxy-text false match, because the proxy blockquote is before the new subsection. But it still does not actually scope assertions to the new subsection block as claimed.

**Risk:** The only deterministic binding for this docs-only change can still pass from later unrelated text if the new subsection drops a clause. That is weaker than req-final’s PR-17 binding intent and likely causes P8 rework.

**Suggested fix:** Define a subsection-specific extractor for PR-17, or promote the new rule to a heading level the existing helper handles. For example, extract from the external-side-effects bold heading to the next top-level hard-rule paragraph (`**R2` / `**R3`) or next `## ` heading, with the CN mirror using the same structural boundary. Keep the gate-consolidation cross-reference and concepts mirrors separately scoped as the design already says.

### ABSPEC-2 — Verified

**Description:** The revised anchor set now binds the mandatory action families and both sides of the paid-service carve-out: routine configured verification as the positive exception, and new paid service / unusual spend / production-affecting call / non-public data outside the expected path as negatives.

**Risk:** Resolved. The prior underbinding of high-impact external actions and the carve-out boundary is closed at the design level.

**Suggested fix:** None required.

## New issue review

No new formal issues beyond the unresolved scoped-block extractor problem above.

## Advisories

- Consider adding optional anchors for the remote-administration subexamples `settings` and `environments` as well. The current family coverage is likely sufficient, but these two words are explicitly present in the requirement’s example list.
- The rest of the docs-only plan remains sound: PR-17 follows PR-16 without collision, the insertion point exists in both editions, and PR-17 plus `check --self` plus P8 translation review is the right verification shape.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| ABSPEC-1 | PR-17 is no longer whole-file, but the proposed use of existing `block()` does not actually isolate the bold external-side-effects subsection because `block()` stops only at the next `###` heading. | Clause-dropping can still pass from later unrelated text in the extracted range. | STEP2 r1 | open |
| ABSPEC-2 | Anchor set underbound the mandatory class list and the carve-out's negative side. | High-impact classes or the paid boundary omitted while tests pass. | STEP2 r1 | verified |
| ABSPEC-ADV-1 | Advisory: insertion point verified in both editions; PR-17 numbering clean; docs-only tier sound once anchors tightened. | Low. | STEP2 r1 | verified |
| ABSPEC-ADV-2 | Optional hardening: add `settings` and `environments` anchors for the remote-administration subexamples. | Low. | STEP2 r2 | open |

VERDICT: 1 issues open
tokens used
2,845,566
# authz-boundary STEP2 design review v2

## Resolution review

### ABSPEC-1 — Reopened

**Description:** The revised design correctly stops whole-file matching and starts PR-17 at the new `**External side effects (hard rule).**` / `**外部副作用(硬规则)。**` heading. However, it says to use the existing `block()` helper unchanged. That helper currently ends only at the next `^### ` heading. The proposed heading is a bold paragraph, not a `###` heading, so the extracted “block” would include the new subsection plus later unrelated runbook text until the next `###`.

This closes the specific pre-existing proxy-text false match, because the proxy blockquote is before the new subsection. But it still does not actually scope assertions to the new subsection block as claimed.

**Risk:** The only deterministic binding for this docs-only change can still pass from later unrelated text if the new subsection drops a clause. That is weaker than req-final’s PR-17 binding intent and likely causes P8 rework.

**Suggested fix:** Define a subsection-specific extractor for PR-17, or promote the new rule to a heading level the existing helper handles. For example, extract from the external-side-effects bold heading to the next top-level hard-rule paragraph (`**R2` / `**R3`) or next `## ` heading, with the CN mirror using the same structural boundary. Keep the gate-consolidation cross-reference and concepts mirrors separately scoped as the design already says.

### ABSPEC-2 — Verified

**Description:** The revised anchor set now binds the mandatory action families and both sides of the paid-service carve-out: routine configured verification as the positive exception, and new paid service / unusual spend / production-affecting call / non-public data outside the expected path as negatives.

**Risk:** Resolved. The prior underbinding of high-impact external actions and the carve-out boundary is closed at the design level.

**Suggested fix:** None required.

## New issue review

No new formal issues beyond the unresolved scoped-block extractor problem above.

## Advisories

- Consider adding optional anchors for the remote-administration subexamples `settings` and `environments` as well. The current family coverage is likely sufficient, but these two words are explicitly present in the requirement’s example list.
- The rest of the docs-only plan remains sound: PR-17 follows PR-16 without collision, the insertion point exists in both editions, and PR-17 plus `check --self` plus P8 translation review is the right verification shape.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| ABSPEC-1 | PR-17 is no longer whole-file, but the proposed use of existing `block()` does not actually isolate the bold external-side-effects subsection because `block()` stops only at the next `###` heading. | Clause-dropping can still pass from later unrelated text in the extracted range. | STEP2 r1 | open |
| ABSPEC-2 | Anchor set underbound the mandatory class list and the carve-out's negative side. | High-impact classes or the paid boundary omitted while tests pass. | STEP2 r1 | verified |
| ABSPEC-ADV-1 | Advisory: insertion point verified in both editions; PR-17 numbering clean; docs-only tier sound once anchors tightened. | Low. | STEP2 r1 | verified |
| ABSPEC-ADV-2 | Optional hardening: add `settings` and `environments` anchors for the remote-administration subexamples. | Low. | STEP2 r2 | open |

VERDICT: 1 issues open
