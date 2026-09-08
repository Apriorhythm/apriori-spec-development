<!-- apriori-base: sha256:c80793e6ddaa0be8610a0bb6b0c0a46328862ddf87dee76f7771ade135458bc0 -->
## MODIFIED Requirements

### Requirement: C7 denies unstamped mutation deltas unless visibly waived
Gate SHALL run a seventh check: the change's projection carrying `unstampedMutations` → `C7 BLOCKED` naming each suffix and the stamp cure. Two escapes, flag over config: `gate --no-cas` → the check reports `waived (--no-cas)`; a process-config `cas` row read through the shared structured reader with value `optional` (leading token, case-insensitive; an absent row or `required` means required) → `waived (process-config)`. A cas CONFLICT or illegal value at consultation makes C7 BLOCKED naming the config error — bad config never equals a waiver, though the `--no-cas` flag still waives explicitly. A waiver is always visible in the gate output — never a silent skip. The waiver vocabulary is shared with `archive` (which denies by default since 4.0.1); verify's projection stays warn-only. In-flight only: at the archived stage the deltas are already merged and C7 reports n/a.

#### Scenario: GT-16 C7 blocks, and waivers are loud
- WHEN gate runs on a change whose delta carries unstamped mutation ops
- THEN C7 reports BLOCKED naming the suffix and the cure; with --no-cas or the live `| cas | optional |` config row it reports the waiver by name instead of blocking (the flag also wins when the config says required), and a stamped or ADDED-only change passes C7 silently

#### Scenario: GT-17 bad cas config blocks instead of waiving
- WHEN the process-config carries a cas CONFLICT (two live rows, different values) or a fenced-only `optional` row, and gate runs on an unstamped-mutation change
- THEN C7 reports BLOCKED — naming the config conflict in the first case, and the missing waiver in the second (fenced rows grant nothing); adding `--no-cas` waives either way
