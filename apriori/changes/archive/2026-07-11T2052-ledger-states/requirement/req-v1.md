# Requirement — ledger-states (v1)

change: ledger-states
target lineage: **v3 branch**. Next patch/minor. Fail-closed tightening of gate C4 + the ledger vocabulary in the protocol docs; in-flight loops unchanged.

## Background — the problem (current state A, code-verified)

`lib/gate.js` `checkLedger` blocks on `open` and on `rejected` WITHOUT a word-character reason — nothing else. Three consequences:

1. **Self-rejection passes.** A producer can flip a blocking finding to `rejected — <any reason>` and gate C4 passes, in-flight AND archived. The reviewer never has to concur; the human never sees it as a gate item. (GPT-5.6 second review: the C4 evidence-binding defect.)
2. **`fixed` survives archival.** `fixed` means "producer claims fixed, reviewer hasn't verified" — a non-terminal claim. C4 passes it even at the ARCHIVED stage, so a change can archive with unverified fix claims.
3. **No human-waive state exists.** The only exits are `verified` or producer-`rejected` — there is no vocabulary for "the human decided to accept this risk", so real waives masquerade as rejections.

Live evidence from this repo: update-manifest's UMIMPL-1 sits archived as plain `rejected — refuted with reproduction evidence` even though the reviewer explicitly concurred in round 2 — the truthful state (a rejection the reviewer verified) has no name. Two `advisory-acked` rows (change-projection, gate-command) likewise live outside the named vocabulary.

## Goal (target state B)

**Vocabulary (docs: runbook P0 EN/CN, concepts §7.0 EN/CN, gate spec):**
- Non-terminal: `open` · `fixed` (= fixed-awaiting-verification) · `rejected + reason` (= awaiting reviewer concurrence).
- Terminal: `verified` (reviewer confirmed the fix) · `rejected-verified + reason` (reviewer CONCURRED with the rejection) · `waived + reason` (the HUMAN accepted the risk — a `gates:` entry records the decision; only a human may set it) · `advisory-acked` (batch-acknowledged advisory rows, the existing practice, now named).
- Reviewer duties (P0 bullets): flips `fixed → verified` AND `rejected → rejected-verified` (or reopens); producer never sets a terminal state on its own findings; human (only) sets `waived`.

**Gate C4 (stage-aware, `lib/gate.js`):**
- In-flight (unchanged semantics + one addition): `open` blocks; `rejected`/`rejected-verified`/`waived` without a word-char reason blocks. `fixed` and reasoned `rejected` pass — the loop is still running.
- Archived: EVERY row must be terminal — `/^verified\b/`, `/^rejected-verified\b/`+reason, `/^waived\b/`+reason, `/^advisory-acked\b/`. Anything else (`open`, `fixed`, plain `rejected`, unknown text) blocks with a cure message: "reviewer must verify (fixed) / concur (rejected → rejected-verified), or the human waives it (waived + gates: entry)".

**Repo hygiene (part of this change):** upgrade UMIMPL-1's status to `rejected-verified — …` (truthful: the r2 review concurred, evidence archived); verify no other archived ledger carries a non-terminal row (scan done: none).

## Acceptance criteria (testable)

- I1. Archived stage: a ledger with a `fixed` row → C4 BLOCKED naming the row and the cure; same for plain `rejected` and for an unknown status.
- I2. Archived stage: all-terminal ledgers (verified / rejected-verified+reason / waived+reason / advisory-acked) → C4 pass.
- I3. In-flight: `fixed` and reasoned `rejected` still pass (existing GT tests stay green); `waived` or `rejected-verified` WITHOUT a reason blocks in both stages.
- I4. The runbook P0 section (both editions) documents the full vocabulary incl. who may set what (reviewer: verified/rejected-verified; human only: waived + gates: entry); PR-18 binds it scoped to the P0 block.
- I5. concepts §7.0 vocabulary strings updated in both languages (the `open / fixed / rejected + reason / verified` literals gain the new states).
- I6. UMIMPL-1's row reads `rejected-verified — …`; `gate --change update-manifest` (archived stage) passes C4 under the new rule.
- I7. All existing tests pass; suite + verify + gate + check --self green.

## Out of scope

- CAS enforcement (P1-6, next change).
- The shrink-guard metrics (they already exclude advisories; the counting rules don't change).
- Ledger file format (still the 5-column table; only the Status vocabulary tightens).

## Decisions proposed

- DD-1: `fixed` blocks only at ARCHIVED stage — blocking it in-flight would break every running loop between rounds (the normal state of the world mid-change).
- DD-2: `advisory-acked` is terminal — advisory rows are reviewer-labeled low-risk and already excluded from shrink-guard metrics; naming the existing practice beats inventing a second advisory exit.
- DD-3: `waived` requires BOTH a reason in the row and a `gates:` entry — the row alone is machine-checkable (C4 checks the reason); the gates: entry is the human-auditable half (P8/humans check it; C4 does not parse flow-state for it — kept honest by the protocol, not the parser).
