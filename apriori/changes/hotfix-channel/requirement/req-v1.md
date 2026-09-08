# req-v1 — hotfix-channel：change 外的最小回写单元

target lineage: on-the-fly 分支（v4 产品线；main 暂不动，owner 指示；不合并 v1/v3）。state A 含已归档的 P0 前三 change（id-pattern 配置、change-scoped verify、modified-integrity 报告，KB source-commit 4127653）。

## 背景（墙二 + 样本四实证，复盘为据）

- **紧急修复全部逃逸流程**：v5.1 落地 UAT 四单（1012767/1012739/1012772/1012769）小时级响应压力下全走"会话直修→合并推送"，无一开 change。后果实测：MACHINE_CONFLICT 分支从代码删除而 store 的 BR-007 仍写旧口径（**已知 spec 漂移**）；1012769——全部 14 单里口径含量最高的一单——**档案目录里没有任何 .md**（只有截图和排查 SQL），根因链/口径变更决策/影响面只存在于会话记忆与 commit message。
- **留痕质量精确反映紧急度而非重要度**：同批 013 有完整 analysis.md（走了方案先行），014 什么都没有（边查边修）。
- **"不用修"的排查无承接**：UAT 轮 3/4 单实为环境/数据/基准问题——只排查不改码的工作今天连一个归档的地方都没有；且测试报单准确率随轮次递减（75%→25%），越到后期这类工作占比越高。
- **上线后学到的业务事实无落点**：「换机会在新后台重建运维机器并迁移主板」这类血泪知识，除非再开一个 change，否则 truth 的 Decisions 节无从追加。
- **成本刻度（复盘原话）**："流程外快在省掉了评审与留痕，而不是快在做得更聪明"；hotfix 的设计目标是把两者解耦——**留痕的最小成本必须压到比"不记录"只贵几分钟**，否则照样被逃逸。

## 目标（目标态 B）——设计先行：本节陈述目标与约束，B2/B5 的具体机制是 gate③ 必停的设计决策

### B1. 新概念：hotfix = change 外的最小回写单元，承接三类对象

1. **紧急代码修复的事后补记**：结论一段 + spec delta（沿用现行 delta 格式与 CAS）+ 测试绑定（或显式 no-test 理由）。
2. **"不用修"的排查结论**：结论一段即全部（现象→排查路径→定性→处置），无 delta。
3. **上线后学到的业务事实**：KB Decisions 节的 change 外追加条目（可与 1/2 并存于同一 bundle）。

### B2. CLI 面（形态候选，设计裁量——gate③ 决）

- 脚手架：`apriori hotfix <name>`（或 `apriori new --hotfix <name>`）——生成最小 bundle；**一条命令归档**：merge delta（若有）+ Decisions 追加（若有）+ 原子移入 archive（复用现行 archive 机械：CAS、原子提交、modified-integrity 报告白捡）。
- bundle 位置候选：a) `apriori/changes/<name>/` 加 `type: hotfix` 标记（复用 resolve/status/gate 生态）；b) 独立命名空间。倾向 a（少一套路径规则），评审与人类裁。
- bundle 内容（最小集）：单文件状态头（change/type/date/结论），可选 `specs/` delta，可选 decisions 追加段，delta 存在且无绑定测试时**必须**有机器可见的 no-test 理由行。

### B3. 与既有机械的关系

- 归档后的 hotfix 场景与普通场景**同权重**：verify/gate/check 一视同仁（这正是回写的意义——漂移终结于 store）。
- `status` 列出未归档 hotfix；`verify --change` 的兄弟归因把活 hotfix 的 delta 当兄弟对待（现行为自动成立，需测试确认）。
- CAS 照常强制（紧急不豁免正确性护栏——它只花 5 秒）。

### B4. RUNBOOK 语义（EN/CN）

新增 hotfix channel 节：何时合法（三类承接对象；事后补记为主形态——修复已经发生，通道的职责是让回写便宜）、何时禁止（常规演化必须走 change——防逃逸判据见 Q5）、与 STEP0-6 的关系（hotfix 不是流程的第七步，是流程边界外的最小合规路径）、人类角色（见 Q1）。runbook-version 是否动：Q4。

### B5. 纪律边界（别改清单交互——显式让渡与补偿，gate③ 必审）

hotfix **有意没有**：R2 评审轮、issue ledger、STEP0-5。补偿机制：
- bundle 全存档（结论是强制的——1012769 型空白档案不再可能）；
- **人类在场假设**：hotfix 场景里人类本来就在驱动（小时级响应），通道假定并要求这一点——具体机制（调用即批准 vs 显式 sign-off 标记）= Q1，涉及 gate④（KB 签收）不可合并原则的映射，**必停人类裁**；
- 后续任何 change 的评审天然看得见 hotfix 归档物（store 与 truth 里的痕迹同权重）；
- 别改清单五项（R2、flow-state verbatim、三态、账本、raw 强制）在**正式 change 流程内**分毫不动——hotfix 不修改它们，只是在流程外新增一条最薄路径。

## 范围外（won't do）

- 不改 STEP0-6 任何一步的语义；不改三个不可合并关卡；不做"hotfix 自动升格为 change"的自动化（人判断）；不做通知/推送类功能；不做对旧漂移的追溯回填工具（人工用本通道逐个补即可）。

## 验收标准（可测；细化待 STEP2）

- AC1（成本刻度）：lab 实测——三类承接对象各走一遍完整 hotfix（scaffold→填写→归档），每类的命令数与人工输入量记录在案，全流程 ≤10 分钟量级（以步骤数与文件数为客观代理）。
- AC2（漂移终结）：BR-007 型场景重演——代码删除某分支后，hotfix 携 REMOVED delta 归档 → `verify --specs` 不再要求该场景、其 lingering 测试转 ORPHAN；modified-integrity/CAS 全程生效。
- AC3（no-test 理由）：含 delta 无测试绑定的 hotfix，归档物中 no-test 理由机器可见；缺理由则归档拒绝（fail-closed）。
- AC4（纯结论）：无 delta 的 hotfix 归档只移 bundle，store/truth 零变化。
- AC5（Decisions 追加）：hotfix 携 decisions 条目归档 → truth/<module>.md Decisions 节追加该条（格式与现行一致，含 active 状态与出处）；Contract 节与 source-commit 不动。
- AC6（生态兼容）：status 列出活 hotfix；兄弟归因对活 hotfix delta 生效；归档后 gate/check/verify 全绿路径存在；存量 318 测试保持绿。
- AC7（文档）：RUNBOOK 双语新节 + docs/cli 双语 + CHANGELOG；check --self 绿。
- AC8（真实材料反事实）：用样本（副本）里 1012769 的真实材料（截图内容摘要 + 排查 SQL 结论）演示补记一个 hotfix bundle——当年的空白档案在本通道下的应然形态，存 review/ 作证据。

## 开放问题（设计先行——gate②/③ 人类必答）

- **Q1（核心）**：gate④（KB 签收）不可合并原则如何映射到 hotfix？候选：a) 调用即批准——hotfix 命令由人类亲手跑，命令行为即签收（bundle 状态头记录）；b) 归档命令要求显式 `--signed-off-by <人>` 类标记；c) 无 delta/decisions 的纯结论 hotfix 免签、有回写的必签。倾向 c 的分级，但这是三不可合并关卡的边界解释，**必须你裁**。
- **Q2**：bundle 位置（changes/ 复用 + type 标记 vs 独立目录）。倾向复用。
- **Q3**：防逃逸判据——什么时候"这不该是 hotfix，去开 change"？候选：mutation 操作数上限（如 >N 个 MODIFIED/REMOVED 即拒绝）、模块数上限、还是仅 RUNBOOK 文字约束 + 归档物天然可审计。倾向软约束（文字）+ 一个 advisory 提示，硬上限易被真实紧急场景反噬。
- **Q4**：runbook-version 4.0 → 4.1？（新增流程语义节但不改既有步骤。）
- **Q5**：命名——`hotfix` 还是更广（它也承接排查结论与知识回流，`回写单元`性质大于`修复`）？复盘用词 hotfix，沿用之，除非你想改。
