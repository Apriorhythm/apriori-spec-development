**Technical Review — readme-split STEP2**

No formal issues found.

CK-08 covers requirement R2/R3: docs EN/CN pairs are added to self-mode coverage, heading count/level/numeric-prefix mismatch fails, one-sided pairs fail, and both-absent pairs remain skipped for older checkouts.

CK-09 covers requirement R4: links resolve relative to the linking file, root-file behavior is preserved, missing targets fail naming the linking file, and cross-file fragments are validated against target headings.

State-A checks passed: the delta CAS stamp matches `apriori/specs/check/spec.md`, CK-08/09 do not collide with existing CK-01..07, and `checkLinks` call sites are limited to `lib/check.js` self-mode plus tests. Consumer mode remains explicitly untouched.

**Advisories**

T6 says CN mirrors are produced last, and R7 requires verbatim usage strings in both `docs/cli.md` and `docs/cli_cn.md`. Consider making T6 explicitly mention preserving the language-neutral usage strings in `docs/cli_cn.md`, but the requirement is already clear enough.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| ADV-RSPEC-1 | Advisory batch: make T6 explicitly mention verbatim CLI usage strings in `docs/cli_cn.md`. | Low; R7 already states the requirement. | STEP2·r1 | advisory |

VERDICT: no major issues, ready to proceed to execution
