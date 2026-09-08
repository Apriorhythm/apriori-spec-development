**Issues**

RIMPL-1 — The `3.4 Command Cheat Sheet` heading was not preserved as mapped.

Description: The requirement’s migration map sends old `3.4 Command Cheat Sheet` to README and says every old H2/H3 heading must appear in exactly one destination except the two allowed rewrites and the dropped ToC. The implemented README uses `### Command Cheat Sheet`, so the old heading text and numeric prefix are missing.

Risk: This violates the migration preservation rule and weakens the deterministic “moved, not rewritten” audit trail.

Suggested fix: Rename the README/README_cn cheat-sheet heading to preserve the mapped old heading, e.g. `### 3.4 Command Cheat Sheet` and the CN mirror equivalent.

**Advisories**

CK-08’s bound tests cover docs-pair count mismatch, one-sided failure, and absent skip, but do not directly inject a numeric-prefix mismatch. `checkHeadingAlignment` does implement numeric-prefix checking, so this is not a current code gap, but adding the subcase would better match the scenario text.

CK-09’s test covers docs-relative links, missing siblings, and fragments. The code preserves root-file behavior by using the linking file’s dirname, but an explicit root-file regression case would match the design note more tightly.

PR-10 deviation is legitimate: the store scenario does not name README, and the handbook matrix content moved to `docs/concepts*.md`; retargeting the assertion follows the moved content.

Verified: README/README_cn are 117 lines each; docs pairs exist; CLI usage strings appear verbatim in both `docs/cli.md` and `docs/cli_cn.md`; CK-08/09 code is self-mode only; consumer-mode `check` remains limited to spec-store IDs plus runbook freshness.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RIMPL-1 | Mapped old heading `3.4 Command Cheat Sheet` was not preserved in README. | Migration preservation rule is not fully satisfied. | STEP5·r1 | open |
| ADV-RIMPL-1 | Advisory batch: add CK-08 numeric-prefix fixture and CK-09 root-file fixture for tighter semantic coverage. | Low; current code implements the behavior. | STEP5·r1 | advisory |

VERDICT: 1 issues open
