<!-- apriori-base: sha256:702ebda500834fcdb226271ca142d34a2ec99531693232abdbaeff16e9da2f1b -->
# Delta — gate (ledger-states)

## ADDED Requirements

### Requirement: C4 speaks the terminal-state vocabulary
Gate C4 SHALL parse every ledger row's status against the legal vocabulary (leading token, case-insensitive): non-terminal `open` / `fixed` / `rejected + reason`; terminal `verified` / `rejected-verified + reason` / `waived + reason` / `advisory-acked`. ANY other status blocks at BOTH stages. `rejected`, `rejected-verified`, and `waived` without a word-character reason block at both stages. A `waived` row additionally requires machine-checked human evidence at both stages: the change's flow-state `gates:` block must contain the row's ID and the text `waiv` (case-insensitive) — a producer-written row alone never passes. At the ARCHIVED stage every row must be terminal: `fixed` and plain `rejected` block with a cure naming the reviewer's verify/concur duty or the human waive. In-flight, `fixed` and reasoned `rejected` pass as today.

#### Scenario: GT-13 archived ledgers must be terminal
- WHEN gate resolves a change at the archived stage whose ledger carries a `fixed` row, a plain reasoned `rejected` row, or an unknown status like `done`
- THEN C4 reports BLOCKED naming each row and a cure, while an all-terminal ledger (verified / rejected-verified + reason / gates:-backed waived + reason / advisory-acked) passes

#### Scenario: GT-14 waives belong to humans, unknown states belong to nobody
- WHEN a ledger carries a `waived — reason` row without a matching flow-state gates: entry (the ID plus "waiv"), or any row whose status is outside the vocabulary, at either stage
- THEN C4 reports BLOCKED naming the row — and the same waived row passes once the gates: entry records the human decision

#### Scenario: GT-15 every archived ledger in this repo parses legal and terminal
- WHEN the corpus of archived changes (apriori/changes/archive/*) is walked and each change's ledger at apriori/review/<name>-issues.md is parsed
- THEN every row is legal AND terminal under the vocabulary (skip-if-absent for packaged environments)
