<!-- apriori-base: sha256:8ce68cb703438bb40d1b21bd4e4be7bfae99e12ff1fadd733c4d97a3ed4fe422 -->
# Delta — readiness (protocol-text-consistency)

## MODIFIED Requirements

### Requirement: the readiness rules ask for facts, not for a document family
Readiness SHALL NOT demand `tasks.md`, `requirement/`, a proposal, a design doc, a gap report or an issue ledger. Rule R2 (the task list) and rule R3 (the ledger) SHALL NOT exist: `tasks.md` is never opened, and `review/issues.md` is read by exactly one thing — C3's one-shot legacy migration (LM-01), which refuses a still-`open` row so it can be moved to `## Open` — and otherwise nothing in it blocks or is reported. The review ROOT is still guarded — a symlinked, escaping or non-directory `review/` is a structural R4 refusal, never forceable — and an absent `review/` is not a defect. No ledger state SHALL soften the review floor: the reviewer's latest verdict is what must close. Rule R5 SHALL be the ONE substantive state predicate, evaluated on the same input gate's C9 receives (the delta scan) and never forceable — and since scope-disposition its pending set excludes a registered FOLLOW-UP item (`- <ID>: follow-up → <new-change-name> — <text>`, a valid other change name), which R5 reports as a note, never a blocker; the predicate's notes (the open-item summary, an unmatched acceptance, the `contract-mutation` signal, an ignored legacy section) SHALL be printed as archive notes. `mode:` SHALL be optional and inert: readiness neither decides nor reports anything by it.

#### Scenario: RY-16 no rule reads a task list, present or absent
- WHEN a bundle carries no `tasks.md`, or carries one with unchecked boxes
- THEN readiness returns no R2 rule at all and the archive proceeds on its other rules; the gate's C2 is the 6.2 placeholder and says nothing about the file

#### Scenario: RY-17 the ledger has no rule of its own: a closed or unknown row neither blocks nor is reported
- WHEN a bundle's ledger holds a `closed` row, or any status word other than `open`
- THEN readiness is ready with no R3 rule, no note and nothing `n/a`; the archive merges without naming the row; gate C4 is the 6.2 placeholder; and `status --json`'s `openLedger` stays `[]` — an `open` row is C3's migration refusal (LM-01), never a retired R3

#### Scenario: RY-18 a pending open item refuses, and only the owner opens it
- WHEN the state carries a pending `- <ID>: <text>` item with no owner decision, then the same item with a `producer:` entry, then with the canonical `gates:` entry accepting it
- THEN the first two refuse as R5 (and gate C9) and the third passes, with `--force` unable to substitute for the owner's decision in any of them

#### Scenario: RY-19 owner acceptance settles one item and never touches the inert mode
- WHEN a change records an accepted open item, with no `mode:` line, with `fast` and with `standard`
- THEN `status --json` reports `mode` as declared (or `null`) and `effectiveMode` equal to it in every case — acceptance settles one item, and `risk.effectiveMode` no longer exists

#### Scenario: RY-20 a change with no document family passes, archives and declares
- WHEN a change carries only `flow-state.md`, `specs/` and `review/` — no task list, no ledger, no `mode:` line, an empty `## Open` — with one attributable review round
- THEN `gate` reports PASS, `--review-ready` exits 0, and `archive --write` merges and prints its three-state declaration

#### Scenario: RY-21 legacy residue is inert once migrated, and a 5.x identity key still refuses
- WHEN a bundle carries a 5.x `tasks.md` with unchecked boxes and a ledger with an `open` row, then the same bundle with that row moved out (an unknown-status row left behind), and then additionally spells `current-step:`
- THEN the first is refused at C3 by the migration (LM-01) naming the row and its line, the second gates green with C2/C4 as placeholders and nothing from the unread files in the report, and the third is refused at C3 with the key named and a MIGRATING.md pointer — residue is inert, an open row is migrated, identity is refused

## Notes

Why: RY-17 was written before c63a466 introduced the one-shot legacy-ledger migration refusal; the scenario's own test (slice5-subtraction) already says "a closed or unknown row". The requirement text now names the single reader that exists (LM-01) instead of claiming there is none.
