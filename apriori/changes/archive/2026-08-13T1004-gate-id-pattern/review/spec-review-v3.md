# spec-review-v3 — gate-id-pattern

## 复核结论

SPEC-1、SPEC-5 已完整关闭。SPEC-2 的新方案仍不能构成所声明的 ReDoS 边界；SPEC-6 因设计保留旧实现样例而未闭合。另发现 child probe 执行边界和 64-char 兼容性两项正式问题。

## 正式问题

### SPEC-2：固定 probe battery 可被同一仓库输入轻易规避

**描述**

config pattern 和 spec title 都是同一 PR 可控制的仓库输入。固定 battery 只能识别恰好在预设字符分布上回溯的表达式。例如 battery 若重点覆盖重复 `a`、`A`、`0`、`-`，攻击者可以选择其他字符、字符类、Unicode 或特定前后文，使 pattern 在 battery 上快速完成，却在其同时提交的 64-char scenario title 上灾难性回溯。

设计已经承认“针对真实标题定制的 pattern+title”仍可阻塞；这不是低概率残余，而是当前威胁模型下可直接构造的绕过。64-char 上限也不足以约束指数回溯。

**风险**

恶意或误写配置仍可挂死 `check` 和 CI。命令无法进入既定 error/finding 通道，SPEC-2 的生产事故风险没有被真正关闭。

**建议**

固定 battery 只能标为 defense-in-depth，不能作为 config 安全验收边界。需要选择可判定方案：

- 限制 config pattern 为可静态验证的安全子集；或
- 对每次实际匹配使用可终止的隔离执行；或
- 明确撤回“自动仓库输入受到 ReDoS 防护”的承诺，并由 human waiver 接受 CI hang 风险。

测试必须使用攻击者同时控制 pattern 与真实 scenario/TAP description 的组合，而不只测试 `(a+)+$` 对固定 battery。

### SPEC-6：设计的主实现样例仍直接拼接原始 `e.message`

**描述**

design 的 `resolveIdPattern` 代码块仍写着：

```js
`${e.message}`
```

并继续使用旧的 `boundedSource`。后面的“安全契约”才要求不拼接 `e.message`、整条消息经 `sanitizeMsg` 且总长不超过 200。

这两段是相互冲突的实现指令；前者还是实现者最可能直接复制的具体代码。

**风险**

STEP5 可能按主代码块实现旧漏洞，使原始 regex source 通过 engine message 再次泄漏，SR-52 到实现阶段才暴露冲突并造成返工。

**建议**

直接重写主代码块，展示唯一的 `sanitizeMsg` 路径，完全移除 `e.message` 和旧的 81-char `boundedSource` 实现。代码样例、spec 和测试必须使用同一长度定义。

### SPEC-7：child probe 的输入传递和失败分类未定义

**描述**

设计只规定 `spawnSync(node -e)`、timeout 和 `SIGKILL`，没有规定外部 pattern 如何进入 child。若把 source 插值进 `-e` 脚本，会引入 JavaScript 注入面；若作为未隔离的 argv 传递，前导 dash、超长 source 和平台参数限制仍需处理。

除 timeout 外，下列结果也没有契约：

- spawn error；
- child signal/crash；
- non-zero exit；
- malformed child output；
- source 过大导致 `E2BIG`/资源错误。

check、gate、doctor 的 scenarios 也只覆盖 compile error，没有覆盖 probe rejection 各自应进入的 exit-2/D6-finding 路径。

**风险**

为修复 ReDoS 新增的 child process 自身可能形成代码注入或异常逃逸，并使四个消费点对 probe failure 给出不同结果。

**建议**

设计一个精确协议：

- 固定、不可由 source 拼接生成的 child script；
- `shell:false`；
- source 通过有界 stdin 或其他明确的数据通道传递；
- 所有 spawn/signal/non-zero/protocol/timeout 失败均 fail closed，并使用 sanitized config-origin error；
- 为 gate、check、doctor 分别增加 probe-failure scenario，验证其既有错误矩阵及 doctor 的 D5 sentinel。

### SPEC-8：64-char cap 是未兼容设计的公共识别语义变更

**描述**

现有 `leadId` 公共接口和 SR-08 允许任意裸 JS regex source；req-final 的范围外还明确声明“不改变 `leadId` 边界规则”。新设计却只把 title/TAP description 的前 64 字符交给 regex，并把更长 ID 排除出契约。

这不仅限制 ID 长度，也会改变依赖 64 字符以后 lookahead/context 的合法 pattern。当前没有 scenario 定义：

- 64 与 65 的边界；
- cap 在 trim、TAP escape decoding 前还是后应用；
- JS code units 还是 Unicode code points；
- spec、TAP、check、doctor 在边界上的一致性；
- 对既有 `leadId(text, idRe)` 库调用方的兼容性。

CHANGELOG 设计也未包含这项 breaking behavior。

**风险**

实现者会产生不同切片语义，既有自定义 pattern 可能静默变为 UNIDENTIFIED/ORPHAN；这会破坏明确的范围和公共 API，并导致实现或发布阶段返工。

**建议**

优先移除该 cap，因为它不能解决 SPEC-2。若保留，则必须显式扩大范围并同步修改 base spec、truth、docs、CHANGELOG 和公共 API 契约，增加 64/65 边界及四消费点一致性 scenarios。

## 已验证关闭

### SPEC-1：verified

模板表格单元格已改为 pipe-free prose，转义指南移至 `parseConfig` 明确忽略的相邻 HTML comment；CF-12 对整表结构和解析后的默认值执行端到端断言。此前的不可表达问题已关闭。

### SPEC-5：verified

GT-24 已覆盖 present-but-empty flag，并同时覆盖有效或无效 config，明确证明 gate 按 presence 判断且不回退消费配置。

SPEC-3、SPEC-4 保持 verified。

## 外部共享状态

没有新增持久化外部共享状态。新增 child process 是短生命周期执行边界，其启动、终止和异常分类缺口记录为 SPEC-7。

## Advisories

无新增 advisory。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SPEC-1 | `[|]` 含未转义的表格分隔符，无法按文档原样写入 process-config；模板与 literal-pipe AC 不可实现。 | high | STEP2·r1 | verified |
| SPEC-2 | 合法但灾难性回溯的外部 regex 可阻塞四个命令；设计只有语法校验，没有 ReDoS 边界。 | high | STEP2·r1 | open — reopened in spec-review-v3：固定 battery 可被同一仓库控制的 pattern+title 组合直接规避 |
| SPEC-3 | doctor 在 D6 校验非法 id-pattern 前执行 D5 test command，违反前置校验和无副作用错误路径。 | high | STEP2·r1 | verified |
| SPEC-4 | verify 的 pattern 早退路径未定义如何保持 `--change --json` 的 projection/modules 既有契约。 | med | STEP2·r1 | verified |
| SPEC-5 | verify/gate 用 `\|\| null` 丢失空字符串 flag 的存在性，错误消费被覆盖配置。 | med | STEP2·r1 | verified |
| SPEC-6 | 错误消息拼接原始 `e.message` 会二次泄漏未净化 source；boundedSource 实际上限 81 字符。 | med | STEP2·r2 | open — reopened in spec-review-v3：design 主代码块仍保留旧实现 |
| SPEC-7 | config regex child probe 未定义安全的数据传递协议及 spawn/signal/non-zero/protocol 失败矩阵。 | high | STEP2·r3 | open |
| SPEC-8 | 新增 64-char 识别 cap 破坏既有 `leadId`/自定义 pattern 契约，并与明确范围外条款冲突。 | high | STEP2·r3 | open |

VERDICT: 4 issues open
