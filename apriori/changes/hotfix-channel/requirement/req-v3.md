# req-v3 — hotfix-channel：change 外的最小回写单元

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

### B3. Decisions 追加的数据契约（决策空间；ID 归属与并发保护 → Q6）

- **写入目标表达**：decisions 条目自带目标模块头（如 `module: spec-runner`）；一个 bundle 允许多条、跨多模块。
- **条目机器格式**（候选定式，gate③ 裁）：`- D-<模块缩写>-hf-<n> (active): <正文>。 Ratified via hotfix <name> (<date>).`
- **ID 归属（Q6，两候选后果全列）**：
  - t1) **归档命令在 dry-run 时分配**——人类呈阅时看到的 ID 即最终 ID；写入时刻由 truth 基线校验（下条）保证无并发挤占；
  - t2) **作者手写**——碰撞在 preflight 与写入时刻各查一次；碰撞 = conflict 拒绝。
- **truth 侧并发保护（与 spec store CAS 同级保证，诚实陈述边界）**：dry-run 记录各目标 truth 文件基线哈希；写入时刻重读比对，不一致 → conflict、truth 零写入、重新 dry-run 呈阅。保护 = 同一命令调用内"读→校→原子改名"，无跨进程锁（与现行 spec store CAS 的保证等级一致，如实声明）。并发写者在此机制下不会静默覆盖（后写者基线比对必败）。
- **失败语义（归 B4 的 F1 类，preflight 全谱 fail-closed）**：目标 truth 文件不存在 / 无 `## Decisions` 节 / 节重复 / 目标为 symlink 或逃逸路径 / malformed 条目 / ID 冲突 → 整个归档拒绝，零写入（含 spec store 零写入——见 B4 阶段边界）。
- **重跑语义**：同 ID 同内容 → no-op（幂等）；同 ID 异内容 → conflict 拒绝。
- **与 delta 的对应**：两类各自独立寻址（delta 按 store suffix，decisions 按 module 头），无隐式关联。
- Contract 节与 source-commit **永不**被 hotfix 触碰。

### B4. 归档的两类失败与真实事务边界（"原子"限定到 state A 真实保证）

**失败分两族，边界明确：**

- **F1 确定性校验错（全部前置，任一失败 = 全局零写入）**：bundle 不可解析 / 结论与必填头缺失 / 声明语法错（B5）/ 防逃逸硬判（若 Q3 裁 iii）/ spec store CAS 失配 / truth 目标与格式全谱（B3）/ truth 基线失配 / ID 冲突——**所有确定性检查在任何写入之前跑完**（global preflight）。B3/AC5 的"整体拒绝零写入"即指此族。
- **F2 提交期 I/O 故障（唯一可致部分提交的族）**：写集合三段有序——**① spec stores（现行逐文件原子改名；部分提交可能且不回滚，state A 现状如实声明）→ ② truth Decisions 追加（逐文件；条目 ID 幂等）→ ③ bundle 移入 archive（completion point，非回滚点——此前写入不可回滚，如实命名）**。任一段 I/O 失败：已完成段保持、失败报告指名已完成段与恢复动作；重跑续跑语义受 B8 所裁新鲜度约束（严格案下部分提交即令牌失效，剩余 diff 重新呈阅批准——如实关联）。每段各有 fault-injection 验收（AC6）。

### B5. no-test 声明：载体、语法、全局后果（三项子决策 → Q7）

- **载体（Q7a）**：
  - c1) **独立 manifest**（如 bundle 根 `bindings.md`）：机器语法逐行映射 delta 目标 → 声明；**不进 living spec**（归档不改写被批准的 delta 内容）。倾向。
  - c2) delta 块内行、归档合并前剥离——代价：归档机械改写人类批准过的块内容，如实列。
  - c3) HTML 注释随块合入 store——代价：spec 污染，但债务标记随场景可见，如实列。
- **语法与错误谱（属 F1，preflight 全拒）**：每个 ADDED/MODIFIED（及 RENAMED 目标）块必须恰有一条声明——块含 scenario 标题则**逐 scenario** 一条，否则块级一条。形式 `tests: <非空绑定说明>` 或 `no-test: <非空理由>`。空值 / 同目标重复 / 同目标两种并存 / 引用不在 delta 中的目标 / delta 目标缺声明 / 不可解析 → 各自拒绝。REMOVED-only 免声明。
- **全局后果（Q7b，诚实声明行为变化）**：state A 的 `verify` 不识别豁免——**合法获批的 no-test active scenario 与谎报者一样成为 UNBOUND，store-wide verify 从此 GAPS**（req-v1 的"归档后 gate/check/verify 全绿路径存在"在 v2 被删除，此处明示：那是行为选择，不是笔误）。候选：
  - g1) **接受可见债务**：全局 GAPS 即真相；对其他在途 change 无阻塞（P0-2 的 change-scoped verdict 只判各自 scenario）；债务由后续补测试或 REMOVED 清偿。倾向。
  - g2) verify 机器豁免（第四种场景状态）——**触碰别改清单 §三"场景 ID 三态"已证设计**（只可强化不可弱化）；需单独论证"第四态 = 强化"，成本与风险如实列，本 change 不倾向。
  - g3) 限定 no-test 仅可用于不产生 active UNBOUND 的情形——砍掉承接类别 1 的主用例（紧急修复常来不及补测试），如实列。
- 候选 ii（归档隐式跑 verify）与 iii（引用既有 verify 证据）保留在空间内：ii 新增测试执行副作用/耗时（若裁 ii，AC1 需另报含测试的总耗时）；iii 证据新鲜度无法机械保证。AC3 按所裁机制取对应变体（声明查验 / verify 运行工件 / 证据引用 + 新鲜度声明）。

### B6. gate 与生态的逐项映射（→ Q8）；zero-delta 例外只属 hotfix 通道

- 纯结论 hotfix 走 **hotfix 专属命令/路径**——普通 `archive --change` 的 AM-17 zero-delta fail-closed **分毫不动**（回归断言，AC4）。
- **现行 gate 七项对 hotfix 的适用关系逐项陈列**（state A gate 进门先要 `flow-state.md`，候选 a 的 hotfix 只有 `hotfix-state.md`；C2 tasks / C3 ledger / C4 raw / C5 verdict 依赖 hotfix 有意不具备的物料）。候选：
  - m1) gate 对 hotfix bundle **明确拒绝并指路**（"hotfix：用 hotfix 归档 preflight"）——检查全部住在 hotfix 归档命令里；
  - m2) **逐项适配表**：C1 绑定核验仅当有 delta（scoped 判）；C2/C3/C4/C5 = n/a（明示于输出，非静默跳过）；C6 KB freshness 仅当有 decisions（查目标模块）；C7 CAS 仅当有 delta；
  - m3) gate 完全不适用 + 等价检查全量移入归档 preflight（与 m1 差异：m3 连拒绝指路都不做，风险：静默）。
  - 共通不变量：**正式 change 的 gate 七项分毫不动**；若实现共享代码，必须有回归断言证明普通 change 路径行为无变（AC10）。倾向 m1 或 m2，人类裁。
- 在途 hotfix 的 `verify --change`：无 delta 时明示 n/a；有 delta 时照常（delta 语义同普通 change）。`status` 列出并标注 hotfix。
- 空 bundle 冒充：被 B7 结论强制拦截。

### B7. 结论强制

conclusion 是 hotfix 的**唯一无条件必填物**：缺失 / 空白 / 仅模板占位文本（占位判定 = scaffold 生成的原文未改）→ 归档拒绝；必填头（name/date/承接类别）缺失或重复 → 拒绝；不可解析 bundle → 拒绝（均属 F1）。负向验收全列（AC7）。

### B8. 人类签收（gate④ 原则的映射，Q1 人类必裁）

四个候选，按**批准语义 / 证据 / 强制力**三轴诚实标注：

| 候选 | 批准语义 | 证据 | 强制力 |
|---|---|---|---|
| a) 调用即批准 | 假定命令由人类亲手跑 | bundle 状态头记录调用时间 | 纯纪律——CLI 无法分辨调用者是人还是 agent |
| b) `--signed-off-by <人>` | 自声明 | 一个字符串 | 纯纪律——agent 同样能填 |
| c) 分级（纯结论免签、有回写必签） | 同 b 分级 | 同 b | 同 b |
| **d) 两步式：dry-run 呈现全部将写内容 → 显式第二命令写入** | 人类看过 diff 后批准 | 见下（内容绑定令牌 + 持久批准记录） | **保持现行 gate④ 语义**——agent 被 RUNBOOK 禁止自跑批准命令（同 R3 模式，可被 Stop-hook/CI 加固） |

**候选 d 的批准新鲜度（内容绑定，三个子候选，Q1 连带裁）**：
- d1) **摘要令牌绑定（倾向）**：dry-run 对（bundle 全部内容 + 各目标 spec store 基线 + 各目标 truth 基线）计算摘要并打印令牌；批准命令携令牌，写入前重算比对，任何输入已变（含 F2 部分提交后的重跑）→ 令牌失效、剩余 diff 重新 dry-run 呈阅换新令牌。批准证据持久化：令牌 + 日期 + dry-run 输出存档于 bundle（随 bundle 入 archive，1012769 型审计可查"人批准的是哪一份"）。
- d2) 批准时只重查 CAS 基线（bundle 自身变化检不出——弱一档，如实列）。
- d3) 批准不绑定内容（纯两步纪律——诚实标注为弱化，与 a/b/c 同级）。

诚实结论：a/b/c 实质是把受保护关卡换成纪律背书；**只有 d（配 d1）保持"人看过的内容 = 落盘的内容"**。倾向 d+d1，你裁。

## 范围外（won't do）

同 req-v1；另加：不改 AM-17 与普通 archive 的任何 fail-closed；不做 hotfix↔change 自动互转；不做旧漂移批量回填工具；不改场景 ID 三态语义（除非 Q7b 裁 g2 并通过"强化"论证）。

## 验收标准（可测；细化待 STEP2）

- AC1（成本刻度，客观阈值）：lab 脚本化重演三类各一遍——每类 ≤3 条命令、手工编辑 ≤2 个文件；脚本墙钟（scaffold 命令开始→归档成功结束，不含测试套件运行与人类思考）≤10:00；三类分别达标；若 Q7 裁候选 ii，另报含测试执行的总耗时。阈值可在 gate③ 调整。
- AC2（漂移终结）：BR-007 型重演——hotfix 携 REMOVED delta 归档 → verify 不再要求、lingering 测试转 ORPHAN；CAS/modified-integrity 生效。
- AC3（声明判定，按 Q7 所裁机制取变体）：声明制 → 语法错误谱逐项拒绝（B5 全谱）+ REMOVED-only 免 + 混合 delta 逐目标判；候选 ii → verify 运行与工件断言；候选 iii → 证据引用与新鲜度声明断言。
- AC4（纯结论）：无 delta 无 decisions 的 hotfix 经专属路径归档只移 bundle，store/truth 零变化；普通 `archive --change` 对 zero-delta 照旧 exit 2（回归断言）。
- AC5（Decisions 契约）：多条多模块追加成功且格式/ID/出处正确；F1 全谱（不存在模块/缺节/重复节/symlink/malformed/ID 冲突/truth 基线失配）→ 整体拒绝零写入；同 ID 同内容重跑 no-op、异内容 conflict；并发挤占（写入间隙外部改 truth）→ conflict 且零写入。
- AC6（事务边界）：F1 任一项在 preflight 拦截 = 全局零写入；F2 三段各注入 I/O 失败——已完成段保持、报告指名已完成段、按所裁新鲜度规则续完（严格案：重新呈阅换令牌后续完）。
- AC7（结论强制负向全谱）：缺失/空白/未改占位/缺头/重复头/不可解析 → 各自拒绝且报错指名。
- AC8（示范，重构材料）：以复盘文本（声明输入）重构 1012769 的应然 hotfix bundle 作为冻结 fixture（标注"依复盘重构，非原件"），归档演示三类承接俱全；期望 = 固定文件清单与关键内容断言。
- AC9（身份不变量）：flow-state 与 hotfix-state 并存 → 各消费点 fail-closed；同名冲突 scaffold 拒绝；防逃逸提示按 Q3 所裁形态触发。
- AC10（生态与不弱化）：status 标注列出；兄弟归因对活 hotfix delta 生效；**正式 change 的 gate 七项行为回归断言无变**；318 存量测试保持绿；RUNBOOK/docs 双语 + CHANGELOG；check --self 绿。
- AC11（签收，按 Q1 所裁）：若裁 d+d1——令牌失配（bundle 改动/store 改动/truth 改动/部分提交后重跑）各自拒绝写入并要求重新呈阅；批准记录随 bundle 归档且含令牌与 dry-run 输出。

## 开放问题（gate②/③ 人类必答）

- **Q1（核心，B8）**：签收机制 a/b/c/d——倾向 d；若裁 d，连带裁新鲜度 d1/d2/d3——倾向 d1（摘要令牌绑定 + 批准记录持久化）。
- **Q2（B2）**：位置与身份——倾向 a（changes/ 复用 + 专名状态文件互斥）。
- **Q3（B2）**：防逃逸——倾向 ii（advisory 提示，阈值你定）。
- **Q4**：runbook-version 4.0 → 4.1？（新增流程语义节。）
- **Q5**：命名沿用 `hotfix`（复盘用词），除非你改。
- **Q6（B3）**：Decision ID 归属——t1 dry-run 分配（呈阅即最终）vs t2 作者手写（双时点碰撞检查）；两案均在 truth 基线校验保护下。倾向 t1。
- **Q7（B5）**：a) 声明载体 c1/c2/c3——倾向 c1（独立 manifest，不进 living spec）；b) 合法 no-test 的全局后果 g1/g2/g3——倾向 g1（接受可见债务；g2 触碰别改清单三态，g3 砍主用例）。机制大类（声明制 vs 隐式 verify vs 证据引用）随 a 一并裁。
- **Q8（B6）**：gate 七项映射 m1（拒绝指路）/ m2（逐项适配表）/ m3（全移 preflight，静默风险）——倾向 m1 或 m2。
- **次级"裁"项承接声明**：正文其余标"裁"的次级选择（如 B3 条目定式细节）由 STEP2 设计者提出具体方案、gate③ 整体审定；实现前无一生效。

## 需求裁定记录

对 r1（九条，r2 已核验四条 verified）：见 req-v2 文末记录，此处不重复。

对 r2（六条）：
- REQ-2：B8 候选 d 补内容绑定三子候选（d1 摘要令牌+持久批准记录/d2 仅 CAS/d3 不绑定即诚实弱化）；F2 重跑与令牌失效如实关联；AC11 新增。
- REQ-3：B3 补 truth 侧基线校验（与 spec CAS 同级保证、边界诚实：同命令内读→校→改名，无跨进程锁）；ID 归属 t1/t2 双候选连并发后果 → Q6；AC5 增并发挤占断言。
- REQ-4：B4 重构为 F1/F2 两族——确定性校验全部 global preflight（零写入），I/O 故障为唯一部分提交来源；③ 改称 completion point 并明示非回滚点；AC6 双族分测。
- REQ-5：B5 三项子决策——载体 c1/c2/c3（倾向独立 manifest）、语法错误谱全列（F1）、全局后果 g1/g2/g3 明示（含 v1 全绿承诺删除的显式声明、g2 触碰别改清单三态的标注）→ Q7；AC3 按机制取变体；候选 ii 的 AC1 总耗时注记。
- REQ-6：B6 gate 七项逐项陈列 + m1/m2/m3 候选（n/a 必须明示非静默）+ 共通不弱化不变量（AC10 回归断言）→ Q8。
- REQ-10：Q6/Q7/Q8 新增承接 B3/B5/B6 的"裁"项；次级"裁"项归 STEP2 提案、gate③ 整体审定的承接声明入开放问题节。

Advisory 采纳：completion point 改名（B4）；AC1 候选 ii 总耗时（AC1）；flow-state next-action 与账本列数已修（落盘状态，另见 flow-state/issues.md）。
