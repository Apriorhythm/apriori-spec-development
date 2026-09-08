<!-- apriori-base: sha256:16119de0eff16f2c4def022d985dfa218fe52a0b5e04c876b6a73105dbe6f7f4 -->
# Delta — check (readme-split)

## ADDED Requirements

### Requirement: self-mode guards the split documentation set
`apriori check --self` SHALL extend its EN/CN pair coverage to the docs/ pairs (concepts, legacy, ci, cli, troubleshooting — `_cn` suffix convention) and SHALL resolve links relative to the linking file, validating cross-file fragments.

#### Scenario: CK-08 docs pairs are guarded, one-sided pairs fail
- WHEN `check --self` runs where a docs/ pair misaligns (heading count, level, or numeric prefix), or exactly ONE side of a pair exists
- THEN it FAILs naming the pair (or the missing mirror); WHEN both sides of a pair are absent THEN that pair is skipped and older checkouts pass as before

#### Scenario: CK-09 links resolve from the linking file and fragments are validated
- WHEN a checked file links `./y.md` or `./y.md#frag`
- THEN the target resolves relative to THAT file's directory (root files unchanged); a missing target file FAILs naming the linking file; and a fragment with no heading in the target slugifying (ghSlug) to it FAILs naming both — self-mode only
