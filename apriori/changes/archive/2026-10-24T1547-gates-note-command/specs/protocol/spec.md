<!-- apriori-base: sha256:00a09243af87dab230ccd0238676f32020c4cf9d7c70041187d2f39ccb3ee767 -->

# Delta — protocol (gates-note-command)

## ADDED Requirements

### Requirement: the runbook names `apriori note` as the writer of gates entries, and the CLI documents it
The runbook SHALL say, in §3's `gates:` comment block, that an entry is appended with `apriori note --change <name> "<text>"` (`--owner` for a human's verbatim decision) and that its stamp is the time of recording written by the CLI, never a time the agent fills in; §1 R4's review-progress sentence and its ruling sentence SHALL each name the same command for those entries while keeping the entry grammar they state. The CLI usage SHALL list `note`, and `docs/cli.md` and `docs/cli_cn.md` SHALL each carry an `## apriori note` section with the usage line, an example and the exit codes. No gate, archive refusal or structural defect is added for a hand-written stamp: the only reader that compares a stamp with the clock is the `status --change` advisory.

#### Scenario: PR-73 the runbook, the usage and the CLI reference name apriori note
- WHEN RUNBOOK.md §3 and §1 R4, the `apriori --help` usage and both CLI references are read
- THEN §3's gates comment names `apriori note` and the time of recording; R4's review-progress sentence and its ruling sentence each name `apriori note`; the usage lists `note`; both references carry `## apriori note` with usage, example and exit codes; and none of them announces a gate or defect for a hand-written stamp
