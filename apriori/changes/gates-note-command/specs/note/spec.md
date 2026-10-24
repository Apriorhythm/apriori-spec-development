<!-- apriori-base: new -->

# Delta — note (gates-note-command)

## ADDED Requirements

### Requirement: note appends a stamped entry to a change's gates log
`apriori note --change <name> "<text>"` SHALL append `- <YYYY-MM-DDTHH:MM> note: <text>` to the `gates:` log of `apriori/changes/<name>/flow-state.md`, the stamp being the CLI's local clock at the moment of writing — minute precision, the same format `apriori new` writes into its scaffold note — and print the entry it wrote. `--owner` SHALL write the `owner:` label instead, for a human's decision transcribed verbatim; it transcribes, it does not prove that the human decided. The stamp is the time of recording, never a claimed event time: the command SHALL take no date or time argument, and a text recording an earlier event says so in its own words. It SHALL only append: every byte before the new entry stays as it was — the file's own line ending (LF or CRLF) included — and the entry lands after the last non-blank line of the gates block, indented like the last entry before it (a column-0 log gets a column-0 entry). A text containing line breaks (CRLF included) SHALL be written as one entry: its first non-blank line follows the stamp and label, every further non-blank line is a continuation line indented by at least four spaces, and it never becomes a second entry. Because the state file's readers open an entry on any line that starts with a list marker and blank the log from an HTML comment marker on, a text whose continuation line would open a list item or a code fence, or that contains `<!--` or `-->` anywhere, is refused as a usage error — never rewritten. An empty or whitespace-only text is a usage error too.

#### Scenario: NT-01 a note lands at the end of the gates log with the CLI's clock
- WHEN `apriori note --change add-playback "Specify done — spec.md CP-01..CP-10"` runs at local time 2026-10-24T15:07 on a change whose gates log already holds the scaffold note — on an LF file, on the same file with CRLF line endings, and on a log whose entries sit at column 0
- THEN flow-state.md ends with the scaffold note followed by `  - 2026-10-24T15:07 note: Specify done — spec.md CP-01..CP-10` (at column 0 for the column-0 log), every byte before the new entry is unchanged and the new lines use the file's own line ending, the command prints that entry and exits 0, and `apriori status --change add-playback` reads `last recorded: 2026-10-24T15:07`

#### Scenario: NT-02 --owner writes the owner label and nothing else changes
- WHEN `apriori note --change add-playback --owner "evidence-accept R-01 — accepted, the staging run covers it"` runs
- THEN the entry written is `- <stamp> owner: evidence-accept R-01 — accepted, the staging run covers it`, and `apriori status --change add-playback` shows it as `last decision:`

#### Scenario: NT-03 a multi-line text is one entry, and a text that could become two is refused
- WHEN the text contains line breaks or CRLF sequences whose further lines are plain prose; and when a continuation line starts with `- ` (a bullet, or a forged `- <stamp> owner: …` line), `* `, a code-fence opener, or the text contains `<!--` anywhere
- THEN for the plain text the first non-blank line follows the stamp and label, each further line is an indented continuation line, `gatesEntries` reads exactly one new entry whose joined form carries the whole text with a `null` owner payload, the entry count grows by one and `last decision:` is unchanged; and each hazardous text is refused with exit 2, a message naming the offending line, the usage, and the file byte-for-byte unchanged

#### Scenario: NT-04 the command refuses anything but an active change's flow-state
- WHEN the change does not exist or is archived, its directory entry is a symlink or escapes `apriori/changes/`, its flow-state is missing or is a symlink, or the flow-state has no `gates:` block or two of them
- THEN it writes nothing, prints one error naming the cause and exits 1; with no text, an empty text, no `--change`, or an unknown flag it prints the usage and exits 2

#### Scenario: NT-05 no backdating argument exists
- WHEN `apriori note` is run with `--at`, `--date` or `--time`
- THEN each is refused as an unknown flag (exit 2), and the usage text says the stamp is the time of recording written by the CLI

### Requirement: the review-loop hints name the command
The hint `gate` prints for a missing review-progress record and the hint it prints for the rulings owed at the limit SHALL each tell the agent to append the entry with `apriori note --change <name> "…"`, beside the entry grammar they already show.

#### Scenario: NT-06 the C8 hints point at apriori note
- WHEN `apriori gate` prints the review-progress hint or the ruling hint for a change
- THEN each hint names `apriori note --change <name>` with the payload it is to carry (`review-progress <family> round <n> — …` / `ruling <family> round <n> — …`)
