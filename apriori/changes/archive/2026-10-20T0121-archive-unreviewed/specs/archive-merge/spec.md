<!-- apriori-base: sha256:188752bc9fc4962ebb459bcabed6afc7d4d0eccac983b6e1a8240c94e6c8aafb -->

# Delta — archive-merge (archive-unreviewed)

## ADDED Requirements

### Requirement: the owner may close a delivered change without a converged independent review
A change the owner says is delivered SHALL be archivable without a converged independent review, on the owner's authority alone and by a DOUBLE action: `- <YYYY-MM-DDTHH:MM> owner: archive-unreviewed <change> — <reason>` in the bundle's `gates:` (the same canonical owner entry and parser as the other decision verbs; the change named whole, a reason required, the last matching entry winning) AND `apriori archive --change <change> --unreviewed`. Neither half alone SHALL write anything: the flag without the record is refused, `NOT READY`, naming the line to record; the record without the flag leaves the ordinary refusal and adds `an archive-unreviewed decision is on record — pass --unreviewed …`. With both, readiness SHALL relax exactly two demands — R1's phase demand (`phase: build` is accepted beside `review`) and R4's convergence of the review loop (no completed round, a round still revising or escalated with no decision, a missing or failing `review-progress` record, a verdict doc with no raw archive, and the review evidence's integrity findings — a gap in a family's rounds, a duplicated round, a summary that lost its verdict beside its transcript, an orphan round transcript, a verdict outside the phrase table, a document declaring two outcomes — each of which is then named and makes the review `not converged`) — and nothing else: R1's structure and C3 legality, every other phase (`ground`, `specify`, `done`, `abandoned`), R4's structural guards (a symlinked, escaping or unreadable review root, a symlinked or unreadable evidence doc — and, under the closeout, a review summary the reader could not read and any entry of `review/` that is not a regular file, so a symlinked raw is never taken for a merely missing one), R5 and every preflight (CAS stamps, conflicts, the structural id check, the drop guard) refuse as before. Where nothing is waived — the review loop owes nothing and the phase is `review` — `--unreviewed` SHALL be refused (`nothing is left for the closeout to waive`), so no record claims a missing review that was there. The run SHALL report what it waived, the phase relaxation included: the critical-evidence line ends with the review as it reads, each family named by its LAST attributable round's own ordinal, and a round the evidence claims beyond it (or in a family with no attributable round) named as `<family> round <n> (unattributable)` — `; independent review: none — [<rounds> — ]closed by the owner without one` (no attributable round), `; independent review: not converged — <family> round <n> (<verdict>[, <k> open]); … — closed by the owner without a converged one` (a family whose last attributable round does not accept with nothing open, or is escalated — answered and forced or not — unless its rulings at the limit and their one re-review closed it; a family whose evidence claims a round beyond its last attributable one; or any integrity finding at all), `; independent review: evidence incomplete — … — closed by the owner with its review evidence incomplete` (every family converged, but evidence or a `review-progress` record is missing), or `; independent review: converged — … — closed by the owner at phase build` (only the phase was waived); the state SHALL be read from the families' own last verdicts and ruling states, never inferred from which demands were left to waive or were forced — then `note: owner decision on record: <the entry's first line>` and one `note: waived by the owner's closeout: <rule> <detail>` per waived demand, the R1 phase relaxation first when it applied; the manifest carries the same in its `review` key (`independentReview` one of `none`, `not converged`, `evidence incomplete`, `converged`). The single-file form SHALL refuse `--unreviewed` with usage (exit 2), and the high-level usage line SHALL show it.

#### Scenario: AM-137 the owner closes a change that never had an independent review
- WHEN a bundle at `phase: build`, and separately at `phase: review`, with no review round carries the owner's `archive-unreviewed c` record, and is archived with `--unreviewed`, first as a dry-run and then with `--write`
- THEN the dry-run writes nothing and both runs declare `critical evidence: complete; independent review: none — closed by the owner without one` with the decision note and a waived R4 note — and, at `build` only, the waived R1 phase note first; the write merges the delta into the store, moves the bundle, and its manifest carries `review` with `independentReview: none`, no rounds, the decision's first line and the waived demands (the R1 phase demand first at `build`, absent at `review`), beside the usual keys

#### Scenario: AM-138 the record alone and the flag alone archive nothing
- WHEN `--unreviewed` is given with no record, a `note:` actor, a record naming another change, a record without a reason, without its em dash, or with free text before the verb — and separately the canonical record is present without the flag
- THEN every flag-only run is `NOT READY — nothing written` naming the `owner: archive-unreviewed c — <the human's reason, verbatim>` line, the record-only run is the ordinary R4 refusal plus the pointer to `--unreviewed`, nothing is written in any of them, and `unreviewedGrant` answers a grant for the canonical record of this change only

#### Scenario: AM-139 a review that never converged is closed as not converged, with its last round
- WHEN the closeout archives a bundle whose code-review round 1 says `2 issues open`; one whose only verdict doc has no raw archive; one whose unattributable round 1 is followed by an attributable round 2 saying `2 issues open`; one whose unattributable round 1 is followed by an attributable, accepting round 2; one at `review-round-limit: 1` whose round 1 says `2 issues open` with no rulings; one at `phase: build` whose round 1 escalated, answered with `reframe … accept-risk` and archived with `--force`; and five whose accepting round 1 is followed by a later history the evidence cannot vouch for
- THEN the first declares `independent review: not converged — code-review round 1 (revise, 2 open)` and waives the unresolved review floor by name, its manifest recording `not converged` and that round; the second, having no attributable round, declares `none — code-review round 1 (unattributable)` and names the unattributable doc among what it waived; the third names `code-review round 2 (revise, 2 open)` — the round's own ordinal, not a count of attributable rounds; the fourth declares `evidence incomplete — code-review round 2 (accept)` and names the unattributable round 1 doc among what it waived; and, with `review-round-limit: 1`, a revising round 1 whose rulings are still owed — only evidence obligations left — declares `not converged`, as does a build-phase escalation the owner answered with `accept-risk` and `--force` overrode; and an attributable accepting round 1 followed by a round 2 that has no raw, a round 2 whose summary lost its verdict beside its transcript, or an orphan round-2 transcript each declares `not converged` naming `code-review round 2 (unattributable)`, as does a gap (rounds 1 and 3) and a round-2 doc declaring two outcomes, each finding named among what was waived

#### Scenario: AM-140 the closeout never waives a pending item, an unfinished or illegal state, a structural defect or a CAS conflict
- WHEN the record and the flag are both present on a bundle with a pending open item, a standing assumption, `phase: ground`, `specify`, `abandoned` or `done`, an illegal phase, a symlinked `review/` root, a symlinked raw beside a regular summary (dry-run and `--write`), a review summary whose read fails, a delta whose base stamp no longer matches the store, an ADDED requirement the store already holds with other text, and a MODIFIED replacement that drops a store scenario with no `archive-drop` decision
- THEN each is refused with nothing written — R5, R1, R4's structural refusal (naming the symlinked raw; for the unreadable summary readiness reports a non-forceable structural R4 blocker and no closeout), `FAILED PREFLIGHT` and, for the drop, `REFUSED` respectively — and the store and the bundle stay as they were

#### Scenario: AM-141 a converged review refuses the flag at review, and closes as converged at build
- WHEN a bundle at `phase: review` whose review converged carries the record and is archived with `--unreviewed`, and then without it; and a bundle at `phase: build` whose review converged is archived with the record and `--unreviewed`
- THEN the first is refused (`--unreviewed: nothing is left for the closeout to waive (the review loop owes nothing and the phase is review) — archive without --unreviewed`) with nothing written, the second archives on the normal path with no `independent review:` text and no `review` manifest key; the build-phase bundle archives declaring `independent review: converged — code-review round 1 (accept) — closed by the owner at phase build`, its manifest recording `converged` and the R1 phase demand as the only waiver

#### Scenario: AM-142 --unreviewed belongs to the high-level form
- WHEN `--unreviewed` accompanies `--store`/`--delta`, and `apriori archive` is run with no arguments
- THEN the first exits 2 naming the high-level form, and the usage shows `[--unreviewed]` on the high-level line only

## MODIFIED Requirements

### Requirement: archive refuses to merge a change that is not ready
`apriori archive --change <name>` SHALL, in dry-run and with `--write` alike, evaluate the bundle's readiness AFTER every existing preflight guard and BEFORE the MODIFIED integrity section, and refuse with `RESULT: NOT READY — nothing written` (exit 1, nothing written and nothing moved) unless: R1 the flow-state is structurally sound, passes the C3 legality checks, and declares `phase: review`; R4 the review root is a real contained directory and the review loop has converged; R5 no open item is still pending (6.2: the one substantive state predicate). The one relaxation is the owner's closeout of a delivered change without a converged review (the archive-unreviewed requirement): with the owner's record AND `--unreviewed`, R1 also accepts `phase: build` and R4 does not demand the review loop's convergence — never R1's structure and legality, R4's review-root and evidence-file guards, or R5. There SHALL be no R2 and no R3: 6.0 asks for no task list and `tasks.md` is never read; `review/issues.md` is opened by exactly one thing — R1's one-shot legacy migration (LM-01, the same helper C3 runs): a still-`open` row is a structural, non-forceable refusal until it is moved into `## Open`, an unreadable or unparseable ledger is a migration error (LM-05), and a closed-only or absent ledger changes nothing — no rule of readiness judges the change by it. The predicates SHALL be the SAME code the gate's C3/C8/C9 run. Reads of the flow-state SHALL go through an archive-only safe layer that classifies `lstat`/`realpath` failures by `e.code` in a SINGLE pass — only a true `ENOENT` reaches the absent branch; every other code is a structural defect. Evaluation order is: structural → C3 legality → the phase overlay → R4/R5.

#### Scenario: AM-74 the safe layer classifies every flow-state defect
- WHEN `flow-state.md` is in turn missing, a symlink, a non-file or escaping the bundle, with and without a (inert) `mode:` line — and separately when `review/issues.md` takes the same shapes
- THEN every flow-state defect refuses, non-forceably, whatever the mode says; a ledger that is not a readable file (not-file, symlink) refuses as R1's structural migration error — a ledger that cannot be read cannot be proven closed (LM-05) — while an absent ledger is nothing

#### Scenario: AM-75 an external phase file cannot launder an abandoned bundle
- WHEN a bundle whose real flow-state says `phase: abandoned` has its `flow-state.md` replaced by a symlink pointing at a `phase: review` file outside the bundle
- THEN archive refuses as a structural defect without following the link, and `--force` does not change the outcome

#### Scenario: AM-76 the review root is guarded, and the guard is R4's
- WHEN `review/` is itself a symlink pointing at another directory inside the bundle that holds a perfectly good review round
- THEN archive refuses under R4 as a structural, non-forceable defect — the directory the loop reads is never read through a link

#### Scenario: AM-77 a read that fails after the guard is a structural defect
- WHEN the flow-state guard passes and the subsequent `readFileSync` throws (race or permission)
- THEN archive refuses, the diagnosis carries the original `e.code`, and the failure is non-forceable

#### Scenario: AM-107 a non-ENOENT failure at any of the five probe points refuses, in every mode
- WHEN a non-`ENOENT` error (`EACCES`/`EIO`/`ELOOP`) is injected at the flow-state `lstat`, at its ancestor walk, at the review-root `lstat`, at the flow-state realpath stage, or at the review-root realpath stage
- THEN each one refuses as `io-error` with the original `e.code`, non-forceable — with and without a `mode:` line, because the mode decides nothing

#### Scenario: AM-108 a true ENOENT is benign
- WHEN `tasks.md` or `review/issues.md` genuinely does not exist
- THEN nothing is refused and nothing is `n/a` — neither file has a rule left to be absent from

#### Scenario: AM-115 an ENOENT raised at the realpath stage is not a structural defect either
- WHEN the `lstat` succeeds but the containment check's realpath reports `ENOENT` — for the flow-state, and separately for the review root
- THEN the flow-state case takes the ancestor walk and ends as `missing` (R1's own refusal, never an io-error), and the review-root case reports nothing, exactly as the earlier `lstat` ENOENT would have — the containment check has no third answer of its own

#### Scenario: AM-112 a completely normal bundle stays archivable
- WHEN `review/` is an ordinary directory holding one review round and the flow-state is at `phase: review`
- THEN readiness passes and the archive completes — a file-type rule applied to the review DIRECTORY would have failed every well-formed bundle

#### Scenario: AM-113 an absent review directory is not a structural defect
- WHEN `review/` does not exist at all
- THEN the review-root check reports nothing structural — R4 reports the missing round — and nothing is `n/a`

#### Scenario: AM-78 an unready change is refused with nothing written
- WHEN the flow-state is at the wrong phase, or `## Open` holds a pending item
- THEN archive prints `RESULT: NOT READY — nothing written`, exits 1, writes no store byte and moves no directory

#### Scenario: AM-79 R1 reports first and alone, the later rules report together
- WHEN a bundle fails R1 as well as R4 and R5
- THEN only the first R1 hit is reported; when R1 passes, every later blocker is listed in one report

#### Scenario: AM-80 abandoned and done carry their own wording
- WHEN `phase` is `abandoned`, or is `done`
- THEN the first cites the runbook's hard rule and the second reads `in-flight bundle declares done; archiving happens at 'phase: review'` — never claiming the change was already archived — and neither is forceable

#### Scenario: AM-81 a broken flow-state reports the C3 diagnosis, not the phase wording
- WHEN a bundle declares `abandoned` and also fails another C3 check (missing key, placeholder, name mismatch)
- THEN the C3 diagnosis is reported verbatim and the abandoned wording is not used

#### Scenario: AM-82 an absent artifact is not an obligation, and R5 is never forceable
- WHEN `tasks.md` and `review/issues.md` are absent, and then present with an unchecked box / a closed row (an `open` row is R1's one-shot migration refusal, not a readiness rule) — and separately when `## Open` holds a pending item beside an `archive-force ledger` record
- THEN the archive proceeds in the first four cases (neither file is read), and the pending item refuses with `--force` unable to buy it

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

### Requirement: an archive declares three states and nothing else
A ready `apriori archive --change <name>` SHALL print an `ARCHIVE DECLARES` block — in dry-run and with `--write` alike — carrying exactly three states derived from the bundle's own state THROUGH THE SAME readiness predicate the gate and review-ready use — never a second walk over the state, which is how the declaration and R5 came to disagree about one bundle: whether the IMPLEMENTATION is complete (the predicate's pending open items — an id-less item included — and standing assumptions make it incomplete, and are counted); whether the CRITICAL EVIDENCE is complete, which since 6.2 means no unaccepted open item — pending items counted, accepted ones named and reported as still present, a legacy `blocked` row named; and whether the change is RELEASED or still pending external acceptance (the state's `delivery:` key, defaulting to pending). It SHALL NOT introduce a new document or a fourth state, and the only file the archive adds to the bundle is its content manifest (`archive-manifest.json`, the manifest requirement) — never a declaration file. On the owner's closeout without a converged review (the archive-unreviewed requirement) the critical-evidence state SHALL also say `independent review: none`, `not converged`, `evidence incomplete` or `converged` with each family's last attributable round, and the owner's record and every waived demand SHALL follow as notes — still three states, never a fourth. The declaration SHALL ALSO be a BACKSTOP: a run whose declaration would read `implementation: INCOMPLETE` SHALL be refused with `RESULT: NOT READY — nothing written`, whatever readiness concluded — a successful archive can never declare its own work unfinished. The block SHALL say that the bundle is frozen and that a defect found later becomes a short outcome note or a NEW change — an archive is never rewritten to claim a completeness that did not exist at the time.

#### Scenario: AM-118 the archive declaration carries exactly the three states
- WHEN a ready change is archived, first with a clean state and then with a pending open item, an unverified assumption, an accepted open item and `delivery: released` in turn
- THEN the report carries an `ARCHIVE DECLARES` block with exactly the implementation / critical-evidence / delivery lines, each reflecting the state it was given, the frozen-snapshot sentence is present, and the declaration creates no file anywhere in the tree (the bundle's `archive-manifest.json` is written by the manifest requirement, not by the declaration; a dry-run creates nothing at all)

#### Scenario: AM-119 the archived bundle is frozen
- WHEN a change is archived with `--write --changes-dir`, and the archived record is then gated again
- THEN the whole bundle travelled as one unit (flow-state, `specs/`, `review/` and its `archive-manifest.json`) with nothing left at the in-flight path, and the later run reads the frozen record without modifying a byte of it

### Requirement: an archive carries a content manifest, written inside the transaction
On `--write`, after every preflight, readiness, declaration and drop-guard step has passed and BEFORE the first store byte is staged, `apriori archive --change <name>` SHALL write `archive-manifest.json` into the in-flight bundle: `{ "manifest": 1, "change": <name>, "stamp": <the archive stamp the move will use>, "files": { <relative path>: "sha256:<hex>" | "link:<target>" } }`, one entry per regular file under the bundle (the manifest itself excluded; content hashed as a stream, so review raws of any size are covered) and one `link:` entry per symbolic link (never followed, never hashed); directories are traversed, anything else is skipped. The write is exclusive and atomic within the bundle: the run creates a temporary file it alone owns (`wx`, so an existing entry at that name — a symlink included — fails instead of being followed or truncated), writes every byte through the descriptor (a short write is continued, zero progress is a failure — a truncated manifest is never published) and renames it onto `archive-manifest.json`; the rename replaces any occupant of the final name (a stale symlink included) with this regular file and never writes through it, and only the run's own temporary file is ever removed — every other occupant of the bundle is inventoried. The bundle root itself must be a real directory: a symbolic link at `changes/<name>` is refused before anything is written, so no alias can rewrite the baseline of an already archived bundle. If the manifest cannot be produced or written — a file vanishes between listing and hashing, an unreadable entry, a write failure — the run fails with exit 1 and NOTHING has been written to the store, so no state exists in which stores were rewritten but the archive lacks its manifest. The manifest then travels with the bundle in the existing move; a rerun after a failed move recomputes and overwrites it. Dry-run writes no manifest and prints how many entries it would list. The manifest is never rebuilt, rewritten or deleted for a bundle that is already under `archive/`; the existing destination-conflict behaviour is unchanged. `status` is untouched. On the owner's closeout without a converged review (the archive-unreviewed requirement) the manifest SHALL also carry a `review` key — `{ "independentReview": "none" | "not converged" | "evidence incomplete" | "converged", "rounds": [...], "decision": <the owner's record>, "waived": [...] }` — and a normal archive SHALL carry none, keeping the shape above.

#### Scenario: AM-128 the manifest lists the bundle and travels with it
- WHEN a ready bundle with nested review, requirement and spec files (including an empty file and a path with spaces and unicode) is archived with `--write`
- THEN `archive/<stamp>-<name>/archive-manifest.json` exists, its `stamp` equals the directory's stamp and its `change` the name, `files` carries every regular file's relative path with the sha256 of its content, excludes `archive-manifest.json` itself, and the report carries one line naming the manifest and its entry count; a dry-run of the same bundle writes no manifest and only reports the count

#### Scenario: AM-129 a manifest failure leaves the store untouched
- WHEN producing the manifest fails — the injected hash reader throws for one file, and separately the injected write of the manifest fails
- THEN the run exits 1 naming the manifest, no store file is rewritten, no temp store file remains, the bundle stays in flight and intact, and a rerun with the fault removed archives normally

#### Scenario: AM-130 a rerun after a failed move recomputes the manifest
- WHEN the store commit succeeds but the move is made to fail, an inventoried file is then changed, and the run is repeated without the fault
- THEN the archived bundle carries exactly one manifest whose entries match the bundle's final content — the changed file's new hash included, so the second run demonstrably recomputed rather than reused the first manifest (which is never listed in itself)

#### Scenario: AM-132 publication is exclusive and replaces, never follows, an occupant
- WHEN a symbolic link named `archive-manifest.json` pointing at a store file sits in the bundle, and separately a directory occupies that name
- THEN the first archives with the store file byte-identical and the archived manifest a regular file; the second fails the run naming the manifest with the store untouched, no temp left behind and the bundle intact, and archives normally once the occupant is removed

#### Scenario: AM-135 a short write never publishes a truncated manifest
- WHEN the descriptor accepts only part of the manifest and then fails, separately accepts it in small pieces, and separately makes no progress at all
- THEN the first fails the run naming the manifest with the store untouched, no manifest published and the run's temp removed; the second publishes a complete manifest that parses and matches the bundle; the third fails as a short write instead of spinning

#### Scenario: AM-133 a symlinked bundle root is refused and an archived baseline stays intact
- WHEN `changes/<name>` is a symbolic link to an already archived bundle that carries a manifest
- THEN `archive --write` refuses before writing anything, naming the link, and the archived manifest is byte-for-byte unchanged

#### Scenario: AM-134 prototype-named files are files
- WHEN the bundle holds regular files named `__proto__`, `constructor` and `toString`
- THEN all three are listed in the manifest with their hashes

#### Scenario: AM-131 links are recorded, never followed
- WHEN the bundle contains a symbolic link (to a file inside and, separately, to a file outside the bundle) beside regular files
- THEN the manifest records the link as `link:<target>` without hashing or following it, the regular files are hashed as usual, and the run succeeds

## Notes

Real projects left most delivered changes unarchived (23 of 25 in-flight bundles across two projects on 2026-10-20): the work had shipped, nobody closed the process, and the only exit that needed no review — abandonment — writes nothing to the store and calls a delivered change abandoned. This adds the owner's own exit for that case. It keeps every guarantee that does not depend on the review (open items, state legality, structure, CAS) and states in the declaration, the manifest and `check` that the review is missing; it does not make a missing review acceptable on the normal path, and `--force` still cannot buy one. The three MODIFIED requirements each gain one sentence naming the relaxation; nothing else in them changes.
