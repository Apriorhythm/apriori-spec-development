### Requirement: archive-merge applies delta specs to the living store
`apriori archive` SHALL merge a change's delta requirements into the living spec store by stable Requirement ID, consuming the same `## ADDED/MODIFIED/REMOVED/RENAMED Requirements` delta format the OpenSpec adapter used, so it is the adapter-free native implementation of §4's archive action.

#### Scenario: AM-01 ADDED appends a new requirement
- WHEN the delta has an ADDED requirement whose ID is absent from the store
- THEN it is appended and the ID is listed as merged

#### Scenario: AM-02 MODIFIED replaces the existing block
- WHEN the delta has a MODIFIED requirement whose ID exists in the store
- THEN the whole store block is replaced and the ID is listed as modified

#### Scenario: AM-03 REMOVED marks the block deprecated, not deleted
- WHEN the delta has a REMOVED requirement present in the store
- THEN the store block is kept and marked `deprecated (superseded by <change>)`, listed as deprecated

#### Scenario: AM-04 same-ID conflict stops without writing
- WHEN an ADDED ID already exists, or a MODIFIED/REMOVED target is missing
- THEN the merge reports the conflict, writes nothing, and exits 1 (a human opens a ledger issue)

#### Scenario: AM-05 the action lists every merged/modified/deprecated ID
- WHEN a merge succeeds
- THEN every affected Requirement ID is printed by category (§4 requires the action list them)

#### Scenario: AM-06 archive moves the in-flight change under a dated archive dir
- WHEN archive completes on change `<name>`
- THEN the in-flight `apriori/changes/<name>/` (bare name, no prefix) is moved to `apriori/changes/archive/<YYYY-MM-DDThhmm>-<name>/` — a colon-free date-time stamped by the CLI's own clock (never an agent guess); e.g. `archive/2026-07-06T0657-add-playback/`

#### Scenario: AM-07 RENAMED renames a requirement in place, preserving content
- WHEN the delta has a `## RENAMED Requirements` entry `- Old Name -> New Name` and `Old Name` exists while `New Name` does not
- THEN the store block keeps its content but its heading ID becomes `New Name`, listed as renamed; a missing source (with no existing target) or a colliding target is a conflict (stop, exit 1, nothing written) — the source-gone-AND-target-present rerun case is AM-10's no-op, not a conflict

#### Scenario: AM-08 a content-bearing delta that parses to zero operations is a hard error
- WHEN `apriori archive` reads a delta file that has non-whitespace content but matches no recognized section (e.g. wrong heading level or keyword, so 0 delta operations parse)
- THEN it writes nothing, prints an error naming the expected `## ADDED|MODIFIED|REMOVED|RENAMED Requirements` + `### Requirement:` format, and exits non-zero — never reporting MERGED for a delta the parser did not understand

#### Scenario: AM-09 the first archive in a repo creates the store file
- WHEN `apriori archive --write` targets a store file that does not exist yet
- THEN it notes the store will be created, starts from an empty store, and writes the merged result — no ENOENT

#### Scenario: AM-10 re-running an already-merged delta is an idempotent no-op
- WHEN an ADDED requirement in the delta already exists in the store with byte-identical (trimmed) content, or a RENAMED entry's source is gone while its target is present, or a REMOVED entry's target is gone while its deprecated form marked `superseded by <THIS change>` is present — each the signature of a rerun after a partial archive
- THEN each is reported as already merged / already renamed / already deprecated (no-op), not a conflict, and the run can proceed to move the change dir; but an ADDED whose name was created by THIS run's own RENAMED is a same-delta collision and still conflicts even with identical content, and a REMOVED target deprecated by a DIFFERENT change remains a conflict

#### Scenario: AM-11 change names are validated and the dir move cannot escape
- WHEN `--change` is not bare kebab-case (e.g. `../victim`), or `--changes-dir` is given but the change dir does not exist
- THEN archive exits 2 before writing anything; the move helper independently rejects any source that resolves outside the changes dir

### Requirement: high-level archive merges a whole change transactionally
`apriori archive --change <name>` SHALL discover every `.md` delta file under `<changes-dir>/<name>/specs/` (`--changes-dir` defaults to `apriori/changes` and sets both the discovery root and the move root), map each to its store target `apriori/specs/<suffix>` by path suffix, dry-run the whole set by default, and on `--write` commit in four phases — preflight (validate, parse, CAS-check, merge in memory; any failure anywhere → nothing written), stage (write every `<store>.tmp-archive`), commit (rename each temp in sorted path order), move (only when `--changes-dir` was explicitly passed, only after all stores committed). The guarantee is failure-atomicity up to the commit point; crash durability is not claimed.

#### Scenario: AM-13 dry-run reports the whole change and writes nothing
- WHEN `apriori archive --change <name>` runs without `--write` on a change spanning several modules
- THEN it prints per-module merged/modified/deprecated/renamed/no-op requirement names and a result line, and no file on disk changes

#### Scenario: AM-14 any preflight failure means nothing is written
- WHEN any module's merge reports a conflict, any delta file fails a hygiene guard, or any CAS stamp mismatches during `--write`
- THEN every failure across all modules is reported, no store file changes, and the exit code is 1

#### Scenario: AM-15 a mid-commit failure is reported exactly
- WHEN a rename in the commit phase fails after earlier renames succeeded
- THEN archive reports exactly which modules committed, which did not, and which temp files remain for manual completion, and exits 1 — already-committed renames are not rolled back

#### Scenario: AM-16 a pre-existing temp file blocks the run
- WHEN any target `<store>.tmp-archive` already exists at preflight
- THEN archive exits 1 naming that file, writes nothing, and leaves the pre-existing file untouched (it may be another run in flight or a manual-recovery artifact)

#### Scenario: AM-17 zero discovered delta files fail closed
- WHEN `<changes-dir>/<name>/specs/` exists but contains no `.md` delta files, or the change dir itself is missing
- THEN archive exits 2 naming the searched path

#### Scenario: AM-18 the change-dir move waits for every store commit
- WHEN `--write --changes-dir <dir>` succeeds
- THEN the change dir moves to `<dir>/archive/<stamp>-<name>/` only after ALL stores committed; without an explicit `--changes-dir` no move happens; a move failure leaves the committed stores in place and exits 1

#### Scenario: AM-19 high-level and single-file forms are mutually exclusive
- WHEN `--change` is combined with `--store` or `--delta`
- THEN archive exits 2 with usage; the single-file form by itself keeps its 3.0.1 behavior EXCEPT for the two flags it no longer accepts (`--changes-dir`, `--force` — AM-91/AM-92) and the changes-root scope refusal (AM-93..AM-97)

#### Scenario: AM-20 per-file delta hygiene guards the whole set
- WHEN any discovered delta file is empty/whitespace-only, parses to zero operations despite content, or carries duplicate requirement names (within a section or across sections)
- THEN the run refuses naming the file (and requirement, for duplicates), nothing is written, and no partial projection or merge survives

#### Scenario: AM-21 duplicate requirement names in the store are corruption
- WHEN the store text handed to any merge contains the same requirement name twice
- THEN the merge reports it as a conflict instead of silently keeping the last block

#### Scenario: AM-22 realpath containment governs every participating path
- WHEN the change dir, a delta file, a mapped store target, or the move destination (`<changes-dir>/archive/…` — e.g. an `archive/` that is a symlink pointing outside) — each followed through symlinks — resolves outside its root (changes dir / `apriori/specs/`), or a not-yet-existing path's nearest existing ancestor resolves outside its root
- THEN the command exits 2 naming the offending path, and nothing is read as spec input, written, or moved

### Requirement: CAS base stamps detect store divergence
A delta file MAY carry exactly one base stamp `<!-- apriori-base: sha256:<64 lowercase hex> -->` or `<!-- apriori-base: new -->` before its first `## <OP> Requirements` section, declaring the fingerprint of the store file it was authored against. The fingerprint SHALL be SHA-256 over the store file's content with line endings normalized (`\r\n` and lone `\r` → `\n`). `apriori verify --change`, `apriori archive --change`, and single-file `apriori archive` SHALL check present stamps; an absent stamp means no check. `apriori stamp <store-file>` SHALL print the stamp line matching the file's current content.

#### Scenario: AM-23 malformed or duplicated stamps are hygiene errors
- WHEN a delta file carries more than one stamp line, a stamp after the first section heading, or a malformed digest
- THEN the file is rejected by the hygiene guard (nothing projected or written) naming the file

#### Scenario: AM-24 a diverged stamp stops archive before any write, on both surfaces
- WHEN a stamped delta's store file fingerprint no longer matches (including a `new` stamp whose store now exists) — whether archive is invoked as `--change <name>` or as single-file `--store <f> --delta <f>`
- THEN each form reports the store path with expected vs actual fingerprint, writes nothing, and exits 1 — the §4.11 serialize rule made mechanical; both surfaces are exercised, not just one

#### Scenario: AM-25 stamp-free ADDED-only deltas keep the pre-3.1 behavior
- WHEN a delta carries no base stamp — in the high-level `--change` form and in the single-file form alike
- THEN no CAS divergence check runs for that file; an ADDED-only delta merges exactly as pre-3.1, while a stamp-free MUTATION delta falls to the deny-by-default rule (its own requirement) — "no stamp, no check" never means "no stamp, no rules"

#### Scenario: AM-26 the new sentinel matches only an absent store
- WHEN a delta is stamped `<!-- apriori-base: new -->`
- THEN the check passes while the mapped store file does not exist and fails as a mismatch once it does

#### Scenario: AM-27 apriori stamp prints the current stamp line
- WHEN `apriori stamp <store-file>` runs on an existing readable file, an absent path, a directory, or with a wrong argument count
- THEN it prints the exact matching stamp line (absent path → the `new` form) and exits 0; a directory or unreadable file → error naming the path, exit 2; zero or multiple arguments → usage, exit 2

### Requirement: the delta parser consumes its whole input
`parseDeltaStrict` SHALL be a sequential, fully-consuming parser: every line (outside code fences, which are opaque) belongs to exactly one legal construct — file preamble (stamp/blank/free text without structure markers), a legal `## ADDED|MODIFIED|REMOVED|RENAMED Requirements` heading, section-preamble free text, a `### Requirement:` block (body runs to the next heading or EOF), a RENAMED `- Old -> New` line, or a `## Notes` section (opaque commentary: everything under it up to the next fence-outside h2 is ignored entirely — never merged, never a problem) — and anything else is a `problems[]` entry carrying its 1-based line number. The exhaustive problem set: unrecognized h2 headings (one problem per heading; its lines are never absorbed into any bucket), requirement/scenario markers before any section, a requirement block inside RENAMED, a scenario marker outside any requirement, duplicate requirement names, A NON-`Requirement` h3 INSIDE A REQUIREMENT BLOCK, and the stamp problems (which also gain line numbers). Both `verify --change` (exit 2) and `archive` (exit 1) inherit the failure.

#### Scenario: AM-28 a misspelled section heading is reported, never absorbed
- WHEN a delta contains `## ADDDED Requirements` (or any other unrecognized h2) followed by requirement blocks
- THEN parsing reports the heading text with its line number, those requirements appear in NO bucket, and archive/verify fail closed

#### Scenario: AM-29 structure outside its legal home is reported with line numbers
- WHEN a `### Requirement:` appears before any section or inside a RENAMED section, or a `#### Scenario:` appears in a section preamble outside any requirement
- THEN each is a problem carrying its 1-based line number; multiple distinct problems are all reported

#### Scenario: AM-30 free text and fences stay legal; the corpus stays clean
- WHEN a delta carries titles/notes in the file preamble or section preambles, prose (`#####` and deeper headings included) in requirement bodies, or fenced content containing heading-like lines
- THEN no problem is reported — and every archived delta in this repo's `apriori/changes/archive/*/specs/` parses with zero problems (the regression corpus). An `###` heading that is not `### Requirement:` inside a requirement body is the ONE construct this list no longer covers: it is a problem, see the scenario below

#### Scenario: AM-31 stamp problems carry line numbers
- WHEN a delta carries a malformed, duplicated, or misplaced apriori-base stamp
- THEN each stamp problem names its 1-based line number

#### Scenario: AM-71 a non-Requirement h3 inside a block is a problem, not silent body text
- WHEN a `###` heading that is not `### Requirement:` appears inside a requirement block — the shape an author reaches for when explaining WHY a block changed
- THEN it is a problem carrying its line number and the delta is refused; today it is absorbed as body text and written verbatim into the living store, which the MODIFIED-integrity report can surface on a MODIFIED operation but never on an ADDED one, so the ADDED path corrupts the store silently
- AND the same heading in the file preamble, in a section preamble, or in the skipped region after an unrecognized h2 keeps its existing behaviour; `####` and deeper headings inside a block stay body text

#### Scenario: AM-72 one problem per bad block, and the stamp rule is untouched
- WHEN a non-Requirement h3 is followed by more prose and then a legal `### Requirement:`
- THEN exactly ONE problem is reported for that heading, the discarded block reaches no bucket, and the following legal requirement opens normally
- AND WHEN a stamp-shaped line appears inside a discarded block — whether discarded by this rule or by the pre-existing illegal-requirement-inside-RENAMED rule — THEN it is still handled by the stamp rules, never absorbed as body text: discarding suppresses only the new h3 check, never the parser's line-handling order

#### Scenario: AM-73 `## Notes` is opaque, and being opaque has consequences
- WHEN a delta carries one or more `## Notes` sections — before the first operation section, between sections, or at end of file
- THEN their content is ignored entirely: requirement and scenario markers inside them create no operations, a stamp-shaped line inside them is neither adopted nor reported, and no problem is raised; the section ends at the next fence-outside h2, where any of the four legal operation headings resumes parsing and any other h2 reports its own problem as before
- AND a legal stamp intended for the delta must sit BEFORE `## Notes`, since a stamp after it is inside it and therefore ignored — leaving the delta unstamped and subject to the existing CAS default-deny
- AND a delta consisting only of `## Notes` still fails the existing zero-operation guard: commentary is not an operation

### Requirement: unstamped mutation deltas are denied by default and reruns of applied stamps repair
A delta carrying MODIFIED/REMOVED/RENAMED operations without a CAS stamp SHALL be **denied by default on every archive surface** — the high-level `archive --change` form AND the single-file `--store --delta` form: preflight-grade error (exit 1) naming the file and the cure (`apriori stamp <store-file>`), with **nothing written, staged, or moved**. A visible waiver downgrades to the former warn-and-merge behavior: the archive CLI's `--no-cas` flag or a `| cas | optional |` row in `apriori/process-config.md` (the flag wins), and the output names which waiver source applied. ADDED-only deltas stay exempt (the exemption is clobber-focused: they conflict or no-op, never silently overwrite). `verify --change` (the read-only projection) keeps warning without judging; `buildProjection` still returns `unstampedMutations: string[]`. `merge()`'s MODIFIED op SHALL report `unchanged` when the delta block trim-equals the current store block. Archive preflight SHALL classify each stamped delta per file: stamp matches → merge as today; stamp mismatches with EVERY op `unchanged` → a note (`rerun accepted`) and the run proceeds, move included; stamp mismatches with ANY real pending op → error, the whole preflight fails with nothing written or moved — divergence with pending work is never repaired, and notes stay distinct from errors in the diagnostics.

#### Scenario: AM-32 unstamped mutation deltas are denied on both archive forms
- WHEN an unstamped delta carrying a MODIFIED op is archived via --change or via --store/--delta with no waiver
- THEN each form errors (exit 1) naming the file and the stamp cure, writes/stages/moves nothing, and an unstamped ADDED-only delta merges without complaint

#### Scenario: AM-40 the waiver is visible and downgrades to warn-and-merge
- WHEN the same unstamped MODIFIED delta is archived with `--no-cas`, or with a `| cas | optional |` process-config row
- THEN the merge happens with the former warning, the output names the waiver source that applied, and with both present the flag wins

#### Scenario: AM-41 the projection surface stays informative
- WHEN `verify --change` projects a change containing an unstamped mutation delta
- THEN it warns exactly as before and never fails the run for the missing stamp — denial is an archive-surface rule

#### Scenario: AM-33 an already-applied stamped delta reruns to completion
- WHEN a stamped change whose commit already rewrote the stores reruns `archive --write --changes-dir` (an already-applied MODIFIED-only delta included)
- THEN every mismatched file reports the rerun-accepted note, stores stay byte-identical, the change dir moves, and the exit is 0

#### Scenario: AM-34 divergence with pending work never repairs
- WHEN a stamped delta's base mismatches and at least one operation is a real pending change — including the mixed case where another file is already applied
- THEN preflight fails with the mismatch error, nothing is written or moved, and the diagnostics keep already-applied notes apart from divergence errors — while the pure resumed-partial-commit mix (applied-mismatched file + matching file with real ops) completes with the note

#### Scenario: AM-35 MODIFIED speaks the idempotence vocabulary
- WHEN a MODIFIED operation's delta block trim-equals the current store block
- THEN merge reports it `unchanged` rather than `modified`, and first applications behave exactly as before

### Requirement: archive stages the requirement history into the change before the move  _deprecated (superseded by change-bundle)_
With `--write` and an explicit `--changes-dir`, `archiveChange` SHALL, AFTER the stores commit and BEFORE the change-dir move, rename every file in `<cwd>/requirement/` whose basename exactly matches one of three anchored patterns for the change — `^<change>-req-v[0-9]+\.md$`, `^<change>-req-final\.md$`, `^<change>-intent-card\.md$` (change name regex-escaped) — into `changes/<name>/requirement/` (created on demand, basenames preserved), so the existing atomic move carries the requirement history; no post-move writes exist. Fail-closed: the source dir must realpath-resolve inside cwd and the destination must pass containment under the changes dir before any read or rename; a MATCHING candidate that is a symlink (lstat) fails the run before the move, naming the symlink and the cure — symlinks are never followed, non-matching entries are ignored. Any staging failure aborts before the move with exit 1 and the existing rerunnable taxonomy (`stores committed but requirement staging failed … — rerun to complete`); a rerun completes staging and the move (stores re-verify as applied, staged files no-op). Zero matches → silent no-op; dry-run and the single-file form never stage. The report carries `staged: <n> requirement file(s) → changes/<name>/requirement/` when n > 0.

#### Scenario: AM-36 the requirement history travels inside the atomic move
- WHEN a change with `<change>-req-v1.md`, `-req-v2.md`, `-req-final.md`, and `-intent-card.md` in requirement/ archives with --write --changes-dir
- THEN all four end inside the archived dir's requirement/, the live requirement/ no longer has them, the report carries the staged-line, and the exit is 0

#### Scenario: AM-37 attribution is exact and near-misses never match
- WHEN changes `a` and `a-b` both own requirement files and `a` archives, with `a-req-vdraft.md` and `a-req-v1-notes.md` also present
- THEN only `a`'s three-pattern matches are staged; `a-b-*` and both near-misses stay untouched — and an intent-card-only change stages just the card with exit 0

#### Scenario: AM-38 staging failures stop before the move and reruns complete
- WHEN a staging rename is made to fail (DI seam), or a MATCHING candidate is a symlink, or the staging destination `changes/<name>/requirement` resolves outside the change tree (a planted symlink), or the source `requirement/` dir itself escapes cwd
- THEN archive exits 1 BEFORE the move (stores committed, change dir still in flight, nothing read or written outside the workspace) naming the offender and the cure, and a rerun after the cure completes staging plus the move to the AM-36 end state

#### Scenario: AM-39 non-staging paths are unaffected
- WHEN a change has zero matching requirement files, or runs dry-run, or omits --changes-dir, or uses the single-file form
- THEN no staging happens, no staged-line appears, and behavior is byte-identical to before

### Requirement: the atomic move carries the whole bundle
`archiveChange` SHALL have no staging phase and no post-commit writes of any kind: with `--write` and an explicit `--changes-dir`, the change dir — which by the bundle layout already contains `requirement/`, `review/`, `gap-report.md`, and everything else the change owns — moves to `archive/<stamp>-<name>/` in the existing single atomic rename, carrying it all. The command reads and writes nothing under any legacy root; it is track-agnostic and never deletes `spike/` (executor protocol). Dry-run and the single-file form behave as before.

#### Scenario: AM-36 the bundle travels whole
- WHEN a bundle change carrying requirement/ (req versions + intent card), review/ (ledger, docs, raws), and gap-report.md archives with --write --changes-dir
- THEN the archived dir contains all of them byte-identically, nothing is left behind in the live changes dir, no staging or copy lines appear in the report, and the exit is 0

#### Scenario: AM-37 the command touches nothing outside the moved dir
- WHEN the same archive runs
- THEN no file outside `changes/<name>/` and the store files is read for staging or written — there is no requirement-staging code path at all

#### Scenario: AM-38 move failure keeps the bundle intact and rerunnable
- WHEN the dir move is made to fail (DI seam)
- THEN stores stay committed, the untouched bundle remains in flight with all its contents, the existing move-failure taxonomy reports the rerun cure, and a rerun completes the move with the bundle intact

#### Scenario: AM-39 non-move paths are unaffected
- WHEN a change runs dry-run, omits --changes-dir, or uses the single-file form
- THEN behavior is byte-identical to before — no move, no bundle handling

### Requirement: archive consults CAS config through the structured reader
`archive`'s waiver lookup SHALL go through the shared structured config reader: fenced/commented rows grant nothing, a live row decides, and a cas CONFLICT or illegal value at consultation is a preflight error (exit 1, nothing written or moved) naming the config problem — bad config never equals a waiver; `--no-cas` keeps explicit supremacy; stamped or ADDED-only runs never consult the key, so a bad row cannot affect them.

#### Scenario: AM-42 the reviewer's fenced-waiver bypass is dead
- WHEN an unstamped MODIFIED delta archives under a config whose fenced block says `| cas | optional |` while the live row says `| cas | required |` (the reviewer's reproduced bypass), and again under a cas CONFLICT, and again fully stamped under the same broken configs
- THEN the first two runs are DENIED at preflight (nothing written; the conflict named in the second) while the stamped run proceeds untouched — and `--no-cas` still waives the first two explicitly

### Requirement: the modified-block integrity engine reports replacement fidelity
A pure shared helper SHALL compare a MODIFIED operation's old store block against its replacement (both captured at the projection's own parse snapshot — `buildProjection` additionally returns the raw old/new block text pairs per MODIFIED operation; no consumer re-reads files) and report structural fidelity, WITHOUT changing any verdict, exit code or write semantics. Structure scan: the requirement heading line never participates; requirement prose runs from the line after the heading to the first VALID scenario heading (state A's actual regex `/^####\s+Scenario:\s+(.*)$/m`, fence-aware exactly like `stripFences` — only lines inside CLOSED triple-backtick pairs are not delimiters; an unclosed opener is ordinary text and later headings still split); fence delimiter lines and fenced non-empty lines are compared as body lines. Pairing runs per key (scenario ID when present, normalized full title otherwise) through one cardinality truth table — o=0,n=1 added; o=1,n=0 dropped; o=1,n=1 paired (same normalized title → retained, different → titleChanged, mutually exclusive, both body-compared); any side >1 → ambiguous (side old/new/both with counts; the key skips every other class and body comparison). Line comparison is ONE algorithm: order-preserving greedy subsequence over normalized non-empty lines (CRLF/CR→LF, trailing whitespace stripped, leading whitespace stripped; duplicates consumed by count); unmatched OLD lines are `missingLines` (requirement prose misses carry scenario=null; only old-content loss is reported). An idempotent replacement takes a FAST PATH — `oldBlock.trim() === newBlock.trim()` short-circuits before any structure scan or id extraction — yielding an entry whose diff arrays are all empty (the stamped-rerun repair path included: a repaired module still contributes its equal-text pair, one entry per MODIFIED operation always). Capture points are module-level testable: `buildProjection().modifiedBlocks` carries raw text pairs — for rename-then-modify the oldBlock deep-equals the COMPLETE pre-rename block (captured before the rename key swap) and the newBlock deep-equals the delta block. The human formatter renders SAFELY: every externally-sourced field (titles, lines, requirement names, file suffixes, ambiguous keys) has C0/DEL control characters replaced with `·` BEFORE the 120-unit truncation (JSON keeps full raw text; JSON.stringify escapes there); an all-empty result renders as NOTHING (no blank line).

#### Scenario: AM-43 the cardinality truth table classifies every occurrence
- WHEN an old block carries KV-01/KV-02/KV-03 and the replacement carries KV-01 (same title), KV-03 (changed title), KV-04 — and separately each of the eight o/n cardinality rows is exercised (including a duplicated KV-05 on one side and no-ID title keys)
- THEN retained=[KV-01], titleChanged=[KV-03 with old/new titles], dropped=[KV-02], added=[KV-04]; each truth-table row lands in its one class; ambiguous entries carry {key, side, oldCount, newCount} and skip every other class; ambiguous ordering is old-present keys by old first occurrence, then new-only keys by new first occurrence

#### Scenario: AM-44 the subsequence comparison reports lost lines faithfully
- WHEN a retained scenario's replacement drops one AND clause, reorders two lines, repeats a line fewer times, differs only in indentation/trailing whitespace on another, and the requirement prose loses a sentence
- THEN missingLines lists the dropped AND clause, the reordered-out line and the under-repeated line (by count) with full original text, the whitespace-only difference is NOT reported, and the prose loss carries scenario=null

#### Scenario: AM-45 structure boundaries follow state A exactly
- WHEN a rename-then-modify replacement preserves prose and scenarios verbatim under the new requirement name, a CLOSED fence contains a scenario-looking heading, an UNCLOSED fence precedes a real scenario heading, and a heading uses multiple spaces after `####`
- THEN the rename case reports zero missingLines (the heading line is never compared); the fenced fake heading does not split a scenario and its lines are body-compared; the heading after the unclosed opener still splits (stripFences strips only closed pairs); the multi-space heading is a valid delimiter

#### Scenario: AM-46 archive prints the integrity section without changing its semantics
- WHEN `apriori archive --change <name>` (the high-level form only; the single-file form is out of scope) passes preflight with a MODIFIED delta whose replacement drops a scenario — on dry-run and on `--write`
- THEN the same human integrity section appears in the output BEFORE the write-result lines (an output-order guarantee — archive's output stays buffered as in state A; physical I/O timing is not promised), the RESULT line, exit code and written bytes are identical to a run without the report, and ANY preflight failure — malformed, CAS, conflict, denial, a pre-existing temp file, an escaping --changes-dir destination — prints NO integrity section

#### Scenario: AM-47 the archive id-pattern channel is resolved, terminable and degradable
- WHEN archive runs with a custom config `id-pattern` row recognizing letter-suffixed IDs; with no row (default); with an uncompilable row; and with an injected matcher failure
- THEN the first two produce correct reports through the injected terminable matcher — the pinned seam: `archiveMerge.cli(argv, deps)` and `archiveChange({..., idMatcherFactory})` accept an optional factory `(cwd) => matcher | {error}`; bin builds it lazily from `lib/config`'s resolveIdPattern plus spec-runner's makeIdMatcher; a MISSING factory degrades exactly like a factory error (warning + skip); archive-merge itself never requires spec-runner; the last two print exactly one stderr warning — the WHOLE line `warning: modified-integrity <reason>` passed through sanitizeMsg (control chars replaced with `·`, ≤200 UTF-16 units) — skip the report, and leave every other archive output and exit unchanged

### Requirement: archive refuses to merge a change that is not ready
`apriori archive --change <name>` SHALL, in dry-run and with `--write` alike, evaluate the bundle's readiness AFTER every existing preflight guard and BEFORE the MODIFIED integrity section, and refuse with `RESULT: NOT READY — nothing written` (exit 1, nothing written and nothing moved) unless: R1 the flow-state is structurally sound, passes the C3 legality checks, and declares `current-step: STEP6`; R2 `tasks.md` has zero unchecked boxes; R3 `review/issues.md` passes the ledger check at the `archived` stage. The three predicates SHALL be the SAME code the gate's C3/C2/archived-C4 run. Reads of the three artifacts SHALL go through an archive-only safe layer that classifies `lstat`/`realpath` failures by `e.code` in a SINGLE pass — only a true `ENOENT` reaches the tier-sensitive missing branch; every other code is a structural defect. Evaluation order is: structural → C3 legality → the STEP6 overlay → R2/R3 progress; R1 reports only its first hit, R2 and R3 report together.

#### Scenario: AM-74 the safe layer classifies every artifact defect
- WHEN each of `flow-state.md`, `tasks.md` and `review/issues.md` is in turn missing, a symlink, a non-file, escaping the bundle, or sitting under a bad ancestor, at trivial and at medium/large tier
- THEN the outcome matches the artifact × defect-kind × tier table: only a true missing `tasks.md`/ledger at trivial tier is `n/a`; every other combination refuses, and every structural refusal is non-forceable

#### Scenario: AM-75 an external STEP6 file cannot launder an ABANDONED bundle
- WHEN a bundle whose real flow-state says `current-step: ABANDONED` has its `flow-state.md` replaced by a symlink pointing at a `STEP6` file outside the bundle
- THEN archive refuses as a structural defect without following the link, and `--force` does not change the outcome

#### Scenario: AM-76 the review root is guarded before the ledger leaf
- WHEN `review/` is itself a symlink pointing at another directory inside the bundle while `review/issues.md` reads perfectly
- THEN archive refuses — guarding only the leaf would let a bundle through that the gate's C4 would block

#### Scenario: AM-77 a read that fails after the guard is a structural defect
- WHEN the guard passes and the subsequent `readFileSync` throws (race or permission)
- THEN archive refuses, the diagnosis carries the original `e.code`, and the failure is non-forceable

#### Scenario: AM-107 a non-ENOENT failure at any of the five probe points refuses, at every tier
- WHEN a non-`ENOENT` error (`EACCES`/`EIO`/`ELOOP`) is injected at the artifact `lstat`, at the ancestor walk, at the review-root `lstat`, at the artifact realpath stage, or at the review-root realpath stage
- THEN each one refuses as `io-error` with the original `e.code`, non-forceable — INCLUDING at trivial tier, where classifying it as `missing` would have returned `n/a` and let the write proceed

#### Scenario: AM-108 a true ENOENT still takes the tier-sensitive branch
- WHEN `tasks.md` or the ledger genuinely does not exist at trivial tier
- THEN the rule is `n/a`, not a structural refusal

#### Scenario: AM-115 an ENOENT raised at the realpath stage is not a structural defect either
- WHEN the `lstat` succeeds but the containment check's realpath reports `ENOENT` — for the artifact, and separately for the review root
- THEN the artifact case takes the ancestor walk and ends as missing, and the review-root case reports nothing, exactly as the earlier `lstat` ENOENT would have — the containment check has no third answer of its own

#### Scenario: AM-112 a completely normal bundle stays archivable
- WHEN `review/` is an ordinary directory, `issues.md` an ordinary file, every task checked and the flow-state at STEP6
- THEN readiness passes and the archive completes — a file-type rule applied to the review DIRECTORY would have failed every well-formed bundle

#### Scenario: AM-113 an absent review directory is not a structural defect
- WHEN `review/` does not exist at all
- THEN the review-root check reports nothing and the ledger leaf decides by tier: `n/a` at trivial, not-ready at medium/large

#### Scenario: AM-78 an unready change is refused with nothing written
- WHEN the flow-state is at the wrong step, or tasks are unchecked, or the ledger is non-terminal
- THEN archive prints `RESULT: NOT READY — nothing written`, exits 1, writes no store byte and moves no directory

#### Scenario: AM-79 R1 reports first and alone, R2 and R3 report together
- WHEN a bundle fails R1 as well as R2 and R3
- THEN only the first R1 hit is reported; when R1 passes, every R2 and R3 blocker is listed in one report

#### Scenario: AM-80 ABANDONED and DONE carry their own wording
- WHEN `current-step` is `ABANDONED`, or is `DONE`
- THEN the first cites the runbook's hard rule and the second reads `in-flight bundle declares DONE; expected STEP6` — never claiming the change was already archived — and neither is forceable

#### Scenario: AM-81 a broken flow-state reports the C3 diagnosis, not the step wording
- WHEN a bundle declares `ABANDONED` and also fails another C3 check (missing key, placeholder, name mismatch)
- THEN the C3 diagnosis is reported verbatim and the ABANDONED wording is not used

#### Scenario: AM-82 tier decides what a missing artifact means
- WHEN `tasks.md` or the ledger is absent
- THEN trivial tier reports `n/a`; medium and large tiers are not ready, and the absence is non-forceable

#### Scenario: AM-83 existing preflight failures keep their diagnosis and never reach readiness
- WHEN any existing guard fails — discovery, validation, CAS denial, hygiene, base mismatch, conflict, a pre-existing temp file, or the archive-destination containment check
- THEN the diagnosis and exit code are unchanged from before this change and the readiness evaluator is never called

#### Scenario: AM-84 the integrity section is not printed for an unready change
- WHEN readiness fails
- THEN no MODIFIED INTEGRITY section appears; when readiness passes it appears in its existing position

#### Scenario: AM-85 dry-run predicts what --write would do
- WHEN an unready change is dry-run
- THEN `RESULT: MERGED (dry-run…)` is not printed, the exit code is 1 and nothing is written

#### Scenario: AM-114 readiness is a single look, not a commit-time guarantee
- WHEN the bundle is modified inside the hook that fires after readiness completes and before the first store write
- THEN archive neither re-reads the readiness artifacts nor detects the change — the guarantee is one evaluation, and the caller must not modify the bundle across the run

### Requirement: --force overrides progress only, on pre-recorded human authority
`--force` SHALL belong to the high-level form alone and SHALL override ONLY progress blockers: unchecked tasks, and ledger rows that are `open`, `fixed`, or plain `rejected` WITH a reason. Everything else is non-forceable: every R1 outcome (`ABANDONED` above all), every structural defect (`io-error`, `symlink`, `not-file`, `not-dir`, `escape`, `bad-ancestor`), a missing artifact at medium/large tier, an illegal status token, a missing reason, and a `waived` row without its human `gates:` record. A force takes effect only when the bundle's flow-state already carries an anchored, class-named record `archive-force <tasks|ledger> <reason>`; one record authorizes exactly the one class it names. Revocation is by APPENDING `archive-force-revoke <class> <reason>` — the `gates:` block is an append-only log — and the last decision for a class wins. The authorization is STANDING for the bundle's lifetime, not per-run.

#### Scenario: AM-86 progress blockers are forceable
- WHEN tasks are unchecked, or ledger rows are `open`, `fixed`, or `rejected` with a reason, and the matching record exists
- THEN archive proceeds

#### Scenario: AM-87 everything else is not
- WHEN the blocker is any R1 outcome, any structural defect, a missing artifact at medium/large tier, an illegal status, a missing reason, or a `waived` row lacking its human record
- THEN `--force` does not change the refusal

#### Scenario: AM-88 without the record the flag does nothing and the template is printed
- WHEN `--force` is passed and no `archive-force <class>` record exists, or its reason carries no letter or digit in any script
- THEN the refusal stands and a copyable template is printed — never a claim about a reason the human has not yet written

#### Scenario: AM-89 a record authorizes its own class and no other
- WHEN only `archive-force tasks` is recorded
- THEN unchecked tasks are overridden while the ledger blockers still refuse, and the mirror case holds for `archive-force ledger`

#### Scenario: AM-110 the record is anchored and fully consumed
- WHEN the entry reads `archive-force tasks — ledger cleanup deferred`, or `archive-force tasks2 …`, or `archive-force-2 tasks …`, or `do not archive-force tasks — 还没做完`
- THEN only the first grants, and it grants `tasks` alone — the class word inside a reason never authorizes, and a keyword preceded by free text never authorizes

#### Scenario: AM-111 revocation appends and the last decision wins
- WHEN `archive-force tasks <reason>` is followed by `archive-force-revoke tasks <reason>` and later by another `archive-force tasks <reason>`, each carrying a reason
- THEN the class is authorized, then not, then authorized again, in the order the entries appear; a revoke with no grant before it authorizes nothing, and a revoke carrying no reason is ignored exactly as a reasonless grant is

#### Scenario: AM-109 every forced item is named with the record it rests on
- WHEN a force takes effect
- THEN each overridden blocker is printed on its own `forced: ` line followed by the record's RAW FIRST LINE — not the continuation-joined normalized entry, and never a bare "forced"

#### Scenario: AM-90 force changes the verdict in dry-run too
- WHEN `--force` is passed without `--write`
- THEN the readiness verdict changes exactly as it would with `--write`, and nothing touches the disk

#### Scenario: AM-91 the single-file form does not take --force
- WHEN `--force` accompanies `--store`/`--delta`
- THEN archive exits 2 with usage

#### Scenario: AM-116 the decision payload is extracted the same way for every legal prefix
- WHEN a gates: entry carries a timestamp, a label, both, or neither before its decision text
- THEN the payload is what follows the first `': '` after an optional timestamp — one deterministic rule, so the canonical `gate⑤ (owner):` form the docs tell a human to copy is recognised and a negated sentence is not

#### Scenario: AM-117 the usage lines say which flags belong to which form
- WHEN `apriori archive` is run with no arguments
- THEN the single-file line carries neither `--changes-dir` nor `--force`, and the high-level line carries both — the two forms are no longer symmetric and the usage must not pretend otherwise

### Requirement: the single-file form never touches a change bundle
The single-file form `apriori archive --store <f> --delta <f>` SHALL NOT accept `--changes-dir` (and therefore SHALL never move a directory), and SHALL refuse any `--delta` that resolves inside the canonical changes root. Containment is judged by TWO measures — the `path.resolve` lexical spelling and the realpath — with segment boundaries, not string prefixes; either measure hitting is a refusal. A measure whose realpath cannot be taken produces no hit. The judgement happens before any store or delta CONTENT is read; path metadata reads needed for the judgement are excepted. A delta outside every changes root keeps its existing behaviour byte for byte.

#### Scenario: AM-92 the single-file form no longer takes --changes-dir
- WHEN `--changes-dir` accompanies `--store`/`--delta`
- THEN archive exits 2 with usage, writes nothing and moves nothing

#### Scenario: AM-93 a delta spelled inside the changes root is refused
- WHEN `--delta` is `apriori/changes/X/specs/a.md`, or `./apriori/changes/X/specs/a.md`, or a `..`-containing path that resolves to the same place
- THEN archive refuses and the diagnosis names the high-level form as the way to do this

#### Scenario: AM-94 a sibling directory sharing a prefix is not inside
- WHEN `--delta` is `apriori/changes-other/X/specs/a.md`
- THEN archive proceeds — containment is judged by path segments

#### Scenario: AM-95 an external symlink into a bundle is refused
- WHEN `--delta` is a symlink outside the changes root whose realpath lands inside it
- THEN archive refuses on the realpath measure

#### Scenario: AM-96 a symlinked root is caught by the lexical measure
- WHEN the changes root itself is a symlink and the caller spells the delta lexically inside it, so the realpath measure misses
- THEN archive still refuses

#### Scenario: AM-97 an unresolvable path produces no hit and no new failure
- WHEN the changes root does not exist, or the delta is dangling, or realpath fails on permissions
- THEN that measure produces no hit; if the lexical measure also misses, the call falls through to the pre-existing behaviour with its original exit code and diagnosis

#### Scenario: AM-98 surgery outside the changes root is untouched
- WHEN `--delta` lies outside every changes root, including the `--write` success path
- THEN the behaviour is byte-for-byte what it was before this change
