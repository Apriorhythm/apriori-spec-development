change: cas-enforcement
tier: medium         # graded CAS enforcement across archive/verify/gate + rerun repair
track: harden
track-rationale: P1-6, last of the owner-ordered batch; CAS optionality from the external review + the dogfooded rerun dead-end (2026-07-11)
lineage: v3 branch (never merge to main or v2)
current-step: STEP6
round: STEP0 converged at r2; CE-1..5/ADV-1 verified
reviewer-session: 019f4b30-68f9-7222-9b64-17f52a333b4c
next-action: archive, post-archive gate, commit, push — BATCH COMPLETE after this   # 2026-07-12T05:3x
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
gates:
  - 2026-07-11T20:54 note: change scaffolded by `apriori new`
  - 2026-07-12T05:3x gate④ KB sign-off: covered by the owner's standing batch order "P0+P1 开始" resumed by "继续" (this change is P1-6, the LAST of the batch — the standing authorization's scope ends when this change archives, per the authz-boundary rule the batch itself introduced). KB updated: truth/archive-merge.md (graded CAS + D-AM-8 superseding D-AM-7), truth/gate.md (seven checks + --no-cas), truth/spec-runner.md (projection JSON). In-flight gate PASS C1-C7 (C7's first live run, on its own change); ledger 9 rows: 8 verified + 1 advisory-acked (P1 r2, P5 r1, P8 r2).
  - 2026-07-12T05:4x post-archive gate: PASS at archived stage (C4 all-terminal, C7 n/a as specified — deltas already merged); recorded per the ledger-states STEP6 rule.
