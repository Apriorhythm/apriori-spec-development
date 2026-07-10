change: quick-poll
tier: medium
track: harden
track-rationale: 目标与验收在 brainstorm 中已完全可陈述（req-v1 含 10 条可测验收）——harden；单模块新工具、无外部共享状态/跨模块/迁移，故 medium 而非 large。
lineage: master 主线（单主线仓库，无合并禁忌）
current-step: DONE
round: 0                # STEP5 round 1: 07:31-07:38 (28 tests red->green, apriori verify GREEN, E2E PASS, P8 "no spec-vs-code gaps"); STEP6 archive+KB 07:39-07:45
next-action: none — change closed   # 2026-07-08T07:50
gates:
  - 2026-07-08T02:07 note: change scaffolded by `apriori new`
  - 2026-07-08T02:09 note: brainstorm exit approved by human — "OK,都可以,就这么定"; consensus funneled into requirement/req-v1.md
  - 2026-07-08T02:20 note: session interrupted mid-round; position reconstructed from on-disk artifacts (review v1 + ledger present, req-v2 absent)
  - 2026-07-08T02:36 note: STEP0 exit — P1 round 3 "VERDICT: no major issues"; req-v3 copied to requirement/req-final.md
  - 2026-07-08T07:22 note: STEP2 exit — P5 round 2 "VERDICT: no major issues, ready to proceed to execution"; stopped at gate ③ awaiting human
  - 2026-07-08T07:30 gate③: "通过,继续" — STEP3 packet approved as-is; no design changes, STEP4 skipped
  - 2026-07-08T07:38 note: STEP5 exit — tests 28/28 green, apriori verify GREEN, Playwright E2E PASS, tasks all [x], P8 "VERDICT: no spec-vs-code gaps" (codex session 019f3ee7-de09-7df3-b638-b4942780e395)
  - 2026-07-08T07:44 note: STEP6 — implementation committed (ce55e11); apriori archive --write merged 6 ADDED requirements into apriori/specs/poll-service.md; KB apriori/truth/poll-service.md written (Contract stamped ce55e11 + Decisions D1-D8); stopped at gate ④ awaiting human
  - 2026-07-08T07:50 gate④: "批准" — KB diff (apriori/truth/poll-service.md) + archive approved; current-step set to DONE
