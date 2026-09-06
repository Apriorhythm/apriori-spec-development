### Requirement: gate aggregates the mechanical exit conditions for one change
`apriori gate --change <name>` SHALL evaluate the machine-checkable gate conditions for exactly one change and encode the aggregate in its exit code: 0 = every applicable check passed (`GATE: PASS`), 1 = at least one check blocked (`GATE: BLOCKED (<n> item(s))`), 2 = the evaluation itself is untrustworthy (usage error, invalid or escaping name, change found nowhere, unreadable flow-state, an unusable test-command source, or an untrustworthy C1 verify run), 3 = every check that COULD run passed but at least one was skipped (`GATE: INCOMPLETE`). The aggregate is a strict total order: ERROR(2) outranks BLOCKED(1) outranks INCOMPLETE(3) outranks PASS(0) — a confirmed block is never softened by an unrun check, and `blocked` counts `blocked` statuses only, never `skipped`. It SHALL be strictly read-only and SHALL state in its output that PASS covers mechanical checks only — human gates remain human. C6 (KB freshness) SHALL bind each touched store module to its truth doc through an index rather than a filename assumption: a truth doc MAY declare, in its header region (before the first `##`), `store-module: <name>...` (the store modules it covers; default = the doc's basename) and `source-files: <path>...` (space-separated repo-relative code paths; default = `lib/<module>.js`); a covered module with a valid `source-commit` stamp is always mechanically checked, never silently skipped.

#### Scenario: GT-01 a clean in-flight change passes
- WHEN every applicable check passes for an in-flight change
- THEN each check reports `✓`, the final line is `GATE: PASS` (with the mechanical-only caveat), and the exit code is 0

#### Scenario: GT-02 C2 is a placeholder — tasks.md is never read
- WHEN the resolved change dir carries a 5.x `tasks.md`, with or without unchecked `- [ ]` boxes, and then carries none
- THEN C2 reports `{id: 'C2', status: 'n/a', detail: 'retired in 6.2 — nothing is read'}` in every case, the gate is not blocked by it, and no reader of the file exists in `lib/readiness.js`

#### Scenario: GT-03 C4 is a placeholder — review/issues.md is never read
- WHEN the bundle ledger at `<changeDir>/review/issues.md` holds an `open` row, and then is not even a readable file
- THEN C4 reports `{id: 'C4', status: 'n/a', detail: 'ledger retired in 6.2 — open items live in ## Open'}` in every case and the gate is not blocked by it; the ledger classifier, `checkLedger`, `waiveEvidence` and `parseLedger` no longer exist

#### Scenario: GT-04 flow-state legality is enforced
- WHEN a required flow-state key (`change`, `lineage`, `phase`) is missing, still a `<placeholder>`, has a `phase` outside the exact vocabulary (ground, specify, build, review, done, abandoned), an optional `mode` outside {fast, standard} or still the `<fast | standard>` placeholder, or a `change` value that does not equal `--change`
- THEN C3 blocks naming the offending key; a fully legal flow-state passes, with or without a `mode` line

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
- THEN gate exits 2 (the state checks are impossible); a readable flow-state whose `change` key mismatches `--change` is C3-blocked, not exit 2

#### Scenario: GT-09 neither mode is asked for artifacts 6.0 does not require
- WHEN flow-state declares `mode: fast`, and again when it declares `mode: standard`, and neither a task list nor the bundle ledger `<changeDir>/review/issues.md` is present
- THEN C2/C4 report `–` in BOTH cases — 6.2 reads neither file, so their absence is never a block and the (inert) mode never changes that answer

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

### Requirement: C9 is the one substantive state predicate, and it reads the open items
Gate SHALL run a ninth check over the flow-state's `## Open` section, and it SHALL be the only place a missing piece of REALITY blocks. Gate C9, archive R5, the archive declaration and `status` SHALL call ONE shared function on the same inputs (the state text and the delta scan); there SHALL be no second state. An open item is `- <ID>: <text>`, the id being one token in front of the colon (the former evidence-row id shape — `producer-diff`-style names are legal ids). An item is PENDING, and blocks, until the owner's decision is recorded in the append-only `gates:` log in the CLOSED grammar `- <YYYY-MM-DDTHH:MM> owner: evidence-accept <ID> — <reason>` (revoke by appending `evidence-accept-revoke <ID> — <reason>`; last decision wins; the actor must be exactly `owner`; the timestamp must be real). An ACCEPTED item SHALL NOT block but SHALL be reported as `accepted, still present` — in C9's detail, as an archive note and in `status` — and nothing SHALL delete it. A line without an id SHALL still be an open item: it blocks and cannot be accepted (`give it a stable id to accept it, or close it`). Duplicate ids SHALL fail closed, naming both lines. An acceptance whose id matches no item SHALL be a note, not a block. An empty or absent section owes nothing. C9 SHALL ALSO refuse a delta the scan could not read (fail-closed; no item or acceptance cures it), a standing Reality Check `assumption` and a Reality Check line naming no kind; a mutating delta SHALL be reported as the `contract-mutation` signal — information, demanding nothing. A legacy `## Evidence` section in an in-flight bundle SHALL migrate by rule: a `blocked` row blocks with the migration message, a row whose name carries a valid acceptance is an accepted item, every other row is ignored with one note. C9 SHALL read no mode. An ARCHIVED bundle SHALL be reported, never re-judged.

#### Scenario: OI-01 an open item is `- <ID>: <text>`; no id still blocks and cannot be accepted; duplicates fail closed
- WHEN `## Open` carries id'd items, then a line without an id (prose, a token then prose, a generic like `Map<Key>`, a scaffold-looking `<…>` line), then two lines sharing an id, then nothing at all
- THEN the id'd items are parsed `{id, text, accepted: false, acceptedAt: null}` and each blocks as `open item <ID> is pending … record the owner's decision: <template>`; the id-less line blocks as `open item has no id … give it a stable id to accept it, or close it` and no acceptance reaches it; the duplicate blocks naming both lines; an empty or absent section owes nothing and never swallows the heading that follows it; and gate C9, archive R5 (non-forceable) and `status` (`openItems`, `[pending]` lines) all agree

#### Scenario: OI-02 evidence-accept <id> settles one item; revoke, near misses and unknown ids do not
- WHEN the canonical `evidence-accept <ID> — <reason>` entry is recorded for a pending item, then each near miss (a `producer:` / `note:` / `agent:` / `gate⑤ (owner):` actor, no timestamp, a timestamp-shaped non-timestamp, no em dash, a hyphen, an empty or punctuation-only reason, the keyword preceded by prose or negated, an uppercase keyword, a superstring or differently-cased id, generic accept prose), then a revoke and a re-grant, then an acceptance naming no item
- THEN only the canonical entry accepts (the item carries `acceptedAt`, stops blocking, and is reported `accepted, still present` by gate, archive and status — and the archived bundle still carries the line); every near miss leaves the item pending; the last decision wins; and the stray acceptance is the note `acceptance <ID> matches no open item`

#### Scenario: OI-03 gate, archive and status judge the open items on the same inputs — the state and the delta scan
- WHEN a mutating delta sits beside a pending item, an accepted item, an id-less item and a standing assumption
- THEN gate hands C9 `{stage, riskSignals}` only, C9's detail, archive R5's findings and `status --json`'s `escalations` are the identical blockers (the pending item, the id-less item, the assumption), the mutation is the note `risk: contract-mutation: …` and `status`'s `risk[]`, and `evidence` is `{rows: [], blocked: [], recorded: []}`

#### Scenario: OI-04 legacy Evidence rows migrate by rule
- WHEN an in-flight bundle carries a legacy `## Evidence` section with a `blocked` row, then rows whose names carry valid acceptances, then rows reading `done` / `n/a` / `fixed` / a self-declared `owner-accepted` / an unfilled scaffold row / an unreadable line
- THEN the blocked row blocks at gate, archive and status with `legacy Evidence row '<name>' is blocked — move it to ## Open as an item (or accept it via evidence-accept <name>)`; the accepted rows are accepted items (named in the declaration, nothing ignored); the rest are ignored with the one note `legacy ## Evidence section ignored (6.2: risks live in ## Open)`; and the retired vocabulary (`EVIDENCE_STATUS`, its alias table, `PRODUCER_DIFF_ROW`) no longer exists

#### Scenario: GT-39 a pending open item refuses, and owner acceptance is a recorded human act
- WHEN the state carries a pending item, then the same item with a `producer:` entry, then with the owner's canonical entry, then an id-less item beside an acceptance naming its first word, then no section at all
- THEN C9 is BLOCKED for the first, second and fourth (`--force` never substituting for the decision), `pass` with `1 accepted, still present (<ID>)` for the third, and `pass` with `no open items` for the fifth

#### Scenario: GT-41 gate, archive and status all judge the state on the same input — the delta scan
- WHEN a change carries a mutating delta and a pending item, and then when the same bundle is archived
- THEN gate passes C9 the SCAN's signals and no mode, archive's R5 and `status` report the identical findings, and the archived bundle is passed no signals at all, reported `n/a` by gate and RECORDED rather than blocking by `status`, which raises no escalation against frozen history

#### Scenario: OI-09 an archived bundle keeps today's behavior: recorded, not re-judged
- WHEN an archived bundle carries pending items, a legacy blocked row, a `mode:` line and a mutating (already merged) delta
- THEN gate C9 is `n/a` with the findings under `recorded:`, `status` lists them under `recorded:` / `evidence.recorded`, raises no escalation, derives no signal, and reports `mode` and `effectiveMode` as declared

### Requirement: review-ready is a transient view, never a document
`apriori gate --change <name> --review-ready` SHALL re-face the SAME evaluation as a review-admission answer and SHALL write nothing: no receipt file, no state mutation, no cached verdict. It SHALL report exactly TWO items, each a fact this run measured — `tests` (the real test/binding result, C1) and `open` (the `## Open` section is readable: every item carries a stable id and no id is duplicated). A PENDING item SHALL NOT fail review-ready — it is what the review is for. It SHALL NOT report an item derived from another item's result, and SHALL NOT state what a reviewer will receive — it cannot observe that; facts the run already holds (the projected delta specs, C1's binding counts) MAY be printed instead. The JSON shape `{change, ready, items:[{id, ok, detail}]}` is unchanged. It SHALL exit 0 when every item holds and 1 when any does not, saying that an unready change goes back to Build & Test rather than into a review round. A skipped C1 SHALL never read as ready: the reviewer must not be the first to run the suite.

#### Scenario: GT-40 review-ready answers from the run's own facts and persists nothing
- WHEN `gate --change <name> --review-ready` runs against a change whose tests pass and whose `## Open` carries a pending id'd item
- THEN it prints the two items with the transient-view notice and exits 0; an id-less item, or omitting the test command, each flips it to exit 1 naming the item — and a missing test command is ONE item, never two; and in every case the project tree is byte-identical afterwards

#### Scenario: OI-05 review-ready answers two items — tests, and a readable Open section
- WHEN `--review-ready` runs on a change with a pending item, then with an id-less item, then with a duplicated id, then with no items, then with no test command
- THEN the items are exactly `tests` and `open`; the pending item reads `… — pending items are what the review is for` and is ready, the two unreadable sections are `✗ open` naming the defect, the empty section reads `no open items`, and the missing suite is `✗ tests`

### Requirement: C2 and C4 are placeholders since 6.2
Gate SHALL keep the ids `C2` and `C4` in `checks[]` for `--json` shape compatibility and SHALL report both as `n/a` with a detail that says why (`retired in 6.2 — nothing is read`; `ledger retired in 6.2 — open items live in ## Open`). Neither `tasks.md` nor `review/issues.md` SHALL be opened, present or absent, whatever they contain. An unusable review ROOT (symlink, escape, not a directory) SHALL be refused at C5 alone.

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

### Requirement: a bundle left behind by the retired hotfix lane is diagnosed, not gated
6.0 removed the hotfix lane. A directory carrying `hotfix-state.md` and NO `flow-state.md` cannot be read as a change at all, so the gate SHALL refuse it as an evaluation error that names the file it found and the migration (`apriori new <name>`, `mode: fast`, or finishing it with apriori-cli 5.x) — it is never reported as a generic missing flow-state, and never passed. `hotfix-state.md` sitting BESIDE a readable `flow-state.md` is residue, not a second identity: the change is gated exactly as any other change, and the check set is unchanged in both cases.

#### Scenario: GT-28 a leftover lane bundle gets the migration, not a missing-file message
- WHEN `gate --change <name>` resolves a directory left behind by the RETIRED hotfix lane — holding `hotfix-state.md` and no `flow-state.md`
- THEN the gate exits 2 with an error naming `hotfix-state.md` and the `apriori new` migration, reports no check results, and never names the retired `apriori hotfix` command

### Requirement: gate degrades the checks it cannot run instead of refusing to run at all
A missing test command SHALL disable C1 alone, never the whole evaluation. When no usable test-command source exists (no `--test-cmd` flag and no live `test-cmd` row in `apriori/process-config.md`), `apriori gate` SHALL report C1 with status `skipped`, SHALL still execute C2..C9 and report their real conclusions, and SHALL exit 3 (`GATE: INCOMPLETE`) when nothing blocked. A BROKEN test-command source is a different thing from an ABSENT one and SHALL remain an exit-2 evaluation error. The effective id-pattern SHALL still be resolved and compile-checked even when C1 is skipped — a broken pattern is a broken config, not an absent one.

#### Scenario: GT-30 an absent test command skips C1 and runs the rest
- WHEN `apriori gate --change <name>` runs with no `--test-cmd` flag and no live `test-cmd` config row, against an in-flight change whose other checks all pass
- THEN C1 reports status `skipped` with a detail carrying BOTH the fact it did not run AND the cure (`--test-cmd` or a `test-cmd` row), C2..C9 each report their real status, the final line is `GATE: INCOMPLETE`, and the exit code is 3

#### Scenario: GT-31 a confirmed block outranks an unrun check
- WHEN the test command is absent AND at least one of C2..C9 blocks
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
- WHEN the test command is absent AND the resolved bundle is a leftover lane bundle
- THEN gate still exits 2 with the migration diagnosis — the leftover is detected before the test-command source, so it is never misreported as a missing flow-state; WHEN the bundle is a formal change with no readable flow-state THEN gate still exits 2 for that reason

#### Scenario: GT-38 the degradation reaches the archived stage too
- WHEN the test command is absent and the change resolves only under `apriori/changes/archive/<stamp>-<name>/`
- THEN C1 is `skipped`, C7 is `–` (deltas already merged), evidence integrity (C5) still blocks at the archived stage, and the exit code follows the same total order; the shared projection builder is invoked ZERO times on this path, observably — an archived bundle's deltas are already in the store, so building a projection could only manufacture a false block

#### Scenario: GT-44 review-ready reports two measured items and promises nothing
- WHEN `--review-ready` runs on a ready change, in text and in `--json`
- THEN exactly two items are reported (`tests`, `open`), no item is derived from another item's result, no line claims what a reviewer receives or names the retired `evidence` / `producer-diff` items, the closing line is bare, a fact the run already holds is printed instead (the projected delta specs), and nothing is written to disk
