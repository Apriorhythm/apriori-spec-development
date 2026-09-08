change: cas-mandatory
tier: medium
track: harden
track-rationale: 四个小表面的对齐批次(CAS 硬拒/status/homepage/旧布局检测),边界清楚
lineage: v4 分支;不合并到 main/v1/v3
current-step: DONE
round: 2                                    # STEP0 r2 收敛
reviewer-session: 019f5310-28e4-7103-9c14-1c1181180f9b
next-action: STEP5 进行中(串行化)   # 2026-07-12 并行 STEP5 与 unattributed-fail 投影冲突,串行化:本变更先走(对方纯追加测试块暂存)
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
gates:
  - 2026-07-12T05:20 note: change scaffolded by `apriori new`
  - 2026-07-12 authorization (owner, verbatim): "开工" — 按已呈报清单执行:①verify false-green 必修 ②archive 硬拒无 stamp mutation ③status archive-resolver+containment ④homepage→v4 ⑤doctor/update 旧布局检测;完成后发 4.0.1(含推送/tag/CI/npm)。
