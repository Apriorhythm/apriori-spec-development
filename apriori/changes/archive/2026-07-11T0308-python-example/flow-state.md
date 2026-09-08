change: python-example
tier: trivial        # example directory: no CLI behavior, no shared state; CI job additive
track: harden
track-rationale: roadmap item 9 halved to Python-only per owner ("9 号砍半")
lineage: v3 branch (never merge to main or v2)
current-step: DONE
round: STEP6·r0   # STEP5 exited P8 r1 09:40 clean: "VERDICT: no spec-vs-code gaps"
reviewer-session: 019f4b30-68f9-7222-9b64-17f52a333b4c
next-action: none — change DONE, released in 3.3.0   # 2026-07-11T12:40
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
gates:
  - 2026-07-11T03:03 note: change scaffolded by `apriori new`
  - 2026-07-11T12:40 gate④: owner reply to the itemized six-gate batch report (+ release), verbatim: "发 3.3.0，另外 github 的当前 main 分支分出一个 v1 用来定格 v1 版本" — batch KB/artifact sign-off approved via the release order. current-step → DONE.
