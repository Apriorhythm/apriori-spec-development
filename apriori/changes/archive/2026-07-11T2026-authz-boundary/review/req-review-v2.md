# P1 requirement review — authz-boundary (round 2)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/authz-boundary-req-review-v2-raw.txt

# authz-boundary requirement review v2

## Resolution review

### AB-1 — Verified

**Description:** v2 now requires scoped standing authorizations to carry class, scope, and a named expiry boundary. It also states ambiguous, expired, or out-of-scope reuse is invalid and requires fresh authorization.

**Risk:** Resolved. The prior blanket-by-precedent loophole is closed.

**Suggested fix:** None.

### AB-2 — Verified

**Description:** v2 narrows the paid-service carve-out to routine configured verification already run by the workflow, while classifying new paid services, unusual spend, production-affecting calls, and unexpected non-public data transfer as external side effects.

**Risk:** Resolved. The boundary is precise enough for implementation and review.

**Suggested fix:** None.

### AB-3 — Verified

**Description:** v2 distinguishes internal protocol evidence from external authorization. Non-principal data may drive internal state-machine transitions where the protocol already permits it, but never authorizes external side effects.

**Risk:** Resolved. This avoids both over-blocking verifier/reviewer evidence and under-protecting external actions.

**Suggested fix:** None.

### AB-4 — Verified

**Description:** v2 changes the rule to cover any operation mutating state outside the local repository/workspace, with action classes as mandatory examples. Remote service administration is now explicitly included.

**Risk:** Resolved. The rule no longer depends on an exhaustive list that could miss security-sensitive external mutations.

**Suggested fix:** None.

## New issue review

No new formal issues found in v2.

## Dimension verdicts

1. **Target state B clarity:** Clear. The rule, examples, standing-authorization requirements, paid-service carve-out, and untrusted-data boundary are implementable.
2. **Edge cases and exception paths:** Covered for the P1 contract level. Expired, ambiguous, and out-of-scope standing grants are explicitly invalid.
3. **Implied side effects:** No undeclared side effects found. The rule is docs/protocol text plus PR-17 binding.
4. **Acceptance testability:** Testable. H1-H6 can be checked by semantic anchors and existing protocol/doc validation.
5. **Conflicts with state A:** No conflict. The requirement fills a verified gap in current runbook/protocol coverage.
6. **Lineage:** Declared and consistent with repo reality.

## Advisories

AB-ADV-1 is resolved. PR-17 is specified as semantic-anchor based rather than full-sentence matching, and DD-4 records the local-commit exclusion as a deliberate boundary choice.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| AB-1 | Standing authorization had no precise expiry boundary. | Scoped grants become blankets by precedent. | STEP0·r1 | verified |
| AB-2 | Paid-service carve-out ambiguous ("configured tooling"). | Cost/data-leak calls implicitly authorized. | STEP0·r1 | verified |
| AB-3 | Untrusted-data clause could be read as forbidding verdict-driven internal transitions. | Breaks protocol or under-protects. | STEP0·r1 | verified |
| AB-4 | Action classes omitted remote service admin/access-control mutations. | Security-relevant effects outside the rule. | STEP0·r1 | verified |
| AB-ADV-1 | Advisory: PR-17 semantic anchors, not sentences; local commits rightly excluded. | Test brittleness / recorded boundary. | STEP0·r1 | verified |

VERDICT: no major issues, ready to proceed
tokens used
2,778,203
# authz-boundary requirement review v2

## Resolution review

### AB-1 — Verified

**Description:** v2 now requires scoped standing authorizations to carry class, scope, and a named expiry boundary. It also states ambiguous, expired, or out-of-scope reuse is invalid and requires fresh authorization.

**Risk:** Resolved. The prior blanket-by-precedent loophole is closed.

**Suggested fix:** None.

### AB-2 — Verified

**Description:** v2 narrows the paid-service carve-out to routine configured verification already run by the workflow, while classifying new paid services, unusual spend, production-affecting calls, and unexpected non-public data transfer as external side effects.

**Risk:** Resolved. The boundary is precise enough for implementation and review.

**Suggested fix:** None.

### AB-3 — Verified

**Description:** v2 distinguishes internal protocol evidence from external authorization. Non-principal data may drive internal state-machine transitions where the protocol already permits it, but never authorizes external side effects.

**Risk:** Resolved. This avoids both over-blocking verifier/reviewer evidence and under-protecting external actions.

**Suggested fix:** None.

### AB-4 — Verified

**Description:** v2 changes the rule to cover any operation mutating state outside the local repository/workspace, with action classes as mandatory examples. Remote service administration is now explicitly included.

**Risk:** Resolved. The rule no longer depends on an exhaustive list that could miss security-sensitive external mutations.

**Suggested fix:** None.

## New issue review

No new formal issues found in v2.

## Dimension verdicts

1. **Target state B clarity:** Clear. The rule, examples, standing-authorization requirements, paid-service carve-out, and untrusted-data boundary are implementable.
2. **Edge cases and exception paths:** Covered for the P1 contract level. Expired, ambiguous, and out-of-scope standing grants are explicitly invalid.
3. **Implied side effects:** No undeclared side effects found. The rule is docs/protocol text plus PR-17 binding.
4. **Acceptance testability:** Testable. H1-H6 can be checked by semantic anchors and existing protocol/doc validation.
5. **Conflicts with state A:** No conflict. The requirement fills a verified gap in current runbook/protocol coverage.
6. **Lineage:** Declared and consistent with repo reality.

## Advisories

AB-ADV-1 is resolved. PR-17 is specified as semantic-anchor based rather than full-sentence matching, and DD-4 records the local-commit exclusion as a deliberate boundary choice.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| AB-1 | Standing authorization had no precise expiry boundary. | Scoped grants become blankets by precedent. | STEP0·r1 | verified |
| AB-2 | Paid-service carve-out ambiguous ("configured tooling"). | Cost/data-leak calls implicitly authorized. | STEP0·r1 | verified |
| AB-3 | Untrusted-data clause could be read as forbidding verdict-driven internal transitions. | Breaks protocol or under-protects. | STEP0·r1 | verified |
| AB-4 | Action classes omitted remote service admin/access-control mutations. | Security-relevant effects outside the rule. | STEP0·r1 | verified |
| AB-ADV-1 | Advisory: PR-17 semantic anchors, not sentences; local commits rightly excluded. | Test brittleness / recorded boundary. | STEP0·r1 | verified |

