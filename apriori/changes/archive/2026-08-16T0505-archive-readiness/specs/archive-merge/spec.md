<!-- apriori-base: sha256:51620e96cd6b3c4a4b1af5e1e0865fd7f55bcf0333ecc47aeca727cf997282c5 -->

## MODIFIED Requirements

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

## ADDED Requirements

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
