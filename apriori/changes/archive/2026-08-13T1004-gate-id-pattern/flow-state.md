change: gate-id-pattern
tier: medium
track: harden
track-rationale: 目标与验收可直接陈述（gate 缺 id-pattern 通道，真实样本 C1 恒 BLOCKED，改后应只剩真实缺口）——harden
lineage: main（v4 产品线；不合并 v1/v3）
current-step: DONE
round: 4                # STEP0·r1 01:56-02:14 "6 issues open"；r2 02:20-02:34 "1 issues open"(REQ-1..6 verified,+REQ-7)；r3 02:40-02:52 "1 issues open"(REQ-7 verified,+REQ-8)；r4 02:55-03:05 "VERDICT: no major issues" → req-final 定稿；STEP1 gap-report 03:10 完成（medium 无 gate②，风险 R1-R5 前送）；STEP2 P4 产物 03:25 就绪
reviewer-session: 019ff75f-81a2-7193-99bc-98ff06d34e09   # codex(WSL) gpt-5.6-sol, STEP5 P8（STEP0 会话 019ff71f-0d2f…；STEP2 会话 019ff731-0efe…）
next-action: n/a — archived 2026-08-13T1004（本地时钟），gate④ 已批
# STEP5 全记录：P8 r1 07:06-07:40 "8 issues open" → r2 08:11-08:40 "4 issues open"（IMPL-4..8 verified；IMPL-1/2/3 reopen + IMPL-9）→ r3 08:56-09:05 "VERDICT: no spec-vs-code gaps"（IMPL-1..9 全 verified）。退出条件：284/284 测试绿 ✓；verify --change GREEN ✓；lint 未配置（保持现状）✓；tasks.md 全 [x] ✓；一致性 verdict ✓；真实样本证据 review/sample-evidence.md ✓。
# STEP2 全记录：r1 "5"→r2 "4"→r3 "4"→r4 "3"（cap 触顶，gate⑤ 保守续跑）→r5 "1"→r6 06:00-06:10 "VERDICT: no major issues, ready to proceed to execution"。账本 SPEC-1..8 全 verified（SPEC-2 经历 驳回→被驳倒→子进程方案 三段演化）。
# STEP5 实施记录：TDD 逐模块红→绿（CF 08-12 / SR 50-55 / GT 22-25 / CK 13-16 / DR 16-18 共 22 测试）；实现面 = lib/config.js（splitCells 奇偶、readConfig 兜底、resolveIdPattern、sanitizeMsg）、lib/id-match-child.js（新）、lib/spec-runner.js（matcher 贯穿）、lib/gate.js（--id-pattern）、lib/check.js（CK-04 复用 leadId+matcher）、lib/doctor.js（D6 先于 D5）、模板、docs/cli 双语、CHANGELOG。
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
gates:
  - 2026-08-14T00:40 gate④/KB sign-off (owner, verbatim): 「批准」——三 change 的 gate④ packet 一并批准（归档+KB 写回）；随后 owner 指示改动全部转移至 on-the-fly 分支提交、main 退回 10aef21、不 push——已执行。
  - 2026-08-14T00:20 note: P8 收敛后的测试防颤维护——SR-54 e2e 的墙钟下界断言（>=1900ms）在满载并行下偶发失败（判定性预算证明由 CHILD_SPAWN_OPTS 常量断言承担），移除该冗余下界，行为零变化；全套 318/318 连续多轮绿。
  - 2026-08-13T09:10 gate④ packet（待人类决定，未归档）: 【呈批事项，独立列示】
      ① 批准归档：`apriori archive --change gate-id-pattern --write --changes-dir apriori/changes`——干跑结果：5 个模块全部 ADDED 合并（check: CK-04 shared contract；config: cell escaping；doctor: D6 source+bad config；gate: C1 id-pattern；spec-runner: flag>config>default），无冲突，全部有 CAS stamp。
      ② 批准 KB 写回（P9，随归档执行）：truth/{gate,spec-runner,check,doctor}.md 的 Contract 节按最终实现更新（gate: +--id-pattern flag/checkBinding 签名；spec-runner: +resolveIdPattern/makeIdMatcher/CHILD_SPAWN_OPTS/matcherFailureMsg 导出、DEFAULT_ID 迁 config 再 re-export、collect/parseTap 可选 matcher 参数；check: CK-04 复用 leadId+matcher、新 exit 2 类；doctor: D6 先于 D5 执行、来源 detail、坏配置 finding），Decisions 节各追加本 change 决策（来源差异化安全契约：config 来源子进程匹配+残余风险声明；`\|` 奇偶转义为 config-contract 语义扩展）；config 模块无 truth doc（是否新建由你定）。source-commit 刷新需先有实现提交——即你的验收提交之后。
      ③ 注意项：gate C6 当前 BLOCKED（truth/doctor.md stamp bfadb12 落后 1 commit）系本 change 之前的存量陈旧（开工预检已记录），KB 写回时一并刷新即清；工作区未提交（per goal 不 commit），全部改动与证据可先 diff 验收。
      ④ 决定选项：批准归档+KB 写回 / 要求修改后再呈 / 驳回。
  - 2026-08-13T01:51 note: change scaffolded by `apriori new`
  - 2026-08-13T01:52 consolidation (owner, verbatim): 「本 goal 预授权：gate②（gap-report 放行）、gate③（技术评审并入 P8 轮次）可自决通过并留痕；gate⑤（cap 触顶/振荡）按 RUNBOOK 呈报格式写入 flow-state 后可选保守方案继续；gate④（KB 签收/归档批准）不在授权范围——每个 change 走到 STEP6 归档前停下，把 gate④ packet 留在 flow-state 里，继续下一个 change 的 STEP0（归档动作全部留给我回来批）。撤销方式：我任意时刻声明即失效。」另：不 commit、不 push——全部改动留工作区，代码与文档的提交由我验收后执行。分支就在 main 工作区改（不开新分支，因为不 commit）。
  - 2026-08-13T01:52 note: KB 预检——gate/spec-runner/archive-merge 三份 truth 均新鲜（source-commit 落后 0）；doctor/update 各落后 1 commit，与本 change 无关，留待各自 change 处理。config 模块无 truth doc（历史如此）。
  - 2026-08-13T06:12 gate③（按 goal 预授权并入 P8 轮次）: STEP2 已以 "VERDICT: no major issues, ready to proceed to execution"（r6）收敛，SPEC-1..8 全 verified；medium tier 的 STEP3 异步 look-over 按预授权并入 STEP5 的 P8 一致性评审轮（P8 评审员将同时看到 spec/design 与实现）；STEP4 无 DESIGN-REVIEW-DOC 变更可应用，跳过。DESIGN-REVIEW-DOC = review/spec-review-v1..v6.md 全套。
  - 2026-08-13T05:32 gate⑤（cap 触顶呈报，按 goal 预授权自决）: STEP2 P5 已跑满 step2-cap=4 未收敛。verdict 序列 verbatim："VERDICT: 5 issues open"→"VERDICT: 4 issues open"→"VERDICT: 4 issues open"→"VERDICT: 3 issues open"。账本现状：SPEC-1/3/4/5/6 verified；SPEC-2/7/8 open（均为"子进程匹配方案未贯穿到模块级设计、失败分类场景、任务清单"的一致性收尾，非方向分歧）。存在 reopen 事件（SPEC-1 于 r2 复燃、SPEC-2 的 r1 驳回于 r2 被评审驳倒回 open——r5 评审指正后修正本记录，原文"无 reopened ID"不实），但无同一 ID 的反复振荡。决策（保守方案）：落一致性修订后**追加 r5 复核**取得真收敛——多花一轮评审而非带 open 行进 STEP5；理由：轮次曲线单调收敛（5→4→4→3），r4 三条均是机械贯穿而非设计翻案。撤销方式：人类任意时刻声明即失效。
  - 2026-08-13T02:05 note: R2 降级留痕——WSL 侧 codex（session 019ff71c-51bf-7143-a9ae-b96b5559a540）因代理断流死于 verdict 前，resume 两次仍网络不可达；按 goal 预案切 Windows 侧 codex 0.145.0 重开全新评审会话（019ff71f-0d2f-79f3-8a2b-2c4e43cf2834），未自行填写任何 verdict。
  - 2026-08-13T01:52 note: 复盘数据与现实的出入——复盘称默认 id-pattern 下真实样本 12 个 unidentified；实测（2026-08-13，store 现状）为 36 个（字母后缀 12 + AC-BIS-* 多段式 24），store 在复盘取数后继续增长所致。以实测为准，改前证据已存。
