# spec-review-v1 — gate-id-pattern

## 正式问题

### SPEC-1：`[|]` 无法原样写入 Markdown 表格单元格

**描述**

`parseConfig` 规定每个未被奇数个反斜杠转义的 `|` 都是单元格分隔符。因此配置中原样写：

```text
| id-pattern | [|] |
```

实际解析值会在字符类内部被截断为 `[`，而不是 `[|]`。requirement B5/B6、CF-12 和 design G6 却都宣称 `[|]` 在单元格内“不需转义”，设计给出的模板行也会被其中的 `[|]` 破坏列结构。

能够得到最终 regex source `[|]` 的 Markdown 原文应是 `[\|]`：反斜杠属于 Markdown/config 层，解析后才得到 regex 层的 `[|]`。

**风险**

文档指导用户写出非法或被截断的 pattern；模板表格本身也会畸变。AC5 的 literal-pipe 用例无法按当前 oracle 实现，必然造成返工。

**建议**

修订 requirement、config delta spec、design、模板文案和 AC：

- Markdown 单元格原文：`[\|]`
- `parseConfig` 输出：`[|]`
- `RegExp` 行为：匹配 literal `|`
- 模板描述单元格里的示例本身也必须转义其 pipe
- 增加端到端解析断言，不能只 grep 文案

### SPEC-2：仅执行 `new RegExp(source)` 不能防止 ReDoS

**描述**

`--id-pattern` 和仓库内 `process-config` 都是外部输入。设计只用 `new RegExp(source)` 检查语法，然后在主线程中反复对 spec title 和 TAP description 执行该表达式。短小但具有灾难性回溯的合法表达式仍可永久占用事件循环。

设计中的错误消息还会原样回显无长度限制、可含控制字符的 source。

**风险**

恶意或误写的 pattern 可挂死 `verify`、`gate`、`check`、`doctor` 以及 CI；进程无法进入已定义的 exit-2/D6-finding 错误通道。无界回显还可能造成日志膨胀或终端日志注入。

**建议**

在 spec 和 design 中明确统一安全策略，例如限制为可静态验证的安全 regex 子集，或改用具有线性时间保证/可强制终止的隔离执行方案；仅限制 source 长度不足以解决灾难性回溯。unsafe pattern 应进入既有 origin-aware 错误矩阵。增加恶意 pattern 加长非匹配 title/TAP 的有界完成测试，并对错误中的 source 做长度限制和控制字符转义，或不回显原文。

### SPEC-3：doctor 的设计顺序会在非法 pattern 被发现前运行 test command

**描述**

requirement B3 要求校验发生在启动任何 test command 之前，既有需求评审也明确非法 pattern 不运行命令。当前 `runDoctor` 的 D5 在 D6 之前执行；design G5 仅在 D6 内调用 `resolveIdPattern`，tasks T10 也只描述修改 D6。

按当前设计实现时，非法 `id-pattern` 仍会先触发 D5 的外部命令副作用，之后才产生 D6 finding。

**风险**

违反明确的前置校验和副作用契约；错误配置下仍可能执行耗时、写文件或访问外部系统的项目命令，并导致实现完成后返工调整控制流。

**建议**

在进入 D5 前解析并校验 D6 pattern，缓存结果供 D6 使用。若 pattern 无效，必须定义 D5 的确定状态和 detail，并跳过命令。DR-17 应加入带 sentinel test command 的断言，证明命令未执行。

### SPEC-4：verify 的早退设计未保持 `--change --json` 的 projection 契约

**描述**

现有 SR-23 和 truth/spec-runner 规定每个 `--change` JSON run 都携带 `projection`，其中 `modules` 是已发现的 delta suffix。design G2 要求在 `verify()` 开头解析 pattern，并在错误时直接返回 errors-run；此时尚未执行 delta discovery，设计也未声明如何构造 `projection`。

SR-52 只笼统要求“existing ERROR shape”，没有明确断言这一既有字段及其 modules 内容。

**风险**

invalid pattern 会成为一种破坏既有机器 JSON shape 的新 ERROR 类，可能使消费 `projection` 的 CI/自动化崩溃；实现者也会在“先校验”与“先发现 modules”之间被迫自行选择。

**建议**

明确保持 SR-23。可先执行只枚举路径、不读取 spec 内容的 `discoverDeltas`，形成 projection metadata，再校验 pattern；仍须保证在读取 delta/store 内容和启动测试前拒绝。SR-52 增加 `--change --json` 的精确 projection 断言。若确实要改变契约，则必须显式修改 base spec、truth 和兼容性说明。

### SPEC-5：设计把“flag 存在”错误实现为“flag 值 truthy”

**描述**

B2 规定 flag 一旦存在就不得消费配置键；非法 pattern 又被严格定义为 `new RegExp(source)` 抛错。空字符串可由 strict argv parser 作为值传入，并且 `new RegExp('')` 合法。

design G2/G3 却分别使用：

```js
f['--id-pattern'] || null
```

因此 `--id-pattern ''` 被当成未提供，转而消费 config/default；若配置非法，还会错误报告 `process-config`。

**风险**

优先级和坏配置屏蔽契约在合法边界输入上失效，verify/gate 可能产生错误来源和错误 exit class，且现有场景不会捕获。

**建议**

使用 presence/nullish 判断而非 truthiness，并为 verify/gate 增加“空 flag + 非法配置”场景。若产品不允许空 pattern，应把空值明确列为 flag-origin validation error，但仍不得回退消费配置。

## 外部共享状态

未发现新增的持久化外部共享状态。既有 test command 是唯一相关副作用，其前置校验顺序缺口已记录为 SPEC-3。

## Advisories

无。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SPEC-1 | `[|]` 含未转义的表格分隔符，无法按文档原样写入 process-config；模板与 literal-pipe AC 不可实现。 | high | STEP2·r1 | open |
| SPEC-2 | 合法但灾难性回溯的外部 regex 可阻塞四个命令；设计只有语法校验，没有 ReDoS 边界。 | high | STEP2·r1 | open |
| SPEC-3 | doctor 在 D6 校验非法 id-pattern 前执行 D5 test command，违反前置校验和无副作用错误路径。 | high | STEP2·r1 | open |
| SPEC-4 | verify 的 pattern 早退路径未定义如何保持 `--change --json` 的 projection/modules 既有契约。 | med | STEP2·r1 | open |
| SPEC-5 | verify/gate 用 `|| null` 丢失空字符串 flag 的存在性，错误消费被覆盖配置。 | med | STEP2·r1 | open |

VERDICT: 5 issues open
