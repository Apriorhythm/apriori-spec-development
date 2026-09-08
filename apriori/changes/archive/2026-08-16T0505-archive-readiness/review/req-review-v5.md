# req-review-v5 — archive-readiness requirement review（Round 5）

评审基于 req-v5、Round-4 review、issue ledger、RUNBOOK、living specs 与实际源码；未修改任何文件。

## 原问题处置

### REQ-1 — VERIFIED

Round-4 的两个残余均已真实、完整关闭。

#### realpath 错误分类

B7c 不再让 archive 层使用吞错的 `resolve.containsReal`：

- `containDefect` 对 root/target 各执行一次 `realpathSync`；
- 非 `ENOENT` 异常返回带原始 code 的 `io-error`；
- 成功时明确返回 `null` 或 `escape`；
- archive 的三个新函数被 RY-10 静态禁止调用 `fileReadDefect`、基础层 `reviewDirDefect` 或 `containsReal`；
- B7b 已正确收窄为只约束需要保持 gate 行为的基础层；
- AM-107 明确覆盖 artifact 与 review-root 的 realpath 阶段。

因此不再存在“要求调用吞错 helper，同时又要求取得原始错误码”的不可实现矛盾。

#### artifact 与 review-root 类型规则

B7a 已按对象类型拆分：

- 文件 artifact 使用 `isFile()` / `not-file`；
- `review/` 使用 `isDirectory()` / `not-dir`；
- review root 真正缺失时返回 `null`，由 `review/issues.md` 的 artifact 检查落实 tier-sensitive 结论；
- RY-08 与 RY-09 分别绑定正确的 state-A 基准；
- AM-112 证明正常目录不会被误判为文件缺陷；
- AM-113 覆盖 review root 缺失时 trivial 与 medium/large 的不同结果。

目标状态、异常路径及验收标准现在一致且可直接实现。REQ-1 可标记 `verified`。

### REQ-2 — VERIFIED（回归复核）

一类一记录、锚定语法、append-only revoke、同类最后决定生效及 standing authorization 的有效期均未回退。AM-110 新增的前置否定控制进一步关闭了无锚点 substring 误授权。

### REQ-3 — VERIFIED（回归复核）

`--force` 仍只属于高层形式；单文件形式固定 exit 2 + usage。

### REQ-4 — VERIFIED（回归复核）

readiness 的插入点、既有 preflight 优先级、integrity report 顺序及零写入边界保持明确。

### REQ-5 — VERIFIED（回归复核）

单文件路径作用域的五步算法及词法、realpath、失败回落边界均未变化。

### REQ-6 — VERIFIED（回归复核）

AM-12 的 MODIFIED 操作、完整标题 integrity 输出、AM-01～AM-11 保留、SECURITY.md 更新及迁移面仍一致。

### REQ-7 — VERIFIED（回归复核）

读取/结构 → C3 → STEP6 overlay → R2/R3 的有序判定及诊断优先级未回退。

## 新问题

未发现新的 blocking issue。

各维度结论：

- **目标状态 B**：通过。
- **边界与异常路径**：通过；missing、非-ENOENT I/O、祖先、realpath、正常目录及 review-root 缺失均有机械覆盖。
- **隐含状态变化/副作用**：通过。
- **验收可测试性**：通过。
- **与 state A 一致性**：通过；基础层保持 gate 行为，archive 专用安全语义明确隔离。
- **lineage**：通过。`brownfield-round2`、main@235a121、目标 main/v4 及禁止合入 v1/v3 与仓库现实一致。
- **out of scope**：通过。§五明确存在，且没有用 out-of-scope 回避本次目标所需的安全路径。

## Advisories

### A-1～A-7 — VERIFIED / ACCEPTED

此前 advisories 均已落实或被明确接受；A-6 的旧 helper 名称与 A-7 的否定前缀控制均已修正。

### A-8 — B7a 第 2 步可同步 review-root 的特例措辞

B7a 的通用第 2 步仍写成 ENOENT 最终归 `missing`，而后续结果集、专门段落、RY-09、AM-113 明确规定 `reviewRootDefect` 对 ENOENT 返回 `null`。验收标准已唯一确定正确实现，因此不计 verdict；建议把第 2 步改成“artifact → missing；review root → null”，减少实现者来回解析。

### A-9 — B3 的结构类括注可补齐新类别

B3 已规定“任何结构类”均不可 force，B7 表与 AM-87 也机械保证该结论；但括注仍未列出新加入的 `not-dir` 和 `io-error`。建议补齐枚举，保持“穷举”措辞与列表外观一致。

VERDICT: no major issues
