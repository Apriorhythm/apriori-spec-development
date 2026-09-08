change: unattributed-fail
tier: medium
track: harden
track-rationale: verify 地基级 fail-closed 缺陷,场景可直接陈述
lineage: v4 分支;不合并到 main/v1/v3
current-step: DONE
round: 2                                    # STEP0 r2 收敛
reviewer-session: 019f4b30-68f9-7222-9b64-17f52a333b4c
next-action: STEP5 进行中(串行化)   # 2026-07-12 并行 STEP5 与 cas-mandatory 在 verify 投影层互判 ORPHAN——按 §4.11 精神串行:cas-mandatory 先归档,本变更测试块暂存 scratchpad,恢复后继续
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
gates:
  - 2026-07-12T05:20 note: change scaffolded by `apriori new`
  - 2026-07-12 authorization (owner, verbatim): "开工" — 按已呈报清单执行:①verify false-green 必修 ②archive 硬拒无 stamp mutation ③status archive-resolver+containment ④homepage→v4 ⑤doctor/update 旧布局检测;完成后发 4.0.1(含推送/tag/CI/npm)。
