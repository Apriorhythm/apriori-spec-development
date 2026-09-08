# design — archive-preflight

> 对应 `requirement/req-final.md` 与 `gap-report.md` 的 G1..G12 / R1..R6。行号取自 f415824。
> 不含实现代码，只含结构决定与其理由。

---

## D0 一句话结构

把 gate 的 C2/C3/C4 判据从 `gate.js` 挪进一个**无环可达**的共享模块，
archive 在它**之上叠加**（STEP6 收窄 + 安全读取 + 命名空间检查）并挂在 preflight 末尾。
gate 一行行为不变，archive 变严。

---

## D1 `lib/readiness.js` — 两层

### D1.1 依赖与无环性

```
readiness → { ./status, ./resolve }        status → { ./args, ./resolve }        resolve → { ./config }
archive-merge → { ./args, ./config, ./resolve, ./readiness }
gate          → { …既有…, ./readiness }
```

`readiness` 够不到 `archive-merge`，故 `archive-merge → readiness` **无环**。
`containsReal` 从 `./resolve` 取（gap-report §A4 已实测：本 change 的调用点上两份实现行为一致）。

### D1.2 基础层 —— **就是 gate 今天那一份，一字不改**

搬迁（不是重写）以下符号，`gate.js` 改为 `require('./readiness')` 并**继续再导出** `classifyStatus`：

```
classifyStatus(status)            gatesEntries(flowText)        waiveEvidence(flowText, id)
reviewDirDefect(dir)              checkTasks(dir, tier)         checkFlowState(state, name)
checkLedger(tier, stage, dir)
```

**裸 `existsSync` 的行为一并搬过来**——这是刻意的：换成安全读取会改变 gate 的 C2/C4（REQ-8）。

### D1.3 archive 叠加层 —— 三个 wrapper，**先守卫后读取**

```
readArchiveFlowState(dir, name)   checkArchiveTasks(dir, tier)   checkArchiveLedger(dir, tier)
```

每个 wrapper 的**铁律顺序**：

1. **`checkArchiveLedger` 独有的第 0 步（STEP2·r1 / SPEC-3）**：先跑 `reviewDirDefect(dir)`。
   只守 `review/issues.md` 这个叶子**不等价**——若 `review/` 本身是一个指向 bundle 内另一目录的
   symlink，叶子可能是正常文件且通过 realpath containment，archive 于是放行；
   而 gate 会因 **review root 本身是 symlink** 而 C4 阻断。那正好打破
   「archive 通过 ⇒ gate C4 不 BLOCK」这条核心保证；
2. `resolve.fileReadDefect(dir, <artifact 路径>)` → 有缺陷即返回结构性失败（**不可 force**）；
3. 确认安全后，才调用基础层 checker；
4. 捕获 guard 之后的读取竞态（任何异常归入结构性失败）。

**顺序写反会在 overlay 有机会阻断之前就跟随 symlink 或抛错**——这是本设计最易实现错的一处。

`readArchiveFlowState` 额外叠加 `current-step === 'STEP6'`：

```
checkArchiveFlowState(state, name) = checkFlowState(state, name) 通过 ⇒ 再判 STEP6
```

gate 只用 `checkFlowState`，archive 只用 `checkArchiveFlowState`（AC-AP-16f 静态断言两侧各走各的层）。

### D1.4 就绪度的聚合入口

```
readiness(bundleDir, name, opts) → { ok, failures: [{ class, forcible, detail }] }
```

- `class ∈ { flow-state, tasks, ledger, namespace }`；`forcible` 由 req-final §四的矩阵决定；
- **R1（flow-state）先判**：它决定 tier，而 tier 决定 tasks/ledger 对缺失的判定。
  R1 失败 → **只报 R1**，不对 R2/R3 下结论（编造结论不诚实）；
- R1 通过 → R2、R3 一并求值，一次报全。

---

## D2 `lib/resolve.js` — 一个新导出，短路语义不动

### D2.1 `archiveNamespaceDefect(changesDir, name) → null | { kind, path, detail }`

一次性覆盖：

| 对象 | 判据 |
|---|---|
| 两个 trust root `<changesDir>` / `<changesDir>/archive` | 既有私有 `rootDefect`（symlink / 非目录 / 逃逸） |
| **active 条目** `<changesDir>/<name>` | resolver 的 active-entry 判据：lstat 优先、**非 symlink**、必须是目录、`containsReal` |
| 全部同名归档候选 `<changesDir>/archive/*-<name>` | symlink → defect；非目录 → 跳过（与 resolver 一致）；stamp 形状 + `stampValid` 的 Gregorian 往返 |

> **措辞更正（STEP2·r1 / advisory A-2）**：这个 predicate 诊断的是
> **「active 被移走之后，resolver 将要面对的那个 namespace」**，
> 而**不是**「resolver 今天会拒绝的一切」——后一种说法会让人以为 resolver 自己会调用它。
> 实际关系是：**resolver 与它共享更小的私有 predicates**，综合扫描只由 readiness 调用。

### D2.2 `resolveChange()` 的 active-first 短路 **一字不改**

**绝不**在 active 快路径之前调用综合 predicate。
状态 A 里 active 合法就立即返回、从不看归档条目；若改成先综合扫描，
「合法 active + 同名归档 symlink」这类**今天能正常解析**的项目会开始报错，
波及 gate / status 等既有消费者。

实现方式：resolver 与综合 predicate **共享更小的私有 predicates**，
综合扫描**只在 readiness 侧调用**（AC-AP-17i 守卫）。

---

## D3 `lib/archive-merge.js` — 挂载点与两条绕过口

### D3.1 高层形式：挂在 preflight 末尾

```
:688  const preflightFailures = [...casDenials, ...hygiene, ...casMismatches, ...conflicts];
:689  if (preflightFailures.length) { …既有路径，一字不动… }
      ← 就绪度在此插入
```

**既有 preflight 与就绪度同时失败时，输出既有那一组并按既有路径返回**——就绪度根本不求值（AC-AP-11）。

### D3.2 N0 —— 时间戳只捕获一次

```
:753  archiveChangeDir(changesDir, o.change, new Date(), ops)     ← 现状：phase 4 自己取
   →  preflight 捕获 archiveDate 一次 → 算出 archiveBasename 供 N1 比较
      → 同一个 archiveDate 传给 phase 4
```

不这样做，检查用的目录名与实际创建的目录名之间隔一次分钟切换或时钟回拨就会脱钩。
测试需要一个**时钟 seam** 才能注入这段偏移。

### D3.3 N3 —— 只对会移动的调用求值

带 `--changes-dir` 的调用（**含 dry-run**，它预测同一次移动）跑 N0..N2；
不带 `--changes-dir` 的调用跳过——它不创建归档目录，跑这组只会造假阻断。

### D3.4 单文件形式：**两个**独立对象要判（STEP2·r1 / SPEC-1 更正）

r1 指出 v1 的设计只按 `--delta` 的归属决定就绪度，**漏了它实际会移动的那个 bundle**：
`:860` 的 move 目标是 `<changes-dir>/<change>`，与 delta 归属**互不相干**。两个可达反例：
① 真外科手术 delta + `--changes-dir apriori/changes` → 按 v1 不跑就绪度，却仍会搬走 `apriori/changes/X`；
② delta 归属默认 root 的 X，而 `--changes-dir` 指向另一个 root 的 X → 检查一个、搬另一个。

因此：

1. **`moveBundle = <changes-dir>/<change>`（仅当带 `--changes-dir`）独立成一个判定对象**，
   无论 delta 是不是外科手术输入，它都要过**完整就绪度 + N0..N3**；
2. delta 若归属到某个正式 bundle，其 bundle 目录**必须等于** `moveBundle`，否则拒绝；
3. N0 捕获的那**一个**时间戳，同时喂给 `:753` 与 `:860` 两条 move 路径。

### D3.4b `--delta` 的归属：算**身份集合**，不是两两比对（STEP2·r1/r2 两轮更正）

r2 指出 v1 的九行表有两个毛病：① 我的正文说「两个 measure 必须**一致**」，
而 AM-60 又要求「词法在外、realpath 指向 active X」的外部 symlink **归属到 X**——自相矛盾；
② `--changes-dir` 可以是**任意路径**，因而可以嵌套在默认 root 的某个 bundle 的 `specs/` 之下：

```
default root:  <cwd>/apriori/changes
explicit root: <cwd>/apriori/changes/A/specs/nested
delta:         <explicit-root>/X/specs/m/spec.md
```

同一个 delta 于是**同时**是默认 root 下 bundle `A` 的 delta、和 explicit root 下 bundle `X` 的 delta。
歧义发生在**单个 measure 内部**，两两比对根本抓不到。

**改为集合算法**：对每个 delta，用**两种 measure** × **全部候选 root** 求出一个身份集合，
每个身份是 `{root, stage, name, bundleDir}`。

**候选 root 的规范化与去重（r3 补，r4 更正）**：候选 root = 规范默认 root + 显式 `--changes-dir`。
每个 root **两种形态都要留**：

| 形态 | 用途 |
|---|---|
| 解析后的**绝对实路径** | 身份相等与去重——同一 root 的两种拼法（相对写法、结尾分隔符、经 symlink 的等价路径）塌缩成一个，否则「显式 root 恰好等于默认 root」这种最常见的调用会被自己判成歧义 |
| 它被叫到过的**每一个绝对词法拼写** | 供 **lexical measure** 匹配 |

**只留实路径会造出一条 fail-open 路径（r4）**：lexical measure 刻意**不解 symlink**；
若 changes root 本身是个 symlink（`<cwd>/apriori/changes -> /real/changes`），
而调用方用的是 `<cwd>/apriori/changes/X/specs/delta.md` 这个词法拼写，
去重后只剩 `/real/changes` 时**词法就匹配不上了**——该 delta 于是「谁都不属于」，
按阶梯第 3 条的 0 分支被当成外科手术输入放行；而它的 leaf realpath 明明已经跑出 bundle。
两种形态都留，阶梯第 1 条才能抓住它。

身份之间比较 `bundleDir` 时一律用**解析后的绝对路径**，绝不用调用方的原始拼写。

**处置是一个有序、互斥的阶梯（r3 更正——v2 的五行会重叠）**：v2 里
「词法声称属于某 bundle 而 realpath 出界」与「恰好一个 active bundleDir」**可以同时成立**，
按表顺序实现会先进「恰好一个」分支，于是一个 realpath 已经跑到 bundle 外的 delta 仍被当成干净输入。
改为**第一个命中的规则决定**：

| 顺序 | 规则 | 处置 |
|---|---|---|
| 1 | 词法命中某 bundle，但 realpath **无法印证**同一 containment（出界、或解析不了） | **拒绝**（安全规则，优先级最高） |
| 2 | 否则，集合含**任何** `stage = archived` 的身份 | **拒绝**（不论集合里还有什么） |
| 3 | 否则，数集合里**不同**的 active `bundleDir`：0 → 真外科手术输入；1 → 由该 bundle 的就绪度裁决（name 必须等于 `--change`）；>1 → **拒绝**（歧义） |

---

## D4 `--force`

- 新增 flag `--force`（`withStrict` 的 flags 表加一项）。
- 放行需要 flow-state `gates:` 里**预先存在**的记录，含：
  精确 token `archive-preflight-waiver`（大小写不敏感）+ 失败类精确 token `tasks` / `ledger`
  （边界为非 `[A-Za-z0-9-]`，`tasks-later` / `myledger` 不得命中）。
- 放行输出：`WAIVED (--force): <类> — 依据: <gates 记录首行>` 与
  `NOTE: post-archive gate 的 <C2 | C4 | C2/C4> 将 BLOCK`（**按实际豁免类**精确点名）。
- **绝不**替人类往 flow-state 写任何东西。

---

## D5 dry-run

就绪度失败时 dry-run 报告失败并**不**打印 `RESULT: MERGED (dry-run…)`，退出码 1。

---

## D6 外部共享状态的三个时刻

本 change 不引入进程外共享状态。两个测试 seam（时钟、并发注入点）是**进程内模块级变量**：

| 时刻 | 说明 |
|---|---|
| init | 模块加载时 `null`，回落到 `new Date()` / 无注入 |
| API（advisory A-1 固定下来） | `_setClock(fn)`：`fn() → Date`，preflight 捕获时**恰调用一次**；`_setAfterReadinessHook(fn)`：在就绪度全部通过之后、**首次写入之前**调用一次，测试在其中注入 bundle / namespace 变更 |
| runtime update | 只有测试通过 `_set*` 改写 |
| cleanup | 测试**必须**在 `finally` 里复位为 `null`（沿用 change 1 的 T16b 教训：泄漏会造成同进程顺序依赖） |

**并发前置条件**（req-final §六）：从就绪度首次读取到本次调用返回（含移动时到移动完成），
调用方须保证该 change 的**整个解析命名空间**（两个 trust root + active 条目 + 全部同名归档条目）不被并发改动。
实现**不声称**检测到违反——AC-AP-19 / 17g 用 seam 注入并断言「不声称」。

---

## D6b 实现批次（STEP2·r2 / advisory A-3）

评审方明确**不建议**把本 change 拆成多个正式 change——各部分共同维护同一条 archive-safety 不变量，
硬拆会产生**无法安全落地的中间状态**。取而代之：在同一 change 内按**可回滚的实现批次**推进，
每批先跑其局部测试再跑一次全量回归，然后才进下一批：

1. **fixture migration**（M0..M3）——只补 fixture，不改断言，跑完仍全绿；
2. **readiness BASE 抽取**，gate 行为一字不变（I1/I2 + T1..T7）；
3. **resolver predicates**（I3 + T8..T10）；
4. **archive overlay 与 N 组**（I4..I6 + T11..T21）；
5. **单文件归属与 moveBundle**（I7 + T22..T25）；
6. **force / 输出 / 文档**（I8..I10 + T26..T30 + D 组）。

---

## D7 测试策略要点

| 面 | 手法 |
|---|---|
| 基础层与 gate 同源 | 差分断言：同一批 bundle 喂给基础层与 gate 的 C2/C3/C4（archived），逐项一致（AC-AP-16） |
| 分层不串味 | 静态断言：`gate.js` 不出现 `checkArchive*`/`readArchive*`；`archive-merge.js` 不直调基础层三个 checker（AC-AP-16f） |
| 抛错分支 | 只比稳定面（error class/code/message），**明确排除** stack 的文件名行号（AC-AP-16e） |
| N0 | 时钟 seam 注入「检查后、移动前」的前进/回拨，**高层 `:753` 与单文件 `:860` 两条 move 路径各一**（STEP2·r1 / SPEC-1） |
| 单文件的 move target | 独立于 delta 归属：`moveBundle = <changes-dir>/<change>` 自己要过完整就绪度 + N 组；delta 若归属到正式 bundle，两者必须是**同一个目录**，否则拒绝 |
| N2 | 逐类构造 trust root / active 条目 / 归档候选的缺陷 |
| 归属算法 | **完整** disposition table 逐行（r2 后已从「六行」变成集合算法的五种结果）；含外部 symlink 指向 active ABANDONED bundle、嵌套 root 的歧义集合 |
| 充分性命题 | 归档成功后立刻跑 gate，断言 C2/C3/C4 不 BLOCK；force 版本断言会 BLOCK（反向守卫） |
| 迁移 | 先把 gap-report §A6 的 11 个文件逐条走完，只补 fixture、**不改断言** |
