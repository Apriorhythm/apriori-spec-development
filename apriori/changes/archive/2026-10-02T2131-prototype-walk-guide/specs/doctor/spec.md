<!-- apriori-base: sha256:fd2ce5bb48ad3797a6563149c0fb0c7f3cd8c706efa39c4be36ce8f00a94b6b0 -->
# Delta — doctor (prototype-walk-guide)

## ADDED Requirements

### Requirement: D2 names the guide the runbook relies on when it is missing
When the installed runbook names `apriori/guides/prototype-walk.md` and that path is missing or not a regular file, D2 SHALL report one finding naming the guide and the fix (`apriori update` installs a guide never installed; when update reports it missing, `apriori init --tools <t>` recreates it). A runbook that does not name the guide, or no readable runbook, raises no guide finding (a missing runbook is D2's own finding already).

#### Scenario: PW-03 doctor reports a missing guide the runbook names, and nothing otherwise
- WHEN doctor runs on a healthy project whose runbook names the guide and the guide is present, then with the guide deleted, then with a directory in its place, then with the guide deleted and the runbook missing
- THEN the first is HEALTHY; the second and third each give exactly one D2 finding naming `apriori/guides/prototype-walk.md` with a fix naming `apriori update`; the fourth gives the runbook's D2 finding and no guide finding

## Notes

Why: the owner decided on 2026-10-02 that the prototype-walk specification used on a real requirement enters apriori as a separate guide the runbook references, not as more runbook text, and that the runbook is not split now (Claude × Astra plan C-b, R59-CONSENSUS §四). It is also the first, deliberately small, test of the reference pattern — whether an agent reads a referenced file when the runbook tells it to — before any split is considered.
