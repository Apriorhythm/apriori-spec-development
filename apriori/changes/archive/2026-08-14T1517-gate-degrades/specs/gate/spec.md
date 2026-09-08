<!-- apriori-base: sha256:9ea204f7585f5ba9a0c78d4f123f38e4e02c79597b95ebd77c76c13a9cc56bc9 -->

## MODIFIED Requirements

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

## ADDED Requirements

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
