# req-v4 需求评审

## 维度 1：目标状态 B 是否清晰且无歧义

结论：未通过。REQ-1 仍有一处直接矛盾，需重新打开。

### REQ-1 — REOPEN

- 描述：§1.4、§3.1c、AC-GD-14/15a/15b/15c 与 O5 已正确声明两个 seam：
  - `_setProjectionBuilder` 位于共享 projection 调用点，使 `verify()` 和 gate T7 路径经过同一可替换引用；
  - `_setTestRunner` 位于实际 `runTestCommand()` 调用点，能够断言 T7 不运行测试；
  - 15a 的静态正反断言、15b 的共享 wrapper 身份与次数、15c 的六类 fixture 全对象及 errors 比较，合起来足以机械约束“只有一套 projection 实现”。

  但 §五末尾的源码范围仍写着：

  `lib/spec-runner.js（仅导出 projection-only 入口）`

  这与同节 O5 明确允许的三项改动直接冲突：除导出入口外，还必须新增两个 seam，并将 `verify()` 的调用改走共享可替换引用。实现者若服从该范围摘要，就无法实现 AC-GD-14/15b；若服从 O5，又会违反“仅导出”的限制。
- 风险：high。需求同时给出互斥的源码改动边界，不能无歧义地直接交给 AI 实现。
- 建议修复：将该范围说明改成引用 O5，例如：

  `lib/spec-runner.js（改动严格限于 O5 声明的三项：导出 projection-only 入口、新增两个测试 seam、verify() 改走共享引用）`

  或删除括号中的限制，以 O5 为唯一范围定义。

## 维度 2：边界与异常路径是否覆盖

结论：通过。

REQ-2 已正确修复：

- §3.1 与 §3.1b 对 CLI presence、空字符串、纯空白、合法字符串、`null`/`undefined` 及所有非字符串直接 API 输入互斥且穷举。
- M 行顺序 `M7→M5→M3→M4→M8→M6→M2→M1` 与源码一致：`gate.js:301` 的 hotfix 拒绝确实早于 `gate.js:306` 的 flow-state 检查。
- config 不可读由 T4/AC-GD-08 完整拥有，不再出现在稳定输入下不可构造的 T7+M3 分支。
- M4 以 builder 的结果形状而非有限错误枚举判定，覆盖 `discoverDeltas` validation、projection validation、CAS、冲突等全部失败出口。
- M8 的 id-pattern 成功前提明确；`checkCas()` 在 archived 状态直接返回 `n/a`，因此无需 projection。
- GT-25 只可能在 matcher 实际扫描场景时发生；T7 不收集 C1 场景，只解析/编译 pattern，因此该运行期前提确实不可达。
- AC-GD-13b 可用其余字段均合法的 `runGate` fixture 构造。没有剩余不可构造的 AC。

该 change 不引入并发写入、事务或回滚；T7 明确不启动测试进程，因此测试命令的超时和终止路径不适用于该分支。有效测试命令路径保持状态 A 行为。

## 维度 3：是否存在隐含但未声明的状态变化或副作用

结论：通过。

退出码 3、`skipped` 状态、doctor D5 finding、机器可读契约扩展、公共 projection 入口、两个测试 seam、文档影响及仓外 CI 风险均已声明。命令仍为只读操作，没有未声明的持久化变化或失败回滚要求。

## 维度 4：每条验收标准是否可测试

结论：通过。

AC-GD-01 至 AC-GD-25 均可表达为确定的输入和输出断言。尤其：

- AC-GD-14 现在观察实际 test runner 调用点；
- AC-GD-15a/b/c 能检查共享入口、共享 builder 身份、调用次数、测试零调用以及成功和失败 projection 的完整等价性；
- AC-GD-13 不再包含不可达的 config-unreadable 子情形；
- AC-GD-13b 封闭了导出 API 的非字符串输入域。

REQ-1 的剩余问题是源码范围文本自相矛盾，并非 AC 本身不可执行。

## 维度 5：是否与状态 A 冲突

结论：通过。

v4 对状态 A 的描述与源码一致：

- `_setChildRunner` 只控制 config-origin ID matcher 子进程；
- `verify()` 当前通过词法绑定直接调用未导出的 `buildChangeProjection()` 和 `runTestCommand()`；
- projection 在测试命令执行前构建；
- config parser 将空值和纯空白值归一化为缺席；
- hotfix 检查先于 flow-state；
- archived C7 不消费 projection；
- JSON 当前不含 `code`；
- 仓内没有需要把 gate 退出码固定为仅 0/1/2 的脚本或 CI 消费者。现有测试中的退出码断言均针对有合法测试命令的路径，并由 B4/AC-GD-09 保持。

## 维度 6：目标 lineage 是否声明且符合仓库现实

结论：通过。

需求声明目标分支为从 `main@235a121` 切出的 `brownfield-round2`，最终进入 main，禁止合并到 v1/v3。当前分支为 `brownfield-round2`，HEAD 与 main 均为 `235a121`，声明与仓库现实一致。

## Prior issue verification

- REQ-1：重新打开。seam、共享调用点和 AC 已正确补齐，但源码范围摘要仍错误地限制为“仅导出 projection-only 入口”，与 O5 冲突。
- REQ-2：`fixed (v4) → verified`。T 分类和 M 矩阵现已互斥、穷举、可判定，并与源码控制流一致。
- REQ-3：保持 `verified`。
- REQ-4：保持 `verified`。
- REQ-5：保持 `verified`。

明确的 out-of-scope 章节存在，O1–O7 覆盖清楚。

## Advisories

无。

## Ledger delta

精确状态翻转：

- REQ-1：`fixed (v4) → open` — §五末尾仍称 `lib/spec-runner.js` “仅导出 projection-only 入口”，与 O5 要求的“导出入口、新增两个 seam、verify 改走共享引用”三项改动直接冲突。
- REQ-2：`fixed (v4) → verified` — 测试命令分类域与 M 行优先级现已互斥、穷举、可构造，并与 `gate.js`、`config.js`、`spec-runner.js` 的状态 A 一致。
- REQ-3：保持 `verified`。
- REQ-4：保持 `verified`。
- REQ-5：保持 `verified`。

无新 ledger 行。

VERDICT: 1 issues open
