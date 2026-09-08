change: runbook-version-sync
tier: medium
track: harden
track-rationale: runbook 头部 runbook-version 与 CLI major 漂移,加 check 守住
lineage: v4;不合并 main/v1/v3
current-step: DONE
round: 2
reviewer-session: 019f5578-794b-7733-81ed-26fedd775250
next-action: STEP5 T1 红测试(串行第一)   # 2026-07-12 STEP2 r2 收敛
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
gates:
  - 2026-07-12T16:33 note: change scaffolded by `apriori new`
  - 2026-07-12 authorization (owner, verbatim): "把 C6 + runbook-version 按 V4 流程做成 4.0.3,开工" — 全程委托,含 STEP6 归档+收尾提交+发布 4.0.3(推送/tag/CI/npm);实验室外沿本仓库 v4 分支;C6+runbook-version 两变更 STEP5 串行。
