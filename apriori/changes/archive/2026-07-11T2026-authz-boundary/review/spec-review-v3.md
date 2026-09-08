# P5 design review — authz-boundary (round 3)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/authz-boundary-review-v3-raw.txt

# authz-boundary STEP2 design review v3

## Resolution review

### ABSPEC-1 — Verified

**Description:** The design now promotes the new rule to a real `### External side effects (hard rule)` / `### 外部副作用(硬规则)` heading and specifies a sibling `sectionBlock()` extractor bounded by the next `##` or `###` heading. That removes the earlier whole-file and bold-heading extraction problems. The existing proxy blockquote cannot satisfy the new rule anchors, and the range no longer swallows later numbered sections.

**Risk:** Resolved. PR-17 now has a deterministic scope strong enough for this docs-only change.

**Suggested fix:** None.

### ABSPEC-ADV-2 — Verified

**Description:** The design adds `settings` and `environments` anchors to the EN and CN remote-administration class groups.

**Risk:** Resolved. The anchor set now covers the explicitly named subexamples from the requirement.

**Suggested fix:** None.

## New issue review

No new formal issues found in the revised design.

## Advisories

No new advisories.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| ABSPEC-1 | PR-17 anchors were whole-file / insufficiently scoped; the fix now uses a real heading plus a `##`/`###`-bounded extractor. | Clause-dropping could pass the deterministic binding. | STEP2 r1 | verified |
| ABSPEC-ADV-2 | Advisory: add `settings` and `environments` anchors for remote-administration subexamples. | Low. | STEP2 r2 | verified |

VERDICT: no major issues, ready to proceed to execution
tokens used
2,862,655
# authz-boundary STEP2 design review v3

## Resolution review

### ABSPEC-1 — Verified

**Description:** The design now promotes the new rule to a real `### External side effects (hard rule)` / `### 外部副作用(硬规则)` heading and specifies a sibling `sectionBlock()` extractor bounded by the next `##` or `###` heading. That removes the earlier whole-file and bold-heading extraction problems. The existing proxy blockquote cannot satisfy the new rule anchors, and the range no longer swallows later numbered sections.

**Risk:** Resolved. PR-17 now has a deterministic scope strong enough for this docs-only change.

**Suggested fix:** None.

### ABSPEC-ADV-2 — Verified

**Description:** The design adds `settings` and `environments` anchors to the EN and CN remote-administration class groups.

**Risk:** Resolved. The anchor set now covers the explicitly named subexamples from the requirement.

**Suggested fix:** None.

## New issue review

No new formal issues found in the revised design.

## Advisories

No new advisories.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| ABSPEC-1 | PR-17 anchors were whole-file / insufficiently scoped; the fix now uses a real heading plus a `##`/`###`-bounded extractor. | Clause-dropping could pass the deterministic binding. | STEP2 r1 | verified |
| ABSPEC-ADV-2 | Advisory: add `settings` and `environments` anchors for remote-administration subexamples. | Low. | STEP2 r2 | verified |

VERDICT: no major issues, ready to proceed to execution
