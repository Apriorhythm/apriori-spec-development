<!-- apriori-base: sha256:d15a099ed64d70d9041925a1df5b4979849dd45e5500a5ded280c4441990b834 -->
# Delta — status (review-round-limit)

## ADDED Requirements

### Requirement: status reports the effective review-round limit and the progress diagnostics
`apriori status --change <name>` SHALL report, beside each family's round and verdict, the effective `review-round-limit` the loop was judged against — `review-round-limit <n> (default|config)` in text, `review.limit = {value, origin}` in `--json` — or the resolver's error in its place (`review.limit = {error}`), and SHALL list every `review-progress` finding gate C8 would print (`review progress: …` lines; `review.progress` in `--json`, `[]` when none). Status never keeps a count of its own: the numbers are the loop's.

#### Scenario: ST-40 status shows the limit and the progress findings the loop computed
- WHEN `status --change c` runs (text and `--json`) against a family at round 1 under the default limit; then against a family at round 3 whose progress record is missing; then under `| review-round-limit | 0 |`
- THEN the first prints `review-round-limit 7 (default)` and `review.limit` is `{value: 7, origin: 'default'}` with `review.progress` `[]`; the second prints a `review progress:` line naming `review-progress <family> round 3` and `review.progress` carries the same string; the third prints the resolver's error and `review.limit` is `{error}` naming `review-round-limit` and the legal range
