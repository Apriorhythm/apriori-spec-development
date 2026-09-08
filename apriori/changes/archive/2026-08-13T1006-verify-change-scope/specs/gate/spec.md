<!-- apriori-base: sha256:29e697ff6479a2e2093e9c226a800de563b1ba169dba4c5dc673bfe56cbec9b5 -->

## ADDED Requirements

### Requirement: C1 in-flight judges the change scope
`gate`'s C1 SHALL consume the change-scoped verdict and change-scoped duplicates on the in-flight stage, so parallel changes go green independently: a red test or gap belonging to another change's scope never blocks this change's C1. The passing detail reads `verify GREEN (in-flight, change-scoped)`; a blocking detail lists the change-scope gap classes; either detail carries an informative store-summary suffix with the six store-report counts (`; store: <boundRed> red, <unbound> unbound, <orphan> orphan, <unidentified> unidentified, <unattributed> unattributed, <duplicates> duplicate(s) outstanding`). The archived stage (whole-store verify) is unchanged.

#### Scenario: GT-26 parallel changes go green independently
- WHEN two in-flight changes have disjoint scopes and tests, and a red test belongs to change B's scope (B's scenario lives only in B's delta — invisible to A's projection; the sibling-delta scan attributes it)
- THEN change A's `gate --change` C1 passes (detail names change-scoped and carries the store suffix) while change B's C1 blocks — in the same repository, from the same TAP stream, even when the test command exits 1

#### Scenario: GT-27 only provably out-of-scope reds are non-blocking for C1
- WHEN the only failures in the TAP stream are tagged reds BOUND to projection scenarios outside change A's scope, and change A's own scenarios are all bound green
- THEN change A's C1 passes and the store suffix still shows the outstanding counts; conversely WHEN the stream carries an ID-less `not ok` or a FAILING true orphan THEN change A's C1 is BLOCKED (no provenance — fail closed), whatever change A's own scenarios say
