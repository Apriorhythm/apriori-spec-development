change: config-contract
tier: medium
track: harden
track-rationale: process-config 结构化解析,fence/注释/重复 fail-closed
lineage: v4;不合并 main/v1/v3
current-step: DONE
round: 2
reviewer-session: 019f5310-28e4-7103-9c14-1c1181180f9b
next-action: n/a — archived 2026-07-12T1252
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
gates:
  - 2026-07-12T11:59 note: change scaffolded by `apriori new`
  - 2026-07-12 authorization (owner, verbatim): "/goal 全部修复,然后用 Opus 或者 sonnet 来测试一两个我们实现的小项目" — GPT-5.6 四审全量修复(A tap-contract / B config-contract / C resolver-trust+D riders),发 4.0.2(含推送/tag/CI/npm),随后子代理实测小项目;STEP5 串行。
