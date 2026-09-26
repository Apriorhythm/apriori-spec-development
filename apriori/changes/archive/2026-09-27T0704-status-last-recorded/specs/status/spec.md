<!-- apriori-base: sha256:e919cc44c1aa1c0e4e3c3eb89071dfbc82aab0519b54b9110a1fb10c89984bd1 -->
# Delta — status (status-last-recorded)

## ADDED Requirements

### Requirement: status shows when each change last recorded something, and says where that time comes from
`apriori status` SHALL report, for each change it shows, the latest date its own flow-state `gates:` log carries — read through the same structured pass as every other gates reader (fenced code and HTML comments are inert). An entry counts when its first token opens with a range-checked `YYYY-MM-DD` (month 01-12, day 01-31, no calendar); a readable `THH:MM` or `THHMM` right after it (hour 00-23, minute 00-59) adds the minute, and any other suffix leaves the day; only that first token is read, so an entry whose payload sits on its continuation line still counts. The latest by that normalized text wins, whatever order the entries were written in; an entry with an out-of-range date does not count. With no counting entry, or no readable flow-state, the time is `unknown` with the reason. Every surface names the source (the change's own `gates:` log) and that the time is self-recorded, never proof of activity; nothing computes an age, compares with the clock or labels a change stale. `lastGate` and the `last decision:` line keep their meaning.

#### Scenario: ST-41 the list shows each change's last recorded time, latest wins, unknown says why
- WHEN `apriori status` runs with no `--change` over changes whose `gates:` logs are written in order, out of order, with day-only and unreadable-time entries, with an out-of-range date, with an entry inside a fenced block, with no dated entry, and with no flow-state
- THEN each line carries `last recorded in gates: <time>` — the latest counted date, to the minute when that entry's time is readable and to the day otherwise — or `unknown` with its reason (`no dated entry` / `no flow-state`); a line after the list says the time is the latest date the change's own gates: log carries, self-recorded and not proof of activity; and nothing prints an age or a stale label

#### Scenario: ST-42 --change shows the same time on its own line, and lastGate keeps its meaning
- WHEN `apriori status --change <name>` runs on a change whose gates: log is written out of order
- THEN it prints `last recorded: <latest time>` naming the gates: log as the self-recorded source, while `last decision:` still shows the textually last dated entry, unchanged; and every other successful detail view — a leftover hotfix-lane bundle, in flight or archived, included — prints the same line, reading `unknown (no flow-state)` there, beside its own messages

#### Scenario: ST-43 --json carries lastRecorded in every change view
- WHEN `apriori status --json` or `apriori status --change <name> --json` runs
- THEN each change view carries `lastRecorded: {at, source, reason}` — `at` the normalized latest time or `null`, `source` the string `gates`, `reason` `null` or why `at` is unknown — the error view carries `lastRecorded: null`, and no age or staleness field exists

## Notes

Why: the list showed a phase and an open count but not when anyone last wrote to the change, and in the 2026-09-26 diagnosis of real projects that time had to be dug out by hand. The rule that it is not a staleness judgment and not proof of activity comes from the Claude × Astra consensus (NI-CONSENSUS §一 E). The latest date wins over the textually last entry because five of fifteen real in-flight logs with more than one dated entry were written out of order.
