<!-- apriori-base: sha256:144f61120e657805477b58d93f11153127d141747be9c13d367eabda4323ca4c -->
# Delta — readiness (scope-disposition)

## MODIFIED Requirements

### Requirement: the readiness rules ask for facts, not for a document family
Readiness SHALL NOT demand `tasks.md`, `requirement/`, a proposal, a design doc, a gap report or an issue ledger. Rule R2 (the task list) and rule R3 (the ledger) SHALL NOT exist: neither `tasks.md` nor `review/issues.md` is opened, and nothing in them blocks or is reported. The review ROOT is still guarded — a symlinked, escaping or non-directory `review/` is a structural R4 refusal, never forceable — and an absent `review/` is not a defect. No ledger state SHALL soften the review floor: the reviewer's latest verdict is what must close. Rule R5 SHALL be the ONE substantive state predicate, evaluated on the same input gate's C9 receives (the delta scan) and never forceable — and since scope-disposition its pending set excludes a registered FOLLOW-UP item (`- <ID>: follow-up → <new-change-name> — <text>`, a valid other change name), which R5 reports as a note, never a blocker; the predicate's notes (the open-item summary, an unmatched acceptance, the `contract-mutation` signal, an ignored legacy section) SHALL be printed as archive notes. `mode:` SHALL be optional and inert: readiness neither decides nor reports anything by it.

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
EVERY owner decision in the `gates:` log — the open-item acceptance, the (inert) `archive-force` record, and the loop's `reframe` — SHALL be recognised through ONE canonical-entry parser, so no verb can be more forgiving than its neighbours: a real, range-checked `YYYY-MM-DDTHH:MM` timestamp, the actor spelled exactly `owner`, the lowercase verb OPENING the decision payload, the target matched whole (`ledger`; an item id, case-sensitively; a family AND its round together), an em dash, and a reason carrying a letter or digit in any script. `producer:`, `note:`, `agent:` and the retired `gate⑤ (owner):` prefix SHALL authorize none of them. The last decision for a target SHALL win, `gates:` being append-only. A delta the scan could not read SHALL be fail-closed and incurable by any item or acceptance; a mutating delta SHALL be reported as the `contract-mutation` signal and demand nothing. The state's own claims — an open item (a registered FOLLOW-UP excepted: since scope-disposition `- <ID>: follow-up → <new-change-name> — <text>`, landing on a valid other change, is a note, never a blocker), a standing `assumption`, a Reality Check line naming no kind — SHALL block the gate and the archive (and, except for a pending id'd item, `--review-ready`), read VERBATIM: no text heuristic SHALL decide which of them are real, because prose carries angle brackets (`Map<Key>`, `List<T>`). There SHALL be no scaffold exemption: `apriori new` writes bare headings, so there is no unfilled row to skip. A `## Next` list longer than three SHALL only be reported.

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
- THEN each of the four refuses at C9 and at archive (which declares nothing when it refuses); all but the pending item also refuse `--review-ready` with C9's own wording, the pending item being what the review is for; and the long `## Next` list gates green while `status` reports the cap

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

## ADDED Requirements

### Requirement: a follow-up item is registered with its landing spot and never blocks
The state predicate (`evidenceFindings`, read by gate C9, archive R5, the archive declaration and `status`) SHALL recognise an `## Open` item of the exact form `- <ID>: follow-up → <new-change-name> — <text>` (arrow `→` or `->`; the landing spot a bare kebab-case change name that passes `validateChangeName` — no date prefix, not a reserved name — and is not this change's own name as the canonical flow-state parser reads it (a `change:` inside a fence or an HTML comment is inert); an em dash; a text carrying a letter or digit) as a FOLLOW-UP: a new ask this delivery does not depend on, registered with the change that will carry it. A follow-up SHALL be reported as a note `follow-up <ID> → <name>: <text> (registered, not a blocker; moving it out is not closing it)` and SHALL raise no blocker; the archive declaration SHALL count it as `follow-up(s) registered` under critical evidence and not as pending, so the implementation reads `complete`; `status` SHALL mark it `[follow-up → <name>]` in text and carry `followUp: <name>` (`null` on every other item) in `--json`. Anything that does not match the grammar exactly — no landing spot, a landing spot that is not a valid other change name (`bad--name`, a reserved name such as `archive`, a date-prefixed `2026-09-next`, the change itself), no text — SHALL remain an ordinary pending item that blocks, and the pending cure SHALL name the follow-up form beside the two existing exits. Owner acceptance (`evidence-accept <ID>`) of a follow-up item keeps working and is reported as accepted.

#### Scenario: RY-32 a follow-up item is a note for C9, R5, the declaration and status
- WHEN a ready change carries `- F-01: follow-up → punctuation-policy — a pluggable punctuation policy object` in `## Open`
- THEN `readinessOf` reports no R5 blocker and a note naming `F-01 → punctuation-policy`; gate C9 passes with `1 follow-up(s) registered (F-01 → punctuation-policy)` in its detail; `apriori archive` merges and declares `implementation: complete` with `critical evidence: complete, 1 follow-up(s) registered (F-01 → punctuation-policy)`; `status` prints `open: [follow-up → punctuation-policy] F-01: …` and `--json` carries `followUp: 'punctuation-policy'`

#### Scenario: RY-33 the grammar is exact — a malformed follow-up stays pending and blocks
- WHEN the item reads `- F-02: follow-up → — no landing`, `- F-03: follow-up → Bad_Name — x`, `- F-04: follow-up → later —` (no text), `- F-05: follow up → later — x` (no hyphen), `- F-06: later as a follow-up — x`, `- F-07: follow-up → bad--name — x`, `- F-08: follow-up → archive — x`, `- F-09: follow-up → 2026-09-next — x`, or `- F-10: follow-up → c — x` (the change's own name); and separately when a closed fenced example `change: example` (or an HTML comment) precedes the live `change: c` line while `- F-1: follow-up → c — x` is listed, and when such an inert example names `valid-next` while a real `- F-2: follow-up → valid-next — x` is listed
- THEN each is an ordinary pending item (the self-name read through the canonical parser, so the fenced/commented `change: example` changes nothing and F-1 still blocks, while F-2 still registers): R5 blocks it, the cure names the exact follow-up form (`- F-0n: follow-up → <new-change-name> — <the ask, in one line>`) beside closing the line and the owner's decision, C9 is blocked, `archive` refuses `NOT READY`; and an owner `evidence-accept F-01` over a well-formed follow-up reports it accepted, not as a follow-up note
