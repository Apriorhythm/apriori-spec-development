# design — archive-readiness

> 依据 `requirement/req-final.md` + `gap-report.md` + `proposal.md`。
> **D0 约定（r4·A-3）**：本文件绑定**命名步骤与函数调用**，不以源码行号作为验收接口；
> 行号仅在描述状态 A 时用作定位。

---

## D1 — 新模块 `lib/readiness.js`

### D1.1 基础层（从 `gate.js` 原样搬入，行为逐字节等于状态 A）

```
STEP_ENUM, TIER_ENUM, STATUS_RE
classifyStatus(status)            → {legal, terminal, needsReason, hasReason, isWaived, token}
gatesEntries(flowText)            → string[]
waiveEvidence(flowText, id)       → boolean
checkFlowState(state, name)       → {id:'C3', status, detail}
checkTasks(dir, tier)             → {id:'C2', status, detail}
ledgerFindings(rows, flowText, stage) → [{id, kind:'illegal'|'no-reason'|'no-waive-evidence'
                                             |'open'|'fixed'|'rejected-unconcurred', detail}]
checkLedger(tier, stage, dir)     → {id:'C4', status, detail}   // = 格式化 ledgerFindings 的结果
reviewDirDefect(dir)              → string | null
stepOverlay(state, name)          → null | {class:'legality'|'step', detail}   // D1.5，B2 即实现
```

**唯一的改动**：`reviewDirDefect` 内的 `containsReal` 改取 `require('./resolve').containsReal`
（状态 A 取自 `archive-merge`；破 `archive-merge → readiness → archive-merge` 的环）。
等价性由 **RY-07** 的五例差分证明（该调用形态下 target 恒为 `<dir>/review`，永不等于 root）。

**`gate.js` 侧**：删掉这些定义，改为
`const rd = require('./readiness');` 并在 `module.exports` 中**继续再导出** `classifyStatus`
（`GT-15` 的语料测试在用）。`runGate` 的四个调用点与 `TIER_ENUM.includes(state.tier)` 一并改为
从 `rd` 取。**其余一字不动。**

### D1.2 archive 层（本 change 新写，不复用任何吞异常的 helper）

```
containDefect(root, target)       → null | {kind:'enoent', path} | {kind:'escape', path}
                                         | {kind:'io-error', code, path}      // 非 null 一律带 path（r3·A-2）
artifactDefect(bundleDir, p)      → null | {kind:'missing'|'io-error'|'symlink'|'not-file'
                                           |'escape'|'bad-ancestor', path, code?}
reviewRootDefect(bundleDir)       → null | {kind:'io-error'|'symlink'|'not-dir'|'escape', path, code?}
```

**`containDefect`**（B7c）

1. `realpathSync(root)`、`realpathSync(target)` **各独立调用一次**——
   第一个失败**不短路**，两次都执行完再定结论（SPEC-3）；
2. **混合错误的优先级（SPEC-3）**：只要**存在任何一个非 `ENOENT`** 的失败 →
   `{kind:'io-error', code, path: target}`；**只有当全部失败都是 `ENOENT`** 时 →
   `{kind:'enoent', path: target}`。
   （安全方向：`ENOENT` 会在 trivial 层变成 `n/a` 放行，`io-error` 一律拒绝且不可 force。
   混合时取严的那个，否则一个 `EACCES` 会被同时发生的 `ENOENT` 掩盖成 fail-open。）
3. 都成功 → `real === realRoot || real.startsWith(realRoot + path.sep)`
   ? `null` : `{kind:'escape', path: target}`。

**返回值一律带 `path`（SPEC-3）**：两个调用点对 `escape` / `io-error` 是「原样上抛」，
而 `artifactDefect` / `reviewRootDefect` 的契约要求结果含 `path`。
由 `containDefect` 自己填 `path: target`，调用点无需补。

**`artifactDefect`**（B7a，单趟）

1. `lstatSync(p)` **恰好一次**；
2. 抛错 `ENOENT` → 祖先探测（第 5 步），最终 `{kind:'missing'}`；
3. 抛错非 `ENOENT` → `{kind:'io-error', code}`；
4. 不抛错 → `isSymbolicLink()` → `symlink`；`!isFile()` → `not-file`；
   `containDefect(bundleDir, p)`（SPEC-3 的三分处置）：
   `null` → 干净；`{kind:'enoent'}` → **进第 5 步的祖先探测，最终 `{kind:'missing'}`**；
   `escape` / `io-error` → 原样上抛；
5. **祖先探测**：自 `dirname(p)` 上溯至 `bundleDir`，每次 `lstatSync` 的异常适用**同一分类**——
   `ENOENT` 继续上溯，**非 `ENOENT` 立即 `io-error`**（状态 A 在这里是 `catch { /* keep walking */ }`，
   本层**不得**照抄这个吞法）；遇到 symlink 或非目录 → `bad-ancestor`。

**`reviewRootDefect`**（B7a 的目录分支）

1. `lstatSync(<bundleDir>/review)` 恰好一次；
2. 抛错 `ENOENT` → **`null`**（review 根的缺席不是缺陷；交台账叶子按 tier 判）；
3. 抛错非 `ENOENT` → `{kind:'io-error', code}`；
4. `isSymbolicLink()` → `symlink`；`!isDirectory()` → **`not-dir`**；
   `containDefect`（SPEC-3 的三分处置）：`null` → 干净；
   **`{kind:'enoent'}` → 返回 `null`**（review 根的缺席交台账叶子按 tier 判，与第 2 步一致）；
   `escape` / `io-error` → 原样上抛。

**结构类集合** = `io-error` / `symlink` / `not-file` / `not-dir` / `escape` / `bad-ancestor`
（**六种，全部不可 force**）。只有 `artifactDefect` 的 `missing` 进 tier 敏感分支。

### D1.3 就绪度入口

```
readinessOf({bundleDir, name, force}) → {          // 注意：不接收 state / flowText / tier（SPEC-1）
  ready: boolean,
  blockers: [{ rule:'R1'|'R2'|'R3', class:'structural'|'legality'|'step'|'missing'|'progress'|'format', 
               detail: string, forceable: boolean }],
  forced:  [{ rule, detail, entry }],       // 已被越过的项 + 所引用记录的原始首行
  na:      ['R2'?, 'R3'?]
}
```

**有序求值**（3.1 矩阵）：

```
R1: artifactDefect(flow-state.md)  非 null            → 结构类，停
    parseFlowState 抛错                                 → 结构类，停
    stepOverlay(state, name) 非 null                   → 按其 class 报（legality / step），停
                                                          ← **必须调 stepOverlay，不得重述**（RY-11）
R2/R3: 一次全判，聚合报全
    tasks:  artifactDefect(tasks.md)  → 结构 / missing(tier) / 进度(未勾数)
    ledger: reviewRootDefect(bundleDir) → 结构
            artifactDefect(review/issues.md) → 结构 / missing(tier)
            ledgerFindings(rows, flowText, 'archived') → 逐条按 kind 映射 forceable
```

**判据只有一份（SPEC-1）**：从状态 A 的 `checkLedger` 中抽出**纯函数**
`ledgerFindings(rows, flowText, stage)`，返回**结构化**的逐条 finding（带 `kind`）。

- 基础层的 `checkLedger` = `ledgerFindings(...)` + 状态 A 的格式化（`bad.join('; ')`）——
  **detail 字节不变**（RY-02 覆盖）；
- archive 层**复用同一个 `ledgerFindings`**，按 `kind` 映射 forceable：
  `open` / `fixed` / `rejected-unconcurred` → 进度类（可 force）；
  `illegal` / `no-reason` / `no-waive-evidence` → 格式·证据类（不可 force）。

**archive 既不解析 detail 字符串，也不第二次遍历行，更不重新读文件。**
`ledgerFindings` 是纯函数——不读盘，只吃已解析的 `rows` 与 `flowText`。

### D1.4 谁负责安全读取（SPEC-1）

`readinessOf({bundleDir, name, force})` **自己拥有** guard → read → parse 的全过程
（签名里**没有** `tier` / `state` / `flowText`——r2·A-3）：

```
flow-state: artifactDefect() → readFileSync(捕获异常→结构类) → parseFlowState() → 得到 state / flowText
tier:       一律从上面这份**已安全读取**的 state 派生，调用方不得另传
tasks:      artifactDefect() → readFileSync(捕获) → 计未勾数
ledger:     reviewRootDefect() → artifactDefect() → readFileSync(捕获) → parseLedger()
                                                  → ledgerFindings(rows, flowText, 'archived')
```

- **调用方不传 `state` / `flowText` / `tier`**——签名里去掉这三个参数。
  否则「守卫过的文件」与「用来判断的内容」可能不是同一份。
- 每一处 `readFileSync` 都在**紧邻的 try/catch** 内，异常按 B7a 的 `e.code` 分类为结构类。
- **同一份文本只读一次**：`flowText` 同时供 `checkFlowState`、`ledgerFindings` 的 waive 证据、
  以及 `forceGrants` 使用，不重复读盘。

### D1.5 STEP6 overlay 是一个具名生产函数（SPEC-7）

RY-03 / RY-04 断言「`STEP6` 是 C3 之后的 overlay」与「archive 就绪 ⇒ gate C3 pass」。
v1 把它们放在 B2，但 B2 还没有 `readinessOf`——测试只能**自己重述**
`state['current-step'] === 'STEP6'`，于是**生产代码不存在时也能全绿**。
这与 SPEC-4 刚修掉的自比较是同一种假绿。

因此**在 B2 就实现一个具名纯函数**，放在基础层：

```
stepOverlay(state, name) → null | {class:'legality'|'step', detail: string}
```

1. 先跑 `checkFlowState(state, name)`；非 pass → `{class:'legality', detail: <C3 的原始 detail>}`；
2. 再判 `state['current-step'] !== 'STEP6'` → `{class:'step', detail: …}`
   （`ABANDONED` / `DONE` / 其他合法值各自的措辞）；
3. 皆过 → `null`。

**B4 的 `readinessOf` 的 R1 阶段 SHALL 调用 `stepOverlay`，不得重述该逻辑**——
由 **RY-11** 的静态断言锁住。这样 RY-03 / RY-04 在 B2 测的是**真的生产函数**，
而不是测试里的一句复述。

---

## D2 — `--force` 的证据解析

```
forceGrants(flowText) → Map<'tasks'|'ledger', {granted: boolean, firstLine: string, payload: string}>
```

**返回的是证据，不是集合（SPEC-2 残余 2）**：`Set` 只保留 class，
说不出「最后一次生效的 grant 是哪一条记录」，而 `AM-109` 要求把那条记录的**原始首行**打出来。
若让调用方自己再扫一遍 `gatesEntriesRaw` 找获胜记录，就等于把 grant/revoke 的
last-decision 判定**实现两遍**——这正是 SPEC-1 刚修掉的病。

因此：**同一次 last-decision 扫描既决定授权、也保存获胜记录**，一并返回。
`granted: false` 的条目表示该类最后一条是 revoke（`firstLine` 指向那条 revoke，供诊断用）。
`readinessOf.forced[].entry` 直接取 `firstLine`，**不再推导**。

> **SPEC-2 重写。** v1 的设计给了三条互相冲突的路径（裸 regex / 前置检查 / 「前一个词白名单」），
> 而那个白名单会**拒绝需求自己要求人类照抄的 canonical 模板**——
> `- <date> gate⑤ (owner): archive-force tasks — <reason>` 里 `archive-force` 的前一个词是 `(owner):`，
> 不在白名单内。本节改为**唯一一条确定性算法**，不用 substring 搜索，也不用「前一个词」启发式。

**第 1 步 — 取出条目的三种形态**

```
gatesEntriesRaw(flowText) → [{ firstLine, joined, payload }]
```

`firstLine` = `flow-state.md` 中该条目的**字面首行**（供输出用，AM-109）；
`joined` = 状态 A `gatesEntries()` 的续行拼接结果（基础层行为**不变**）；
`payload` 按下面第 2 步从 `joined` 派生。

**第 2 步 — 从条目正文剥出 decision payload（确定性，三条规则）**

1. 去掉前导的 `- ` 与空白；
2. 若余下文本以**时间戳**开头，去掉它与其后空白。
   规范形态取自 `RUNBOOK.md:213` 的 `<YYYY-MM-DDTHH:MM>`，即
   `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}\s+/`（r2·A-4——v1 写的 `T\d{4}` **匹配不上真实格式**，
   本仓 flow-state 的实际戳是 `2026-08-15T14:25`）；
   为兼容历史写法，同时接受不带冒号的 `T\d{4}`；
3. 若余下文本含 `': '`（冒号+空格），取**第一个** `': '` **之后**的全部文本为 `payload`；
   否则整段余下文本即 `payload`。

**第 3 步 — 对 `payload` 做完全匹配（从首字符到末字符）**

```
/^archive-force(-revoke)?[ \t]+(tasks|ledger)[ \t]+([\s\S]*)$/
```

- 第 2 组是 class，`[ \t]+` 的强制分隔保证 `tasks2` 不匹配（它会整体落进 class 位而不等于 `tasks`）；
- 第 3 组是 reason，必须含至少一个 **`[\p{L}\p{N}]`**（`u` 标志；`step2-amendment` 的修正——
  原写 `\w` 只认 ASCII，会否掉本仓全中文的理由）；
- **`^` 锚定在 payload 首字符**——`do not archive-force tasks …` 的 payload 是
  `do not archive-force tasks …`（无 `': '`），不以关键字开头，**不匹配**。

**逐例验算（AM-110 即验这五条）**

| 条目 | payload | 结果 |
|---|---|---|
| `- 2026-08-15T18:00 gate⑤ (owner): archive-force tasks — 还差两项文档`（**RUNBOOK 规范戳**） | `archive-force tasks — 还差两项文档` | **授权 tasks**（纯中文理由必须通过——`step2-amendment`） |
| `- 2026-08-15T1800 note: archive-force ledger — LS-3 待复核`（**兼容旧戳**） | `archive-force ledger — LS-3 待复核` | **授权 ledger** |
| `- 2026-08-15T1800 gate⑤ (owner): archive-force tasks — ledger cleanup deferred` | 同上形态 | **只授权 tasks**（reason 里的 `ledger` 不授权） |
| `- 2026-08-15T1800 note: do not archive-force tasks — 还没做完` | `do not archive-force tasks — 还没做完` | **不授权** |
| `- 2026-08-15T1800 gate⑤ (owner): archive-force tasks` | `archive-force tasks` | **不授权**（无 reason，第 3 组匹配不到） |

**第 4 步 — 同类以最后一条为准**

按 `gatesEntriesRaw` 的顺序（= 文件顺序）扫描，为每个 class 记住最后一次是 grant 还是 revoke；
revoke 与 grant **适用同一套第 2/3 步规则**（含 reason 必须含 `[\p{L}\p{N}]`——**SPEC-5**）。

---

## D3 — `archive-merge.js` 的接入点

### D3.1 `archiveChange(o)` —— 就绪度插在哪

```
… 既有 preflight 全部守卫（含 --write 的温存文件与归档目的地检查）…
+ const rd = readinessOf({...});                    ← 新增，此处
+ if (!rd.ready) { err.push(...); out.push('\nRESULT: NOT READY — nothing written'); return {code:1,out,err}; }
+ for (const f of rd.forced) out.push(`forced: ${f.detail}`), out.push(`  ${f.entry}`);
  pushIntegritySection(out, err, p.modifiedBlocks, o.idMatcherFactory, cwd);   ← 既有
  if (!o.write) { out.push('\nRESULT: MERGED (dry-run; …)'); return {code:0,out,err}; }
  … stage / commit / move …
```

- **就绪度不被求值**的证明：`AM-83` 用一个计数 seam（`o.ops.readinessProbe` 或注入的
  `readinessOf` 包装）断言既有 preflight 失败路径上调用次数为 **0**。
- **TOCTOU hook**（§六-1）：`o.ops.afterReadiness?.()` 在 `readinessOf` 返回之后、
  第一次 `ops.writeFileSync` 之前触发；`AM-114` 在该 hook 内改动 bundle，
  断言 archive **不重读、不检测**。

### D3.2 `cli(argv)` —— 单文件形式的三道闸

在既有的「`--change` 不能只配 `--store`/`--delta` 之一」校验**之后**、任何文件读取**之前**：

```
if (singleFileForm) {
  if ('--changes-dir' in flags) → exit 2 + usage        (B2a)
  if ('--force'       in flags) → exit 2 + usage        (B3)
  const d = deltaScope(cwd, flags['--delta']);          (B2b)
  if (d.inside) → stderr 诊断 + 高层形式替代命令, return 1
}
```

**`deltaScope(cwd, deltaArg)`**：

1. `deltaAbs = path.resolve(cwd, deltaArg)`；`rootAbs = path.resolve(cwd, 'apriori', 'changes')`；
2. 词法：`deltaAbs === rootAbs || deltaAbs.startsWith(rootAbs + path.sep)`；
3. realpath：两者各 `realpathSync`，**任一失败 → 该量度不产生命中**（不是命中也不是免罪），
   都成功则按同样的段边界判；
4. 任一量度命中 → `{inside:true}`。

**高层形式不受这三道闸影响**（`--changes-dir` 与 `--force` 在高层形式上都合法）。

### D3.3 `USAGE`

```
usage: apriori archive --store <f> --delta <f> --change <name> [--write] [--no-cas]
   or: apriori archive --change <name> [--write] [--changes-dir <dir>] [--no-cas] [--force]
```

单文件行**去掉** `--changes-dir`、**不含** `--force`；高层行**新增** `--force`。

---

## D4 — 依赖图（改后，无环）

```
config.js  ← resolve.js ← status.js ← readiness.js
                  ↑            ↑           ↑    ↑
           archive-merge.js ───┘           │    │
                  ↑                        │    │
           spec-runner.js                  │    │
                  ↑                        │    │
                gate.js ───────────────────┘────┘
           gate.js → archive-merge.js (既有, CHANGE_NAME_RE + containsReal)
```

`readiness.js` 只 require `status.js`（取 `parseFlowState` / `parseLedger`）、`resolve.js`
（取 `containsReal`）与 node 内置模块。**RY-05 / RY-07 / RY-10** 三条静态断言把它钉住。

---

## D5 — spec delta 的三份

| store | 操作 |
|---|---|
| `apriori/specs/readiness/spec.md` | **新模块**，`<!-- apriori-base: new -->`，`## ADDED` 一组 Requirement（RY-01..RY-10） |
| `apriori/specs/archive-merge/spec.md` | `## MODIFIED`：① `archive-merge applies delta specs to the living store` —— **保留 AM-01..AM-11，去掉 AM-12**；② `high-level archive merges a whole change transactionally` —— 新增就绪度场景；③ AM-19 所在块 —— 更新互斥规则。`## ADDED`：`--force` 与单文件作用域两组新 Requirement |
| `apriori/specs/cli/spec.md` | `## MODIFIED`：usage 行场景 |

**CAS**：三份都要 `apriori stamp`。`archive-merge` 当前 base
`sha256:51620e96cd6b3c4a4b1af5e1e0865fd7f55bcf0333ecc47aeca727cf997282c5`（会随 STEP5 的进展变化，
**盖戳在 STEP6 之前重做一次**）。

**MODIFIED 完整性报告是本 change 的验收接口之一**：合并 `archive-merge` 的第 ① 块时，
报告必须恰好打印

```
    ! dropped: AM-12 the store commit and the dir move are one transaction (single-file form)
```

且**没有其他 dropped**（AM-99）。

---

## D6 — 实现批次（SPEC-4 / SPEC-7 重排）

| 批 | 内容 | 可回滚 |
|---|---|---|
| **B0** | ① 全量测试绿基线；② **状态 A golden 采集**（SPEC-4）；③ **迁移面清点**（SPEC-7 的新判据） | — |
| **B1** | fixture 迁移，判据 = 「状态 A 下会**越过 readiness 新插入点**」；补完全量绿 | ✓ |
| **B2** | `readiness.js` 基础层抽出（含 `ledgerFindings`），`gate.js` 改从它取；RY-01/02/05/06/07 | ✓ |
| **B3** | archive 层三个新函数——**只放 helper 级验收**：RY-08/09/10 + 纯函数错误注入 | ✓ |
| **B4** | `readinessOf` + `archiveChange` 接入；**所有 archive 端到端 AM 场景在此首次变绿** | ✓ |
| **B5** | `--force` 全套；**依赖真实 `--force` CLI 语义的控制在此首次变绿** | ✓ |
| **B6** | 单文件形式三道闸 + `deltaScope` + USAGE | ✓ |
| **B7** | 文档、living spec、KB、CHANGELOG | ✓ |

### D6a — B0 的状态 A golden（SPEC-4）

**问题**：B2 之后 gate 改为调用基础层，此时「基础层 vs gate」的差分**退化为自比较**——
搬迁时把 detail 改坏了，两边照样一致，RY-01 恒真。RY-02 同理：状态 A 一旦不存在，就无法比对。

**做法**：**在动 `gate.js` 之前**，用一份固定语料（覆盖 C2/C3/C4 的正常与异常路径，
含抛错路径）采集状态 A 的输出，序列化存成 `test/fixtures/gate-state-a.golden.json`。

**采集入口（r2·A-5）**：状态 A 的 `gate.js` 只导出 `{ runGate, resolveChange, classifyStatus, cli }`
——三个 checker 是**私有函数**，采不到。因此 golden 的唯一入口是
**`runGate(...).checks` 里 id 为 `C2` / `C3` / `C4` 的三项**（连同整个返回对象）。

**schema 的可移植性（r2·A-5）**：诊断文本里含**绝对路径**（如 `tasks.md missing at <abs>`）。
采集时须把语料根目录的绝对路径替换为固定占位符 `<CORPUS>`，比对时对实际输出做同样替换——
否则 golden 会带上采集者机器的临时目录，别人一跑就红。
抛错路径**只存 class/code/message，不存 stack**（搬函数必然改文件名行号）。

- **RY-01 / RY-02 的比对基准是这份 golden，不是 refactor 后的 gate。**
- golden 随本 change 一起提交，B2 之后**不得**重新生成（重新生成等于取消这条保证）。

### D6b — B1 的迁移判据（SPEC-7）

v1 写的是「期望 `--change … --write` 成功」——**不足**。正确判据是：

> **状态 A 下这个调用会执行到 readiness 的新插入点**（即：越过 `discoverDeltas` /
> `buildProjection` / CAS / hygiene / 冲突 / 温存文件 / 归档目的地这一整组既有守卫）。

据此，以下都需要 ready fixture，尽管它们**既不带 `--write` 也不期望成功**：

- **dry-run 成功**的用例（如 AM-13）——它在插入点之后才打 `RESULT: MERGED (dry-run…)`；
- **直接调 `archiveChange({write:false})` 的编程式调用**——实测 `test/archive-change.test.js` 4 处、
  `test/modified-integrity.test.js` 2 处，**CLI 层的 `--change` grep 判据完全抓不到**；
- **在 readiness 之后才注入失败**的用例：mid-commit failure（AM-15 类）、move failure（AM-18 类）；
- integrity-report 的成功路径。

→ B0-3 的清点范围改为 **CLI 调用 + 直接 API 调用两类**，判据按上面这条，不按 write/success 过滤。

### D6c — 每批「首次变绿」的归属（SPEC-7）

| 验收 | 首次变绿的批 | 理由 |
|---|---|---|
| RY-01 / RY-02 / RY-05 / RY-06 / RY-07 | B2 | 基础层与 gate 的关系在此确定 |
| **RY-03 / RY-04** | **B2** | 测的是 D1.5 的具名生产函数 `stepOverlay`——B2 就实现它，因此不假绿（SPEC-7） |
| RY-08 / RY-09 / RY-10 | B3 | 纯 helper 级，不需要接线 |
| AM-74..77 / AM-107 / AM-108 / **AM-115** / AM-112 / AM-113 | **B4** | 它们断言的是 **archive 的行为**；B3 尚未接线，放在 B3 会**假绿** |
| **RY-11** | **B4** | 静态断言 `readinessOf` 调用 `stepOverlay`——`readinessOf` 在 B4 才存在 |
| AM-78..85 / AM-114 | B4 | 接入点本身 |
| AM-86..91 / AM-109..111 | B5 | 需要真实 `--force` 语义 |
| AM-92..98 | B6 | 单文件三道闸 |
| AM-99..106 | B7 | 文档与 living spec |

**B1 必须最先做完**：不先补 fixture，B4 一接入就会让几十个既有测试红成一片，
届时无法区分「新逻辑错了」与「fixture 没就绪」。

---

## D7 — acceptance binding matrix（SPEC-6）

| 冻结需求的 ID | delta scenario | 测试任务 | 说明 |
|---|---|---|---|
> **本表的集合定义（r2·SPEC-6）**：涵盖 **req-final 的全部验收 ID + STEP2 阶段派生的验收 ID**
> （后者目前是 **AM-114**（TOCTOU hook，STEP0·r5 的 A-1 落地）与
> **AM-115**（realpath 阶段的 ENOENT，STEP2·r1 的 SPEC-3 落地），以及 **RY-11**（STEP2·r2 的 SPEC-7 落地））。

| RY-01 | ✓ | B2-5 | 长期 |
| RY-02 | ✓ | B2-6 | 长期 |
| RY-03 | ✓ | B2-7 | 长期；测 D1.5 的 `stepOverlay` 生产函数 |
| RY-04 | ✓ | B2-8 | 长期；同上 |
| RY-05 | ✓ | B2-9 | 长期（静态断言） |
| RY-06 | ✓ | B2-10 | 长期（静态断言） |
| RY-07 | ✓ | B2-11 | 长期（差分） |
| RY-08 | ✓ | B3-4 | 长期（差分） |
| RY-09 | ✓ | B3-5 | 长期（差分） |
| RY-10 | ✓ | B3-6 | 长期（静态断言） |
| **RY-11**（STEP2·r2 派生） | ✓ | B4-2 | 静态断言：`readinessOf` 的 R1 调 `stepOverlay`，不重述 |
| AM-74..AM-98 | ✓ `archive-merge` store | B4..B6 | 长期 living scenario |
| AM-107..AM-113 | ✓ `archive-merge` store | B4 | 长期 living scenario |
| **AM-114**（STEP0·r5 派生） | ✓ `archive-merge` store | B4-21 | TOCTOU hook |
| **AM-115**（STEP2·r1 派生） | ✓ `archive-merge` store | B4-10 | realpath 阶段的 ENOENT |
| **AM-99..AM-106** | **无 scenario（有意）** | B7-1..B7-9 | **一次性迁移/文档验收**：它们断言的是「本次迁移做了某个动作」（去掉 AM-12、改教程、改 SECURITY、写 CHANGELOG），**不是产品的长期行为**。放进 living store 会让 `verify` 的覆盖含义失真。验收方式 = STEP5 的 grep 断言 + STEP6 的 MODIFIED 完整性报告 |

**`AM-99b` 已删除**（SPEC-6 / A-2）——它既不在冻结需求里，写法又踩了仓库刚记录的小写后缀陷阱。
AM-19 的块更新改为 **B7-1 的普通子项**，不另编 ID。

**`cli` delta 的 CL-03 范围改为实际存在的区间**：**`AM-01..AM-98, AM-107..AM-115`**
（原写 `AM-74..AM-114`，其中 AM-99..AM-106 并不存在于 living store；
且 AM-115 是 STEP2·r1 新增的——r2·SPEC-6 指出 v2 的 D7 仍写 `AM-107..AM-114`，已改）。
