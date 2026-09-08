# spec-review-v3 — archive-preflight technical review（STEP2 Round 3）

评审基于静态读取；未运行测试，未修改文件。

## SPEC-2 verification — REOPEN

身份集合算法解决了 round 2 的两个主要问题：

- lexical 与 realpath 不再被错误要求必须成对一致；external symlink → 单一 active bundle 的 AM-60 路径成立。
- 每个 measure 都检查全部候选 root；单个 measure 同时命中嵌套 root 时会得到多个 active `bundleDir`，AM-69/T24c 要求拒绝。
- 任一 archived identity 优先拒绝，覆盖 direct、external symlink 和 active→archived alias。
- 候选 root 的成员范围已经清楚：canonical default root 加任意显式 `--changes-dir`，不存在第三个隐含 root。

但 disposition 尚未做到“每个输入恰好命中一个结果”，且相等 root 的 identity 规则仍未定义。

### SPEC-2 — disposition 重叠，且相等 root 未定义规范化/去重

**ID:** SPEC-2  
**Risk:** high  
**Status:** BLOCKING

#### 1. Lexical escape 同时命中两个结果

对于“lexical 属于 active X，但 realpath 逃出 X”的输入，identity set 含有 lexical 产生的一个 active `bundleDir`。它同时满足：

- “恰好一个 active `bundleDir` → X 的 readiness governs”；
- “lexically claims a bundle while its realpath escapes → refuse”。

AM-60/T23 表明预期结果是拒绝，但 normative algorithm 没有规定这项安全规则的优先级，也没有把五项写成互斥分区。按表顺序实现会先进入“恰好一个 active bundle”分支；若 X ready，可能继续消费 realpath 指向 bundle 外的 delta。

#### 2. Explicit root 等于 default root 时的 identity equality 未定义

规范要求检查 default root 与显式 root，但没有规定：

- root 是否先按 `path.resolve(cwd, root)` 规范化；
- 等价拼写是否在 Cartesian product 前去重；
- `bundleDir` 的“distinct”按原始字符串、规范化绝对路径还是 realpath 比较。

因此：

```text
default: <cwd>/apriori/changes
explicit: ./apriori/changes
```

可能被实现成两个不同 `{root, …, bundleDir}` identity，甚至因相对/绝对 `bundleDir` 字符串不同而被错误判为 ambiguous。显式 root 包含 default 的一般情形已由集合算法处理；缺失的是“二者实际上相等”的确定语义和场景。

#### Suggested fix

把 disposition 写成有明确优先级的互斥算法，例如：

1. 若 lexical 命中 bundle，而 realpath 无法 corroborate 同一 containment（逃逸或无法解析），拒绝；
2. 否则若集合含任一 archived identity，拒绝；
3. 否则按 distinct active `bundleDir` 数量处理：0 为 surgical、1 为该 bundle、>1 为 ambiguous；
4. 在进入匹配前，将候选 root 规范化为不解引用 symlink 的绝对路径并去重；明确 `bundleDir` equality 使用同一规范化表示。

增加场景和任务：

- `--changes-dir ./apriori/changes`、绝对 default root 及含 `.`/`..` 的等价拼写均只产生一个候选 root，不得 false-ambiguous；
- lexical-active/realpath-escape 明确先于 active-cardinality 分支拒绝。

## 1. 场景是否覆盖全部可见行为及失败边界

**结论：未通过。**

AM-69/T24c 已覆盖嵌套 root 的多 bundle ambiguity，AM-60/T23 也给出了 lexical escape 的正确可见结果。

仍缺少 explicit root 与 default root 等价时的去重场景；同时 lexical-escape 输入在 normative disposition 中命中两个分支。见 SPEC-2。

## 2. 外部共享状态的 init / runtime update / cleanup-invalidation

**结论：通过。**

两个模块级 seam 的生命周期仍然完整：

- init：`null`；
- runtime：
  - `_setClock(fn)` 在 timestamp capture 时恰调用一次；
  - `_setAfterReadinessHook(fn)` 在 readiness 通过后、首次写入前恰调用一次；
- cleanup：测试须在 `finally` 中复位为 `null`。

T32/T33/T34 覆盖 move、no-move、bundle/namespace mutation 及 seam invalidation。六个实现批次均要求全量回归，没有新增共享状态缺口。

## 3. 是否冲突 state A 或破坏既有约定

**结论：未通过。**

以下 state-A 约定已经被正确保护：

- gate BASE 层保留 bare `existsSync` 语义、返回值与稳定错误面；
- gate 继续 re-export `classifyStatus`；
- `resolveChange()` 保留 active-first shortcut，不调用 composite scan；
- 两条 move 路径共用一次 timestamp capture；
- genuinely surgical single-file dispatch 保持原行为。

剩余冲突是等价的相对/绝对 `--changes-dir` 当前属于合法输入；若新算法把它误判成两个 root，会无意新增拒绝。见 SPEC-2。

## 4. 是否存在 spec 未设计或 design 未声明的行为

**结论：未通过。**

Spec、design 和 tasks 已同步采用 identity-set 模型，旧“六行表”和错误 composite-predicate 措辞均已移除。

但 spec 与 design 的五项 disposition 都存在相同重叠，且均未定义 root/bundleDir 的规范化 equality。因此这不是单纯文档润色，而是实现分支和数据模型仍可产生不同结果。见 SPEC-2。

其余声明均有任务覆盖，包括 M1 的 11 文件清点、BASE extraction、resolver predicates、archive overlays、两条 move 路径、force/output/docs 及逐批全量回归。

## 5. Security review

**结论：未通过。**

Archived identity 的 fail-closed 优先级、嵌套 root ambiguity、moveBundle 独立 readiness 和 review-root symlink 均已覆盖。

剩余安全问题是 lexical-active/realpath-escape 同时命中允许与拒绝分支。若实现先采用“恰好一个 active bundle”，可能在 ready bundle 名义下读取 bundle 外的 delta。该 correctness/security ambiguity 不能降为 advisory。

## Advisories

没有新增 advisory。

Round 2 的三项 advisory 均已落实：

- resolve/composite predicate 的 prose 已同步；
- design 与 tasks 已统一使用 set algorithm；
- 六个可回滚实现批次及每批全量回归已写入 design/tasks。

当前无需拆成多个 formal changes；批次边界足以控制执行风险。唯一未解决项 SPEC-2 仍需规范文本修正，属于阻断执行的问题。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SPEC-1 | 单文件 `--changes-dir` 的实际 move bundle 未与 delta attribution/readiness 绑定，可移动未就绪或不同 root 的正式 bundle；N0 也未钉死 `:860` | high | STEP2·r1 | verified |
| SPEC-2 | Attribution disposition 对 lexical-escape 输入同时要求 readiness 与拒绝，且未定义等价 default/explicit roots 的规范化与去重，可能 fail-open 或 false-ambiguous | high | STEP2·r1 | open |
| SPEC-3 | `checkArchiveLedger` 设计未要求先执行 `reviewDirDefect`，内部 review-root symlink 可令 archive 与 gate C4 分歧 | med | STEP2·r1 | verified |
| SPEC-4 | AM-19 与 AC-AP-13f 的旧「行为不变」措辞和新增单文件归属场景冲突，会生成相反验收 | med | STEP2·r1 | verified |

VERDICT: 1 issues open
