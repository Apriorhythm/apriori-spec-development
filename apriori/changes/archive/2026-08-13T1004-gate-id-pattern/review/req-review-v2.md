# req-v2 需求复评（第 2 轮）

评审基线：

- 需求：`apriori/changes/gate-id-pattern/requirement/req-v2.md`
- 台账：`apriori/changes/gate-id-pattern/review/issues.md`
- 同第 1 轮知识库及 `lib/` 实现
- lineage：`main` / v4

## 维度 1：目标态 B 是否清晰且无歧义

结论：基本通过；REQ-1、REQ-2 已关闭。发现 1 个新的正式问题 REQ-7。

### REQ-1：已验证关闭

v2 已对三个开放问题作出唯一裁定：

- `check` 不增加 `--id-pattern`
- 模板预置默认 `id-pattern` 行
- 共享 `parseConfig` 对所有键统一处理 `\|`

这些决定已落实在 B5、B6、范围外和 AC5 中，不再存在多个同样合规的公共接口方案。

### REQ-2：已验证关闭

B3 给出了逐命令错误矩阵，并明确：

- `verify`、`gate`、`check`：exit 2
- `doctor`：D6 `finding`，通常 exit 1
- `RegExp` 异常不得逃逸库入口
- 不运行 test command
- 文本及 JSON 输出继承既有契约

目标结果已唯一且符合各命令现有职责。

### REQ-7：连续反斜杠与 pipe 的解析语义仍不唯一

**描述**

B5 明确单个 `\|` 表示单元格内的字面 pipe，并在返回值中反转义为 `|`；同时要求其他反斜杠逐字保留。但没有规定 pipe 前出现连续反斜杠时采用什么规则，例如原始单元格中的：

- `\\|`
- `\\\|`
- `\\\\|`

实现可以采用“只看 pipe 前一个字符”“奇偶反斜杠”“扫描时消费 escape”等不同算法，得到不同的单元格边界和值。

这不只是理论情况。JS regex source 可能需要表达：

- alternation pipe
- literal pipe，即最终 source 中的 `\|`
- literal backslash 后再接 alternation

当前文本只证明 alternation 可表达，没有说明如何在配置中表达最终 regex source 的 literal pipe。

**风险**

不同 AI 实现会对同一个配置文件产生不同的 cell 切分或 regex source。全键启用该规则后，含反斜杠的 `test-cmd` 等其他键也可能被截断或改变。

**建议修复**

定义逐字符解析算法及奇偶规则，并给出输入到输出的真值表。建议采用：

- pipe 前连续反斜杠数量为奇数：最后一个反斜杠转义 pipe；移除该转义反斜杠，pipe 进入值
- 数量为偶数：pipe 是单元格分隔符；反斜杠全部逐字保留
- 其他反斜杠序列不做反转义

如果需要让 regex source 表达 literal pipe，应给出规范配置写法及预期返回 source。AC5 至少增加单反斜杠、双反斜杠、三反斜杠和最终 literal-pipe 四个边界用例。

## 维度 2：边界与异常路径是否覆盖

结论：除 REQ-7 外通过。

### REQ-3：已验证关闭

v2 已明确：

- 同值重复容忍
- 异值重复为 `CONFLICT`
- 空单元格继承共享解析器现状，视为键不存在
- 配置文件为目录、不可读或读取失败时由 `getConfig` 返回 problem
- flag 存在时不消费被覆盖的配置
- 配置问题在消费时上浮

虽然“空值等同键缺失”不是最严格的选择，但它已被明确声明，并要求测试；因此属于产品决策，不再是需求歧义。

超时、重试、并发和 rollback 均明确保持现状。本 change 只读，没有新增持久状态或失败回滚路径。

### 新边界缺口

REQ-7 所述连续反斜杠规则仍缺失，影响 Markdown cell 边界与最终配置值，因此计入本维度。

## 维度 3：是否存在暗示但未声明的状态变化或副作用

结论：通过。

v2 已显式声明：

- `process-config.md` 为 human-held，CLI 只读
- 模板变化影响新建项目
- `\|` 是 config-contract 的全键语义扩展
- 需要同步 spec、KB 和 CHANGELOG
- 验证必须在读取 spec、启动 test command 前失败
- 不引入 timeout、retry 或 concurrency 行为

没有未声明的文件写入、共享状态或 rollback 行为。

## 维度 4：每条验收标准是否可测试

结论：除 REQ-7 对应测试缺口外通过。

### REQ-5：已验证关闭

v2 已将验收条件改写为可执行 oracle：

- AC1 分别声明四个消费点的结果
- AC2 覆盖 flag 优先及坏配置被覆盖
- AC3 给出逐命令退出码、消息及 JSON 结果
- AC4 不再固定测试总数
- AC6 要求 flag/config 双路径都验证
- AC7 给出穷尽文件清单，并明确 README/RUNBOOK 不改

AC6 的关键通过条件是 `unidentified=0`，剩余 `unbound` 要求记录确切实测值，因而仍可执行。样本环境的长期可复现性较弱，列为 advisory，不作为重新打开 REQ-5 的理由。

AC5 对单个 `\|` 有确定 oracle，但尚未覆盖 REQ-7 的连续反斜杠边界；补充相应真值表后即可完整测试。

## 维度 5：是否与 state A 冲突

结论：通过。

### REQ-4：已验证关闭

B4 明确统一采用 `leadId` 语义：

- 必须从标题起始匹配
- 后继 `[A-Za-z0-9_]` 时拒绝截断
- 不额外拼接 `\b`
- source 原样编译
- `checkScenarioIds` 改为复用共享识别函数

这准确识别并解决了 state A 中 `check` 与另外三个消费点的差异，没有改变 `leadId` 本身的既有边界规则。

### REQ-6：已验证关闭

B3 已明确新错误继承现有接口：

- `verify --json` 使用既有 ERROR shape
- `gate --json` 保持纯 JSON
- 错误进入 `errors[]`
- 文本模式沿用既有命令前缀
- `check` 使用既有 `RESULT: ERROR`
- `doctor` 使用既有 D6 finding/result 模型

因此不会要求实现破坏现有机器接口。

## 维度 6：target lineage 是否声明且符合仓库现实

结论：通过。

v2 保留 `target lineage: main（v4 产品线；不合并 v1/v3）`。这与当前 `main` 分支和 `4.0.7` 产品线一致。

## Advisories（不计入 verdict）

### ADV-1：真实样本应记录不可变身份

AC6 将样本描述为“2026-08-13 现场 git HEAD”，但未记录 commit hash。建议证据文件同时记录：

- `git rev-parse HEAD`
- CLI 版本
- 实际命令
- process-config 差异
- `identified`、`unidentified`、`unbound` 数量

这样后续复核不会依赖一个可移动的工作区状态。

### ADV-2：测试应断言 doctor 的来源 detail

B3 要求合法 D6 detail 显示 `config/default` 来源，但 AC1 只断言 D6 `ok`。建议分别断言配置存在和缺失时的来源文本，防止实现完成识别功能却遗漏诊断可见性。

### ADV-3：共享配置解析变更应有非 regex 回归样本

AC5 已要求 `test-cmd` 的 `\|` 用例。建议同时保留不含 escape 的既有 `test-cmd`、`cas`、多列表格及 fenced/comment 行回归测试，证明全键解析扩展没有改变普通配置。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | Q1–Q3 未收口，导致 `check` CLI、模板默认内容及 `parseConfig` 的全键语义不唯一。 | AI 可产出多个互不兼容但均看似满足需求的实现。 | STEP0·r1 | verified |
| REQ-2 | 非法 `id-pattern` 在 `doctor` 上应 exit 2 还是形成 D6 finding/exit 1 未定义，库入口异常形状也未声明。 | 可能破坏 doctor 的 FINDINGS/UNUSABLE 契约或让异常逃逸。 | STEP0·r1 | verified |
| REQ-3 | 冲突行、同值重复、空值、不可读/错误类型配置及 flag 覆盖坏配置的边界语义缺失。 | 坏配置可能静默回退、跨命令结果不一致或直接崩溃。 | STEP0·r1 | verified |
| REQ-4 | 四消费点只统一了来源优先级，未统一 pattern 的开头匹配和尾边界语义。 | 同一 `id-pattern` 可能被 verify/doctor 接受而被 check 拒绝。 | STEP0·r1 | verified |
| REQ-5 | AC1、AC4、AC6 和 AC7 含不稳定、可选或无确定 oracle 的表述。 | 无法据此生成唯一、可重复的验收测试。 | STEP0·r1 | verified |
| REQ-6 | 新 pattern 错误在既有文本和 `--json` 契约中的输出形状未声明。 | 可能破坏 gate/verify 的机器可解析接口。 | STEP0·r1 | verified |
| REQ-7 | `\|` 全键解析规则未定义 pipe 前连续反斜杠的奇偶语义，也未说明如何表达最终 regex source 中的 literal pipe。 | 不同实现可能产生不同的 cell 边界和配置值，并影响 regex 与 `test-cmd` 等所有键。 | STEP0·r2 | open |

VERDICT: 1 issues open
