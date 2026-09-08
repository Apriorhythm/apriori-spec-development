# spec-review-v2 — archive-preflight technical review（STEP2 Round 2）

评审基于静态读取；未运行测试，未修改文件。

## Round-1 findings verification

### SPEC-1 — VERIFIED

单文件 move 现在有独立的判定对象：

- `moveBundle = <changes-dir>/<change>` 无条件执行完整 readiness 和 N0..N3；
- formal delta bundle 必须与 moveBundle 为同一目录；
- surgical delta 不再能掩护未就绪或 ABANDONED bundle 的 move；
- AM-66/67、T22b/T22c 覆盖两个原始反例；
- AM-68、D3.4、T17 明确要求同一捕获时间同时进入高层 `:753` 和单文件 `:860`。

原问题已解决。

### SPEC-2 — REOPEN

完整 attribution identity 与 archived alias 修复本身正确：

```text
{root, stage, name, bundleDir}
```

AM-61/T24b 已覆盖 external→archived、active→archived 和同名不同 root。

但仍有两个相关缺口。

#### 1. Normative prose 与 AM-60 对 external symlink 给出相反结果

Archive-merge requirement prose 规定：

> a delta whose two measures agree on one ACTIVE bundle directory SHALL be judged … anything else … SHALL be refused

External symlink 的状态是：

- lexical：不属于 bundle；
- realpath：属于 active X。

两种 measure 并不“agree”，因此上述 prose 要求拒绝；AM-60 与 D3.4b 却要求将它归属到 realpath 对应的 active bundle并执行 readiness。

实现者可以合理地产生两套相反代码和测试。

#### 2. 单个 measure 可能同时匹配多个 changes root

设计假定 lexical attribution 和 realpath attribution 各自产生一个 identity，但 `--changes-dir` 可以是任意路径，并可能嵌套在默认 root 的某个 bundle `specs/` 下。

例如：

```text
default root:  <cwd>/apriori/changes
explicit root: <cwd>/apriori/changes/A/specs/nested
delta:         <explicit-root>/X/specs/m/spec.md
```

同一 delta 同时是：

- 默认 root 下 active bundle A 的 delta；
- explicit root 下 active bundle X 的 delta。

如果实现选择 explicit match，它可检查并移动 X，却消费 A 的 formal delta 而不检查 A；A 若为 ABANDONED，硬禁令再次被绕过。现有“两个 measure 的 identity 不一致”规则捕获不了这个情形，因为歧义发生在单个 measure 内部，而不是 lexical 与 realpath 之间。

风险：**high**。

建议：

- 将 prose 改为明确的允许集合：
  - both none → surgical；
  - lexical none + realpath one active identity → 归属 realpath bundle；
  - lexical 与 realpath 各有一个且为同一 active identity → 归属该 bundle；
  - 其他情况拒绝。
- 每个 measure 应先产生去重后的 candidate identity 集合，而不是直接产生单值：
  - 0 个按上述规则处理；
  - 1 个正常处理；
  - 大于 1 个一律作为 ambiguous attribution 拒绝。
- 规范化后指向同一 root 的不同拼写应先去重，避免 false ambiguity。
- 增加“explicit root 嵌套在 default bundle specs 下、单路径匹配两个 active identities”的拒绝场景和任务。

### SPEC-3 — VERIFIED

D1.3 与 RY-03 现在明确规定 `checkArchiveLedger` 的顺序：

1. `reviewDirDefect(dir)`；
2. ledger leaf 的 `fileReadDefect`；
3. 基础 checker；
4. 捕获读取竞态。

T4b 使用“review symlink 指向 bundle 内、leaf 正常且 contained”的精确反例，足以防止实现退化为只守叶子。原问题已解决。

### SPEC-4 — VERIFIED

AM-19 已收窄为：

- single-file dispatch 保持；
- genuinely surgical 输入保持原行为；
- formal delta 或正式 bundle move 受新 attribution/readiness 契约约束。

D4 也明确把冻结需求 AC-AP-13f 解释为 lexical 与 realpath 均不归属 formal bundle，避免与 AC-AP-13i 生成相反测试。原问题已解决。

## 1. 场景是否覆盖全部可见行为及失败边界

**结论：未通过。**

绝大多数场景已经完整，包括：

- 两条 move 路径的单时间戳；
- moveBundle 与 delta bundle 独立判定及相等约束；
- archived alias；
- review-root 内部 symlink；
- force、read race、custom root、active-first 和 dry-run。

剩余缺口是单个 attribution measure 匹配多个 root 的情形，以及 external symlink 在 prose 与 AM-60 间的相反结论，见 SPEC-2。

## 2. 外部共享状态的 init / runtime update / cleanup-invalidation

**结论：通过。**

两个模块级 seam 现在具有完整、明确的生命周期和 API：

- init：均为 `null`；
- runtime update：
  - `_setClock(fn)`，捕获时恰调用一次；
  - `_setAfterReadinessHook(fn)`，readiness 全部通过后、首次写入前恰调用一次；
- cleanup：所有测试在 `finally` 中复位为 `null`。

T32/T33/T34 与 I10 覆盖 move、no-move、bundle mutation、namespace mutation 和清理。没有引入进程外共享状态。

## 3. 是否冲突 state A 或破坏既有约定

**结论：未通过。**

BASE 层、gate re-export、resolver active-first、single-file `:860`、CAS 基线和既有 preflight 优先级均已正确保护。

剩余冲突来自 state A 允许任意 `--changes-dir`：显式 root 可以与默认 root 嵌套，使一个路径同时满足两个 formal-bundle 布局。设计目前假定每种归属只有一个 identity，见 SPEC-2。

## 4. 是否存在 spec 未设计或 design 未声明的行为

**结论：未通过。**

AM-60 与 D3.4b 已设计 external-symlink→active 的允许路径，但上层 normative prose 将其落入“anything else → refuse”。

同时，design 未定义一个 measure 得到多个 candidate identities 时的 disposition。两者均见 SPEC-2。

其余 spec/design/task 映射完整。M0→M3 的迁移顺序仍正确，新增 AM-66/67/68、AM-61 分支与 RY-03 分支均有对应测试任务。

## 5. Security review

**结论：未通过。**

权限面与外部服务面没有新增问题。唯一剩余安全问题是 ambiguous attribution：

嵌套 changes roots 可让同一 delta 同时属于两个 formal bundles；若实现任意选择一个 identity，可能消费另一个 ABANDONED bundle 的 delta而不检查其 readiness。

这是 correctness/security finding，不能降为 advisory。

## Advisories

### A-1 — Composite predicate 的 spec wording 仍未完全同步

D2.1 的措辞已经修正，但 resolve delta 的 requirement 首句仍称 composite predicate 诊断“所有会令当前 `resolveChange()` 拒绝或选错的结构”，AM-56 仍称它为“the same shared predicate the resolver uses”。

RS-07/D2.2 已明确真实结构：composite 只由 readiness 调用，resolver 与它共享较小 private predicates。因此不阻断执行设计，但建议同步两处 spec prose。

### A-2 — “六行处置表”已成为九行

D3.4b 现在有九个 disposition rows，但 D7 和 I7 仍称“六行处置表”。T24b 已覆盖新增三行，所以不会漏测；建议改称“完整 disposition table”，避免实现清点误读。

### A-3 — 执行体量建议

该 change 确实较大：行为保持型 gate 抽取、resolver 新诊断面、两条 archive 路径、复杂 attribution、force 协议和大量 fixture migration 同时发生。

目前没有证据表明必须拆成多个正式 changes；这些部分共同维护一个 archive-safety invariant，强拆可能产生不可安全落地的中间状态。建议在同一 change 内按可回滚的实现批次提交：

1. fixture migration；
2. readiness BASE 抽取且 gate 行为不变；
3. resolver predicates；
4. archive overlay/N checks；
5. single-file attribution与 moveBundle；
6. force/output/docs。

每批先跑其局部测试和全量回归，再进入下一批。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SPEC-1 | 单文件 `--changes-dir` 的实际 move bundle 未与 delta attribution/readiness 绑定，可移动未就绪或不同 root 的正式 bundle；N0 也未钉死 `:860` | high | STEP2·r1 | verified |
| SPEC-2 | 六行 attribution 表未覆盖 realpath 指向 archived bundle或同名不同 stage 的路径，可经 symlink alias 重用 archived delta | high | STEP2·r1 | open |
| SPEC-3 | `checkArchiveLedger` 设计未要求先执行 `reviewDirDefect`，内部 review-root symlink 可令 archive 与 gate C4 分歧 | med | STEP2·r1 | verified |
| SPEC-4 | AM-19 与 AC-AP-13f 的旧「行为不变」措辞和新增单文件归属场景冲突，会生成相反验收 | med | STEP2·r1 | verified |

VERDICT: 1 issues open
