# P8 consistency review — cas-enforcement (round 2)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/cas-enforcement-impl-review-v2-raw.txt

**Issues**

No open spec-vs-code gaps found.

**CEIMPL-1 — verified.**  
`apriori/truth/archive-merge.md` now preserves D-AM-7 as history and supersedes it with active D-AM-8. D-AM-8 names all four idempotence signatures, including MODIFIED trim-equality → `unchanged`, and explicitly ties CAS rerun repair soundness to that signature set. It also records that repaired suffixes contribute no write jobs, so they need no temp-ownership handling. This resolves the prior contradiction.

**CEIMPL-ADV-1 — verified.**  
`apriori/truth/gate.md` now lists `--no-cas` in the CLI contract line and describes it as a visible C7 waiver. The archive truth doc also covers the repaired-suffix temp-handling note through D-AM-8.

I found no new inaccuracies in the reread. The remaining behavior remains consistent with the landed specs: archived-stage C7 is n/a before waiver checks, waivers do not affect verify/archive, and the CAS repair contract is now aligned across code, spec, and truth docs.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| CEIMPL-1 | `truth/archive-merge.md` Decisions section still said MODIFIED reruns re-apply and D-AM-7 covered only three idempotence signatures, contradicting the implemented and specified MODIFIED trim-equality `unchanged` behavior. | Future state-A reviews or implementations can revive the rerun dead-end fixed by cas-enforcement. | STEP5 r1 | verified |
| CEIMPL-ADV-1 | Advisory batch: add `--no-cas` to the gate truth doc’s Public interface line; document why repaired suffixes are filtered out of write/temp jobs. | Low | STEP5 r1 | verified |

VERDICT: no major issues, ready to proceed
tokens used
3,286,907
**Issues**

No open spec-vs-code gaps found.

**CEIMPL-1 — verified.**  
`apriori/truth/archive-merge.md` now preserves D-AM-7 as history and supersedes it with active D-AM-8. D-AM-8 names all four idempotence signatures, including MODIFIED trim-equality → `unchanged`, and explicitly ties CAS rerun repair soundness to that signature set. It also records that repaired suffixes contribute no write jobs, so they need no temp-ownership handling. This resolves the prior contradiction.

**CEIMPL-ADV-1 — verified.**  
`apriori/truth/gate.md` now lists `--no-cas` in the CLI contract line and describes it as a visible C7 waiver. The archive truth doc also covers the repaired-suffix temp-handling note through D-AM-8.

I found no new inaccuracies in the reread. The remaining behavior remains consistent with the landed specs: archived-stage C7 is n/a before waiver checks, waivers do not affect verify/archive, and the CAS repair contract is now aligned across code, spec, and truth docs.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| CEIMPL-1 | `truth/archive-merge.md` Decisions section still said MODIFIED reruns re-apply and D-AM-7 covered only three idempotence signatures, contradicting the implemented and specified MODIFIED trim-equality `unchanged` behavior. | Future state-A reviews or implementations can revive the rerun dead-end fixed by cas-enforcement. | STEP5 r1 | verified |
| CEIMPL-ADV-1 | Advisory batch: add `--no-cas` to the gate truth doc’s Public interface line; document why repaired suffixes are filtered out of write/temp jobs. | Low | STEP5 r1 | verified |

VERDICT: no major issues, ready to proceed
