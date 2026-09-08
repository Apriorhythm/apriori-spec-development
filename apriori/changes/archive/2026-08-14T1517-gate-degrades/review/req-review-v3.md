# req-v3 需求评审

## 维度 1：目标状态 B 是否清晰且无歧义

结论：未通过。REQ-1、REQ-2 仍需重新打开。

### REQ-1 — REOPEN

- 描述：AC-GD-15a/b/c 的组合思路正确，但目前仍不能按需求所称机械执行：
  - `_setChildRunner` 只替换 config-origin id-pattern matcher 使用的 `id-match-child.js` runner（`lib/spec-runner.js:43-61`），不拦截 `runTestCommand()` 在 `lib/spec-runner.js:642` 发起的测试命令。因此 AC-GD-14 用它得到零次调用，只能证明没有运行 ID matcher 子进程，不能证明测试进程没有 spawn。
  - 当前没有 projection-builder 注入 seam。即使导出 `buildChangeProjection`，`verify()` 仍直接调用词法作用域内的本地函数；替换 `module.exports.buildChangeProjection` 不会包裹该调用。因此 AC-GD-15b 所说的“包裹导出的函数并观察两条路径都经过同一个 wrapper”按当前声明无法实现。
  - AC-GD-15c 也依赖捕获 T7 gate 内部的 projection，但 `runGate()` 不返回该对象；没有真实 builder seam 时无法从该路径取得完整对象进行比较。
  - AC-GD-15a 只有否定断言，能禁止两个特定标识符，却没有正向断言 gate 必须调用共享导出。
- 风险：high。测试可能把 ID matcher 的零调用误当成测试 runner 的零调用；实现者也可能为了满足 15b/15c 临时暴露内部数据或写出另一条不可观测路径，而“一个 projection 实现”仍未被真正锁定。
- 建议修复：明确增加两个不同的测试 seam：
  - projection seam，例如 `_setProjectionBuilder(fn)`，且 `verify()` 与 gate T7 都通过同一个可替换引用调用；AC-GD-15b 断言 wrapper 的调用身份和次数；
  - test-command seam，例如 `_setTestCommandRunner(fn)`，包裹实际的 `runTestCommand()` 调用；AC-GD-14 用它断言 T7 为零次。
  
  同时让 AC-GD-15a 增加正向断言：gate 导入并调用共享 `buildChangeProjection` seam。O5 和源码范围应允许这些仅供测试的 seam，而不能继续声称改动“仅限于导出一个入口”。

### REQ-2 — REOPEN

- 描述：T1–T7 对 CLI 输入以及§3.1b 已列出的 string/null/undefined 域现已互斥，空 config 值归入 T7 也与共享 parser 一致；GT-25 不可达和 M8 无需 projection 的判断仍然正确。但 M 矩阵尚未正确、穷举地覆盖可达路径：
  - 行优先级写成 `M5→M7`，与真实源码顺序相反。`lib/gate.js:300-306` 先识别 hotfix，再检查 flow-state。正常 hotfix bundle 本来就没有 `flow-state.md`，所以同时满足 M5 与 M7；按当前“首个匹配者胜”会落入 M5，违反 AC-GD-12 要求的 mapping m1 文案。顺序必须为 `M7→M5`。
  - M3 的“config 不可读 + T7”不可达。同一个不可读 `process-config.md` 会在 test-cmd 来源判定时先命中 T4 并退出，无法同时成为 T7 再进入 id-pattern 解析。AC-GD-13 要求逐项测试这个组合，因此包含一个不可构造的验收分支。
  - M4 没有覆盖 projection builder 的全部错误。`buildChangeProjection()` 还会因没有 delta 文件、change/specs/delta 路径逃逸等 `discoverDeltas()` validation 错误失败；这些可达输入既不一定是“merge conflict / delta 畸形 / CAS base 偏移”，也不应落入 M1。矩阵应以“projection-only builder 返回任意非空 errors 或无可信 texts”作为 M4 的判据。
  - §3.1b 没有关闭直接 API 的非字符串输入。`runGate({testCmd: 1})`、数组或对象在 JavaScript 中可达，但未被分类；当前实现最终可能把它交给 `spawnSync` 并抛出类型错误。
- 风险：high。正常 hotfix 会被矩阵分到错误的 ERROR 原因；部分 projection validation 失败没有目标结果；至少一个 AC 不可构造，直接 API 还保留未定义输入。
- 建议修复：
  - 将优先级改为 `M7→M5→M3→M4→M8→M6→M2→M1`。
  - 从 T7 下的 M3/AC-GD-13 删除“config 不可读”；该情形由 T4/AC-GD-08 完整拥有。保留 id-pattern conflict 和不可编译值等可与 T7 共存的 key-specific 问题。
  - 将 M4 改为涵盖 projection-only builder 的所有错误类别，并增加至少一个 `discoverDeltas` 失败 fixture，例如“无 delta 文件”。
  - 明确 `opts.testCmd` 非字符串值是 ERROR/2，或明确把它们排除在公共 API 契约之外并在入口进行类型断言。

## 维度 2：边界与异常路径是否覆盖

结论：未通过，原因是 REQ-2。

测试命令的 CLI 来源分类已经完整；剩余缺口集中在 hotfix 与 missing-flow 的交叠、不可构造的 T7 + unreadable-config 分支、未覆盖的 projection discovery/validation 错误，以及直接 API 的非字符串输入。

并发、超时和回滚没有新增状态：gate 仍为同步只读聚合器；有效测试命令路径的既有执行失败语义由 B4 保持。

## 维度 3：是否存在隐含但未声明的状态变化或副作用

结论：通过。

退出码、JSON 枚举扩展、doctor finding、文档与测试影响、公共 projection 入口及仓外消费者风险均已声明。没有发现新的未声明持久化或外部副作用。

## 维度 4：每条验收标准是否可测试

结论：未通过。

AC-GD-15a 的静态检查可执行，AC-GD-15c 的 fixture 集也足够覆盖主要成功/失败类别；但 15b 所需的 builder seam 尚不存在，14 使用的又是错误的 runner seam。REQ-2 中“不可读 config + T7”的 AC-GD-13 子项也不可构造。

## 维度 5：是否与状态 A 冲突

结论：未通过。

REQ-1 把 `_setChildRunner` 误描述成可统计测试进程和 projection builder 的基础 seam，与其实际只控制 ID matcher child 的职责冲突。REQ-2 的 M5→M7 顺序则与 `lib/gate.js` 的 hotfix-before-flow 顺序冲突。

空 config 行、JSON schema、doctor D8、文档位置以及 archived C7 不需要 projection 等其余状态 A 描述均已对齐。

## 维度 6：目标 lineage 是否声明且符合仓库现实

结论：通过。

目标仍为从 `main@235a121` 切出的 `brownfield-round2`，最终进入 main、不得进入 v1/v3；当前分支现实与该声明一致。

## Prior issue verification

- REQ-1：重新打开。15a/b/c 的覆盖思路已补齐，但 14/15b 使用或依赖的实际注入 seam 不存在，因而尚不能机械证明测试零 spawn 和共享 builder 身份。
- REQ-2：重新打开。T 分类已修正，但 M5/M7 优先级错误、一个 M3 子项不可达、projection 错误类别未穷举，且直接 API 非字符串输入未定义。
- REQ-3：保持 `verified`。
- REQ-4：保持 `verified`。
- REQ-5：保持 `verified`。

明确的 out-of-scope 章节仍存在，O1–O7 边界清楚。

## Advisories

无。

## Ledger delta

精确状态翻转：

- REQ-1：`fixed (v3) → open` — `_setChildRunner` 不是测试 runner seam，且当前不存在能同时拦截 verify 与 T7 gate 的 projection-builder seam。
- REQ-2：`fixed (v3) → open` — M5/M7 优先级与源码相反，T7 + unreadable config 不可达，projection 错误未穷举，直接 API 非字符串输入未定义。
- REQ-3：保持 `verified`。
- REQ-4：保持 `verified`。
- REQ-5：保持 `verified`。

无新 ledger 行。

VERDICT: 2 issues open
