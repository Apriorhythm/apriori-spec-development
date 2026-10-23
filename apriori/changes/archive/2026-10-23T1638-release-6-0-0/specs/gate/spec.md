<!-- apriori-base: sha256:d7768d0dc489eb003178f74efb092301febaa548e6879ff29d8c0bbe877bf434 -->

# Delta — gate (release-6-0-0)

## RENAMED Requirements
- C2 and C4 are placeholders since 6.2 -> C2 and C4 are placeholders since 6.0

## MODIFIED Requirements

### Requirement: gate aggregates the mechanical exit conditions for one change
`apriori gate --change <name>` SHALL evaluate the machine-checkable gate conditions for exactly one change and encode the aggregate in its exit code: 0 = every applicable check passed (`GATE: PASS`), 1 = at least one check blocked (`GATE: BLOCKED (<n> item(s))`), 2 = the evaluation itself is untrustworthy (usage error, invalid or escaping name, change found nowhere, unreadable flow-state, an unusable test-command source, or an untrustworthy C1 verify run), 3 = every check that COULD run passed but at least one was skipped (`GATE: INCOMPLETE`). The aggregate is a strict total order: ERROR(2) outranks BLOCKED(1) outranks INCOMPLETE(3) outranks PASS(0) — a confirmed block is never softened by an unrun check, and `blocked` counts `blocked` statuses only, never `skipped`. It SHALL be strictly read-only and SHALL state in its output that PASS covers mechanical checks only — human gates remain human. C6 (KB freshness) SHALL bind each touched store module to its truth doc through an index rather than a filename assumption: a truth doc MAY declare, in its header region (before the first `##`), `store-module: <name>...` (the store modules it covers; default = the doc's basename) and `source-files: <path>...` (space-separated repo-relative code paths; default = `lib/<module>.js`); a covered module with a valid `source-commit` stamp is always mechanically checked, never silently skipped.

#### Scenario: GT-01 a clean in-flight change passes
- WHEN every applicable check passes for an in-flight change
- THEN each check reports `✓`, the final line is `GATE: PASS` (with the mechanical-only caveat), and the exit code is 0

#### Scenario: GT-02 C2 is a placeholder — tasks.md is never read
- WHEN the resolved change dir carries a 5.x `tasks.md`, with or without unchecked `- [ ]` boxes, and then carries none
- THEN C2 reports `{id: 'C2', status: 'n/a', detail: 'retired in 6.0 — nothing is read'}` in every case, the gate is not blocked by it, and no reader of the file exists in `lib/readiness.js`

#### Scenario: GT-03 C4 is a placeholder — review/issues.md is never read
- WHEN the bundle ledger at `<changeDir>/review/issues.md` holds an `open` row, and then is not even a readable file
- THEN C4 reports `{id: 'C4', status: 'n/a', detail: 'ledger retired in 6.0 — open items live in ## Open'}` in every case and the gate is not blocked by it; the ledger classifier, `checkLedger`, `waiveEvidence` and `parseLedger` no longer exist

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
- THEN C2/C4 report `–` in BOTH cases — 6.0 reads neither file, so their absence is never a block and the (inert) mode never changes that answer

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
- THEN the blocked row blocks at gate, archive and status with `legacy Evidence row '<name>' is blocked — move it to ## Open as an item (or accept it via evidence-accept <name>)`; the accepted rows are accepted items (named in the declaration, nothing ignored); the self-declared row blocks with `… claims owner acceptance with no canonical gates: entry — move it to ## Open, or record: <template>`, non-forceably; the rest are ignored with the one note `legacy ## Evidence section ignored (6.0: risks live in ## Open)`; and the retired vocabulary (`EVIDENCE_STATUS`, its alias table, `PRODUCER_DIFF_ROW`) no longer exists

#### Scenario: GT-39 a pending open item refuses, and owner acceptance is a recorded human act
- WHEN the state carries a pending item, then the same item with a `producer:` entry, then with the owner's canonical entry, then an id-less item beside an acceptance naming its first word, then no section at all
- THEN C9 is BLOCKED for the first, second and fourth (`--force` never substituting for the decision), `pass` with `1 accepted, still present (<ID>)` for the third, and `pass` with `no open items` for the fifth

#### Scenario: GT-41 gate, archive and status all judge the state on the same input — the delta scan
- WHEN a change carries a mutating delta and a pending item, and then when the same bundle is archived
- THEN gate passes C9 the SCAN's signals and no mode, archive's R5 and `status` report the identical findings, and the archived bundle is passed no signals at all, reported `n/a` by gate and RECORDED rather than blocking by `status`, which raises no escalation against frozen history

#### Scenario: OI-09 an archived bundle keeps today's behavior: recorded, not re-judged
- WHEN an archived bundle carries pending items, a legacy blocked row, a `mode:` line and a mutating (already merged) delta
- THEN gate C9 is `n/a` with the findings under `recorded:`, `status` lists them under `recorded:` / `evidence.recorded`, raises no escalation, derives no signal, and reports `mode` and `effectiveMode` as declared

### Requirement: C2 and C4 are placeholders since 6.0
Gate SHALL keep the ids `C2` and `C4` in `checks[]` for `--json` shape compatibility and SHALL report both as `n/a` with a detail that says why (`retired in 6.0 — nothing is read`; `ledger retired in 6.0 — open items live in ## Open`). Neither `tasks.md` nor `review/issues.md` SHALL be opened, present or absent, whatever they contain. An unusable review ROOT (symlink, escape, not a directory) SHALL be refused at C5 alone.

## Notes

Release 6.0.0 (2026-10-23): the three placeholder/legacy detail strings that named the working stage `6.2` now name the release, `6.0`; the requirement title follows. Only these strings change — ids, statuses, `--json` shapes and every judgement are untouched. The code change is in `lib/gate.js` (C2/C4 details) and `lib/readiness.js` (the legacy Evidence note); GT-02, GT-03 and OI-04 assert the new strings.
