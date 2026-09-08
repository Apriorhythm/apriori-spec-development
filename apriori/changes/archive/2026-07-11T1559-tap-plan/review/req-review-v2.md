# P1 requirement review — tap-plan (round 2)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/tap-plan-req-review-v2-raw.txt

**Requirement Review — tap-plan v2**

**Round-1 Confirmations**

TP-1: **verified**. The aggregate multi-plan sum rule is gone. More than one top-level plan now fails closed, and E3 uses the masking class directly, including the case where declared totals still equal parsed points.

TP-2: **verified**. The point matcher is now pinned to top-level TAP result tokens, `/^(?:ok|not ok)(?:\s|$)/`, so `ok:` diagnostic-like lines do not count. E4 covers both legal unnumbered points and the diagnostic false-positive case.

TP-ADV-1: **verified**. The requirement now covers `1..0 # SKIP reason`, numeric duplicate comparison (`ok 01` equals `ok 1`), and the intentional exclusion of `doctor` probe classification.

**Dimension Verdicts**

1. Target state B: **clear**. Exactly one plan may be present; no-plan output remains unchanged; multi-plan output fails closed.
2. Edge/exception coverage: **covered** for the identified TAP plan risks: truncation, duplicate numbers, unnumbered points, diagnostics, nested TAP, skip-all plans, verify-change, and gate inheritance.
3. Side effects: **no issue**. The change is parser/infra-error behavior only.
4. Acceptance criteria: **testable**. E1-E9 can be implemented as direct parser, verify, and gate cases.
5. State-A conflicts: **no issue**. The requirement accurately tightens current behavior without changing binding semantics.
6. Lineage: **declared and plausible** for the v3 next patch/minor.

**New Issues**

None.

**Advisories**

None.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| TP-1 | Multi-plan sum rule was maskable: one stream’s truncation could be offset by another stream’s extra points while duplicate checks were skipped. | Truncated/garbled concatenated TAP could still verify GREEN. | P1·r1 | verified |
| TP-2 | Point-count regex `/^(ok|not ok)\b/` was broader than TAP result syntax and counted `ok:` diagnostic-like lines. | False plan mismatches and implementer divergence. | P1·r1 | verified |
| TP-ADV-1 | Needed explicit `1..0 # SKIP`, numeric duplicate comparison, and intentional doctor-scope exclusion. | Advisory edge precision. | P1·r1 | verified |

VERDICT: no major issues, ready to proceed
