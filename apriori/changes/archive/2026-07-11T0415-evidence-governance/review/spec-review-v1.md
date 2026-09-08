**Issues**

**EGSPEC-1 — CK-10 conflicts with existing CK-07 consumer-mode contract**

Description: The delta adds CK-10 to consumer-mode `apriori check`, but the living store still says in CK-07: “only the spec-store checks (CK-04) and runbook freshness (CK-06) run.” The delta is ADDED-only and does not modify CK-07, so the merged spec would simultaneously require CK-10 in consumer mode and forbid anything beyond CK-04/CK-06 there.

Risk: Implementers can satisfy CK-10 while leaving the store internally contradictory; future verify/review rounds will have to resolve the consumer-mode contract after the fact.

Suggestion: Add a MODIFIED block for the existing consumer-mode requirement/scenario so CK-07 says consumer mode runs CK-04, CK-06, and CK-10, while handbook self-checks remain gated behind `--self`.

**EGSPEC-2 — Design says “anchored regexes” but the spec requires substring detection**

Description: CK-10’s spec patterns are written as normal substring scans: `AKIA[0-9A-Z]{16}`, `gh[pousr]_[A-Za-z0-9]{36,}`, and `-----BEGIN [A-Z ]*PRIVATE KEY-----`. The design says line scan “with the three anchored regexes,” which can be read as `^...$` or line-start anchored matching. That would miss secrets embedded in command output, JSON, prose, or log lines.

Risk: A security tripwire could be implemented too narrowly and miss the exact leaked-token transcript cases it is meant to catch.

Suggestion: Remove “anchored” from the design or define it explicitly as “search anywhere on each line using these exact regexes.”

**Advisories**

No advisory items.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| EGSPEC-1 | CK-10 conflicts with the existing CK-07 consumer-mode contract, which still says only CK-04 and CK-06 run in consumer mode. | The merged store would be internally contradictory. | STEP2·r1 | open |
| EGSPEC-2 | Design says “anchored regexes” while CK-10 requires substring detection of the three secret formats. | The secret tripwire could miss embedded leaked credentials. | STEP2·r1 | open |

VERDICT: 2 issues open
