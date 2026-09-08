# req-review-v3 — archive-readiness requirement review（Round 3）

评审基于 req-v3、Round-2 review、issue ledger、RUNBOOK、living specs 与实际源码；未修改任何文件。

## 原问题处置

### REQ-1 — REOPENED

B7a/B7b 已真实修复以下部分：

- archive 外层能区分首次 `lstatSync` 的 `ENOENT` 与其他错误；
- `EACCES`、`EIO`、`ELOOP` 等被定义为不可 force 的结构失败；
- `readiness.reviewDirDefect` 明确改用 `resolve.containsReal`，依赖环已消除；
- RY-07 的五例差分足以验证 `reviewDirDefect` 当前调用域内的行为兼容性。

但安全读取仍存在第二次 `lstat` 的 fail-open 窗口。

B7a 规定外层先 `lstatSync`，成功后再调用既有 `fileReadDefect()`。后者会再次执行 `lstatSync`，且其 `catch` 仍吞掉所有错误：

1. 外层首次 `lstatSync(tasks.md)` 成功；
2. `fileReadDefect()` 内部第二次 `lstatSync` 抛 `EACCES`、`EIO` 或 `ELOOP`；
3. helper 把它归成 `missing`；
4. trivial tier 将 tasks 判为 `n/a`；
5. archive 继续执行。

这违反 B7a 的绝对声明：“只有真正的 ENOENT 才进入 missing；其他 `e.code` 全部结构失败”。同类问题也存在于 helper 的祖先检查和 `reviewDirDefect()` 自己的第二次 `lstat`。AM-107 只写“守卫自身抛错”，未指定错误发生在外层预检还是 helper 内部调用，因此实现只覆盖第一次调用也能通过测试。

- **维度**：边界/异常路径、验收可测试性、与 state A 冲突。
- **风险**：high。trivial tier 仍可能把读取故障降为不存在并放行不可逆归档。
- **建议修复**：让 archive 专用安全检查拥有完整、单一的错误分类路径，不在成功预检后调用会重新 `lstat` 且吞错的 helper；或为 helper 增加返回结构化 I/O 错误、接受预取得 stat 的接口。AM-107 应分别注入外层、helper 内部、祖先检查及 realpath 阶段的非-ENOENT 错误，并包含 trivial tasks/ledger 控制。

### REQ-2 — REOPENED

以下修复已确认：

- evidence 已按 tasks/ledger 分类；
- 不再声称 per-run 或作者身份证明；
- 理由、模板及原始首行输出均有机械验收；
- standing authorization 的范围和后果已明确披露。

“standing authorization”本身可以是一个合法的产品选择：只要有效期明确、行为可测试，并由 gate④ 的人类接受，其范围较宽不自动构成 requirement 缺陷。

但当前协议仍有两个实质问题。

第一，撤销机制与 RUNBOOK 冲突。B3 和 §六-5 都称授权持续到记录被“显式删除”；RUNBOOK 将 `flow-state.md` 的 `gates:` 定义为 **append-only log of human decisions**。删除该记录不是合法流程动作，因此需求声称存在的撤销路径实际上不可用。

第二，多类别记录的语法没有定义类别列表与理由的边界。需求允许“一条同时列出两个类名”，同时又通过任意 token 边界寻找 `tasks`/`ledger`，例如：

```text
archive-force tasks — ledger cleanup deferred
```

其中 `ledger` 究竟是第二个授权类别还是理由正文并不唯一。类似地，类别 token 本身含 `\w`，若未明确理由从最后一个类别之后开始，`archive-force tasks ledger` 可能在没有独立理由时仍通过理由检查。AM-88/89 没有覆盖这些歧义。

- **维度**：目标状态清晰性、隐含状态变化、验收可测试性、与 state A/RUNBOOK 冲突。
- **风险**：high。授权无法按声明撤销，理由文字还可能意外扩大授权类别。
- **建议修复**：
  - 定义锚定且完全消费的记录语法；最简单的是每条记录只能授权一个类，同时授权两类必须写两条；
  - 理由必须是类别字段之后的独立后缀，类别词出现在理由中不得授予该类；
  - 撤销使用新的 append-only 决策记录，并定义“最后一条同类决定生效”的顺序及 AC；或者明确授权在 bundle 生命周期内不可撤销，删除所有“直到显式删除”的表述，由 gate④ 决定是否接受该代价。

### REQ-6 — REOPENED

核心修正方向正确：

- §1.8 正确确认 delta 操作粒度是整个 Requirement；
- AM-99 改为 MODIFIED enclosing Requirement，保留 AM-01～AM-11、只删除 AM-12；
- §1.9 和 AM-106 正确要求更新 SECURITY.md。

但文档仍有两组冲突。

其一，§1.6 仍保留 v2 的错误结论：

- 称 AM-12 需要 living-spec `## REMOVED`；
- 称 SECURITY.md 不涉及单文件形式、无需修改。

§八的 REQ-6 旧处置行也仍以“本版”措辞重复这两个错误。它们与 §零、§1.8、§1.9、AM-99、AM-106 直接相反，AI 实现者无法判断应服从哪一组指令。

其二，AM-99 要求完整性报告“恰好打印 `! dropped: AM-12`”，与实际 formatter 不符。`formatIntegrityHuman()` 输出的是：

```text
! dropped: ${d.title}
```

AM-12 的完整 scenario title 是：

```text
AM-12 the store commit and the dir move are one transaction (single-file form)
```

因此 state A 会打印完整标题，而不是只有 ID。若为了满足 AM-99 而全局修改 formatter，又会违反 B5 对既有成功输出字节不变的要求。

- **维度**：目标状态清晰性、验收可测试性、与 state A 冲突。
- **风险**：high。实现者可能错误弃用整个 Requirement、漏改 SECURITY.md，或为满足不可能的断言破坏全局完整性报告格式。
- **建议修复**：
  - 清除或显式标为 superseded 的 §1.6 与 §八旧结论，保证全文只保留 MODIFIED + SECURITY update；
  - 将 AM-99 的精确期望改成 formatter 实际产生的完整 dropped title，并断言 dropped 集合仅含 AM-12；不要修改 formatter。

### REQ-3 — VERIFIED（回归复核）

B3/B5/AM-91 仍一致：`--force` 只属于高层形式；单文件形式固定 exit 2 + usage。v3 未破坏该修复。

### REQ-4 — VERIFIED（回归复核）

readiness 仍位于既有 preflight、temp guard 和 destination guard 之后、integrity report 之前。新增安全层属于 readiness 内部，不改变 B6 的优先顺序。

### REQ-5 — VERIFIED（回归复核）

五步路径作用域算法及 AM-92～AM-98 未被改动；词法/realpath、段边界、失败回落和读取时机仍明确。

### REQ-7 — VERIFIED（回归复核）

读取/结构 → C3 → STEP6 overlay → R2/R3 的顺序仍完整；ABANDONED、DONE 与其他 C3 错误的优先级没有回退。

## 新问题

本轮不新增 formal ID。新发现均是 REQ-1、REQ-2、REQ-6 修复本身的残余缺陷，按 reopen 规则复用原 ID。

各维度结论：

- **目标状态 B**：未通过，见 REQ-2、REQ-6。
- **边界与异常路径**：未通过，见 REQ-1 的 helper 内部二次读取异常。
- **隐含状态变化/副作用**：未通过，见 REQ-2 要求删除 append-only 决策记录。
- **验收可测试性**：未通过，见 AM-107、force 记录语法及 AM-99。
- **与 state A 一致性**：未通过，见三个 reopened issue。
- **lineage**：通过。当前分支、main@235a121、目标 main/v4 及禁止合入 v1/v3 均与仓库现实一致。
- **out of scope**：通过。§五明确存在并列出 G3、F-2/F-4、并发锁及其他不会处理的事项。

## Advisories

### A-1 — VERIFIED

F-2/F-4 已改为本轮 advisory batch row 内的稳定 finding 标识，符合 ledger 的 batch 规则。

### A-2 — VERIFIED

TOCTOU hook 已明确位于 readiness 完成后、首次 store 写入前，并明确断言不重读、不检测修改。

### A-3 — VERIFIED

§八·2 已声明源码行号仅作定位，后续 design/tasks 绑定命名步骤和函数调用。

### A-4 — req-v3 的一级标题仍写作 req-v2

文件首行是 `# req-v2`。路径和正文足以识别版本，因此不计 verdict，但应改为 `req-v3`，避免后续证据和评审引用混淆。

### A-5 — standing authorization 的产品代价已诚实披露

除 REQ-2 的语法与撤销冲突外，“同类新失败会复用旧授权”已被准确声明，不再是假称 per-run 的需求缺陷。若 owner 认为授权范围过宽，可在 gate④要求绑定失败集合摘要；这属于产品裁决，不应由评审者替代。

VERDICT: 3 issues open
