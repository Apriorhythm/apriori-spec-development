### Requirement: one implementation of the readiness predicates, two layers of responsibility
`lib/readiness.js` SHALL hold the single implementation of the flow-state, ledger and evidence predicates. Its BASE layer is what `gate` consumes rather than keeping its own copy. Its ARCHIVE layer is a SEPARATE set of functions written for a caller that performs an irreversible write: they classify `lstat`/`realpath` failures by `e.code` in a single pass and never call a helper that swallows exceptions. The two layers exist because `fileReadDefect`, `reviewDirDefect` and `containsReal` all swallow errors into a default — correct for callers that only report (gate, status, resolve), unsound for a caller that writes. The module SHALL NOT depend on `archive-merge`.

#### Scenario: RY-01 the base predicates are what the gate reports
- WHEN a bundle is fed to the base layer and to the gate
- THEN the gate's C2, C3, C4 and C9 rows are the base layer's own return values, asserted differentially rather than restated in prose

#### Scenario: RY-03 the archiving phase is an overlay on C3, not a replacement
- WHEN a flow-state fails a C3 check
- THEN the C3 diagnosis is what surfaces; the phase wording appears only once the rest of C3 has passed

#### Scenario: RY-04 archive readiness is strictly stronger than the gate's C3
- WHEN a bundle sits at any legal phase other than `review`
- THEN archive is not ready while the gate's C3 still passes — `archive ready` implies `gate C3 pass`, never the converse

#### Scenario: RY-05 no layer reaches back into its caller
- WHEN the modules are inspected statically
- THEN `archive-merge.js` contains no `require('./gate')`, `gate.js` does not reimplement the three predicates, and `gate.js` still exports `classifyStatus` for the corpus test that depends on it

#### Scenario: RY-06 the base layer stays bare
- WHEN the base layer is inspected
- THEN it contains no `fileReadDefect` call — adding a guard there would change what the gate reports without changing what the archive layer decides

#### Scenario: RY-07 the base layer takes its containment check from resolve
- WHEN `reviewDirDefect` runs against a normal directory, a symlink, a non-directory, an escaping path and an absent path
- THEN the results match state A even though the containment helper now comes from `resolve` rather than `archive-merge` — the two differ only when target equals root, and this call site's target is always `<dir>/review`

#### Scenario: RY-08 the archive artifact check matches state A everywhere state A has an answer
- WHEN `artifactDefect` is compared against `resolve.fileReadDefect` on a clean file, a symlink, a non-file, an escaping path, a bad ancestor and a genuine absence
- THEN all six agree; `io-error` is the seventh outcome, one state A cannot produce

#### Scenario: RY-09 the archive review-root check matches the gate's, absence included
- WHEN `reviewRootDefect` is compared against the gate's `reviewDirDefect` on a clean directory, an ABSENT directory, a symlink, a non-directory and an escaping path
- THEN all five agree — the absent case returning nothing is the one that keeps a missing `review/` flowing to the ledger leaf instead of becoming a new failure class

#### Scenario: RY-10 the archive layer owns its error semantics end to end
- WHEN `artifactDefect`, `reviewRootDefect` and `containDefect` are inspected statically
- THEN none of them mentions `fileReadDefect`, the base `reviewDirDefect`, or `containsReal` — a second call into a swallowing helper would reopen the very window this layer exists to close

#### Scenario: RY-11 the readiness entry point reuses the overlay rather than restating it
- WHEN `readinessOf` is inspected statically
- THEN its R1 stage calls `phaseOverlay` and does not restate the `phase === 'review'` comparison — a restated copy would let the phase acceptance pass a batch before the production path that enforces it exists

#### Scenario: RY-12 a non-ENOENT beats a co-occurring ENOENT
- WHEN the containment check's two realpath calls fail with different codes — one absent, one denied
- THEN both calls are still attempted and the answer is the io-error, because letting the absence win would hand a permission failure to the leaf rule and archive an unread bundle

#### Scenario: RY-13 the ancestor walk classifies its own failures
- WHEN a non-ENOENT error is raised while walking up from an absent artifact toward the bundle root
- THEN it surfaces as io-error with its code rather than being swallowed as "keep walking", which is what state A does and why state A ends at `missing` here

#### Scenario: RY-14 the review root's own guard failures are classified, and ENOENT stays benign
- WHEN the review root's lstat or realpath fails
- THEN a non-ENOENT is io-error while an unresolvable path answers exactly as an absent directory does — the ledger leaf still decides, and no new failure class is introduced

#### Scenario: RY-15 the structural set is closed and gate is untouched by it
- WHEN the kinds the archive layer can return are enumerated
- THEN every one except `missing` is structural and therefore never forceable, and none of this reaches the gate

### Requirement: the readiness rules ask for facts, not for a document family
Readiness SHALL NOT demand `tasks.md`, `requirement/`, a proposal, a design doc, a gap report or an issue ledger, in either mode. Rule R2 (the task list) SHALL NOT exist. Rule R3 SHALL treat an absent ledger as `n/a` and, when a ledger is present, SHALL block on `open` rows alone — an unknown status token, a reasonless rejection, an unrecorded waive and an archive-time non-terminal row are reported as bookkeeping notes and never refuse a write. No ledger state — absent, empty or fully closed — SHALL soften the review floor: the reviewer's latest verdict is what must close, and a file the producer edits may not outrank it. Rule R5 SHALL be the ONE substantive evidence predicate, evaluated on the same two inputs gate's C9 receives (the delta scan and the effective mode) and never forceable. Owner acceptance SHALL NOT change the change's mode.

#### Scenario: RY-16 no rule asks for a task list
- WHEN a bundle carries no `tasks.md`, or carries one with unchecked boxes
- THEN readiness returns no R2 rule at all and the archive proceeds on its other rules; the gate reports the legacy file as a C2 diagnostic that can never block

#### Scenario: RY-17 the ledger blocks on open findings and reports the rest
- WHEN a bundle's ledger holds an `open` row, and separately when it holds only bookkeeping defects (an illegal status, a reasonless rejection, an unrecorded waive, a `fixed` row at the archived stage)
- THEN the first refuses as an R3 progress blocker while the second archives, its defects printed as non-blocking notes

#### Scenario: RY-18 blocked critical evidence refuses, and only the owner opens it
- WHEN the state declares `- <risk>: blocked — <why>` with no owner decision, then the same row as `owner-accepted` with no `gates:` entry, then `owner-accepted` with the canonical `gates:` entry accepting it
- THEN the first two refuse as R5 (and gate C9) and the third passes, with `--force` unable to substitute for the owner's decision in any of them

#### Scenario: RY-19 owner acceptance buys evidence, never a softer mode
- WHEN a standard change records an owner-accepted evidence row
- THEN its declared and effective mode are still `standard` everywhere — acceptance settles one risk, it never reclassifies the change

#### Scenario: RY-20 a change with no document family passes, archives and declares
- WHEN a `standard` change carries only `flow-state.md`, `specs/` and `review/` — no task list, no ledger, no requirement doc, no proposal, no design doc, no gap report — with its evidence rows filled in and one attributable review round
- THEN `gate` reports PASS, `--review-ready` exits 0, and `archive --write` merges and prints its three-state declaration

#### Scenario: RY-21 legacy residue is diagnosed, and a 5.x identity key still refuses
- WHEN a bundle carries a 5.x `tasks.md` with unchecked boxes and a ledger full of bookkeeping defects, and then additionally spells `current-step:`
- THEN the first gates green with both files named as diagnostics, while the second is refused at C3 with the key named and a MIGRATING.md pointer — residue is reported, identity is refused

### Requirement: the §6 exits are closed, and a check that could not be made never reads as no risk
EVERY owner decision in the `gates:` log — the §6 evidence acceptance, the `archive-force` progress override, and the loop's `reframe` — SHALL be recognised through ONE canonical-entry parser, so no verb can be more forgiving than its neighbours: a real, range-checked `YYYY-MM-DDTHH:MM` timestamp, the actor spelled exactly `owner`, the lowercase verb OPENING the decision payload, the target matched whole (`ledger`; a row id, case-sensitively; a family AND its round together), an em dash, and a reason carrying a letter or digit in any script. `producer:`, `note:`, `agent:` and the retired `gate⑤ (owner):` prefix SHALL authorize none of them. The last decision for a target SHALL win, `gates:` being append-only. What the CLI PROVED about the delta SHALL be answered by name: a mutating delta demands a `contract-mutation` row that is `done` or canonically owner-accepted, and a delta the scan could not read SHALL be fail-closed and incurable by any row. A `standard` change SHALL owe one substantive row that is not `producer-diff`; a `fast` change with no machine risk MAY answer with the binding run plus `producer-diff`. The state's own claims — an `## Open` item, a standing `assumption`, a Reality Check line naming no kind — SHALL block review-ready and archive alike, read VERBATIM: no text heuristic SHALL decide which of them are real, because prose carries angle brackets (`Map<Key>`, `List<T>`) and a heuristic over them deletes exactly the claims a project writes. The ONE exemption is an unfilled scaffold ROW in `## Evidence`, recognised by a FIELD being literally the scaffold's own `<…>` token — its risk name, or its status. A `## Next` list longer than three SHALL only be reported.

#### Scenario: RY-22 the owner's evidence exit has one grammar and every near miss is refused
- WHEN the `gates:` log carries, in place of the canonical entry, a `producer:` / `note:` / `agent:` / `gate⑤ (owner):` actor, no timestamp, a timestamp-shaped non-timestamp, no em dash, a hyphen or en dash, an empty or punctuation-only reason, the keyword preceded by prose or negated, an uppercase keyword, a superstring or differently-cased row id, or generic accept prose
- THEN none of them authorizes the row, the refusal names the canonical template, and only the canonical entry opens it — with a later revoke closing it again and the last decision winning

#### Scenario: RY-23 a proven contract mutation is answered by name or nothing ships
- WHEN a change's delta mutates a published requirement and the state answers with no `contract-mutation` row, with `n/a`, with `blocked`, or with an `owner-accepted` row no `gates:` entry records
- THEN gate C9 and archive R5 both refuse and `--force` reaches none of it; a `done` row or a canonically accepted one passes; and this holds whether the change DECLARED `fast` or `standard`, because the signals come from the scan rather than from the mode derivation

#### Scenario: RY-24 fast is the binding run plus a read diff, and standard owes one substantive row
- WHEN a `fast` change with no machine risk declares only `producer-diff: done`, and when a `standard` change declares only that, or adds only `n/a` rows, a `blocked` row, or an unrecorded `owner-accepted` row
- THEN the fast change gates green, is review-ready and archives, while every standard case is refused until one substantive non-`producer-diff` row is really settled

#### Scenario: RY-25 an unreadable delta is fail-closed and no evidence row cures it
- WHEN `specs/` does not resolve, resolves outside the bundle, or a delta file escapes it — while every evidence row reads `done` and the owner has recorded an acceptance aimed at the signal itself
- THEN R5 still refuses, non-forceably, and neither the gate nor the archive reaches a success: a scan that could not rule the risk out never reads as "no risk found"

#### Scenario: RY-26 the legacy ledger blocks on a real open row and outranks nothing
- WHEN a kept ledger holds a row whose status opens with `open`, and separately when an absent, empty or fully-verified ledger sits beside a review family whose LATEST verdict is `revise` or `escalate`
- THEN the first is the single R3 progress blocker (forceable on the owner's record) while every other status is bookkeeping, and no ledger state closes the review floor

#### Scenario: RY-27 the state's own claims block, and the Next cap only reports
- WHEN the state carries an `## Open` item, a standing `assumption`, or a Reality Check line naming no kind, and separately when it lists more than three `## Next` actions
- THEN the first three refuse at C9, at `--review-ready` and at archive (which declares nothing when it refuses), and the long `## Next` list gates green while `status` reports the cap

#### Scenario: RY-28 the owner's exit is spent in the state, at both surfaces
- WHEN a `blocked` evidence row is paired with a self-authorized `producer:` entry and `--force`, and then with the owner's own canonical entry and the row flipped to `owner-accepted`
- THEN the first is refused by gate C9 and by a non-forceable archive R5, the second gates green and archives, and the frozen declaration NAMES the accepted risk

#### Scenario: RY-29 the three owner decisions read one canonical entry, and no verb is looser
- WHEN the same table of near misses — a `producer:` / `note:` / `agent:` / `gate⑤ (owner):` / `ownership:` actor, no timestamp, a timestamp-shaped non-timestamp, a verb preceded by prose or negated, a missing em dash, a hyphen in its place, an empty or punctuation-only reason, a near-miss target, and the entry placed outside the `gates:` block — is applied in turn to `evidence-accept`, to `archive-force` and to `reframe`
- THEN each verb's canonical entry authorizes and every near miss authorizes nothing, in all three; and `gatesEntriesRaw` hands every consumer the same payload or `null`, so the actor test is made once rather than three times

#### Scenario: RY-31 a claim carrying angle brackets is a claim, and only a scaffold field is unfilled
- WHEN an `## Open` item, an `assumption`, a kind-less Reality Check line or an `## Evidence` detail contains `Map<Key>` or `List<T>`, and separately when an `## Evidence` row still carries the scaffold's own token as its risk name or as its status
- THEN every claim is read verbatim and blocks, while only the two scaffold-FIELD rows are skipped as unfilled — the row count is zero and the state is told it has answered nothing

#### Scenario: RY-32 the scaffold path runs end to end
- WHEN `apriori new <name>` scaffolds a change, its delta is written, and only the fields the scaffold asks for are filled in (mode, lineage, phase, the `producer-diff` row) with one attributable review round landed
- THEN the scaffolded bundle states no claim nobody made (bare `## Open` and `## Reality Check` headings, one unfilled `## Evidence` row) and is refused by `--review-ready`; after filling in, `gate` PASSes, `--review-ready` exits 0, and `archive --write` merges and declares implementation and critical evidence complete
