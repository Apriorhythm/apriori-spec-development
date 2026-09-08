**Resolution Check**

**EGSPEC-1 reopened**

Description: The delta did add a `MODIFIED Requirements` block, but it modifies the wrong store requirement. CK-07 lives under the store requirement `check warns on a stale scaffolded runbook without failing`, while the delta modifies `check ports the v2 doc checker to JS and adds ID coverage`, which only contains CK-01..05. The actual delta file still leaves the store’s CK-07 unchanged: “only the spec-store checks (CK-04) and runbook freshness (CK-06) run.”

Risk: The merged store remains internally contradictory: added CK-10 requires consumer-mode scanning, while unchanged CK-07 still says consumer mode runs only CK-04 and CK-06.

Suggestion: Add a `MODIFIED` block for `### Requirement: check warns on a stale scaffolded runbook without failing`, faithfully reproducing CK-06 and amending CK-07’s THEN clause to include CK-10.

**EGSPEC-2 verified**

The design now says “per-line SUBSTRING scan” and explicitly says it is never line-anchored, which matches CK-10’s intended detection of embedded secrets in command output, JSON, or prose.

**New Issues**

No new issues found.

**Advisories**

No advisory items.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| EGSPEC-1 | CK-10 still conflicts with CK-07 because the MODIFIED block targets the wrong store requirement; CK-07 remains unchanged. | The merged spec would remain internally contradictory. | STEP2·r1 | open |
| EGSPEC-2 | Design said “anchored regexes”; spec needs substring detection. | Embedded secrets missed. | STEP2·r1 | verified |

VERDICT: 1 issues open
