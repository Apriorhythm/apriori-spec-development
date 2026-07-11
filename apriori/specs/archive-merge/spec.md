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

#### Scenario: AM-12 the store commit and the dir move are one transaction (single-file form)
- WHEN the single-file form `apriori archive --store <f> --delta <f> --change <name> --write --changes-dir <dir>` runs and the change-dir move fails
- THEN the store on disk stays byte-for-byte untouched (staged to a temp file, committed by rename only after the move succeeds) and no temp residue remains — the high-level `--change` form's move-failure rule is AM-18's (stores already committed stay committed)

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
- THEN archive exits 2 with usage; the single-file form by itself keeps its 3.0.1 behavior unchanged

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

#### Scenario: AM-25 stamp-free deltas behave exactly as before, on both surfaces
- WHEN a delta carries no base stamp — in the high-level `--change` form and in the single-file form alike
- THEN no CAS check runs and behavior is identical to pre-3.1 for that file

#### Scenario: AM-26 the new sentinel matches only an absent store
- WHEN a delta is stamped `<!-- apriori-base: new -->`
- THEN the check passes while the mapped store file does not exist and fails as a mismatch once it does

#### Scenario: AM-27 apriori stamp prints the current stamp line
- WHEN `apriori stamp <store-file>` runs on an existing readable file, an absent path, a directory, or with a wrong argument count
- THEN it prints the exact matching stamp line (absent path → the `new` form) and exits 0; a directory or unreadable file → error naming the path, exit 2; zero or multiple arguments → usage, exit 2

### Requirement: the delta parser consumes its whole input
`parseDeltaStrict` SHALL be a sequential, fully-consuming parser: every line (outside code fences, which are opaque) belongs to exactly one legal construct — file preamble (stamp/blank/free text without structure markers), a legal `## ADDED|MODIFIED|REMOVED|RENAMED Requirements` heading, section-preamble free text, a `### Requirement:` block (body runs to the next heading or EOF), or a RENAMED `- Old -> New` line — and anything else is a `problems[]` entry carrying its 1-based line number. The exhaustive problem set: unrecognized h2 headings (one problem per heading; its lines are never absorbed into any bucket), requirement/scenario markers before any section, a requirement block inside RENAMED, a scenario marker outside any requirement, duplicate requirement names, and the stamp problems (which also gain line numbers). Both `verify --change` (exit 2) and `archive` (exit 1) inherit the failure.

#### Scenario: AM-28 a misspelled section heading is reported, never absorbed
- WHEN a delta contains `## ADDDED Requirements` (or any other unrecognized h2) followed by requirement blocks
- THEN parsing reports the heading text with its line number, those requirements appear in NO bucket, and archive/verify fail closed

#### Scenario: AM-29 structure outside its legal home is reported with line numbers
- WHEN a `### Requirement:` appears before any section or inside a RENAMED section, or a `#### Scenario:` appears in a section preamble outside any requirement
- THEN each is a problem carrying its 1-based line number; multiple distinct problems are all reported

#### Scenario: AM-30 free text and fences stay legal; the corpus stays clean
- WHEN a delta carries titles/notes in the file preamble, section preambles, or requirement bodies, or fenced content containing heading-like lines
- THEN no problem is reported — and every archived delta in this repo's `apriori/changes/archive/*/specs/` parses with zero problems (the regression corpus)

#### Scenario: AM-31 stamp problems carry line numbers
- WHEN a delta carries a malformed, duplicated, or misplaced apriori-base stamp
- THEN each stamp problem names its 1-based line number

### Requirement: unstamped mutation deltas warn and reruns of applied stamps repair
A delta carrying MODIFIED/REMOVED/RENAMED operations without a CAS stamp SHALL produce one warning naming the file and the cure (run `apriori stamp`, mandatory in 4.0) on every mutation surface — the high-level `archive --change` report AND the single-file `--store --delta` form — while still merging (WARN grade this minor); ADDED-only deltas are exempt (the exemption is clobber-focused: they conflict or no-op, never silently overwrite). `buildProjection` SHALL return `unstampedMutations: string[]` (store-suffix-relative paths, `[]` when none). `merge()`'s MODIFIED op SHALL report `unchanged` when the delta block trim-equals the current store block (the already-applied signature the other ops have). Archive preflight SHALL classify each stamped delta per file: stamp matches → merge as today; stamp mismatches with EVERY op `unchanged` → a note (`rerun accepted`) and the run proceeds, move included; stamp mismatches with ANY real pending op → error, the whole preflight fails with nothing written or moved — divergence with pending work is never repaired, and notes stay distinct from errors in the diagnostics.

#### Scenario: AM-32 unstamped mutation deltas warn on both archive forms
- WHEN an unstamped delta carrying a MODIFIED op is archived via --change or via --store/--delta
- THEN one warning names the file and the stamp cure, the merge still happens, and an unstamped ADDED-only delta warns nowhere

#### Scenario: AM-33 an already-applied stamped delta reruns to completion
- WHEN a stamped change whose commit already rewrote the stores reruns `archive --write --changes-dir` (an already-applied MODIFIED-only delta included)
- THEN every mismatched file reports the rerun-accepted note, stores stay byte-identical, the change dir moves, and the exit is 0

#### Scenario: AM-34 divergence with pending work never repairs
- WHEN a stamped delta's base mismatches and at least one operation is a real pending change — including the mixed case where another file is already applied
- THEN preflight fails with the mismatch error, nothing is written or moved, and the diagnostics keep already-applied notes apart from divergence errors — while the pure resumed-partial-commit mix (applied-mismatched file + matching file with real ops) completes with the note

#### Scenario: AM-35 MODIFIED speaks the idempotence vocabulary
- WHEN a MODIFIED operation's delta block trim-equals the current store block
- THEN merge reports it `unchanged` rather than `modified`, and first applications behave exactly as before
