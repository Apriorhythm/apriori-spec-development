# spec-review-v1 — archive-readiness SPEC + DESIGN review（STEP2 Round 1）

评审基于冻结的 req-final、gap report、proposal、design、tasks、三份 spec delta、living store、KB 与实际源码；未修改任何文件。

## 维度 1：spec delta 是否完整忠实表达 requirement

结论：**未通过**，见 SPEC-1、SPEC-5、SPEC-6。其余 RY/AM 行为场景与冻结需求一致。

### SPEC-1 — archive 的 ledger 判据被设计成第二份实现

**描述**

冻结需求和 readiness delta 都要求 gate C4 与 archive R3 使用同一份 predicate。D1.3 却规定：

- 基础层保留 `checkLedger()`；
- archive 为逐条附加 `forceable`，另行使用 `parseLedger + classifyStatus` 重走非法词汇、理由、waive 证据、open、fixed、rejected 等判断。

这不是“同一份代码”，而是两份可能漂移的 ledger 判定。RY-01 只比较最终 bad 集合，不能阻止一个分支以后漏掉某种状态。

同时，`checkLedger()` 自己会裸读 ledger 和 flow-state；若 archive 既调用它又自行遍历，就会重复读取，违背安全层应拥有明确 guard → read → parse 路径的目标。

`readinessOf({bundleDir, name, tier, state, flowText, ...})` 的签名也没有说明谁安全读取并生成 `state`、`tier` 和 `flowText`。两个实现者可能分别选择：

- archiveChange 先裸读，再交给 readinessOf；
- readinessOf 自己 guard/read；
- caller guard 后读取并传入。

这些选择的安全语义不同。

- **风险**：high。R3 可能与 gate 分叉，或在 guard 前/后发生未定义的裸读；状态、tier 与实际已守卫文件也可能不是同一份输入。
- **建议修复**：
  - 让 `readinessOf({bundleDir,name,...})` 明确拥有 flow-state、tasks、ledger 的 guard → read → parse，并从安全读取的 flow-state 唯一派生 state/tier/flowText；
  - 抽出一个结构化的纯函数，例如 `ledgerFindings(rows, flowText, stage)`，由 `checkLedger()` 和 archive 的逐条 blocker 分类共同调用；
  - `checkLedger()` 只负责 state-A 格式化，archive 复用同一 findings，不解析 detail 字符串，也不重新读取文件；
  - design/tasks 明确每个 `readFileSync` 的异常捕获点及已读取文本的复用规则。

### SPEC-5 — AM-111 使用了按需求无效的 revoke 记录

**描述**

AM-111 的 WHEN 使用：

```text
archive-force-revoke tasks
```

但冻结需求、archive Requirement 和 D2 都要求 grant/revoke 后必须有包含 `\w` 的 reason。按规范，这条无理由 revoke 应被忽略，场景却要求它撤销授权。

- **风险**：medium。测试可能把无理由撤销错误实现为有效，直接改变 standing authorization 的状态。
- **建议修复**：给 AM-111 中的 grant、revoke、再次 grant 都写出合法 reason；另加控制，明确无理由 revoke 与无理由 grant 一样无效。

### SPEC-6 — acceptance ID 的绑定清单不闭合，CL-03 还引用了不存在的连续范围

**描述**

存在四个绑定缺口：

1. RY-03、RY-04 有 delta scenario，但 tasks 中没有对应测试任务。
2. AM-99～AM-106 是冻结需求的 acceptance IDs，只有 tasks，没有 scenario，也没有明确声明其为何属于一次性 task-only 验收。
3. CL-03 写成 `AM-74..AM-114`，但 living delta 中不存在 AM-99～AM-106 scenarios；该连续范围发布了并不存在的场景引用。
4. tasks 新造了 `AM-99b`，冻结需求没有这个 ID；仓库此前还专门记录过小写后缀会被 ID matcher 绑定到主 ID，而不是形成安全的子编号。

- **风险**：medium。RY-03/04 可能没有绑定测试；一次性迁移验收与长期 living scenarios 混在同一编号范围内，verify/report 的覆盖含义不再可信。
- **建议修复**：
  - 增加 acceptance binding matrix：每个冻结 ID对应 scenario + test task，或明确的 task-only 理由与机械检查；
  - 给 RY-03、RY-04增加测试任务；
  - 明确 AM-99～AM-106 是一次性迁移/文档验收，不进入 living scenario 范围；
  - 将 CL-03 改为实际存在的范围，例如 `AM-01..AM-98, AM-107..AM-114`；
  - 删除 `AM-99b` 伪 ID，作为 AM-99 的普通子任务描述。

## 维度 2：design 是否唯一且可实现

结论：**未通过**，见 SPEC-1、SPEC-2、SPEC-3、SPEC-4。

### SPEC-2 — D2 给出了互相冲突且会拒绝合法模板的 force parser

**描述**

D2 的首个 regex：

```regex
/(^|[^A-Za-z0-9-])archive-force.../
```

会匹配 `do not archive-force tasks …`，与 AM-110 直接相反。

随后 design 又给出一个额外的“前词白名单”算法。但 canonical 模板是：

```text
- <date> gate⑤ (owner): archive-force tasks — <reason>
```

此时 `archive-force` 的前一个 token 是 `(owner):`，不在白名单 `{条目起始, timestamp, gate①..⑤, note:, decision:}` 中，因此该算法会拒绝需求自己要求用户复制的合法记录。

此外，D2 同时保留 regex、额外前置检查和“简化实现”三种路径，没有声明哪一个是唯一规范。

- **风险**：high。实现可能授权否定句，或使所有 canonical human evidence 都无效。
- **建议修复**：规定唯一解析算法：
  - `gatesEntriesRaw` 明确拆出 `{firstLine, joined, decisionPayload}`；
  - 按 RUNBOOK 的 timestamp + label 前缀语法提取 decision payload；
  - 对 payload 从首字符到末字符完全匹配 `archive-force[-revoke]? <class> <reason>`；
  - 不使用 substring 搜索或“前一个 token”启发式；
  - 用 canonical `gate⑤ (owner):`、多词 label、否定前缀、续行 reason 做机械测试。

### SPEC-3 — `containDefect` 的 ENOENT 哨兵不在类型中，也没有调用点处理

**描述**

D1.2 的函数签名声明：

```text
containDefect → null | escape | io-error
```

算法却新增 `{kind:'enoent'}`。

`artifactDefect` 和 `reviewRootDefect` 又规定“`containDefect` 非 null → 原样上抛（escape 或 io-error）”，没有处理 `enoent`。因此 realpath 阶段出现 ENOENT 时，可能：

- 泄漏一个不在公开结果集里的 kind；
- 被误当结构类；
- 没有进入 artifact 的 missing/ancestor 分支；
- review root 没有按要求返回 null 并交给 ledger leaf。

AM-108/AM-113 只覆盖初始缺失，没有覆盖“lstat 成功、realpath 报 ENOENT”的 B7c 分支。

- **风险**：medium。B7c 明确声明的边界没有唯一实现或验收。
- **建议修复**：把 `enoent` 纳入内部返回类型，并分别规定：
  - artifact 调用点收到它后执行祖先分类并最终返回 `missing`；
  - review-root 调用点收到它后返回 `null`；
  - 增加 artifact/review-root realpath-stage ENOENT 两个场景或测试控制。

### SPEC-4 — RY-01/RY-02 没有 state-A oracle，差分会退化为自比较

**描述**

B2 先让 gate 改为调用 readiness，再运行 RY-01。此时“base 与 gate 比较”实际是同一个函数与自己的 wrapper 比较；即使搬迁时改坏了 detail，两边仍会一致。

RY-02 要求 `runGate()` 与 state A 字节一致，但 B0 只记录“全量测试绿色”，没有保存 state-A 返回对象/detail/error oracle。实现完成后，state A 已不存在，无法执行需求声称的差分。

- **风险**：medium。基础层搬迁最关键的零行为变化保证会由一个恒真的测试代替。
- **建议修复**：在 B0/B1、修改 gate 前，为覆盖 C2/C3/C4 正常及异常路径的固定 corpus 保存 state-A golden outputs；B2 后让 base 和 runGate 分别对该独立 oracle 比较。不要以 refactor 后 gate 调用 base 的结果作为唯一基准。

## 维度 3：delta grammar 与完整性报告

结论：**通过**。

实际 dry-run 结果为：

- `archive-merge applies delta specs to the living store`：`retained 11, added 0`，只 dropped：
  `AM-12 the store commit and the dir move are one transaction (single-file form)`。
  AM-01～AM-11 均保留，没有其他 missing/dropped。
- `high-level archive merges a whole change transactionally`：`retained 10, added 0`，只 missing AM-19 的旧 THEN；新 THEN 是有意的兼容边界重写。
- `single self-contained apriori CLI`：`retained 11, added 0`，missing CL-03 的旧 WHEN 与旧 THEN；两行均由新的不对称 usage/range 文本替换。

MODIFIED 整块语法使用正确，没有其他 Requirement 或 Scenario 静默丢失。

## 维度 4：scenario 可测试性与 acceptance binding

结论：**未通过**，见 SPEC-3、SPEC-4、SPEC-5、SPEC-6。

除这些问题外，RY-01～RY-10、AM-74～AM-98、AM-107～AM-114 的 WHEN/THEN 均可转换成机械测试。

## 维度 5：与 living store / KB / state A 的冲突

结论：**基本通过，但 CL-03 的不存在 ID 范围须按 SPEC-6 修正**。

未发现其他未声明冲突：

- AM-12 是唯一 dropped scenario；
- AM-19 与 CL-03 的 clause rewrite 与新契约一致；
- SECURITY.md、RUNBOOK 双语、concepts 双语、CLI docs、CHANGELOG 和 truth 更新均已列入任务；
- `lib/resolve.js`、status 行为与其 KB 保持 out of scope；
- 其他 single-file CAS、hygiene、transaction promises仍可与“changes root 外手术”并存。

## 维度 6：D6 批次计划是否安全

结论：**未通过**，见 SPEC-7。

### SPEC-7 — B1 的迁移集合不足，B3 又要求在接入前通过端到端场景

**描述**

B1 在 design 表中称迁移“期望 archive 成功”的 bundle，tasks 又进一步缩成“期望 `--change … --write` 成功”。这两种定义都不足。

任何会通过既有 preflight、到达新 readiness 插入点的测试都需要 ready fixture，包括：

- dry-run 成功，例如现有 AM-13；
- programmatic `archiveChange({write:false})`；
- 注入 mid-commit failure 的 AM-15；
- 注入 move failure 的 AM-18；
- integrity-report 成功路径及其他在 readiness 之后才失败的测试。

这些测试的最终预期未必是 success，也未必带 `--write`。若不迁移，它们会提前以 NOT READY 退出，无法测试原来的目标路径。B0 的 61+6 CLI grep 清点还不天然覆盖直接 `archiveChange()` 调用。

此外，B3 只实现三个安全 helper，B4 才实现 `readinessOf` 并接入 archive；但 B3 已要求通过 AM-74～77、AM-112、AM-113 等 archive 端到端场景。没有 B4 接入时：

- AM-75/76/77 不可能证明 archive 使用了 helper；
- AM-112 的“archive success”可能在 helper 完全未接入时假绿；
- 带 `--force` 的结构控制还要等 B5 才具有目标语义。

因此“每批全量绿且该批 acceptance 已落地”不能按当前顺序实现。

- **风险**：high。B4 接入后会出现大面积提前失败；B3 的若干测试还可能在未接线时产生假阳性。
- **建议修复**：
  - B0 清点范围改为所有 CLI 和直接 API 高层调用；
  - B1 的选择条件改为“状态 A 下会越过 readiness 新插入点”，不按 write/success 过滤；
  - B3 只放 helper 级 RY-08/09/10 及纯函数错误注入；
  - readiness/archive 端到端 AM 场景移到 B4；
  - 涉及真实 `--force` CLI 语义的控制移到 B5；
  - 每一批明确哪些 scenario 应首次变绿，避免未接线时的假通过。

## Advisories

### A-1 — producer 对 integrity `! missing` 行数的描述不准确

实际不是“两条 `! missing` 行”，而是三条：AM-19 一条、CL-03 两条。三条均是有意 clause rewrite，不影响 delta 正确性。

### A-2 — `AM-99b` 还会触发仓库既有的小写后缀陷阱

除 SPEC-6 的绑定问题外，该写法也与仓库刚建立的 ID 解析规则相悖。任务子项应使用普通任务编号或文字标签，不应伪装成 acceptance ID。

VERDICT: 7 issues open
