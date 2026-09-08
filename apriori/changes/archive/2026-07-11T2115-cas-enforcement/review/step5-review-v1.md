# P8 consistency review — cas-enforcement (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/cas-enforcement-impl-review-v1-raw.txt

**Issues**

**CEIMPL-1 — `truth/archive-merge.md` still carries the old active MODIFIED rerun decision.**

Description: The implemented code and delta spec make MODIFIED trim-equality part of the idempotence vocabulary: `merge()` now pushes `unchanged` when the MODIFIED delta block trim-equals the current store block. The truth doc’s Contract section and CAS pitfall reflect that, but the active Decisions section still says D-AM-7 covers only three signatures and that “MODIFIED reruns re-apply”.

Risk: Future work using the truth doc as state A can revive the old CE-1 defect or treat the new MODIFIED `unchanged` behavior as accidental instead of ratified.

Suggested fix: Update or supersede D-AM-7 so it records the cas-enforcement decision: rerun idempotency now includes MODIFIED trim-equality, making four signatures.

**Advisories**

- `truth/gate.md` describes C7 and its `--no-cas` waiver in the seven-checks paragraph, but the Public interface CLI line still lists only `--change`, `--test-cmd`, `--cwd`, and `--json`. Add `--no-cas` there for consistency.
- The repaired-file skip is sound: a repaired suffix contributes no write job, so it does not need a temp ownership check for safety. If desired, mention this explicitly in truth/archive-merge to avoid future confusion when reading the filtered `jobs` logic.
- The hostile-store rerun repair is acceptable under the declared signature: if every op is a no-op by merge semantics, the delta’s requested end state is already represented. Divergence with any real pending op still fails.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| CEIMPL-1 | `truth/archive-merge.md` Decisions section still says MODIFIED reruns re-apply and D-AM-7 covers only three idempotence signatures, contradicting the implemented and specified MODIFIED trim-equality `unchanged` behavior. | Future state-A reviews or implementations can revive the rerun dead-end fixed by cas-enforcement. | STEP5 r1 | open |
| CEIMPL-ADV-1 | Advisory batch: add `--no-cas` to the gate truth doc’s Public interface line; optionally document why repaired suffixes are filtered out of write/temp jobs. | Low | STEP5 r1 | open |

VERDICT: 1 issues open
