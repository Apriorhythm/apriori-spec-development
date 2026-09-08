# P1 requirement review — authz-boundary (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/authz-boundary-req-review-v1-raw.txt

# authz-boundary requirement review v1

## Formal issues

### AB-1 — Scoped standing authorization has no precise expiry boundary

**Description:** DD-2 and H1 allow scoped standing authorization such as “push after each change of this batch,” but the requirement does not define how a scope expires or how ambiguity is handled. It says the grant is valid “within that scope” and revocable, but does not say whether a batch ends at archive, final gate, owner message, branch change, date/session boundary, or a named change list.

**Risk:** A scoped grant can become a durable blanket authorization by precedent, which is the exact authorization-boundary failure this change is meant to close.

**Suggested fix:** Require every standing authorization record to name action class, scope, and expiry boundary. Add a rule that ambiguous, expired, or out-of-scope standing authorization is invalid and requires fresh explicit authorization. Add an acceptance check for out-of-scope reuse being disallowed.

### AB-2 — Paid external service carve-out is ambiguous

**Description:** The action class “invoking paid external services beyond the project’s configured tooling” leaves “configured tooling” undefined. A project may configure CI, cloud CLIs, LLM APIs, package registries, deploy tooling, or paid SaaS. It is unclear which of these are routine verification and which require explicit authorization.

**Risk:** The text can accidentally authorize cost-incurring or data-leaking external calls merely because a tool is present in project configuration.

**Suggested fix:** Define the carve-out narrowly. For example: normal configured local/CI verification commands may run as part of the workflow, but any new paid service invocation, unusual spend, production-affecting call, deploy, publish, external message, or tool invocation that sends non-public project data outside the expected verification path requires explicit authorization.

### AB-3 — Untrusted-data clause conflicts with internal protocol evidence

**Description:** The requirement says tool output and review verdicts are data and never authorization. That is correct for external side effects, but the current protocol uses tool output and reviewer verdicts as internal evidence for step transitions and gates. As written, an implementer could read this as forbidding P5/P8 verdicts or verify/gate/check outputs from driving internal workflow state.

**Risk:** Either the implementation overcorrects and breaks the existing protocol, or it under-specifies the distinction and lets review output be treated as authorization for external side effects.

**Suggested fix:** Clarify that non-principal data may drive internal state-machine transitions where the protocol already says so, but it never authorizes external side effects. Add this distinction to the load-bearing PR-17 phrase set.

### AB-4 — External action classes omit remote service administration and access-control changes

**Description:** The list covers push, merge, release/package/tag, deploy, production data, paid services, and external messages. It does not clearly cover mutating remote repository/service settings, secrets, webhooks, collaborators, permissions, project boards, environments, or other access-control/configuration state outside the working tree.

**Risk:** These are security-relevant external side effects. If the action-class list is treated as exhaustive, high-impact external mutations may fall outside the hard rule.

**Suggested fix:** Add an explicit action class for mutating external service configuration, secrets, webhooks, permissions, collaborators, environments, or access controls. Alternatively define the listed classes as examples under a broader rule: any operation that mutates state outside the local repo/workspace requires explicit authorization, with listed classes as mandatory examples.

## Dimension verdicts

1. **Target state B clarity:** Not yet. The hard-rule direction is clear, but standing scope, paid-service carve-out, and external action coverage need tightening.
2. **Edge cases and exception paths:** Not yet. Scope expiry, ambiguous standing authorization, and remote service admin actions are missing.
3. **Implied side effects:** Mostly declared, but the configured-tooling carve-out implies allowed external calls without a precise boundary.
4. **Acceptance testability:** Partially. H1-H5 are testable for phrase presence, but the scope-expiry and internal-evidence distinction need if/then acceptance criteria.
5. **Conflicts with state A:** The identified gap is real: current runbook gate authorization covers gates only, and protocol scenarios stop at PR-16.
6. **Lineage:** Declared and plausible for the repo reality.

## Advisories

- **PR-17 assertion style:** Avoid brittle full-sentence matching. Prefer anchored semantic phrase checks in both editions: action-class anchors, “gate consolidation never covers external side effects,” one-shot authorization plus verbatim `gates:` recording, standing authorization class/scope/expiry, and untrusted data never authorizes external side effects.
- **Local commits:** Excluding local commits from this specific external-side-effect rule is reasonable. They remain local repository/workspace mutations and should stay governed by the existing workflow rules rather than this external authorization boundary.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| AB-1 | Scoped standing authorization has no precise expiry boundary. | Standing grants can become blanket authorization by precedent. | P1 r1 | open |
| AB-2 | Paid external service carve-out is ambiguous. | Cost-incurring or data-leaking calls may be treated as implicitly authorized. | P1 r1 | open |
| AB-3 | Untrusted-data clause conflicts with internal protocol evidence unless scoped to external authorization. | Implementers may break protocol transitions or let review/tool output authorize external effects. | P1 r1 | open |
| AB-4 | External action classes omit remote service administration and access-control changes. | Security-relevant external mutations may fall outside the hard rule. | P1 r1 | open |
| AB-ADV-1 | Advisory batch: PR-17 should use semantic anchors rather than full-sentence matching; local commits are appropriately outside this external-side-effect rule. | Low; avoids brittle tests and records a reviewed boundary choice. | P1 r1 | open |

VERDICT: 4 issues open
