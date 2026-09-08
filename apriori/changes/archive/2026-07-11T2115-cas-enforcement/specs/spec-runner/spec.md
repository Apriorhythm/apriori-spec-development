<!-- apriori-base: sha256:f55efb5bce90edee6d2e3591334a1d0f7e0be25f7480e5c9877e84b87b5c6789 -->
# Delta — spec-runner (cas-enforcement)

## ADDED Requirements

### Requirement: projected verify surfaces unstamped mutation deltas
`verify --change` SHALL print one stderr warning per unstamped mutation delta (same message class as archive's) without affecting the verdict — an otherwise-GREEN run stays GREEN — and `--json` SHALL carry `projection.unstampedMutations` (the store-suffix-relative paths from buildProjection, `[]` when none; the field exists only where `projection` already does).

#### Scenario: SR-32 the projection warns but does not judge
- WHEN a change's delta carries mutation ops without a stamp
- THEN verify --change warns on stderr naming the file and the stamp cure, the run can still be GREEN, --json carries projection.unstampedMutations with the suffix, and an ADDED-only unstamped delta yields an empty list and no warning
