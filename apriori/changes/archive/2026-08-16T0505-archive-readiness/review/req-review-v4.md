# req-review-v4 — archive-readiness requirement review（Round 4）

评审基于 req-v4、Round-3 review、issue ledger、RUNBOOK 与实际源码；未修改任何文件。

## 原问题处置

### REQ-1 — REOPENED

单趟 `lstat` 修复方向正确，且确实消除了 Round-3 指出的“外层检查后再调用吞错 helper”问题。但新定义仍有两处互相不能同时满足的规范。

#### 残余缺陷 1：`resolve.containsReal` 无法产生要求的 `io-error`

B7b 要求 archive 层的 `reviewRootDefect` 使用 `require('./resolve').containsReal`。实际 `resolve.containsReal()` 在 root 或 target 的 `realpathSync` 抛错时直接 `catch { return false; }`，不暴露异常或 `e.code`。

因此，review-root realpath 抛 `EACCES` 时：

- B7b 要求调用的 helper 只能返回 `false`；
- 实现只能把它归为 `escape`；
- B7a、判定表和 AM-107 却要求返回 `io-error`，并打印原始 `EACCES`。

先自行 realpath、再调用 `resolve.containsReal` 也不是完整修复：它会重新 realpath，并重现“第二次调用吞错”的同类窗口。

#### 残余缺陷 2：`reviewRootDefect` 的对象类型及差分基准不成立

B7a 同时要求 `artifactDefect` 和 `reviewRootDefect` 照抄 `resolve.js:151-155`。该规则包含：

```js
if (!st.isFile()) return { kind: 'not-file', ... };
```

这对文件 artifact 正确，但对合法的 `review/` 目录会恒定返回 `not-file`。review root 应采用 state A `reviewDirDefect` 的 `isDirectory()` 规则，而不是文件规则。

RY-08 也把两个新函数合并成同一组六类差分，但二者没有同一个 state-A 基准：

- `artifactDefect` 应对比 `resolve.fileReadDefect`；
- `reviewRootDefect` 应对比 `gate.reviewDirDefect`；
- 真正缺失的 review root 在 state A 返回 `null`，新设计则拟返回 `missing`，不能声称结果逐项相同；只能比较最终 tier-sensitive readiness 结论或明确声明这是有意的新分类。

- **维度**：目标状态清晰性、异常路径、验收可测试性、与 state A 冲突。
- **风险**：high。按字面实现可能拒绝所有具有正常 `review/` 目录的 bundle；realpath 错误的类型和诊断 AC 也无法实现。
- **建议修复**：
  - B7b 只让基础层 `reviewDirDefect` 使用 `resolve.containsReal`；
  - archive 层使用新的本地 containment classifier，直接捕获 root/target realpath 异常并返回 `{kind:'io-error', code}`，不得再调用吞错 helper；
  - 分开规定 artifact 的 `isFile()` 与 review root 的 `isDirectory()`；
  - 将 RY-08 拆成两个明确基准，并把 review-root missing 定义为有意的新分类或改测最终 readiness；
  - AM-107 增加 review-root realpath 抛错的直接控制。

### REQ-2 — VERIFIED

修复真实且完整：

- 一条记录只含一个紧跟 keyword 的 class；
- reason 是 class 后的剩余文本，理由中的类名不扩大授权；
- grant/revoke 都是完全消费的具名记录；
- 撤销通过 append-only 记录完成；
- 同类最后一条决定按 `gatesEntries()` 文件顺序生效；
- AM-110、AM-111 覆盖消歧及 grant → revoke → grant。

standing authorization 的有效期、可重放范围和 gate④ 裁决点均已如实陈述。其范围较宽是明确的产品选择，不是 requirement 缺陷。

### REQ-6 — VERIFIED

Round-3 的两个残余均已关闭：

- §1.6 和 §八(r1) 的旧结论已明确删除线作废、指向正确章节，并声明不构成实现指令；
- AM-99 使用 formatter 实际输出的完整 AM-12 标题，93 字符的测量与源码一致；
- dropped 集合限定为唯一一条；
- 明确禁止修改 formatter；
- AM-01～AM-11、AM-19、绑定测试及 SECURITY.md 均有处置要求。

未发现剩余的 state-A 冲突。

### REQ-3 — VERIFIED（回归复核）

`--force` 仍只属于高层形式；单文件形式固定 exit 2 + usage。B3、B5、AM-91 一致。

### REQ-4 — VERIFIED（回归复核）

readiness 插入点及既有 guard 优先级未改变；新安全分类器仍处于 readiness 内部。

### REQ-5 — VERIFIED（回归复核）

五步路径作用域算法及 AM-92～AM-98 未回退。

### REQ-7 — VERIFIED（回归复核）

读取/结构 → C3 → STEP6 overlay → R2/R3 的顺序、聚合规则及专门诊断保持一致。

## 新问题

没有新增 formal ID。新 classifier 中发现的两个缺陷都属于 REQ-1 修复不完整，按 reopen 规则复用 REQ-1。

各维度结论：

- **目标状态 B**：未通过，仅见 REQ-1。
- **边界与异常路径**：未通过，仅见 REQ-1 的 realpath 分类。
- **隐含状态变化/副作用**：通过。
- **验收可测试性**：未通过，RY-08 与 AM-107 当前不能同时兑现 B7b。
- **与 state A 一致性**：未通过，仅见 review-root 类型和 missing 差分基准。
- **lineage**：通过。`brownfield-round2`、main@235a121、目标 main/v4 及禁止合入 v1/v3 均符合仓库现实。
- **out of scope**：通过。§五明确存在，且未利用 out-of-scope 掩盖本轮 blocker。

## Advisories

### A-1～A-5 — VERIFIED / ACCEPTED

前轮 advisories 的处置均成立，包括标题版本修正及 standing authorization 的产品定性。

### A-6 — B7 表格和矩阵仍使用旧 helper 名称

B7 表头仍写 `fileReadDefect`，review 行仍写 `reviewDirDefect`，3.1 #1 也仍引用 flow-state 的 `fileReadDefect`，而 B7a 明确禁止 archive 调用这些 helper。RY-08 的静态断言使实现方向最终可判，因此不单独计 verdict；修复 REQ-1 时应统一改为 `artifactDefect` / `reviewRootDefect`。

### A-7 — force 语法宜补一个前置否定文本控制

“形态恰为”“完全消费”已经排除 `do not archive-force tasks …` 之类的前置文字，因此目标本身清楚。建议 AM-110 加这一例，防止实现者对完整 `gatesEntries()` 字符串做无锚点 substring 搜索。

VERDICT: 1 issues open
