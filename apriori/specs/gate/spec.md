### Requirement: gate aggregates the mechanical exit conditions for one change
`apriori gate --change <name>` SHALL evaluate the machine-checkable gate conditions for exactly one change and encode the aggregate in its exit code: 0 = every applicable check passed (`GATE: PASS`), 1 = at least one check blocked (`GATE: BLOCKED (<n> item(s))`), 2 = the evaluation itself is untrustworthy (usage error, invalid or escaping name, change found nowhere, unreadable flow-state, or an untrustworthy C1 verify run). It SHALL be strictly read-only and SHALL state in its output that PASS covers mechanical checks only — human gates remain human.

#### Scenario: GT-01 a clean in-flight change passes
- WHEN every applicable check passes for an in-flight change
- THEN each check reports `✓`, the final line is `GATE: PASS` (with the mechanical-only caveat), and the exit code is 0

#### Scenario: GT-02 an unchecked task blocks
- WHEN the resolved change dir's tasks.md contains an unchecked `- [ ]` box (while `- [x]` and `- [X]` count as checked)
- THEN C2 reports `✗` naming the file, the final line is `GATE: BLOCKED` with the count, and the exit code is 1

#### Scenario: GT-03 the ledger blocks on open rows and reasonless rejections
- WHEN the ledger at `apriori/review/<name>-issues.md` contains a row whose status starts `open` (case-insensitive), or a `rejected` row with no reason text beyond the word itself
- THEN C4 blocks naming the row ID; a `rejected` row passes only when, after stripping the leading word `rejected`, the remaining text contains at least one word character (`rejected: duplicate` passes; `rejected`, `rejected:`, `rejected -` block); `advisory*`/`fixed`/`verified` rows never block

#### Scenario: GT-04 flow-state legality is enforced
- WHEN a required flow-state key (`change`, `tier`, `track`, `lineage`, `current-step`) is missing, still a `<placeholder>`, has a `current-step` outside the exact vocabulary (STEP0..STEP6, INTENT-CARD, SPIKE, EXTRACTION, DONE, ABANDONED), a `tier` outside {trivial, medium, large}, or a `change` value that does not equal `--change`
- THEN C3 blocks naming the offending key; a fully legal flow-state passes

#### Scenario: GT-05 verdict evidence is mechanical
- WHEN a review doc for the change (files matching `apriori/review/<name>-*.md` or `apriori/design/<name>-review-v*.md`, excluding the ledger and `*-raw` stems, regular files only) contains a `^VERDICT:` line but no file that is REGULAR by lstat (symlinks are not evidence) matches `apriori/review/<stem>-raw.*`
- THEN C5 blocks naming the doc; adding the raw flips it to `✓`; a symlink matching the doc globs blocks naming the symlink (an evidence doc must never silently drop out by file type)

#### Scenario: GT-06 the binding gate is stage-aware
- WHEN the change is in-flight
- THEN C1 runs the projected verify (`verify --change` semantics, same code path incl. CAS and hygiene); WHEN the change exists only under `apriori/changes/archive/<stamp>-<name>/` THEN C1 runs plain verify against `apriori/specs/` and flow-state/tasks resolve from the archived dir; verify gaps → C1 blocked with the red/unbound/orphan counts; a verify-untrustworthy run → gate exit 2 carrying verify's errors

#### Scenario: GT-07 resolution is validated and deterministic
- WHEN `--change` fails bare-kebab-case validation or the resolved dir escapes its root (realpath containment)
- THEN gate exits 2 before reading anything; WHEN the change is found in neither location THEN gate exits 2 naming both searched paths; WHEN several archived dirs match `/^\d{4}-\d{2}-\d{2}T\d{4}-<name>$/ THEN the lexicographically last basename is used

#### Scenario: GT-08 a missing or mismatched flow-state fails closed
- WHEN the resolved change dir has no readable flow-state.md
- THEN gate exits 2 (tier-aware checks are impossible); a readable flow-state whose `change` key mismatches `--change` is C3-blocked, not exit 2

#### Scenario: GT-09 trivial tier is not asked for artifacts it never produces
- WHEN flow-state declares `tier: trivial` and tasks.md or the ledger file is absent
- THEN C2/C4 report `–` (not applicable) instead of blocking; on medium/large the same absences block

#### Scenario: GT-10 KB freshness degrades honestly
- WHEN a touched module `<m>` (first path segment of the change's delta-spec suffixes) has `apriori/truth/<m>.md` with a `source-commit` stamp, `lib/<m>.js` exists, and git reports commits in `<stamp>..HEAD -- lib/<m>.js`
- THEN C6 blocks with the commit count; an up-to-date stamp passes; a missing truth doc, missing lib file, missing git, or a non-zero git exit yields `–` with the reason — an infra failure never fabricates a block

#### Scenario: GT-11 --json is pure JSON in every outcome class
- WHEN `gate --change <name> --json` runs — PASS, BLOCKED, or any exit-2 class (usage error, invalid name, not found, unreadable flow-state, untrustworthy verify)
- THEN stdout parses as JSON shaped `{ change, stage: "in-flight"|"archived"|null, checks:[{id,status,detail}], result: "PASS"|"BLOCKED"|"ERROR", blocked, errors }` — `stage: null` when resolution never happened, `change: null` when `--change` was missing

#### Scenario: GT-12 gate is read-only
- WHEN gate runs to any outcome against a project tree
- THEN no file in the tree is created, modified, or deleted (only the C1 test command's own side effects, which gate does not add to)

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
