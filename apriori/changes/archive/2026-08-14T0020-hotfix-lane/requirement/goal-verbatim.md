<!-- owner /goal 全文原样落盘（2026-08-13）；此文件是最高优先输入的审计基准。
     原文粘贴即含一处重复：第一个 "## A." 节第三个要点在「3 单不改代码，」处中断，
     跳回开头第二行「与验证强度的机械化缩放……」并把「# 仓库当前状态」至「## A.」
     整段重复一遍后，从「今天没有归档的地方）」接续。以下按收到字节忠实保留该重复。 -->

开一个新 change `hotfix-lane`，按 RUNBOOK 走 STEP0 → STEP2 → 停在 gate③：
产出经异构评审收敛的需求与设计包呈报给我，**不写任何实现代码**。
这个 change 同时解决两个此前分开列的问题——hotfix 最小回写单元（总复盘 §六 P0-4）
与验证强度的机械化缩放——因为它们是一个问题的两半：hotfix 定义轻量路径，
缩放规则定义轻量路径上验证的下限。分开做会留下"轻量通道零验证"的窗口期。

# 仓库当前状态（重要，先确认再开工）
- 工作区有 15 文件 +976/-99 的未 commit 改动（P0 三个 change 的实现，已验收中）——
  **不要碰它们**。本 change 到 gate③ 为止只产出 apriori/changes/hotfix-lane/ 下的
  文档，不 touch lib/ bin/ test/，天然隔离。
- 三个 change（gate-id-pattern、verify-change-scope、modified-block-integrity）
  停在 gate④ 待批未归档——本 change 与它们并行。正好用刚实现的
  verify-change-scope 的 change 作用域语义自证：你的 gate/verify 应各自独立判定。
- 复盘文档在 ~/apriori-feedback/（总复盘为入口）；真实棕地样本
  /mnt/d/agent-base/t_just-projects/apriori/ 只读铁规矩不变
  （CLI 复现可靠；看内容走 Bash cat，不用 Read/Edit 碰 /mnt/d）。

# 本 change 要回答的问题（这些是作者讨论后新定的输入，优先级高于复盘原文）

## A. hotfix 最小回写单元
- 形态目标：10 分钟走完的最小 bundle——结论 + spec delta + 绑定测试
  （或显式 no-test 理由）+ 直接归档。门槛必须低到比"不记录"只贵几分钟，
  否则照样被逃逸（实证：棕地 UAT 四单全部逃逸，spec 已知漂移，一单档案空白）。
- **准入标准按爆炸半径分级**（作者已拍板的方向）：设计要给出机械可判的分级
  标准——什么改动配走 hotfix 通道、什么必须回全流程。分级依据从复盘的
  缺陷账里找（哪类改动的修复曾引入新缺陷=爆炸半径大：改契约、改数据形态、
  改选取口径；哪类是真 trivial：文案、配置、单出口的展示）。
- 还要承接**"结论是不用修"的纯排查**（棕地 UAT 4 单里 3 单不改代码，
与验证强度的机械化缩放——因为它们是一个问题的两半：hotfix 定义轻量路径，
缩放规则定义轻量路径上验证的下限。分开做会留下"轻量通道零验证"的窗口期。

# 仓库当前状态（重要，先确认再开工）
- 工作区有 15 文件 +976/-99 的未 commit 改动（P0 三个 change 的实现，已验收中）——
  **不要碰它们**。本 change 到 gate③ 为止只产出 apriori/changes/hotfix-lane/ 下的
  文档，不 touch lib/ bin/ test/，天然隔离。
- 三个 change（gate-id-pattern、verify-change-scope、modified-block-integrity）
  停在 gate④ 待批未归档——本 change 与它们并行。正好用刚实现的
  verify-change-scope 的 change 作用域语义自证：你的 gate/verify 应各自独立判定。
- 复盘文档在 ~/apriori-feedback/（总复盘为入口）；真实棕地样本
  /mnt/d/agent-base/t_just-projects/apriori/ 只读铁规矩不变
  （CLI 复现可靠；看内容走 Bash cat，不用 Read/Edit 碰 /mnt/d）。

# 本 change 要回答的问题（这些是作者讨论后新定的输入，优先级高于复盘原文）

## A. hotfix 最小回写单元
- 形态目标：10 分钟走完的最小 bundle——结论 + spec delta + 绑定测试
  （或显式 no-test 理由）+ 直接归档。门槛必须低到比"不记录"只贵几分钟，
  否则照样被逃逸（实证：棕地 UAT 四单全部逃逸，spec 已知漂移，一单档案空白）。
- **准入标准按爆炸半径分级**（作者已拍板的方向）：设计要给出机械可判的分级
  标准——什么改动配走 hotfix 通道、什么必须回全流程。分级依据从复盘的
  缺陷账里找（哪类改动的修复曾引入新缺陷=爆炸半径大：改契约、改数据形态、
  改选取口径；哪类是真 trivial：文案、配置、单出口的展示）。
- 还要承接**"结论是不用修"的纯排查**（棕地 UAT 4 单里 3 单不改代码，
  今天没有归档的地方）：no-code 形态的 hotfix bundle 长什么样。

## B. 验证强度的机械化缩放（profile × tier 二维）
- 现状问题：RUNBOOK 验证矩阵按"项目类型"给要求，但项目类型靠 agent 自判——
  单测有机械强制（verify GREEN），E2E 只对自判为 UI 的项目是自觉项，
  "截图作为人类可查证物"在 RUNBOOK 里根本没有概念。棕地实践中作者被迫
  在每个提示词里重复强调"测试、E2E、Playwright 截图"。
- 设计方向：process-config 增加项目级声明（如 verification-profile: ui|backend|...，
  语义与既有 test-cmd 行一致：human-owned、agent 只读），声明后
  E2E/视觉验证从自觉项升格为对应 tier 的机械退出条件。
- **强制的是证据存在性，缩放的是证据覆盖面**：
  | change 级别 | ui profile 下的要求 |
  | 完整流程 medium/large | 全量 E2E + 截图证据（现状形态）|
  | hotfix / trivial | 增量：只跑受影响 scenario 绑定测试；touch 前端文件时
    至少一张受影响页面截图，单页单截图分钟级 |
  | 纯后端 change | UI 层显式 not-applicable + 理由留痕 |
  这张表是方向不是定稿——设计时逐格论证，发现更好的切法就提出来。
- 与 A 的耦合点要设计清楚：hotfix 通道的验证下限由 profile × 爆炸半径共同决定，
  给出完整的决策表。

## C. 边界（本 change 不做的）
- 不动 raw 存证瘦身（P2-10 维持原优先级；其收益在可审计性与回读上下文成本，
  不在执行速度——已与作者对齐，别顺手做）
- 不动 P1 的评审 prompt 五问/假设登记（另行排期）
- RUNBOOK 的改动范围仅限本 change 设计所需的新节/新表——不重构既有章节

# 流程与停点
- STEP0 对抗评审照常（codex exec -s read-only；失败降级记录"评审缺席"继续）
- tier 自判并在 flow-state 说理由（预计 medium：改 RUNBOOK 语义 + 未来要动
  new/gate 等多处 CLI，但本轮只到设计）
- **硬停点：STEP2 收敛（verdict 通过）后组装 gate③ packet
  （proposal + design + spec delta + ledger），停下等我。不进 STEP4/5。**
- gate②（若 tier 走到）预授权自决通过并留痕；其余授权沿用上一个 goal 的条款：
  不 commit、不 push、样本只读、与我交流中文、机器 token 英文。

# 交付标准
gate③ packet 就绪 + 一页给我的决策摘要：A 的爆炸半径分级表、B 的 profile×tier
决策表、两者的耦合规则、以及设计中你拿不准需要我拍板的点（显式列出，别藏在正文里）。
