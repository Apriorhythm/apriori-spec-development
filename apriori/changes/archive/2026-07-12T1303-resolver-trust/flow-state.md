change: resolver-trust
tier: medium
track: harden
track-rationale: resolver 信任根/悬空条目/保留名/时间戳语义 + D 批 riders
lineage: v4;不合并 main/v1/v3
current-step: DONE
round: 3
reviewer-session: 019f5481-d8ba-7652-b746-642e38e21082
next-action: n/a — archived 2026-07-12T1303
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
gates:
  - 2026-07-12T11:59 note: change scaffolded by `apriori new`
  - 2026-07-12 authorization (owner, verbatim): "/goal 全部修复,然后用 Opus 或者 sonnet 来测试一两个我们实现的小项目" — GPT-5.6 四审全量修复(A tap-contract / B config-contract / C resolver-trust+D riders),发 4.0.2(含推送/tag/CI/npm),随后子代理实测小项目;STEP5 串行。
