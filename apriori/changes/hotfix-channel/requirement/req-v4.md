# req-v4 — hotfix-channel：change 外的最小回写单元

target lineage: on-the-fly 分支（v4 产品线；main 暂不动，owner 指示；不合并 v1/v3）。state A 含已归档的 P0 前三 change（KB source-commit 4127653）。

## 背景

同 req-v1（墙二/样本四实证：UAT 四单逃逸、BR-007 漂移、1012769 空白档案、"不用修"排查无承接、知识回流无落点；成本刻度：比"不记录"只贵几分钟）。

## 目标（目标态 B）——设计先行：机制候选连同后果完整陈列，gate③ 人类裁

### B1. 新概念：hotfix = change 外的最小回写单元，承接三类对象

1. 紧急代码修复的事后补记（结论 + spec delta + 测试绑定声明或 no-test 理由）；
2. "不用修"的排查结论（结论即全部）；
3. 上线后学到的业务事实（KB Decisions 追加条目；可与 1/2 并存）。

### B2. 身份与位置（Q2/Q3 人类裁）

- **候选 a：复用 `apriori/changes/<name>/`，身份由专名状态文件承载**（`hotfix-state.md`，与 `flow-state.md` 互斥存在——不是 flow-state 里一个可编辑的 `type:` 字段，杜绝"普通 change 改一行标记降级逃逸 R2/账本/raw"）。生态复用按消费点分项：目录枚举/兄弟归因近乎自动成立；`status`、身份解析、gate 需按状态文件名适配（gate 映射见 B6）。
- **候选 b：独立命名空间 `apriori/hotfixes/`**。后果如实陈列：resolver/status/gate/verify 兄弟归因/archive discovery 现全部只认 `changes/`——需要新一套路径规则、同名冲突裁决、归档布局；"复用生态"不成立。
- **身份不变量（两案通用）**：hotfix 与 change 不可互转——`flow-state.md` 与 `hotfix-state.md` 同时存在 = 非法（fail-closed）；"升格"= 人工新开 change 并在其 req 引用 hotfix bundle，无自动化；同名 hotfix 与 change 冲突 = scaffold 拒绝。
- **防逃逸判据（Q3）**：候选 i) 仅 RUNBOOK 文字约束 + 归档物可审计；ii) advisory 提示（mutation 操作数 > N 或跨模块数 > M 时打印"考虑开正式 change"，不拒绝）；iii) 硬上限拒绝。倾向 ii（软提示；硬上限会被真实紧急场景反噬），人类裁 N/M。

### B3. Decisions 追加的数据契约（ID 归属 → Q6；并发边界诚实声明）

- **写入目标表达**：decisions 条目自带目标模块头（如 `module: spec-runner`）；一个 bundle 允许多条、跨多模块。
- **条目机器格式**（候选定式，gate③ 裁）：`- D-<模块缩写>-hf-<n> (active): <正文>。 Ratified via hotfix <name> (<date>).`
- **ID 归属（Q6）**：t1) 归档命令在 dry-run 时分配（呈阅所见即最终 ID）；t2) 作者手写（preflight 与写入时刻各查一次碰撞，碰撞 = conflict 拒绝）。倾向 t1。
- **truth 侧并发保护（诚实边界，Q6 连带裁）**：dry-run 记录各目标 truth 文件基线哈希；写入时刻重读比对，不一致 → conflict、truth 零写入、重新 dry-run。**如实声明：这是无锁的"读→校→原子改名"，校验与改名之间存在 TOCTOU 窗口——两个并发归档可同读同校后先后改名，后写者静默覆盖前者；基线校验缩窄窗口但不消除**（state A 的 spec CAS 同此边界，"同级保证"仅指此弱保证）。候选：
  - o1) **接受残余竞态**（倾向）：单机、人类驱动、hotfix 并发率接近零；AC5 只断言"写入时刻校验前的外部改动 → conflict"，不承诺窗口内互斥；
  - o2) 锁文件互斥（`O_EXCL` 原子创建）：真互斥，代价 = 陈旧锁的清理策略与失败路径，新增机制面；
  - o3) 按 truth 文件串行化的其他条件写机制——列出但同样有实现复杂度。
- **失败语义（归 B4 的 F1 类，preflight 全谱 fail-closed）**：目标 truth 文件不存在 / 无 `## Decisions` 节 / 节重复 / 目标为 symlink 或逃逸路径 / malformed 条目 / ID 冲突 → 整个归档拒绝，零写入。
- **重跑语义**：同 ID 同内容 → no-op（幂等）；同 ID 异内容 → conflict 拒绝。
- **与 delta 的对应**：两类各自独立寻址，无隐式关联。
- Contract 节与 source-commit **永不**被 hotfix 触碰（其生命周期后果见 B9）。

### B4. 归档的两类失败与真实事务边界

- **F1 确定性校验错（全部前置，任一失败 = 全局零写入）**：bundle 不可解析 / 结论与必填头缺失 / 声明语法错（B5）/ 防逃逸硬判（若 Q3 裁 iii）/ spec store CAS 失配 / truth 目标与格式全谱（B3）/ truth 基线失配 / ID 冲突——所有确定性检查在任何写入之前跑完（global preflight）。
- **F2 提交期 I/O 故障（唯一可致部分提交的族）**：写集合三段有序——① spec stores（现行逐文件原子改名；部分提交可能且不回滚，state A 现状如实声明）→ ② truth Decisions 追加（逐文件；条目 ID 幂等）→ ③ bundle 移入 archive（completion point，非回滚点）。任一段 I/O 失败：已完成段保持、失败报告指名已完成段与恢复动作；重跑续跑受 B8 所裁新鲜度约束（严格案下部分提交即令牌失效，剩余 diff 重新呈阅批准）。每段各有 fault-injection 验收（AC6）。

### B5. no-test 声明：载体、语法、全局后果（→ Q7）

- **载体（Q7a）**：c1) **独立 manifest**（bundle 根 `bindings.md`；不进 living spec，归档不改写被批准的 delta）——倾向；c2) delta 块内行、归档合并前剥离（代价：改写人类批准过的块）；c3) HTML 注释随块合入 store（代价：spec 污染，债务随场景可见）。
- **目标键与语法（属 F1，preflight 全拒；键唯一化）**：**声明的目标键 = scenario ID；仅当块不含任何 scenario 标题时目标键 = requirement 块标题**。每个目标键恰有一条声明（多 scenario 块 = 逐 scenario 各一条，块级不再另计——v3 的"每块恰一条"与"逐 scenario"矛盾在此收口）。RENAMED：rename-only（仅 `- Old -> New` 映射）不引入新内容、免声明；rename-then-modify 的 MODIFIED 块按上述键规则照常。形式 `tests: <非空绑定说明>` 或 `no-test: <非空理由>`；空值 / 同键重复 / 同键两种并存 / 引用不在 delta 中的键 / delta 键缺声明 / 不可解析 → 各自拒绝。REMOVED-only 免声明。
- **全局后果（Q7b，两层诚实声明）**：state A 的 verify 不识别豁免——合法获批的 no-test active scenario 与谎报者一样 UNBOUND：
  1. **store-wide verify 从此 GAPS**（req-v1 的"全绿路径"承诺已删，明示为行为选择）；
  2. **archived gate 阻塞（r3 补明）**：在途 C1 是 change-scoped（P0-2），其他在途 change 不受阻；但 **archived C1 跑 whole-store verify，RUNBOOK STEP6 要求每个正式 change 归档后跑 gate 入 gate④ packet——只要 no-test 债务在，所有后续正式 change 的 STEP6 post-archive gate 持续 BLOCKED**。
  候选（含债务生命周期与解除路径）：
  - g1) **接受债务 + 阻塞即逼偿机制（倾向）**：解除路径 = 后续以 hotfix/change 补测试绑定、或 REMOVED 该场景；后果如实标注——债务不清则正式 change 无法完成 STEP6，这是强制清偿的设计代价，人类裁是否可接受；
  - g1b) archived gate 对已声明 no-test 债务显式豁免——触碰 gate 语义、属弱化，如实标；
  - g3) 限定 no-test 仅可用于不产生 active UNBOUND 的情形——砍掉承接类别 1 的主用例，如实列。
  - ~~g2 豁免语义~~（r3 REQ-11 裁定）：**"verify 第四态豁免"若使无测试场景不再阻塞 GREEN，即属放宽 fail-closed 绑定语义——与别改清单"只可强化"约束冲突，非合法候选，从空间移除**；保留其弱形式 **g2'）报告级债务标注**：verify 报告对 no-test 场景附注理由来源，**verdict/GAPS 判定分毫不动**——只改可读性，不解决 archived gate 阻塞，如实标。
- 候选 ii（归档隐式跑 verify）与 iii（引用既有 verify 证据）保留在空间内：ii 新增测试执行副作用/耗时（若裁 ii，AC1 另报含测试总耗时）；iii 证据新鲜度无法机械保证。AC3 按所裁机制取变体。

### B6. gate 七项的逐项映射（→ Q8）；zero-delta 例外只属 hotfix 通道

- 纯结论 hotfix 走 hotfix 专属命令/路径——普通 `archive --change` 的 AM-17 zero-delta fail-closed 分毫不动（回归断言，AC4）。
- **state A 七项按真实编号（r3 勘误）：C1 绑定核验 / C2 tasks / C3 flow-state 合法性 / C4 账本 / C5 verdict+raw 证据 / C6 KB freshness / C7 CAS**。hotfix 有意不具备 tasks/账本/verdict/raw（C2/C4/C5 的物料），且候选 a 下只有 `hotfix-state.md`（C3 现要求 `flow-state.md`）。候选：
  - m1) gate 对 hotfix bundle **明确拒绝并指路**（"hotfix：用 hotfix 归档 preflight"）——合法性检查全部住在归档命令；
  - m2) **逐项适配表**：C1 仅当有 delta（scoped 判）；C2/C4/C5 = n/a（输出明示，非静默跳过）；**C3 两个子候选（r3 补明）**：m2-α C3 适配为 hotfix-state 合法性检查（身份/必填头/结论非占位入 gate）；m2-β C3 = n/a 且输出**明示"gate PASS 不代表 bundle 可归档，合法性由归档 preflight 判"**——不留"非法 hotfix 得 PASS"的静默通道；C6 仅当有 decisions（查目标模块）；C7 仅当有 delta；
  - m3) gate 完全不适用 + 等价检查全量移入归档 preflight（连拒绝指路都不做——静默风险如实标）。
  - 共通不变量：**正式 change 的 gate 七项分毫不动**；共享实现须有回归断言（AC10）。倾向 m1 或 m2（m2 内倾向 α），人类裁。
- 在途 hotfix 的 `verify --change`：无 delta 时明示 n/a；有 delta 时照常。`status` 列出并标注 hotfix。
- 空 bundle 冒充：被 B7 结论强制拦截。

### B7. 结论强制

conclusion 是 hotfix 的唯一无条件必填物：缺失 / 空白 / 仅模板占位文本（占位判定 = scaffold 生成的原文未改）→ 归档拒绝；必填头（name/date/承接类别）缺失或重复 → 拒绝；不可解析 bundle → 拒绝（均属 F1）。负向验收全列（AC7）。

### B8. 人类签收（gate④ 原则的映射，Q1 人类必裁）

四个候选，按批准语义 / 证据 / 强制力三轴诚实标注：

| 候选 | 批准语义 | 证据 | 强制力 |
|---|---|---|---|
| a) 调用即批准 | 假定命令由人类亲手跑 | bundle 状态头记录调用时间 | 纯纪律——CLI 无法分辨调用者是人还是 agent |
| b) `--signed-off-by <人>` | 自声明 | 一个字符串 | 纯纪律——agent 同样能填 |
| c) 分级（纯结论免签、有回写必签） | 同 b 分级 | 同 b | 同 b |
| **d) 两步式：dry-run 呈现全部将写内容 → 显式第二命令写入** | 人类看过 diff 后批准 | 内容绑定令牌 + 持久批准记录（见下） | **保持现行 gate④ 语义**——agent 被 RUNBOOK 禁止自跑批准命令（同 R3 模式，可被 Stop-hook/CI 加固） |

**候选 d 的批准新鲜度（Q1 连带裁）**：
- d1) **业务输入摘要令牌（倾向；r3 收口自失效循环）**：摘要范围 = **bundle 业务内容（明确排除机器生成的批准记录文件）+ 各目标 spec store 基线 + 各目标 truth 基线**；dry-run 打印令牌，批准命令携令牌、写入前对同一范围重算比对，任何业务输入已变（含 F2 部分提交后的重跑）→ 令牌失效、剩余 diff 重新呈阅换新令牌。批准记录（令牌+日期+dry-run 输出）由批准命令写入 bundle 的**排除域文件**（如 `approval.md`，永不参与摘要——自引用与自失效循环由排除域切断），随 bundle 入 archive 供审计。变体 d1-ext）批准记录存 bundle 外的不可变工件（archive 侧独立文件）——列出供裁。
- d2) 批准时只重查 CAS 基线（bundle 自身变化检不出——弱一档，如实列）。
- d3) 批准不绑定内容（纯两步纪律——与 a/b/c 同级弱化，如实标）。

诚实结论：a/b/c 实质是把受保护关卡换成纪律背书；只有 d（配 d1）保持"人看过的内容 = 落盘的内容（模摘要排除域）"。倾向 d+d1，你裁。

### B9. KB 生命周期边界（r3 REQ-12 补节 → Q9）

- **Contract freshness**：hotfix 永不碰 Contract 与 source-commit（B3 不变量）；但类别 1 的代码修复 commit 会使该模块 C6 freshness 检查看到新 commit——**债务如实存在**。决策空间：
  - r1) 声明为可见债务（倾向）：C6 的 stale 提示即真相；清偿走正式 change 的 KB 写回；hotfix 归档输出对涉及模块打印 freshness advisory（提示而非拒绝）；
  - r2) hotfix 资格判据：仅"不改变 Contract 所述行为"的修复适合 hotfix，改变契约行为的修复必须升格 change——RUNBOOK 文字判据 + 归档物可审计（与 Q3 同风格）；
  - r1+r2 可并用；硬机械判定（diff 分析 Contract 相关性）不做（不可判定，如实列）。
- **Decision supersession**：现行 KB 语义——旧 decision 仅在被新 decision supersede 时失效（`superseded-by: <id>`）；类别 3 的业务事实可能**否定既有 active 条目**。候选：
  - s1) hotfix 仅允许追加**不与既有 active 冲突**的新事实；发现冲突 → 拒绝并要求升格正式 change（冲突判定 = 人类在 dry-run 呈阅时判，机器不判语义冲突——诚实边界）；
  - s2) 允许 supersession 形态：新条目 + 旧条目原子加注 `superseded-by`（同文件单次改名内完成；受 truth 基线校验保护）——dry-run 呈阅含旧条目改动，人类看全再批；
  - s3) 自由追加（可能双 active 冲突并存——弱化，如实标）。
  - 倾向 s2（供裁）；s1 为保守回退。

## 范围外（won't do）

同 req-v1；另加：不改 AM-17 与普通 archive 的任何 fail-closed；不做 hotfix↔change 自动互转；不做旧漂移批量回填工具；不改场景 ID 三态与 UNBOUND/GAPS 判定语义（g2 豁免形态已从候选移除）；不做 Contract 相关性的机械 diff 判定。

## 验收标准（可测；细化待 STEP2）

- AC1（成本刻度）：lab 脚本化重演三类各一遍——每类 ≤3 条命令、手工编辑 ≤2 个文件；脚本墙钟（scaffold→归档成功，不含测试套件与人类思考）≤10:00；三类分别达标；若 Q7 裁候选 ii，另报含测试总耗时。阈值可在 gate③ 调整。
- AC2（漂移终结）：BR-007 型重演——hotfix 携 REMOVED delta 归档 → verify 不再要求、lingering 测试转 ORPHAN；CAS 生效；modified-integrity 机制未被破坏（REMOVED 本身不产生 integrity diff——按 r3 advisory 表述）。
- AC3（声明判定，按 Q7 所裁取变体）：声明制 → 目标键规则（scenario ID 优先/无 scenario 块级/RENAMED-only 免）+ 语法错误谱逐项拒绝 + REMOVED-only 免 + 混合 delta 逐键判；候选 ii → verify 运行与工件断言；候选 iii → 证据引用与新鲜度声明断言。
- AC4（纯结论）：无 delta 无 decisions 的 hotfix 经专属路径归档只移 bundle，store/truth 零变化；普通 `archive --change` 对 zero-delta 照旧 exit 2（回归断言）。
- AC5（Decisions 契约，按 Q6 所裁并发案缩窄）：多条多模块追加成功且格式/ID/出处正确；F1 全谱 → 整体拒绝零写入；同 ID 同内容重跑 no-op、异内容 conflict；**写入时刻校验前**的外部 truth 改动 → conflict 且零写入（o1 案不断言校验-改名窗口内互斥；若裁 o2 则加互斥断言）。
- AC6（事务边界）：F1 任一项 preflight 拦截 = 全局零写入；F2 三段各注入 I/O 失败——已完成段保持、报告指名已完成段、按所裁新鲜度规则续完。
- AC7（结论强制负向全谱）：缺失/空白/未改占位/缺头/重复头/不可解析 → 各自拒绝且报错指名。
- AC8（示范，重构材料）：以复盘文本（声明输入）重构 1012769 的应然 hotfix bundle 作为冻结 fixture（标注"依复盘重构，非原件"），归档演示三类承接俱全；期望 = 固定文件清单与关键内容断言。
- AC9（身份不变量）：flow-state 与 hotfix-state 并存 → 各消费点 fail-closed；同名冲突 scaffold 拒绝；防逃逸提示按 Q3 所裁形态触发。
- AC10（生态与不弱化）：status 标注列出；兄弟归因对活 hotfix delta 生效；正式 change 的 gate 七项行为回归断言无变；318 存量测试保持绿；RUNBOOK/docs 双语 + CHANGELOG；check --self 绿。
- AC11（签收，按 Q1 所裁）：若裁 d+d1——业务输入任一变化（bundle 业务文件/store/truth/部分提交后重跑）→ 令牌失配、拒绝写入、要求重新呈阅；批准记录落于摘要排除域文件、随 bundle 归档、含令牌与 dry-run 输出；批准记录写入本身不使令牌失效（排除域断言）。
- AC12（KB 生命周期，按 Q9 所裁）：类别 1 归档对涉及模块打印 freshness advisory（若裁 r1）；supersession 形态按 s1/s2 断言（s1：冲突拒绝路径存在；s2：新旧条目同文件原子更新 + 呈阅含旧条目改动）。

## 开放问题（gate②/③ 人类必答）

- **Q1（核心，B8）**：签收机制 a/b/c/d——倾向 d；连带新鲜度 d1/d1-ext/d2/d3——倾向 d1（业务输入摘要 + 排除域批准记录）。
- **Q2（B2）**：位置与身份——倾向 a（changes/ 复用 + 专名状态文件互斥）。
- **Q3（B2）**：防逃逸——倾向 ii（advisory 提示，阈值你定）。
- **Q4**：runbook-version 4.0 → 4.1？（新增流程语义节。）
- **Q5**：命名沿用 `hotfix`（复盘用词），除非你改。
- **Q6（B3）**：Decision ID 归属 t1/t2——倾向 t1；连带并发案 o1/o2/o3——倾向 o1（接受残余 TOCTOU，诚实声明无互斥；hotfix 单机人驱并发率近零）。
- **Q7（B5）**：a) 载体 c1/c2/c3——倾向 c1；b) 全局后果 g1/g1b/g2'/g3——倾向 g1（债务+archived gate 阻塞即逼偿机制，解除路径明示；g1b 弱化 gate、g2' 仅改报告可读性、g3 砍主用例）。机制大类（声明制/隐式 verify/证据引用）随 a 一并裁。
- **Q8（B6）**：gate 映射 m1/m2（α：C3 适配 hotfix-state 合法性；β：C3 n/a + PASS 边界明示）/m3——倾向 m1 或 m2-α。
- **Q9（B9）**：Contract freshness r1/r2（可并用，倾向 r1+r2）；Decision supersession s1/s2/s3——倾向 s2（s1 保守回退）。
- **次级"裁"项承接声明**：正文其余标"裁"的次级选择由 STEP2 设计者提出具体方案、gate③ 整体审定；实现前无一生效。

## 需求裁定记录

对 r1/r2：见 req-v2/req-v3 文末记录。

对 r3（六条）：
- REQ-2：d1 摘要范围改为"业务内容（排除机器生成批准记录）"；批准记录落排除域文件（approval.md 永不参与摘要），自引用/自失效循环由排除域切断；d1-ext 外置工件变体列出；AC11 增排除域断言。
- REQ-3：删除"后写者必败"硬保证——如实声明无锁读→校→改名的 TOCTOU 窗口（spec CAS 同此边界）；候选 o1 接受残余竞态（倾向）/o2 锁文件互斥/o3 串行化条件写 → Q6 连带；AC5 相应缩窄。
- REQ-5：目标键唯一化（scenario ID 优先，无 scenario 块级，"每键恰一条"取代"每块恰一条"）；RENAMED-only 免声明、rename-then-modify 照键规则；g1 补 archived gate 阻塞的全局后果（archived C1 whole-store + STEP6 强制 gate → 后续正式 change STEP6 BLOCKED）+ 解除路径 + g1b 候选；AC2 的 integrity 表述按 advisory 修正。
- REQ-6：七项编号按 lib/gate.js 实证勘误（C3 flow-state 合法性/C4 账本/C5 verdict+raw）；m2 补 C3 子候选 α/β（β 必须明示 PASS 边界，不留非法 hotfix 得 PASS 的静默通道）。
- REQ-11：g2 豁免形态从候选空间移除（使无测试场景不阻塞 GREEN = 放宽 fail-closed 绑定，与别改清单冲突）；保留 g2' 报告级债务标注（verdict 分毫不动，不解决阻塞，如实标）。
- REQ-12：新增 B9——Contract freshness（r1 可见债务+advisory/r2 资格判据，机械 diff 判定明确不做）与 Decision supersession（s1 冲突拒绝升格/s2 原子 supersede+呈阅含旧条目/s3 弱化如实标）→ Q9；AC12 新增。
