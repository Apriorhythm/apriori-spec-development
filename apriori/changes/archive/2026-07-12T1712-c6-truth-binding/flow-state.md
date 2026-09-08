change: c6-truth-binding
tier: medium
track: harden
track-rationale: gate C6 三角度静默失效:truth 文件名/source-commit 格式/代码路径映射——真实项目 dogfood 双佐证
lineage: v4;不合并 main/v1/v3
current-step: DONE
round: 3
reviewer-session: 019f4b30-68f9-7222-9b64-17f52a333b4c
next-action: n/a — archived 2026-07-12T1712
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
gates:
  - 2026-07-12T16:33 note: change scaffolded by `apriori new`
  - 2026-07-12 authorization (owner, verbatim): "把 C6 + runbook-version 按 V4 流程做成 4.0.3,开工" — 全程委托,含 STEP6 归档+收尾提交+发布 4.0.3(推送/tag/CI/npm);实验室外沿本仓库 v4 分支;C6+runbook-version 两变更 STEP5 串行。
