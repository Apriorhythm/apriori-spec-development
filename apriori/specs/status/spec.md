### Requirement: status reports where a change is
`apriori status` SHALL read a change's flow-state and issue ledger and report its current step, next action, and open ledger items — with no args, it lists the active (non-archived) changes.

#### Scenario: ST-01 --change reports step, next-action, and open-ledger count
- WHEN `apriori status --change <name>` runs against a change with a flow-state file and a ledger
- THEN it prints the current step, next-action, and the count (and IDs) of ledger rows whose status is `open`

#### Scenario: ST-02 no args lists the active changes
- WHEN `apriori status` runs with no `--change`
- THEN it lists every directory under `apriori/changes/` except `archive/`, each with its step and open count

#### Scenario: ST-03 open-ledger detection ignores non-open rows
- WHEN the ledger has rows with statuses like `open`, `fixed`, `verified`, `advisory-acked`
- THEN only the `open` rows are counted as open

#### Scenario: ST-04 --json emits a machine-consumable report
- WHEN `apriori status --json` (or `--change <name> --json`) runs
- THEN it prints valid JSON — per change: change/step/tier/track/lineage/nextAction/lastGate/hasFlowState/openLedger (IDs) — with no prose mixed in, so an agent can parse instead of scraping text
