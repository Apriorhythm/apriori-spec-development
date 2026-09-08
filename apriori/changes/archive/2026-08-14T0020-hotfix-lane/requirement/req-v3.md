# req-v3 — hotfix-lane：hotfix 最小回写单元 × 验证强度机械化缩放

target lineage: on-the-fly 分支（HEAD 7b8d5c6，基于 main 10aef21；P0 三 change 已 commit+归档）。产品线 v4；v3 已完整处于当前谱系（merge-base HEAD v3 = 59289ce，实证）；v1 非祖先；不再合并任何独立分支 tip。本 change 到 gate③ 为止只产文档，不 touch lib/bin/test。

## 输入优先级声明

1. owner goal 全文（requirement/goal-verbatim.md，全文落盘）——拍板项高于一切；
2. prior art：hotfix-channel req-v13——引用候选空间与契约框架（选择均待裁，Q-8 承接）；条件式推导；
3. 复盘文档——实证来源，reality wins。

## 背景（实证）

- 逃逸实证：UAT 四单全部逃逸；BR-007 已知漂移；1012769 档案零 .md。
- 爆炸半径实证：修复回归率 3/24，三条全部同型（改 GROUP BY/改前端维度漏后端/改"最新"口径）——**全部是 MODIFY 型口径/形态变更，无一是 ADDED 型扩展**（此区分入 A3 论证）。
- trivial 侧实证：12 单 2 天流程内归档——"走流程=慢"在小 change 不成立。
- 纯排查实证：UAT 3/4 单不改代码；报单准确率 75%→25% 递减。
- 验证强度实证：矩阵按项目类型给要求但类型 agent 自判；E2E/视觉是自觉项；**RUNBOOK 已有"截图作仪器+持久化文本观察"概念（STEP4 节）——缺的是机械退出条件与持久证据形态**（r2 REQ-17 勘误措辞）；owner 被迫每个提示词重复强调。
- 成本刻度：留痕最小成本比"不记录"只贵几分钟。

## 目标态 B

### B-A. hotfix 最小回写单元

**A1. 形态**：10 分钟最小 bundle——结论（唯一无条件必填）+ 可选 spec delta + 绑定声明 + 可选 decisions + 直接归档。三类承接：紧急修复事后补记（spec-preserving 零 delta 合法）、纯排查结论、业务事实。

**A2. prior art 候选空间引用（框架采纳、选择待裁，Q-8）**：身份互斥、F1/F2 事务两族、签收候选（a/b/c/d+d1..d3）、声明载体（c 系）与键规则（k 系）、truth 契约（t/o/s 系）、KB 生命周期（r/w/λ 系）。
**新拍板取代清单（4 处）**：①防逃逸 advisory→硬准入；②BR-007 REMOVED 示例→REMOVED=R3；③no-test 全域可用→按半径限制；④**hotfix 通道的 spec-vs-code 一致性防线让渡显式化（r2 REQ-4）**：hotfix 无 P8/无评审轮——**瞒报型漂移（真实代码修复不写 delta 报 no-code、旧测试仍绿）在通道内没有机械防线，verify/gate 也不会暴露它**（verify 只判 spec↔测试绑定，不判代码↔spec 语义——补偿链的"verify/gate 最终暴露"声明删除）。承接 = 结论强制 + 归档物审计 + 后续正式 change 的评审天然可见（人的环节）+ 可选的 R2 单轮异构点检候选（Q-11）。

**A3. 准入按爆炸半径分级**

**信号三层框架**（同 v2：文档面机械信号 / 申报信号 / 申报一致性执行 fail-up——申报只能加重不能减轻）。诚实边界：整体瞒报机器不能拦，承接见 A2-④。

**字段契约（r2 REQ-5 修复——requiredness/合法值/malformed 先行，F1 谱完备）**：

| 字段 | requiredness | 合法值 | malformed/矛盾 → F1 |
|---|---|---|---|
| change-kind | 必填 | no-code / code-trivial / code-behavior | 缺失、未知值 |
| touched-modules | code-* 必填；no-code 必须**不出现** | 既有 store/truth 模块词表的非空无重复列表 | code-* 下缺失/空/未知模块/重复/格式非法；no-code 下出现（矛盾） |
| fix-ref | 与 touched-modules 成对（prior art 定位头契约，待裁项按引用） | 仓域标记格式（本仓/外仓） | 半缺、空值、格式非法 |
| frontend-touched | profile ∈ {ui, fullstack} 时必填；其他 profile 下必须不出现 | yes / no | ui/fullstack 下缺失、未知值；其他 profile 下出现；no-code + yes（矛盾） |
| delta | 可选 | 现行 delta parser 可解析 | 不可解析 |
| decisions | 可选 | prior art B3 契约（module 头、格式） | malformed、模块缺失、不可计数 |
| affected-scenario-ids | code-* 必填（Q-3 机制的 scope 输入） | 既有 store scenario ID 或本 delta scenario ID 的非空列表 | code-* 下缺失/空（**空集 = F1**，见 B4）/未知 ID |

以上任一 F1 命中 = 归档拒绝零写入（与 prior art F1 族同构）。**分级函数只定义在通过字段契约的合法输入上**，判定次序（首个命中即出）：

| 次序 | 条件 | 结果 |
|---|---|---|
| 1 | delta 含 REMOVED 或 RENAMED；或 blast 标注命中（若裁 α/γ）；或 touched-modules ≥2；或 decisions 含 supersession、跨模块、或**单模块条数 > N**（N 参数化待裁 Q-10，条件显式入函数——r2 REQ-7 修复）；或（若裁模块类型表 Q-2c）frontend-touched:yes 且 touched-modules 含后端模块 | **R3 拒绝——指路全流程 change** |
| 2 | delta 非零（含 MODIFIED 或 **ADDED**——r2 REQ-14 修复：ADDED 向 living store 追加规范性要求 = 契约扩展，非"不改契约"；但缺陷账回归三案全部是 MODIFY 型口径变更、无一 ADDED 型——扩展的回归特征与变更不同，且 ADDED scenario 的绑定测试可被机械强制，故 ADDED 归 **R2**（强制测试）而非 R3；论证入 AC-D1）；或 change-kind = code-behavior | R2 |
| 3 | change-kind = code-trivial（此时必然零 delta——非零已被次序 2 截获）且 touched-modules = 1 | R1 |
| 4 | change-kind = no-code（此时必然零 delta——no-code+delta 已是 F1；decisions 已被次序 1 约束） | R0 |

- **R1 = 零 delta 的 trivial code fix**（文案/配置/单出口展示不动 spec——比 v2 更紧：任何 delta ≥ R2）。推论：**no-test 选项在 hotfix 通道内彻底消失**——R1 零 delta 无债务载体（v2 REQ-12 结论的推广）、R2 强制测试（Q-4）、R0 无代码。no-test 理由行仅存于正式流程的现行语义，hotfix 不提供（goal 原文"或显式 no-test 理由"在分级细化后收敛于此——列入决策摘要供 owner 确认，Q-4 扩）。
- β 盲区如实：单模块 MODIFIED 的"改口径 vs 改措辞"机器不可分——一律 R2；γ 案标注命中即 R3。→ Q-1。

### B-B. 验证强度机械化缩放

**B1. 配置行**：process-config 增 `verification-profile`——human-owned、agent 只读、缺省=未声明不升格。值集（Q-2a）：ui/backend/fullstack/docs。
**B2. 升格语义与各 profile 增量（如实）**：ui = E2E 工件+截图观察记录（**适用于 medium/large 全量档**；hotfix/trivial 增量档的 ui 证据 = 绑定测试+受影响页截图，**E2E 显式 n/a**——r2 REQ-15 修复，与 owner 原文增量格一致）；backend = 无新增证据类型（≈现状，声明价值 = ui 类要求显式关断+扩展锚点，如实）；docs = check 全绿已机械（≈现状）。
**B3. 证据三层**：可机械判结论者（verify GREEN、E2E 工件 PASS 行——FAIL = 不过）；人类可查证物（截图观察记录行）；显式豁免物（not-applicable + 理由非空）。
**截图证据的存续期契约（r2 REQ-17 修复）**：候选 π1) **仪器性质保持（倾向）**——截图文件留 apriori/tmp/（可清理），**可查证时点 = 归档前的人类签收呈阅**（若签收裁 d：dry-run 呈阅时批准者当场可查看截图，批准后可查证价值已兑现）；永久留档物 = 观察记录行（路径+一行观察+时间）；如实声明：归档后图片不可复查。π2) 截图拷贝入 bundle 归档——与现行"产物不入库"约束冲突、仓库膨胀，如实列。π3) 哈希+外部路径声明——可证曾在、不可复查，弱。→ Q-6 扩。
**新鲜度**：时间戳 / 纳入 d1 令牌摘要 / 不做——Q-6。

**B4. 受影响 scope 的机械契约（r2 REQ-13 修复——弱候选按拍板处置）**：
- 证明契约（Q-3a）：**i) 归档 preflight 隐式跑 scoped verify（scope = delta scenarios ∪ affected-scenario-ids）——机械 oracle，倾向**；ii) 证据引用+新鲜度——**标注：仅在 owner 明示放弃机械 oracle 时合法**（机器不能证明 GREEN 对应当前代码）；~~iii 纯自报~~——**移出候选空间**（与"机械退出条件"拍板正面冲突）。
- 零 delta code fix 的 scope：affected-scenario-ids 必填非空（字段契约已定：**空集 = F1**——r2 裁定唯一化；spec-preserving 意味着行为已被既有 spec 覆盖，无可申报 ID = spec 盲区，指路"补 ADDED delta 走 R2 或走全流程"）。
- ui 分支进入：frontend-touched 申报 + ui/fullstack 下缺失 = F1（字段契约收紧后不再需要"默认 yes"——必填即无缺失态）；真实性不可机械验证如实，谎报补偿 = not-applicable 理由留痕+审计。

### B-C. 耦合决策表

**覆盖面优先级声明（r2 REQ-15 修复）**：**覆盖面由 channel/tier 决定**（hotfix 与 trivial tier = 增量档；medium/large = 全量档——owner 原文方向）；**半径决定准入**（进哪条 channel/tier 合法）；**profile 决定证据类型**。三者正交，无静默改写。

**hotfix 通道（增量档；R3 不准入）：**

| 半径 \ profile | 未声明 | backend | docs | ui / fullstack（fullstack = 本列 ∪ backend 列） |
|---|---|---|---|---|
| R0 no-code | 结论即全部 | 同左 | 同左 | 同左（frontend-touched 不出现——字段契约） |
| R1 零 delta trivial | scoped verify GREEN（scope = affected-scenario-ids） | 同左 | **check 全绿**（docs 无测试语义——r2 REQ-16 修复；hotfix 无 P8 的让渡同 A2-④ 声明） | 同未声明列 + frontend-touched:yes → ≥1 受影响页截图观察行；no → not-applicable 行（理由非空） |
| R2 含 delta 或 code-behavior | scoped verify GREEN（含 delta 新 scenario 的绑定；no-test 无此选项） | 同左 | check 全绿 + delta 场景照常入 store（docs 项目 delta 即文档） | 同未声明列 + 截图规则同 R1 ui 格；E2E n/a（增量档） |

**正式流程（半径决定 tier 准入下限；tier 决定覆盖档）：**

| 半径 | tier 准入 | 验证档 |
|---|---|---|
| R0/R1 | trivial 起 | trivial = 增量档（同 hotfix 对应行同一张表——无通道套利）；自愿走 medium/large = 全量档 |
| R2 | **medium 起（Q-5：现行 trivial 定义与 R2 重叠——收紧 trivial 准入加半径前置）**；或走 hotfix（增量档但测试强制） | medium/large = 全量档：现行矩阵 + profile 升格项（ui：全量 E2E + 截图证据为机械退出条件） |
| R3 | medium/large | 全量档同上 |

## 范围外（won't do）

同 v2（P2-10 不动、五问不动、RUNBOOK 仅新增、不产实现代码、prior art won't-do 随候选空间待裁采纳）。

## 验收标准

**AC-D 层**：
- AC-D1：分级函数 = 字段契约表 + 判定次序表，全域覆盖；每级正反例 ≥1 从缺陷账映射（R3 = GROUP BY/双端/口径三案；R2-ADDED 论证 = 回归三案零 ADDED 型的实证引用；R1 = 文案/配置；R0 = UAT 纯排查单；F1 = 矛盾申报例）。
- AC-D2：耦合表全笛卡尔无空格（n/a 显式）；每格 ≥1 处切法对比论证。
- AC-D3：{R0..R3}×{未声明,backend,docs,ui,fullstack}×{hotfix,trivial,medium/large} 全覆盖唯一预期；覆盖面/准入/证据类型三正交声明。
- AC-D4：spec delta 草案覆盖 RUNBOOK 新节双语、config 模板行、未来 CLI 检查点 scenario 级描述。
- AC-D5：决策摘要显式列全待拍板点（Q-1..Q-11 + Q-8 内嵌 prior art 清单）。
- AC-D6：prior art 采纳/取代（4 处）逐条理由。
**AC-I 层（定义不执行）**：字段契约 F1 全谱正反例、分级正反例、config 解析与缺省、耦合表逐格 oracle（E2E FAIL 拒绝、截图记录行存在性、not-applicable 理由非空、docs 列 check oracle）、scoped verify 机制、既有 gate/verify 回归。

## 开放问题（gate③ owner 必答）

- **Q-1**：R3 契约信号载体 α/β/γ——倾向 γ。
- **Q-2**：a) profile 值集；b) backend/docs "≈现状"定位接受；c) 模块类型表引入与否（双端机械判定前提）。
- **Q-3**：绑定测试证明契约 i（隐式 scoped verify，倾向）/ii（仅 owner 明示放弃机械 oracle 才合法）；iii 已移出。
- **Q-4**：a) R2 禁 no-test；b) **hotfix 通道整体无 no-test**（A3 推论——goal 原文含"或显式 no-test 理由"，分级细化后该选项自然消失，请确认）。
- **Q-5**：正式 trivial 半径前置（R2 不得 trivial）。
- **Q-6**：a) 截图存续期 π1（呈阅时点可查证，倾向）/π2（入库）/π3（哈希）；b) 证据新鲜度机制。
- **Q-7**：runbook-version 4.0→4.1。
- **Q-8**：prior art 候选空间逐项裁定（req-v13 Q1-Q9 清单随决策摘要呈）。
- **Q-9**：hotfix-channel bundle 去留。
- **Q-10**：R0/R3 界的 decisions 单模块条数上限 N。
- **Q-11**：R2 hotfix 是否附加单轮异构点检（分钟级成本）作为无 P8 的部分补偿——候选：不加（倾向，靠 A2-④ 承接链）/加。

## 需求裁定记录

对 r1（13 条）：见 req-v2 文末。

对 r2（8 条）：
- REQ-4：补偿链删除"verify/gate 暴露"虚假保证；瞒报无机械防线正面声明（A2-④）；Q-11 点检候选新增。
- REQ-5：字段契约表先行（requiredness/合法值/malformed F1 全谱）；分级函数只定义在合法输入上；v2 的矛盾穿透（no-code+modules=1 等）由字段契约拦截。
- REQ-7：decisions 单模块条数 > N 显式入判定次序 1（参数化）。
- REQ-13：iii 纯自报移出候选空间；ii 标"仅 owner 明示放弃机械 oracle 合法"；零 delta 空受影响集 = F1 唯一化（指路补 delta 或全流程）。
- REQ-14：ADDED = 契约扩展如实承认；按缺陷账实证（回归三案零 ADDED 型）与可机械强制绑定论证归 R2 而非 R3；R1 收紧为零 delta；推论 hotfix 无 no-test（Q-4b 请 owner 确认）。
- REQ-15：覆盖面/准入/证据类型三正交声明；ui hotfix 格 E2E 显式 n/a（与 owner 原文增量格对齐）；正式流程表重写（tier 决定档、半径决定准入）。
- REQ-16：docs 列 oracle = check 全绿（不复用测试格）；hotfix 无 P8 让渡声明覆盖 docs。
- REQ-17：背景措辞勘误（RUNBOOK 已有截图仪器概念）；存续期契约 π1/π2/π3 候选（倾向 π1：呈阅时点可查证+观察行永久留档+归档后不可复查如实声明）。
