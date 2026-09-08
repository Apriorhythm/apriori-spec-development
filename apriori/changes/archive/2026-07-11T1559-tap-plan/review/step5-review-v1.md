# P8 implementation review — tap-plan (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/tap-plan-impl-review-v1-raw.txt

**Implementation Review — tap-plan v1**

The implementation in `lib/spec-runner.js` matches the converged design for parser mechanics: `plans`, `points`, and `dupNumbers` are additive return fields; CRLF handling strips one trailing `\r`; point and numeric-token regexes match the design; `infraErrors` uses defensive defaults; verify-created run objects carry the new fields; existing `parseTap` callers that destructure only old fields remain compatible; `doctor` remains unaffected because it does not call `infraErrors`.

The guard ordering is acceptable: `noTap` still gets first diagnostic priority, the new plan guards are `if/else-if` within their trio, and the existing exit-status guard may coexist with a plan error rather than masking it. `Bail out!` likewise remains an infra error; adding a plan error beside it is fail-closed, not a weakening. `verifyJson` carries the new failures through the existing `errors[]` surface.

Gate reality check: `lib/gate.js` treats verify infra failures as `ERROR`, code 2, with `verify: <msg>`. The SR-31 test matches that. This is the right contract: an untrustworthy verify run is stronger than a normal C1 binding block.

**Issues**

**TPIMPL-1 — Spec requirement prose still says gate C1 BLOCKED**

Description: The SR-31 scenario was corrected to say `gate exits 2 reporting the verify plan error`, and the implementation/test match `lib/gate.js`. But the requirement paragraph in `apriori/changes/tap-plan/specs/spec-runner/spec.md` still says plan violations produce “gate C1 BLOCKED.” That contradicts both the scenario and the implemented gate taxonomy.

Risk: Future readers or implementers can preserve the stale “BLOCKED” wording and reintroduce the wrong gate contract despite the scenario being correct.

Suggested fix: Update the requirement prose to say violations are infra errors: verify exits 2 / RESULT: ERROR, and gate exits 2 / ERROR reporting the verify plan error.

**Advisories**

None.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| TPIMPL-1 | Spec requirement prose still says plan violations make gate C1 BLOCKED, while code and SR-31 correctly make gate ERROR exit 2. | Spec-vs-code drift can reintroduce the wrong gate contract. | STEP5·r1 | open |

VERDICT: 1 issues open
