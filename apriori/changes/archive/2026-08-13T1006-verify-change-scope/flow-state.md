change: verify-change-scope
tier: medium
track: harden
track-rationale: 目标可陈述（"本 change 达标"成为一等公民命令形态，历史缺口出 verdict 入报告）；样本有现成验证场——harden
lineage: main（v4 产品线；不合并 v1/v3）
current-step: DONE
round: 7                # STEP0 r1-r4（"7"→"3"→"2"→通过）；STEP2 P5：r1 "5 issues open"→r2 "1 issues open"（SPEC-2..5 verified）→r3 13:01-13:12 "VERDICT: no major issues, ready to proceed to execution"（SPEC-1..5 全 verified）
reviewer-session: 019ff7a9-ec9c-7f73-9cdf-84da370b6053   # codex(WSL) gpt-5.6-sol, STEP5 P8（STEP0 会话 019ff77b…；STEP2 会话 019ff78f…）
next-action: n/a — archived 2026-08-13T1006，gate④ 已批
# STEP5·P8 全记录：r1 "6 issues open"（含 SPEC-6 复燃）→ r2 "4"（IMPL-1/4/6 verified）→ r3 "2"（IMPL-2/SPEC-6 verified）→ r4 16:35-16:45 "VERDICT: no spec-vs-code gaps"（IMPL-1..6+SPEC-6 全 verified）。
# STEP5 退出条件：306/306 测试绿 ✓；verify --change GREEN ✓；gate 七项全 PASS（C1 change-scoped；C6 以未提交工作区计新鲜，STEP6 提交后刷新 stamp）✓；tasks 全 [x] ✓；一致性 verdict ✓；样本证据+lab 实录 ✓。
# STEP5 实施记录：先采 state-A goldens → TDD（change-scope.test.js 12 测试红→绿）→ 折返修正 SPEC-6（GT-26 独立变绿与 SPEC-1 fail-closed 矛盾 → 兄弟 delta 场景 ID 归因并入同一标题批）→ 存量 SR-16/SR-18 spec 场景以 MODIFIED 块重述（本 change delta 含 mutation，CAS stamp 就位）→ RUNBOOK/docs 双语 + CHANGELOG → 全量 296/296。
artifact-root: .
gates:
  - 2026-08-14T00:45 gate④/KB sign-off (owner, verbatim): 「批准」——三 change 的 gate④ packet 一并批准（归档+KB 写回）；随后 owner 指示改动全部转移至 on-the-fly 分支提交、main 退回 10aef21、不 push——已执行。
  - 2026-08-13T16:50 gate④ packet（待人类决定，未归档）: 【呈批事项，独立列示】
      ① 批准归档：`apriori archive --change verify-change-scope --write --changes-dir apriori/changes`——干跑：gate 模块 ADDED 1（C1 change-scoped）；spec-runner 模块 ADDED 1（change-scoped verify）+ MODIFIED 1（projected-verify 块整块重述，仅 SR-16/SR-18 两条文本更新，SR-17/19..24 逐字保留——正是 change 3 要机械化检查的那类替换，本次靠人工+评审保真）。无冲突，CAS stamp 全就位。
      ② 批准 KB 写回（P9）：truth/spec-runner.md Contract 大幅更新（change-scoped verdict/storeReport/changeScope/兄弟归因严格算法/safeMdWalk/单次执行契约/D-SR-x 的 --change 限定入 Decisions——注意 D-SR-x 原文保留并加 scoped amendment 条目、D-SR-1 全局面保留）；truth/gate.md Contract 更新 C1 in-flight 语义；truth/archive-merge.md Contract 注记 buildProjection 新增 deltaOps 返回字段。source-commit 刷新在你的验收提交后。
      ③ 风险声明：--specs 路径有 state-A byte golden 测试作证不变；本 change 与 gate-id-pattern 的 delta 无同名 Requirement，两者可独立归档，但**归档顺序建议 gate-id-pattern 先**（本 change 的 MODIFIED 块 stamp 基于当前 store——两者互不触碰同一文件，顺序实际无约束，仅为清晰）。
      ④ 决定选项：批准归档+KB 写回 / 要求修改后再呈 / 驳回。
  - 2026-08-13T13:14 gate③（按 goal 预授权并入 P8 轮次）: STEP2 以 r3 "VERDICT: no major issues, ready to proceed to execution" 收敛，SPEC-1..5 全 verified（SPEC-1 经历安全修订两轮传播）；medium tier 的 STEP3 异步 look-over 并入 STEP5 P8；STEP4 无变更可应用，跳过。DESIGN-REVIEW-DOC = review/spec-review-v1..v3.md。
  - 2026-08-13T09:18 note: change scaffolded by `apriori new`
  - 2026-08-13T09:18 consolidation (owner, verbatim): 「本 goal 预授权：gate②（gap-report 放行）、gate③（技术评审并入 P8 轮次）可自决通过并留痕；gate⑤（cap 触顶/振荡）按 RUNBOOK 呈报格式写入 flow-state 后可选保守方案继续；gate④（KB 签收/归档批准）不在授权范围——每个 change 走到 STEP6 归档前停下，把 gate④ packet 留在 flow-state 里，继续下一个 change 的 STEP0（归档动作全部留给我回来批）。撤销方式：我任意时刻声明即失效。」另：不 commit、不 push——全部改动留工作区，代码与文档的提交由我验收后执行。
  - 2026-08-13T09:18 note: KB 预检——spec-runner/gate truth 的 source-commit 相对基线 main@10aef21 仍新鲜；但两模块的 lib 代码已含上一 change（gate-id-pattern，未归档未提交）的工作区改动，其 KB 写回在该 change 的 gate④ 之后——本 change 的 spec/design 以**工作区代码现实**为 state A（含 matcher/resolveIdPattern 等新机制），评审时需注意 truth doc 尚未反映这些。
  - 2026-08-13T09:18 note: 依赖关系——本 change 建立在 gate-id-pattern 的 id-pattern 解析之上（样本复现需 --id-pattern/config 才能看清 scope 噪音本体）；两 change 的 delta specs 无同名 Requirement，可独立归档。
