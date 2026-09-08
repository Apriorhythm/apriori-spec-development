change: hotfix-channel
tier: large
track: harden
track-rationale: 目标与验收可陈述（复盘 §六-4/5 已给方向与成本刻度）；但触及 RUNBOOK 流程语义 + 新概念 + 新 CLI 面 = 新子系统 → Large，全 gate 照停
lineage: on-the-fly 分支（main 暂不动，owner 指示）；产品线 v4，不合并 v1/v3
current-step: STEP1
round: 13
reviewer-session: 019ff8f0-a6af-7ad1-88fc-551b1b4e45d4   # codex(WSL) gpt-5.6-sol, STEP0
next-action: **SUPERSEDED by hotfix-lane**（gate3-ruling.md §四）——bundle 原样保留：其 req-v13 是 hotfix-lane 的候选空间基线，删除会使引用悬空；本 change 不再推进
artifact-root: .
gates:
  - 2026-08-13T10:18 note: change scaffolded by `apriori new`（on-the-fly 分支）
  - 2026-08-13T10:18 kickoff (owner, verbatim): 「P0-4 hotfix 开始」
  - 2026-08-13T10:18 note: 授权范围——**无关卡合并**。前一 goal 的预授权已随其完成失效，且 owner 当初对 P0-4 的保留条款 verbatim：「它动 RUNBOOK 流程语义，等 P0 前三条归档后我单独开 change，届时设计先行必停人类。」执行口径：STEP0 评审循环照跑（评审非人类关卡）；STEP1 后停 gate②（gap report 呈阅）；STEP2 收敛后停 gate③（设计评审必停）；不 commit 不 push（延续现行纪律，工作区在 on-the-fly）。
  - 2026-08-13T10:18 note: KB 预检——前三 change 的 KB 写回已完成（source-commit 4127653，lib 其后无改动，全新鲜）；本 change 预计触及模块：new（scaffold）/archive-merge（归档路径）/RUNBOOK（流程语义）/gate 或 check（no-test 理由的机械面），STEP1 时逐一核对。
  - 2026-08-13T10:52 note: STEP0·r1 verdict verbatim: 「VERDICT: 9 issues open」（req-review-v1.md + raw）
  - 2026-08-13T11:05 note: STEP0·r2 verdict verbatim: 「VERDICT: 6 issues open」（REQ-1/7/8/9 verified；REQ-2/3/4/5/6 reopened，REQ-10 new；req-review-v2.md + raw；raw 自 codex 会话存档提取，tail 截断已复原）
  - 2026-08-13T11:05 note: 落盘修正（评审 advisory 指出）：issues.md 重建为五列（Risk 列生产方评级加脚注）；next-action 更新
  - 2026-08-13T11:20 note: STEP0·r3 verdict verbatim: 「VERDICT: 6 issues open」（REQ-4/10 verified；REQ-2/3/5/6 reopened，REQ-11/12 new；req-review-v3.md + raw；REQ-6 系我方 gate 编号事实错误，已对 lib/gate.js 实证勘误）
  - 2026-08-13T11:35 note: STEP0·r4 verdict verbatim: 「VERDICT: 5 issues open」（REQ-3/11 verified；REQ-2/5/6/12 reopened，REQ-13 new；req-review-v4.md + raw）
  - 2026-08-13T11:50 note: STEP0·r5 verdict verbatim: 「VERDICT: 5 issues open」（REQ-2/12 verified；REQ-5/6/13 reopened，REQ-14/15 new；req-review-v5.md + raw）
  - 2026-08-13T12:05 note: STEP0·r6 verdict verbatim: 「VERDICT: 2 issues open」（REQ-5/14/15 verified；REQ-6/13 reopened；未新开 ID；req-review-v6.md + raw）
  - 2026-08-13T12:20 note: STEP0·r7 verdict verbatim: 「VERDICT: 2 issues open」（REQ-6/13 再收窄 reopened；未新开 ID；req-review-v7.md + raw）
  - 2026-08-13T12:35 note: STEP0·r8 verdict verbatim: 「VERDICT: 1 issues open」（REQ-6 verified；REQ-13 再收窄；req-review-v8.md + raw）
  - 2026-08-13T12:50 note: STEP0·r9 verdict verbatim: 「VERDICT: 1 issues open」（REQ-13 verified；REQ-16 new——外仓 fix-ref 假 clean；req-review-v9.md + raw）
  - 2026-08-13T13:05 note: STEP0·r10 verdict verbatim: 「VERDICT: 1 issues open」（REQ-16 再收窄——组合契约；req-review-v10.md + raw）
  - 2026-08-13T13:20 note: STEP0·r11 verdict verbatim: 「VERDICT: 1 issues open」（REQ-16 三尾——C6 消费矛盾/λ2 不完整/Q9 摘要未同步；req-review-v11.md + raw）
  - 2026-08-13T13:35 note: STEP0·r12 verdict verbatim: 「VERDICT: 1 issues open」（REQ-16 verified；REQ-17 new——本仓不可观察路径；req-review-v12.md + raw）
  - 2026-08-13T13:50 note: STEP0·r13 verdict verbatim: 「VERDICT: 0 issues open」——六维全 pass，REQ-17 verified；收敛。verdict 序列：9→6→6→5→5→2→2→1→1→1→1→1→0（r1..r13）；账本 17 行全 verified/移除类收口
  - 2026-08-13T13:55 note: STEP1 完成——KB 新鲜度核对（核心五模块 4127653 全新鲜；update.js 轻微滞后记录不处理；new/resolve 无 truth 待 STEP2 裁）；gap-report.md 成稿（G1-G10 + 人类决策清单 + 倾向组合）
  - 2026-08-13T13:55 gate② PENDING: 按执行口径停人类——gap report 呈阅
  - 2026-08-14T22:30 note: superseded——hotfix-lane 的 gate③ 裁定（owner 委托代裁）取代本 change 的范围；本 bundle 停在 gate②，作为 prior art 基线保留，不再推进也不删除
