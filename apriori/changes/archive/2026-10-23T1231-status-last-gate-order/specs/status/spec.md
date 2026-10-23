<!-- apriori-base: sha256:882735da7845ad050de0b4ef376f9604f5e4c69f52d02197fe9d6113672547ea -->

# Delta — status (status-last-gate-order)

## MODIFIED Requirements

### Requirement: status shows when each change last recorded something, and says where that time comes from
`apriori status` SHALL report, for each change it shows, the latest date its own flow-state `gates:` log carries — read through the same structured pass as every other gates reader (fenced code and HTML comments are inert). An entry counts when its first token opens with a range-checked `YYYY-MM-DD` (month 01-12, day 01-31, no calendar); a readable `THH:MM` or `THHMM` right after it (hour 00-23, minute 00-59) adds the minute, and any other suffix leaves the day; only that first token is read, so an entry whose payload sits on its continuation line still counts. The latest by that normalized text wins, whatever order the entries were written in; an entry with an out-of-range date does not count. With no counting entry, or no readable flow-state, the time is `unknown` with the reason. Every surface names the source (the change's own `gates:` log) and that the time is self-recorded, never proof of activity; nothing computes an age, compares with the clock or labels a change stale. `lastGate` and the `last decision:` line are the latest owner decision (the requirement below), not this time.

#### Scenario: ST-41 the list shows each change's last recorded time, latest wins, unknown says why
- WHEN `apriori status` runs with no `--change` over changes whose `gates:` logs are written in order, out of order, with day-only and unreadable-time entries, with an out-of-range date, with an entry inside a fenced block, with no dated entry, and with no flow-state
- THEN each line carries `last recorded in gates: <time>` — the latest counted date, to the minute when that entry's time is readable and to the day otherwise — or `unknown` with its reason (`no dated entry` / `no flow-state`); a line after the list says the time is the latest date the change's own gates: log carries, self-recorded and not proof of activity; and nothing prints an age or a stale label

#### Scenario: ST-42 --change shows the same time on its own line, beside the last decision
- WHEN `apriori status --change <name>` runs on a change whose gates: log is written out of order
- THEN it prints `last recorded: <latest time>` naming the gates: log as the self-recorded source, while `last decision:` shows the latest owner entry by stamp (here the log's one owner entry); and every other successful detail view — a leftover hotfix-lane bundle, in flight or archived, included — prints the same line, reading `unknown (no flow-state)` there, beside its own messages

#### Scenario: ST-43 --json carries lastRecorded in every change view
- WHEN `apriori status --json` or `apriori status --change <name> --json` runs
- THEN each change view carries `lastRecorded: {at, source, reason}` — `at` the normalized latest time or `null`, `source` the string `gates`, `reason` `null` or why `at` is unknown — the error view carries `lastRecorded: null`, and no age or staleness field exists

## ADDED Requirements

### Requirement: the last decision is the latest owner entry by stamp, never a note
`lastGate` — the `last decision:` line of `apriori status --change` and the `lastGate` field of every change view in `--json` — SHALL be the latest OWNER entry of the change's `gates:` log by its stamp: an entry the owner-entry rule reads (`- <YYYY-MM-DDTHH:MM> owner: …`, minute required, range-checked, fenced and commented lines inert), the latest normalized stamp winning whatever order the lines were written in, a tie going to the later line; rendered as the entry's first line without its bullet. A `note:` entry SHALL never be shown as a decision, a dated line outside the `gates:` block never counts, and a log with no owner entry has `lastGate: null` and no `last decision:` line. `lastRecorded` is unchanged by this.

#### Scenario: ST-45 last decision is the latest owner entry by stamp, never a note, null without one
- WHEN `parseFlowState` reads logs where the owner's decision sits mid-log with a later-dated and an earlier-dated note after it, where two owner entries are out of order, where two owner entries share a minute, where a compact `THHMM` stamp is later in time than a colon `THH:MM` stamp written after it, where only notes exist, where a forged stamp and a fenced owner line sit beside a real one, and where a dated owner-shaped line sits outside the gates block
- THEN it answers the owner entry with the latest stamp, the later of the two same-minute entries, the compact stamp (normalized before comparing), `null` for notes only, the real entry beside the forged and fenced ones, and `null` when the only owner-shaped line is outside the gates block

#### Scenario: ST-46 status shows it the same way: text line, --json field, absent when there is none
- WHEN `apriori status --change` runs in text and `--json`, and `apriori status --json` lists the changes
- THEN the text view prints `last decision: <latest owner entry>` and never a note under that label, prints no `last decision:` line for a log of notes only while `last recorded:` still appears, and every `--json` change view carries the same value in `lastGate` or `null`

## Notes

Follow-up LG-1, registered by status-last-recorded (archived 2026-09-27T0704): `lastGate` took the textually last dated entry and labelled a `note:` a decision; in the real corpus 4 of 20 in-flight changes had it not the latest (2 earlier by days). The owner asked on 2026-10-23 to fix it. Same ordering as `lastRecorded`, read through the same gates pass; the JSON key keeps its name and type (`string|null`).
