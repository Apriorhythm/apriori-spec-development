<!-- apriori-base: sha256:c02354615d4c7811b96b2defff710e185e2b490e4ac0c59d212fd3e0aec06b2f -->
## ADDED Requirements

### Requirement: archive consults CAS config through the structured reader
`archive`'s waiver lookup SHALL go through the shared structured config reader: fenced/commented rows grant nothing, a live row decides, and a cas CONFLICT or illegal value at consultation is a preflight error (exit 1, nothing written or moved) naming the config problem — bad config never equals a waiver; `--no-cas` keeps explicit supremacy; stamped or ADDED-only runs never consult the key, so a bad row cannot affect them.

#### Scenario: AM-42 the reviewer's fenced-waiver bypass is dead
- WHEN an unstamped MODIFIED delta archives under a config whose fenced block says `| cas | optional |` while the live row says `| cas | required |` (the reviewer's reproduced bypass), and again under a cas CONFLICT, and again fully stamped under the same broken configs
- THEN the first two runs are DENIED at preflight (nothing written; the conflict named in the second) while the stamped run proceeds untouched — and `--no-cas` still waives the first two explicitly
