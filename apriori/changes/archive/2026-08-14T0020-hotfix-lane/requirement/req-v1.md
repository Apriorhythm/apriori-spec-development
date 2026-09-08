# req-v1 — hotfix-lane：hotfix 最小回写单元 × 验证强度机械化缩放

target lineage: on-the-fly 分支（v4 产品线；main 暂不动；不合并 v1/v3）。state A 含已归档的 P0 前三 change（KB source-commit 4127653）。本 change 到 gate③ 为止**只产文档**（apriori/changes/hotfix-lane/ 下），不 touch lib/bin/test。

## 输入优先级声明

1. owner goal 文本（requirement/goal-verbatim.md）——已拍板项高于一切：准入按爆炸半径分级、强制证据存在性/缩放证据覆盖面、两问题一体设计；
2. prior art：hotfix-channel req-v13（13 轮对抗评审收敛，VERDICT 0）——其已收敛契约按引用复用，与新拍板冲突处以新拍板为准；
3. 复盘文档（~/apriori-feedback/，总复盘为入口）——实证来源，reality wins。

## 背景（实证，复盘缺陷账为据）

- **逃逸实证**：UAT 四单（1012767/1012739/1012772/1012769）全部逃逸流程；BR-007 已知 spec 漂移；1012769 档案目录零 .md。
- **爆炸半径实证**：修复回归率 3/24 = 12.5%，**三条全部同型**——改动改变数据形态或契约但只验证触发现象（改 GROUP BY 引入重复项、改前端维度漏改后端、改"最新"口径不同步 bind_status）。这就是"什么改动不配走轻量路径"的缺陷账依据。
- **trivial 侧实证**：三轮提测 12 单在 2 天内流程内修复归档——"走流程=慢"在小 change 上不成立；轻量通道的价值在**留痕成本**而非绕开流程本身。
- **纯排查实证**：UAT 4 单中 3 单不改代码（环境/数据/基准问题），今天没有归档的地方；测试报单准确率随轮次递减（75%→25%），越往后这类占比越高。
- **验证强度实证**：RUNBOOK 验证矩阵按项目类型给要求但类型靠 agent 自判；E2E/截图对自判 UI 项目是自觉项，"截图作为人类可查证物"无概念；owner 被迫每个提示词重复强调"测试、E2E、Playwright 截图"。
- **成本刻度**：hotfix 留痕的最小成本必须压到比"不记录"只贵几分钟，否则照样被逃逸。

## 目标态 B

### B-A. hotfix 最小回写单元（承接 hotfix-channel 已收敛契约）

**A1. 形态**：10 分钟走完的最小 bundle——结论（唯一无条件必填）+ 可选 spec delta + 绑定声明（tests/no-test，见 B-C 耦合表对 no-test 的半径限制）+ 可选 decisions 追加 + 直接归档。三类承接对象：紧急修复事后补记（spec-preserving 零 delta 合法）、"不用修"纯排查结论、上线后业务事实。

**A2. prior art 契约引用（req-v13 已收敛，本 change 按引用采纳、gate③ 一并呈批）**：
- 身份：`hotfix-state.md` 专名状态文件与 `flow-state.md` 互斥；不可互转；升格人工；同名拒绝；
- 事务：F1 确定性校验全 preflight 零写入 / F2 I/O 故障唯一部分提交源；①stores→②truth→③bundle move（completion point）；
- 签收：d+d1（dry-run 业务摘要令牌 + 排除域 approval.md + 显式第二命令写入——保持 gate④"人看过的内容=落盘内容"）；
- 绑定声明：载体 c1'（bindings 节住状态文件）；目标键 scenario ID 优先、重复键 F1 拒绝（k1）；
- truth 回写：module 头寻址、t1 dry-run 分配 ID、o1 残余 TOCTOU 诚实声明、s2 supersession；
- KB 生命周期：r1+r2、定位头（touched-modules+fix-ref 成对）、单仓域 λ1、外仓 w2（unverifiable 明示）+ 本仓不可观察对称披露。
- **与新拍板的冲突处**：req-v13 的防逃逸是"advisory 提示"（Q3 倾向 ii）——被新拍板**取代**为爆炸半径硬准入（A3）；req-v13 的 Q7b 全局后果（g1 债务阻塞逼偿）保留但受 B-C 耦合表约束（R2 半径禁用 no-test，见下）。

**A3. 准入按爆炸半径分级（owner 已拍板方向；分级标准须机械可判）**：

| 级 | 定义（缺陷账依据） | 机械信号（apriori 可见面——诚实边界：apriori 看不见应用仓 diff，机械判定对象 = bundle 声明 + spec delta 形状） | 准入 |
|---|---|---|---|
| R0 | 不改代码（纯排查结论/业务事实） | 零 delta + change-kind 声明 no-code | hotfix ✓ |
| R1 | 真 trivial：文案、配置、单出口展示（缺陷账：此类无回归实证） | delta 仅 ADDED 澄清类或零 delta + change-kind 声明 trivial + touched-modules ≤1 | hotfix ✓ |
| R2 | 单模块行为修复，不改契约/数据形态/选取口径 | delta 可含 MODIFIED/REMOVED，touched-modules = 1，无契约类标记命中 | hotfix ✓（验证下限抬高，见 B-C） |
| R3 | 改契约、改数据形态、改选取口径、跨端双端（缺陷账：修复回归 3/3 全部此型） | 契约类信号命中（候选载体见 Q-1）或 touched-modules ≥2 或双端声明 | **拒绝——指路全流程 change** |

- **机械可判性的两层诚实声明**：delta 形状/模块计数/键规则是**硬信号**（机器直接判）；change-kind 与双端声明是**软信号**（作者自报，谎报＝归档物留痕自证 + 后续任何 change 评审天然可见）。分级判定 = 硬信号优先，软信号只能把级别**往上**推（往 R3 方向），不能往下拉——声明 trivial 但 delta 含 MODIFIED → 按硬信号定 R2/R3（fail-up 原则）。
- **R3 契约类信号的载体**（设计裁，Q-1）：候选 α) delta 触及的 requirement 块携带 spec 侧标注（如块级 `blast: contract` 标记——需要 spec 书写新约定）；β) 仅按 delta 操作形状+模块数+软信号（无 spec 改动，弱一档——改口径类 MODIFIED 在单模块内不可判）；γ) α+β 混合（标注可选，标注命中即 R3，无标注按 β 保守判）。

### B-B. 验证强度机械化缩放（profile × tier）

**B1. 项目级声明**：process-config 增加 `verification-profile` 行——语义与 test-cmd 完全同构：human-owned、agent 只读、表格单行、缺省语义 = 未声明（现状自觉项，不升格）。值集（设计裁，Q-2）：候选 `ui` / `backend` / `fullstack` / `docs`（fullstack = ui 规则叠加 backend）。
**B2. 升格语义**：声明 profile 后，该 profile 对应的证据要求从 RUNBOOK 自觉项升格为**对应 tier 的机械退出条件**（gate/归档 preflight 可查的证据存在性）。
**B3. 证据形态（强制存在性，不强制内容）**：
- 绑定测试：现行 verify GREEN（已机械）；
- E2E：运行工件（文本化 pass/fail 输出落 bundle 或声明路径）；
- 截图：**RUNBOOK 现行约束保持——截图文件是仪器（apriori/tmp/，gitignored），不入库**；机械可查物 = bundle 内的**截图观察记录行**（每张：截图路径 + 一行文本观察 + 时间），存在性检查查记录行与所指文件存在（归档时刻）；
- not-applicable：ui-profile 下纯后端 change 的 UI 层显式 `ui: not-applicable — <理由>` 行，机械查存在性。
**B4. 覆盖面缩放原则（owner 拍板）**：强制的是证据**存在性**，缩放的是证据**覆盖面**——完整流程全量、轻量路径增量（只覆盖受影响 scenario/页面）。

### B-C. 耦合决策表（hotfix 验证下限 = profile × 爆炸半径；方向稿，逐格论证归 STEP2）

| 半径 \ profile | 未声明 | backend | ui（本次 touch 前端文件时） |
|---|---|---|---|
| R0 无代码 | 结论即全部 | 同左 | 同左 |
| R1 trivial | 受影响 scenario 绑定测试绿 **或** no-test 理由 | 绑定测试绿 或 no-test 理由 | 绑定测试绿或 no-test 理由 **+ ≥1 张受影响页面截图观察行**（单页单截图分钟级） |
| R2 单模块行为 | 绑定测试绿（**no-test 禁用**——行为修复无测试即回归温床，缺陷账 3/24 的教训面） | 同左 | 同左 **+ 受影响页面截图观察行** |
| R3 | ——不准入，全流程 change：medium/large 全量矩阵（ui：全量 E2E + 截图证据；backend：现行矩阵）—— | | |
| 正式 change（medium/large）参照 | 现行矩阵 | 现行矩阵 | 现行矩阵 + E2E/截图升格为机械退出条件（B2） |
| trivial tier 正式 change | 增量语义同 R1 行（缩放规则对流程内 trivial 同样适用——避免"hotfix 比 trivial change 更严/更松"的倒挂） | | |

- 表内"no-test 禁用于 R2"是本 change 对 req-v13 g1（no-test 债务+阻塞逼偿）的**收紧**：g1 语义保留于 R1（trivial 允许 no-test，债务照 g1 机制可见与逼偿），R2 直接不给 no-test 选项——这是"轻量通道零验证窗口期"的正面封堵。
- 双向一致性：同一半径同一 profile 下，hotfix 与流程内 trivial tier 的验证下限**同一张表**（避免通道套利）。

## 范围外（won't do，goal §C）

- P2-10 raw 存证瘦身不动（收益在可审计性，不在执行速度——owner 已对齐）；
- P1 评审 prompt 五问/假设登记不动；
- RUNBOOK 仅新增本设计所需节/表，不重构既有章节；
- 本 change 不产实现代码（gate③ 止）；沿用 req-v13 全部 won't-do（AM-17 不动、不自动互转、三态不动、无机械 Contract 相关性判定等）。

## 验收标准（设计验收——本 change 交付物是设计包，AC 分两层）

**AC-D 层（gate③ packet 自身，本 change 内可判）**：
- AC-D1：设计包含完整爆炸半径分级表——每级：定义、缺陷账实证引用、机械信号（硬/软分层）、fail-up 规则、正反例各 ≥1（从缺陷账取真实案例映射）。
- AC-D2：profile×tier 决策表逐格有论证（含"为什么不是别的切法"的至少一处对比）；空格显式标 n/a 不留白。
- AC-D3：耦合规则完整覆盖 {R0..R3} × {未声明, backend, ui, fullstack(若采)} × {hotfix, trivial, medium/large}，无未定义组合。
- AC-D4：spec delta 草案覆盖 RUNBOOK 新节（hotfix lane + 验证缩放表）双语、process-config 模板行、未来 CLI 检查点的 scenario 级描述（不含实现）。
- AC-D5：owner 待拍板点显式成列（决策摘要页），不藏正文。
- AC-D6：与 req-v13 prior art 的采纳/取代关系逐条列明（采纳按引用、取代给理由）。
**AC-I 层（未来实现 change 的验收基线，本 change 只定义不执行）**：分级判定正反例、profile 行解析与缺省、耦合表逐格机械检查、证据存在性检查、既有 gate/verify 行为回归——细化归 STEP2 spec delta。

## 开放问题（gate③ owner 必答；设计阶段我会给倾向）

- **Q-1**：R3 契约类信号载体 α（spec 块标注）/β（纯形状）/γ（混合）——初始倾向 γ。
- **Q-2**：profile 值集与 fullstack 语义。
- **Q-3**：R2 禁用 no-test 是否采纳（vs 保留 no-test+债务逼偿到 R2）。
- **Q-4**：req-v13 prior art 契约束的整包采纳确认（A2 清单），及其 Q1-Q9 中未被新 goal 覆盖项的最终裁定。
- **Q-5**：hotfix-channel bundle 的去留（本 change 取代其范围）。
- **Q-6**：截图观察记录行的最小字段集（路径+观察+时间是否足够）。
- **Q-7**：runbook-version 4.0→4.1。
