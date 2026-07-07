### Requirement: executable specs shrink verification and drop the OpenSpec adapter
The V3 runbook SHALL make scenario-to-test binding a deterministic gate, narrow the heterogeneous consistency review to what binding cannot prove, implement archive natively, and remove the OpenSpec adapter so the interface is single-path plain-files.

#### Scenario: PR-01 STEP5 exit adds a deterministic spec-runner gate
- WHEN a change reaches STEP5 exit
- THEN "spec-runner reports GREEN (every scenario BOUND-GREEN)" is a required exit condition, alongside the existing test/lint conditions

#### Scenario: PR-02 P8 scope narrows to semantic faithfulness
- WHEN the consistency review (P8) runs on a change whose spec-runner is already GREEN
- THEN P8's mandate is narrowed to whether each test faithfully exercises its scenario's intent (binding/coverage is now mechanical, per the v2.2 judge-bias caveat), not re-checking coverage

#### Scenario: PR-03 archive action is native plain-files, no adapter
- WHEN STEP6 archive runs
- THEN it uses archive-merge (AM-01..06) directly; there is no `openspec/` path and no `/opsx:` adapter command

#### Scenario: PR-04 the interface is single-path plain-files
- WHEN any runbook/README section references artifact paths
- THEN it names only the `apriori/` plain-files layout; no `(adapter: openspec/…)` dual-path parentheticals remain (CK-05 enforces this)

#### Scenario: PR-05 the disposable prototype rule still holds
- WHEN an explore-track change archives
- THEN `spike/` is deleted or quarantined and STEP5 is rebuilt from failing tests (unchanged from v2)

#### Scenario: PR-06 a configurable language governs human-facing prose, machine tokens stay English
- WHEN the runbook describes output language
- THEN human-facing prose follows `process-config.md`'s `language` (unset/`auto` → match the human), while machine tokens (verdict lines, scenario IDs, ADDED/MODIFIED/REMOVED, file paths) stay English regardless

#### Scenario: PR-07 an optional pre-STEP0 brainstorm stance funnels into the pipeline
- WHEN the runbook describes what to do with a still-fuzzy idea
- THEN it offers a **Brainstorm** stance (a stance, not a tracked step; no required output; never writes code) that must funnel into STEP0 when the goal becomes stateable, or the explore-track intent card when it cannot

#### Scenario: PR-08 proposal.md is a STEP2 artifact
- WHEN STEP2 (propose / P4) runs
- THEN `proposal.md` (a human-readable why/what/out-of-scope one-pager) is listed in §4's artifact table and produced by P4, and the STEP3 gate packet includes it
