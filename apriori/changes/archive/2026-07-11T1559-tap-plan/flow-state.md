change: tap-plan
tier: medium         # parser+infra-error tightening in spec-runner; fail-closed behavior change
track: harden
track-rationale: P0-2 of the owner-ordered P0+P1 batch; both defects reproduced verbatim from the GPT-5.6 second review
lineage: v3 branch (never merge to main or v2)
current-step: STEP6
round: P5 converged at STEP2·r2 (VERDICT: no major issues) — STEP0 r2, P5 r2, all rows verified
reviewer-session: 019f4b30-68f9-7222-9b64-17f52a333b4c
next-action: archive --write --changes-dir, commit, push   # 2026-07-11T17:2x
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
gates:
  - 2026-07-11T15:39 note: change scaffolded by `apriori new`
  - 2026-07-11T17:2x gate④ KB sign-off: covered by the owner's standing batch order "P0+P1 开始" (itemized P0/P1/P2 presentation preceded it; this change is P0-2 of that batch). KB updated: apriori/truth/spec-runner.md parseTap/infraErrors contracts extended for the plan trio. Gate PASS C1-C6; ledger 8/8 verified (P1 r2, P5 r2, P8 r2 convergence).
