# req-review-v5 — archive-preflight requirement review（Round 5）

评审基于静态读取；未运行测试，未修改文件。

## Round-4 findings verification

### REQ-1 — REOPEN

V5 已正确修复 Round 4 指出的三点：

- N2 现在检查 trust roots、待移动 active entry 和既存 archived candidates；
- §六的稳定性前置条件已包含两个 trust roots；
- `resolve.js` 正式进入触及范围，并声明共享 `archiveNamespaceDefect()`，不再要求 readiness 复制 resolver 规则。

但仍有两个阻断问题。

#### 1. 自定义 `--changes-dir` 仍使 B2 的机械保证不成立

State A 允许：

```text
apriori archive --change X --write --changes-dir <arbitrary-dir>
```

N0..N3 检查并移动的是该自定义 root 下的 bundle；随后需求指定的：

```text
apriori gate --change X
```

却只能通过 `resolveChange(cwd, X)` 查询 `<cwd>/apriori/changes`。Gate 没有接受任意 changes root 的参数。

因此，无 force、无并发、N0..N3 全部通过时，仍可出现：

- gate 找不到刚移动的 bundle；
- gate 解析到默认 root 下另一个同名 active/archived bundle。

B2 中带“若 gate 解析到刚移动 bundle”的条件命题仍然为真，但“N 组机械保证该限定词”和 AC-AP-17 的无条件结论仍为假。

#### 2. 共享 predicate 与 resolver 的 active-first 行为仍需钉死

`archiveNamespaceDefect(changesDir,name)` 被定义为同时扫描 active entry 和 archived candidates，而 state A 的 `resolveChange()` 在 active entry 合法时立即返回，根本不检查同名 archived entries。

例如：

- active `X` 是合法真实目录；
- archive 下同时存在一个同名合法-stamp symlink。

State A 会解析 active `X`；若新版 `resolveChange()` 在 active fast path 前直接调用综合 predicate，则会因 archived symlink 报错，改变既有 resolver 行为。这与“既有行为不变”冲突。当前 AC-AP-17f 只禁止 readiness 复制规则，没有验证 resolver 保持 active-first 的短路语义。

风险：**high**。前者使后续 gate 可能检查错误对象；后者可能改变 gate、status 等既有消费者的解析结果。

建议修复：

- 将 B2/AC-AP-17 限定为移动 root 正是 gate 的规范 root `<cwd>/apriori/changes`；或者明确扩展 gate/resolver 接口以解析同一个自定义 root。若不扩接口，自定义 root 路径不得声称获得 post-archive gate 保证。
- 明确 `resolveChange()` 保持 active-first：合法 active 存在时不得因任何 archived-candidate defect 改变结果。
- 可让 resolver 与综合 predicate 共享更小的私有 predicates，而不是在 active fast path 前无条件调用综合扫描。
- 新增验收：
  - 自定义 `--changes-dir` 路径不会被错误纳入 AC-AP-17 的保证，或相应 gate 明确使用同一 root；
  - “合法 active + 同名 archived symlink/非法 stamp directory”仍解析到 active，与 state A 一致。

### REQ-3 — REOPEN

V5 已正确修复：

- AC-AP-13 与 AC-AP-13d 的直接矛盾；
- §9.2 的旧 `--changes-dir` discriminator；
- lexical-inside/realpath-outside 的逃逸情况；
- 显式 archived-bundle delta 的处理。

但两步归属算法只在“词法路径声称位于 bundle 内”时执行 realpath 印证，遗漏了相反方向：

```text
/tmp/delta-link.md
  -> <cwd>/apriori/changes/X/specs/m/spec.md
```

调用：

```text
apriori archive \
  --store apriori/specs/m/spec.md \
  --delta /tmp/delta-link.md \
  --change X --write
```

其词法路径位于 changes root 外，因此按当前表格直接归入“真正的外科手术输入”，不执行 readiness；但 realpath 实际指向正式 bundle `X` 的 delta。若 `X` 是 ABANDONED，它仍可绕过硬禁令写入 store。

这不属于 O9。复制后的文件确实无法归属，但外部 symlink 的目标可由 realpath 机械归属。

风险：**high**。正式 bundle delta 仍有可检测但未检查的 readiness 绕过路径。

建议修复归属算法：

- 对所有 delta 都计算 lexical attribution 和 realpath attribution，而不是只对 lexical-inside 路径求 realpath。
- lexical outside、realpath inside active formal bundle时，选择以下一种明确规则：
  - 归属到 realpath 对应 bundle并执行 readiness；或
  - 将 lexical/realpath 身份不一致一律拒绝。
- 只有 lexical 与 realpath 都不属于任何正式 bundle 时，才视为真正的外科手术输入。
- realpath 落入 archived bundle 时仍按现有规则拒绝。
- 新增 acceptance criterion：外部路径 symlink 到 active ABANDONED bundle delta 时，必须拒绝且不可 force。

## Fresh P1 review

### 1. 目标状态 B 是否清晰、无歧义

**结论：未通过。**

Readiness 判据、force 矩阵、共享 checker 分层及 N2 的对象范围已经清晰。剩余歧义是：

- post-archive gate 保证如何处理任意自定义 `--changes-dir`；
- 综合 namespace predicate 如何保持 resolver 的 active-first 语义；
- lexical-outside/realpath-inside delta 属于 surgery、正式 bundle 还是非法身份。

见 REQ-1、REQ-3。

### 2. 边界、异常及回滚路径是否覆盖

**结论：未通过。**

Artifact 缺失、结构缺陷、读取竞态、move/no-move、commit failure、clock rollback、trust-root mutation 和大多数 symlink 情形均已覆盖。

尚缺：

- archive root 与后续 gate resolver root 不同；
- 合法 active 与坏 archived candidate 并存；
- 外部 symlink 指向正式 bundle delta。

见 REQ-1、REQ-3。

### 3. 是否存在隐含但未声明的状态变化或副作用

**结论：未通过。**

Store 写入、bundle move、dry-run、force 输出及失败原子性均已声明。

仍可能发生两项未正确声明的行为：

- 自定义 root 中的 bundle 被移动后，标准 gate 检查另一个对象或找不到对象；
- 把综合 predicate 放在 resolver active fast path 前会改变 gate、status 等既有消费者的解析结果。

见 REQ-1。

### 4. 验收标准是否均可测试

**结论：未通过。**

现有 criteria 大体均为明确 if/then，但缺少：

- 自定义 changes root 与 gate root 不同的 B2 边界；
- 合法 active 应继续压过坏 archived candidate 的 resolver 回归测试；
- lexical-outside/realpath-inside symlink delta。

AC-AP-17f 只能证明 readiness 没复制规则，不能证明 resolver 的选择顺序不变。

### 5. 是否与 state A 冲突

**结论：未通过。**

- State A 的 archive 接受任意 `--changes-dir`，而 gate 只查询规范 `<cwd>/apriori/changes`。
- State A 的 resolver 在合法 active 存在时不扫描 archived candidates；综合 predicate 若无条件前置会改变这一行为。
- State A 的单文件形式会跟随外部 symlink 读取正式 bundle delta；V5 当前 lexical-first 表格会把它误归为不受 readiness 影响的 surgery。

### 6. lineage 是否声明且符合仓库现实

**结论：通过。**

当前分支为 `brownfield-round2`，HEAD 为 `f415824`；其与 `main` 的 merge-base 及当前 `main` 均为 `235a121`。需求声明的来源分支、产品线和最终目标符合仓库现实。

## Out-of-scope 检查

存在明确的 O1–O9 out-of-scope section。

O9 对真正复制到 bundle 外、机械上无法归属的文件是合理边界；它不能覆盖 realpath 仍明确指回正式 bundle 的 symlink alias。

## Blocking summary

本轮仍有两个阻断项：

- REQ-1：post-archive resolver 保证仍未覆盖自定义 root，且共享 predicate 未钉死 active-first 兼容性；
- REQ-3：外部 symlink 指向正式 bundle delta 仍可绕过 readiness。

两项都属于目标歧义、缺失边界覆盖及 state A 冲突，不是 advisory polish。由于这是 STEP0 cap round，未达到 clean exit，应进入 RUNBOOK 要求的人类 gate。

## Advisories

无新增 advisory。REQ-9 保持 `advisory-acked`。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | AC-AP-15 的充分性承诺不成立：R1/R2/R3 未覆盖 gate 完整 C2/C3/C4 判据 | high | 1 | open |
| REQ-2 | tasks/ledger 缺失及 readiness 文件的 unsafe/unreadable 路径语义未定义 | high | 1 | verified |
| REQ-3 | `--force` 的证据协议和可豁免范围不明确，并可能 force 掉 ABANDONED 硬禁令 | high | 1 | open |
| REQ-4 | 允许 STEP5 归档与 RUNBOOK 的 STEP5→STEP6 状态机及实际 precedent 冲突 | high | 1 | verified |
| REQ-5 | 共享分类器归位、完整共享 API 和 readiness 相对既有 preflight guards 的顺序未定 | med | 1 | verified |
| REQ-6 | readiness 检查到 commit/move 之间的并发修改与 TOCTOU 未覆盖 | high | 1 | verified |
| REQ-7 | B5 与现有 AM-13/AM-46/AM-47 测试及 living spec 冲突，迁移范围未声明 | med | 1 | verified |
| REQ-8 | 共享安全读取 checker 会改变 gate C2/C4 的现有行为，但该 side effect 未声明、未验收 | med | 2 | verified |
| REQ-9 | advisory batch acknowledged (1 item) | low | 3 | advisory-acked |

VERDICT: 2 issues open
