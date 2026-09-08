# req-v2 — hotfix-lane：hotfix 最小回写单元 × 验证强度机械化缩放

target lineage: on-the-fly 分支（HEAD 7b8d5c6，基于 main 10aef21；P0 三 change 已 commit+归档）。产品线 v4；**v3 已完整处于当前谱系**（merge-base HEAD v3 = v3 tip 59289ce，实证）；v1 不是祖先；本 change 不再合并任何独立分支 tip（r1 REQ-2 措辞勘误）。本 change 到 gate③ 为止只产文档（apriori/changes/hotfix-lane/ 下），不 touch lib/bin/test。

## 输入优先级声明

1. owner goal 全文（requirement/goal-verbatim.md，**已全文落盘**——r1 REQ-1 修复）——拍板项高于一切；
2. prior art：hotfix-channel req-v13——**引用的是其经 13 轮收敛的候选空间与契约框架，不是"已裁定的选择"**（该 change 停在 gate②，Q1-Q9 无一被 owner 裁过；r1 REQ-3 修复）。本文一切涉及 prior art 倾向项的推导均为**条件式**（"若裁倾向组合"），其裁定并入本 change 的 gate③ 决策清单；
3. 复盘文档（~/apriori-feedback/）——实证来源，reality wins。

## 背景（实证，复盘缺陷账为据）

- **逃逸实证**：UAT 四单全部逃逸流程；BR-007 已知 spec 漂移；1012769 档案目录零 .md。
- **爆炸半径实证**：修复回归率 3/24 = 12.5%，三条全部同型——改动改变数据形态或契约但只验证触发现象（改 GROUP BY 引入重复项、改前端维度漏改后端、改"最新"口径不同步 bind_status）。
- **trivial 侧实证**：三轮提测 12 单 2 天内流程内修复归档——"走流程=慢"在小 change 上不成立；轻量通道的价值在留痕成本。
- **纯排查实证**：UAT 4 单中 3 单不改代码；测试报单准确率随轮次递减（75%→25%）。
- **验证强度实证**：验证矩阵按项目类型给要求但类型靠 agent 自判；E2E/截图是自觉项；owner 被迫每个提示词重复强调。
- **成本刻度**：hotfix 留痕最小成本必须压到比"不记录"只贵几分钟。

## 目标态 B

### B-A. hotfix 最小回写单元

**A1. 形态**：10 分钟走完的最小 bundle——结论（唯一无条件必填）+ 可选 spec delta + 绑定声明 + 可选 decisions 追加 + 直接归档。三类承接对象：紧急修复事后补记（spec-preserving 零 delta 合法）、纯排查结论、上线后业务事实。

**A2. prior art 候选空间引用（框架采纳、选择待裁）**：身份互斥（hotfix-state/flow-state）、F1/F2 事务两族、签收四候选（a/b/c/d+d1/d2/d3）、绑定声明载体（c1/c1'/c2/c3）与键规则（k1/k2）、truth 回写契约（t/o/s 系列）、KB 生命周期（r/w/λ 系列）——**候选空间与其完整性经 req-v13 十三轮对抗评审收敛（VERDICT 0），本 change 采纳该空间为设计基底；每一项的选择留在 gate③ 决策清单**（本文倾向沿用 req-v13 记载的倾向，均标"倾向待裁"）。
**新拍板对 prior art 的三处取代**（有理由的取代，非引用）：
1. req-v13 Q3 防逃逸（advisory 提示）→ 被爆炸半径**硬准入**取代（A3）；
2. req-v13 AC2 的 BR-007 REMOVED-hotfix 示例 → 被"REMOVED 属契约变化 = R3 不准入"取代（r1 REQ-6；REMOVED 使 store requirement 转 deprecated、停止要求其 scenarios——RUNBOOK 明文的契约变化）；
3. req-v13 的 no-test 全域可用 → 被耦合表按半径限制取代（B-C）。

**A3. 准入按爆炸半径分级（owner 拍板方向）**

**机械可判性的诚实框架（r1 REQ-4 修复——三层信号，能力如实）**：
- **文档面机械信号**（机器对 bundle 字节的硬判定，≠对真实代码的观测）：delta 形状（零/ADDED-only/含 MODIFIED/含 REMOVED|RENAMED）、touched-modules 计数、decisions 条目的模块数与是否 supersession、blast 标注命中（若裁 α/γ）；
- **申报信号**（作者自报，真实性不可机械验证）：change-kind、frontend-touched、touched-modules 的内容本身；
- **申报一致性执行（fail-up 的准确含义）**：机器强制的是**申报内部一致性**——申报与文档面信号矛盾时，取矛盾双方中**更重的级别或 F1 拒绝**（如 change-kind: no-code + 非零 delta = F1；change-kind: trivial + delta 含 MODIFIED = 按文档面信号定级）。申报只能加重、不能减轻文档面信号已确定的级别。
- **诚实边界（正面写明）**：整体瞒报（既不写 delta 也报 no-code 的真实代码修复）机器**不能**拦——补偿链 = 结论强制（1012769 型空白不再可能）+ 归档物审计 + 后续 change 评审天然可见 + spec 漂移最终被 verify/gate 暴露（现有机制）。分级判定判的是申报面，真实半径由申报+补偿链共同承接。

**分级函数（全输入域，r1 REQ-5 修复）**——输入：change-kind ∈ {no-code, code-trivial, code-behavior}（缺失/未知值 = F1 拒绝）、delta 形状、touched-modules（含计数）、decisions 形状、frontend-touched、blast 标注（若裁）：

| 判定次序 | 条件（首个命中即出结果） | 结果 |
|---|---|---|
| 0 | change-kind 缺失/未知；或申报矛盾（no-code+非零 delta / no-code+frontend-touched:yes） | F1 拒绝 |
| 1 | delta 含 REMOVED 或 RENAMED；或 blast 标注命中（若裁 α/γ）；或 touched-modules ≥2；或双端信号（frontend-touched: yes 且 touched-modules 含后端模块——若模块类型表被裁，见 Q-2c；未裁则双端由申报 change-kind 承接）；或 decisions 含 supersession 或跨模块条目（r1 REQ-7——truth 面副作用计入半径；RUNBOOK 现行 Large tripwire 同向） | **R3——拒绝，指路全流程 change** |
| 2 | change-kind = code-behavior；或 delta 含 MODIFIED | R2 |
| 3 | change-kind = code-trivial 且 delta ∈ {零, ADDED-only} 且 touched-modules ≤1 | R1 |
| 4 | change-kind = no-code 且零 delta（decisions 仅限单模块非 supersession 追加 ≤N 条，N 待裁——超出 → R3 行已拦） | R0 |

- "ADDED 澄清类"概念**删除**（不可机械判）——R1 的 delta 上限就是 ADDED-only（新增场景描述不改变既有契约，机器可判形状）。
- β 案（无 blast 标注）的已知盲区如实声明：单模块 MODIFIED 的"改口径"与"改措辞"机器不可分——一律 R2（保守方向：R2 验证下限含强制测试），残余风险由补偿链承接。γ 案标注命中即 R3、缺标注按 β。→ Q-1。

### B-B. 验证强度机械化缩放

**B1. 配置行**：process-config 增 `verification-profile` 行——human-owned、agent 只读、缺省 = 未声明（现状自觉，不升格）。值集候选（Q-2a）：`ui` / `backend` / `fullstack`（= ui∪backend 规则叠加）/ `docs`。
**B2. 升格语义**：声明后，对应证据要求从自觉项升格为对应 tier 的机械退出条件。**各 profile 的升格增量如实标注**（r1 REQ-8）：ui 升格增量 = E2E 工件 + 截图观察记录（大）；backend 升格增量 = 无新增证据类型（现行 verify GREEN 已机械）——其声明价值 = ui 类要求显式关断（n/a 自动成立）+ 未来扩展锚点，如实声明"backend 声明 ≈ 现状"；docs 升格增量 = check 全绿已机械，同理。
**B3. 证据形态（r1 REQ-10 修复——存在性与可判结论分层）**：
- **可机械判结论的证据（存在 + 结论必须 PASS）**：绑定测试（verify GREEN）、E2E 工件（文本化 pass/fail，机器解析结论行，FAIL = 不过退出条件——"只强制存在性"不适用于此类）；
- **人类可查证物（强制存在性，内容人判）**：截图观察记录行（截图文件是仪器留 apriori/tmp/ gitignored——RUNBOOK 现行约束保持；记录行 = 路径 + 一行文本观察 + 时间，归档时查记录行存在与所指文件存在）；
- **显式豁免物（强制存在性 + 理由非空）**：`ui: not-applicable — <理由>` 行；
- **新鲜度**（Q-6 连带）：候选 = 工件时间戳晚于 bundle 最后业务修改 / d1 摘要令牌把工件哈希纳入呈阅（若签收裁 d+d1）/ 不做（诚实弱化）。
- owner 拍板句的准确化：**"强制的是证据存在性"适用于人类可查证物层；可机械判结论的证据强制"存在 + PASS"**；缩放的是覆盖面（全量 vs 受影响增量）。

**B4. "受影响"的机械 scope（r1 REQ-9/REQ-13 修复）**：
- **绑定测试的证明契约（Q-3a）**：候选 i) 归档 preflight 隐式跑 **scoped verify**（scope = delta scenarios ∪ bundle 声明的受影响既有 scenario IDs）——机械 oracle，增量 scope 下耗时可控（req-v13 候选 ii 的收窄版，其"全量耗时"缺点被 scope 化解），**倾向**；ii) 引用既有 verify 证据 + 新鲜度声明（弱，机器不能证明 GREEN 对应当前代码）；iii) 纯自报（最弱，如实列）。零 delta code fix 的 scope = 声明的受影响既有 scenario IDs（申报信号；spec-preserving 意味着行为已被既有 spec 覆盖，受影响 IDs 非空可期；申报空集 + code-kind → 至少跑 touched-modules 的 store scenarios？——候选连带，Q-3a）。
- **ui 分支的进入条件**：`frontend-touched: yes|no` 申报字段；**ui-profile 下缺失 = 默认 yes**（保守默认——要求截图；声明 no 才走 not-applicable 行，理由强制）；真实性不可机械验证（申报信号），谎报 no 的补偿 = not-applicable 理由留痕 + 审计。

### B-C. 耦合决策表（hotfix 验证下限 = profile × 半径；全笛卡尔，r1 REQ-8 修复）

**hotfix 通道（R3 不准入，无行）：**

| 半径 \ profile | 未声明 | backend | docs | ui / fullstack（fullstack = 本表 ∪ backend 列） |
|---|---|---|---|---|
| R0 no-code | 结论即全部 | 同左 | 同左 | 同左（frontend-touched 与 no-code 矛盾 = F1，见 A3 次序 0） |
| R1 code-trivial | 受影响绑定测试绿（Q-3a 机制）**或** no-test 理由（仅当有 delta——零 delta 无债务载体，见下） | 同左 | 同左 | 同左 **+** frontend-touched:yes → ≥1 受影响页面截图观察行；no → not-applicable 行 |
| R2 code-behavior | 受影响绑定测试绿（**no-test 不可用**，Q-4） | 同左 | 同左 | 同左 **+** 截图观察行 / not-applicable 行（同 R1 ui 规则） |

- **R1 零 delta 的 no-test 诚实化（r1 REQ-12 修复）**：g1 债务逼偿的载体是 UNBOUND scenario——**零 delta 时载体不存在**。故：有 delta 的 R1 可选 no-test（债务照 g1 机制可见可逼偿——若 prior art g1 被裁）；**零 delta code fix 无 no-test 选项**——其下限就是 Q-3a 机制下的受影响既有 scenario 测试；若受影响 IDs 申报为空，候选：接受（结论+审计承接，诚实无机械逼偿）或强制非空（申报空集 = F1）→ Q-3b。不再声称"零 delta no-test 有 g1 防线"。

**正式流程（同表同下限，r1 REQ-11 修复——半径先于 tier）：**

| 半径 | 允许的正式 tier | 验证下限 |
|---|---|---|
| R0/R1 | trivial（或以上） | 同 hotfix 对应行（同一张表——通道无套利） |
| R2 | **medium 起**（候选 Q-5：现行 trivial 定义"bugfix/single file"与 R2 重叠——本 change 给 trivial 准入加半径前置：R2 bugfix 走 medium 或走 hotfix（hotfix 反而有 tests 强制）；或保持现行 trivial 并接受 hotfix/trivial 下限差异并如实标注） | 现行矩阵 + profile 升格项（增量覆盖） |
| R3 | medium/large | 现行全量矩阵 + profile 升格项（ui：全量 E2E + 截图证据） |

## 范围外（won't do）

- P2-10 raw 瘦身不动；P1 五问/假设登记不动；RUNBOOK 仅新增节/表不重构既有章节；本 change 不产实现代码；沿用 req-v13 全部 won't-do（AM-17 不动、不自动互转、三态不动等——作为候选空间的一部分待裁采纳）。

## 验收标准

**AC-D 层（gate③ packet 自身）**：
- AC-D1：分级函数全输入域覆盖（判定次序表 + 每级正反例 ≥1 个从缺陷账映射：R3 反例 = GROUP BY/双端/口径三案；R1 正例 = 文案/配置类；R0 = UAT 纯排查三单之一；F1 = 矛盾申报例）。
- AC-D2：profile×半径表全笛卡尔无空格（n/a 显式）；每格论证含 ≥1 处"为什么不是别的切法"对比。
- AC-D3：耦合规则覆盖 {R0,R1,R2,R3}×{未声明,backend,docs,ui,fullstack}×{hotfix,trivial,medium/large}，无未定义组合。
- AC-D4：spec delta 草案覆盖 RUNBOOK 新节（hotfix lane + 缩放表）双语、process-config 模板行、未来 CLI 检查点的 scenario 级描述（不含实现）。
- AC-D5：决策摘要页显式列全 owner 待拍板点（本文 Q-* + prior art 待裁项归并）。
- AC-D6：prior art 采纳/取代关系逐条列明（A2：框架采纳+三处取代+理由）。
**AC-I 层（未来实现 change 的验收基线，本 change 只定义）**：分级函数正反例与 F1 例、config 行解析与缺省、耦合表逐格机械检查（含 E2E FAIL 拒绝、截图记录行存在性、not-applicable 理由非空）、Q-3a 机制的 oracle、既有 gate/verify 行为回归——细化归 STEP2。

## 开放问题（gate③ owner 必答）

- **Q-1**：R3 契约信号载体 α（spec 块 blast 标注——需 spec 书写新约定）/β（纯文档面形状，单模块 MODIFIED 盲区如实）/γ（混合：标注命中即 R3、缺标注按 β）——倾向 γ。
- **Q-2**：a) profile 值集（ui/backend/fullstack/docs）；b) backend/docs 声明"≈现状"的如实定位是否接受；c) 是否引入模块→前端/后端类型表（机械化双端判定的前提；不引入则双端靠申报）。
- **Q-3**：a) 绑定测试证明契约 i（隐式 scoped verify，倾向）/ii（证据引用）/iii（自报）；b) 零 delta code fix 申报空受影响集：接受（审计承接）或 F1 强制非空。
- **Q-4**：R2 禁用 no-test（倾向禁用——修复回归 3/24 的教训面）。
- **Q-5**：正式 trivial tier 的半径前置（R2 bugfix 不得走 trivial）——收紧现行 trivial 准入，是否接受。
- **Q-6**：证据新鲜度机制（时间戳/纳入 d1 令牌/不做）。
- **Q-7**：runbook-version 4.0→4.1。
- **Q-8**：prior art（req-v13）候选空间的逐项裁定——清单以其 Q1-Q9 为准（签收/位置/ID 归属/载体/键/仓域/生命周期等），随 gate③ 决策摘要一并呈。
- **Q-9**：hotfix-channel bundle 去留（本 change 取代其范围）。
- **Q-10**：R0 的 decisions 追加上限 N（单模块非 supersession 条数）。

## 需求裁定记录（对 r1，13 条）

- REQ-1：goal 全文已原样落盘 goal-verbatim.md（含粘贴重复段的如实注记）；"goal §C"引用改指该文件。
- REQ-2：lineage 措辞勘误——v3 已在谱系（merge-base 实证 59289ce）；"不合并"改为"不再合并任何独立分支 tip"。
- REQ-3：A2 重写——引用候选空间与框架而非"已收敛选择"；一切倾向标"待裁"；Q-8 承接逐项裁定。
- REQ-4：信号三层诚实框架（文档面/申报/一致性执行）；fail-up 重述为申报一致性（只能加重）；整体瞒报机器不能拦 + 补偿链正面写明。
- REQ-5：分级函数全输入域判定次序表；"ADDED 澄清类"删除；缺失/未知/矛盾 = F1；β 盲区如实 + γ 缺标注落 β。
- REQ-6：REMOVED/RENAMED 一律 R3；prior art BR-007 示例声明为被取代（A2 取代清单 2）。
- REQ-7：decisions 形状计入半径（supersession/跨模块 = R3；R0 仅限单模块非 supersession ≤N 条）。
- REQ-8：耦合表全笛卡尔重制（docs/fullstack 列、正式流程半径映射表）；backend/docs 升格增量"≈现状"如实标注。
- REQ-9：ui 分支进入条件 = frontend-touched 申报字段 + ui-profile 缺失默认 yes（保守）+ 真实性不可验证如实声明。
- REQ-10：证据分三层——可机械判结论者强制存在+PASS（E2E FAIL 不过）；人类可查证物强制存在性；豁免物强制理由非空；新鲜度候选入 Q-6；owner 拍板句准确化。
- REQ-11：半径先于 tier——正式 trivial 的半径前置候选（Q-5）；"同一张表"限定于 R0/R1。
- REQ-12：零 delta 无债务载体如实——零 delta code fix 无 no-test 选项；空受影响集处置入 Q-3b。
- REQ-13：绑定测试证明契约显式三候选（Q-3a，倾向隐式 scoped verify——req-v13 候选 ii 的 scope 收窄版）；零 delta 的 scope 定义与空集处置。
