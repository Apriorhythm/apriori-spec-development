change: win-bash
tier: medium         # CI-infrastructure change with platform-specific failure modes; spec module golden
track: harden
track-rationale: P0-4 of the owner-ordered P0+P1 batch; WSL-shim resolution trap code-verified in scripts/golden-path.mjs
lineage: v3 branch (never merge to main or v2)
current-step: STEP6
round: STEP0 converged at r2; WB-1..4/ADV-1 verified
reviewer-session: 019f4b30-68f9-7222-9b64-17f52a333b4c
next-action: archive --write --changes-dir, commit, push, then PAUSE per owner   # 2026-07-11T21:5x
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
gates:
  - 2026-07-11T16:35 note: change scaffolded by `apriori new`
  - 2026-07-11T21:5x gate④ KB sign-off: covered by the owner's standing batch order "P0+P1 开始" (itemized P0/P1/P2 presentation preceded it; this change is P0-4, the last P0). KB: golden module has no truth doc (C6 informational, consistent with prior scripts/ changes); the resolver contract lives in the golden spec store. Gate PASS. Ledger 12/12 verified (P1 r2, P5 r2, P8 r2). Owner instruction on record: pause after this change — P1-7/P1-8/P1-6 NOT started.
