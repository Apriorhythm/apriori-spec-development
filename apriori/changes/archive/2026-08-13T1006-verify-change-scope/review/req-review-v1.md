# req-review-v1 — verify-change-scope 需求评审

评审基线：

- 需求：`apriori/changes/verify-change-scope/requirement/req-v1.md`
- 上下文：`apriori/changes/verify-change-scope/flow-state.md`
- state A：`lib/spec-runner.js`、`lib/gate.js`，包含尚未归档的 `gate-id-pattern`
- 辅助知识：`apriori/truth/spec-runner.md`、`apriori/truth/gate.md`
- 仓库现实：当前分支 `main`，HEAD `10aef21`，package `4.0.7`
- 本轮结论：7 个计数问题；另有 4 条 advisory
- 明确的 `范围外（won't do）` 章节：已存在

## 维度 1：target state B 是否清晰、无歧义

结论：不通过。存在 REQ-1、REQ-2、REQ-3、REQ-4。

### REQ-1：`RENAMED` 的目标语义与现有 delta 语法冲突

描述：

需求 B1 写“`RENAMED` 取改名后的 ID”，AC3 又要求“`RENAMED` 后按新 ID 要求”。但 state A 中 `RENAMED` 的语法是 `Old Requirement -> New Requirement`，重命名的是 Requirement 名称；`archive-merge.merge()` 保留整个块内容，场景 ID 不会变化。现有测试 SR-19 也明确断言 `RENAMED` 后 `XA-01` 保持不变。

风险：

AI 无法判断应该：

- 沿用现有语法，仅将改名后 Requirement 块中的原场景 ID 纳入 change scope；
- 自动改写场景 ID；
- 还是把场景 ID 改名视为另一个 `MODIFIED` 操作。

不同选择会产生不同的 change verdict，并可能破坏 archive/project 一致性。

建议修复：

明确规定：`RENAMED` 只重命名 Requirement；change scope 包含改名后目标 Requirement 块在 projection 中的场景，场景 ID 原样保留。将 AC3 的 oracle 改成类似：

> 如果 `Alpha -> Gamma`，且原块含 `XA-01`，则 projection 中 `Gamma` 的 `XA-01` 属于 change scope；不会凭空产生新场景 ID。场景 ID 的改变必须由 `MODIFIED` 块显式表达。

### REQ-2：change scope 使用“ID 集”定义，无法确定 duplicate 和 unidentified 的边界

描述：

B1 将 change scope 定义为场景 ID 集，但以下判定依赖“场景 occurrence 的来源”，不能只靠 ID 集完成：

- change 中的场景与未修改 store 场景使用同一个 ID；
- duplicate 的两个 occurrence 都在 change 中；
- duplicate 完全发生在 change 外；
- 未识别场景位于 `ADDED`、`MODIFIED`、`REMOVED` 或未修改 store 中；
- `ADDED`/`MODIFIED` 命中 state A 的 idempotent `unchanged` 路径。

“change 范围内无 duplicate”和“delta 内无 unidentified”也不是同一个边界：前者描述 projection，后者描述原始 delta。

风险：

实现可能先把 projection 压成 `Map<ID,...>`，丢失 provenance，随后无法可靠判断 duplicate/unidentified 是否应进入 change verdict。尤其是“一个 changed occurrence 与一个 unchanged occurrence 撞 ID”可能被不同实现判成 GREEN 或 GAPS。

建议修复：

把 change scope 定义为带 provenance 的 scenario occurrence 集，再派生 ID 集。补充操作真值表：

- `ADDED`：目标 Requirement 在 projection 中的全部 scenario occurrences；
- `MODIFIED`：替换后目标块中的全部 scenario occurrences，包括保留的旧 ID；
- `REMOVED`：不贡献 scenario occurrence；
- `RENAMED`：改名后目标块中的全部 occurrence，ID 不变；
- idempotent `unchanged`：是否仍贡献 scope，必须明确。

同时明确：

- 任一 change occurrence 的 ID 在整个 projection 中出现超过一次时，是否阻断 change verdict；建议阻断。
- duplicate 完全发生在 change 外时，仅进入 store report。
- unidentified 是否只在上述 change occurrence 来源中阻断；建议如此，避免使用含混的“delta 内”。

### REQ-3：store report 丢失了 state A 中的三类问题

描述：

B2 只要求 store report 输出 `UNBOUND`、true-`ORPHAN`、unattributed failures，但 state A 的全局判定还包含：

- `BOUND-RED`
- duplicate scenario IDs
- `UNIDENTIFIED`

特别是 B1/AC5 要求其他 change 的 red 不影响当前 change；如果 store report 又不列 `BOUND-RED`，该失败会从所有输出中消失。范围外 duplicate 和 unidentified 也存在同样问题。

风险：

这不是单纯展示调整，而是未声明的信息丢失。用户可能看到当前 change 为 GREEN，同时看不到导致测试进程失败的外部 `BOUND-RED`，也无法解释非零的 `exec.status`。

建议修复：

定义 store report 为“整个 projection 与同一 TAP 结果的完整信息性 evaluation”，至少包含：

- `boundRed`
- `unbound`
- true-`orphan`
- `unidentified`
- `unattributedFailures`
- `duplicates`

明确 `boundGreen` 是否只显示计数或完全省略。为每类规定 count、list、排序和 human 输出截断规则。新增验收：范围外 tagged red、范围外 duplicate、范围外 unidentified 均不阻断 change verdict，但必须出现在 store report。

### REQ-4：human、JSON、module API 和 gate 输出契约尚未定稿

描述：

Q1 仍在二选一，B2 也只说“新增结构化字段”。当前 state A 的兼容表面不止 CLI：

- `verify()` 的 `run.verdict`、`duplicates`、`results`、`fileCount`、`scenarioCount`
- `verifyJson()` 的既有顶层字段和 `projection`
- `formatReport()` 的单 verdict 输入
- `gate.checkBinding()` 对 `run.verdict` 和 `run.duplicates` 的直接消费
- gate JSON 的 `checks[].detail`

尚未声明 GREEN、GAPS、ERROR 三类结果中哪些新字段恒定存在，也未定义 C1 的 store summary 是 detail 文本还是结构化属性。

风险：

AI 必须自行发明数据模型；即使 CLI exit code正确，也可能破坏现有 module consumer、JSON consumer 或 gate JSON。

建议修复：

在需求中钉死一个 schema。建议采用：

- `--change` 的既有顶层 `clean/result` 及 binding arrays 改为 change 语义，并在 CHANGELOG 明确行为变化；
- 新增稳定的 `storeReport` object，承载 REQ-3 的完整分类；
- `projection` 的现有形状保持不变；
- 明确 `specFiles`、`duplicates`、`results`、`scenarioCount` 分别属于 change 还是完整 projection；
- ERROR 时明确 `change`/`storeReport` 是空结构、partial 结构还是省略；
- 定义 human 两段的稳定标题和唯一最终 `RESULT`；
- 定义 gate C1 的固定 detail 格式；如新增结构化摘要，给出准确字段；
- 给 `verify()` run object、`verifyJson()` 和 gate JSON 各提供一个完整示例。

## 维度 2：边界与异常路径是否覆盖

结论：不通过。已有 projection、TAP、非法 `id-pattern` 等 infra ERROR 继承声明，但缺少 REQ-5、REQ-6、REQ-7 所述边界。

### REQ-5：范围外失败与非零测试进程状态的关系未裁定，并冲突于 state A

描述：

state A 的有效决策 D-SR-x 明确规定“a non-zero exec status never exits 0”。目标 B 和 AC5 又要求其他 change 的 red 不影响当前 C1。实际 TAP runner 通常会在任何 `not ok` 出现时返回非零，因此以下状态会同时发生：

- 当前 change 全 green；
- 存在范围外 tagged red 或 unattributed failure；
- `exec.status !== 0`；
- TAP 本身可信，且该非零状态能被范围外失败解释。

按目标意图应为 change GREEN；按 D-SR-x 必须不能 exit 0。Q2 只讨论 unattributed 的归属，没有裁定 process status。

风险：

实现可能返回 GREEN exit 0、GAPS exit 1 或 ERROR exit 2，三种结果都有文本依据。AC1 没有钉死 fixture 的进程状态，因此也无法捕获该分歧。

建议修复：

显式 supersede 或保留 D-SR-x。若选择支持独立变绿，建议规定：

> 仅对 `verify --change`，当 `exec.status !== 0` 可由已解析的范围外失败完整解释、TAP 无 infra error、且 change verdict clean 时，允许 GREEN exit 0；若非零状态没有任何已解析失败解释，仍按现有规则 ERROR exit 2。

AC1 和 AC5 的命令必须显式 `process.exit(1)`，并断言当前 change 仍为 GREEN/C1 pass；另加“非零且无 parsed failure”仍 ERROR 的反例。CHANGELOG 和 truth decision 必须明确 D-SR-x 在 `--change` 下被限定或 superseded。

### REQ-6：零场景 change scope 的 vacuous 语义未定义

描述：

以下合法投影可能产生空 change scope：

- change 只有 `REMOVED`；
- `MODIFIED` 删除目标块的全部场景；
- `RENAMED` 的目标 Requirement 没有场景；
- `ADDED`/`MODIFIED` 块只有 unidentified 场景；
- change scope 为空，但 projection 中仍有其他 store 场景；
- 删除最后一个场景后，整个 projection 也为零场景。

state A 的 D-SR-1 要求 vacuous run 不得 GREEN，但该规则目前检查的是整个 projection，不是新的 change scope。

风险：

remove-only change 可能被意外判 GREEN，也可能因“零 change 场景”被判 ERROR；两者都会影响归档 gate，且现有 AC 没有 oracle。

建议修复：

增加零范围真值表，分别指定 GREEN/GAPS/ERROR。至少覆盖：

- 空 change scope、非空 projection；
- 空 change scope、空 projection；
- 只有 scoped unidentified；
- removal-only 且存在 lingering test。

同时声明这是沿用还是限定 D-SR-1。

### REQ-7：两视角是否共享一次 projection 和一次 TAP 执行没有成为可测试契约

描述：

B2 的“同一次运行”可以理解为一个 CLI invocation，但没有明确禁止为了 change verdict 和 store report 各执行一次测试。state A 明确是一个 test-command invocation。若执行两次，测试可能有副作用、flaky 结果或并发状态变化，两段报告也可能依据不同快照。

风险：

新增一个信息性报告可能把测试执行次数翻倍，产生未声明 side effect；change verdict 与 store report 还可能相互矛盾。

建议修复：

明确规定：

- 每次 `verify --change` 只调用一次 `buildProjection`、一次 `runTestCommand`、一次 TAP parse；
- 两个视角共享同一份内存 projection、同一 resolved matcher 和同一 TAP 结果；
- test command 执行期间发生的 spec/delta 并发修改不进入本次结果，下次运行才可见；
- projection/matcher 的 pre-test ERROR 不执行 test command；
- test command 的副作用不可 rollback，保持 state A；
- 不新增 test-command timeout；config-origin matcher 的既有 `2000ms` timeout 保持不变。

增加一个带计数器的验收测试，断言两段报告只触发一次 test command。

## 维度 3：是否存在 implied but undeclared 的状态变化或副作用

结论：不通过。

- REQ-3 会让范围外 `BOUND-RED`、duplicate、unidentified 从现有输出中消失，属于未声明的信息状态变化。
- REQ-7 未声明保持一次 test-command invocation，可能增加外部副作用。
- 未发现需要新增持久化写入或 rollback 的目标；`verify`/`gate` 应继续保持 read-only，只有既有 test command 可能产生外部副作用。

## 维度 4：每条 acceptance criterion 是否可写成 if/then oracle

结论：不通过。

- AC1、AC5 未指定范围外失败时的 `exec.status`，无法裁定 REQ-5。
- AC3 的“新 ID”与 state A 的 `RENAMED` 语义冲突，无法按现有 delta 格式构造唯一 fixture。
- AC4 的“change 范围内 duplicate”和“delta 内 unidentified”缺少 REQ-2 所述 provenance oracle；`GAPS/ERROR 按现行语义`也不是唯一 expected result。
- AC1 只断言 `change.clean=true`，未给出 REQ-4 所需完整 JSON shape。
- 没有覆盖范围外 `BOUND-RED`、duplicate、unidentified 的 store report。
- 没有覆盖空 change scope。
- 没有覆盖单次 test-command invocation。
- 没有覆盖 projection/TAP ERROR 时两段 human/JSON 字段的存在规则。

AC2 可直接表达为 if/then。AC6 在固定样本身份后可作为手工 oracle。AC7、AC8 可执行，但应在解决上述 schema 和语义问题后补充精确断言。

## 维度 5：是否与当前 state A 冲突

结论：不通过。

- REQ-1 与 `archive-merge` 的 Requirement-only `RENAMED` 及 SR-19 冲突。
- REQ-5 与 D-SR-x 和现有 SR-33/GT-17 前后的 unattributed/non-zero 契约冲突；需求虽承认语义变化，但尚未声明 supersede 后的精确规则。
- REQ-4 若直接改变顶层 JSON 或 `run.verdict`，会改变当前公开形状；这是允许的目标变化，但必须先声明兼容策略和 ERROR shape。
- REQ-7 若执行两次测试，会冲突于 state A 的单次调用契约。
- `id-pattern` resolution、`makeIdMatcher`、matcher threading 以及 gate 的 `--id-pattern` 通道已被需求明确列为不改；这部分与实际 workspace state A 一致。

## 维度 6：target lineage 是否声明且符合仓库现实

结论：通过。

需求头部和 flow-state 均声明 `main（v4 产品线；不合并 v1/v3）`。仓库当前位于 `main`，HEAD 为 `10aef21`、tag `v4.0.7`，与声明一致。flow-state 也明确记录本 change 建立在尚未归档的 `gate-id-pattern` workspace 实现之上，符合实际 dirty worktree。

## Advisories（不计入 verdict）

### ADV-1：`won't do` 章节已满足要求

需求存在明确的 `范围外（won't do）`，并列出了 `modified-block-integrity`、hotfix、`--specs`、跨 change 协调视图和 `id-pattern` 等排除项。

### ADV-2：建议本轮不调整 `runbook-version`

当前 package major 为 `4`，双语 RUNBOOK 均为 `runbook-version: 4.0`，CK-11 只要求 major 与 package major 一致。本 change 没有 CLI major 变化，因此建议更新 STEP5 语义文字但保持 `4.0`；行为变化由 CHANGELOG 明示。

### ADV-3：AC6 的样本证据应固定后再执行

AC6 已要求记录 sample HEAD、CLI、命令和确切计数。建议证据中再记录 test command 的退出状态、resolved `id-pattern` 来源及配置值，以便 REQ-5 的结果可复放。此项不构成需求阻断，因为预期计数已经给出。

### ADV-4：后续 truth 写回应合并两项连续变更

`spec-runner.md` 和 `gate.md` 当前描述 pre-workspace state。归档时应先保留 `gate-id-pattern` 已实现的 matcher/resolution 契约，再写入本 change 的 scope/report 契约，避免后写的 truth 把前一 change 覆盖掉。

## Ledger delta

以下行应追加到 `apriori/changes/verify-change-scope/review/issues.md`：

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | `RENAMED` 被写成产生新场景 ID，与现有 Requirement-only rename 语法冲突 | high | 1 | open |
| REQ-2 | change scope 缺少 scenario occurrence provenance，duplicate/unidentified 边界及 idempotent operation 未定义 | high | 1 | open |
| REQ-3 | store report 未声明 `BOUND-RED`、duplicate、`UNIDENTIFIED`，会丢失范围外问题 | high | 1 | open |
| REQ-4 | human、JSON、module API 与 gate summary 的目标 shape 未定，Q1 仍开放 | high | 1 | open |
| REQ-5 | 范围外失败导致 non-zero exec 时的 exit 规则未定，并与 D-SR-x 冲突 | high | 1 | open |
| REQ-6 | 空 change scope、removal-only 和全 projection 零场景的 verdict 未定义 | medium | 1 | open |
| REQ-7 | 两视角是否共享一次 projection/TAP/test invocation 未声明，存在新增副作用与并发不一致风险 | high | 1 | open |

VERDICT: 7 issues open
