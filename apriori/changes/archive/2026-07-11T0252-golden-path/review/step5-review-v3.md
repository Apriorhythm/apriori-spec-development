**Resolution Check**

GPIMPL-1 is verified. `scripts/golden-path.mjs` now exports `assertSentinels(stdout, expects)`, `main()` delegates the runner’s sentinel comparison to that seam, and GP-04 asserts the exact failure class with `/block 2: exit 0, contract expects 1/`. This binds the exit-drift behavior and the required user-visible failure message.

**New Gaps**

No new spec-vs-code gaps found.

**Advisories**

No new advisory items.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| GPIMPL-1 | GP-04's bound test covered block-count drift but not exit-code drift; r2 still missed the runner failure message assertion. | The failure/reporting path could regress green. | STEP5·r1 | verified |

VERDICT: no spec-vs-code gaps
