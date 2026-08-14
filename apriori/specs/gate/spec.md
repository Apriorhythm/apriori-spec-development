### Requirement: gate aggregates the mechanical exit conditions for one change
`apriori gate --change <name>` SHALL evaluate the machine-checkable gate conditions for exactly one change and encode the aggregate in its exit code: 0 = every applicable check passed (`GATE: PASS`), 1 = at least one check blocked (`GATE: BLOCKED (<n> item(s))`), 2 = the evaluation itself is untrustworthy (usage error, invalid or escaping name, change found nowhere, unreadable flow-state, an unusable test-command source, or an untrustworthy C1 verify run), 3 = every check that COULD run passed but at least one was skipped (`GATE: INCOMPLETE`). The aggregate is a strict total order: ERROR(2) outranks BLOCKED(1) outranks INCOMPLETE(3) outranks PASS(0) — a confirmed block is never softened by an unrun check, and `blocked` counts `blocked` statuses only, never `skipped`. It SHALL be strictly read-only and SHALL state in its output that PASS covers mechanical checks only — human gates remain human. C6 (KB freshness) SHALL bind each touched store module to its truth doc through an index rather than a filename assumption: a truth doc MAY declare, in its header region (before the first `##`), `store-module: <name>...` (the store modules it covers; default = the doc's basename) and `source-files: <path>...` (space-separated repo-relative code paths; default = `lib/<module>.js`); a covered module with a valid `source-commit` stamp is always mechanically checked, never silently skipped.

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
- WHEN `gate --change <name> --json` runs — PASS, BLOCKED, INCOMPLETE, or any exit-2 class (usage error, invalid name, not found, unreadable flow-state, unusable test-command source, untrustworthy verify)
- THEN stdout parses as JSON shaped `{ change, stage: "in-flight"|"archived"|null, checks:[{id,status,detail}], result: "PASS"|"BLOCKED"|"INCOMPLETE"|"ERROR", blocked, errors }` — the key set is EXACTLY those six and never grows a `code` field (the process exit code is the mapping PASS→0, BLOCKED→1, ERROR→2, INCOMPLETE→3); `checks[].status` ranges over `pass`/`blocked`/`n/a`/`skipped`; `stage: null` when resolution never happened, `change: null` when `--change` was missing

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

### Requirement: C1 in-flight judges the change scope
`gate`'s C1 SHALL consume the change-scoped verdict and change-scoped duplicates on the in-flight stage, so parallel changes go green independently: a red test or gap belonging to another change's scope never blocks this change's C1. The passing detail reads `verify GREEN (in-flight, change-scoped)`; a blocking detail lists the change-scope gap classes; either detail carries an informative store-summary suffix with the six store-report counts (`; store: <boundRed> red, <unbound> unbound, <orphan> orphan, <unidentified> unidentified, <unattributed> unattributed, <duplicates> duplicate(s) outstanding`). The archived stage (whole-store verify) is unchanged.

#### Scenario: GT-26 parallel changes go green independently
- WHEN two in-flight changes have disjoint scopes and tests, and a red test belongs to change B's scope (B's scenario lives only in B's delta — invisible to A's projection; the sibling-delta scan attributes it)
- THEN change A's `gate --change` C1 passes (detail names change-scoped and carries the store suffix) while change B's C1 blocks — in the same repository, from the same TAP stream, even when the test command exits 1

#### Scenario: GT-27 only provably out-of-scope reds are non-blocking for C1
- WHEN the only failures in the TAP stream are tagged reds BOUND to projection scenarios outside change A's scope, and change A's own scenarios are all bound green
- THEN change A's C1 passes and the store suffix still shows the outstanding counts; conversely WHEN the stream carries an ID-less `not ok` or a FAILING true orphan THEN change A's C1 is BLOCKED (no provenance — fail closed), whatever change A's own scenarios say

### Requirement: a hotfix bundle is refused by the gate with a pointer, not adapted
The gate's object is a formal change. When the resolved directory carries `hotfix-state.md` the gate SHALL refuse the run as an evaluation error and name `apriori hotfix archive <name>` as the surface that judges the lane — the seven checks are neither run nor reinterpreted, and none of their logic changes. A directory carrying BOTH `flow-state.md` and `hotfix-state.md` is refused as an identity error naming both files, since neither reading can be trusted.

#### Scenario: GT-28 the gate points a hotfix bundle at its own preflight
- WHEN `gate --change <name>` resolves a directory holding `hotfix-state.md` and no `flow-state.md`
- THEN the gate exits 2 with an error naming the hotfix lane and `apriori hotfix archive`, and reports no check results at all

#### Scenario: GT-29 a bundle carrying both identities is an error at the gate too
- WHEN the resolved directory holds both `flow-state.md` and `hotfix-state.md`
- THEN the gate exits 2 naming both files rather than judging either one

### Requirement: gate degrades the checks it cannot run instead of refusing to run at all
A missing test command SHALL disable C1 alone, never the whole evaluation. When no usable test-command source exists (no `--test-cmd` flag and no live `test-cmd` row in `apriori/process-config.md`), `apriori gate` SHALL report C1 with status `skipped`, SHALL still execute C2..C7 and report their real conclusions, and SHALL exit 3 (`GATE: INCOMPLETE`) when nothing blocked. A BROKEN test-command source is a different thing from an ABSENT one and SHALL remain an exit-2 evaluation error. The effective id-pattern SHALL still be resolved and compile-checked even when C1 is skipped — a broken pattern is a broken config, not an absent one.

#### Scenario: GT-30 an absent test command skips C1 and runs the rest
- WHEN `apriori gate --change <name>` runs with no `--test-cmd` flag and no live `test-cmd` config row, against an in-flight change whose other checks all pass
- THEN C1 reports status `skipped` with a detail carrying BOTH the fact it did not run AND the cure (`--test-cmd` or a `test-cmd` row), C2..C7 each report their real status, the final line is `GATE: INCOMPLETE`, and the exit code is 3

#### Scenario: GT-31 a confirmed block outranks an unrun check
- WHEN the test command is absent AND at least one of C2..C7 blocks
- THEN the result is `BLOCKED` with exit code 1 and `blocked` counts only the blocked checks — the skipped C1 never softens a confirmed block, and never inflates the count

#### Scenario: GT-32 an empty, whitespace-only, or non-string test command is an error, not an absence
- WHEN `--test-cmd ""` or `--test-cmd "   "` is passed (the flag's PRESENCE is judged, never its truthiness), or `runGate` is called with a `testCmd` that is neither a string nor null/undefined
- THEN gate exits 2 naming the flag-origin problem (the type is named for a non-string) — it never falls back to the config row and never degrades to `skipped`

#### Scenario: GT-33 a broken config is an error while an empty config value is an absence
- WHEN `apriori/process-config.md` is unreadable, or carries conflicting `test-cmd` rows
- THEN gate exits 2 as today; WHEN the file instead carries a `test-cmd` row whose value is empty or whitespace-only THEN the shared config reader has already normalised it to "no such row" and gate treats it as ABSENT (C1 `skipped`, exit 3) — gate never re-litigates the reader's contract

#### Scenario: GT-34 a skipped C1 still produces a real C7
- WHEN the test command is absent and the change carries an unstamped mutation delta
- THEN C7 still blocks naming the delta suffix and the `apriori stamp` cure — the projection C7 consumes is built by the SAME shared builder `verify` uses, on a path that spawns no test process

#### Scenario: GT-35 an untrustworthy projection still fails closed with no test command
- WHEN the test command is absent and the change's projection fails for ANY reason the shared builder reports — merge conflict, malformed delta, diverged CAS base, or a delta-discovery validation failure such as no delta files at all
- THEN gate exits 2 carrying the builder's errors and C7 draws no conclusion from an untrustworthy projection; AND WHEN the builder returns no trustworthy `texts` while its `errors` are empty THEN gate STILL exits 2, synthesising a deterministic diagnostic of its own so `errors` is never empty on an ERROR — an untrustworthy projection fails closed even when nothing explained why

#### Scenario: GT-36 a broken id-pattern is an error even when C1 is skipped
- WHEN the test command is absent AND the effective id-pattern fails to resolve — an empty `--id-pattern` flag, an uncompilable flag value, an uncompilable config value, or conflicting `id-pattern` config rows
- THEN gate exits 2 exactly as it does today, at both stages; AND WHEN the test command is absent while a VALID config-origin id-pattern is in force THEN the pattern is compile-checked but no scenario matching is performed — the matcher child process is spawned ZERO times, observably

#### Scenario: GT-37 the earlier refusals still win over the degradation
- WHEN the test command is absent AND the resolved bundle is a hotfix bundle
- THEN gate still exits 2 with the mapping-m1 pointer at `apriori hotfix archive` — the hotfix identity is decided before flow-state and before the test-command source, so a lane bundle (which carries no flow-state by design) is never misreported as a missing flow-state; WHEN the bundle is a formal change with no readable flow-state THEN gate still exits 2 for that reason

#### Scenario: GT-38 the degradation reaches the archived stage too
- WHEN the test command is absent and the change resolves only under `apriori/changes/archive/<stamp>-<name>/`
- THEN C1 is `skipped`, C7 is `–` (deltas already merged), C4 still demands every ledger row be terminal, and the exit code follows the same total order; the shared projection builder is invoked ZERO times on this path, observably — an archived bundle's deltas are already in the store, so building a projection could only manufacture a false block
