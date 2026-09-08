change: release-docs
tier: medium         # ESCALATED from trivial at P8 r3 (§2 first-surprise rule): the SECURITY.md fact-check exposed a real doctor gap (per-file flow-state containment) — fixed in code + test rather than doc-weaseled
track: harden
track-rationale: roadmap item 8, owner-ordered batch; content fully derivable from annotated tags + shipped migration notes
lineage: v3 branch (never merge to main or v2)
current-step: DONE
round: STEP6·r0   # STEP5 exited P8 r4 08:55 "no spec-vs-code gaps" (RD-1 verified after the doctor hardening; RD-2/3 verified r2); tier escalated trivial→medium mid-change
reviewer-session: 019f4b30-68f9-7222-9b64-17f52a333b4c
next-action: none — change DONE, released in 3.3.0   # 2026-07-11T12:40
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
gates:
  - 2026-07-11T02:53 note: change scaffolded by `apriori new`
  - 2026-07-11T08:55 note: STEP6 — docs-only change, nothing to archive into the spec store (no delta specs; the doctor hardening ships as code+test under this change's commit). KB: truth/doctor.md D7 line refreshed. Gate ④ pending.
  - 2026-07-11T12:40 gate④: owner reply to the itemized six-gate batch report (+ release), verbatim: "发 3.3.0，另外 github 的当前 main 分支分出一个 v1 用来定格 v1 版本" — batch KB/artifact sign-off approved via the release order. current-step → DONE.
