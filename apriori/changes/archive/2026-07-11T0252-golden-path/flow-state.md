change: golden-path
tier: medium         # new script + CI job + test binding; no CLI behavior change
track: harden
track-rationale: roadmap item 10, owner-ordered batch; contract fully stated by readme-split's Quickstart contract
lineage: v3 branch (never merge to main or v2)
current-step: DONE
round: STEP6·r0   # STEP5 exited P8 r3 07:40 "no spec-vs-code gaps" (GPIMPL-1 verified after two strengthening rounds); self-archived; post-archive verify GREEN, 157/157, check PASS
reviewer-session: 019f4b30-68f9-7222-9b64-17f52a333b4c   # codex (same resumable session)
next-action: none — change DONE, released in 3.3.0   # 2026-07-11T12:40
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
gates:
  - 2026-07-11T02:31 note: change scaffolded by `apriori new`
  - 2026-07-11T05:25 note: KB pre-check — no lib module contracts touched; truth docs all fresh at their stamps.
  - 2026-07-11T07:45 note: STEP6 archive done (golden store GP-01..05 created). No KB writeback needed (no lib module contracts changed; scripts/ is repo infrastructure covered by the golden store spec). Gate ④ pending.
  - 2026-07-11T12:40 gate④: owner reply to the itemized six-gate batch report (+ release), verbatim: "发 3.3.0，另外 github 的当前 main 分支分出一个 v1 用来定格 v1 版本" — batch KB/artifact sign-off approved via the release order. current-step → DONE.
