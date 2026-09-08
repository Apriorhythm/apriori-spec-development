<!-- apriori-base: sha256:2038c20e0d9dbe2fee74000a7edf3427512fa99b47c1496ec7f2c14bd1613504 -->

## MODIFIED Requirements

### Requirement: D6 shows its pattern source and diagnoses a bad config row
`doctor`'s D6 SHALL scan the store with the effective id-pattern (config `id-pattern` row > `DEFAULT_ID`; doctor gains no flag) and its detail SHALL name the source — `config` when the row supplied the pattern, `default` otherwise. The id-pattern is resolved AND its D6 store scan is executed BEFORE the D5 probe runs (execution order; the report keeps its display order): an uncompilable config row — or a config-origin scan whose terminable child fails (timeout/kill/crash/malformed output) — makes D6 a `finding` that names `process-config` (fix: repair the row) WITHOUT throwing, AND D5 becomes `n/a` with the deterministic detail `probe skipped (invalid id-pattern config)` — the test command is never spawned under a broken id-pattern (the validate-before-any-test-command rule covers doctor too). Absent any other unusable condition the overall result stays `FINDINGS`, exit 1 — doctor diagnoses a repairable config, it does not refuse to run. D5's probe parsing SHALL NOT consume `DEFAULT_ID` at all: it keeps its own frozen classification regex, because it judges TAP PLUMBING rather than scenario identity, and borrowing the project's ID vocabulary made a widening of that vocabulary able to reclassify a healthy TAP stream — a tagged SKIP/TODO contributes nothing to the parsed count, so newly-recognised skips could turn `ok` into `truncated or malformed`. The earlier claim that the parsed-count classification is pattern-insensitive was FALSE; decoupling makes it true by construction. D6 SHALL also distinguish WHY a scenario is unbindable: a title whose first whitespace-delimited token contains at least one digit AND at least one `-` or `_` is ID-SHAPED, so its fix names the `id-pattern` row in `apriori/process-config.md`; a title without such a token gets the unchanged add-an-ID fix. Each class produces exactly one finding, and the pattern-mismatch detail carries both the bounded pattern source and its origin, plus AT MOST THREE sample titles taken in store order and each truncated to 40 characters — a diagnostic that dumps fifty titles is as unusable as one that names none.

#### Scenario: DR-16 D6 names its pattern source
- WHEN doctor runs with a valid config `id-pattern` row covering the store's IDs, and separately without any row
- THEN the first D6 is `ok` with a detail naming the config source, and the second names the default source (finding or ok per the store's IDs) — both source texts are asserted

#### Scenario: DR-17 an invalid config id-pattern is a D6 finding and skips the probe
- WHEN the config `id-pattern` row does not compile and doctor runs on an otherwise healthy project whose test command is a sentinel (it would leave a marker file if spawned)
- THEN D6 is a `finding` naming `process-config` with a repair fix, no scenario scan happens, no exception escapes, D5 is `n/a` with detail `probe skipped (invalid id-pattern config)`, the sentinel marker does NOT exist (the command never ran), and the overall result is `FINDINGS` (exit 1)

#### Scenario: DR-18 a terminated config-pattern scan is a D6 finding and skips the probe
- WHEN the config pattern is catastrophic against the store's titles and doctor runs with a sentinel test command
- THEN the D6 child scan is killed within its budget, D6 is a `finding` naming `process-config`, D5 is `n/a` (`probe skipped (invalid id-pattern config)`), the sentinel marker does NOT exist, and the overall result is `FINDINGS` (exit 1)

#### Scenario: DR-19 D5 does not consume the project ID vocabulary
- WHEN the effective default scenario-ID pattern is widened and a TAP stream carries a tagged skip whose description uses one of the newly-recognised ID shapes (for example `ok 1 - AC-30f pending # SKIP flaky`)
- THEN D5's classification is IDENTICAL to what it was before the widening — it reads its own frozen regex, never `DEFAULT_ID`, so no widening of the project's ID vocabulary can move a healthy TAP stream into `truncated or malformed`

#### Scenario: DR-20 D6 tells you which repair it means
- WHEN the store holds scenarios whose titles carry an ID-shaped leading token that the effective pattern does not match, and separately scenarios with no such token at all
- THEN two findings appear, each naming only its own scenarios: the first's fix points at the `id-pattern` row in `apriori/process-config.md` and its detail carries the bounded pattern source, its origin, and at most three store-order samples each capped at 40 characters, the second's fix is the unchanged add-a-leading-ID text — a well-formed ID that merely misses the pattern must never send a human off to rewrite fifty IDs
