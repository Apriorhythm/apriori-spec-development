**Resolution Check**

RIMPL-1 is verified. The amended preservation rule now explicitly allows README-bound sections to drop numeric prefixes while preserving heading text, and the implementation matches that rule: `3.4 Command Cheat Sheet` is represented as `Command Cheat Sheet` in both README files.

No new spec-vs-code gaps found. The amendment is a precise rule clarification rather than a content change, and it does not weaken the docs-pair/check behavior or the migration map for docs-bound sections.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RIMPL-1 | `3.4 Command Cheat Sheet` heading was not preserved under the prior preservation rule. | Preservation rule ambiguity. | STEP5·r1 | verified |

VERDICT: no spec-vs-code gaps
