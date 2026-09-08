<!-- apriori-base: sha256:6cdceaa45ca2047796a01ed55243c3e6b4f513f983d72468790d1cc1c5c9a700 -->

## ADDED Requirements

### Requirement: verify --change carries the modified-block integrity report
On a trustworthy `--change` run, `verify` SHALL attach the integrity engine's report for every MODIFIED operation (rename-then-modify targets included, keyed by the post-rename name with the pre-rename block as baseline). The old blocks' scenario titles ride the EXISTING single title batch as a fourth tag class that never enters binding accumulation, scenario counts or the change scope — the two-batch matcher contract stands. JSON: `modifiedIntegrity` is ALWAYS present on GREEN/GAPS (one entry per MODIFIED operation, empty-diff entries included; `file` = store-relative suffix; element shapes, value choices and orderings per the engine's contract; missingLines carry full untruncated text) and ABSENT on every ERROR class and on every `--specs` run (byte goldens continue to prove the latter). Human: a `— MODIFIED INTEGRITY —` section prints an entry when any of dropped/missingLines/ambiguous/titleChanged is non-empty (`!` prefix on dropped/missingLines/ambiguous lines; a plain one-line note per titleChanged; counts only for retained/added), stays entirely silent when every entry's four classes are empty, and truncates lines the state-A way (`slice(0,119)+'…'`). The report never changes the verdict or the exit code.

#### Scenario: SR-65 the report rides the run without touching the verdict
- WHEN a `--change` run's MODIFIED replacement drops KV-02 and loses one AND line, while every scoped scenario is bound green (TAP covering the replacement's scenarios, exit 0)
- THEN the run is still GREEN exit 0; `modifiedIntegrity` carries dropped=[KV-02] and the missing line with full text; the human section prints them with `!`; and removing one scoped test flips the same run to GAPS exit 1 with the identical report attached

#### Scenario: SR-66 presence follows the outcome class
- WHEN `--change --json` runs end GREEN, GAPS, pre-test ERROR and post-TAP ERROR, and a `--specs --json` run executes
- THEN GREEN/GAPS carry `modifiedIntegrity` (an ADDED-only delta yields `[]`; an idempotent MODIFIED — the trim-equal path AND the stamped-rerun repaired path alike — yields its empty-diff entry); both ERROR classes and the `--specs` run omit the field entirely (absent, never null)

#### Scenario: SR-67 the old-block titles join the one batch and bind nothing
- WHEN a config-origin `--change` run with a MODIFIED delta executes with a counting child seam
- THEN the matcher child still runs EXACTLY twice, the first payload contains the OLD block's titles alongside the projection and sibling titles, and the old titles appear in no binding class, no scenario count, no change scope and no store report

#### Scenario: SR-68 the frozen live-specimen fixture reports exactly as hand-derived
- WHEN the engine runs over the frozen copy of the verify-change-scope change's real MODIFIED block (the nine-scenario `projected verify` requirement) against its frozen old store block
- THEN the report deep-equals the hand-derived expectation: retained = ALL NINE scenarios (the two rewrites changed only THEN lines, never titles — hand derivation corrected the earlier assumption), titleChanged=[], dropped=[], added=[], ambiguous=[], and missingLines = exactly the two replaced old THEN lines (scenario SR-16's and scenario SR-18's), full text
