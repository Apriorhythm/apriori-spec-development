<!-- apriori-base: sha256:da718b7a15d30d5bb8664312b8fe46154de19f818c948a3e1d824c5523c7a44a -->
# Delta — status (limit-ruling)

## MODIFIED Requirements

### Requirement: status reports the effective review-round limit and the progress diagnostics
`apriori status --change <name>` SHALL report, beside each family's round and verdict, the effective `review-round-limit` the loop was judged against — `review-round-limit <n> (default|config)` in text, `review.limit = {value, origin}` in `--json` — or the resolver's error in its place (`review.limit = {error}`), and SHALL list every producer-record finding gate C8 would print — a `review-progress` record, and at the limit the rulings and the one re-review owed — as `review progress: …` lines (`review.progress` in `--json`, `[]` when none); rulings owed are never an escalation and never make `--escalation` exit 3. Status never keeps a count of its own: the numbers are the loop's.

#### Scenario: ST-40 status shows the limit and the progress findings the loop computed
- WHEN `status --change c` runs (text and `--json`) against a family at round 1 under the default limit; then against a family at round 3 whose progress record is missing; then under `| review-round-limit | 0 |`
- THEN the first prints `review-round-limit 8 (default)` and `review.limit` is `{value: 8, origin: 'default'}` with `review.progress` `[]`; the second prints a `review progress:` line naming `review-progress <family> round 3` and `review.progress` carries the same string; the third prints the resolver's error and `review.limit` is `{error}` naming `review-round-limit` and the legal range

#### Scenario: ST-44 a family at the limit shows the rulings owed and is not an escalation
- WHEN `status --change c` runs against a family whose round 3 is `revise` under `| review-round-limit | 3 |` with no rulings; then with complete rulings and no re-review yet
- THEN the first prints a `review progress:` line naming the rulings owed for round 3 and `review.progress` carries it; the second names the one re-review owed; in both `--escalation` prints `ESCALATION: none` and exits 0

## Notes

Why: the default limit is 8 and a family at the limit owes rulings and one re-review — the producer's work, shown where the progress findings already are (DA-CONSENSUS §三).
