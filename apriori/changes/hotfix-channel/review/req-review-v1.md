# req-review-v1 — hotfix-channel 需求评审

评审对象：`apriori/changes/hotfix-channel/requirement/req-v1.md`

评审依据：

- `/root/apriori-feedback/棕地落地总复盘-给规范作者的改进依据.md`：§四·墙二、§五·样本四、§六·P0-4/5
- `apriori/truth/archive-merge.md`
- `apriori/truth/spec-runner.md`
- `apriori/truth/gate.md`
- `RUNBOOK.md`
- `lib/` 当前 state A

本评审不要求预先裁决 Q1–Q5；只判断决策空间是否完整、诚实，以及目标、约束和验收是否足以进入设计。共发现 9 个正式问题。

## 1. 目标态 B 是否清楚

维度结论：有问题（REQ-1、REQ-2、REQ-3）。

### REQ-1 — hotfix 身份与目录候选没有覆盖防降级约束及生态代价

B2/Q2 给出“复用 `changes/` + `type: hotfix`”和独立命名空间两个候选，但没有完整陈述二者的安全与兼容后果：

- 方案 a 可自动进入当前 `status` 活跃目录枚举和 sibling delta 扫描，但可编辑的 `type: hotfix` 也可能成为普通 change 绕过 R2、ledger、raw 等保护的降级开关。
- 方案 b 不具备文档所称的“自动复用”：当前 resolver、`status`、`gate`、`verify --change` sibling discovery 和 archive discovery 都只认识 `apriori/changes/`，还需决定名称冲突、解析优先级和 archive 布局。
- Q3 只讨论 mutation/module 数量或软约束，没有覆盖“普通 change 能否中途改标 hotfix”“hotfix 能否升级为 change”“同名 hotfix/change 如何处理”等身份边界。
- B4 写“防逃逸判据见 Q5”，但实际对应 Q3；Q5 是命名问题。

需要扩充 Q2/Q3 的候选后果和身份不变量，但不需要在本阶段替人类选定方案。

### REQ-2 — Q1 没有列出真正保留 gate④ 的候选，现有候选的签收证据也不可认证

RUNBOOK 明确规定 KB sign-off 是不可被 blanket consolidation 覆盖的保护关卡。Q1 的三个候选均存在未声明后果：

- “调用即批准”只有在命令确由人类亲手执行、且执行前已看到待写入内容时才等价于签收；CLI 自身无法分辨调用者是人还是 agent。
- `--signed-off-by <人>` 只是自声明字符串，不证明该人实际批准，agent 同样可以填写。
- 分级候选 c 继承同一认证问题。
- 候选中缺少“先 dry-run/展示 KB diff，明确停下等待人类批准，再执行写入”这一保持现行 gate④ 语义的选项。

Q1 可以最终选择较薄的纪律，但决策空间必须区分 approval semantics、evidence 和 enforcement，并诚实说明哪些方案只能靠 RUNBOOK 纪律、哪些方案实际修改了受保护关卡。

### REQ-3 — Decisions 追加的数据契约尚未形成完整决策空间

B1/B2/AC5 要求把条目追加到 `truth/<module>.md`，但 bundle 如何表达写入目标及内容尚未定义，也未列为开放设计项。至少缺少：

- decisions-only hotfix 如何指定 `<module>` 或具体 truth path；
- 同一 bundle 是否允许写多个模块、多个条目；
- truth 文件不存在、缺少或重复 `## Decisions`、目标为 symlink/escape 时如何处理；
- decision ID、`active`、出处的机器格式；
- ID 冲突、同内容重跑和不同内容重跑分别是 no-op 还是 conflict；
- malformed entry 是整组拒绝还是跳过；
- 一个 hotfix 同时带 delta 与 Decisions 时，两类目标如何对应。

这些不是要求现在决定具体格式，而是要求把合法选项、失败语义和后果纳入 gate③ 的设计空间。否则 AC5 无法唯一导出实现。

## 2. 边界与异常路径

维度结论：有问题（REQ-3、REQ-4、REQ-5、REQ-6）。

### REQ-4 — “原子提交”超出 state A，新增 truth 写入后的事务边界未声明

B2 称复用现行 archive 的“CAS、原子提交、modified-integrity”，但 state A 的高层 archive 实际保证是：

- preflight 之前零写入；
- store 文件逐个 atomic rename；
- mid-commit 可以部分成功且不回滚；
- 所有 store 提交后才移动 bundle；
- move 失败会留下已提交的 stores 和仍在途的 bundle。

因此“原子提交”若指整个 archive transaction，并不真实。加入 truth Decisions 后，写集合还会从 spec stores 扩展为 spec stores + truth files + bundle move。需求没有声明：

- store 部分提交后 truth 写入失败的状态；
- truth 已追加但 bundle move 失败的状态；
- truth 的并发写保护或 CAS；
- 重跑如何识别每一部分已经完成；
- 哪个阶段是 commit point；
- failure report 和人工恢复信息。

需要把“atomic”限定到真实保证，或把增强事务性列为待裁决选项，并为每个失败阶段增加 fault-injection acceptance。

### REQ-5 — “无绑定测试”如何被机器判断未定义

B2/AC3 要求：delta 存在且没有绑定测试时必须有机器可见 no-test 理由，缺失则 archive fail-closed。但 state A 的 archive 不运行测试，测试绑定只有 `verify` 通过执行 `test-cmd` 后才能判断。

需求尚未说明：

- archive 是否隐式执行项目测试；若是，这是一项新的副作用和性能成本；
- 是否只检查声明字段，而不验证真实绑定；
- 是否复用先前 `verify` 证据，以及如何防止证据过期；
- ADDED、MODIFIED、RENAMED、REMOVED 的“需绑定”范围是否相同；
- removal-only 的 vacuous scope 和 lingering ORPHAN 是否必须填写 no-test；
- 混合 delta 中部分 scenario 有绑定、部分没有时理由粒度是 bundle、requirement 还是 scenario。

这部分需要进入设计决策空间，并由 AC3 覆盖各 operation 和混合情形。

### REQ-6 — 纯结论 hotfix 与 state A 的 zero-delta fail-closed 直接冲突，但例外边界未声明

AC4 要求无 delta 的 hotfix 可直接归档；state A 的 AM-17 和 `discoverDeltas()` 则规定找不到 `.md` delta 时 exit 2。`verify --change` 和在途 `gate` 同样依赖该 discovery。

需求没有说明：

- zero-delta 例外只属于专用 hotfix command，还是会改变普通 `archive --change`；
- 普通 change 的 AM-17 fail-closed 是否必须保持；
- 在途纯结论 hotfix 的 `verify/gate` 应为 `n/a`、PASS 还是不调用；
- 如何证明空 change 不能冒充合法纯结论 hotfix。

这是与 state A 的真实冲突，需要显式纳入设计和回归验收，不能依赖实现者自行放宽全局 archive 规则。

## 3. 未声明的状态变化或副作用

维度结论：有问题（REQ-1、REQ-2、REQ-3、REQ-4、REQ-5）。

已声明的新持久状态包括 archive bundle、spec store 和 truth Decisions；但以下后果没有完整声明：

- `type: hotfix` 将改变 `gate/status/resolve` 的信任边界和豁免规则（REQ-1）。
- Q1 的 sign-off 形式可能实质修改 protected human gate（REQ-2）。
- truth 的目标选择、冲突及 provenance 规则缺失（REQ-3）。
- spec 与 truth 的组合写入新增部分提交和恢复状态（REQ-4）。
- 若 archive 为判断绑定而执行 `test-cmd`，会新增进程执行、副作用、耗时及 infra-error 路径（REQ-5）。

因此本维度不能判定为完整。

## 4. 验收标准是否可测

维度结论：有问题（REQ-5、REQ-6、REQ-7、REQ-8、REQ-9）。

### REQ-7 — “结论强制”没有对应负向验收

B5 声称 1012769 型空白档案“不再可能”，但现有 AC 只验证无 delta bundle 能归档，没有验证：

- conclusion 缺失、空白或只有占位符时拒绝；
- `type`、`date`、目标模块等必填 header 缺失或重复时拒绝；
- 非法或无法解析的 bundle 不得仅靠目录存在而归档。

AC4 甚至可能由一个空 bundle 通过。必须增加 fail-closed 的负向标准，才能证明“结论强制”。

### REQ-8 — AC1 没有客观 pass/fail 阈值

AC1 同时使用“≤10 分钟量级”和“以步骤数与文件数为客观代理”，但没有定义：

- wall-clock 的起止点及是否扣除测试执行、人类思考或环境等待；
- “量级”是否严格等于 `≤10:00`；
- 代理指标允许的最大命令数、文件数和人工输入量；
- 人工输入量按字符、字段还是编辑动作计算；
- 三类场景是分别达标还是合计达标。

当前只能记录数据，不能确定 PASS/FAIL。应选择明确的计时协议，或为代理指标给出精确上限；具体阈值仍可留给设计 gate 裁决。

### REQ-9 — AC8 引用的真实 fixture 不在声明输入中，预期结果也不足

已声明的 source material 只包含对 1012769 的文字复盘；当前 workspace 和 `/root/apriori-feedback/` 中没有该单的截图副本或 SQL 文件。因而 AI 无法验证“真实材料（副本）”而不自行杜撰。

AC8 还没有规定：

- fixture 的固定路径、内容或 hash；
- 需要提取的最小事实集合；
- 生成的 hotfix bundle 固定路径；
- review 证据应断言哪些字段、delta、Decision 和 no-test/test binding；
- 演示只 dry-run 还是实际在隔离副本归档。

应提供可读取的 fixture，或在需求内固定一份经人类确认的脱敏摘要及期望断言。

## 5. 与 state A 及五项保护是否冲突

维度结论：有问题（REQ-1、REQ-2、REQ-4、REQ-6）。

已确认与 state A 一致的部分：

- CAS 对 mutation delta 默认 fail-closed；
- REMOVED 采用 deprecated block，场景不再被要求，残留测试成为 ORPHAN；
- `verify --change` 已有 sibling attribution；
- modified-integrity 是 informative，不能改变 verdict；
- archive 的 bundle move 已存在；
- `status` 当前能列出 `apriori/changes/` 下的活跃目录。

需要解决的冲突：

- REQ-6：纯结论 archive 与 AM-17 zero-delta fail-closed 冲突。
- REQ-4：“原子提交”表述强于 D-AM-6 的真实保证。
- REQ-2：Q1 的部分候选可能削弱 protected KB sign-off。
- REQ-1：可编辑的 hotfix 类型若直接触发豁免，会让普通 change 绕过“只在正式 change 内不变”的五项保护；需求必须声明防降级不变量，而不能只声明善意用途。

## 6. target lineage 是否声明且真实

维度结论：通过。

静态核对结果：

- requirement 和 `flow-state.md` 均声明 `on-the-fly`、v4 产品线、main 暂不动、不合并 v1/v3。
- 当前 HEAD 确实位于 `on-the-fly`。
- `main` 是该分支的祖先，v1/v3 为独立历史线。
- `source-commit 4127653` 存在，内容为 P0 trio 落地提交。
- `4127653..HEAD` 对 `lib/` 无差异，符合“lib 作为 state A”的声明。

未发现 lineage 虚构、缺失或错指。

## Advisories

- won't-do 节存在，明确不改 STEP0–6、不改三个不可合并关卡、不做自动升格、不做通知推送和历史批量回填；范围表达合格。
- Q4 的 version 选择和 Q5 的术语选择属于真实的人类决策空间，无需在 requirement review 预先裁定。
- AC2 中 lingering test 成为 ORPHAN 通常意味着全局 `verify --specs` 仍为 GAPS，直到残留测试被删除；建议在设计用例中写出预期 exit code，避免把“旧场景不再被要求”误读成命令立即 GREEN。
- AC6 的“存量 318 测试”建议在 STEP2 固定为具体 runner 命令及 TAP plan，防止测试数量变化后只更新数字、不更新基线含义。

## Ledger delta

| ID | Issue | Status |
|---|---|---|
| REQ-1 | hotfix 身份与 Q2/Q3 未覆盖防降级不变量、命名空间生态代价及错误的 Q5 引用 | open |
| REQ-2 | Q1 缺少真正保留 gate④ 的候选，现有 sign-off 证据不可认证 | open |
| REQ-3 | Decisions 追加缺少目标、格式、冲突、重跑及异常契约 | open |
| REQ-4 | “原子提交”强于 state A，spec + truth + move 的事务和恢复边界未声明 | open |
| REQ-5 | no-test 所依赖的机器绑定判断、operation 范围及副作用未定义 | open |
| REQ-6 | 纯结论归档与 AM-17/`discoverDeltas` 的 zero-delta fail-closed 冲突 | open |
| REQ-7 | 强制 conclusion 及必填 header 没有负向 acceptance | open |
| REQ-8 | AC1 缺少客观计时协议或代理指标阈值 | open |
| REQ-9 | AC8 的真实 fixture 不在声明输入中，预期断言不足 | open |

VERDICT: 9 issues open
