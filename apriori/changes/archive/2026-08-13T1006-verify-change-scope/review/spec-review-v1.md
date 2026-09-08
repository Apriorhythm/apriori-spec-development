# spec-review-v1 — verify-change-scope

## 正式问题

### SPEC-1：无法证明 `unattributed` 与失败的 true-`orphan` 位于 change scope 外

**描述**

design G3 将 `verdict.orphan` 和 `verdict.unattributed` 在 `--change` 下恒置空；SR-56 进一步规定存在 ID-less `not ok` 时仍可 GREEN。GT-27 所称“范围外的 unattributed failure”在语义上无法成立：`unattributed` 没有 ID，因而没有 provenance；失败的 true-`orphan` ID 在整个 projection 中也不存在，同样无法证明它属于其他 change。

例如 TAP 同时出现：

```text
ok 1 - XC-01 happy path
not ok 2 - changed edge case
```

第二行可能正是当前 change 的失败边界，只是标题漏写 ID。当前规则仍会令 change verdict GREEN。类似地，`not ok 2 - XC-0I typo` 会被当作 true-`orphan` 后忽略。

**风险**

CI 可在实际测试失败时返回 exit 0，导致带缺陷的 change 通过 C1 并进入后续发布流程。这也破坏了现行 D-SR-x“无法归属的失败 fail-closed”的安全理由；将问题保留在信息性 store report 不能补偿 gate 已经 PASS。

**建议**

只有“失败 ID 已绑定到全 projection 中一个确定的 out-of-scope scenario”才能作为 non-blocking failure：

- known out-of-scope `boundRed` 可不阻断当前 change；
- `unattributedFailures` 必须继续阻断；
- 带失败结果的 true-`orphan` 必须继续阻断；
- passing true-`orphan` 可仅进入 store report；
- SR-56、SR-61、GT-27 应据此修订；
- 增加 ID-less failure、failing orphan、known out-of-scope red 三组对照场景，并分别覆盖 `exec.status` 0/1。

### SPEC-2：scope provenance 通过第二次读取 delta 构造，破坏单一输入快照

**描述**

`am.buildProjection` 已在 `lib/archive-merge.js` 中读取并以 `parseDeltaStrict` 解析 delta。design G1 随后要求从 `discoverDeltas` 返回的路径重新读取文件并调用 `am.parseDelta` 来构造 `scopeOps`。

因此 projection 与 scope provenance 来自两个不同的 filesystem observation。两次读取之间若文件被编辑、替换或删除，可能出现：

- projection 使用版本 A，scope 使用版本 B；
- 第二次读取异常导致未定义的 throw；
- 第二次内容已经 malformed，但 `parseDelta` 丢弃 `problems`，仍产生部分 buckets；
- containment 检查后路径被替换，扩大既有 TOCTOU 窗口。

这与 B3“两个视角共享同一个成功 projection”和此前评审所称“不引入新的并发观察窗口”冲突。

**风险**

change scope 可能漏掉 projection 中实际由该 change 产生的场景，从而 false GREEN；也可能产生无法归因的偶发 ERROR。结果依赖运行期间的文件时序，难以复现。

**建议**

delta 每个文件只读取和严格解析一次。由 `am.buildProjection` 返回该次解析得到的不可变 operation metadata，或让 projection builder 接收并消费预加载的 parsed delta snapshot；`scopeOps` 必须从该 snapshot 派生，不能重新按路径读取。相应更新 `archive-merge` 的内部返回契约、设计和测试，并增加“projection 与 provenance 使用同一对象快照”的断言。

### SPEC-3：标题 matcher 单批复用只存在于设计文字，没有可执行 oracle

**描述**

design G3 要求 full-projection title batch 只执行一次，scoped binding 复用其 match table。但 SR-63 和 T1 只明确钉住 projection、test spawn 与 TAP parse 次数，没有钉住 matcher batch 次数。

现有 SR-54 seam 仅断言 `call >= 2`。若实现误写为：

```js
bindPairs(fullPairs, matcher)
bindPairs(scopedPairs, matcher)
parseTap(..., matcher)
```

现有断言仍会通过，却产生第三次 config-origin matcher child execution。

**风险**

每个 `--change` run 增加一次最高 2000ms 的子进程预算和一个新的 timeout/spawn/malformed-output 失败点；同一 projection 可能因 scoped 二次匹配失败而 ERROR，也违背设计声称的复用契约。

**建议**

在 SR-63 与 T1 中明确区分两个 batch channel：

- normal config-origin run 总计恰好两次 matcher child call；
- 第一次是完整 projection titles，且只执行一次；
- 第二次是 TAP descriptions；
- scoped view 不产生第三次调用；
- title-batch failure 后 0 test spawn，TAP-batch failure 前恰好 1 spawn。

使用 `_setChildRunner` 校验调用次数和每次 payload，不要继续使用 `>= 2`。

### SPEC-4：`--specs` byte-identical 保证没有 byte-level 回归测试

**描述**

spec、proposal 和 AC7 都承诺 `--specs` 所有形式 byte-identical。design 却明确不新增专项测试，称由现有测试承担。

现有测试主要断言 exit、局部字段和正则片段；没有保存并比较完整 stdout、stderr、JSON key set/order、尾随换行及 module object own-properties。此次实现会修改共享的 `verify()`、`verifyJson()`、`formatReport()` 和 CLI 收尾路径，仅靠 `opts.change` 的设计意图不能证明 bytes 不变。

**风险**

共享函数的无条件字段、分组标题、空段、JSON 字段顺序或 stderr 行变化都可能漏过测试，破坏依赖稳定 CLI 输出的脚本；问题通常在实现完成或发布后才被发现。

**建议**

在改实现前，以 state A 固化代表性的 byte golden：

- human GREEN、GAPS、ERROR；
- JSON GREEN、GAPS、ERROR；
- duplicate、unidentified、unattributed、stderr diagnostics；
- config-origin matcher success/failure；
- direct `verify()`/`verifyJson()` shape。

实现后逐字节比较 stdout、stderr 和 exit code，并断言 `storeReport`、`changeScope` 在所有 `--specs` run object/JSON 中均不存在。

### SPEC-5：gate store suffix 在 req-final 与 SPEC/design 中有两套契约

**描述**

`req-final.md` B6 仍规定四项摘要：

```text
<boundRed>/<unbound>/<orphan>/<unattributed> outstanding
```

而 gate delta spec、design G4 和 proposal 要求六项：

```text
boundRed, unbound, orphan, unidentified, unattributed, duplicates
```

分隔格式也分别是 slash 与带 label 的 comma-separated 文案。

**风险**

按 requirement、SPEC 或 design 实现会得到不同的 `checks[].detail`。GT-26/27、文档和机器消费者可能各自固定不同字符串，造成验收返工。

**建议**

将 `req-final.md` B6 与 AC5 同步为 gate spec 的六项精确字符串，并在 GT-26/27 对 human 与 gate JSON 中的完整 `detail` 做 exact assertion。

## 外部共享状态

没有新增持久化 shared state；既有外部副作用仍只有 test command spawn。design G1 新增的 delta 第二次 filesystem observation 会形成隐藏并发窗口，已记录为 SPEC-2。

## Advisories

### ADV-1：`infraErrors` 无需修改的判断成立

当前 `infraErrors` 只在 `exec.status != 0 && failCount === 0` 时产生 ERROR。对于已确定绑定到 known out-of-scope scenario 的 red，`failCount > 0`、scoped verdict clean 即可自然得到 GREEN，无需修改 `infraErrors`。SPEC-1 要求修正的是未知失败的 verdict 分类，而不是 non-zero infra rule。

### ADV-2：SR-64 应钉死 nested JSON item schema

除数组本身外，建议 full oracle 明确 `storeReport.boundRed/orphan/unidentified/duplicates` 的元素究竟是 ID、tuple 还是现有 JSON object shape，避免 module raw shape 与 serialized JSON shape被实现者自行解释。

### ADV-3：module presence oracle 应单独命名

AC7 不应只通过 `JSON.stringify` 验证字段缺省；应直接用 `Object.hasOwn(run, "storeReport")` 和 `Object.hasOwn(run, "changeScope")` 覆盖 GREEN、GAPS、pre-test ERROR、post-TAP ERROR 与 `--specs`。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SPEC-1 | `unattributed` 与 failing true-orphan 无 provenance，不能证明在 change scope 外；当前规则可在真实测试失败时 false GREEN。 | high | STEP2·r1 | open |
| SPEC-2 | scopeOps 二次读取 delta，使 projection 与 scope provenance 来自不同 filesystem snapshot，并扩大 TOCTOU 窗口。 | high | STEP2·r1 | open |
| SPEC-3 | full-projection title matcher 单批复用没有调用次数 oracle；现有 `call >= 2` 会放过第三次 scoped matcher child。 | med | STEP2·r1 | open |
| SPEC-4 | `--specs` byte-identical 是明确兼容保证，但测试计划没有完整 stdout/stderr/JSON byte golden。 | high | STEP2·r1 | open |
| SPEC-5 | req-final 规定四项 slash gate suffix，SPEC/design 规定六项 labeled suffix，机器 detail 契约冲突。 | med | STEP2·r1 | open |

VERDICT: 5 issues open
