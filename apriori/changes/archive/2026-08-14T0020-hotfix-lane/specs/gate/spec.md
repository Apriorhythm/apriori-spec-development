<!-- apriori-base: sha256:1fb78de8ff1b736b6007a0f6c1551c0021a15e287767394b6eaa69630fdac919 -->

## ADDED Requirements

### Requirement: a hotfix bundle is refused by the gate with a pointer, not adapted
The gate's object is a formal change. When the resolved directory carries `hotfix-state.md` the gate SHALL refuse the run as an evaluation error and name `apriori hotfix archive <name>` as the surface that judges the lane — the seven checks are neither run nor reinterpreted, and none of their logic changes. A directory carrying BOTH `flow-state.md` and `hotfix-state.md` is refused as an identity error naming both files, since neither reading can be trusted.

#### Scenario: GT-28 the gate points a hotfix bundle at its own preflight
- WHEN `gate --change <name>` resolves a directory holding `hotfix-state.md` and no `flow-state.md`
- THEN the gate exits 2 with an error naming the hotfix lane and `apriori hotfix archive`, and reports no check results at all

#### Scenario: GT-29 a bundle carrying both identities is an error at the gate too
- WHEN the resolved directory holds both `flow-state.md` and `hotfix-state.md`
- THEN the gate exits 2 naming both files rather than judging either one
