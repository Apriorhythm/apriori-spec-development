# gate-id-pattern STEP5 一致性评审 v2

## 评审结论

本轮逐项复验 IMPL-1..8，并重新扫描全部 delta scenario、`design.md`、STEP2 修正案、实现和测试。

接受生产环境提供的 `280/280`、`verify --change gate-id-pattern` GREEN 与 `check --self` PASS 证据。本轮仅运行只读语法检查与 `git diff --check`，结果均通过。

IMPL-4..8 已真正闭环，可由 `fixed` 转为 `verified`。IMPL-1..3 仍有未覆盖的原保证，需要 reopen；另发现一项新的 matcher 分支测试缺口。

## Round 1 问题复验

### IMPL-1 — reopen：`ENOENT` 尚不能证明配置路径 absent

`lib/config.js` 已移除 `existsSync` 早退，这是正确方向；但 `readFileSync` 返回 `ENOENT` 时仍直接按 absent 处理。

`ENOENT` 也可能来自一个实际存在的 dangling symlink：配置目录项存在，但 symlink target 不存在。此时它属于 CF-11 所称的 present-but-unreadable / any read error，四个消费者应 fail closed，当前实现却会回退至默认配置。

新增 CF-11 矩阵仍只使用目录触发 `EISDIR`，没有覆盖这个边界。

建议修复：

- 捕获 `ENOENT` 后再用 `lstatSync` 区分“路径项确实不存在”和“路径项存在但读取失败”。
- 增加 dangling-symlink 用例，并至少断言 `getConfig` 不按 absent 返回；四消费者矩阵可复用该 fixture。

### IMPL-2 — reopen：测试仍未证明固定 2000ms budget

timeout 分类顺序已经修正，真实 `ETIMEDOUT + SIGKILL` 会稳定归类为 `timeout`；termination 文案也已落地。

但 SR-54 当前时间 oracle 是：

- `elapsed >= 1900`
- `elapsed < 15000`

这只能证明执行至少接近两秒且最终在十五秒内返回。若实现的 timeout 被错误改成十二秒，该测试仍会通过，无法证明 design 固定的 `timeout: 2000` 或“within its budget”保证。

建议避免依赖紧绷的墙钟断言：

- 将 spawn primitive 或 child-runner options 设为可注入，确定性断言 `timeout === 2000`、`killSignal === 'SIGKILL'`、`shell === false`。
- 保留真实灾难性输入测试作为端到端终止证据，并为整体墙钟设置合理的小幅调度余量，而非十五秒窗口。

### IMPL-3 — reopen：统一净化代码已接通，但 SR-55 仍只测试 matcher 内部返回值

`matcherFailureMsg` 已成为 verify、check、doctor 的共享净化出口，doctor 的正常 finding 也改用了 `boundedSource`；实现修复本身正确。

然而 SR-55 的 failure table 仍只执行：

```js
makeIdMatcher(resolvedCfg).batch(...)
```

没有让任一 injected failure 穿过 `verify()`，因此没有观察 scenario 要求的最终行为：

- infra ERROR；
- exit-equivalent ERROR shape；
- `process-config` 来源；
- 整条消息无控制字符且不超过 200 字符；
- 各 failure class 使用同一 fail-closed channel。

测试即使在 `verify()` 忽略 `batch.failure` 或未经净化直接回显时也可能继续通过。check 与 doctor 新接入的 formatter 同样没有用含控制字符、超长内容的 failure 做最终输出验证。

建议让 SR-55 的表驱动替身调用 `verify()`，逐类断言最终 `errors[]`；另对 check/doctor 至少注入一个超长、含控制字符的 spawn failure，观察各自最终 error/finding。

### IMPL-4 — verified

child success response 现在要求对象仅含一个 `ids` key，并继续验证长度和 `string|null` 元素。extra-field、missing-ids、非 JSON、长度错误和非法元素均有反例，唯一 success shape 已闭合。

### IMPL-5 — verified

SR-52 现在通过不存在的 spec target 证明 pattern error 在 target/spec collection 之前取得优先权，双来源均覆盖控制字符、长度上限和 raw-source 不回漏；text mode 的 `error:` 与 `RESULT: ERROR` 也已断言。

DR-17 额外断言 invalid config 下 child 调用次数为零、D5 sentinel 不运行且 D6 带 repair fix。原问题闭合。

### IMPL-6 — verified

CK-14 已引入独立 expected boolean oracle，并分别经过：

- `checkScenarioIds`;
- verify collection；
- 真实 config-origin child round-trip。

trailing `_`、adjacent alphanumeric 的拒绝以及其他规定正例均被明确断言，不再是同实现自证。

### IMPL-7 — verified

EN/CN 的 doctor、check sections 已补充 config consumption 和错误语义；verify/gate usage 与 configuration section 共同覆盖 flag、fallback 与优先级。gate 所有 usage path 已复用同一 `USAGE`。

CF-12 现在核对完整模板 key/value map、零 conflict、HTML comment 承载两层 pipe 指南、双语文档、CHANGELOG 和真实 `check --self`。实现与 design G6 一致。

### IMPL-8 — verified

GT-24 已通过真实 CLI 表驱动覆盖：

- invalid flag；
- empty flag over valid config；
- empty flag over invalid config；
- invalid config without flag。

GT-25 也经过真实 CLI；`JSON.parse` 证明 stdout 为单一 JSON document，并断言 exit 2、`result: ERROR`、`process-config` 来源和 termination 文案。原问题闭合。

## 新正式问题

### IMPL-9 — config matcher 的第二个实际应用分支没有对抗测试，SR-54 的 same-store 对照也未实现

design 和 spec 要求 config-origin pattern 的每次实际应用都在 child 中执行：

1. test command 前的 scenario-title batch；
2. test command 后的 TAP-description batch。

当前灾难性测试只让 scenario-title batch 超时，随后 test command 被阻止。没有测试让 title batch 成功、test command 运行、再让 TAP-description batch timeout/crash/malformed，并观察 verify 最终 fail closed。

因此 `parseTap(..., matcher)` 的 `matchFailure` 上浮分支没有任何 adversarial scenario test；即使未来该分支静默忽略 failure，现有绑定仍可能全绿。

此外 SR-54 要求“项目真实 multi-segment pattern over the same store”正常完成。当前正常对照另建了 `SPEC3` store，并非承载 adversarial title 的同一个 store，未忠实执行该句 intent。

建议：

- 使用顺序型 child seam：第一次 title batch 返回合法结果，第二次 TAP batch 注入 timeout，再断言 test command 已运行但 verify 为 sanitized infra ERROR。
- 至少再覆盖一个 malformed TAP-batch response。
- 用同一 adversarial-title store 换入项目 multi-segment pattern，断言 child 正常返回而非 termination；允许最终结果因标题不含 bindable ID 成为普通 GAPS/ERROR，但不得出现 matcher failure。

## Advisories

1. `CHANGELOG.md` 仍写 `276 tests`，而本轮生产环境证据为 `280/280`。这不影响运行时行为或 stated requirement，列为 advisory。

## Ledger delta

状态翻转：

| ID | Status |
|---|---|
| IMPL-1 | open — reopened in STEP5·r2：`readFileSync` 的 `ENOENT` 也可能来自已存在的 dangling symlink，仍会 fail open 为 absent；现有 CF-11 只覆盖 `EISDIR`。 |
| IMPL-2 | open — reopened in STEP5·r2：timeout 分类已修复，但 `<15000ms` 无法证明 design 固定的 2000ms budget。 |
| IMPL-3 | open — reopened in STEP5·r2：共享净化出口已接通，但 SR-55 仍只观察 matcher failure，未逐类观察 verify 的最终 sanitized ERROR channel。 |
| IMPL-4 | verified — strict single-key `{ids}` shape 与反例测试均已落地（step5-review-v2）。 |
| IMPL-5 | verified — validation-before-collection、双来源净化、text contract、doctor no-scan/no-spawn 与 repair fix 均已验证（step5-review-v2）。 |
| IMPL-6 | verified — 独立 oracle 与 check/collection/real-child 三通道一致性已验证（step5-review-v2）。 |
| IMPL-7 | verified — 四命令文档落点、统一 gate usage、完整模板解析及 EN/CN/CHANGELOG/self-check 验收已落地（step5-review-v2）。 |
| IMPL-8 | verified — gate CLI 的 flag/config error matrix 与 terminated pure-JSON path 已完整覆盖（step5-review-v2）。 |

新增行：

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| IMPL-9 | config matcher 的 TAP-description 第二批应用没有 adversarial failure test；SR-54 的真实 pattern 正常对照也没有使用同一 adversarial store。 | high | STEP5·r2 | open |
| IMPL-ADV-1 | Advisory batch acknowledged（1 item：CHANGELOG 测试计数仍为 276，当前 suite 为 280）。 | — | STEP5·r2 | advisory-acked |

VERDICT: 4 issues open
