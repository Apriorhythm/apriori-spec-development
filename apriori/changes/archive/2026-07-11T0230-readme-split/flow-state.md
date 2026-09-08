change: readme-split
tier: medium         # docs restructure + one self-mode check extension; new user-visible docs surface
track: harden
track-rationale: roadmap item 7, owner-ordered batch ("按你的顺序做") — structure fully stated
lineage: v3 branch (never merge to main or v2)
current-step: DONE
round: STEP6·r0   # STEP5 exited at P8 r2 05:15: "VERDICT: no spec-vs-code gaps" (RIMPL-1 verified via the preservation-rule erratum); self-archived; post-archive verify GREEN, 152/152, check --self PASS
reviewer-session: 019f4b30-68f9-7222-9b64-17f52a333b4c   # codex (same resumable session)
next-action: none — change DONE, released in 3.3.0   # 2026-07-11T12:40
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
gates:
  - 2026-07-11T02:00 note: change scaffolded by `apriori new`
  - 2026-07-11T03:40 note: KB pre-check — docs change; truth docs untouched by design (R5: no code contract changes except check self-mode, whose truth doc will be refreshed at STEP6). check.md truth is fresh at 20bee2b.
  - 2026-07-11T05:15 note: STEP6 archive done (check store +CK-08/09). KB writeback: truth/check.md self-mode contract refreshed. Gate ④ pending.
  - 2026-07-11T12:40 gate④: owner reply to the itemized six-gate batch report (+ release), verbatim: "发 3.3.0，另外 github 的当前 main 分支分出一个 v1 用来定格 v1 版本" — batch KB/artifact sign-off approved via the release order. current-step → DONE.
