# spec-review-v2 — archive-readiness SPEC + DESIGN review（STEP2 Round 2）

评审基于冻结需求、修订后的 design/tasks/spec deltas、living store、KB 与实际源码；未修改任何文件。

## SPEC-1 — verified

修复真实且基本完整：

- `ledgerFindings(rows, flowText, stage)` 成为 gate 与 archive 共用的唯一结构化 ledger predicate。
- `checkLedger` 只保留状态 A 的读取与格式化责任。
- archive 不解析 C4 的 detail，也不另行重走 ledger 状态判断。
- D1.3 的公开签名不再接收 `state`、`tier` 或 `flowText`。
- D1.4 明确 `readinessOf` 自己拥有 guard → read → parse，并从同一次安全读取的 flow-state 派生 tier。
- tasks 对共享 predicate、单次读取和依赖边界均有机械验收。

D1.4 标题行残留的 `tier` 参数见 advisory A-3，不足以推翻多处明确的相反规定。

## SPEC-2 — reopened

### 残余缺陷 1：五例验算表与 `\w` 规则直接矛盾

D2 规定 reason 必须含 JavaScript `\w`，但第一条“应授权”记录的 reason 是：

```text
— 还差两项文档
```

Node 的 `/\w/.test('— 还差两项文档')` 为 `false`。因此：

- 按冻结需求和 D2 的 predicate，它不得授权；
- D2 的验算表和 B5-7 却要求它授权。

这是一个无法同时满足的测试合同，不是措辞问题。

### 残余缺陷 2：`forceGrants` 的返回值丢失 AM-109 必需的证据来源

D2 声明：

```text
forceGrants(flowText) → Set<'tasks'|'ledger'>
```

但 `readinessOf.forced[]` 和 AM-109 要求返回生效 grant 的原始 `firstLine`。`Set` 只保留 class，不能指出最后一次有效 grant 对应哪条记录。设计没有规定调用方是否应：

- 再次遍历 `gatesEntriesRaw`；
- 让 `forceGrants` 产生额外副作用；
- 另写一份 last-decision 查找逻辑。

这会让两个实现者产生不同的数据流，并可能重新复制 grant/revoke 判定。

- **风险**：high。实现或测试必须违反 `\w` 规则之一；强制输出也可能引用错误记录或重复实现 parser。
- **建议修复**：
  - 将中文示例改成 reason 内确含 ASCII word character 的合法记录，例如 `— docs 尚未完成`；
  - 让唯一解析函数返回证据，例如  
    `Map<class, {granted, firstLine}>`，并由同一次 last-decision 扫描同时决定授权和保存获胜记录；
  - B5-7/B5-10 直接针对该结构测试，不允许调用方再次推导获胜记录。

## SPEC-3 — reopened

`enoent` 已加入 `containDefect` 的返回类型，两个调用点和 AM-115 也覆盖了单一 realpath `ENOENT`；round-1 的核心缺口已修复。但返回结构仍自相矛盾：

```text
artifactDefect(...) → {..., path, code?}
reviewRootDefect(...) → {..., path, code?}
containDefect(...) → {kind:'escape'} | {kind:'io-error', code}
```

两个调用点却要求对 `escape` / `io-error` “原样上抛”。原样返回会缺少前两个函数契约要求的 `path`。

此外，`containDefect` 要求 root 和 target 的 `realpathSync` 各调用一次，但没有定义两次调用分别失败时的优先级。例如一个返回 `ENOENT`、另一个返回 `EACCES` 时，步骤 2 和步骤 3 同时命中；AM-107/AM-115 都只覆盖单一故障。选择 `enoent` 会在 trivial tier 形成潜在 fail-open。

- **风险**：medium。helper 的实际返回 shape 不唯一；混合错误可能被不同实现分别归为 `missing` 或不可 force 的 `io-error`。
- **建议修复**：
  - 明确调用点返回 `{...containmentDefect, path: p}`，或让 `containDefect` 自身始终携带 `path: target`；
  - 规定两次 realpath 均独立执行一次，并定义混合错误优先级。安全方向应为：存在任何非-ENOENT 时以该 `io-error` 为准，只有所有失败均为 ENOENT 时才返回 `enoent`；
  - 增加一个 ENOENT + 非-ENOENT 的混合故障控制。

## SPEC-4 — verified

修复真实且完整：

- B0-2 明确在修改 `gate.js` 前保存独立的 state-A golden。
- golden 保存返回对象、detail，以及抛错路径的 class/code/message，不保存 stack。
- RY-01 与 RY-02 的任务均以该 golden 为 oracle，而不是以 refactor 后调用同一基础层的 gate 为 oracle。
- B2 后禁止重新生成 golden，关闭了自比较和“更新快照使错误合法化”的路径。

## SPEC-5 — verified

AM-111 的 grant → revoke → grant 三条记录现在都要求合法 reason；无 reason revoke 被明确规定为忽略，并有独立控制。与冻结需求的 append-only、last-decision 和 `\w` 规则一致。

## SPEC-6 — reopened

绑定工作已经大幅补齐，但声称作为权威清单的 D7 仍不闭合：

1. 新增的 AM-115 已有 delta scenario 和 B4-10 测试任务，却不在 D7 的 living-scenario 行中；该行仍写 `AM-107..AM-114`。
2. D7 末尾仍指示 CL-03 使用 `AM-107..AM-114`，而实际 CLI delta 与 B7-2 已使用正确的 `AM-107..AM-115`。
3. RY 测试任务范围写成 `B2-4..B2-8 / B3-4..B3-6`，但 RY-05/06/07 实际位于 B2-9/B2-10/B2-11；B2-4 本身还是接线任务而非验收测试。
4. D7 标题称其只列“冻结需求的 ID”，但表中包含设计阶段新增的 AM-114，同时漏掉同样在设计阶段新增的 AM-115。矩阵的实际集合定义因此也不成立。

- **风险**：medium。执行者按 design 会把 CL-03 回退到 114，或误判 AM-115 没有绑定；矩阵不能作为声明的闭合性证明。
- **建议修复**：
  - 将 D7 定义改为“全部 requirement + design-derived acceptance IDs”；
  - living 行和 CL-03 指示统一改为 `AM-107..AM-115`；
  - 明列 AM-114、AM-115 的来源、scenario、测试任务和首次变绿批次；
  - 把 RY 测试范围修正为实际任务，最好逐 ID 映射而非使用不准确的连续任务范围。

## SPEC-7 — reopened

B1 的迁移判据及 CLI/API 双重清点已修复；archive 端到端与 force 场景也已移到正确的 B4/B5。剩余问题在 RY-03/RY-04：

- tasks 把 RY-03/RY-04 放在 B2-7/B2-8；
- D6c 的 B2 首次变绿清单却完全漏掉二者；
- B2 尚未实现 `readinessOf`，设计也没有定义一个在 B2 实现、随后被 `readinessOf` 强制复用的具名 STEP6 overlay predicate；
- tasks 仅称测试“基础层 + readiness 判据函数”，但这样的生产函数并未出现在 D1 的接口中。

因此 B2 测试只能自行重述 `state['current-step'] === 'STEP6'`，可能在真正的 archive readiness 尚未实现时假绿。AM-115 也未进入 D6c 的首次变绿表。

- **风险**：medium。批次计划再次允许 acceptance 在生产接线不存在时假绿，不能证明 B2/B4 每批验收边界。
- **建议修复**：二选一：
  - 将 RY-03/RY-04 移到 B4，并在 D6c 明确其随 `readinessOf` 首次变绿；或
  - 在 B2 定义并实现一个具名纯函数，由 B2 测试且由 B4 的 `readinessOf` 强制调用。
  
  同时把 AM-115 加入 D6c 的 B4 行。

## 新 issue

无新的独立 issue ID；本轮阻塞项均是 SPEC-2、SPEC-3、SPEC-6、SPEC-7 的修复残余。

## 维度结论

1. **Spec delta 对需求的表达**：未完全通过，见 SPEC-2、SPEC-6。
2. **Design 是否唯一可实现**：未通过，见 SPEC-2、SPEC-3、SPEC-7。
3. **Delta grammar**：通过。复跑 dry-run 得到：
   - AM-01..AM-11：`retained 11, added 0`；
   - dropped 恰为 AM-12；
   - AM-19 一条、CL-03 两条 `! missing`，均为有意 clause rewrite；
   - 没有其他静默丢失。
4. **场景可测试性与 acceptance binding**：未通过，见 SPEC-2、SPEC-6、SPEC-7。
5. **与 living store、KB、state A 的冲突**：除上述内部矛盾外通过，未发现新的未声明产品承诺冲突。
6. **批次计划**：B1 迁移面修复通过；RY-03/RY-04 的 B2 归属仍不安全，见 SPEC-7。

## Advisories

### A-3 — D1.4 标题行残留了已删除的 `tier` 参数

D1.4 写成：

```text
readinessOf({bundleDir, name, tier, ...})
```

但 D1.3、紧随其后的说明和 B4-1 均明确禁止 caller 传 tier。当前多数证据足以确定正确选择，因此列为 advisory；应删除该残留参数，避免 AI 把它恢复进签名。

### A-4 — D2 的示例时间戳不是 RUNBOOK 的规范形态

验算表使用 `2026-08-15T1800`，RUNBOOK 的格式是 `YYYY-MM-DDTHH:MM`。由于合法带 label 的记录仍会通过首个 `': '` 提取 payload，这暂不改变解析结论，但测试语料应改为真实格式，例如 `2026-08-15T18:00`。

### A-5 — golden 的采集入口和可移植 schema 宜再写实

状态 A 只导出 `runGate`，三个 checker 是私有函数。B0-2 所称“运行三个 checker”应明确为从固定 corpus 的 `runGate().checks` 提取 C2/C3/C4，或明确临时采集机制。包含路径的 error message 也应使用稳定占位符或固定相对路径，避免提交者机器的绝对临时目录进入 golden。

VERDICT: 4 issues open