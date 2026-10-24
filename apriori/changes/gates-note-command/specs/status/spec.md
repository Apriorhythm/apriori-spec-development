<!-- apriori-base: sha256:08a524630d9eb8bed5ba8ae3aaea5d8b7eb8bc95d15d4c95c8bd1acda5a5916d -->

# Delta — status (gates-note-command)

## ADDED Requirements

### Requirement: status flags a gates stamp later than the machine's clock as an advisory
`apriori status --change <name>` SHALL compare the stamp of every dated `gates:` entry — normalized to the minute, exactly the entries and the normalization `lastRecorded` reads — with the machine's local clock at the time of the run, and for each stamp later than that clock print one `advisory:` line naming the flow-state line number, the stamp and the clock reading, and saying that stamps are self-recorded and that `apriori note` writes the time of recording. `--json` SHALL carry the same items under `advisories` as `{line, stamp, clock}`, an empty array when there are none. The advisory SHALL change nothing else: `lastRecorded`, `lastGate`, the escalation view, the owner-entry reading and the exit code are what they were; no grace window and no calendar check are applied; stamps without a time zone are compared as local wall-clock text; the list view (`apriori status` without `--change`) prints no such line.

#### Scenario: ST-47 a stamp later than the clock is an advisory, not a defect
- WHEN `status --change c` runs on a log whose last two entries are stamped in a year the machine's clock has not reached
- THEN the text view prints one `advisory:` line per such entry, each naming the line number, the stamp and `this machine's clock <YYYY-MM-DDTHH:MM>`; `--json` carries both in `advisories` as `{line, stamp, clock}`; `last recorded:` still reads the later of the two stamps; the exit code is 0

#### Scenario: ST-48 stamps at or before the clock raise no advisory
- WHEN every stamp of the log is at or before the clock's minute, and when a log holds no dated entry at all
- THEN no `advisory:` line is printed and `--json` carries `advisories: []`
