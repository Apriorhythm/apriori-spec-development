# req-v29 — hotfix-lane：hotfix 最小回写单元 × 验证强度机械化缩放

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
- 合法组合 = 两轴全笛卡尔 6 格（**准入声明修正（r16 REQ-53）："半径+R2 子型决定机械层的准入否决；trivial 的最终资格 = 机械否决通过 ∧ state A human tier 判定"——机械与 human 两层如实分离**）；**投影与去重规则（r5 REQ-26）**：**R0 拆分（r6 REQ-26）**：R0-conclusion-only（无 decisions）= 评审对象不存在，任何组合下 n/a；**R0-with-decisions** = 存在将写入 doc-is-truth 的 artifact——点检条件精确化（r7 REQ-26）：**code-review-scope>=R2（任意 profile）或（profile=docs 且 docs-P8=retain）**时，单轮点检对象含 decisions↔结论一致性（同轮承担不加轮次）；其余组合 n/a（唯一投影）；none×waive 下如实无评审（组合后果显式）；**R2×docs 投影唯一化（r15 REQ-51 补 all-code）**：scope∈{R2, all-code} ∧ retain → 单轮评审合并承担点检与 P8 双职责（同轮双 verdict 行）；scope=none ∧ retain → 仅 P8 单 verdict；waive → doc-fix 准入拒绝（无评审格）；R1×docs 不可达（无格）；code-* 的 R1 仅在 scope=all-code 下点检（scope=R2 下无）；单轮点检/P8 的机械验收 = verdict 行 + raw 存档 + **内容绑定（r10 REQ-43，r15 升级 raw 一致性，r18 REQ-58 补摘要域定义与代码基线绑定）**：**评审摘要域显式 = bundle 业务实体（delta + decisions + conclusion + bindings + **全部申报字段（change-kind/touched-modules/fix-ref/frontend-touched/backend-touched/affected-scenario-ids——它们决定半径、评审范围与验证 scope，改之即换契约，r21 REQ-60）**——评审对象本身；排除域完整清单：流程状态元数据、approval、评审工件。**域切分按实体不按文件（r22 REQ-61）：正列实体优先——若裁 c1'（bindings 节住 hotfix-state 内），状态文件按节切分：bindings 节属正列参与摘要，流程元数据节（round/next-action/gates 类）属排除域；节边界以定式标题机械判定（定式留 STEP2；**节结构错误谱 fail-closed（r24 基数唯一化，r25 REQ-63 需求函数参数化）：bindings 定式标题基数 ∈ {0,1}，由声明需求函数唯一决定——f(change-kind, delta 目标键, Q7c 裁定)：①code-* 且 delta 目标键非空 → 必须 1（tests 行；no-test 依 Q-4 倾向移除——待 owner 确认，保留案见下）；②doc-fix → 必须 0（其 oracle = check+P8，bindings 无诚实形态——tests 行会虚构 TAP 绑定，显式免除；delta 目标键存在但不驱动 bindings）；③code-* 零 delta → 随 Q7c：p1 案必须 0，p2 案必须 1（bundle 级一条声明）；④no-code → 必须 0。任一案下：应 1 而 0 = 缺声明 F1；应 0 而出现（含空节）= F1 多余节；基数 >1 / 嵌套 / 错序 / bindings 行落流程节 = F1。基数、归属与异常语义属需求，标题字面定式留 STEP2**）。**需求函数按载体投影（r26 REQ-64——f 是 change-kind × 目标键 × Q7c × 载体的全域函数）**：**两层基数分离（r27 REQ-65）**：①**容器层**（仅 c1/c1' 有容器）——"应 1"= 容器恰一（c1 文件/c1' 节）、"应 0"= 容器不得存在（空容器 = F1 多余）；②**声明行层**（一切载体通用；r28 REQ-67 再分两型）——**keyed 型**（非零 delta）：行集与目标键一一对应（每键恰一行、总行数 == 目标键数；键重复/缺行/多行 = F1）；**singleton 无键型**（仅零 delta + Q-8/Q7c=p2）：恰一条 bundle 级无键声明行（零行 = 缺声明 F1、多行 = F1；键行出现 = F1）；**行类型随 Q-4 联动（r30 REQ-70 保留案参数化完毕，入合法联合选项表）**：
  - **Q-4 移除案（倾向）**：hotfix 全域无 no-test——singleton 唯一合法语法 = 非空无键 `tests:` 行；一切 code-* 验证下限 = scoped verify GREEN。
  - **Q-4 保留案（owner 选此案时的完整设计，非留白）**：no-test **仅限 R1**（R2 保留禁令恒定——缺陷账回归 3/24 教训面；"保留且及 R2"不列为合法候选，除非 owner 显式推翻拍板）；载体 = p2 singleton 的 `no-test: <非空理由>` 行；**语义 = 冗余留痕、非验证豁免**（state A verify 不识别它；零 delta 不产生新 store UNBOUND——它不豁免任何机械判定，只替代 R1 的 scoped verify 义务）；准入结果：R1 验证下限从 scoped GREEN 参数化降为"理由行留痕"；**可观察债务 = 无机械载体（如实——债务仅存在于归档物审计面，无逼偿机制）**；清偿路径 = 审计发现后人工补测试或正式 change。
  - 同步（r30）："R1 无载体"推论改为"R1 无键载体；p2 案存在 singleton 载体——no-test 的存废即 Q-4 两案"；B-C 表 R1 格与 AC 参数化见对应处；c2/c3 **无容器**，其"应 0/应 1"直接落行层——应 0 = delta 内不得有任何 bindings 定式行；应 1 = 行集与目标键一一对应。**载体互斥（r29 REQ-69）：仅所裁载体可出现 bindings 定式——任何非所裁载体位置中的可识别 bindings 形态（文件/节/块内行/随块注释）一律 F1**（既防重复声明两可，也防额外行随 requirement 正文合入 store——state A parser 保留块内普通正文）；各载体投影：c1 = 独立文件容器；c1' = 状态文件内节容器（已定）；c2/c3 = delta 块内/随块行——**组合约束：p2（bundle 级声明）在 c2/c3 下无承载位置 = 非法组合（Q-8 裁 c2/c3 则 Q7c 不得裁 p2，反之亦然——联动约束显式）**；doc-fix 在 c2/c3 下"应 0" = delta 块内出现 bindings 定式行即 F1（域外识别）；摘要抽取：c2/c3 的行随 delta 天然入摘要正列（delta 恒入域）、c1 文件与 c1' 节按已定切分入域；c1 案（独立文件）下状态文件整体排除、bindings 文件整体入域——两案摘要语义一致（业务实体恒入域、流程元数据恒出域）**；规范化/排序/散列算法定式留 STEP2，域边界以此为准）+ 评审时刻的被评代码基线（本仓：当前 HEAD；外仓：fix-ref 申报值——自洽等级、诚实标注非绑定证明）**；评审调用时把该摘要交给 reviewer，reviewer 在 verdict 行内复述；机械校验双条件——①preflight 以（当前 bundle 业务内容 + 当前 HEAD/fix-ref）重算摘要 == verdict 行摘要（**代码 HEAD 变化即失配强制复审**）。**clean-tree 无条件前提（r19 REQ-58 定案，r20 收口）：凡合法组合含点检/P8 评审，评审时刻与归档 preflight 均要求代码工作树 clean（排除集 = f1 处定义的"clean-tree 排除集"：apriori/changes/** + apriori/tmp/**——两处同一定义，r20 修正原"同 B4"错引）——不随 Q-6b 的 f 候选走（f2/f3 案同样强制），**亦不随 Q-6c 的 t 候选走：含评审组合下 untracked 同样拒绝（t2 仅可适用于无评审组合——未跟踪源码可参与构建，改它不动 HEAD）**；理由：HEAD 不含未提交工作树，dirty 下"评审绑定被评代码"不成立；hotfix 是事后补记、修复应已提交，成本可接受；与 state A 的"P8 可发生在 dirty worktree"（STEP5 在提交前）无冲突——hotfix 无 STEP5，本通道自定前提，正式流程语义不动**；②raw 存档尾部有**定式唯一 verdict 区**（定式 marker 全 raw 唯一——重复/追加即拒绝；区内 verdict 与评审文档 verdict 逐字一致）。**verdict 基数定式（r17 REQ-55）**：双职责格（scope∈{R2,all-code}∧retain∧R2×docs）= 区内恰两条定式 verdict 行（点检在前、P8 在后，各携同一摘要）；单职责格 = 恰一条；基数或顺序错 = 拒绝。错误谱：raw 缺 verdict 区 / marker 重复（追加攻击被此拒）/ 摘要不等 / verdict 区与评审文档不一致 → 各自拒绝（入 AC-I）。**成本声明修正（r16 REQ-55）：向旧 raw 追加新 verdict 会触发 marker 重复拒绝，伪造需重写 raw 尾区——仍非防伪证明**。**诚实边界：raw 本身是作者落盘的文件，无签名机制下重写/伪造机器不可判**——承接 = 别改清单的 raw 强制纪律 + 归档物审计 + 补偿链；此机制是无密码学签名下的机械上限；定式 marker 与 prompt/verdict 格式归 STEP2。每 radius×profile 的评审要求由两轴经此规则唯一投影（入 AC-D3）。倾向 {R2}×{retain}。verify 不判代码↔spec 语义（如实声明保持）。

**A3. 准入按爆炸半径分级**

**信号三层框架**（同 v2：文档面机械信号 / 申报信号 / 申报一致性执行 fail-up——申报只能加重不能减轻）。诚实边界：整体瞒报机器不能拦，承接见 评审维度节。

**字段契约（r2 REQ-5 修复——requiredness/合法值/malformed 先行，F1 谱完备）**：

| 字段 | requiredness | 合法值 | malformed/矛盾 → F1 |
|---|---|---|---|
| change-kind | 必填 | no-code / code-trivial / code-behavior / **doc-fix（docs profile 专用——r7 REQ-35：docs 项目的修复对象即文档，code-* 语义不适用）** | 缺失、未知值；doc-fix 出现于非 docs profile |
| touched-modules | **本 change 提案：code-* 必填**（分级函数需其计数——r3 REQ-19：此为对 prior art Q9 必填/选填待裁项的显式提案，非预裁；若 owner 裁选填案，分级 fallback = 缺失即 R3 保守）；no-code 必须**不出现** | 既有 store/truth 模块词表的非空无重复列表 | code-* 下（必填案）缺失/空/未知模块/重复/格式非法；no-code 下出现（矛盾） |
| fix-ref | 与 touched-modules 成对（prior art 定位头契约，待裁项按引用） | 仓域标记格式（本仓/外仓） | 半缺、空值、格式非法 |
| frontend-touched | **所有 code-\* 必填（r6 REQ-28 修正：触及信号是半径维度输入，与 verification-profile 正交——未声明 profile 的跨端修复同样要硬拒绝）；no-code 必须不出现**（**有类型表案 Q-2c-有（r7 REQ-28 完整化）：本字段为派生变量非申报字段——bundle 中出现 = F1；类型表 = process-config 新行（human-owned），映射模块 → {frontend, backend, both}；派生 = touched-modules 各模块类型的并集；机械语法（r10 REQ-41）：每模块至多一条映射、值 ∈ {frontend, backend, both}（定式留 STEP2，以此为语法边界——"不可解析"= 违反此语法）；错误谱：整表缺失 = 回退申报案（表是可选配置）；**映射键为 store/truth 词表外模块 = F1**；同模块重复映射/未知类型值/行不可解析 = F1；**多条同名配置行按 state A process-config 现行重复行语义（STEP2 对齐声明）**；表存在但被触模块未覆盖 = 保守 R3（fail-up 不 F1）**） | yes / no（申报案）/ 派生（类型表案） | 应出现而缺失、未知值、应不出现而出现 |
| backend-touched | requiredness 同 frontend-touched（**所有 code-\* 必填**，与 profile 无关；有类型表案由推导取代） | yes / no | 同上 |
| delta | 可选 | 现行 delta parser 可解析 | 不可解析 |
| decisions | 可选 | prior art B3 契约（module 头、格式） | malformed、模块缺失、不可计数 |
| affected-scenario-ids | code-* 必填（Q-3 机制的 scope 输入） | 既有 store scenario ID 或本 delta scenario ID 的非空列表 | code-* 下缺失/空（**空集 = F1**）/未知 ID/**申报 ID 在 store 中存在多 occurrence（duplicate）——按 prior art k1 案 F1 拒绝（k2 复合键案则要求 requirement+occurrence 定位；随 Q-8 的 k 裁定联动——r3 REQ-20）** |

**跨字段不变量（显式 F1 表）**：no-code + 非零 delta = F1；no-code + touched-modules/fix-ref/affected-scenario-ids/触及字段出现 = F1；**touched-modules ⊇ delta 触及模块（字段存在时；缺失 delta 模块 = F1——r7 REQ-33 补引 prior art 定位头一致性契约，union 半径计算不替代它）**；**doc-fix 完整契约（r8 REQ-35/37/40，r12 REQ-44 补定位头形状）**：仅 profile=docs 合法（非 docs 出现 = F1；docs profile 下 code-* = F1）；触及字段（frontend/backend-touched）必须不出现；**touched-modules 必填——doc-fix 语义 = delta 触及的 store 模块集（文档项目的"修复对象"即 store 文档；须与 delta 模块集相等——超集不变量对 doc-fix 收紧为相等，无代码面可多报），配对契约（touched+fix-ref 俱在）由此满足、唯一合法形状成立**；**delta 必填非零**（零 delta doc-fix = F1——docs 修复的对象即文档；docs 的纯排查/decisions 走 no-code）；fix-ref 必填、校验强度随 Q-8 的 v1/v2 联动（v1 案 = 仅仓域格式+声明语义，"指向文档变更 commit"为声明措辞；v2 案 = **本仓 commit 存在性校验——prior art 原义，ref 不存在 = F1；"文档路径归属"校验不引入（无机械词表，r10 REQ-40 删除扩义）**）；**doc-fix delta 的证明契约单列：scoped verify 不适用（docs 无 TAP oracle）——机械面 = check 全绿；语义面由 P8 类评审承接（state A 的 check+P8 组合语义）→ doc-fix 进 hotfix 的合法性前提 = docs-P8 = retain；**waive 下半径不变（分级函数不读 docs-P8——半径正交性保持，r10 REQ-37），由 hotfix 准入层拒绝并指路正式流程（半径/通道准入/前提条件三层分离）**；decisions 出现于任何 change-kind 均合法（半径约束在判定次序 1）。
以上（字段表 + 不变量表）任一命中 = 归档拒绝零写入（与 prior art F1 族同构）。**分级函数只定义在通过双表的合法输入上**，判定次序（首个命中即出）：

| 次序 | 条件 | 结果 |
|---|---|---|
| 0.5 | （仅当 owner 对 prior art 定位头裁**选填案**）change-kind = code-* 且定位头（touched-modules+fix-ref）成对全缺 | **(R3, n/a)**（fallback 显式入函数——r5 REQ-19；必填案下此行不存在，缺失即 F1） |
| 1 | delta 含 REMOVED 或 RENAMED；或 **delta 中任一 MODIFIED/ADDED 块不含 scenario（r7 REQ-32 入函数——无可执行测试目标不得降 R2）**；或 **union(touched-modules ∪ delta 触及模块 ∪ decisions 目标模块) ≥2（r4 REQ-25——混合 bundle 总半径按并集计：代码 A 模块+Decision B 模块 = 跨 2 模块）**；或 decisions 含 supersession 或**单模块条数 > N**（N 参数化待裁 Q-10）；或双端信号命中——**有类型表案（Q-2c-有）**：frontend-touched:yes 且 touched-modules 含后端类型模块；**无类型表案（Q-2c-无）**：frontend-touched:yes 且 backend-touched:yes = R3（两字段所有 code-* 必填、与 profile 无关——r6 REQ-28；28-a 唯一合法 fallback，28-b/c 仅 owner 明示才合法） | **(R3, n/a) 拒绝——指路全流程 change** |
| 2 | **（code-* 与 doc-fix 同一规则，r14 REQ-49/52——~~2a 自动降级~~删除：无法机械区分高低风险时 fail-up，不反向放行；docs 的降级同样只能经人类白名单）**：delta 非零（含 MODIFIED 或 ADDED）——默认 R3（owner 拍板"改契约=大半径"，fail-up）；降 R2 的两条并列白名单分支：①（若裁 Q-1 γ'）delta 所触 requirement 块在 store 侧带人类授予的 `blast: low` 标注（docs 的文案类块同样由人标注——机制统一）；②（仅当 owner 裁 Q-12=yes）delta 为 ADDED-only 且每块含 >=1 scenario 且 union 模块数 = 1。**半径值域固定 {R0,R1,R2,R3}；分级函数输出为二元组（半径, R2 子型）——本行白名单命中输出 (R2, whitelist)，非 R2 结果子型 = n/a（r17 REQ-53 输出契约显式；序列化位置留 STEP2）；doc-fix 降级后 = (R2, whitelist)，证据格见耦合表 R2×docs** | (R3, n/a)（默认）/ (R2, whitelist)（白名单①或②命中） |
| 3 | change-kind = code-behavior（零 delta——spec-preserving 行为修复） | (R2, behavior) |
| 4 | change-kind = code-trivial（零 delta）且 touched-modules = 1 | (R1, n/a) |
| 5 | change-kind = no-code（零 delta；decisions 已被次序 1 约束） | (R0, n/a) |

- **R1 = 零 delta 的 trivial code fix**（任何 delta 走次序 2 判定）。推论（r30 参数化）：**Q-4 移除案下 no-test 在 hotfix 通道内消失**（R1 无键载体、R2 强制测试、R0 无代码；p2 案的 singleton 载体只承载 tests: 行）；**Q-4 保留案下 no-test 仅存于 R1 的 p2 singleton**（语义=留痕非豁免，完整设计见 B5 行类型联动段）；goal 原文"或显式 no-test 理由"的最终归宿即 Q-4 两案，owner 裁。
- **Q-1 重构（r3 REQ-18——标注语义反转为降级白名单，fail-closed）**：β'）无标注机制——**delta 非零一律 R3**（hotfix 内 spec delta 不可用；代价如实：措辞修正/纯澄清也须走正式流程，R2 用例缩为零 delta 行为修复）；γ'）**降级白名单**——store 侧 requirement 块可由人类授予 `blast: low` 标注（human-owned：agent 不得自授，store 侧标注增删改只能走正式 change），标注命中的 delta 降 R2；缺标注默认 R3（漏标注更严而非放行）。**授权边界（r4 REQ-27 修复）**：标注准确语义 = **人类预授权对此块的未来整块替换降级**——请 owner 单独确认（Q-1 附注）；机械约束：①delta 新块必须原样保留标注行（marker 保留——借 delta 删改标注 = F1）；②delta 中出现 store 侧不存在的 blast 标注 = F1（禁自授/扩权）；③~~modified-integrity 报告可见~~（r5 REQ-30 勘误：实读 lib/archive-merge.js——它只报结构保真与丢失行（missingLines），纯新增/改写语义不输出，human 层无丢失时甚至整节不打印——**不能**充当越界替换的审查补偿）。残余风险（已标块新内容超出展示类范畴，机器不判语义）的承接**强绑（r5 REQ-31，r6 补职责定义）**：γ' 的合法性前提 = **签收裁 d（dry-run 完整呈阅 old/new），或 code-review-scope>=R2 且该点检承担白名单边界职责**——点检强制职责（以其替代 d 时）：输入含完整 old/new 块、输出含显式 verdict 行「新内容是否仍属 blast:low 授权边界」（入 AC）；组合 γ'+a/b/c+none **非法**；γ'+a/b/c+R2 仅在点检职责如上定义时合法。此前提入 Q-1 附注与合法组合矩阵。另：正式 change 可撤标注。倾向 γ'+①②+d 绑定。**ADDED 例外提案（owner 显式裁，Q-12）**：ADDED-only delta 是否允许降 R2（论证如实标注局限——缺陷账三回归案无 ADDED 型属 absence of evidence，不证明低风险；新增 scenario 绑定测试只证新增行为自身不证与存量交互；默认不降，owner 拍板才降）。

### B-B. 验证强度机械化缩放

**B1. 配置行**：process-config 增 `verification-profile`——human-owned、agent 只读、缺省=未声明不升格。值集（Q-2a）：ui/backend/fullstack/docs。
**B2. 升格语义与各 profile 增量（如实）**：ui = E2E 工件+截图观察记录（**适用于 medium/large 全量档**；hotfix/trivial 增量档的 ui 证据 = 绑定测试+受影响页截图，**E2E 显式 n/a**——r2 REQ-15 修复，与 owner 原文增量格一致）；backend = 无新增证据类型（≈现状，声明价值 = ui 类要求显式关断+扩展锚点，如实）；docs = check 全绿已机械（≈现状）。
**B3. 证据三层**：可机械判结论者（verify GREEN、E2E 工件 PASS 行——FAIL = 不过）；人类可查证物（截图观察记录行）；显式豁免物（not-applicable + 理由非空）。
**截图记录的基线绑定（r6 REQ-23，r7 补外仓域）**：观察记录行增列**代码基线与运行标识**——oracle 分域：**本仓域证据**（fix-ref 为本仓形态）基线必须 == 本仓 preflight HEAD；**外仓域证据**（fix-ref 为外仓形态）基线必须 == fix-ref 所指值（机器只做 equality 比对，真实性不可判——x1 案 unverifiable 放行且 owner 明示接受，x2 案拒绝；诚实：外仓域的基线校验是申报自洽性检查而非代码绑定证明）；旧图复用在本仓域被机械拒绝；若 E2E 仪器存在，候选强化 = 带基线的 E2E manifest 枚举并哈希截图文件（f2 的工件哈希明确含截图）；手工截图案基线由作者填（申报信号诚实边界如实）。拒绝 AC：记录行基线 != HEAD / 混合运行标识 / f2 下截图哈希失配。
**截图证据的存续期契约**：π1) **仪器性质保持**——截图留 apriori/tmp/（可清理），可查证时点 = 归档前的人类签收呈阅；永久留档 = 观察记录行；归档后图片不可复查（如实）。π2) 拷贝入 bundle——与"产物不入库"约束冲突、膨胀，如实列。π3) 哈希+外部路径——可证曾在不可复查，弱。**签收×存续期合法组合矩阵（r3 REQ-21）**：π1 **强绑签收候选 d**（dry-run 呈阅是其唯一人类查看载体）；若 Q-8 裁签收 a/b/c（无呈阅动作），π1 不可用——合法组合仅剩 π2/π3 或为 a/b/c 增加显式人类查看步骤（后者无机械载体，等于回到 d 的弱化版，如实列）。倾向 d+π1。→ Q-6a。
**新鲜度（r5 REQ-23 再修——f1 给出精确 oracle 与错误谱）**：
- f1) **工件携代码基线行（倾向）**——精确算法：①preflight 要求**代码工作树** clean——判定排除集（r8 REQ-38 缩窄——`apriori/**` 全排会放过 process-config/living spec/truth/runbook 的未提交改动，配置降级绕过由此关死）：**排除 `apriori/changes/**`（全部在途 bundle——sibling change 并行写作是 goal 与 state A 的明确承诺，只排本 bundle 会让邻居的 dirty 拒绝本 hotfix，r12 REQ-45）与 `apriori/tmp/**`**；apriori/specs（living store）、apriori/truth、process-config、RUNBOOK 均在 clean 检查内（配置降级绕过仍关死——REQ-38 的封堵不依赖检查 changes/ 树）；证据不设自定义排除路径（必须写在 apriori/tmp/ 下，禁止指向代码目录）；排除集之外 dirty/staged/untracked = 拒绝（t2"只查 tracked 修改"如实列为弱化；倾向 t1）；②工件基线行必须 == preflight 时刻的本仓 HEAD（不是 fix-ref——语义是"证据在当前代码上运行过"；fix-ref 可为 HEAD 的祖先，二者独立校验）；③不等 = 拒绝（"证据早于/异于当前代码"）。诚实边界：基线行由仪器自报，机器只能比对声明与 HEAD 一致——伪造属申报信号，补偿链承接。**外仓证据（工件产自外仓运行）**：本仓 preflight 不可判——x1) 按 unverifiable 放行但须 owner 明示接受弱化（对称 prior art w2，倾向）；x2) 拒绝（砍分仓用例）。
- f2) d1 摘要纳入代码基线（HEAD/tree hash）与工件哈希（强，绑 d）；f3) 仅时间戳——仅 owner 明示接受才合法。倾向 f1 底线 + 裁 d 叠加 f2。→ Q-6b。

**B4. 受影响 scope 的机械契约（r2 REQ-13 修复——弱候选按拍板处置）**：
- 证明契约（Q-3a）：**i) 归档 preflight 隐式跑 scoped verify（scope = delta scenarios ∪ affected-scenario-ids）——机械 oracle，倾向**；**无 scenario 的 delta 块（r6 REQ-32）：无可执行测试目标——此类 MODIFIED/ADDED 块不得降入 R2，一律 R3**（γ'/Q-12 降级前提 = 块含 >=1 scenario，机械可判；prior art 的 requirement 标题绑定目标在本通道无机械 oracle，不采——用任意既有 GREEN ID 伪造覆盖的通道由此关死）；ii) 证据引用+新鲜度——**标注：仅在 owner 明示放弃机械 oracle 时合法**（机器不能证明 GREEN 对应当前代码）；~~iii 纯自报~~——**移出候选空间**（与"机械退出条件"拍板正面冲突）。
- 零 delta code fix 的 scope：affected-scenario-ids 必填非空（字段契约已定：**空集 = F1**——r2 裁定唯一化；spec-preserving 意味着行为已被既有 spec 覆盖，无可申报 ID = spec 盲区，指路"补 ADDED delta 走 R2 或走全流程"）。
- ui 分支进入：证据要求由 profile × frontend-touched 联合决定（字段所有 code-* 必填——r6；profile 只决定 yes 时要什么证据）；真实性不可机械验证如实，谎报补偿 = not-applicable 理由留痕+审计。

### B-C. 耦合决策表

**覆盖面优先级声明（r2 REQ-15 修复）**：**覆盖面由 channel/tier 决定**（hotfix 与 trivial tier = 增量档；medium/large = 全量档——owner 原文方向）；**准入 = (半径, R2 子型) 的机械否决 ∧（trivial 时）state A human tier 判定**（r17 REQ-53a——两层模型全文唯一口径）；**profile 决定证据类型**。三者正交，无静默改写。

**hotfix 通道（增量档；R3 不准入）：**

| 半径 \ profile | 未声明 | backend | docs | ui / fullstack（fullstack = 本列 ∪ backend 列） |
|---|---|---|---|---|
| R0 no-code | 结论（+decisions 若有）；评审见 R0 拆分规则 | 同左 | 同左 | 同左（触及字段不出现——no-code） |
| R1 零 delta trivial | scoped verify GREEN（scope = affected-scenario-ids）**；（仅 Q-4 保留案）或 p2 singleton no-test 理由行留痕（验证下限降级显式——r30）** | 同左 | n/a（组合不可达——docs 无零 delta code 形态；docs 修复 = doc-fix 走次序 2） | 同未声明列 + frontend-touched:yes → ≥1 受影响页截图观察行；no → not-applicable 行（理由非空） |
| R2 含 delta 或 code-behavior | scoped verify GREEN（含 delta 新 scenario 的绑定；no-test 无此选项） | 同左 | **doc-fix（白名单降级）专属：check 全绿 + docs-P8=retain 强制（waive 下准入层拒绝指路正式流程，半径不改）** | 同未声明列 + 截图规则同 R1 ui 格；E2E n/a（增量档） |

**正式流程（(半径, 子型) 机械否决 + human 判定给 tier 资格；tier 决定覆盖档）：**

| 半径 | tier 准入 | 验证档 |
|---|---|---|
| R0/R1 | trivial 起 | trivial = 增量档（同 hotfix 对应行同一张表——**仅指证据/验证下限；评审维度不复用 Q-11：正式流程评审保持 state A 不变（trivial 的一次 consistency review、docs 的 check+P8、medium/large 的 P8 轮），Q-11 只辖 hotfix 通道——r14 REQ-50，waive 指路正式流程后 P8 由 state A 恢复、无静默弱化**）；自愿走 medium/large = 全量档 |
| R2 | **机械层只做否决（r16 REQ-53/56 定案）**：准入判别输入 = 半径 + R2 子型标记（分级函数随附输出 {whitelist, behavior}）；**behavior 子型与 R3 一律机械否决出 trivial（fail-up 硬拒）**；whitelist 子型按 Q-5 裁——a 案同样否决 / b 案不否决、**交 state A 现行 trivial 判定（单文件/无新行为/无 shared-state 三资格本就是 human-owned 纪律，机械面不查也不移除——不可判时无穿透：机械层输出的只是"否决/交 human 判定"两态）**；任何案均可走 hotfix（增量档但测试强制） | **R2-whitelist×trivial（Q-5b 且 human 判定通过）= 增量档，验证下限同 hotfix R2 对应格（code：scoped verify GREEN；docs：check + docs-P8 retain 强制；ui 增量截图规则同——r17 REQ-57 补落）**；medium/large = 全量档：现行矩阵 + profile 升格项（ui：全量 E2E + 截图证据为机械退出条件） |
| R3 | medium/large | 全量档同上 |

## 范围外（won't do）

同 v2（P2-10 不动、五问不动、RUNBOOK 仅新增、不产实现代码、prior art won't-do 随候选空间待裁采纳）。

## 验收标准

**AC-D 层**：
- AC-D1（按 Q-12 参数化——r4 REQ-29）：分级函数 = 字段契约+跨字段不变量+判定次序三表全域覆盖；每级正反例 ≥1 从缺陷账映射（R3 = GROUP BY/双端/口径三案 + ADDED 默认案 + 混合跨模块并集例；R1 = 文案/配置；R0 = UAT 纯排查单；F1 = 矛盾申报例）；**默认基线验证 ADDED→R3，仅 owner 裁 Q-12 后启用白名单② AC；半径值域断言 {R0..R3} 无第五值；doc-fix 走同一次序 2 的正反例（白名单命中降 R2/未命中 R3）**。
- AC-D2：耦合表全笛卡尔无空格（n/a 显式）；每格 ≥1 处切法对比论证。
- AC-D3：{R0..R3, R2 子型}×{未声明,backend,docs,ui,fullstack}×{hotfix,trivial,medium/large}×Q-5 案 全覆盖；**机械层预期唯一（否决/交 human 判定两态）；human 层资格判定如实标注为不可机械断言域**（r16 REQ-53）；覆盖面/证据/评审投影同前。
- AC-D4：spec delta 草案覆盖 RUNBOOK 新节双语、config 模板行、未来 CLI 检查点 scenario 级描述。
- AC-D5：决策摘要显式列全待拍板点（Q-1..Q-12 + Q-8 内嵌 prior art 清单）；**联动选择组契约（r27 REQ-66，r28 REQ-68 修正能力声明）：存在联动约束的候选（命名空间化引用消除编号碰撞——Q-8/Q7a 载体 × Q-8/Q7c 零 delta 声明的 p2×c2/c3 非法配对、Q-1 γ' 与签收/评审的强绑组合等）必须以**合法联合选项表**成组展示（合法配对枚举成表、非法配对显式标注）；**gate③ 决策记录须命中合法表——本 change 的验收方式是人工核对（决策发生于 gate③、STEP2 只产文档不裁不校）；机械校验器列为未来实现 change 的可选项，本 change 不声称机械拒绝**。
- AC-D6：prior art 采纳/取代（3 处）+ 评审维度待裁化，逐条理由。
**AC-I 层（定义不执行，r7 REQ-36 正式清单补全）**：字段契约 F1 全谱正反例（含 backend-touched 错误谱、doc-fix 例、定位头超集 F1 例）、分级正反例（含选填 fallback 0.5 行、无 scenario 块 R3 例、混合块反例、类型表推导失败保守 R3 例）、config 解析与缺省（含类型表行）、耦合表逐格 oracle（E2E FAIL 拒绝、截图记录行存在性+**混合运行标识拒绝+截图哈希失配拒绝+外仓域基线 equality 例**、not-applicable 理由非空、docs 列 check oracle）、scoped verify 机制、f1 基线失配/dirty tree（含排除集边界）拒绝例、**含评审组合的无条件 clean-tree 例（f2/f3 案下 dirty/untracked 同样拒绝；t2 裁定不豁免）、摘要域切分双例（评审后仅更新流程元数据节不失配；c1' 下仅改 bindings 节必须失配）、c1' 节结构例全谱（标题重复/嵌套/错序/域外 bindings 行拒绝；需声明而零标题拒绝；无需声明而零标题通过；无需声明而空节拒绝；doc-fix 带节拒绝；p2 案零 delta 无节拒绝；**载体投影分支例（c1 应 0 而文件存在拒绝；c2/c3 下 doc-fix 块内 bindings 行拒绝；p2+c2/c3 非法组合拒绝；多目标键正例——两 scenario delta 在 c2/c3 下恰两行通过、c1' 下节内两行通过；**p2 singleton 正例——零 delta + p2 在 c1/c1' 下恰一条无键行通过；Q-4 两分支例（移除案：singleton no-test 行拒绝；保留案：R1 的 no-test 行通过、scoped verify 义务免除、理由行留痕可审计断言、R2 的 no-test 行拒绝恒定——r30 确定预期）；交叉载体负例——裁 c1 而 delta 块内出现 bindings 行拒绝（r29 REQ-69/70）**）**、blast marker 删改与自授 F1 例、**γ' 点检完整 old/new 输入与边界 verdict 行断言、**verdict 内容绑定断言四例（raw 缺 verdict 区/marker 重复即追加攻击/摘要不等/verdict 区与评审文档不一致——各自拒绝）、双职责基数与顺序错误例、评审后改动拒绝例、分级输出二元组断言（(R2,whitelist)/(R2,behavior) 派生正反例 + 全部非 R2 分支输出 (Rx, n/a) 的全域断言——r18 REQ-53 收口）、类型表负例（词表外键/重复映射/未知值/未覆盖保守 R3）**、评审两轴六格投影例（含 R0-with-decisions 条件）、既有 gate/verify 回归。

## 开放问题（gate③ owner 必答）

- **Q-1**（重构）：delta 降级机制 β'（delta 一律 R3，无标注治理）/γ'（human-owned 降级白名单标注，缺标注默认 R3）——倾向 γ'。**γ' 连带确认项（r8 REQ-39）**：a) 标注语义 = 预授权对此块的未来整块替换降级；b) 强绑组合——γ' 须配签收 d，或 scope>=R2 且点检承担白名单边界职责（完整 old/new 输入+边界 verdict 行）；γ'+a/b/c+none 非法。
- **Q-2**：a) profile 值集；b) backend/docs "≈现状"定位接受；c) 模块类型表引入与否（双端机械判定前提）。
- **Q-3**：绑定测试证明契约 i（隐式 scoped verify，倾向）/ii（仅 owner 明示放弃机械 oracle 才合法）；iii 已移出。
- **Q-4**：hotfix 通道整体无 no-test（分级细化的推论——goal 原文含"或显式 no-test 理由"，请确认收敛）。
- **Q-5**：正式 trivial 的半径否决（两案，r16 REQ-54/56 定案——~~c 案~~删除：其"三资格交集"在机械面无 oracle（连"单文件"都无观测源），在 human 面与 b 等价——三资格是 state A 的 human 纪律，b 案下并未被移除）——a) 全部 R2 机械否决出 trivial（**对 docs 的准确披露：无 blast 标注的 docs 修复在本框架下本就 R3 出局，故 a 对 docs trivial 是收紧且 b 也不能完全恢复 state A（满足三资格但无标注的 docs trivial 同样被否决）——两案共同的收紧面如实列**）；b) 仅 behavior 子型否决，whitelist 子型交 state A human 判定（机械面不查三资格、也不移除它们）——倾向 b；两案的机械层输出均为两态 {否决, 交 human 判定}，无第三态。
- **Q-6**：a) 截图存续期×签收组合（倾向 d+π1；a/b/c 下 π1 不可用）；b) 新鲜度 f1（代码基线行+clean tree，倾向）/f2（d1 纳入，绑 d）/f3（仅 owner 明示接受）；外仓证据 x1（unverifiable 放行+明示接受，倾向）/x2（拒绝）；**c) clean-tree 严格度 t1（排除集外全严格，倾向）/t2（untracked 忽略——弱化明示；**仅可适用于无评审组合：含点检/P8 的组合下 untracked 一律拒绝，t2 裁定不豁免（r21 REQ-58 摘要同步）**）；排除集固定为 apriori/changes/**（全部在途 bundle）+ apriori/tmp**。
- **Q-7**：runbook-version 4.0→4.1。
- **Q-8**：prior art 候选空间逐项裁定（req-v13 Q1-Q9 清单随决策摘要呈）。
- **Q-9**：hotfix-channel bundle 去留。
- **Q-10**：R0/R3 界的 decisions 单模块条数上限 N。
- **Q-11**（两轴）：code-review-scope ∈ {none（后果显式）, R2, all-code} × docs-P8 ∈ {retain, waive}——倾向 {R2}×{retain}；投影去重规则见 B 节。
- **Q-12**：ADDED-only 降 R2 例外（默认不降=R3；论证局限如实——absence of evidence）——owner 显式裁。**yes 案的机械分支已写入判定次序 2 白名单②（r13 REQ-46）**：delta 为 ADDED-only 且每块含 >=1 scenario 且 union 模块数 = 1 → (R2, whitelist)；no 案维持次序 2 的默认 (R3, n/a)。

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

对 r5（7 条）：
- REQ-19：选填案 fallback 显式入判定次序 0.5 行（code-* 定位头全缺 → R3）；两案 AC 参数化。
- REQ-23：f1 精确 oracle——clean tree 强制 + 基线行 == preflight HEAD（fix-ref 独立校验）+ 错误谱；自报边界如实；外仓 x1/x2 候选。
- REQ-26：六格投影去重规则（R0 全 n/a；docs retain 单轮双职责；点检机械验收 = verdict+raw）。
- REQ-28：backend-touched 入字段契约与不变量；28-a 定为无类型表案唯一合法 fallback（b/c 须 owner 明示）。
- REQ-29：Q-6b/Q-11/AC-D3/AC-I 全部同步（f 系、两轴、投影、五项新 oracle）。
- REQ-30：integrity 报告补偿声明删除（实读勘误：只报丢行不报新增改写）；替以 d 的完整呈阅。
- REQ-31：γ' 强绑 d 或 scope≥R2；γ'+a/b/c+none 列为非法组合（仅 owner 明示放弃才合法）。

对 r6（5 条）：
- REQ-23：截图记录行增代码基线+运行标识（preflight 校验==HEAD）；f2 哈希含截图；拒绝 AC 三例。
- REQ-26：R0 拆分 conclusion-only（恒 n/a）/with-decisions（scope>=R2 或 docs retain 时点检含 decisions↔结论一致性）。
- REQ-28：触及信号与 profile 解耦——两字段所有 code-* 必填（半径维度输入）；profile 只决定证据；有类型表案由推导取代。
- REQ-31：以 scope>=R2 替代 d 时点检职责显式（完整 old/new 输入+授权边界 verdict 行入 AC）。
- REQ-32：无 scenario 的 delta 块一律 R3（降级前提=含 scenario；requirement 标题绑定无机械 oracle 不采）。

对 r7（8 条）：
- REQ-23：截图基线 oracle 分域（本仓==HEAD/外仓==fix-ref 值，equality 为申报自洽非绑定证明——诚实标注）。
- REQ-26：R0-with-decisions 点检条件精确化（scope>=R2 任 profile，或 docs∧retain）；其余 n/a 唯一投影。
- REQ-28：类型表案完整化——派生变量（申报出现=F1）、类型表 config 行值域 {frontend,backend,both}、覆盖缺失=保守 R3。
- REQ-32：无 scenario 块条件入判定次序 1（函数内唯一结果）。
- REQ-33：定位头超集不变量（touched ⊇ delta 模块）补入跨字段 F1 表。
- REQ-34：clean-tree 排除集（apriori/**+证据输出路径）；t1/t2 候选如实。
- REQ-35：change-kind 增 doc-fix（docs 专用；触及字段不出现、fix-ref 指文档 commit）；非 docs 出现=F1。
- REQ-36：AC-I 正式清单补全九项新 oracle。

对 r8（6 条）：
- REQ-35：doc-fix delta 必填非零（零 delta = F1）；R1×docs 格 n/a（组合不可达）；docs 下 code-* = F1。
- REQ-37：doc-fix 证明契约单列（check 机械面+P8 语义面）；进 hotfix 前提 = docs-P8 retain，waive 下 R3。
- REQ-38：排除集缩窄至本 bundle+apriori/tmp；配置/spec/truth/runbook 入 clean 检查；证据限 tmp。
- REQ-39：Q-1 补 γ' 连带确认项；Q-6 补 t1/t2 与排除集。
- REQ-40：doc-fix fix-ref 校验强度随 Q-8 v1/v2 显式联动（不预裁）。
- REQ-41：类型表错误谱全列（整表缺失回退申报案/malformed F1/未覆盖保守 R3）。

流程事故记录（r9 评审所指）：上一稿脚本锚点断言失败导致 req-v9 初版为 v8 字节副本而账本先行翻记 fixed(v9)——已重写为真实 v9（本文件）；事故与更正已入 flow-state。

对 r10（4 条）：
- REQ-37：waive 语义统一——半径正交保持（分级函数不读 docs-P8），waive 下由准入层拒绝指路（半径/通道准入/前提三层分离）。
- REQ-40：v2 恢复 prior art 原义（本仓 commit 存在性）；"文档路径归属"扩义删除（无机械词表）。
- REQ-41：类型表机械语法边界+词表外键 F1+重复行按 state A 现行语义；负例入 AC-I。
- REQ-43：点检/P8 verdict 强制内容摘要绑定（preflight 重算比对不等拒绝）；独立于签收候选。

流程事故二次记录（r11 评审所指）：v10 初版再次因脚本锚点断言失败成为 v9 字节副本而账本先翻——同 REQ-42 型事故复发。更正：本文件为真实 v10；自本轮起执行"先写入→grep 验证→再翻账本"的顺序纪律（入 flow-state）。

对 r12（3 条）：
- REQ-44：doc-fix 定位头形状唯一化——touched-modules 必填且 == delta 模块集（相等不变量）；配对契约满足。
- REQ-45：排除集改为全部 apriori/changes/**（并行独立保持）；specs/truth/config/RUNBOOK 仍查（REQ-38 封堵不失）。
- REQ-46：Q-12=yes 的机械分支显式（ADDED-only ∧ 每块含 scenario ∧ 单模块 → R2，入次序 2 并列条件）。

对 r13（3 条）：
- REQ-46：Q-12=yes 分支真写入判定次序 2（白名单②并列条件）；Q-12 措辞同步（no 案默认在次序 2）。
- REQ-47：Q-6c 排除集与正文同步（apriori/changes/**+tmp）。
- REQ-48：doc-fix 半径单列次序 2a——R1-doc（单模块 MODIFIED/ADDED：check+P8 投影，docs trivial 保留）/R3（REMOVED/RENAMED/跨模块）；blast 白名单不适用于 docs；R2×docs 改 n/a、retain/waive 语义移位保持。

对 r14（4 条）：
- REQ-49：2a 自动降级删除——docs 与 code 同一次序 2（默认 R3+人类白名单），fail-up 恢复；docs trivial 存废显式入 Q-5b。
- REQ-50：正式流程评审保持 state A（Q-11 只辖 hotfix；复用仅指证据下限）；waive 指路后 P8 恢复。
- REQ-51：R2×docs 投影唯一化（scope×retain 三案）；R1×docs 无格；陈旧段清除。
- REQ-52：半径值域固定 {R0..R3}；R1-doc 删除；AC-D1 同步。

对 r15（4 条）：
- REQ-51：投影补 all-code（scope∈{R2,all-code}∧retain 双职责；all-code 下 R1 点检归位）。
- REQ-53：Q-5 参数化写入正式表；准入判别输入 = 半径+R2 子型标记（whitelist/behavior，分级函数随附输出）；正交声明如实修正。
- REQ-54：Q-5b 显式披露扩大 Trivial 定义；新增 c 案（b∧state A 三资格交集，倾向 c）。
- REQ-55：verdict 摘要升级 raw 一致性双条件 oracle（重算==verdict 行 ∧ verdict 行逐字在 raw 内）；无签名下的机械上限如实声明。

对 r16（4 条）：
- REQ-53：正式表定案为机械否决两态模型（behavior/R3 硬否决；whitelist 按 Q-5；最终 trivial 资格 = 机械通过 ∧ state A human 判定）；总则与 AC-D3 域同步（含 R2 子型与 Q-5 案维度、human 域如实标注）。
- REQ-54：c 案删除（机械无 oracle、human 面与 b 等价）；a/b 两案对 docs 的共同收紧面（无标注 docs trivial 出局）如实披露。
- REQ-55：raw 定式唯一 verdict 区（marker 唯一、追加即拒）+ 错误谱四例入 AC-I；成本声明修正；诚实边界保留。
- REQ-56：随 c 案删除而消解（三资格显式定为 human-owned，机械层无穿透态）。

对 r17（4 条）：
- REQ-53：分级函数输出显式二元组（半径, 子型）——判定表各行输出改写；AC-I 增派生断言。
- REQ-53a：B-C 总则与正式表标题统一为两层模型口径（机械否决 ∧ human 判定）。
- REQ-57：R2-whitelist×trivial 的验证下限落表（同 hotfix R2 对应格：code scoped verify/docs check+retain/ui 截图）。
- REQ-55：verdict 基数定式（双职责恰两条、点检前 P8 后、各携摘要；单职责恰一条）；四项错误谱+基数序错例落 AC-I。

对 r18（2 条）：
- REQ-53：全分支二元组收口（0.5 行/次序 1 拒绝行/Q-12 摘要全部 (Rx, 子型) 形态）；AC-I 增非 R2 分支 (Rx, n/a) 全域断言。
- REQ-58：评审摘要域显式定义（bundle 业务内容+被评代码基线；本仓 HEAD/外仓 fix-ref 自洽等级）；HEAD 变化即失配强制复审，独立于 f2。

对 r19（1 条）：
- REQ-58：clean-tree 升为一切含评审组合的无条件前提（评审时刻+preflight 双时点；不随 f 候选；排除集同 B4）；与 state A P8-on-dirty 的边界如实区分（hotfix 无 STEP5）。

对 r20（2 条）：
- REQ-58：clean-tree 独立于 Q-6c（t2 不适用于含评审组合）；排除集错引修正（指 f1 定义）；AC-I 补 f2/f3+评审组合拒绝例。
- REQ-59：摘要域改为业务实体正列（delta/decisions/conclusion/bindings）+排除域完整清单含流程状态文件——评审后更新 hotfix-state 不再自失效；AC-I 补不失配例。

对 r21（2 条）：
- REQ-58：Q-6c 摘要同步 t2 的适用限制（仅无评审组合）。
- REQ-60：摘要正列补全部申报字段（分级/评审范围/验证 scope 的输入——改之即换契约，评审后修改即失配）。

对 r22（1 条）：
- REQ-61：摘要域切分按实体不按文件（正列实体优先）；c1' 下状态文件按定式节切分（bindings 入域/流程元数据出域），c1 下按文件——两案语义一致；AC-I 双例。

对 r23（1 条）：
- REQ-62：c1' 节切分错误谱 fail-closed（标题基数恰一、重复/嵌套/错序 F1、缺失=无节（需声明时缺声明 F1）、域外 bindings 行 F1）；AC-I 补 malformed 拒绝例。

对 r24（1 条）：
- REQ-62：基数唯一化——{0,1} 由声明需求决定（需声明必 1、无需声明必 0，空节 = F1 多余节）；>1/嵌套/错序/域外 F1；AC-I 条件分支四例+错序例。

对 r25（1 条）：
- REQ-63：bindings 需求函数参数化 f(change-kind, 目标键, Q7c)——code-*+目标键→1；doc-fix→0（check+P8 免除）；零 delta 随 p1/p2；no-code→0；AC 分支补 doc-fix 与 p2 例。

对 r26（1 条）：
- REQ-64：需求函数按载体投影补全（载体单位抽象——c1 文件/c1' 节/c2 c3 块内行；p2×c2/c3 非法组合联动约束显式；doc-fix 域外识别；摘要抽取各载体声明）；AC-I 载体分支三例。

对 r27（2 条）：
- REQ-65：容器层与声明行层基数分离（c1/c1' 容器恰一或零；行层一切载体通用每键恰一行；c2/c3 无容器直落行层）；AC 补多目标键正例。
- REQ-66：AC-D5 增联动选择组契约（联动候选成组展示+非法配对标明+机械拒绝）。

对 r28（2 条）：
- REQ-67：声明行层再分 keyed 型（非零 delta 逐键）与 singleton 无键型（零 delta+p2 恰一条 bundle 级）；矛盾消除；AC 补 p2 正例。
- REQ-68："STEP2 机械拒绝"声明撤回——改为合法联合选项表+gate③ 决策记录命中合法表（人工核对验收）；机械校验器列未来可选；Q-8/Q7a、Q-8/Q7c 命名空间化消除与顶层 Q-7 的编号碰撞。

对 r29（2 条）：
- REQ-69：载体互斥显式（仅所裁载体可现 bindings 定式，其余位置可识别形态一律 F1）；交叉载体负例入 AC。
- REQ-70：Q-4×Q-8/Q7c 入合法联合选项表（移除案 singleton 仅 tests:；不移除案 no-test 后果单独定义）；"R1 无载体"推论修正；两分支 AC。

对 r30（1 条）：
- REQ-70：保留案参数化完毕（仅限 R1、p2 singleton 载体、语义=留痕非豁免、验证下限降级显式、债务无机械载体如实、清偿=审计+人工；"及 R2"不列合法候选）；"已收敛移除"措辞改"倾向待确认"；推论/B-C R1 格/AC 四处同步。
