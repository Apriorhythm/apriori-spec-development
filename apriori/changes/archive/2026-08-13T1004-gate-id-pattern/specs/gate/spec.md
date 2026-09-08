<!-- apriori-base: sha256:320d8232aeca0e8e9b29693586d1f13efa7a82da2e07bdd235d6d73dcf388a86 -->

## ADDED Requirements

### Requirement: gate consumes the effective id-pattern in C1
`gate` SHALL accept an `--id-pattern` flag and thread the effective id-pattern (flag > config `id-pattern` row > `DEFAULT_ID`, same resolution as verify) into C1's verify run in BOTH stages — the in-flight projected form and the archived store form. Flag presence is judged by presence, never truthiness (a present-but-empty `--id-pattern` is a flag-origin validation error and never falls back to the config). An invalid effective pattern is a gate ERROR (exit 2) through the existing structured error path: `runGate` returns the existing `{result:'ERROR', errors:[...]}` shape with the origin-naming message (source echo bounded per the verify rule), text mode prints `gate:` lines, and `--json` stays pure JSON in every outcome class.

#### Scenario: GT-22 gate accepts --id-pattern for C1
- WHEN `apriori gate --change <name> --id-pattern <re>` runs against a store whose scenario IDs only `<re>` recognizes
- THEN C1 binds with `<re>` (no `unidentified` in its detail) in both the in-flight and the archived stage

#### Scenario: GT-25 a terminated config-pattern match is a gate ERROR
- WHEN gate runs without a flag over a config pattern whose matching the child terminates (catastrophic pattern + adversarial titles)
- THEN gate exits 2 with `result: ERROR`, the sanitized message in `errors[]` names `process-config`, and `--json` stays pure JSON

#### Scenario: GT-23 gate falls back to the config row
- WHEN the config carries an `id-pattern` row and gate runs without the flag
- THEN C1 binds with the configured pattern — same verdict as the flagged run

#### Scenario: GT-24 an invalid effective pattern is a gate ERROR
- WHEN gate runs with an uncompilable `--id-pattern`, or with a present-but-EMPTY `--id-pattern` over a valid (or invalid) config row, or without a flag over an uncompilable config row
- THEN gate exits 2 with `result: ERROR`, the message in `errors[]` names `--id-pattern` (uncompilable and empty flag alike — the empty flag never falls back to the config) or `process-config` respectively, and `--json` output is still pure JSON
