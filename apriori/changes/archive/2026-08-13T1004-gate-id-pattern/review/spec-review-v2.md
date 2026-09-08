# spec-review-v2 — gate-id-pattern

## 复核结论

Round 2 中，SPEC-3、SPEC-4 已完整关闭；SPEC-1、SPEC-2、SPEC-5 仍存在未闭合缺口，另发现一项新的错误回显问题 SPEC-6。

## 正式问题

### SPEC-1：精确模板行仍包含未转义的 `[|]`

**描述**

config delta 已正确规定单元格原文 `[\|]` 解析为 regex source `[|]`，CF-12 也升级成了端到端解析断言。

但 design G6 给出的精确模板行仍包含：

```text
parsing to [|]
```

这个 `[|]` 位于表格说明单元格内，其中的 pipe 没有转义，会再次被 `splitCells` 当作列分隔符。也就是说，若实现者逐字采用设计给出的模板行，CF-12 会失败，表格结构仍会损坏。

**风险**

SPEC-1 的核心错误仍存在于设计的可执行模板文本中，将直接造成 STEP5 返工。

**建议**

设计中的最终模板原文也必须把该 pipe 写成 `[\|]`，使说明单元格解析后的文本才是 `[|]`；或者避免在该表格单元格中直接书写含 pipe 的解析结果。对模板整行执行 CF-12 的结构和值断言。

### SPEC-2：不接受 ReDoS rejection；`test-cmd` 并未消除新增攻击面

**描述**

“能写 `id-pattern` 者必能写 `test-cmd`，所以 ReDoS 防护不增加防御面”的论证不适用于所有消费路径：

- `apriori check` 自动消费 config `id-pattern`，但从不读取或执行 `test-cmd`。
- `verify` 和 `gate` 可由 CI 显式传入受控的 `--test-cmd`，同时仍自动消费仓库中的 config `id-pattern`。
- PR 作者能够提交 config 变更，不等于其提交的任意 shell command 已获授权执行；CI 正是在代码获批前处理这些仓库输入。
- 即使排除恶意作者，误写的灾难性回溯表达式同样能无限阻塞主线程。

因此，现有任意命令执行风险不能抵消这个 change 新增的自动 regex 执行面。尤其是 `check`，此前没有对应的命令执行通道。

**风险**

恶意或误写的合法 regex 可挂死 `check`、CI 以及其他三个命令，无法进入既定 exit/finding 错误路径，属于可用性安全缺口。

**建议**

至少对 config 来源采取有界执行策略。可选方案包括：

- 将支持语法收窄为满足 ID 用途且可静态验证的 regex 子集；
- 在可强制终止的隔离执行环境中匹配并设置预算；
- 若 flag 被认定为可信交互输入，可区别处理 flag 与 config，但必须明确两者不同的安全契约。

增加灾难性回溯 pattern 配合长非匹配标题/TAP 文本的有界完成测试。

### SPEC-5：gate 的空 flag 行为仍没有 scenario 覆盖

**描述**

spec requirement 和 design 已正确改为按 presence 判断，且 `args.js` 的 flags 对象能够区分缺失属性与值为 `''` 的属性。

但 GT-24 只覆盖“uncompilable、非空 flag”和非法 config，没有覆盖空字符串 flag；tasks T5 也只要求 GT-22..24。SR-52 只保护 verify。

因此 gate 若仍错误实现为：

```js
f['--id-pattern'] || null
```

现有全部 gate scenarios 仍可能通过，空 flag 则继续回退到 config。

**风险**

原问题可能在 gate 入口原样漏过测试，导致 flag 优先级和错误来源在生产中不一致。

**建议**

扩充 GT-24，至少覆盖：

- `gate --id-pattern ''` → flag-origin ERROR；
- 同时存在非法 config 时仍报告 `empty --id-pattern`，证明 config 未被消费；
- text 和 `--json` 均保持 gate 的既有 ERROR shape。

tasks T5 同步明确该用例。

### SPEC-6：`RegExp` 的原始异常消息绕过 bounded echo

**描述**

设计当前构造错误消息的方式为：

```js
`invalid --id-pattern '${boundedSource(flagValue)}': ${e.message}`
```

Node 的 `RegExp` `SyntaxError.message` 自身会包含未经处理的完整 regex source。因此，即使第一段使用了 `boundedSource`，后面的 `e.message` 仍会重新输出完整 source，并保留其中的换行等控制字符。config 来源的错误路径存在同样问题。

此外，当前 `boundedSource` 先取 80 字符再追加 `…`，输出上限实际是 81 字符，与“最多 80 字符”不一致。

**风险**

已承诺的日志膨胀和终端注入防护实际无效；长或带控制字符的非法 source 仍可污染 text/JSON 日志。

**建议**

不要直接拼接原始 `e.message`。应对整个异常原因做统一净化和总长度限制，或输出不含 source 的稳定错误类别。测试同时覆盖 flag/config 两条路径，并断言：

- 完整输出不含原始控制字符；
- 原始 source 不会通过 `e.message` 再次泄漏；
- 约定的 80 字符上限计算包含 ellipsis。

## 已验证关闭

### SPEC-3：verified

设计已将 `resolveIdPattern` 提前到 D5 前，非法配置时 D5 使用确定的 `n/a` detail，D6 形成 finding，并由 DR-17 的 sentinel 断言证明 test command 不会启动。副作用顺序已完整闭合。

### SPEC-4：verified

设计明确在 invalid-pattern `--change` 路径通过 enumeration-only `discoverDeltas` 保留 `projection.modules`，不读取 spec 内容、不启动 test command；SR-52 同时断言 `--change --json` 的既有 projection 契约。与 SR-23 一致。

## 外部共享状态

未引入新的持久化外部共享状态。test command 的副作用顺序已由 SPEC-3 修订覆盖。

## Advisories

- `req-final.md` 的 B5、B6、AC5、AC7 正文仍保留旧的“单元格写 `[|]`”表述，只有末尾 STEP2 amendments 覆盖它。虽然 amendments 已声明 delta spec 为准，不再形成独立契约歧义，但建议在进入执行前把修正折叠回正文，避免实现者或文档维护者只读取 canonical sections。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SPEC-1 | `[|]` 含未转义的表格分隔符，无法按文档原样写入 process-config；模板与 literal-pipe AC 不可实现。 | high | STEP2·r1 | open — reopened in spec-review-v2：design G6 的精确模板行仍含未转义 `[|]` |
| SPEC-2 | 合法但灾难性回溯的外部 regex 可阻塞四个命令；设计只有语法校验，没有 ReDoS 边界。 | high | STEP2·r1 | open — rejection not concurred：`check` 不执行 test-cmd，显式 `--test-cmd` 也不能屏蔽 config regex，新增攻击面真实存在 |
| SPEC-3 | doctor 在 D6 校验非法 id-pattern 前执行 D5 test command，违反前置校验和无副作用错误路径。 | high | STEP2·r1 | verified |
| SPEC-4 | verify 的 pattern 早退路径未定义如何保持 `--change --json` 的 projection/modules 既有契约。 | med | STEP2·r1 | verified |
| SPEC-5 | verify/gate 用 `|| null` 丢失空字符串 flag 的存在性，错误消费被覆盖配置。 | med | STEP2·r1 | open — reopened in spec-review-v2：verify 已有 scenario，但 gate 空 flag 路径仍无 scenario |
| SPEC-6 | bounded source 后仍直接拼接包含完整 regex source 的 `RegExp` 异常消息，长度和控制字符防护被绕过。 | med | STEP2·r2 | open |
| SPEC-ADV-1 | Advisory batch acknowledged (1 item: 将 STEP2 amendments 折叠回 req-final canonical sections，消除旧 `[|]` 表述残留)。 | — | STEP2·r2 | advisory-acked |

VERDICT: 4 issues open
