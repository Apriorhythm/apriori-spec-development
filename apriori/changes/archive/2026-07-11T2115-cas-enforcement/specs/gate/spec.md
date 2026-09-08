<!-- apriori-base: sha256:1c3819436de0c71cf291dcc9084b4f9fba71802a46c5e60daabbfeb0e0e83af4 -->
# Delta — gate (cas-enforcement)

## ADDED Requirements

### Requirement: C7 denies unstamped mutation deltas unless visibly waived
Gate SHALL run a seventh check: the change's projection carrying `unstampedMutations` → `C7 BLOCKED` naming each suffix and the stamp cure. Two escapes, flag over config: `gate --no-cas` → the check reports `waived (--no-cas)`; a process-config table row `| cas | optional |` (leading value token, case-insensitive; an absent row or any other value means required) → `waived (process-config)`. A waiver is always visible in the gate output — never a silent skip — and neither escape changes verify or archive behavior (stamped-mismatch failures and the WARN grade are untouched). In-flight only: at the archived stage the deltas are already merged and C7 reports n/a.

#### Scenario: GT-16 C7 blocks, and waivers are loud
- WHEN gate runs on a change whose delta carries unstamped mutation ops
- THEN C7 reports BLOCKED naming the suffix and the cure; with --no-cas or the `| cas | optional |` config row it reports the waiver by name instead of blocking (the flag also wins when the config says required), and a stamped or ADDED-only change passes C7 silently
