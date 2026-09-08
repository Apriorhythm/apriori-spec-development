<!-- apriori-base: sha256:a0e0ace92f01cb0de0b943eb0afa89deeb0ab6c6e6dfb163d84aa8bbd970d56f -->
## ADDED Requirements

### Requirement: update warns on legacy 3.x layouts
`apriori update` SHALL run the same five-root legacy-layout detection as doctor's D8 and print a warning naming the roots found and pointing at the MIGRATING.md 4.0 section — without blocking the update itself: refreshing the protocol while the artifacts sit in pre-4.0 roots must be loud, never silent.

#### Scenario: UP-12 updating a legacy-layout project is loud
- WHEN `apriori update` runs in a project still carrying `apriori/review/` and a top-level `requirement/`
- THEN the update proceeds as normal AND a warning names both roots with the migration pointer; a clean 4.0 project updates without the warning
