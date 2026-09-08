# gate-id-pattern STEP5 一致性评审 v1

## 评审范围与方法

本轮按 delta spec、`design.md`、STEP2 修正案、实现与绑定测试逐项核对。已接受题设给出的 `276/276` 机械绑定结果，不重复执行会写临时文件的测试。

额外只读诊断确认：

- Node `spawnSync` 超时时同时返回 `error.code === 'ETIMEDOUT'` 与 `signal === 'SIGKILL'`。
- 当前 matcher 接受带额外字段的 child 响应，如 `{"ids":["AC-01"],"extra":true}`。

没有发现依赖只读沙箱退化现象的结论。

## 场景语义核对

| Scenario | 结论 | 说明 |
|---|---|---|
| CF-08 | 忠实 | 同时断言单反斜杠和三反斜杠的奇数规则。 |
| CF-09 | 忠实 | 两、四反斜杠均断言 pipe 为分隔符且反斜杠保留。 |
| CF-10 | 忠实 | 覆盖普通键、多列、fence、comment 与 extra-column ignore。 |
| CF-11 | 不完整 | 只调用 `getConfig` 的目录用例，没有覆盖 permission/read-error fail-open，也没有断言四个命令各自的错误契约。见 IMPL-1。 |
| CF-12 | 不完整 | 模板值与单行结构正确，但没有验证整张表的全部键值，也没有证明指南确实位于相邻 HTML comment；AC7 的双语文档断言完全缺失。见 IMPL-7。 |
| SR-50 | 忠实 | 有 config/default 对照，并断言三场景全部识别且结果 GREEN。 |
| SR-51 | 忠实 | 非法配置被有效 flag 屏蔽，是比普通不同值覆盖更强的用例。 |
| SR-52 | 不完整 | 覆盖主要退出码和 marker，但没有注入 spec-read trap；净化只测 flag、输入不含控制字符，且未断言 raw engine message 不泄漏或 text-mode shape。见 IMPL-5。 |
| SR-53 | 忠实 | 无 flag、无配置时验证默认 pattern 保持可绑定。 |
| SR-54 | 不完整 | 确实触发灾难性回溯并阻止 test command，但 15 秒断言不能证明 2 秒 budget，且没有断言 termination 文案；实现实际把 timeout 分类成 `spawn-error`。见 IMPL-2。 |
| SR-55 | 不完整 | 只测试 `matcher.batch` 返回 failure，没有让失败穿过 verify 的 sanitized ERROR channel；也未拒绝带额外字段的成功响应。见 IMPL-3、IMPL-4。 |
| GT-22 | 忠实 | 分别覆盖 in-flight 与 archived C1，并有默认 pattern 的反例。 |
| GT-23 | 忠实 | 无 flag 时配置 pattern 使 C1 pass。 |
| GT-24 | 不完整 | 空 flag 只走 `runGate`，未测试真实 CLI parsing；未覆盖空 flag 屏蔽非法配置及各配置来源的 JSON error shape。见 IMPL-8。 |
| GT-25 | 不完整 | 只调用 `runGate` 并检查 code/message；没有执行 `--json`、验证 pure JSON、`result: ERROR`、净化或 budget。见 IMPL-2、IMPL-8。 |
| CK-13 | 忠实 | 有 default fail 与 config pass 的明确对照。 |
| CK-14 | 不完整 | 测试把 `checkScenarioIds` 与其直接调用的同一个 `leadId` 比较，是同源自证；没有预期 accept/reject oracle，也未经过 verify collection 或 config child 通道。见 IMPL-6。 |
| CK-15 | 忠实 | 断言 exit 2、`RESULT: ERROR` 与 `process-config` 来源。 |
| CK-16 | 不完整 | 触发真实回溯，但 15 秒上限不能证明固定 budget，也不检查 sanitized message；当前 timeout 仍被误分类。见 IMPL-2、IMPL-3。 |
| DR-16 | 忠实 | 分别断言 `config` 与 `default` 来源文本及对应状态。 |
| DR-17 | 不完整 | marker 证明 D5 未运行，但没有注入 scenario-scan trap，也未断言 repair fix。见 IMPL-5。 |
| DR-18 | 不完整 | 断言 finding、D5 skip、marker 与 exit 1，但没有 budget 或 sanitized-message oracle。见 IMPL-2、IMPL-3。 |

## 正式问题

### IMPL-1 — unreadable config 仍存在静默按 absent 处理的路径

`lib/config.js:78` 先调用 `fs.existsSync`，返回 `false` 就直接给出空配置。对于因祖先目录权限而无法 stat 的已存在文件，`existsSync` 会返回 `false`，所以 permission failure 可能静默回退到默认值，违反 CF-11 的“any read error”与 fail-closed 契约。

`test/config.test.js:131-137` 只覆盖 `EISDIR`，且只检查 `getConfig`；没有验证 verify、gate、check、doctor 的消费矩阵。

建议修复：

- 直接尝试 `readFileSync`，仅把确定的 `ENOENT` 视为 absent，其余异常全部形成 `unreadable` problem。
- 通过可注入 I/O primitive 模拟 `EACCES`，避免 root 下 chmod 测试失真。
- 增加四命令矩阵：verify/gate/check exit 2，doctor D6 finding、D5 skipped、exit 1。

### IMPL-2 — timeout 被误分类，termination 保证及其测试不成立

`lib/spec-runner.js:59-62` 先处理 `r.error`，之后才处理 `r.signal`。真实 `spawnSync` timeout 同时带 `ETIMEDOUT` 和 `SIGKILL`，因此当前输出成为 `spawn-error: ... ETIMEDOUT`，而不是 `timeout`/termination。SR-54 明确要求消息命名 termination，design 也把 timeout 列为独立失败类。

现有测试还有以下弱点：

- SR-54、CK-16 只要求小于 15 秒，无法证明固定 2 秒 budget。
- GT-25、DR-18 没有任何 elapsed-time oracle。
- GT-25 没有验证 `--json` pure JSON。
- 各场景没有断言 termination/budget 文案。

建议先识别 `error.code === 'ETIMEDOUT'` 或同时存在的 `SIGKILL`，稳定返回 `timeout`；随后以 `2000ms +` 小幅调度余量断言真实 adversarial case，并用 seam 精确断言 timeout 分类及各消费命令的输出契约。

### IMPL-3 — check 与 doctor 绕过统一净化出口

verify/gate 通过 `matcherFailureMsg` 调用 `sanitizeMsg`，但：

- `lib/check.js:327-330` 直接拼接 `batch.failure`。
- `lib/doctor.js:137-140` 直接拼接 `collected.failure`。
- `lib/doctor.js:147` 在 unidentified detail 中直接回显有效但不受信任的完整 `idp.source`，没有采用 design 要求的 `boundedSource`。

长字符串或控制字符可从 injected spawn error、环境错误或配置 source 进入输出，违反“ANY child failure 使用 config-origin sanitized channel”及 design 的 bounded-source 要求。SR-55 只停留在 matcher 层，未观察消费者最终消息，因此没有捕获该偏差。

建议导出并统一使用一个 config-origin matcher error formatter；doctor 的 source 展示使用 `boundedSource`。用 seam 向 verify、gate、check、doctor 注入含控制字符和超长内容的五类失败，逐个断言来源、长度不超过 200、无控制字符及正确 exit/status。

### IMPL-4 — child success shape 并非严格的 `{ids}`

`lib/spec-runner.js:63-68` 只验证 `parsed.ids` 的类型、长度与元素类型，不拒绝额外字段。因此 `{"ids":["AC-01"],"extra":true}` 被接受为成功，违反 SR-55 和 design 所说的“exactly one JSON document `{ids}`”。

建议要求：

```js
Object.keys(parsed).length === 1 && Object.hasOwn(parsed, 'ids')
```

并增加 extra-field、missing-field、multi-document、长度错误和非法元素测试。

### IMPL-5 — validation-before-I/O 与完整净化保证没有经过对抗注入

SR-52 的测试没有证明：

- invalid pattern 发生后没有读取任何 spec content；
- flag 与 config 两种来源都能清除真实控制字符；
- 完整 raw source 不会经 regex engine message 二次泄漏；
- text mode 仍输出 `error:` 与 `RESULT: ERROR`。

DR-17 也只证明 D5 test command 未运行，没有证明 scenario scan 未发生。

这些是 spec 中的硬保证；按 guarantee-claim discipline，仅从实现顺序推断不算测试成立。

建议通过可注入文件读取与 child-runner seam：

- invalid flag 时让任何 spec read 立即抛错；
- config read 放行、随后任何 spec read 抛错；
- invalid doctor config 下让 child runner 抛错并断言调用次数为零；
- 两个来源都使用含 `NUL`、`DEL`、超长片段的非法 source，断言 text/JSON 最终消息、长度及 raw-source absence；
- 断言 DR-17 的 repair fix。

### IMPL-6 — CK-14 是同实现自证，没有独立语义 oracle

`test/id-pattern.test.js:255-273` 将 `checkScenarioIds` 的结果与 `leadId` 直接比较，而 `checkScenarioIds` 本身就在调用同一个 `leadId`。两边若共同错误，测试仍会通过；测试也没有声明每个 edge case 应当 accept 还是 reject。

这没有忠实证明 CK-14 的“identified/rejected split identical”，也无法防止 verify collection、config child 与 direct helper 接线分叉。

建议为每个 case 增加明确 expected boolean，并让同一表分别经过：

- `checkScenarioIds`;
- `collectScenarios` 或完整 verify JSON；
- config-origin child matcher；
- doctor/check CLI 的共享 fixture。

至少要明确断言 trailing `_` 与 adjacent alphanumeric 被拒绝，其余列出的正例被接受。

### IMPL-7 — design 的文档落点与文档验收未完整实现

design G6 要求 `docs/cli.md` 与 `docs/cli_cn.md` 的 verify、gate、check、doctor 四个命令节及 configuration section 同步说明新语义。当前只有 verify/gate usage 和统一 configuration section发生变化；check、doctor 命令节没有说明它们如何消费配置及其错误行为。

此外：

- CF-12 所称“whole table survives parsing”只断言 `id-pattern` 与 `cas` 两个值。
- 测试没有验证指南位于相邻 HTML comment。
- AC7 要求的 EN/CN 配对措辞、CHANGELOG 条目与 `check --self` 验收没有对应测试。
- `lib/gate.js:285` 的缺少 `--change` 错误 usage 仍未列出 `--id-pattern`，与该文件的正式 `USAGE` 常量不一致。

建议补齐四个命令节；让 gate 所有 usage path 复用同一常量；对模板建立完整 expected-key/value map，并静态验证相邻 comment、双语文档两层 pipe 措辞、CHANGELOG 条目以及 `check --self`。

### IMPL-8 — gate 的新错误矩阵没有经过真实 CLI

GT-24 的空 flag 只调用 `runGate`，绕过 `withStrict` 的 flag-presence parsing；GT-25 也只调用库入口。因而下列硬契约没有被测试：

- CLI 中 present-but-empty flag 不回退；
- empty flag 同时屏蔽非法 config row；
- invalid config 与 terminated child 在 `--json` 下保持 pure JSON；
- JSON `errors[]` 分别命名正确来源；
- 新增错误路径不产生额外 stdout/stderr 污染。

建议用 CLI 表驱动覆盖 invalid flag、empty flag over valid config、empty flag over invalid config、invalid config、terminated config child，并分别断言 exit 2、唯一 JSON document、`result: ERROR` 与来源消息；terminated case 同时复用 IMPL-2 的 termination oracle。

## Advisories

无。本轮列出的事项均直接影响 stated requirements、security boundary 或 hard-guarantee test fidelity，未将其降级为 advisory。

## Ledger delta

新增以下正式行，无既有状态翻转：

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| IMPL-1 | `readConfig` 的 `existsSync` 早退可能把权限导致的不可见配置当作 absent；CF-11 也未覆盖四命令消费矩阵。 | high | STEP5·r1 | open |
| IMPL-2 | timeout 因错误判定顺序被归为 `spawn-error`，termination 文案与固定 budget 未被实现和测试完整证明。 | med | STEP5·r1 | open |
| IMPL-3 | check 与 doctor 直接回显 child failure，doctor 还回显未 bounded 的 config source，绕过统一净化出口。 | high | STEP5·r1 | open |
| IMPL-4 | child response validator 接受 `{ids}` 之外的额外字段，不符合 exact success shape。 | med | STEP5·r1 | open |
| IMPL-5 | SR-52 与 DR-17 未通过 adversarial seams 证明 validation-before-read、no-scan 及双来源完整净化保证。 | high | STEP5·r1 | open |
| IMPL-6 | CK-14 比较两个共享同一 `leadId` 的路径且无 expected oracle，无法证明 edge semantics 或真实消费者一致。 | med | STEP5·r1 | open |
| IMPL-7 | 四命令文档落点、gate usage 一致性及 CF-12 和 AC7 的文档验收未完整实现。 | med | STEP5·r1 | open |
| IMPL-8 | GT-24 与 GT-25 未经过完整 CLI error matrix，empty flag、invalid config 与 terminated JSON guarantees 未被证明。 | med | STEP5·r1 | open |

VERDICT: 8 issues open
