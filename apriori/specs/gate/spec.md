### Requirement: gate aggregates the mechanical exit conditions for one change
`apriori gate --change <name>` SHALL evaluate the machine-checkable gate conditions for exactly one change and encode the aggregate in its exit code: 0 = every applicable check passed (`GATE: PASS`), 1 = at least one check blocked (`GATE: BLOCKED (<n> item(s))`), 2 = the evaluation itself is untrustworthy (usage error, invalid or escaping name, change found nowhere, unreadable flow-state, or an untrustworthy C1 verify run). It SHALL be strictly read-only and SHALL state in its output that PASS covers mechanical checks only — human gates remain human. C6 (KB freshness) SHALL bind each touched store module to its truth doc through an index rather than a filename assumption: a truth doc MAY declare, in its header region (before the first `##`), `store-module: <name>...` (the store modules it covers; default = the doc's basename) and `source-files: <path>...` (space-separated repo-relative code paths; default = `lib/<module>.js`); a covered module with a valid `source-commit` stamp is always mechanically checked, never silently skipped.

#### Scenario: GT-01 a clean in-flight change passes
- WHEN every applicable check passes for an in-flight change
- THEN each check reports `✓`, the final line is `GATE: PASS` (with the mechanical-only caveat), and the exit code is 0

#### Scenario: GT-02 an unchecked task blocks
- WHEN the resolved change dir's tasks.md contains an unchecked `- [ ]` box (while `- [x]` and `- [X]` count as checked)
- THEN C2 reports `✗` naming the file, the final line is `GATE: BLOCKED` with the count, and the exit code is 1

#### Scenario: GT-03 the ledger blocks on open rows and reasonless rejections
- WHEN the bundle ledger at `<changeDir>/review/issues.md` contains a row whose status starts `open` (case-insensitive), or a `rejected` row with no reason text beyond the word itself
- THEN C4 blocks naming the row ID; a `rejected` row passes only when, after stripping the leading word `rejected`, the remaining text contains at least one word character (`rejected: duplicate` passes; `rejected`, `rejected:`, `rejected -` block); `advisory*`/`fixed`/`verified` rows never block

#### Scenario: GT-04 flow-state legality is enforced
- WHEN a required flow-state key (`change`, `tier`, `track`, `lineage`, `current-step`) is missing, still a `<placeholder>`, has a `current-step` outside the exact vocabulary (STEP0..STEP6, INTENT-CARD, SPIKE, EXTRACTION, DONE, ABANDONED), a `tier` outside {trivial, medium, large}, or a `change` value that does not equal `--change`
- THEN C3 blocks naming the offending key; a fully legal flow-state passes

#### Scenario: GT-05 verdict evidence is mechanical
- WHEN a review doc in the bundle (files matching `<changeDir>/review/*.md`, excluding `issues.md` and `*-raw` stems, regular files only) contains a `^VERDICT:` line but no file that is REGULAR by lstat (symlinks are not evidence) matches `<changeDir>/review/<stem>-raw.*`
- THEN C5 blocks naming the doc; adding the raw beside it flips it to `✓`; a symlink matching the doc glob blocks naming the symlink (an evidence doc must never silently drop out by file type); a `review` entry that is a symlink, escapes the change dir (realpath), or is not a directory at all blocks C4 and C5 naming the path and the defect — never read through, never crashed on — and the check works identically at both stages because the evidence travels with the dir

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
- WHEN flow-state declares `tier: trivial` and tasks.md or the bundle ledger `<changeDir>/review/issues.md` is absent
- THEN C2/C4 report `–` (not applicable) instead of blocking; on medium/large the same absences block naming the exact bundle path

#### Scenario: GT-10 KB freshness degrades honestly through the truth index
- WHEN a touched module `<m>` (first path segment of the change's delta-spec suffixes) resolves through the truth index to a truth doc carrying a canonical `source-commit` stamp (a fence-outside line-start `source-commit: <ref>`), whose resolved `source-files` are all verifiable, and git reports commits in `<ref>..HEAD -- <source-files...>`
- THEN C6 blocks with the commit count; an up-to-date stamp passes; a module with no truth doc at all yields `–` (KB is optional — a genuine absence, not a silent skip); a missing git or a non-zero git exit yields `–` with the reason — an infra failure never fabricates a block

#### Scenario: GT-18 the truth index binds by declaration, not filename
- WHEN a store module's truth doc lives under a DIFFERENT basename (e.g. `apriori/truth/poll.md` covering store module `quick-poll`) and declares `store-module: quick-poll`
- THEN C6 finds it through the index and mechanically checks it (blocking when its `source-commit` is stale) — never reporting "no truth doc" for a module that a declaration covers; and two truth docs declaring the same module is a C6 block naming both files

#### Scenario: GT-19 an explicit source-files declaration is a complete promise
- WHEN a truth doc declares `source-files: src/server.js src/model.js` (code outside `lib/`) with a stale stamp
- THEN C6 runs git over exactly those paths (a declared DIRECTORY path is valid — git logs the whole tree) and blocks on commits since the stamp; and if an EXPLICIT `source-files` carries any token that is missing, malformed, a dangling or resolving symlink, or escapes the repo (realpath), C6 BLOCKS naming that token — partial-missing, partial-symlink, all-symlink, and one bad token beside good ones alike — because a declaration is a complete promise, while a field-less truth doc whose default `lib/<module>.js` is absent stays a `–` note (existing-layout compatibility)

#### Scenario: GT-20 malformed source-commit stamps are diagnosed, not silently skipped
- WHEN a truth doc's `source-commit` appears only in a non-canonical form — a blockquote `> \`source-commit: …\``, an HTML comment `<!-- source-commit: … -->`, an indented line, or backtick-wrapped — with no fence-outside bare line-start form
- THEN C6 reports a `–` note pointing at the required format (a fence-outside line-start `source-commit: <ref>`) rather than a vague "has no source-commit"; a `source-commit:` occurring only inside a code fence is a documentation example and raises no diagnostic

#### Scenario: GT-21 field-less truth docs behave exactly as before
- WHEN a truth doc carries neither `store-module` nor `source-files` (this repo's own docs)
- THEN C6 falls back to module = basename and source-files = `lib/<module>.js`, producing the byte-identical `{status, detail}` it produced before this change for that module — the index and declarations add coverage for non-default layouts without altering any default-layout result

#### Scenario: GT-11 --json is pure JSON in every outcome class
- WHEN `gate --change <name> --json` runs — PASS, BLOCKED, or any exit-2 class (usage error, invalid name, not found, unreadable flow-state, untrustworthy verify)
- THEN stdout parses as JSON shaped `{ change, stage: "in-flight"|"archived"|null, checks:[{id,status,detail}], result: "PASS"|"BLOCKED"|"ERROR", blocked, errors }` — `stage: null` when resolution never happened, `change: null` when `--change` was missing

#### Scenario: GT-12 gate is read-only
- WHEN gate runs to any outcome against a project tree
- THEN no file in the tree is created, modified, or deleted (only the C1 test command's own side effects, which gate does not add to)

### Requirement: C4 speaks the terminal-state vocabulary
Gate C4 SHALL parse every ledger row's status against the legal vocabulary (leading token, case-insensitive): non-terminal `open` / `fixed` / `rejected + reason`; terminal `verified` / `rejected-verified + reason` / `waived + reason` / `advisory-acked`. ANY other status blocks at BOTH stages. `rejected`, `rejected-verified`, and `waived` without a word-character reason block at both stages. A `waived` row additionally requires machine-checked human evidence at both stages: the change's flow-state `gates:` block must contain the row's ID and the text `waiv` (case-insensitive) — a producer-written row alone never passes. At the ARCHIVED stage every row must be terminal: `fixed` and plain `rejected` block with a cure naming the reviewer's verify/concur duty or the human waive. In-flight, `fixed` and reasoned `rejected` pass as today. The ledger lives at `<changeDir>/review/issues.md` at both stages.

#### Scenario: GT-13 archived ledgers must be terminal
- WHEN gate resolves a change at the archived stage whose ledger carries a `fixed` row, a plain reasoned `rejected` row, or an unknown status like `done`
- THEN C4 reports BLOCKED naming each row and a cure, while an all-terminal ledger (verified / rejected-verified + reason / gates:-backed waived + reason / advisory-acked) passes

#### Scenario: GT-14 waives belong to humans, unknown states belong to nobody
- WHEN a ledger carries a `waived — reason` row without a matching flow-state gates: entry (the ID plus "waiv"), or any row whose status is outside the vocabulary, at either stage
- THEN C4 reports BLOCKED naming the row — and the same waived row passes once the gates: entry records the human decision

#### Scenario: GT-15 every archived ledger in this repo parses legal and terminal
- WHEN the corpus of archived changes (apriori/changes/archive/*) is walked and each bundle's ledger at `<archived dir>/review/issues.md` is parsed
- THEN every row is legal AND terminal under the vocabulary (skip-if-absent for packaged environments)

### Requirement: C7 denies unstamped mutation deltas unless visibly waived
Gate SHALL run a seventh check: the change's projection carrying `unstampedMutations` → `C7 BLOCKED` naming each suffix and the stamp cure. Two escapes, flag over config: `gate --no-cas` → the check reports `waived (--no-cas)`; a process-config `cas` row read through the shared structured reader with value `optional` (leading token, case-insensitive; an absent row or `required` means required) → `waived (process-config)`. A cas CONFLICT or illegal value at consultation makes C7 BLOCKED naming the config error — bad config never equals a waiver, though the `--no-cas` flag still waives explicitly. A waiver is always visible in the gate output — never a silent skip. The waiver vocabulary is shared with `archive` (which denies by default since 4.0.1); verify's projection stays warn-only. In-flight only: at the archived stage the deltas are already merged and C7 reports n/a.

#### Scenario: GT-16 C7 blocks, and waivers are loud
- WHEN gate runs on a change whose delta carries unstamped mutation ops
- THEN C7 reports BLOCKED naming the suffix and the cure; with --no-cas or the live `| cas | optional |` config row it reports the waiver by name instead of blocking (the flag also wins when the config says required), and a stamped or ADDED-only change passes C7 silently

#### Scenario: GT-17 bad cas config blocks instead of waiving
- WHEN the process-config carries a cas CONFLICT (two live rows, different values) or a fenced-only `optional` row, and gate runs on an unstamped-mutation change
- THEN C7 reports BLOCKED — naming the config conflict in the first case, and the missing waiver in the second (fenced rows grant nothing); adding `--no-cas` waives either way

### Requirement: gate consumes the effective id-pattern in C1
`gate` SHALL accept an `--id-pattern` flag and thread the effective id-pattern (flag > config `id-pattern` row > `DEFAULT_ID`, same resolution as verify) into C1's verify run in BOTH stages — the in-flight projected form and the archived store form. Flag presence is judged by presence, never truthiness (a present-but-empty `--id-pattern` is a flag-origin validation error and never falls back to the config). An invalid effective pattern is a gate ERROR (exit 2) through the existing structured error path: `runGate` returns the existing `{result:'ERROR', errors:[...]}` shape with the origin-naming message (source echo bounded per the verify rule), text mode prints `gate:` lines, and `--json` stays pure JSON in every outcome class.

#### Scenario: GT-22 gate accepts --id-pattern for C1
- WHEN `apriori gate --change <name> --id-pattern <re>` runs against a store whose scenario IDs only `<re>` recognizes
- THEN C1 binds with `<re>` (no `unidentified` in its detail) in both the in-flight and the archived stage

#### Scenario: GT-25 a terminated config-pattern match is a gate ERROR
- WHEN gate runs without a flag over a config pattern whose matching the child terminates (catastrophic pattern + adversarial titles)
- THEN gate exits 2 with `result: ERROR`, the sanitized message in `errors[]` names `process-config`, and `--json` stays pure JSON

#### Scenario: GT-23 gate falls back to the config row
- WHEN the config carries an `id-pattern` row and gate runs without the flag
- THEN C1 binds with the configured pattern — same verdict as the flagged run

#### Scenario: GT-24 an invalid effective pattern is a gate ERROR
- WHEN gate runs with an uncompilable `--id-pattern`, or with a present-but-EMPTY `--id-pattern` over a valid (or invalid) config row, or without a flag over an uncompilable config row
- THEN gate exits 2 with `result: ERROR`, the message in `errors[]` names `--id-pattern` (uncompilable and empty flag alike — the empty flag never falls back to the config) or `process-config` respectively, and `--json` output is still pure JSON
