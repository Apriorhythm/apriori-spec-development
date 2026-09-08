change: update-manifest
tier: medium         # init+update contract change (managed manifest); fail-closed behavior change on foreign/modified files
track: harden
track-rationale: P0-3 of the owner-ordered P0+P1 batch; defect code-verified in lib/update.js (existence-only refresh)
lineage: v3 branch (never merge to main or v2)
current-step: STEP6
round: STEP0 converged at r2 (VERDICT: no major issues); UM-1..5/ADV-1 verified
reviewer-session: 019f4b30-68f9-7222-9b64-17f52a333b4c
next-action: archive --write --changes-dir, commit, push   # 2026-07-11T19:4x
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
gates:
  - 2026-07-11T16:12 note: change scaffolded by `apriori new`
  - 2026-07-11T19:4x gate④ KB sign-off: covered by the owner's standing batch order "P0+P1 开始" (itemized P0/P1/P2 presentation preceded it; this change is P0-3 of that batch). KB updated: truth/update.md rewritten around the managed manifest contract (+ lib/managed.js), truth/init.md gained the manifest-first rules. Gate PASS C1-C6; ledger 12 rows: 11 verified + UMIMPL-1 rejected with reproduction evidence (reviewer concurred in r2).
