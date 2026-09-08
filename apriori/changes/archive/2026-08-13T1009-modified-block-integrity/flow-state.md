change: modified-block-integrity
tier: medium
track: harden
track-rationale: 目标可陈述：MODIFIED 整块替换的保真性检查从 LLM 评审注意力转为机械报告——harden
lineage: main（v4 产品线；不合并 v1/v3）
current-step: DONE
reviewer-session: 019ff7ee-3e79-7b31-90e3-38c637d1e273   # codex(WSL) gpt-5.6-sol, STEP5 P8（STEP0 019ff7c5…；STEP2 019ff7db…）
round: 1                # r1 17:11-17:35 "VERDICT: 9 issues open"（算法矛盾/身份语义/输出契约/id-pattern 纪律/archive form/存在性矩阵/AC7 oracle/state A/确认 flag 冲突）
next-action: n/a — archived 2026-08-13T1009，gate④ 已批（on-the-fly 分支）
# STEP5·P8 全记录：r1 "3"（raw 原文/整行截断/repaired rename）→ r2 "1"（IMPL-1/2/3+MBI-1 verified，+IMPL-4 inline fence）→ r3 "1"（IMPL-4 verified，IMPL-5 采集器统一）→ r4 "1"（IMPL-5 正则跨行细化）→ r5 "1"（IMPL-5 verified，+IMPL-6 定界内 fence 内容）→ r6 00:00-00:08 "VERDICT: no spec-vs-code gaps"（全 verified）。
# STEP5 退出条件：318/318 绿 ✓；verify --change GREEN ✓；gate 七项全 PASS ✓；tasks 全 [x] ✓；一致性 verdict ✓；样本证据（batch3 真实 MODIFIED 丢失 23 行实抓）+ lab 三面实录 ✓。
# STEP5 实施记录：T1 人工推导先行（当场纠正 req 假设——MBI-1）；引擎纯函数（快路径/真值表/子序列/结构扫描）；verify 第 4 批段零污染；archive bin 注入 + 降级 warning；318/318。
# STEP0 全记录：r1 "9"→r2 "5"→r3 "2"→r4 19:00-19:10 "VERDICT: no major issues"（REQ-1..11 全 verified）→ req-final；STEP1 gap-report 完成（medium 无 gate②）；STEP2 P4 产物就绪（AM-43..47 + SR-65..68）
artifact-root: .
gates:
  - 2026-08-14T00:50 gate④/KB sign-off (owner, verbatim): 「批准」；随后 owner 指示「这样吧，我们的这个修改先暂存一下，新建一个 on-the-fly 分支，我们在这个分支 commit，main 分支暂时不改」——全部提交转移至 on-the-fly 分支，main 退回 10aef21，不 push。
  - 2026-08-14T00:10 gate④ packet（待人类决定，未归档）: 【呈批事项，独立列示】
      ① 批准归档：`apriori archive --change modified-block-integrity --write --changes-dir apriori/changes`——干跑：archive-merge 模块 ADDED 1（integrity 引擎）、spec-runner 模块 ADDED 1（verify 面报告），无冲突，stamp 就位。注意：与前两 change 的 delta 无同名 Requirement，三个 change 归档顺序建议按开发序（gate-id-pattern → verify-change-scope → modified-block-integrity），后两者的 spec-runner delta 均基于同一 store 基线 stamp——**归档第二个后第三个的 stamp 将过期，需按序 re-stamp 或允许 rerun 修复**（archive 的 rerun-repair 不适用于未应用过的 delta；实际操作：归档一个 → 对下一个跑 `apriori stamp` 更新其 delta 首行 → 再归档。此机械步骤我可在你批准后代办，或你自行执行）。
      ② 批准 KB 写回（P9）：truth/archive-merge.md Contract 增 modifiedBlocks 返回、compareModifiedBlock/formatIntegrityHuman 导出、cli(argv,deps)/archiveChange idMatcherFactory 注入缝、pushIntegritySection 时序；truth/spec-runner.md Contract 增 modifiedIntegrity 字段/第 4 批段/标题采集统一语义；Decisions 各追加"informative 定位（机械检查不裁意图）"与"bin 层组装保依赖方向"两决策。source-commit 待你的验收提交。
      ③ 风险声明：本 change 触碰 formatReport/verifyJson 共享路径——--specs byte golden 全程绿；change 2 的全量 JSON oracle 扩展了 modifiedIntegrity 字段（披露并经 P8 复核）。
      ④ 决定选项：批准归档+KB 写回 / 要求修改后再呈 / 驳回。
  - 2026-08-13T20:14 gate③（按 goal 预授权并入 P8 轮次）: STEP2 以 r2 "VERDICT: no major issues, ready to proceed to execution" 收敛（r1 "5 issues open"→r2 通过，SPEC-1..5 全 verified）；STEP3 并入 STEP5 P8；STEP4 跳过。DESIGN-REVIEW-DOC = review/spec-review-v1..v2.md。
  - 2026-08-13T16:58 note: change scaffolded by `apriori new`
  - 2026-08-13T16:58 consolidation (owner, verbatim): 「本 goal 预授权：gate②（gap-report 放行）、gate③（技术评审并入 P8 轮次）可自决通过并留痕；gate⑤（cap 触顶/振荡）按 RUNBOOK 呈报格式写入 flow-state 后可选保守方案继续；gate④（KB 签收/归档批准）不在授权范围——每个 change 走到 STEP6 归档前停下，把 gate④ packet 留在 flow-state 里，继续下一个 change 的 STEP0（归档动作全部留给我回来批）。撤销方式：我任意时刻声明即失效。」另：不 commit、不 push——全部改动留工作区。
  - 2026-08-13T16:58 note: KB 预检——archive-merge/spec-runner truth 相对基线新鲜（工作区含前两个 change 未提交改动，其 KB 写回在各自 gate④ 后；本 change 以工作区代码为 state A）。
  - 2026-08-13T16:58 note: 活教材——上一 change（verify-change-scope）的 delta 恰含一个 9 场景 Requirement 块的 MODIFIED 整块重述（仅 2 条文本变更、7 条须逐字保留），本 change 的检查若已存在即可机械证明该重述无丢失；可作 req 示例与验证场。
