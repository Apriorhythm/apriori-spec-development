# req-v2 — hotfix-channel：change 外的最小回写单元

target lineage: on-the-fly 分支（v4 产品线；main 暂不动，owner 指示；不合并 v1/v3）。state A 含已归档的 P0 前三 change（KB source-commit 4127653）。

## 背景

同 req-v1（墙二/样本四实证：UAT 四单逃逸、BR-007 漂移、1012769 空白档案、"不用修"排查无承接、知识回流无落点；成本刻度：比"不记录"只贵几分钟）。

## 目标（目标态 B）——设计先行：机制候选连同后果完整陈列，gate③ 人类裁

### B1. 新概念：hotfix = change 外的最小回写单元，承接三类对象

1. 紧急代码修复的事后补记（结论 + spec delta + 测试绑定声明或 no-test 理由）；
2. "不用修"的排查结论（结论即全部）；
3. 上线后学到的业务事实（KB Decisions 追加条目；可与 1/2 并存）。

### B2. 身份与位置（REQ-1 收口后的决策空间，Q2/Q3 人类裁）

- **候选 a：复用 `apriori/changes/<name>/`，身份由专名状态文件承载**（`hotfix-state.md`，与 `flow-state.md` 互斥存在——不是 flow-state 里一个可编辑的 `type:` 字段，杜绝"普通 change 改一行标记降级逃逸 R2/账本/raw"）。后果：status/resolve/兄弟归因生态自动可见（各消费点按状态文件名区分展示）；gate 对 hotfix bundle 的适用性需定义（见 B6）。
- **候选 b：独立命名空间 `apriori/hotfixes/`**。后果如实陈列：resolver/status/gate/verify 兄弟归因/archive discovery 现全部只认 `changes/`——需要新一套路径规则、同名冲突裁决、归档布局；"复用生态"不成立。
- **身份不变量（两案通用）**：hotfix 与 change 不可互转——`flow-state.md` 与 `hotfix-state.md` 同时存在 = 非法（fail-closed）；"升格"= 人工新开 change 并在其 req 引用 hotfix bundle，无自动化；同名 hotfix 与 change 冲突 = scaffold 拒绝。
- **防逃逸判据（Q3）**：候选 i) 仅 RUNBOOK 文字约束 + 归档物可审计；ii) advisory 提示（mutation 操作数 > N 或跨模块数 > M 时打印"考虑开正式 change"，不拒绝）；iii) 硬上限拒绝。倾向 ii（软提示；硬上限会被真实紧急场景反噬），人类裁 N/M。

### B3. Decisions 追加的数据契约（REQ-3 收口后的决策空间）

- **写入目标表达**：decisions 条目自带目标模块头（如 `module: spec-runner`）；一个 bundle 允许多条、跨多模块。
- **条目机器格式**（候选定式，gate③ 裁）：`- D-<模块缩写>-hf-<n> (active): <正文>。 Ratified via hotfix <name> (<date>).`——ID 由归档命令按目标文件现有 Decisions 计数分配或作者手写（裁）。
- **失败语义（fail-closed 全谱）**：目标 truth 文件不存在 / 无 `## Decisions` 节 / 节重复 / 目标为 symlink 或逃逸路径 → 整个归档拒绝，零写入；malformed 条目 → 整组拒绝（不跳过）。
- **重跑语义**：同 ID 同内容 → no-op（幂等）；同 ID 异内容 → conflict 拒绝。
- **与 delta 的对应**：两类各自独立寻址（delta 按 store suffix，decisions 按 module 头），无隐式关联。
- Contract 节与 source-commit **永不**被 hotfix 触碰。

### B4. 归档的真实事务边界（REQ-4 修正："原子"限定到 state A 真实保证）

写集合三段有序：**① spec stores（沿用现行逐文件 atomic rename；preflight 前零写入；部分提交可能且不回滚——state A 现状如实声明）→ ② truth Decisions 追加（逐文件；以条目 ID 幂等——重跑识别已追加）→ ③ bundle 原子移入 archive（commit point）**。任一段失败：已完成段保持、失败报告**指名已完成段与恢复动作**（重跑同命令按幂等续跑）；②失败时①已提交（如实声明，与 state A 的 mid-commit 语义一致）；③失败时①②已提交、bundle 在途（同 state A move 失败语义）。每段失败均有 fault-injection 验收（AC 列）。CAS 照常（①段前 preflight）。

### B5. no-test 理由的判定机制（REQ-5 收口后的决策空间，gate③ 裁）

- **候选 i（倾向）：声明制**——归档只查**声明**：delta 的每个 ADDED/MODIFIED 块（RENAMED 目标同）在 bundle 中要么有 `tests: <绑定声明>` 行、要么有 `no-test: <理由>` 行（**粒度 = requirement 块**）；REMOVED-only 免声明（无新要求）。归档不跑测试（保持 archive 零测试副作用）；谎报的代价由既有机械承接——store 里无测试的场景在下一次任何 `verify` 中就是 UNBOUND，全 store 可见。
- 候选 ii：归档隐式跑 `verify`——新增测试执行副作用/耗时/infra 路径，与"几分钟"目标冲突，如实列出供裁。
- 候选 iii：要求引用既有 verify 证据——证据新鲜度无法机械保证，如实列出。

### B6. 生态适用性（REQ-6 收口：zero-delta 例外只属 hotfix 通道）

- 纯结论 hotfix 的归档走**hotfix 专属命令/路径**——普通 `archive --change` 的 AM-17 zero-delta fail-closed **分毫不动**（回归断言）。
- 在途 hotfix 的 `verify --change`/`gate`：无 delta 时 n/a（不适用——它没有绑定要求可判）；有 delta 时可选地照常可跑（delta 语义同普通 change）。status 列出（标注 hotfix）。
- 空 bundle 冒充：被 B7 的结论强制拦截。

### B7. 结论强制（REQ-7 收口）

conclusion 是 hotfix 的**唯一无条件必填物**：缺失 / 空白 / 仅模板占位文本（占位判定 = scaffold 生成的原文未改）→ 归档拒绝；必填头（name/date/承接类别）缺失或重复 → 拒绝；不可解析 bundle → 拒绝。负向验收全列（AC）。

### B8. 人类签收（REQ-2 收口后的决策空间——gate④ 原则的映射，Q1 人类必裁）

四个候选，按**批准语义 / 证据 / 强制力**三轴诚实标注：

| 候选 | 批准语义 | 证据 | 强制力 |
|---|---|---|---|
| a) 调用即批准 | 假定命令由人类亲手跑 | bundle 状态头记录调用时间 | 纯纪律——CLI 无法分辨调用者是人还是 agent |
| b) `--signed-off-by <人>` | 自声明 | 一个字符串 | 纯纪律——agent 同样能填 |
| c) 分级（纯结论免签、有回写必签） | 同 b 分级 | 同 b | 同 b |
| **d) 两步式：`hotfix archive` 默认 dry-run 呈现全部将写入内容（store diff + truth 条目），显式第二命令（如 `--approve`）才写入** | 人类看过 diff 后批准 | dry-run 输出 + 第二命令的存在 | **保持现行 gate④ 语义**——agent 被 RUNBOOK 禁止自跑 `--approve`（同 R3 对 `/goal` 的禁令模式，且可被 Stop-hook/CI 加固） |

诚实结论：a/b/c 实质是把受保护关卡换成纪律背书；**只有 d 保持"人看过内容才落盘"**。倾向 d（其成本仅是"跑第二条命令"，与几分钟目标不冲突），你裁。

## 范围外（won't do）

同 req-v1；另加：不改 AM-17 与普通 archive 的任何 fail-closed；不做 hotfix↔change 自动互转；不做旧漂移批量回填工具。

## 验收标准（可测；细化待 STEP2）

- AC1（成本刻度，客观阈值）：lab 脚本化重演三类各一遍——**每类 ≤3 条命令、手工编辑 ≤2 个文件**；脚本墙钟（scaffold 命令开始→归档成功结束，不含测试套件运行与人类思考）**≤10:00**；三类分别达标。阈值可在 gate③ 调整。
- AC2（漂移终结）：BR-007 型重演——hotfix 携 REMOVED delta（含 no-test 豁免路径）归档 → verify 不再要求、lingering 测试转 ORPHAN；CAS/modified-integrity 生效。
- AC3（no-test 判定，按 B5 所裁机制）：ADDED/MODIFIED/RENAMED 目标各自的声明缺失 → 归档拒绝；REMOVED-only 免声明；混合 delta 按块粒度逐一判。
- AC4（纯结论）：无 delta 无 decisions 的 hotfix 经**专属路径**归档只移 bundle，store/truth 零变化；普通 `archive --change` 对 zero-delta 照旧 exit 2（回归断言）。
- AC5（Decisions 契约，按 B3）：多条多模块追加成功且格式/ID/出处正确；不存在的模块 / 缺 Decisions 节 / symlink 目标 / malformed 条目 → 整体拒绝零写入；同 ID 同内容重跑 no-op、异内容 conflict。
- AC6（事务边界，按 B4）：三段各注入失败——已完成段保持、报告指名已完成段、重跑幂等续完。
- AC7（结论强制负向全谱）：缺失/空白/未改占位/缺头/重复头/不可解析 → 各自拒绝且报错指名。
- AC8（示范，重构材料）：以复盘文本（声明输入）**重构** 1012769 的应然 hotfix bundle 作为**冻结 fixture**（标注"依复盘重构，非原件"），归档演示三类承接俱全；期望 = 固定文件清单与关键内容断言。
- AC9（身份不变量）：flow-state 与 hotfix-state 并存 → 各消费点 fail-closed；同名冲突 scaffold 拒绝；防逃逸提示按 Q3 所裁形态触发。
- AC10（生态）：status 标注列出；兄弟归因对活 hotfix delta 生效；318 存量测试保持绿；RUNBOOK/docs 双语 + CHANGELOG；check --self 绿。

## 开放问题（gate②/③ 人类必答）

- **Q1（核心，B8）**：签收机制 a/b/c/d——倾向 d（两步式，唯一保持 gate④ 语义者）。
- **Q2（B2）**：位置与身份——倾向 a（changes/ 复用 + 专名状态文件互斥）。
- **Q3（B2）**：防逃逸——倾向 ii（advisory 提示，阈值你定）。
- **Q4**：runbook-version 4.0 → 4.1？（新增流程语义节。）
- **Q5**：命名沿用 `hotfix`（复盘用词），除非你改。

## 需求裁定记录（对 r1 评审）

- REQ-1：Q2 两案后果全列 + 身份不变量四条（专名状态文件互斥、不可互转、升格人工、同名拒绝）；B4→Q3 引用修正。
- REQ-2：B8 补候选 d（两步式 dry-run→人批→写入）并按批准语义/证据/强制力三轴标注；诚实声明 a/b/c 为纪律背书。
- REQ-3：B3 完整数据契约决策空间（寻址/多条多模块/失败全谱/重跑/与 delta 无隐式关联/Contract 永不触碰）。
- REQ-4：B4 把"原子"限定到 state A 真实保证，三段写集合 + 逐段失败语义 + 幂等续跑 + fault-injection AC6。
- REQ-5：B5 三候选（倾向声明制：块粒度、REMOVED 免、谎报由 verify 的 UNBOUND 全店可见性兜底）。
- REQ-6：B6 zero-delta 例外只属 hotfix 专属路径，AM-17 不动 + 回归断言（AC4）。
- REQ-7：B7 结论强制 + AC7 负向全谱。
- REQ-8：AC1 客观阈值（≤3 命令/≤2 文件/脚本墙钟 ≤10:00 起止点明确、逐类达标）。
- REQ-9：AC8 改为依复盘文本重构的冻结 fixture，标注非原件，期望钉死。
