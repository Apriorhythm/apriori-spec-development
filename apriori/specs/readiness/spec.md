### Requirement: one implementation of the readiness predicates, two layers of responsibility
`lib/readiness.js` SHALL hold the single implementation of the flow-state and open-item predicates. Its BASE layer is what `gate` consumes rather than keeping its own copy. Its ARCHIVE layer is a SEPARATE set of functions written for a caller that performs an irreversible write: they classify `lstat`/`realpath` failures by `e.code` in a single pass and never call a helper that swallows exceptions. The two layers exist because `fileReadDefect`, `reviewDirDefect` and `containsReal` all swallow errors into a default — correct for callers that only report (gate, status, resolve), unsound for a caller that writes. The module SHALL NOT depend on `archive-merge`.

#### Scenario: RY-01 the base predicates are what the gate reports
- WHEN a bundle is fed to the base layer and to the gate
- THEN the gate's C3 and C9 rows are the base layer's own return values and its C2 and C4 rows are the fixed 6.2 placeholders, asserted differentially rather than restated in prose

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
- THEN all five agree — the absent case returning nothing is the one that keeps a missing `review/` flowing to R4's review floor instead of becoming a new failure class

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
- THEN a non-ENOENT is io-error while an unresolvable path answers exactly as an absent directory does — R4 still decides, and no new failure class is introduced

#### Scenario: RY-15 the structural set is closed and gate is untouched by it
- WHEN the kinds the archive layer can return are enumerated
- THEN every one except `missing` is structural and therefore never forceable, and none of this reaches the gate

### Requirement: the readiness rules ask for facts, not for a document family
Readiness SHALL NOT demand `tasks.md`, `requirement/`, a proposal, a design doc, a gap report or an issue ledger. Rule R2 (the task list) and rule R3 (the ledger) SHALL NOT exist: neither `tasks.md` nor `review/issues.md` is opened, and nothing in them blocks or is reported. The review ROOT is still guarded — a symlinked, escaping or non-directory `review/` is a structural R4 refusal, never forceable — and an absent `review/` is not a defect. No ledger state SHALL soften the review floor: the reviewer's latest verdict is what must close. Rule R5 SHALL be the ONE substantive state predicate, evaluated on the same input gate's C9 receives (the delta scan) and never forceable; the predicate's notes (the open-item summary, an unmatched acceptance, the `contract-mutation` signal, an ignored legacy section) SHALL be printed as archive notes. `mode:` SHALL be optional and inert: readiness neither decides nor reports anything by it.

#### Scenario: RY-16 no rule reads a task list, present or absent
- WHEN a bundle carries no `tasks.md`, or carries one with unchecked boxes
- THEN readiness returns no R2 rule at all and the archive proceeds on its other rules; the gate's C2 is the 6.2 placeholder and says nothing about the file

#### Scenario: RY-17 the ledger is never read: an open row neither blocks nor is reported
- WHEN a bundle's ledger holds an `open` row, or any other status word
- THEN readiness is ready with no R3 rule, no note and nothing `n/a`; the archive merges without naming the row; gate C4 is the 6.2 placeholder; and `status --json`'s `openLedger` stays `[]`

#### Scenario: RY-18 a pending open item refuses, and only the owner opens it
- WHEN the state carries a pending `- <ID>: <text>` item with no owner decision, then the same item with a `producer:` entry, then with the canonical `gates:` entry accepting it
- THEN the first two refuse as R5 (and gate C9) and the third passes, with `--force` unable to substitute for the owner's decision in any of them

#### Scenario: RY-19 owner acceptance settles one item and never touches the inert mode
- WHEN a change records an accepted open item, with no `mode:` line, with `fast` and with `standard`
- THEN `status --json` reports `mode` as declared (or `null`) and `effectiveMode` equal to it in every case — acceptance settles one item, and `risk.effectiveMode` no longer exists

#### Scenario: RY-20 a change with no document family passes, archives and declares
- WHEN a change carries only `flow-state.md`, `specs/` and `review/` — no task list, no ledger, no `mode:` line, an empty `## Open` — with one attributable review round
- THEN `gate` reports PASS, `--review-ready` exits 0, and `archive --write` merges and prints its three-state declaration

#### Scenario: RY-21 legacy residue is inert, and a 5.x identity key still refuses
- WHEN a bundle carries a 5.x `tasks.md` with unchecked boxes and a ledger with an open row, and then additionally spells `current-step:`
- THEN the first gates green with C2/C4 as placeholders and nothing from the unread files in the report, while the second is refused at C3 with the key named and a MIGRATING.md pointer — residue is inert, identity is refused

### Requirement: the acceptance exit is closed, and a check that could not be made never reads as no risk
EVERY owner decision in the `gates:` log — the open-item acceptance, the (inert) `archive-force` record, and the loop's `reframe` — SHALL be recognised through ONE canonical-entry parser, so no verb can be more forgiving than its neighbours: a real, range-checked `YYYY-MM-DDTHH:MM` timestamp, the actor spelled exactly `owner`, the lowercase verb OPENING the decision payload, the target matched whole (`ledger`; an item id, case-sensitively; a family AND its round together), an em dash, and a reason carrying a letter or digit in any script. `producer:`, `note:`, `agent:` and the retired `gate⑤ (owner):` prefix SHALL authorize none of them. The last decision for a target SHALL win, `gates:` being append-only. A delta the scan could not read SHALL be fail-closed and incurable by any item or acceptance; a mutating delta SHALL be reported as the `contract-mutation` signal and demand nothing. The state's own claims — an open item, a standing `assumption`, a Reality Check line naming no kind — SHALL block the gate and the archive, read VERBATIM: no text heuristic SHALL decide which of them are real, because prose carries angle brackets (`Map<Key>`, `List<T>`). There SHALL be no scaffold exemption: `apriori new` writes bare headings, so there is no unfilled row to skip. A `## Next` list longer than three SHALL only be reported.

#### Scenario: RY-22 the owner acceptance exit has one grammar and every near miss is refused
- WHEN the `gates:` log carries, in place of the canonical entry, a `producer:` / `note:` / `agent:` / `gate⑤ (owner):` actor, no timestamp, a timestamp-shaped non-timestamp, no em dash, a hyphen or en dash, an empty or punctuation-only reason, the keyword preceded by prose or negated, an uppercase keyword, a superstring or differently-cased item id, or generic accept prose
- THEN none of them accepts the item, which stays pending, and only the canonical entry opens it — with a later revoke closing it again and the last decision winning

#### Scenario: RY-23 a proven contract mutation is reported as a signal and demands no reserved row
- WHEN a change's delta mutates a published requirement, with no `mode:` line, with `fast` and with `standard`
- THEN the scan sees it, gate C9 passes with the note `risk: contract-mutation: …`, R5 raises nothing, the archive merges, `status` carries it in `risk[]`, no upgrade is announced anywhere, and an open item spelled `contract-mutation` is just an item — pending until accepted, like any other

#### Scenario: RY-25 an unreadable delta is fail-closed and no open item or acceptance cures it
- WHEN `specs/` does not resolve, resolves outside the bundle, or a delta file escapes it — while `## Open` is empty and the owner has recorded an acceptance aimed at the signal itself
- THEN R5 still refuses, non-forceably, and neither the gate nor the archive reaches a success: a scan that could not rule the risk out never reads as "no risk found"

#### Scenario: RY-26 the legacy ledger is never read, and no ledger state closes the review floor
- WHEN a kept ledger holds a row of any status, and separately when an absent, empty or fully-verified ledger sits beside a review family whose LATEST verdict is `revise` or `escalate`
- THEN readiness raises no R3 rule and no note for any row, and no ledger state closes the review floor — an accepting latest verdict is what closes it

#### Scenario: RY-27 the state's own claims block, and the Next cap only reports
- WHEN the state carries an id-less open item, a pending id'd item, a standing `assumption`, or a Reality Check line naming no kind, and separately when it lists more than three `## Next` actions
- THEN each of the four refuses at C9 and at archive (which declares nothing when it refuses); only the id-less item also refuses `--review-ready`, the pending item being what the review is for; and the long `## Next` list gates green while `status` reports the cap

#### Scenario: RY-28 the owner's exit is spent in the state, at both surfaces
- WHEN a pending item is paired with a self-authorized `producer:` entry and `--force`, and then with the owner's own canonical entry
- THEN the first is refused by gate C9 and by a non-forceable archive R5, the second gates green and archives, and the frozen declaration NAMES the accepted risk as still present

#### Scenario: RY-29 the three owner decisions read one canonical entry, and no verb is looser
- WHEN the same table of near misses — a `producer:` / `note:` / `agent:` / `gate⑤ (owner):` / `ownership:` actor, no timestamp, a timestamp-shaped non-timestamp, a verb preceded by prose or negated, a missing em dash, a hyphen in its place, an empty or punctuation-only reason, a near-miss target, and the entry placed outside the `gates:` block — is applied in turn to `evidence-accept`, to `archive-force` and to `reframe`
- THEN each verb's canonical entry authorizes and every near miss authorizes nothing, in all three; and `gatesEntriesRaw` hands every consumer the same payload or `null`, so the actor test is made once rather than three times

#### Scenario: RY-31 a claim carrying angle brackets is a claim, and nothing is filtered as a scaffold
- WHEN an open item (id'd or not), an `assumption` or a kind-less Reality Check line contains `Map<Key>` or `List<T>`, and separately when an open item is the literal `<ID>: <text>`
- THEN every claim is read verbatim and blocks (an accepted item carrying generics is a real, accepted item), and the scaffold-looking line is an item like any other — pending until accepted

#### Scenario: OI-07 `apriori new` scaffolds no mode line and no Evidence section; Open shows the id form
- WHEN `apriori new <name>` scaffolds a change, its delta is written, and only `lineage` and `phase` are filled in with one attributable review round landed
- THEN the scaffold carries no `mode:` line and no `## Evidence` section, its `## Open` heading comment shows `- <ID>: <text>`, the epilogue asks for lineage only, the unfilled lineage still blocks C3, and after filling in, `gate` PASSes, `--review-ready` exits 0, and `archive --write` merges and declares implementation and critical evidence complete

#### Scenario: OI-06 mode is optional and inert
- WHEN the flow-state carries no `mode:` line, an empty one, `fast`, `standard`, the unfilled `<fast | standard>` placeholder, and a value outside the vocabulary — each beside a mutating delta
- THEN C3 passes the first four (`legal (<phase>)` / `legal (mode <m>, <phase>)`) and blocks the last two; no surface announces an upgrade; the mutation is the `contract-mutation` signal; and `status --json` reports `effectiveMode` equal to `mode` (or `null`)
