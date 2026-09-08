# spec-review-v1 — modified-block-integrity

## 正式问题

### SPEC-1：idempotent MODIFIED 的 JSON 契约与引擎算法冲突

`archive-merge/spec.md`、req-final B3/AC5 和 SR-66 要求 identical trimmed replacement 仍产生 entry，但其 diff arrays 全空。design G1 却无 identical fast path，直接执行基数分类；一个包含 `KV-01` 的相同块会自然得到 `retained=[KV-01]`，并非全空。

这还影响 archive 是否需要调用 matcher，以及 literal `out.push(formatIntegrityHuman(...))` 在 formatter 返回空串时是否额外打印空行。

**风险**

实现者只能自行选择两套互斥行为，导致 AC5 deep oracle、SR-66、archive byte compatibility 返工。

**建议**

明确唯一规则。若维持“全空”，在结构扫描和 matcher 前增加：

```text
oldBlock.trim() === newBlock.trim()
→ retained/titleChanged/dropped/added/ambiguous/missingLines 全为 []
```

同时断言 formatter 空结果不会向 archive stdout 增加空行。

### SPEC-2：archive 既不能保证真实“写入前打印”，报告插入点也早于完整 preflight

design G3 把 `out.push(formatIntegrityHuman(...))` 视作打印，但 State A 的 `archiveChange()` 只缓冲 `out[]`；`cli()` 在 `archiveChange()` 完成全部 stage/commit/move 后才执行 `console.log`。因此 `--write` 下报告实际在写入后才对外可见。

此外，design 指定在 `preflightFailures` 为空后生成报告；当前代码随后才检查：

- pre-existing `.tmp-archive`；
- explicit `--changes-dir` destination containment。

按设计直接实现，这两种 `FAILED PREFLIGHT` 仍会携带 integrity section，违反 B3 的“任一 preflight failure 无报告”。

**风险**

AM-46 的时序保证无法实现；失败运行可能展示一份看似可执行的报告。若用户依赖写前日志进行审计，store 已经提交后才看到报告。

**建议**

先裁定“before write”是实际 I/O 时序还是仅 stdout 文本顺序。若是实际时序，需要 streaming emitter 或 prepare/commit 分层，不能只向 `out[]` 入队。报告必须位于所有 temp/destination guards 之后、第一次 `writeFileSync` 之前。AM-46 增加：

- pre-existing temp；
- escaping archive destination；
- emitter 回调中检查 store bytes 尚未变化；
- stage/commit failure 后报告已先行发出的时序 oracle。

### SPEC-3：测试无法证明两个关键 `modifiedBlocks` 捕获点

design G1 正确要求 rename-then-modify 在 rename key swap 前捕获原始 A block，并覆盖 idempotent unchanged。但现有场景不能证明这些要求：

- AM-45 只断言 `missingLines=[]`；由于 requirement heading 本来就不比较，在 rename 后捕获的 G block 也会通过。
- SR-66 未指定 State A 的 stamped rerun repair 路径。该路径在 `buildProjection()` 的 `probe` 后直接 `continue`，最容易漏掉 `modifiedBlocks` entry。
- 没有场景直接检查 `buildProjection.modifiedBlocks` 的 raw text。

**风险**

实现可通过全部报告级场景，却返回错误 baseline 或在 repaired rerun 中漏 entry，破坏“每个 MODIFIED 恰一条”和单快照契约。

**建议**

增加直接 module oracle：

- `RENAMED A->G + MODIFIED G`：`name=G`，`oldBlock` deep-equal rename 前完整 A block，`newBlock` deep-equal delta block；
- stamped base mismatch 且全部操作已应用：`repaired` 分支仍含一条等文本 pair，verify JSON 含全空 entry；
- 普通 trim-equal unchanged 路径同样覆盖。

### SPEC-4：bin-seam 没有可实现的唯一接口

design G3 要求 bin 从 `spec-runner` 取得 `resolveIdPattern+makeIdMatcher` 并注入 archive，但 State A 中：

- `spec-runner` 只导出 `makeIdMatcher`，不导出 `resolveIdPattern`；
- `archive-merge.cli(argv)` 没有 dependency 参数；
- `bin/apriori.js` 仅调用 `archiveMerge.cli(rest)`；
- optional factory 缺席时的行为仅存在于 design，没有 SPEC/module API 契约。

**风险**

实现可能改成 `archive-merge` 反向 require `spec-runner`、提前解析 config、遗漏 high-level CLI 的注入，或使 programmatic `archiveChange()` 调用静默降级，破坏依赖方向和 AM-47。

**建议**

在 design/SPEC 钉死接口，例如：

```js
archiveMerge.cli(argv, { idMatcherFactory })
archiveChange({ ..., idMatcherFactory })
```

bin 注入 lazy factory；`resolveIdPattern` 明确从 `lib/config` 导入或明确新增 `spec-runner` export。factory 只在完整 preflight 成功且存在 MODIFIED entries 时调用，并定义 missing factory 的 module-level 行为。

### SPEC-5：新 human 输出允许 terminal/log control injection

B4 只要求 human 行截断；`missingLines.line`、scenario title、requirement name、ambiguous title key、suffix 都可能来自 repository/change 输入，并将被直接插入 stdout。控制字符尤其是 ANSI `ESC`、换行型文件名等可伪造日志、改写终端显示或隐藏后续 `RESULT`。

warning 已要求整行经过 `sanitizeMsg`，但主要 integrity section 没有同等保护。JSON 经 `JSON.stringify` 会转义控制字符，问题集中在 human path。

**风险**

恶意或损坏的 change/store 内容可污染 CI 日志和操作者终端；这是本 change 新增的外部输入输出通道。

**建议**

为 human formatter 定义统一的 safe rendering：所有外部字段先将 C0/DEL 控制字符替换为 `·`，再执行 120 UTF-16 unit 截断；JSON 继续保留完整原文。增加 title、body line、file suffix 分别携带 `ESC`/control character 的 exact oracle。

## 外部共享状态

没有新增持久化 shared state。archive store 的三个时刻仍为：首次 `--write` 创建、temp+rename 全量更新、无 cleanup；verify 仍为只读加 test child spawn。SPEC-2 涉及的是既有 store mutation 前后的输出时序，不是新的持久状态。

## Advisories

### ADV-1（P0）：State A 的两批 matcher 与 deep JSON 护栏可保持

分段方案只要保证 binding accumulation 仅消费 projection pairs、sibling/integrity 各自按精确 slice 取回 IDs，就不会增加第三批。既有 SR-63 应继续断言总计恰好两批；SR-64 的 GREEN/GAPS full oracle需仅新增预期的 `modifiedIntegrity: []`，其余字段保持 deep-equal。

### ADV-2（P0）：human golden 应由规范先给出完整语法

当前 B4 规定了前缀、计数和截断，但没有给出 entry header、titleChanged、ambiguous、missingLines 的完整文本模板。建议先在 SPEC 固定模板，再制作 full-class golden，避免 golden 反向成为事实规范。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SPEC-1 | identical MODIFIED 的全空 entry 契约与无条件基数分类冲突。 | med | STEP2·r1 | open |
| SPEC-2 | archive 缓冲输出无法满足真实写前打印，且设计插入点早于 temp/destination preflight guards。 | high | STEP2·r1 | open |
| SPEC-3 | AM-45/SR-66 无法证明 rename 前 raw capture 与 repaired-rerun entry。 | med | STEP2·r1 | open |
| SPEC-4 | bin→cli→archiveChange 的 matcher DI 接口及 missing-factory 行为未定义，且所称 export 在 State A 不存在。 | med | STEP2·r1 | open |
| SPEC-5 | integrity human section 直接输出外部文本，缺少 control-character sanitization。 | high | STEP2·r1 | open |

VERDICT: 5 issues open
