<!-- apriori-base: sha256:6d2dc50557bc13e3f4c7230704e0243b351fdf59a71edaf0ce84a91349b602a1 -->
# Delta — gate (protocol-text-consistency)

## MODIFIED Requirements

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

## Notes

Why: `lineage` was retired as a required flow-state key in batch C row 7 (readiness.js:139-140); GT-04 still listed it.
