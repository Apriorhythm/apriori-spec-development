# req-review-v3 — archive-preflight requirement review（Round 3）

评审基于静态读取；未运行测试，未修改文件。

## Round-2 findings verification

### REQ-1 — REOPEN

V3 的 `>=` 比较方向，对于“静态、结构正常的 archive namespace，且检查和移动使用同一时间戳”这一情形是正确的：

- 既有目录 `< 新目录`：移动后 resolver 选择新目录；
- 既有目录 `= 新目录`：必须在写 store 前拒绝，否则目的地冲突；
- 既有目录 `> 新目录`：必须拒绝，否则 resolver 选择旧目录；
- 因时钟回拨导致新目录排序更早时，同样应拒绝。

但当前要求还没有机械保证其前提，B2 仍存在反例：

1. **检查时间与移动时间没有绑定。** 当前 phase 4 调用 `archiveChangeDir(..., new Date(), ...)`。需求没有要求 preflight 捕获一次 `Date`/stamp 并把同一个值传给最终 move。若检查后发生分钟切换或时钟回拨，preflight 比较的“本次目录名”可能不是实际创建的目录名。
2. **合法 no-move 路径没有“本次将创建的目录名”。** dry-run 或 `--write` 不带 `--changes-dir` 时不会创建 archive 目录；V3 没有说明排序检查跳过还是仍运行。若仍运行，会制造与实际 write 无关的 false block。
3. **resolver 的结构性拒绝未被排序检查覆盖。**
   - `archive/` 是指向 changes 内部的 symlink 时，archive 的 containment 可能允许移动，但 `resolveChange()` 会因 `rootDefect` 拒绝该 root。
   - 任意同名、合法 stamp 形状的 symlink 会使 resolver ERROR，不论它排序早晚。
   - stamp 形状匹配但日期非法的目录也会使 resolver ERROR。
   仅检查“同名 archived directory 的排序”不能保证 gate 真正解析到新 bundle。
4. **同名 namespace 的并发变化没有被 B2 限定。** 另一个进程可在排序检查后创建更晚的 archived entry，或在 move 后、gate 前创建新的 active `<changes>/<name>`；gate 会优先解析 active bundle。现有“不得并发修改该 bundle”不覆盖这些 sibling entries。

建议：

- 在 preflight 捕获唯一的 `archiveDate/archiveBasename`，排序检查与最终 `archiveChangeDir` 必须消费同一个值。
- 排序/namespace 检查只对会移动 bundle 的调用启用；带 `--changes-dir` 的 dry-run执行同一预测，无 `--changes-dir` 的调用跳过。
- 检查 archive root 和所有会影响 `resolveChange()` 的同名 entry，判据与 resolver 对 symlink、stamp legality 和目录类型的处理一致。
- 将稳定性前置条件扩展到该 change 的整个解析 namespace：active entry 与所有同名 archived entries，从 preflight 检查持续到紧随其后的 gate resolution。
- 扩充 AC-AP-17b：同一捕获时钟、分钟边界/检查后回拨、archive-root symlink、较早的同名 symlink、非法 stamp directory，以及排序检查后的 sibling-entry 注入。

### REQ-3 — REOPEN

带 `--changes-dir` 的单文件形式现在正确进入 readiness；waiver matrix、精确 class token 和 `NOTE:` 映射也已修正。

但“是否带 `--changes-dir`”仍不是“是否消费正式 bundle”的充分判据。一个不带该参数的调用仍可直接使用正式 bundle 内的 delta：

```text
apriori archive \
  --store apriori/specs/m/spec.md \
  --delta apriori/changes/X/specs/m/spec.md \
  --change X --write
```

该命令不会移动 bundle，但会把 `X` 的 delta 写入 living store。若 `X` 是 ABANDONED，它仍绕过 readiness，违反“写什么都不进 KB 与 spec store”的硬规则。O4 所称“不带 `--changes-dir` 确实不面向 change bundle”因此并不总为真。

建议将单文件形式分为三类：

- `--delta` 不属于任何正式 bundle：保持外科手术行为；
- `--delta` 实路径位于默认或显式 changes root 下的 `<change>/specs/`，且身份与 `--change` 一致：必须执行该 bundle 的 readiness，不论是否移动；
- bundle 路径与 `--change` 不一致、路径不安全或身份不明：拒绝。

也可直接禁止无 `--changes-dir` 的单文件形式读取正式 bundle 内 delta。复制到 bundle 外、无法再机械归属的输入可明确列为调用方责任/out of scope。AC-AP-13 应增加“无 `--changes-dir` 但 delta 位于 ABANDONED bundle 内”的反例。

### REQ-5 — VERIFIED

V3 已明确：

- `checkFlowState(state,name)` 保持 gate 的完整 C3；
- `checkArchiveFlowState(state,name)` 只叠加 STEP6；
- gate 与 archive 的使用方不同；
- AC-AP-16、16b、16c 分别验证基础层等价、合法非 STEP6 的预期分歧和单向收窄；
- preflight 插入顺序保持现有 guards 优先；
- gate 继续 re-export `classifyStatus`。

该结构可无环实现，且不会误把 gate 的合法步骤集合收窄。原问题已解决。

关于 `containsReal`：不搬迁的结论在 `reviewDirDefect` 的可达调用路径上成立。该函数只在 `review/` 已存在、非 symlink 且为目录时做 containment；此时 target 存在且不等于 bundle root，resolve 版与 archive-merge 版给出相同结果。共享模块当前没有其他需要“允许 target 不存在”语义的调用点。

### REQ-6 — VERIFIED

前置条件现已从首次 readiness 读取持续到调用返回，并分别覆盖：

- dry-run；
- write-without-move；
- move 成功；
- move 失败。

AC-AP-19 的 move/no-move 双覆盖要求也已声明。需求没有再承诺锁、TOCTOU 检测、rollback beyond commit point 或 crash durability。除 REQ-1 所述“解析 namespace 也需稳定”外，原 REQ-6 的时间区间问题已解决；namespace 扩展属于 B2 resolver 保证，记录在 REQ-1。

### REQ-7 — VERIFIED

V3 不再假定只有两个 fixture helper，而是要求实现前穷举所有期望 archive 成功的测试调用，逐一补 ready bundle，并把清点结果落入 tasks.md。结合 AC-AP-20 的全量测试和 AC-AP-16 的反向守卫，足以覆盖此前漏掉的 `config.proj`、`bundleProject`、standalone AM-26/33/34 及 programmatic `archiveChange()` 成功路径。

原问题已解决。

### REQ-8 — REOPEN

“基础层保持 gate 行为、archive 先做安全叠加”在概念上可实现：archive wrapper 先运行 `fileReadDefect`，只有安全时才调用基础 checker；gate 直接调用基础 checker。

但 AC-AP-16d 当前要求 symlink、非文件、read-exception 情形的“结论与诊断文本逐字节一致”。这对 exception 分支没有唯一、稳定的比较对象：

- 当前 `checkTasks`/`checkLedger` 对目录或读取异常可能直接抛出，根本没有 C2/C4 result object。
- CLI 的未捕获错误可能包含 stack trace。
- 将函数从 `gate.js` 搬到 `readiness.js` 会改变 stack 中的文件名和行号，即使错误类型、code 和 message 完全相同，因此不可能保证完整诊断逐字节不变。
- §9.2 也没有给 archive overlay wrapper 确切名称和“安全 guard 必须先于基础层任何读取”的调用顺序；错误顺序会在 overlay 有机会阻断前先跟随 symlink或抛错。

建议：

- 明确导出/内部接口，例如 `checkArchiveTasks`、`checkArchiveLedger`、`readArchiveFlowState`；每个 wrapper 必须先完成 `fileReadDefect`，再调用基础 checker，并捕获 guard 后的读取竞态。
- 将 AC-AP-16d 拆分：
  - 非抛错输入：比较 gate checker 的返回对象和 detail 字节；
  - 抛错输入：比较稳定的 error class/code/message 或进程 exit class，明确排除 stack 文件名、行号；
  - 静态断言 gate 只调用基础层，archive 只通过 safe wrapper。
- 若确实要逐字节比较完整 stderr，则基础 checker 不能搬文件；这会与当前 module-owner 设计冲突。

## Fresh P1 review

### 1. 目标状态 B 是否清晰、无歧义

**结论：未通过。**

主要目标已经稳定，但 resolver 保证仍缺少单一捕获时间、结构性 archive-namespace 对齐及 namespace 并发限定（REQ-1）；单文件形式是否消费正式 bundle 仍不能只由 `--changes-dir` 判断（REQ-3）。

### 2. 边界、异常及回滚路径是否覆盖

**结论：未通过。**

Artifact 和读取异常矩阵已完整，rollback/TOCTOU 承诺也已诚实收窄。剩余缺口是：

- archive root/同名 entry 的 symlink、非法 stamp、active-entry 竞态；
- 单文件直接读取正式 bundle delta；
- gate read-exception 的稳定兼容比较面。

分别见 REQ-1、REQ-3、REQ-8。

### 3. 是否存在隐含但未声明的状态变化或副作用

**结论：未通过。**

两层拆分已经声明“不改变 gate”，但函数搬迁会不可避免地改变未捕获异常的 stack 文本。需求必须明确 stack 是否属于兼容面；当前 AC-AP-16d 同时要求搬迁和完整文本不变，见 REQ-8。

除此之外，store 写入、bundle move、dry-run、force 输出及 test migration 均已声明。

### 4. 验收标准是否均可测试

**结论：未通过。**

- AC-AP-17b 没有钉死检查与 move 共用同一捕获 timestamp，也未覆盖 resolver 的结构性拒绝和 namespace 竞态。
- AC-AP-13 将“不带 `--changes-dir`”等同于“不消费 bundle”，存在直接 bundle-delta 反例。
- AC-AP-16d 对抛错路径的“结论与诊断逐字节一致”没有稳定断言面。

其余 AC 已可直接表达为 if/then。

### 5. 是否与 state A 冲突

**结论：未通过。**

- `archiveChangeDir` 当前在 move 时自行接收 `new Date()`；V3 尚未声明捕获并复用时间的必要行为变化。
- 单文件形式允许任意 delta path，故无 `--changes-dir` 不代表不读取正式 bundle。
- 当前 gate 的读取异常会抛出；函数搬迁后的 stack 无法逐字节保持。

其他 module graph、C3 分层、dry-run migration 与 state A 相容。

### 6. lineage 是否声明且符合仓库现实

**结论：通过。**

当前分支仍为 `brownfield-round2`；其 merge-base 与 `main` 均为 `235a121`，当前 HEAD 为 `f415824`。产品线 v4、目标 main、禁止 v1/v3 的声明正确。

## Out-of-scope 检查

存在明确的 O1–O8。O4 仍需按 REQ-3 从“无 `--changes-dir`”改为“输入不属于正式 bundle”；O7 还需将同名 resolver namespace 的稳定性纳入 REQ-1 的前置条件。其余边界明确。

## Advisories

### A-1 — `containsReal` 的“唯一分歧”应限定到实际调用形态

§1.3 正确记载两份实现还在“target 不存在”时不同；§9.3/处置摘要中的“两份实现只在 `target === root` 一格分歧”若脱离 `reviewDirDefect` 调用前提，字面上不成立。

这不影响“不搬迁”的技术结论，因为 `reviewDirDefect` 在 containment 前已确认 `review/` 存在。建议改成：“在 `reviewDirDefect` 可达的调用形态下，唯一剩余分歧是 target===root，而该形态不会出现。”

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
| REQ-8 | 共享安全读取 checker 会改变 gate C2/C4 的现有行为，但该 side effect 未声明、未验收 | med | 2 | open |
| REQ-9 | advisory batch acknowledged (1 item) | low | 3 | advisory-acked |

VERDICT: 3 issues open
