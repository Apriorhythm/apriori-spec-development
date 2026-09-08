change: req-sweep
tier: medium         # archive phase-4 behavior + protocol text, fail-safe additive
track: harden
track-rationale: owner verdict — no manual steps in the flow; 3.4.1 prefix makes the sweep machine-safe
lineage: v3 branch (never merge to main or v2)
current-step: STEP6
round: STEP0 converged at r3; RS-1..4 verified, RS-ADV-1 verified, RS-ADV-2 advisory-acked
reviewer-session: 019f4b30-68f9-7222-9b64-17f52a333b4c
next-action: self-demonstrating archive + post-archive gate, then release 3.4.2 on owner naming   # 2026-07-12
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
gates:
  - 2026-07-12T01:47 note: change scaffolded by `apriori new`
  - 2026-07-12 authorization (owner, verbatim): "整个过程必须是 AI 执行,或者命令执行,归档这种事情,在 OpenSpec 里面都是 opsx:archive 执行的,我们总不能退回手工" — the change order; release naming to follow separately.
  - 2026-07-12 gate④ KB sign-off: covered by the same owner order (this change IS its named scope: no-manual-steps). KB updated: truth/archive-merge.md archiveChange gains phase 3.5. Gate PASS C1-C7; ledger 13 rows: 11 verified + 2 advisory-acked (P1 r3, P5 r2, P8 r2).
  - 2026-07-12 post-archive gate: PASS at archived stage. SELF-DEMONSTRATING archive: phase 3.5 staged this change's own three requirement docs automatically (staged-line in the report; live requirement/ cleared of req-sweep files) — the no-manual-steps owner verdict is now command behavior, proven on itself.
