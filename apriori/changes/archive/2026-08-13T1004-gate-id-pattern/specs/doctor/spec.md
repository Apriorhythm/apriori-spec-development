<!-- apriori-base: sha256:2265b0d4a3bd9b34ed3b7a8e812b83d26196bbd8567e213e660b27413ee54e72 -->

## ADDED Requirements

### Requirement: D6 shows its pattern source and diagnoses a bad config row
`doctor`'s D6 SHALL scan the store with the effective id-pattern (config `id-pattern` row > `DEFAULT_ID`; doctor gains no flag) and its detail SHALL name the source — `config` when the row supplied the pattern, `default` otherwise. The id-pattern is resolved AND its D6 store scan is executed BEFORE the D5 probe runs (execution order; the report keeps its display order): an uncompilable config row — or a config-origin scan whose terminable child fails (timeout/kill/crash/malformed output) — makes D6 a `finding` that names `process-config` (fix: repair the row) WITHOUT throwing, AND D5 becomes `n/a` with the deterministic detail `probe skipped (invalid id-pattern config)` — the test command is never spawned under a broken id-pattern (the validate-before-any-test-command rule covers doctor too). Absent any other unusable condition the overall result stays `FINDINGS`, exit 1 — doctor diagnoses a repairable config, it does not refuse to run. When the pattern is valid, D5's probe parsing keeps `DEFAULT_ID` (its parsed-count classification is pattern-insensitive; unchanged by this change).

#### Scenario: DR-16 D6 names its pattern source
- WHEN doctor runs with a valid config `id-pattern` row covering the store's IDs, and separately without any row
- THEN the first D6 is `ok` with a detail naming the config source, and the second names the default source (finding or ok per the store's IDs) — both source texts are asserted

#### Scenario: DR-17 an invalid config id-pattern is a D6 finding and skips the probe
- WHEN the config `id-pattern` row does not compile and doctor runs on an otherwise healthy project whose test command is a sentinel (it would leave a marker file if spawned)
- THEN D6 is a `finding` naming `process-config` with a repair fix, no scenario scan happens, no exception escapes, D5 is `n/a` with detail `probe skipped (invalid id-pattern config)`, the sentinel marker does NOT exist (the command never ran), and the overall result is `FINDINGS` (exit 1)

#### Scenario: DR-18 a terminated config-pattern scan is a D6 finding and skips the probe
- WHEN the config pattern is catastrophic against the store's titles and doctor runs with a sentinel test command
- THEN the D6 child scan is killed within its budget, D6 is a `finding` naming `process-config`, D5 is `n/a` (`probe skipped (invalid id-pattern config)`), the sentinel marker does NOT exist, and the overall result is `FINDINGS` (exit 1)
