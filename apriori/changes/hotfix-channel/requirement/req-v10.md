# req-v10 — hotfix-channel：change 外的最小回写单元

target lineage: on-the-fly 分支（v4 产品线；main 暂不动，owner 指示；不合并 v1/v3）。state A 含已归档的 P0 前三 change（KB source-commit 4127653）。

## 背景

同 req-v1（墙二/样本四实证：UAT 四单逃逸、BR-007 漂移、1012769 空白档案、"不用修"排查无承接、知识回流无落点；成本刻度：比"不记录"只贵几分钟）。

## 目标（目标态 B）——设计先行：机制候选连同后果完整陈列，gate③ 人类裁

### B1. 新概念：hotfix = change 外的最小回写单元，承接三类对象

1. 紧急代码修复的事后补记（结论必填；**spec delta 仅当修复改变了 spec 应然行为时存在**——spec-preserving 修复（代码回归既有 spec）为合法零 delta 形态，与类别 2 由必填头的承接类别区分，结论中须含回归说明；有 delta 时按 B5 声明测试绑定或 no-test 理由，零 delta 时的声明规则见 Q7c。**类别 1 另需机器可见的修复定位头（r5 补，r6 两案闭合）：`touched-modules: <模块列表>` + 代码出处 `fix-ref: <出处串>`**。
   - **必填案（倾向）**：错误谱全属 F1——缺失/空值拒绝；**模块命名空间 = 既有 store/truth 模块后缀词表**，未知模块/重复项拒绝；**一致性（r7 修正模块语义）：touched-modules 只表达代码修复触及（类别 1 语义），须 ⊇ delta 触及模块（delta 声明的 spec 行为变化所在即代码修复所及）；Decision 目标模块与代码触及正交（类别 3 知识承接可落在未被代码触及的模块），不入一致性要求、不入 Q3 代码跨模块计数**——C6 并集中 decisions 已是独立第二源，touched 头不重复背书；缺失 delta 模块 → 拒绝。**fix-ref 的诚实边界**：代码修复可能在另一 repo，机器不判其存在性——候选 v1) 仅非空+格式校验（声明格式，不解析；跨仓不可判定的诚实声明，倾向）；v2) 本仓可解析的 ref 加验存在性（增量强化，复杂度如实列）。**与 C6/B9 的关联算法（r7 修正能力声明）**：C6 不消费 fix-ref。归档 advisory 打印 **touched-modules ∩ stale 模块集**——其准确语义是"**本次触及且当前 stale**"，**不声称区分债务由本 hotfix 引入还是此前已存在**（无 freshness baseline 即无因果边界——诚实能力边界）。因果区分：**不做（唯一候选，r8 收口）**——交集列名即披露，债务来源由人判。~~z2 baseline 快照~~已移除：类别 1 是事后补记，代码修复 commit 先于 bundle 存在，归档/scaffold 任何时点都取不到"修复前"的 stale 集观察（且快照写入会成为 d1 摘要域与 B4 事务边界外的新写入面）——z2 只是目标描述、不是可实现候选；若人类将来要机械归因，须另开正式 change 单独设计 baseline 获取。
   - **选填案（放弃清单如实列）**：**两字段成对（r8 收口）：`touched-modules` 与 `fix-ref` 要么俱在、要么俱缺——只有一半 = F1 拒绝**（避免半态组合的语义分裂）。**选填只免"成对全缺"——字段存在即继承必填案的全部 F1 校验（present-but-invalid 照拒，含一致性超集——AC14 的带 delta 拒绝路径对选填-present 同样适用）**。缺失时——Q3 跨模块尺度不可算（advisory 不打）、C6 第三源缺失（零 delta 类别 1 退化 n/a）、B9 无定位（只打通用提醒）、hotfix 与代码修复不可机械关联（可观察断言 = 归档物中无 fix-ref/touched 字段，任何按模块或出处的机械检索均查无此单）；无 fallback。选此案 = 明示接受以上四项放弃。
   驱动关系不变（Q3 尺度按 touched（代码面）计/C6 并集/B9 定位）；**未知模块拒绝的直述后果：hotfix 不能引入词表外新模块——新模块须先走正式 change 建 store/truth（升级路径）**；具体格式留 STEP2；必填性入 Q9 连带裁；
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

- **载体（Q7a）**：c1) 独立 manifest（bundle 根 `bindings.md`；不进 living spec，归档不改写被批准的 delta）；**c1'）manifest 作为 `hotfix-state.md` 内一节**（同 c1 性质，少一个手工文件）；c2) delta 块内行、归档合并前剥离（代价：改写人类批准过的块）；c3) HTML 注释随块合入 store（代价：spec 污染，债务随场景可见）。**成本如实声明（r5）：c1 下带 delta 的类别 1 = 状态文件 + delta + bindings.md 三个手工文件，直接超 AC1 的 ≤2 上限**——出路候选：c1'（并入状态文件回到两文件）；scaffold 按 delta 预生成 bindings 骨架（仍计第三文件，计数不变，如实列）；或 gate③ 把 AC1 阈值调为 ≤3。倾向 c1'。AC1 按所裁载体重新断言。
- **目标键与语法（属 F1，preflight 全拒；键唯一化）**：**声明的目标键 = scenario ID；仅当块不含任何 scenario 标题时目标键 = requirement 块标题**。每个目标键恰有一条声明（多 scenario 块 = 逐 scenario 各一条，块级不再另计——v3 的"每块恰一条"与"逐 scenario"矛盾在此收口）。RENAMED：rename-only（仅 `- Old -> New` 映射）不引入新内容、免声明；rename-then-modify 的 MODIFIED 块按上述键规则照常。形式 `tests: <非空绑定说明>` 或 `no-test: <非空理由>`；空值 / 同键重复 / 同键两种并存 / 引用不在 delta 中的键 / delta 键缺声明 / 不可解析 → 各自拒绝。**键唯一性不假设（r5 勘误）：state A 允许 duplicate scenario ID 出现（verify 判 GAPS，delta parser 不拒）——本通道候选：k1) delta/projection 派生目标键重复 = F1 preflight 拒绝（倾向：fail-closed、避免声明归属两可）；k2) 键附加 occurrence/requirement 定位（复杂度如实列）**。REMOVED-only 免声明。
- **全局后果（Q7b，两层诚实声明）**：state A 的 verify 不识别豁免——合法获批的 no-test active scenario 与谎报者一样 UNBOUND：
  1. **store-wide verify 从此 GAPS**（req-v1 的"全绿路径"承诺已删，明示为行为选择）；
  2. **archived gate 阻塞（r3 补明）**：在途 C1 是 change-scoped（P0-2），其他在途 change 不受阻；但 **archived C1 跑 whole-store verify，RUNBOOK STEP6 要求每个正式 change 归档后跑 gate 入 gate④ packet——只要 no-test 债务在，所有后续正式 change 的 STEP6 post-archive gate 持续 BLOCKED**。
  候选（含债务生命周期与解除路径）：
  - g1) **接受债务 + 阻塞即逼偿机制（倾向）**：解除路径 = 后续以 hotfix/change 补测试绑定、或 REMOVED 该场景；后果如实标注——债务不清则正式 change 无法完成 STEP6，这是强制清偿的设计代价，人类裁是否可接受；
  - ~~g1b archived gate 豁免~~（r4 裁定）：**与 B6"正式 change 的 gate 七项分毫不动"硬不变量直接冲突——archived C1 消费 whole-store verify、UNBOUND 必 BLOCKED、无"已声明理由"例外；g1b 实质是在 gate 层恢复 g2 式放行，同原则移出合法候选**（若人类欲重开，须先显式裁定放弃该不变量——两者不可同真）；
  - g3) 限定 no-test 仅可用于不产生 active UNBOUND 的情形——砍掉承接类别 1 的主用例，如实列。
  - ~~g2 豁免语义~~（r3 REQ-11 裁定）：**"verify 第四态豁免"若使无测试场景不再阻塞 GREEN，即属放宽 fail-closed 绑定语义——与别改清单"只可强化"约束冲突，非合法候选，从空间移除**；保留其弱形式 **g2'）报告级债务标注**：verify 报告对 no-test 场景附注理由来源，**verdict/GAPS 判定分毫不动**——只改可读性，不解决 archived gate 阻塞，如实标。
- **载体层与证明层正交（r5 收口）**：c1/c2/c3 是 no-test 理由与 tests 声明的**载体**；"声明制/隐式 verify/证据引用"是 tests 侧的**证明机制**——二者组合而非互斥。**任何证明机制下，no-test 目标键都必须经所裁载体保存非空理由（verify 不识别理由，UNBOUND 照判——理由的价值在归档留痕与呈阅，不在放行）**。候选 ii（归档隐式跑 verify）：tests 键须 GREEN（scoped），no-test 键凭载体理由放行（不以 GREEN 为准入，否则禁绝一切 no-test）；副作用/耗时如实列（若裁 ii，AC1 另报含测试总耗时）。候选 iii（引用既有证据）：证据只证 tests 键，no-test 键同上走载体；新鲜度无法机械保证。AC3 全部变体均含 no-test 理由的存在/非空/归档保留断言。
- **零 delta 的类别 1（spec-preserving 修复）的测试声明（Q7c，r4 补）**：p1) 不强制机器声明（无 delta 即无目标键；回归说明住在结论里，人在 dry-run 呈阅时判）——倾向；p2) bundle 级一条 `tests:`/`no-test:`（无键版式，preflight 强制）——机制面多一条规则，如实列。

### B6. gate 七项的逐项映射（→ Q8）；zero-delta 例外只属 hotfix 通道

- 纯结论 hotfix 走 hotfix 专属命令/路径——普通 `archive --change` 的 AM-17 zero-delta fail-closed 分毫不动（回归断言，AC4）。
- **state A 七项按真实编号（r3 勘误）：C1 绑定核验 / C2 tasks / C3 flow-state 合法性 / C4 账本 / C5 verdict+raw 证据 / C6 KB freshness / C7 CAS**。hotfix 有意不具备 tasks/账本/verdict/raw（C2/C4/C5 的物料），且候选 a 下只有 `hotfix-state.md`（C3 现要求 `flow-state.md`）。候选：
  - m1) gate 对 hotfix bundle **明确拒绝并指路**（"hotfix：用 hotfix 归档 preflight"）——合法性检查全部住在归档命令；
  - m2) **逐项适配表**：C1 仅当有 delta（scoped 判）；C2/C4/C5 = n/a（输出明示，非静默跳过）；**C3 两个子候选（r3 补明）**：m2-α C3 适配为 hotfix-state 合法性检查（身份/必填头/结论非占位入 gate）；m2-β C3 = n/a 且输出**明示"gate PASS 不代表 bundle 可归档，合法性由归档 preflight 判"**——不留"非法 hotfix 得 PASS"的静默通道；**C6 触发来源 = delta 触及模块 ∪ decisions 目标模块 ∪ 类别 1 的 touched-modules 头（r5 补全：零 delta 代码修复由第三源覆盖）**；并集为空（纯结论类别 2）→ n/a 明示。**C6 的 verdict 等级（r5 补裁项）**：state A 的 C6 对 stale 判 BLOCKED——照搬则类别 1 hotfix 的 gate 通常无法 PASS，与 B9"提示而非拒绝"矛盾。候选（r6 闭合到外部契约）：
  - e1-α) **C6 仍用既有三态之 `pass`，detail 以声明的 `advisory:` 前缀承载债务详情**——JSON schema/三态/renderer/聚合零变化，`GATE: PASS`、`blocked: 0`；机器可区分性 = detail 前缀作为公开契约写入 truth/gate.md 的 hotfix 映射节。倾向。
  - e1-β) 新增第四 status `advisory`——聚合契约（r7 闭合）：advisory 为**非阻塞**——`blocked` 计数不含 advisory、仅有 advisory（无 blocked）时 `result = PASS`、exit code 同 PASS、human footer 形如 `GATE: PASS (advisories: n)`、JSON 聚合增 `advisories: <n>` 字段。变化清单如实列：checks[] schema 扩一态、聚合对象扩一字段、renderer 新 mark、下游消费者适配、truth/gate.md Contract 扩展；仅当声明为 hotfix 映射专属扩展且正式 change 输出零变化时合法。
  - e2) 保持 BLOCKED——后果如实列：类别 1 gate 恒堵，把 freshness 债务从"披露"改成"禁止"。
  各案参数化验收见 AC13。C6（gate 核查面，若裁 m2）与 B9 advisory（归档披露面，各案均打印）分工不变；C7 仅当有 delta；
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
- d1) **业务输入摘要令牌（倾向；r3 收口自失效循环）**：摘要范围 = **bundle 业务内容（明确排除机器生成的批准记录文件）+ 各目标 spec store 基线 + 各目标 truth 基线**；dry-run 打印令牌，批准命令携令牌、写入前对同一范围重算比对，任何业务输入已变（含 F2 部分提交后的重跑）→ 令牌失效、剩余 diff 重新呈阅换新令牌。批准记录（令牌+日期+dry-run 输出）由批准命令写入 bundle 的**排除域文件**（如 `approval.md`，永不参与摘要——自引用与自失效循环由排除域切断），随 bundle 入 archive 供审计（批准工件因此天然在 B4 三段写集合内，无第四写入面）。~~d1-ext 外置工件变体~~：r4 裁定移除——bundle 外批准工件是缺事务/路径/恢复契约的第四写入面，B4 恢复语义不覆盖；如 STEP2 发现确需外置，须先补全其全套契约再入 gate③。
- d2) 批准时只重查 CAS 基线（bundle 自身变化检不出——弱一档，如实列）。
- d3) 批准不绑定内容（纯两步纪律——与 a/b/c 同级弱化，如实标）。

诚实结论：a/b/c 实质是把受保护关卡换成纪律背书；只有 d（配 d1）保持"人看过的内容 = 落盘的内容（模摘要排除域）"。倾向 d+d1，你裁。

### B9. KB 生命周期边界（r3 REQ-12 补节 → Q9）

- **Contract freshness**：hotfix 永不碰 Contract 与 source-commit（B3 不变量）；**类别 1 的代码修复 commit 使 C6 看到新 commit——此结论仅对"本仓且落入 source-files 映射"的修复成立（r9 修正措辞）**。**外仓修复的可见性边界（REQ-16，Q9 连带裁）**：state A 的 C6 只查本仓 `<source-commit>..HEAD`，外仓 commit 对它不可见——外仓修复会得到 C6 `pass`/`n/a` 与空的 touched∩stale，**假 clean 信号**。候选：
  - w1) 类别 1 只承接本仓/source-files 可观察的代码修复——外仓修复拒绝（判定前提：fix-ref 格式携仓域标记，见下；砍掉 spec 仓与业务代码仓分离的主用例，如实列）；
  - w2) **允许外仓修复，freshness 明确标不可机械验证（倾向）**——fix-ref 格式携仓域标记（本仓 ref 形态 vs 外仓 URL/带宿主形态，格式层可判、属 F1 语法域，具体定式留 STEP2）；外仓案的输出契约：归档 advisory 打印 `freshness: unverifiable (external repo)` 类声明行、gate C6（若裁 m2）对外仓修复输出 n/a 附因；**文档与输出双处禁止把本仓 C6 pass 表述为外仓修复已 fresh**；本仓案照常。
  两案的 AC 参数化见 AC15。决策空间（本仓债务的披露与资格）：
  - r1) 声明为可见债务（倾向）：C6 的 stale 提示即真相；清偿走正式 change 的 KB 写回；hotfix 归档输出对涉及模块打印 freshness advisory（提示而非拒绝）；
  - r2) hotfix 资格判据：仅"不改变 Contract 所述行为"的修复适合 hotfix，改变契约行为的修复必须升格 change——RUNBOOK 文字判据 + 归档物可审计（与 Q3 同风格）；
  - **r2 只能补充 r1、不能替代（r4 收口）**：source-commit 新鲜度判定是机械的（source path 上有无后续 commit），不分析语义——即使 r2 判定"不改契约行为"，代码 commit 仍产生与 r1 相同的 mechanical stale；r2-only 会留下无提示、无清偿要求的静默债务，**故 r2 不是独立候选：Q9 的合法选项为 r1 或 r1+r2**。被 r2 判为 contract-changing 的修复 → 拒绝并指向正式 change（升格指引），此路径入 AC12。硬机械判定（diff 分析 Contract 相关性）不做（不可判定，如实列）。
- **Decision supersession**：现行 KB 语义——旧 decision 仅在被新 decision supersede 时失效（`superseded-by: <id>`）；类别 3 的业务事实可能**否定既有 active 条目**。候选：
  - s1) hotfix 仅允许追加**不与既有 active 冲突**的新事实；发现冲突 → 拒绝并要求升格正式 change（冲突判定 = 人类在 dry-run 呈阅时判，机器不判语义冲突——诚实边界）；
  - s2) 允许 supersession 形态：新条目 + 旧条目原子加注 `superseded-by`（同文件单次改名内完成；受 truth 基线校验保护）——dry-run 呈阅含旧条目改动，人类看全再批；
  - s3) 自由追加（可能双 active 冲突并存——弱化，如实标）。
  - 倾向 s2（供裁）；s1 为保守回退。

## 范围外（won't do）

同 req-v1；另加：不改 AM-17 与普通 archive 的任何 fail-closed；不做 hotfix↔change 自动互转；不做旧漂移批量回填工具；不改场景 ID 三态与 UNBOUND/GAPS 判定语义（g2 豁免形态已从候选移除）；不做 Contract 相关性的机械 diff 判定。

## 验收标准（可测；细化待 STEP2）

- AC1（成本刻度）：lab 脚本化重演三类各一遍——每类 ≤3 条命令、手工编辑 ≤2 个文件（**按 Q7a 所裁载体重新核算并断言；若裁 c1 则本阈值须同步调整并在 gate③ 记录**）；脚本墙钟（scaffold→归档成功，不含测试套件与人类思考）≤10:00；三类分别达标；若 Q7 裁候选 ii，另报含测试总耗时。阈值可在 gate③ 调整。
- AC2（漂移终结）：BR-007 型重演——hotfix 携 REMOVED delta 归档 → verify 不再要求、lingering 测试转 ORPHAN；CAS 生效；modified-integrity 机制未被破坏（REMOVED 本身不产生 integrity diff——按 r3 advisory 表述）。
- AC3（声明判定，按 Q7 所裁取变体）：声明制 → 目标键规则（scenario ID 优先/无 scenario 块级/RENAMED-only 免）+ 语法错误谱逐项拒绝 + 派生键重复按 k1/k2 断言 + REMOVED-only 免 + 混合 delta 逐键判；候选 ii → verify 运行与工件断言；候选 iii → 证据引用与新鲜度声明断言；**全部变体均断言 no-test 理由的存在/非空/归档保留**。
- AC4（零 delta 两形态）：无 delta 无 decisions 的 hotfix（类别 2"不用修"或类别 1 spec-preserving，由必填头类别区分）经专属路径归档只移 bundle，store/truth 零变化；类别 1 spec-preserving 的声明规则按 Q7c 所裁断言、**定位头按 Q9 所裁案取变体断言（必填案：缺失/空值/未知模块/重复项/fix-ref 空值或格式错各自拒绝，advisory 按 touched∩stale 列名（语义=本次触及且当前 stale）；一致性超集断言在 AC14——本形态零 delta 测不到；选填案：缺失时四项放弃逐一断言（含"机械检索查无此单"的可观察形态），present-but-invalid 照拒）**；普通 `archive --change` 对 zero-delta 照旧 exit 2（回归断言）。
- AC5（Decisions 契约，按 Q6 所裁并发案缩窄）：多条多模块追加成功且格式/ID/出处正确；F1 全谱 → 整体拒绝零写入；同 ID 同内容重跑 no-op、异内容 conflict；**写入时刻校验前**的外部 truth 改动 → conflict 且零写入（o1 案不断言校验-改名窗口内互斥；若裁 o2 则加互斥断言）。
- AC6（事务边界）：F1 任一项 preflight 拦截 = 全局零写入；F2 三段各注入 I/O 失败——已完成段保持、报告指名已完成段、按所裁新鲜度规则续完。
- AC7（结论强制负向全谱）：缺失/空白/未改占位/缺头/重复头/不可解析 → 各自拒绝且报错指名。
- AC8（示范，重构材料）：以复盘文本（声明输入）重构 1012769 的应然 hotfix bundle 作为冻结 fixture（标注"依复盘重构，非原件"），归档演示三类承接俱全；期望 = 固定文件清单与关键内容断言。
- AC9（身份不变量）：flow-state 与 hotfix-state 并存 → 各消费点 fail-closed；同名冲突 scaffold 拒绝；防逃逸提示按 Q3 所裁形态触发。
- AC10（生态与不弱化）：status 标注列出；兄弟归因对活 hotfix delta 生效；正式 change 的 gate 七项行为回归断言无变；318 存量测试保持绿；RUNBOOK/docs 双语 + CHANGELOG；check --self 绿。
- AC11（签收，按 Q1 所裁）：若裁 d+d1——业务输入任一变化（bundle 业务文件/store/truth/部分提交后重跑）→ 令牌失配、拒绝写入、要求重新呈阅；批准记录落于摘要排除域文件、随 bundle 归档、含令牌与 dry-run 输出；批准记录写入本身不使令牌失效（排除域断言）。
- AC13（gate C6 hotfix 映射，若裁 m2，按 e 案参数化）：e1-α——stale 模块存在时 C6 = pass + detail `advisory:` 前缀 + `GATE: PASS` + blocked 0 + JSON schema 无变；e1-β——第四态 + `blocked` 不计 advisory + 仅 advisory 时 `result = PASS` + exit code 0 + footer `GATE: PASS (advisories: n)` + JSON `advisories` 字段 + renderer mark + 正式 change 输出零变化，逐项断言；e2——stale → BLOCKED。各案均附：正式 change 的 C6 行为回归断言无变（与 AC10 呼应）。
- AC15（外仓 fix-ref，按 Q9 w 案参数化；r9 补）：w1——外仓形态 fix-ref → F1 拒绝；w2——外仓 fixture：归档 advisory 含 unverifiable 声明行、C6（若 m2）= n/a 附因、无 touched∩stale 假命中；本仓 fixture 照常路径回归；两案均断言"C6 pass 不被表述为外仓已 fresh"（输出措辞断言）。
- AC14（定位头一致性——适用于字段存在的任何案（必填、或选填且 present）；r7 补——AC4 的零 delta 形态测不到超集规则）：另含：选填案半缺（仅 touched 或仅 fix-ref）→ F1 拒绝断言。带 delta 的类别 1——touched 缺 delta 模块 → 拒绝；类别 1+3 混合——纯 Decision 模块**不**要求出现在 touched、不计入 Q3 代码跨模块数、不因 touched 头重复进入 C6（decisions 独立源已覆盖）；预先 stale 反例——某模块在 hotfix 前已 stale 且本次未触及 → advisory 不将其列入 touched∩stale（无错误归属）。
- AC12（KB 生命周期，按 Q9 所裁）：类别 1 归档对涉及模块打印 freshness advisory（r1 必选项）；若加裁 r2——资格判据的允许实例与拒绝实例各至少一条（contract-changing 修复被拒并输出升格指引）；supersession 形态按 s1/s2 断言（s1：冲突拒绝路径存在；s2：新旧条目同文件原子更新 + 呈阅含旧条目改动）。

## 开放问题（gate②/③ 人类必答）

- **Q1（核心，B8）**：签收机制 a/b/c/d——倾向 d；连带新鲜度 d1/d2/d3——倾向 d1（业务输入摘要 + 排除域批准记录；d1-ext 已移除）。
- **Q2（B2）**：位置与身份——倾向 a（changes/ 复用 + 专名状态文件互斥）。
- **Q3（B2）**：防逃逸——倾向 ii（advisory 提示，阈值你定）。
- **Q4**：runbook-version 4.0 → 4.1？（新增流程语义节。）
- **Q5**：命名沿用 `hotfix`（复盘用词），除非你改。
- **Q6（B3）**：Decision ID 归属 t1/t2——倾向 t1；连带并发案 o1/o2/o3——倾向 o1（接受残余 TOCTOU，诚实声明无互斥；hotfix 单机人驱并发率近零）。
- **Q7（B5）**：a) 载体 c1/c1'/c2/c3——倾向 c1'（manifest 并入状态文件，守住 AC1 两文件上限；若裁 c1 需同时调 AC1 阈值）；d) 派生键重复 k1/k2——倾向 k1（F1 拒绝）；b) 全局后果 g1/g2'/g3——倾向 g1（债务+archived gate 阻塞即逼偿机制，解除路径明示；g2' 仅改报告可读性、g3 砍主用例；g1b 已与 g2 同原则移出）；c) 零 delta 类别 1 的声明规则 p1/p2——倾向 p1。机制大类（声明制/隐式 verify/证据引用）随 a 一并裁。
- **Q8（B6）**：gate 映射 m1/m2（α：C3 适配 hotfix-state 合法性；β：C3 n/a + PASS 边界明示）/m3——倾向 m1 或 m2-α；若裁 m2，连带 C6 等级 e1-α/e1-β/e2——倾向 e1-α（既有三态之 pass + 声明的 advisory: detail 前缀，外部契约零变化）。
- **Q9（B9）**：Contract freshness——合法选项 r1 或 r1+r2（r2-only 非法：留静默债务；倾向 r1+r2）；连带类别 1 定位头（touched-modules+fix-ref）的必填性——必填案（F1 全谱+一致性超集+fix-ref v1/v2，倾向）vs 选填案（成对全缺豁免，四项放弃明示）；连带外仓边界 w1/w2——倾向 w2（外仓合法+unverifiable 明示；w1 砍分仓主用例）；Decision supersession s1/s2/s3——倾向 s2（s1 保守回退；s3 与 RUNBOOK"旧 decision 仅由 supersession 失效"张力大，评审建议优先比较 s1/s2）。
- **次级"裁"项承接声明**：正文其余标"裁"的次级选择由 STEP2 设计者提出具体方案、gate③ 整体审定；实现前无一生效。

## 需求裁定记录

对 r1/r2/r3：见 req-v2/req-v3/req-v4 文末记录。

对 r4（五条）：见 req-v5 文末记录。

对 r5（五条）：
- REQ-5：载体层与证明层declared正交——任何证明机制下 no-test 键必经载体存非空理由（verify 照判 UNBOUND，理由价值在留痕呈阅非放行）；ii 的准入规则（tests 键 GREEN、no-test 键载体放行）与 iii 的边界补明；AC3 全变体加理由断言。
- REQ-6：C6 触发第三源 = 类别 1 touched-modules 头（零 delta 代码修复被覆盖）；verdict 等级 e1（降 advisory，倾向）/e2（保持 BLOCKED，后果如实）入 Q8 连带。
- REQ-13：类别 1 新增机器可见修复定位头（touched-modules + 代码出处），必填性候选入 Q9 连带；驱动 Q3/C6/B9 三处；AC4 补断言。
- REQ-14：不再宣称 scenario ID 天然唯一——派生键重复 k1（F1 拒绝，倾向）/k2（occurrence 定位）入 Q7d。
- REQ-15：c1 三文件与 AC1 两文件冲突如实声明；出路 c1'（manifest 并入状态文件，倾向）/骨架预生成（不改计数）/调阈值；AC1 按所裁载体重新断言。

对 r6（两条）：
- REQ-6：e1 闭合为 e1-α（既有 pass + 声明的 advisory: detail 前缀，schema/renderer/聚合零变化，倾向）与 e1-β（第四态，全部外部契约变化如实列）；AC13 参数化验收新增。
- REQ-13：必填案错误谱全谱（命名空间=模块后缀词表/未知/重复/一致性超集）+ fix-ref 诚实边界（v1 仅格式不解析/v2 本仓加验）+ C6 不消费 fix-ref、债务区分由 advisory 的 touched∩stale 对比实现；选填案改为"四项放弃清单"明示；AC4 两案变体断言。

Advisory 采纳（r5）：p1 若裁之，gate③ packet 须明示"放弃机器可见 test/no-test 留痕"；s3 张力注记入 Q9；approval.md 的 command-owned 契约归 STEP2。

Advisory 采纳（r6）：承接类别的组合表达（类别 3 可与 1/2 并存、1/2 互斥性）为 STEP2 机器格式设计项，gate③ 一并审。

对 r7（两条）：
- REQ-6：e1-β 聚合契约闭合——advisory 非阻塞、blocked 不计、仅 advisory 时 result=PASS/exit 0/footer 带 advisories 计数/JSON 增 advisories 字段；AC13 逐项断言。
- REQ-13：能力声明修正——touched∩stale 语义 = "本次触及且当前 stale"，不声称因果区分（候选 z1 不做（倾向）/z2 baseline 快照对比）；touched 只表达代码触及、⊇ delta 模块、Decision 目标模块正交移出（不入 Q3 计数、不重复进 C6）；一致性断言移出 AC4 入新 AC14（含类别 1+3 混合与预先 stale 反例）；选填案 present-but-invalid 继承 F1、第四项放弃给出可观察断言形态。

Advisory 采纳（r7）：未知模块拒绝的升级路径已直述（B1）；e1-α 完整可裁、fix-ref v1 诚实权衡——维持。

对 r8（一条）：
- REQ-13：z2 从候选空间移除（事后补记无"修复前"观察时点可得；快照又是 d1/B4 边界外新写入面——按 r8 论证，z2 非可实现候选；机械归因留给将来正式 change）；选填案两字段成对、半缺 = F1；一致性 F1 与 AC14 拒绝路径明确适用于选填-present；AC14 增半缺断言。

对 r9（一条）：
- REQ-16：B9 措辞修正（"C6 看到新 commit"限定本仓且落映射）；外仓可见性边界入决策空间——w1 本仓限定（砍分仓主用例）/w2 外仓合法+仓域标记格式判+unverifiable 双处声明+C6 n/a 附因（倾向）；AC15 两案参数化（含假命中与措辞断言）。
