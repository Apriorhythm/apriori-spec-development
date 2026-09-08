change: evidence-governance
tier: medium         # runbook text (EN/CN) + a secret-scan helper consumable by gate; touches the review-evidence conventions
track: harden
track-rationale: roadmap item 11, owner-ordered batch
lineage: v3 branch (never merge to main or v2)
current-step: DONE
round: STEP6·r0   # full pipeline: P1 ×2 (EG-1..3), P5 ×3 (EGSPEC-1 twice — wrong MODIFIED target caught), P8 ×1 clean; self-archived
reviewer-session: 019f4b30-68f9-7222-9b64-17f52a333b4c
next-action: none — change DONE, released in 3.3.0   # 2026-07-11T12:40
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
gates:
  - 2026-07-11T03:08 note: change scaffolded by `apriori new`
  - 2026-07-11T11:20 note: STEP6 archive done (check store +CK-10, CK-07 block modified). KB: truth/check.md consumer-mode line refreshed below. Gate ④ pending.
  - 2026-07-11T12:40 gate④: owner reply to the itemized six-gate batch report (+ release), verbatim: "发 3.3.0，另外 github 的当前 main 分支分出一个 v1 用来定格 v1 版本" — batch KB/artifact sign-off approved via the release order. current-step → DONE.
