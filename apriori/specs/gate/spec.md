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
- WHEN a required flow-state key (`change`, `phase`) is missing, still a `<placeholder>`, has a `phase` outside the exact vocabulary (ground, specify, build, review, done, abandoned), an optional `mode` outside {fast, standard} or still the `<fast | standard>` placeholder, or a `change` value that does not equal `--change`
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
Gate SHALL run a ninth check over the flow-state's `## Open` section, and it SHALL be the only place a missing piece of REALITY blocks. Gate C9, archive R5, the archive declaration and `status` SHALL call ONE shared function on the same inputs (the state text and the delta scan); there SHALL be no second state. An open item is `- <ID>: <text>`, the id being one token in front of the colon (the former evidence-row id shape — `producer-diff`-style names are legal ids). An item is PENDING, and blocks, until the owner's decision is recorded — with ONE carve-out since scope-disposition: an item of the exact follow-up form `- <ID>: follow-up → <new-change-name> — <text>` (the landing a valid change name other than this change) is a registered new ask, reported as a note and counted as `follow-up(s) registered`, never pending; any other spelling stays pending. Otherwise an item blocks until the owner's decision is recorded in the append-only `gates:` log in the CLOSED grammar `- <YYYY-MM-DDTHH:MM> owner: evidence-accept <ID> — <reason>` (revoke by appending `evidence-accept-revoke <ID> — <reason>`; last decision wins; the actor must be exactly `owner`; the timestamp must be real). An ACCEPTED item SHALL NOT block but SHALL be reported as `accepted, still present` — in C9's detail, as an archive note and in `status` — and nothing SHALL delete it. A line without an id SHALL still be an open item: it blocks and cannot be accepted (`give it a stable id to accept it, or close it`). Duplicate ids SHALL fail closed, naming both lines. An acceptance whose id matches no item SHALL be a note, not a block. An empty or absent section owes nothing. C9 SHALL ALSO refuse a delta the scan could not read (fail-closed; no item or acceptance cures it), a standing Reality Check `assumption` and a Reality Check line naming no kind; a mutating delta SHALL be reported as the `contract-mutation` signal — information, demanding nothing. A legacy `## Evidence` section in an in-flight bundle SHALL migrate by rule: a `blocked` row, and an `owner-accepted` row with no valid acceptance for its name, block with a migration message (a self-signed claim may not make a risk disappear); a row whose name carries a valid acceptance is an accepted item; every other row is ignored with one note. C9 SHALL read no mode. An ARCHIVED bundle SHALL be reported, never re-judged.

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
- WHEN an in-flight bundle carries a legacy `## Evidence` section with a `blocked` row, then rows whose names carry valid acceptances, then a self-declared `owner-accepted` row beside a `producer:` entry, then rows reading `done` / `n/a` / `fixed` / an unfilled scaffold row / an unreadable line
- THEN the blocked row blocks at gate, archive and status with `legacy Evidence row '<name>' is blocked — move it to ## Open as an item (or accept it via evidence-accept <name>)`; the accepted rows are accepted items (named in the declaration, nothing ignored); the self-declared row blocks with `… claims owner acceptance with no canonical gates: entry — move it to ## Open, or record: <template>`, non-forceably; the rest are ignored with the one note `legacy ## Evidence section ignored (6.2: risks live in ## Open)`; and the retired vocabulary (`EVIDENCE_STATUS`, its alias table, `PRODUCER_DIFF_ROW`) no longer exists

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
`apriori gate --change <name> --review-ready` SHALL re-face the SAME evaluation as a review-admission answer and SHALL write nothing: no receipt file, no state mutation, no cached verdict. It SHALL report exactly TWO items, each a fact this run measured — `tests` (the real test/binding result, C1) and `open` (the state is readable and claims nothing unresolved of its own: every item carries a stable id, no id is duplicated, no Reality Check `assumption` is still standing and no Reality Check line names no kind — each refused with C9's own wording). A PENDING item SHALL NOT fail review-ready — it is what the review is for. It SHALL NOT report an item derived from another item's result, and SHALL NOT state what a reviewer will receive — it cannot observe that; facts the run already holds (the projected delta specs, C1's binding counts) MAY be printed instead. The JSON shape `{change, ready, items:[{id, ok, detail}]}` is unchanged. It SHALL exit 0 when every item holds and 1 when any does not, saying that an unready change goes back to Build & Test rather than into a review round. A skipped C1 SHALL never read as ready: the reviewer must not be the first to run the suite.

#### Scenario: GT-40 review-ready answers from the run's own facts and persists nothing
- WHEN `gate --change <name> --review-ready` runs against a change whose tests pass and whose `## Open` carries a pending id'd item
- THEN it prints the two items with the transient-view notice and exits 0; an id-less item, or omitting the test command, each flips it to exit 1 naming the item — and a missing test command is ONE item, never two; and in every case the project tree is byte-identical afterwards

#### Scenario: OI-05 review-ready answers two items — tests, and a readable Open section
- WHEN `--review-ready` runs on a change with a pending item, then with an id-less item, then with a duplicated id, then with a standing assumption, then with a kind-less Reality Check line, then with no items, then with no test command
- THEN the items are exactly `tests` and `open`; the pending item reads `… — pending items are what the review is for` and is ready, the four state claims are `✗ open` naming the defect in C9's wording, the empty section reads `no open items`, and the missing suite is `✗ tests`

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

### Requirement: C8 governs the review loop by the human-held round limit, not by fixed control points
C8 SHALL derive each review family's round from the review evidence exactly as before, and SHALL judge the loop against ONE human-held number: the `review-round-limit` row of `apriori/process-config.md` (missing row = 8; an explicit value must be an integer >= 1). There SHALL be no fixed round-2 stop and no fixed round-5 escalation: a `revise` verdict below the effective limit never stops the loop on its own, and neither does a `revise` AT the limit: there the producer rules on every open finding and ONE independent re-review follows (the ruling requirement below; `accept` at the limit proceeds). The loop SHALL stop for the owner in exactly two cases — an `escalate` verdict at any round, or a round opened past that one automatic re-review without an owner release — and both SHALL be reported as an escalation that only a recorded owner `reframe <family> round <n> <split|tests|redo|accept-risk> — <reason>` acknowledges. An owner who answers the limit round itself with a reframe takes the family out of the automatic path: from then on every `revise` at or past the limit needs the owner's own reframe, as before. The cumulative count never resets. Before round n >= 3 is opened, the producer SHALL have logged a progress record in `gates:` — `- <YYYY-MM-DDTHH:MM> note: review-progress <family> round <n> — issues: <ID[, ID…]|none>; actions: <text>; evidence: <path or ref>[, …]; approach: <kept|changed> — <reason>` — whose grammar is exact: a real timestamp (range-checked by the same rule as the owner entry: month 01-12, day 01-31, hour 00-23, minute 00-59) and the actor (`note:`, or `owner:` per GT-56) are required, the four labels are recognised only where a part begins (the start of the payload or right after a `;`), and `approach:` must read `kept — <reason>` or `changed — <reason>` with a non-empty reason. C8 SHALL check the record structurally: the family and target round match, all four labelled parts are present and non-empty, `issues:` covers every issue ID (`<UPPERCASE tag>-<digits>[<one lowercase letter>]`, e.g. `R-02`, `GT-54`, `RRL-01a`) that opens a Markdown list item (`-`, `*`, `+`, or an ordered `1.` / `1)`) or a table row of the family's previous round summary, and every `evidence:` reference that looks like a path is an existing REGULAR FILE INSIDE the project — relative to the project root, never absolute, never escaping by `..`, its real path confined too (a symlink to the outside does not count), and only stat'ed, never read. The automatic re-review round needs no such record — the rulings stand in for it. A missing record or a failed check blocks the round's submission and is repaired by the producer, never by the owner; `apriori archive` SHALL consume the same findings as non-forceable R4 evidence blockers, reading the configuration of the project it was invoked in (a custom changes directory never makes it guess another root). An invalid `review-round-limit` row SHALL block C8 naming the key, the offending value and the legal range, and no default SHALL be substituted silently.

#### Scenario: GT-50 no configured limit means 8, and rounds 2 to 7 at revise never stop the loop
- WHEN a project carries no `review-round-limit` row and a family's rounds 1..7 are all `revise`, each round from 3 on preceded by a complete `review-progress` record
- THEN C8 reports the floor (the review has not resolved) but no `stops here` note, no escalation and no owner line; the family's `stopped` is false and `status --escalation` exits 0

#### Scenario: GT-51 a revise verdict at the effective limit asks the producer for rulings, not the owner; accept at the limit proceeds
- WHEN `| review-round-limit | 3 |` is configured and a family reaches round 3 with `revise`, and separately reaches round 3 with `accept`
- THEN the first is not an escalation: C8 is blocked naming the rulings owed for that family's round 3 with the producer's `note: ruling …` line as the cure (no owner line), the family's `stopped` is false and `status --escalation` exits 0; the second passes C8 with nothing escalated

#### Scenario: GT-52 an owner reframe at the limit takes the family out of the automatic path, and the count never resets
- WHEN the owner records `reframe <family> round 3 redo — …` against a limit-3 `revise` (no rulings recorded) and the family then lands round 4 with `revise`
- THEN no ruling is asked for, round 4 is an escalation at round 4 needing its own owner entry (or a raised limit), and the family's round is 4 — nothing was reset by the reframe

#### Scenario: GT-53 escalate stops at any round, whatever the limit
- WHEN a family's round 1 verdict is `VERDICT: escalate` under the default limit
- THEN C8 reports an escalation (`the reviewer escalated`) and blocks until an owner reframe is recorded — exactly as before this change

#### Scenario: GT-54 the review-progress record is required from round 3 and checked structurally
- WHEN a family lands round 3 with no `review-progress` record; then with a record whose `issues:` omits an ID that opens a list item in the round-2 summary (`- R-02 …`); then with an `evidence:` path that does not exist; then with all four parts present, every listed ID covered and an existing path
- THEN the first three block C8 naming the family, the target round and the missing/unsatisfied part, with a cure the producer applies (no owner line is printed), and the fourth passes the record check — the review floor alone deciding whether the change ships

#### Scenario: GT-55 an invalid limit blocks at consumption and names the range
- WHEN `review-round-limit` is `0`, `-1`, `abc` or `2.5`, and a family has landed any round
- THEN C8 is blocked with a detail naming `review-round-limit`, the offending value and `an integer >= 1 (missing row = 8)`; `apriori archive` refuses under R4 as non-forceable; a conflicting pair of rows is the same kind of block naming the conflict

#### Scenario: GT-56 the progress record is a note entry, not an owner decision
- WHEN a `review-progress` line is written with the `owner:` actor, or a `reframe` line is written with the `note:` actor
- THEN the first counts as a progress record but authorizes nothing (it is not a reframe); the second is neither a reframe nor a progress record — the owner vocabulary and the producer vocabulary never trade places

#### Scenario: GT-57 evidence references are confined to the project
- WHEN a record's `evidence:` names an absolute path to an existing file outside the project, a `../` path escaping it, a symlink inside the project whose target lies outside, or a directory; and separately a relative path to a regular file inside the project, or a symlink inside whose target is inside
- THEN each of the first four blocks C8 with `'<ref>' is not an existing regular file inside the project` (the file is never read), and each of the last two satisfies the record

#### Scenario: GT-58 the record grammar is exact
- WHEN `transactions:` stands where `actions:` should; when `approach: kept` carries no reason; when the line lacks its timestamp or its actor (or carries `agent:`), or its timestamp is out of range (`2026-99-99T99:99`, `2026-13-01T10:00`, `2026-09-25T24:00`, `2026-09-25T10:60`); when `issues:` omits an ID that opens an ordered item (`1. R-02`), a `+` item or a table row of the previous summary (a prose mention `see R-99` opening nothing)
- THEN the first blocks as `incomplete: actions missing`, the second as `approach must read …`, the third (every form) as a missing record — exactly the stamps `lib/flow.js` refuses for an owner entry, the fourth as `does not cover R-02, R-03, R-04` without naming `R-99`; the same content in the exact form passes the record check

#### Scenario: GT-59 archive consumes the same loop
- WHEN a round-3 `accept` stands on a record that is missing, uncovered or names a bad path; when a family is stopped by an `escalate` verdict with no owner decision; when the owner then answers `accept-risk`; and when the change lives in a custom `--changes-dir` under a project whose limit row is `0`
- THEN readiness reports each record failure as an R4 `evidence` blocker with `forceable: false` and `archive` refuses with and without `--force`; the unanswered stop is reported `forceable: false` with its reframe cure, `archive` prints that cure (with `--force` it says the decision must be pre-recorded); the answered stop is `forceable: true` and `--force` archives it; and the custom-dir archive refuses under R4 naming `review-round-limit` and `'0'`

### Requirement: at the limit the producer rules on every open finding and one independent re-review decides what reaches the owner
At the effective limit, the first round R at or past it whose verdict is `revise`, when the owner has not answered round R with a reframe, SHALL NOT stop the loop. C8 SHALL require one ruling per finding still open in round R's summary, each a `gates:` entry `- <YYYY-MM-DDTHH:MM> note: ruling <family> round <R> — <ID>: <fixed|rejected|follow-up|owner> — <basis>` (a real timestamp and the actor exactly `note:` — a ruling written with any other actor is not a ruling), and SHALL check that at least one ruling exists, that each names a legal kind and carries a basis, that the rulings cover every id opening a list item or table row of round R's summary, and that no id carries two different kinds. Exactly ONE independent re-review SHALL follow as round R+1, answering each ruled id on its own line — `- <ID>: ADDRESSED — <basis>` or `- <ID>: NOT ADDRESSED — <basis>` (the id and the status may be wrapped in `**` or backticks; the id, the status and the em dash match exactly). After it, every ruled id SHALL either carry an ADDRESSED line or be a pending `## Open` item (an item with that id that is not a follow-up line; an owner-accepted item counts); an id with both conclusions blocks; the id of an `owner` ruling SHALL be a pending item whatever the re-review says; the id of a `follow-up` ruling marked ADDRESSED SHALL be a registered follow-up; when the re-review's verdict is not an accept, every id that opens a list item or table row of its summary and was not ruled SHALL be a pending item; and when the re-review's provenance session is missing, `unknown` or not round R's session, the id of every `rejected` and `follow-up` ruling SHALL be a pending item. Until the rulings pass, C8 blocks naming the rulings owed; once they pass and before round R+1 lands, C8 blocks naming the one re-review owed. Every such finding is the producer's to repair — never an owner gate, never an escalation — and `apriori archive` reads them as non-forceable R4 evidence blockers. A family that passes these checks is closed: it no longer counts against the review floor, whatever the re-review's verdict, and its residuals are pending items that R5 holds for the owner. A round R+2 or later opened without an owner reframe for this family at a round from R+1 on SHALL be an escalation (`the one automatic re-review is spent`) and SHALL never count as convergence; after such a reframe, a later `accept` converges and a later `revise` needs its own reframe. A ruling cycle, once its next round has landed, SHALL be checked this way whatever the limit says now: raising the limit permits more review and releases the rounds after the re-review, but never closes what that re-review left open. Rulings recorded at any other round whose verdict was `revise` are held to the same checks once the next round lands, and only a re-review whose checks all pass — or the current automatic one — is exempt from the `review-progress` record. A later review round that answers an id `ADDRESSED` in the same fixed form discharges that id's residual — the latest later round that answers it decides, and the re-review's own verdict stays on record — except an `owner` ruling's id, which stays the owner's; the validity of the rulings and conflicting conclusions in the re-review are evidence integrity and are checked at every later round; the current cycle is checked from R on whatever its ruling record holds — rulings that are missing or unreadable are never waived by a later owner release or a later accept. A family whose re-review escalated is not closed by its rulings: it stays on the review floor on the current and the established path alike, unless the owner answered with `accept-risk`.

#### Scenario: GT-60 rulings are required at the limit, one per open finding, in the exact grammar
- WHEN the limit is 3 and round 3 is `revise` with a summary opening R-01, R-02 and R-03; first with no ruling; then with rulings for R-01 and R-02 only; then with a ruling of kind `parked`; then with a ruling whose basis is empty; then with R-01 ruled both `fixed` and `rejected`; then with the rulings written under the `owner:` actor; then with a complete, well-formed set
- THEN each of the first six blocks C8 naming the family, round 3 and the unmet part, prints no owner line and leaves `status --escalation` at exit 0; the last blocks only as the one re-review owed

#### Scenario: GT-61 the re-review decides per id, and a ruled id never disappears
- WHEN complete rulings (R-01 `fixed`, R-02 `rejected`, R-03 `follow-up` registered in `## Open`) are followed by a round-4 re-review in the same session whose verdict is an accept and which marks only R-01 and R-02 ADDRESSED; then also R-03; then R-02 both ADDRESSED and NOT ADDRESSED
- THEN the first blocks naming R-03; the second passes C8 with the family closed; the third blocks naming the conflicting conclusions for R-02

#### Scenario: GT-62 what the re-review leaves unresolved goes to the owner as a pending item
- WHEN the round-4 re-review says `VERDICT: 1 issues open`, marks R-02 NOT ADDRESSED and opens a new finding R-04; first with neither R-02 nor R-04 in `## Open`, then with both as pending items
- THEN the first blocks naming R-02 and R-04; the second passes C8 with the family closed (never reported as an accept), while gate C9 and archive R5 refuse on the pending items and `status --escalation` exits 3 on them

#### Scenario: GT-63 an owner ruling belongs to the owner whatever the re-review says
- WHEN R-01 is ruled `owner` and the re-review marks it ADDRESSED; first with R-01 absent from `## Open`, then as a pending item
- THEN the first blocks naming R-01; the second passes

#### Scenario: GT-64 a re-review whose session is not proven the same hands rejections and follow-ups to the owner
- WHEN the re-review's provenance session differs from round 3's, and separately when round 3 carries no provenance, while R-01 `fixed`, R-02 `rejected` and R-03 `follow-up` are all marked ADDRESSED
- THEN C8 blocks naming R-02 and R-03 until both are pending items, and R-01 stands on its ADDRESSED line

#### Scenario: GT-65 a round past the one re-review needs the owner
- WHEN round 5 lands with an accept after rulings at round 3 and the re-review at round 4, with no owner reframe; then the owner records `reframe <family> round 4 tests — …`; then round 6 lands with `revise`
- THEN the first is an escalation (`the one automatic re-review is spent`) that does not count as convergence and makes `status --escalation` exit 3; with the reframe the round-5 accept converges; the round-6 revise is an escalation needing its own reframe

#### Scenario: GT-66 the re-review round needs no review-progress record
- WHEN rulings at round 3 are followed by a round-4 re-review that marks every ruled id ADDRESSED and no `review-progress` record exists for round 4, and then the owner raises the limit to 6
- THEN C8 reports no progress finding for round 4 and passes, before and after the limit changes

#### Scenario: GT-67 raising the limit permits more review but never closes what the re-review left open
- WHEN a fresh-session re-review at round 4 marks R-01, R-02 and R-03 ADDRESSED with R-02 `rejected` and R-03 `follow-up` not pending, and the owner then raises the limit to 6; then R-02 and R-03 become pending items; then a round 5 accept lands with its `review-progress` record
- THEN C8 still blocks naming R-02 and R-03 after the raise; with both pending it passes; the round-5 accept is no escalation — the raised limit released it

#### Scenario: GT-68 a ruling note below the limit buys no exemption and is held to the ruling checks
- WHEN the limit is 8, rounds 1-2 are `revise` and round 3 an accept with no `review-progress` record for round 3, and one note reads `ruling spec-review round 2 — R-01: parked — x`
- THEN C8 blocks naming the illegal kind at round 2 and the missing `review-progress` record for round 3

#### Scenario: GT-69 a later review the owner released can discharge a residual; the historical verdict stands
- WHEN round 4 leaves R-01 NOT ADDRESSED and R-01 is a pending item, the owner raises the limit, and round 5 lands; first without an R-01 line with the pending line removed, then answering `- R-01: ADDRESSED — …`; and separately when R-01 was ruled `owner` and round 5 answers it ADDRESSED
- THEN the first blocks naming R-01; the second passes with round 4's NOT ADDRESSED unchanged; the owner ruling still has to be an `## Open` item

#### Scenario: GT-70 the current cycle is still checked once the family is past its re-review
- WHEN rounds 4 and 5 accept after a limit-3 revise at round 3 and the owner released round 5 with a reframe for round 4, while round 3's rulings are conflicting (R-01 both `fixed` and `rejected`), absent altogether, or present only as unreadable ruling lines
- THEN C8 blocks naming the conflict, the rulings owed, or the unreadable line respectively, and archive readiness reports each as a non-forceable R4 blocker

#### Scenario: GT-71 an escalated re-review keeps the family on the floor, also after a limit raise
- WHEN rulings at round 3 are followed by a round-4 re-review that escalates, the owner answers `reframe … round 4 tests`, and then raises the limit to 6
- THEN C8 blocks on the unresolved review floor, archive readiness reports a non-forceable R4 review blocker, and `archive --force` refuses — before and after the raise
