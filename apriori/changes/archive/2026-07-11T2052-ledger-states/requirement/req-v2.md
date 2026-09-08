# Requirement — ledger-states (v2)

change: ledger-states
target lineage: **v3 branch**. Next patch/minor. Fail-closed tightening of gate C4 + the ledger vocabulary in the protocol docs; in-flight loops keep their working rhythm.

Revisions vs v1 (P1 r1): LS-1 waived rows are gate-checked against `gates:` evidence in BOTH stages; LS-2 the post-archive gate run becomes a protocol requirement; LS-3 a legal-status parser governs both stages (unknown blocks everywhere, case-insensitive); LS-4 rejected-verified preserves the original rationale + concurrence reference; LS-5 the migration is a standing corpus test, not a hand-scan; LS-ADV-1 reopened stays an event, advisory-acked cross-references the labeling discipline.

## Background — the problem (current state A, code-verified)

`lib/gate.js` `checkLedger` blocks on `open` and on `rejected` WITHOUT a word-character reason — nothing else. Three consequences: (1) a producer can self-reject a blocking finding and C4 passes, in-flight AND archived (GPT-5.6 second review, the C4 evidence-binding defect); (2) `fixed` — an unverified claim — survives archival; (3) there is no human-waive state, so real waives masquerade as rejections. Live evidence: update-manifest's UMIMPL-1 sits archived as plain `rejected — refuted…` though the reviewer concurred in r2; two `advisory-acked` rows live outside the named vocabulary.

## Goal (target state B)

**Vocabulary (docs: runbook P0 EN/CN, concepts §7.0 EN/CN, gate spec) — the legal statuses, matched case-insensitively on the leading token:**
- Non-terminal: `open` · `fixed` (fixed-awaiting-verification) · `rejected + reason` (awaiting reviewer concurrence).
- Terminal: `verified` · `rejected-verified — <original rejection reason>; reviewer concurred (<evidence ref>)` (the original rationale STAYS in the cell — machine-checked for a word-char reason, full form protocol-checked by P8/humans) · `waived + reason` (HUMAN-only) · `advisory-acked` (batch-acknowledged advisory rows; advisory labeling itself stays reviewer-only per the existing correctness/security-never-advisory discipline, cross-referenced).
- ANY other status is ILLEGAL — unknown text (typos, invented states) blocks C4 at BOTH stages.
- Re-found issues REOPEN their old ID by returning its status to `open` — "reopened" is an event, not a status (docs say this explicitly).

**Gate C4 (stage-aware, `lib/gate.js`):**
- Both stages: unknown status → block; `rejected`/`rejected-verified`/`waived` without a word-char reason → block; `open` → block. `waived` rows additionally require `gates:` evidence in the change's flow-state (same file C3 already reads): an entry containing the row's ID and the word "waiv" (case-insensitive) — a producer-written row alone NEVER passes (LS-1).
- In-flight only: `fixed` and reasoned `rejected` pass — the loop is still running.
- Archived only: every row must be TERMINAL (`verified` / `rejected-verified`+reason / gates:-backed `waived`+reason / `advisory-acked`); `fixed` and plain `rejected` block with the cure: reviewer verifies (fixed) or concurs (rejected → rejected-verified), or the human waives (waived + gates: entry). Cure message content-tested, not exact-string (design's call).

**Protocol (runbook STEP6, both editions):** after `archive` moves the change, the STEP6 exit REQUIRES a post-archive `apriori gate --change <name>` run (now resolving the archived stage) and its result goes in the gate④ packet — the archived-stage C4 rule is thereby always exercised (LS-2). Bound by the PR-18 scenario together with the P0 vocabulary.

**Repo hygiene as a standing test (LS-5):** a corpus test iterates every archived change (from `apriori/changes/archive/*`, name = stamp-stripped dir) that has a ledger at `apriori/review/<name>-issues.md` and asserts every row parses legal AND terminal — skip-if-absent for packaged environments (same pattern as the delta corpus test). Migration duty: upgrade UMIMPL-1 to `rejected-verified — …; reviewer concurred (impl-review-v2)` (truthful, evidence archived) so the corpus test is green from day one.

## Acceptance criteria (testable)

- I1. Archived stage: `fixed`, plain `rejected`, and an unknown status (`verifed`, `done`) each → C4 BLOCKED naming the row and a cure; in-flight: the same unknown statuses ALSO block.
- I2. Archived stage: all-terminal ledgers (verified / rejected-verified+reason / waived+reason WITH a gates: entry naming the ID / advisory-acked) → C4 pass.
- I3. In-flight: `fixed` and reasoned `rejected` still pass (existing GT tests stay green); `waived` or `rejected-verified` without a reason blocks in both stages; `waived` WITH a reason but WITHOUT the gates: evidence blocks in both stages.
- I4. Runbook P0 (both editions) documents the full vocabulary, who sets what (reviewer: verified/rejected-verified; human only: waived + gates: entry), the reopen-is-an-event rule, and STEP6's post-archive gate requirement; PR-18 binds all of it scoped to the P0/STEP6 blocks.
- I5. concepts §7.0 vocabulary strings updated in both languages.
- I6. UMIMPL-1 reads `rejected-verified — …; reviewer concurred (impl-review-v2)`; `gate --change update-manifest` (archived) passes C4; the corpus test over ALL archived ledgers is green.
- I7. All existing tests pass; suite + verify + gate + check --self green.

## Out of scope

- CAS enforcement (P1-6, next change).
- Shrink-guard metrics (advisories already excluded; counting unchanged).
- Ledger file format (the 5-column table stays; only Status tightens).
- C4 does NOT semantically validate the gates: entry's content beyond ID+waiv presence — the human-auditable half stays protocol-checked (declared honesty boundary, now WITH a mechanical floor).

## Decisions proposed

- DD-1: `fixed` blocks only at ARCHIVED stage — blocking it in-flight would break every running loop between rounds.
- DD-2: `advisory-acked` is terminal — reviewer-labeled, shrink-guard-excluded, existing practice named; the labeling discipline is cross-referenced, not restated.
- DD-3 (revised): `waived` needs the row reason AND machine-checked gates: evidence (ID + "waiv") in both stages; full semantic audit stays with P8/humans.
- DD-4: unknown statuses block everywhere — a vocabulary is only a vocabulary if straying from it is visible.
