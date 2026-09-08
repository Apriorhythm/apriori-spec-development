# P8 consistency review — authz-boundary (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/authz-boundary-impl-review-v1-raw.txt

# authz-boundary STEP5 consistency review v1

## Findings

No spec-vs-doc gaps found.

The landed EN runbook text carries all five req-final elements: outside-local-repo/workspace rule plus mandatory examples, one-shot explicit authorization with verbatim `gates:` recording, scoped standing authorization with class/scope/expiry and invalid reuse, the narrow paid-service carve-out, and the untrusted-data/internal-transition distinction.

The CN runbook mirrors the EN rule without a material clause drop. `原文记入 gates:` preserves “recorded verbatim”; `失效边界` preserves expiry boundary; `非公开项目数据` preserves non-public project data; and the internal-state-machine permission is explicitly present while external authorization remains forbidden.

The gate-consolidation cross-reference is present in both editions and does not contradict the protected-gate proxy blockquote. It narrows consolidation to gates only, while the proxy blockquote still governs protected gate decisions.

The concepts paragraphs satisfy H5 at the intended summary level: they mirror the boundary, standing grant shape, consolidation exclusion, and data-never-authorizes distinction. They do not need to repeat every runbook example.

PR-17’s `sectionBlock()` implementation is faithful to the design: it scopes the main anchors to the `### External side effects (hard rule)` / `### 外部副作用(硬规则)` subsection and separately checks the consolidation sentence and concepts mirrors. I did not find an anchor that passes on unrelated text.

## Advisories

- The CN heading’s ASCII parentheses are acceptable. They are consistent with the actual test bytes and do not weaken the rule. Full-width punctuation would be typography only, not a blocking semantic issue.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| ABIMPL-ADV-1 | Advisory: CN heading uses ASCII parentheses; acceptable typography artifact, not a semantic gap. | Low. | STEP5 r1 | open |

VERDICT: no major issues, ready to proceed
