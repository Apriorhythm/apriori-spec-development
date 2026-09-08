# P5 design review — cas-enforcement (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/cas-enforcement-review-v1-raw.txt

**Issues**

No formal rework-or-incident issues found.

Coverage check:
- K1 is covered by AM-32, including high-level archive and single-file archive warnings.
- K2 is covered by AM-32, SR-32, and GT-16.
- K3 is covered by GT-16, including `--no-cas`, config `cas optional`, and flag precedence.
- K4 is covered by AM-33, AM-34, and AM-35.
- K5 is covered by the docs/truth update plan in the design and task flow.
- K6 is covered by the stated out-of-scope boundary and docs plan.

The rerun-repair predicate is sound against the current `merge()` shape once AM-35 is implemented: first-application arrays are real work, rerun signatures land in `unchanged`, and conflicts keep the file out of repair. REMOVED and RENAMED reruns also fit the “all ops unchanged” predicate.

C7 is technically implementable against current `lib/gate.js`: `checkBinding()` currently discards the verify projection, but the design explicitly calls for threading that field through rather than re-projecting. If C1 is infra-error, the existing gate flow already exits ERROR before later checks, which is fail-closed and compatible with C7 being unavailable.

**Advisories**

- Existing exact JSON assertions for verify-change projection, especially SR-23-style tests, will need to be updated once `projection.unstampedMutations` is always present on `--change` JSON. This is expected contract churn, not a design defect.
- Consider spelling out that C7 is omitted or not evaluated when C1 cannot produce a trustworthy projection. The current fail-closed ERROR behavior is acceptable, but making it explicit avoids later test disagreement.
- `configCas()` is planned as a second process-config table reader modeled on `configTestCmd()`. Keep the parsing shape tested for absent, `optional`, `required`, and junk values so config parsing does not drift.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| CESPEC-ADV-1 | Advisory batch: update existing projection JSON expectations; make C7-on-C1-error behavior explicit; test `cas` config parsing boundaries. | Low | STEP2 r1 | open |

VERDICT: no major issues, ready to proceed to execution
