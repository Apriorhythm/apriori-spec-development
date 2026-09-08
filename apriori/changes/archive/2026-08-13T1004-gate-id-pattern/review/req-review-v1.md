# req-v1 需求评审（第 1 轮）

评审基线：

- 需求：`apriori/changes/gate-id-pattern/requirement/req-v1.md`
- 知识库：`gate.md`、`spec-runner.md`、`check.md`、`doctor.md`
- 实现：`lib/config.js`、`lib/resolve.js`、`lib/spec-runner.js`、`lib/gate.js`、`lib/check.js`、`lib/doctor.js`
- 仓库现实：当前 lineage 为 `main`，产品版本为 `4.0.7`

## 维度 1：目标态 B 是否清晰且无歧义

结论：不通过。存在 2 个计入 verdict 的问题。

### REQ-1：三个开放问题会直接改变公共接口、模板和配置语义

**描述**

Q1–Q3 尚未收口：

- `check` 是否新增 `--id-pattern`
- 新项目模板是否预置 `id-pattern`
- `\|` 是否由共享 `parseConfig` 对所有键统一反转义

这些不是内部实现细节。Q1 改变 CLI；Q2 改变所有新项目的初始配置；Q3 可能改变 `test-cmd`、`cas` 等既有键的值语义。当前目标态因此不唯一，AI 无法从需求推导出唯一实现。

**风险**

不同实现可能分别：

- 给或不给 `check` 增加 flag
- 让新项目显式持有默认值，或继续依赖内置默认
- 只处理 `id-pattern`，或全局改变所有配置值

这些实现都可声称满足当前文本，却具有不同的兼容性和文档结果。

**建议修复**

在最终需求中关闭三个问题。建议明确采用：

- `check` 本 change 不增加 `--id-pattern`
- `templates/process-config.md` 预置 `id-pattern`，值为内置默认
- 共享 `parseConfig` 按 Markdown 单元格规则识别 `\|`，对所有键统一返回反转义后的值；同步更新 config-contract KB/spec，并增加非 `id-pattern` 键的兼容性测试

### REQ-2：非法 pattern 在 `doctor` 上的目标结果自相矛盾

**描述**

目标 4 规定非法正则在消费时“报错并 exit 2”；目标 3 又规定 `doctor` 应“给出诊断而非崩溃”。现有 `doctor` 契约中，可诊断的配置问题通常形成 `finding`，正常总退出码为 1；exit 2 表示 `UNUSABLE`。

需求没有说明 D6 的非法 `id-pattern` 应是：

- D6 `finding`、总 exit 1
- `UNUSABLE`、总 exit 2
- D6 `finding` 但强制总 exit 2

也没有说明 `runDoctor()` 的结构化返回内容。

**风险**

实现可能破坏既有 `doctor` 的 `HEALTHY/FINDINGS/UNUSABLE` 分类，或者为满足 exit 2 绕过 D6 诊断；对应 AC3 也无法确定预期。

**建议修复**

增加逐消费面的错误矩阵。建议规定：

- `verify`：非法有效来源 → `ERROR`，exit 2
- `gate`：非法有效来源 → `ERROR`，exit 2
- `check`：非法配置来源 → `RESULT: ERROR`，exit 2
- `doctor`：D6 产生一个点名 `process-config` 的 `finding`，不扫描场景、不抛异常；若无其他 unusable 条件，总结果为 `FINDINGS`、exit 1
- CLI flag 存在时不读取或校验被覆盖的配置值
- `runGate()`、`runDoctor()` 等库入口必须返回既有结构化错误结果，不让 `RegExp` 构造异常逃逸

同时将 AC3 按该矩阵拆分。

## 维度 2：边界与异常路径是否覆盖

结论：不通过。存在 2 个计入 verdict 的问题。

### REQ-3：未定义冲突、空值、不可读配置等输入边界

**描述**

需求覆盖了缺失配置和语法非法的正则，但没有定义：

- 同一 `id-pattern` 出现两个不同值
- 同值重复
- 空单元格或只有空白的值
- `process-config.md` 是目录、不可读文件或读取失败
- 有效 flag 与冲突/非法配置同时存在时，是否仍检查配置
- `\|` 之外的反斜杠是否逐字保留

当前 config-contract 已规定“同值重复容忍、异值冲突在消费时上浮”，`lib/config.js` 也实现了该模型；但新键没有声明是否继承这一契约。读取失败目前还可能直接抛异常。

**风险**

坏配置可能被当作键缺失而静默回退默认，或导致未捕获异常。不同命令也可能对同一配置给出不同结果。

**建议修复**

声明 `id-pattern` 完整继承 config-contract：

- 同值重复合法
- 异值重复为配置冲突，不选择其中任一值
- 文件存在但非普通可读文件时，按 REQ-2 的消费面矩阵处理
- flag 优先时，被覆盖的配置键不消费、不报错
- 除 Markdown 的 `\|` 外，其余反斜杠逐字保留给 `RegExp`
- 添加缺失、重复、冲突、空值、不可读、flag 覆盖坏配置测试

### REQ-4：四消费点的“识别同一 ID”边界语义未统一

**描述**

需求统一了 pattern 来源优先级，但没有统一 pattern 的应用方式。当前代码并非完全等价：

- `verify`、`gate`、`doctor` 经 `leadId()` 判断开头匹配，并拒绝后继 `[A-Za-z0-9_]`
- `checkScenarioIds()` 使用 `new RegExp('^(' + idPattern + ')\\b')`

对于以非 word 字符结尾的合法自定义 pattern、带锚点或复杂 alternation 的 source，两套边界判断可能产生不同结果。“JS 正则源串”也未说明调用方是否应提供 `^`、是否允许自行提供尾边界。

**风险**

同一配置可能使 `verify`/`doctor` 识别场景，却被 `check` 拒绝；“一处声明、处处生效”无法成立。AC1 的示例 pattern 不足以发现该分歧。

**建议修复**

定义唯一的识别契约并由四处复用。建议：

- 配置值是裸 source，不要求且不自动保存定界符或 flags
- 工具负责要求匹配从标题开头开始
- 匹配后一个字符若属于 `[A-Za-z0-9_]`，则拒绝截断匹配
- 不额外拼接 `\b`
- `check` 复用 `leadId()` 或共享的 pattern 编译/识别函数
- 增加字母后缀、多段式、紧邻 `_`、紧邻字母数字、非 word 结尾、自带锚点和 alternation 的一致性测试

并明确 malformed pattern 必须在读取任何 specs 或启动 test command 前失败，避免错误输入触发不必要的外部进程。

## 维度 3：是否存在“暗示但未声明”的状态变化或副作用

结论：通过；无计入 verdict 的独立问题。

本 change 的四个消费面原则上仍是只读的；`verify`/`gate`/`doctor` 既有 test command 副作用不因本需求扩大。没有新增持久状态、并发共享状态或写入回滚需求。

但 REQ-1 中两个选择会产生需要显式声明的兼容性影响：

- 修改模板会改变此后 `apriori init` 创建的新项目内容
- 在共享 `parseConfig` 中全局反转义 `\|` 会改变其他配置键的解析结果

在 Q2/Q3 收口时，应把这些影响写进目标态和回归测试。

## 维度 4：每条验收标准是否可测试

结论：不通过。存在 1 个计入 verdict 的问题。

### REQ-5：AC1、AC4、AC6 尚不能转换成确定的 if/then oracle

**描述**

- AC1 用“四消费点零 UNIDENTIFIED/零 CK-04 误报”概括结果，但 `check` 不输出 `UNIDENTIFIED`，`doctor` 使用 D6 状态，`gate` 还依赖可运行的 TAP test command；各面的具体 oracle 未定义。
- AC4 的“行为与现版本完全一致”范围无限，“254 存量测试全绿”只是当前测试数量，不是稳定的产品行为断言。
- AC6 允许“flag 或配置行副本环境”二选一，且“仅剩真实缺口”没有给出确定计数或完整预期输出；外部样本也不是仓库内可重复的自动化 fixture。
- AC3 未解决 REQ-2 的 `doctor` 退出码冲突。
- AC7 的“README 若涉及”无法客观判定是否完成。

**风险**

实现可以仅跑现有测试或选择较容易的 AC6 路径而宣布通过；测试数量变化还会让无行为回归的实现产生伪失败。

**建议修复**

把 AC 拆成确定的 if/then：

- 对每个命令分别给定同一最小 specs/TAP fixture、命令参数、退出码和关键输出/JSON 字段
- AC4 改为“无 flag、配置键缺失时，使用 `DEFAULT_ID`；列出的既有默认-pattern fixture 结果与基线一致”，全量测试仅作为回归要求，不固定数量
- AC6 明确 flag 路径和配置路径都必须验证；记录样本版本、命令、退出码以及 `unid
75,680
entified`、`unbound` 的确切预期值
- AC7 明确必改文件清单；不涉及的文件直接排除，不使用“若涉及”

## 维度 5：是否与 state A 冲突

结论：不通过。存在 1 个计入 verdict 的问题。

### REQ-6：未声明新错误在既有文本/JSON 契约中的表现

**描述**

state A 对 `gate --json` 要求所有结果类别输出纯 JSON；`verify` 也有既有 JSON 报告结构和 infra ERROR 分类。需求只要求错误消息包含 `"--id-pattern"` 或 `"process-config"`，没有说明：

- `--json` 下消息进入哪个字段
- stdout 是否仍为纯 JSON
- stderr 是否必须为空
- `gate` 是否保留 `{result:"ERROR", errors:[...]}` 形状
- 非 JSON 模式的前缀和结果行是什么

如果实现直接捕获 `new RegExp()` 异常并 `console.error()`，很容易破坏 gate 的既有纯 JSON 契约。

**风险**

机器消费者可能无法解析输出；同一非法 pattern 在文本模式和 JSON 模式下可能属于不同错误类别。

**建议修复**

声明新错误继承各命令现有错误契约：

- `gate --json`：stdout 仅输出既有 gate JSON shape，`result:"ERROR"`、exit 2，`errors[]` 中点名来源
- `verify --json`：输出既有 verify ERROR shape、exit 2，错误进入 `errors[]`
- 文本模式按各命令现有错误前缀输出
- `check` 若仍无 JSON，只需固定 `RESULT: ERROR` 和 exit 2
- `doctor --json` 按 REQ-2 的决定输出稳定的 D6 check entry

## 维度 6：target lineage 是否声明且符合仓库现实

结论：通过。

需求明确声明 `target lineage: main（v4 产品线；不合并 v1/v3）`。仓库 `.git/HEAD` 指向 `refs/heads/main`，`package.json` 为 `4.0.7`，CHANGELOG 也说明 v4 已成为 `main` 主线，因此 lineage 与仓库现实一致。

## Advisories（不计入 verdict）

### ADV-1：显式 won't-do 已存在

需求包含“范围外（won't do）”章节，并列出了 verify scope、MODIFIED 完整性、hotfix、ID 书写规则、非 JS 生态和其他配置键行为等非目标。形式要求已满足。

### ADV-2：并发、超时和回滚不构成本 change 的新增边界

本 change 不写文件、不持久化状态，也没有新增并发状态，因此 rollback 和并发竞争不适用。test command 的同步执行、signal 和失败分类属于现有 `spec-runner`/`doctor` 契约；建议在最终需求注明“保持现状”，避免实现者误加新的 timeout 或重试语义。

### ADV-3：文档清单应包含配置格式说明

除 AC7 已列文件外，建议明确更新配置契约文档，说明：

- 值是不带定界符和 flags 的 JS regex source
- Markdown 中 literal pipe 写作 `\|`
- 默认值与优先级
- 配置冲突和非法值的消费时错误语义

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | Q1–Q3 未收口，导致 `check` CLI、模板默认内容及 `parseConfig` 的全键语义不唯一。 | AI 可产出多个互不兼容但均看似满足需求的实现。 | STEP0·r1 | open |
| REQ-2 | 非法 `id-pattern` 在 `doctor` 上应 exit 2 还是形成 D6 finding/exit 1 未定义，库入口异常形状也未声明。 | 可能破坏 doctor 的 FINDINGS/UNUSABLE 契约或让异常逃逸。 | STEP0·r1 | open |
| REQ-3 | 冲突行、同值重复、空值、不可读/错误类型配置及 flag 覆盖坏配置的边界语义缺失。 | 坏配置可能静默回退、跨命令结果不一致或直接崩溃。 | STEP0·r1 | open |
| REQ-4 | 四消费点只统一了来源优先级，未统一 pattern 的开头匹配和尾边界语义。 | 同一 `id-pattern` 可能被 verify/doctor 接受而被 check 拒绝。 | STEP0·r1 | open |
| REQ-5 | AC1、AC4、AC6 和 AC7 含不稳定、可选或无确定 oracle 的表述。 | 无法据此生成唯一、可重复的验收测试。 | STEP0·r1 | open |
| REQ-6 | 新 pattern 错误在既有文本和 `--json` 契约中的输出形状未声明。 | 可能破坏 gate/verify 的机器可解析接口。 | STEP0·r1 | open |

VERDICT: 6 issues open
