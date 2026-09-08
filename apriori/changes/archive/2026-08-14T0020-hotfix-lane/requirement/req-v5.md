# req-v5 — hotfix-lane：hotfix 最小回写单元 × 验证强度机械化缩放

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
- 验证强度实证：矩阵按项目类型给要求但类型 agent 自判；E2E/视觉是自觉项；**RUNBOOK 已有"截图作仪器+持久化文本观察"概念（STEP5/P7 处——r4 勘误）——缺的是机械退出条件与持久证据形态**（r2 REQ-17 勘误措辞）；owner 被迫每个提示词重复强调。
- 成本刻度：留痕最小成本比"不记录"只贵几分钟。

## 目标态 B

### B-A. hotfix 最小回写单元

**A1. 形态**：10 分钟最小 bundle——结论（唯一无条件必填）+ 可选 spec delta + 绑定声明 + 可选 decisions + 直接归档。三类承接：紧急修复事后补记（spec-preserving 零 delta 合法）、纯排查结论、业务事实。

**A2. prior art 候选空间引用（框架采纳、选择待裁，Q-8）**：身份互斥、F1/F2 事务两族、签收候选（a/b/c/d+d1..d3）、声明载体（c 系）与键规则（k 系）、truth 契约（t/o/s 系）、KB 生命周期（r/w/λ 系）。
**新拍板取代清单（3 处）**：①防逃逸 advisory→硬准入；②BR-007 REMOVED 示例→REMOVED=R3；③no-test 全域可用→按半径限制。
**评审维度是显式待裁项，非既成事实（r3 REQ-22 修复）**：owner goal 未拍板移除一致性评审；prior art 的"hotfix 有意无 R2 评审轮"也只是待裁候选。本 change 把 hotfix 通道的评审强度列为**两个正交待裁轴（r4 REQ-26 重构——原 E1/E2 集合重合已并）**：
- **轴一 code-review-scope ∈ {none, R2, all-code}**：none = 全免（后果如实：瞒报型漂移——真实代码修复不写 delta 报 no-code、旧测试仍绿——通道内无任何机械或评审防线，verify/gate 不会暴露，承接只剩结论强制+审计+后续正式 change 评审可见）；R2 = 白名单 delta 与 code-behavior 单轮异构点检（分钟级）；all-code = R1 也点检（成本三类全覆盖，如实列）。
- **轴二 docs-P8 ∈ {retain, waive}**：retain = docs profile 的 hotfix 保留单轮 P8（state A 的 docs oracle 是 check+P8 组合）；waive = 只剩 check（显式接受砍一半 oracle）。
- 合法组合 = 两轴全笛卡尔 6 格；每 radius×profile 的评审要求由两轴唯一给出（入 AC-D3）。倾向 {R2}×{retain}。verify 不判代码↔spec 语义（如实声明保持）。

**A3. 准入按爆炸半径分级**

**信号三层框架**（同 v2：文档面机械信号 / 申报信号 / 申报一致性执行 fail-up——申报只能加重不能减轻）。诚实边界：整体瞒报机器不能拦，承接见 评审维度节。

**字段契约（r2 REQ-5 修复——requiredness/合法值/malformed 先行，F1 谱完备）**：

| 字段 | requiredness | 合法值 | malformed/矛盾 → F1 |
|---|---|---|---|
| change-kind | 必填 | no-code / code-trivial / code-behavior | 缺失、未知值 |
| touched-modules | **本 change 提案：code-* 必填**（分级函数需其计数——r3 REQ-19：此为对 prior art Q9 必填/选填待裁项的显式提案，非预裁；若 owner 裁选填案，分级 fallback = 缺失即 R3 保守）；no-code 必须**不出现** | 既有 store/truth 模块词表的非空无重复列表 | code-* 下（必填案）缺失/空/未知模块/重复/格式非法；no-code 下出现（矛盾） |
| fix-ref | 与 touched-modules 成对（prior art 定位头契约，待裁项按引用） | 仓域标记格式（本仓/外仓） | 半缺、空值、格式非法 |
| frontend-touched | **code-\* 且 profile ∈ {ui, fullstack} 时必填（r4 REQ-24 修复）；no-code 或其他 profile 下必须不出现** | yes / no | 应出现而缺失、未知值；应不出现而出现 |
| delta | 可选 | 现行 delta parser 可解析 | 不可解析 |
| decisions | 可选 | prior art B3 契约（module 头、格式） | malformed、模块缺失、不可计数 |
| affected-scenario-ids | code-* 必填（Q-3 机制的 scope 输入） | 既有 store scenario ID 或本 delta scenario ID 的非空列表 | code-* 下缺失/空（**空集 = F1**）/未知 ID/**申报 ID 在 store 中存在多 occurrence（duplicate）——按 prior art k1 案 F1 拒绝（k2 复合键案则要求 requirement+occurrence 定位；随 Q-8 的 k 裁定联动——r3 REQ-20）** |

**跨字段不变量（r3 REQ-5 修复——显式 F1 表，不靠判定行括注）**：no-code + 非零 delta = F1；no-code + touched-modules/fix-ref/affected-scenario-ids 出现 = F1；no-code + frontend-touched:yes = F1；code-* + 零 delta + affected-scenario-ids 空 = F1（已在字段表）；decisions 出现于任何 change-kind 均合法（R0 是其主载体，半径约束在判定次序 1）。
以上（字段表 + 不变量表）任一命中 = 归档拒绝零写入（与 prior art F1 族同构）。**分级函数只定义在通过双表的合法输入上**，判定次序（首个命中即出）：

| 次序 | 条件 | 结果 |
|---|---|---|
| 1 | delta 含 REMOVED 或 RENAMED；或 **union(touched-modules ∪ delta 触及模块 ∪ decisions 目标模块) ≥2（r4 REQ-25——混合 bundle 总半径按并集计：代码 A 模块+Decision B 模块 = 跨 2 模块）**；或 decisions 含 supersession 或**单模块条数 > N**（N 参数化待裁 Q-10）；或双端信号命中——**有类型表案（Q-2c-有）**：frontend-touched:yes 且 touched-modules 含后端类型模块；**无类型表案（Q-2c-无，r4 REQ-28 fallback）**：对称申报字段 `backend-touched: yes|no`（requiredness 同 frontend-touched），frontend:yes 且 backend:yes = R3（28-a 倾向；28-b "frontend:yes 一律 R3"砍 ui 主用例、28-c 无 fallback 须 owner 显式放弃双端硬准入——如实列） | **R3 拒绝——指路全流程 change** |
| 2 | **delta 非零（含 MODIFIED 或 ADDED）——默认 R3（r3 REQ-14/18 修复：owner 拍板"改契约=大半径"，ADDED 是契约扩展、MODIFIED 无法机械区分改口径与改措辞——两者默认都按拍板 fail-up 到 R3）；仅当命中降级白名单标注（若裁 Q-1 γ'：delta 所触 requirement 块在 store 侧带人类授予的 `blast: low` 类标注——展示层/文案类块）才降 R2（强制测试）** | R3（默认）/ R2（白名单命中） |
| 3 | change-kind = code-behavior（零 delta——spec-preserving 行为修复） | R2 |
| 4 | change-kind = code-trivial（零 delta）且 touched-modules = 1 | R1 |
| 5 | change-kind = no-code（零 delta；decisions 已被次序 1 约束） | R0 |

- **R1 = 零 delta 的 trivial code fix**（任何 delta 走次序 2 判定）。推论：**no-test 选项在 hotfix 通道内彻底消失**——R1/R3 无载体或不准入、R2 强制测试、R0 无代码；goal 原文"或显式 no-test 理由"在分级细化后收敛于此，列入决策摘要供 owner 确认（Q-4）。
- **Q-1 重构（r3 REQ-18——标注语义反转为降级白名单，fail-closed）**：β'）无标注机制——**delta 非零一律 R3**（hotfix 内 spec delta 不可用；代价如实：措辞修正/纯澄清也须走正式流程，R2 用例缩为零 delta 行为修复）；γ'）**降级白名单**——store 侧 requirement 块可由人类授予 `blast: low` 标注（human-owned：agent 不得自授，store 侧标注增删改只能走正式 change），标注命中的 delta 降 R2；缺标注默认 R3（漏标注更严而非放行）。**授权边界（r4 REQ-27 修复）**：标注准确语义 = **人类预授权对此块的未来整块替换降级**——请 owner 单独确认（Q-1 附注）；机械约束：①delta 新块必须原样保留标注行（marker 保留——借 delta 删改标注 = F1）；②delta 中出现 store 侧不存在的 blast 标注 = F1（禁自授/扩权）；③modified-block-integrity 报告使整块差异对呈阅者可见（既有机制白捡）。残余风险如实：已标块的新内容仍可超出展示类范畴——机器不判语义，承接 = 呈阅人审 + 正式 change 可撤标注（有效期候选治理成本高，不倾向）。倾向 γ'+①②③。**ADDED 例外提案（owner 显式裁，Q-12）**：ADDED-only delta 是否允许降 R2（论证如实标注局限——缺陷账三回归案无 ADDED 型属 absence of evidence，不证明低风险；新增 scenario 绑定测试只证新增行为自身不证与存量交互；默认不降，owner 拍板才降）。

### B-B. 验证强度机械化缩放

**B1. 配置行**：process-config 增 `verification-profile`——human-owned、agent 只读、缺省=未声明不升格。值集（Q-2a）：ui/backend/fullstack/docs。
**B2. 升格语义与各 profile 增量（如实）**：ui = E2E 工件+截图观察记录（**适用于 medium/large 全量档**；hotfix/trivial 增量档的 ui 证据 = 绑定测试+受影响页截图，**E2E 显式 n/a**——r2 REQ-15 修复，与 owner 原文增量格一致）；backend = 无新增证据类型（≈现状，声明价值 = ui 类要求显式关断+扩展锚点，如实）；docs = check 全绿已机械（≈现状）。
**B3. 证据三层**：可机械判结论者（verify GREEN、E2E 工件 PASS 行——FAIL = 不过）；人类可查证物（截图观察记录行）；显式豁免物（not-applicable + 理由非空）。
**截图证据的存续期契约**：π1) **仪器性质保持**——截图留 apriori/tmp/（可清理），可查证时点 = 归档前的人类签收呈阅；永久留档 = 观察记录行；归档后图片不可复查（如实）。π2) 拷贝入 bundle——与"产物不入库"约束冲突、膨胀，如实列。π3) 哈希+外部路径——可证曾在不可复查，弱。**签收×存续期合法组合矩阵（r3 REQ-21）**：π1 **强绑签收候选 d**（dry-run 呈阅是其唯一人类查看载体）；若 Q-8 裁签收 a/b/c（无呈阅动作），π1 不可用——合法组合仅剩 π2/π3 或为 a/b/c 增加显式人类查看步骤（后者无机械载体，等于回到 d 的弱化版，如实列）。倾向 d+π1。→ Q-6a。
**新鲜度（r4 REQ-23 再修——"绑定当前代码"须绑代码基线，时间戳只证"文件较新"）**：候选 f1) **工件携代码基线标识（倾向）**——证据工件（E2E 输出/测试运行头）含运行时代码基线行（本仓：commit hash，preflight 比对 fix-ref/当前 HEAD；外仓：不可判——与 prior art w2 unverifiable 对称披露）——须仪器配合打印基线行，格式入设计；f2) d1 摘要同时纳入代码基线（本仓 HEAD/tree hash）与工件哈希（强，绑 d）；f3) 仅时间戳——**标注：不能证明绑定当前代码（mtime 可复制/touch/时钟偏差），仅 owner 明示接受此弱化才合法**；~~不做~~已移出。倾向 f1 底线 + 裁 d 时叠加 f2。→ Q-6b。

**B4. 受影响 scope 的机械契约（r2 REQ-13 修复——弱候选按拍板处置）**：
- 证明契约（Q-3a）：**i) 归档 preflight 隐式跑 scoped verify（scope = delta scenarios ∪ affected-scenario-ids）——机械 oracle，倾向**；ii) 证据引用+新鲜度——**标注：仅在 owner 明示放弃机械 oracle 时合法**（机器不能证明 GREEN 对应当前代码）；~~iii 纯自报~~——**移出候选空间**（与"机械退出条件"拍板正面冲突）。
- 零 delta code fix 的 scope：affected-scenario-ids 必填非空（字段契约已定：**空集 = F1**——r2 裁定唯一化；spec-preserving 意味着行为已被既有 spec 覆盖，无可申报 ID = spec 盲区，指路"补 ADDED delta 走 R2 或走全流程"）。
- ui 分支进入：frontend-touched 申报 + ui/fullstack 下缺失 = F1（字段契约收紧后不再需要"默认 yes"——必填即无缺失态）；真实性不可机械验证如实，谎报补偿 = not-applicable 理由留痕+审计。

### B-C. 耦合决策表

**覆盖面优先级声明（r2 REQ-15 修复）**：**覆盖面由 channel/tier 决定**（hotfix 与 trivial tier = 增量档；medium/large = 全量档——owner 原文方向）；**半径决定准入**（进哪条 channel/tier 合法）；**profile 决定证据类型**。三者正交，无静默改写。

**hotfix 通道（增量档；R3 不准入）：**

| 半径 \ profile | 未声明 | backend | docs | ui / fullstack（fullstack = 本列 ∪ backend 列） |
|---|---|---|---|---|
| R0 no-code | 结论即全部 | 同左 | 同左 | 同左（frontend-touched 不出现——与字段契约一致，r4 REQ-24） |
| R1 零 delta trivial | scoped verify GREEN（scope = affected-scenario-ids） | 同左 | **check 全绿 + 评审维度按 Q-11 所裁**（docs 无测试语义——r2 REQ-16；state A 的 docs oracle = check+P8 组合，评审部分随 Q-11） | 同未声明列 + frontend-touched:yes → ≥1 受影响页截图观察行；no → not-applicable 行（理由非空） |
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
- AC-D1（按 Q-12 参数化——r4 REQ-29）：分级函数 = 字段契约+跨字段不变量+判定次序三表全域覆盖；每级正反例 ≥1 从缺陷账映射（R3 = GROUP BY/双端/口径三案 + ADDED 默认案 + 混合跨模块并集例；R1 = 文案/配置；R0 = UAT 纯排查单；F1 = 矛盾申报例）；**默认基线验证 ADDED→R3，仅 owner 裁 Q-12 例外后启用 ADDED→R2 条件 AC**。
- AC-D2：耦合表全笛卡尔无空格（n/a 显式）；每格 ≥1 处切法对比论证。
- AC-D3：{R0..R3}×{未声明,backend,docs,ui,fullstack}×{hotfix,trivial,medium/large} 全覆盖唯一预期；覆盖面/准入/证据类型三正交声明。
- AC-D4：spec delta 草案覆盖 RUNBOOK 新节双语、config 模板行、未来 CLI 检查点 scenario 级描述。
- AC-D5：决策摘要显式列全待拍板点（Q-1..Q-12 + Q-8 内嵌 prior art 清单）。
- AC-D6：prior art 采纳/取代（3 处）+ 评审维度待裁化，逐条理由。
**AC-I 层（定义不执行）**：字段契约 F1 全谱正反例、分级正反例、config 解析与缺省、耦合表逐格 oracle（E2E FAIL 拒绝、截图记录行存在性、not-applicable 理由非空、docs 列 check oracle）、scoped verify 机制、既有 gate/verify 回归。

## 开放问题（gate③ owner 必答）

- **Q-1**（重构）：delta 降级机制 β'（delta 一律 R3，无标注治理）/γ'（human-owned 降级白名单标注，缺标注默认 R3）——倾向 γ'。
- **Q-2**：a) profile 值集；b) backend/docs "≈现状"定位接受；c) 模块类型表引入与否（双端机械判定前提）。
- **Q-3**：绑定测试证明契约 i（隐式 scoped verify，倾向）/ii（仅 owner 明示放弃机械 oracle 才合法）；iii 已移出。
- **Q-4**：hotfix 通道整体无 no-test（分级细化的推论——goal 原文含"或显式 no-test 理由"，请确认收敛）。
- **Q-5**：正式 trivial 半径前置（R2 不得 trivial）。
- **Q-6**：a) 截图存续期×签收组合（倾向 d+π1；a/b/c 签收下 π1 不可用）；b) 新鲜度（时间戳底线强制，倾向；"不做"仅 owner 明示放弃才合法）。
- **Q-7**：runbook-version 4.0→4.1。
- **Q-8**：prior art 候选空间逐项裁定（req-v13 Q1-Q9 清单随决策摘要呈）。
- **Q-9**：hotfix-channel bundle 去留。
- **Q-10**：R0/R3 界的 decisions 单模块条数上限 N。
- **Q-11**（重构）：hotfix 评审强度 E0（全免——后果显式）/E1（R2 点检）/E2（含 delta 全点检）/E3（docs 保留 P8，可与 E1/E2 叠加）——倾向 E1+E3。
- **Q-12**：ADDED-only 降 R2 例外（默认不降=R3；论证局限如实——absence of evidence）——owner 显式裁。

## 需求裁定记录

对 r1（13 条）：见 req-v2 文末。对 r2（8 条）：见 req-v3 文末。

对 r3（9 条）：
- REQ-1：goal-verbatim 重写——按收到字节忠实保留粘贴重复段（provenance 注记与内容现一致）。
- REQ-5：跨字段不变量显式 F1 表（no-code+delta 等矛盾态全列），分级函数定义于双表合法输入。
- REQ-14：ADDED 默认 R3（遵拍板）；降 R2 改为 owner 显式例外提案（Q-12），论证局限如实标注。
- REQ-18：MODIFIED 默认 R3（fail-up）；Q-1 重构为降级白名单（γ'：human-owned blast:low 标注命中才降 R2，缺标注更严而非放行）/β'（delta 一律 R3）。
- REQ-19：touched-modules 必填改为本 change 显式提案（prior art Q9 联动；选填案 fallback = 缺失即 R3）。
- REQ-20：affected-scenario-ids 的 duplicate occurrence 按 k1 案 F1（k2 案复合键，随 Q-8 联动）；AC-I 补重复键例。
- REQ-21：签收×截图存续期合法组合矩阵（π1 强绑 d；a/b/c 下 π1 不可用）。
- REQ-22："无 P8"从既成事实改为全域待裁维度 Q-11（E0-E3 后果各列；docs 的 check+P8 组合 oracle 尊重 state A）；取代清单缩为 3 处。
- REQ-23：新鲜度至少一种强制（时间戳底线）；"不做"移出常规候选。

对 r4（7 条）：
- REQ-23：新鲜度升级代码基线绑定（f1 工件基线行/f2 d1 纳入/f3 时间戳标注弱化须 owner 明示）；外仓 unverifiable 对称。
- REQ-24：frontend-touched requiredness 改 code-* 且 ui/fullstack 必填；R0 格一致。
- REQ-25：跨模块半径按 union(touched ∪ delta ∪ decisions) 计；混合例入 AC-D1。
- REQ-26：评审强度两正交轴 code-review-scope × docs-P8（6 合法组合）；E1/E2 重合消除。
- REQ-27：blast:low 授权语义显式（预授权未来整块替换，owner 单独确认）+ 机械约束①marker 保留②禁自授扩权 F1③integrity 可见；残余与撤销如实。
- REQ-28：Q-2c 无类型表 fallback = 对称 backend-touched 申报（28-a 倾向）。
- REQ-29：AC-D1 参数化默认 ADDED→R3；AC-D5 补 Q-12；AC-D6 改 3 处；旧名/位置引用全清理。
