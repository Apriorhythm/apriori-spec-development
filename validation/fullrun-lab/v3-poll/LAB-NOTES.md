# LAB-NOTES — experiment overlay (not part of the apriori process)

One line per friction moment in the runbook, logged as it happens.

- 2026-07-08T02:05 环境说 apriori CLI 是 v3.0.0-alpha.9，实际安装的是 3.0.0-alpha.7 —— 环境描述与现实不符（非 runbook 问题，记录备查）。
- 2026-07-08T02:06 runbook 从未明确说 tasks.md 由哪一步产出：P4 只列 proposal/spec/design，工件表和 STEP5 却都依赖 tasks.md。producer 只能自行推断在 STEP2 顺手写。
- 2026-07-08T02:20 会话中断暴露 flow-state 粒度问题：runbook 要求"每轮之后"更新，但一轮内部有多个动作（spawn 评审→落 ledger→修订），中断在轮中时 next-action 指向已完成的动作，只能靠盘上工件反推真实位置。
- 2026-07-08T02:21 runbook 要求 rounds 2+ 用 codex exec resume <session-id>，但从未要求 producer 把 session id 落盘（flow-state/ledger 都没有此字段）；中断后 id 只能去 ~/.codex/sessions 的 rollout 文件名里考古。
- 2026-07-08T07:35 R2 要求 reviewer 的 ledger delta "producer 代录 verbatim"，P0 又规定 advisory 归一成批次行——P8 评审员输出自创格式 advisory 行（ADV-CODE-1/advisory-open/非整数轮次），verbatim 与归一化两规则打架，producer 只能归一化+注记，runbook 未言明是否合规。
- 2026-07-08T07:36 跨 STEP 复用同一 ledger 时 "Round found" 列歧义（STEP0 round 1 与 STEP2/STEP5 round 1 同值）；runbook 未规定轮次是否带阶段前缀，只能靠注记区分。
