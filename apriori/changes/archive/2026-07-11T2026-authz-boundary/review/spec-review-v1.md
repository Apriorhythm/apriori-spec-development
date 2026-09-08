# P5 design review — authz-boundary (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/authz-boundary-review-v1-raw.txt

# authz-boundary STEP2 design review v1

## Issues

### ABSPEC-1 — PR-17 anchors are not scoped to the new rule block

**Description:** The design says PR-17 will use whole-file semantic anchors in `RUNBOOK.md` / `RUNBOOK_cn.md`. Several planned anchors can already be satisfied by nearby existing gate text, especially `one-shot` and verbatim `gates:` recording in the protected-gate proxy blockquote. That means a future edit could omit those clauses from the new external-side-effects subsection while PR-17 still passes.

**Risk:** The only deterministic binding for this docs-only change could greenlight a clause-dropping implementation. That would cause rework at P8 or leave the new authorization boundary weaker than req-final.

**Suggested fix:** In `test/protocol.test.js`, extract and assert the new `External side effects (hard rule)` / `外部副作用` subsection block directly, using the existing `block()` idiom or a sibling helper. Check the gate-consolidation cross-reference in the gate-consolidation paragraph separately, and check `docs/concepts{,_cn}.md` in their own scoped paragraphs.

### ABSPEC-2 — PR-17 anchor set underbinds the mandatory action classes and paid-service carve-out

**Description:** Req-final H2 requires PR-17 to bind the action-class list and the paid-service boundary. The design’s EN/CN anchor set only names the broad outside-workspace rule and samples service administration via `secrets` / `webhooks`; it does not bind the mandatory examples such as push, merge, release/package/tag, deploy, production data, paid services, and external messages. It also only anchors the “expected verification path” side of the carve-out, not the negative boundary: new paid service, unusual spend, production-affecting call, or non-public data leaving the expected path.

**Risk:** A runbook could pass PR-17 while omitting high-impact examples or weakening the paid-service exception, which is exactly where the authorization boundary is most likely to be misused.

**Suggested fix:** Add scoped anchors for each mandatory example class, or grouped anchors that still require every class family to appear. Add carve-out anchors for routine configured verification plus the excluded cases: new paid service, unusual spend, production-affecting/production call, and non-public data outside the expected verification path. Mirror equivalent CN anchors.

## Advisories

- The proposed insertion point exists in both editions: gate consolidation is followed by the protected-gate proxy blockquote in `RUNBOOK.md` and `RUNBOOK_cn.md`.
- PR-17 numbering is clean: the store currently has PR-01..16, so PR-17 does not collide.
- The docs-only verification plan is appropriate once PR-17 is tightened: protocol text binding plus `check --self` and P8 translation review are sufficient for a runbook/docs change.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| ABSPEC-1 | PR-17 anchors are not scoped to the new external-side-effects subsection, so existing gate/proxy text can satisfy some anchors. | Clause-dropping implementation can pass the only deterministic binding. | STEP2 r1 | open |
| ABSPEC-2 | PR-17 anchor set underbinds mandatory action classes and the negative side of the paid-service carve-out. | High-impact external actions or paid-service exceptions can be omitted while tests pass. | STEP2 r1 | open |
| ABSPEC-ADV-1 | Advisory batch: insertion point, scenario numbering, and docs-only verification tier are otherwise sound. | Low. | STEP2 r1 | open |

VERDICT: 2 issues open
