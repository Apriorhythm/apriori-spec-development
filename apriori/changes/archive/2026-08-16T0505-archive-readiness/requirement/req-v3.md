# req-v2 — archive-readiness：不可逆的归档写入，现在完全不问这个 change 做完了没有

> change: `archive-readiness` · tier: large · track: harden
> lineage: 分支 `brownfield-round2`（自 main@235a121 切出）；产品线 v4，最终目标 main；**禁止**合并到 v1 / v3
> 证据来源：`apriori-in-practice/5.1/Apriori棕地项目使用复盘.md` §5 FN-1 / §8 P0-2，加本仓源码实证
> 前身：`apriori/changes/archive-preflight/`（current-step: SUPERSEDED）
> **本版处置 STEP0·r2 重开的 3 条（REQ-1 / REQ-2 / REQ-6）**；r2 已 verified 的 REQ-3/4/5/7 不再改动。
> 处置说明见 §八·2（本版）与 §八（r1）

---

## 〇、收窄主张的现状（r1 已判，本节按判定重写）

评审方 r1 对 v1 §零 的三条断言逐条判定：

| 断言 | r1 判定 | 本版处置 |
|---|---|---|
| 1. 收窄不违反 advisory A-3 | **成立** | 保留；但 A-3 的**准确结论**是「不必重建 G2/G3，**必须恢复 G1 里前身已验证过的安全读取与 force 分类**」——v1 把它们随收窄一并删掉了，这是错误。见 B7 与 B3。 |
| 2. G3 可整体放弃 | **成立** | 保留。条件：需求**不得**声称 post-archive gate 的充分性（本版全文无此语句），且 F-2 / F-4 必须保有独立追踪入口（见 §五-7）。 |
| 3. 单文件收窄的成本可接受 | **不成立** | **撤回**。v1 的「全仓 19 处、全部在 test」是**只量了 `test/` 却写成「全仓」**——生产方的测量错误。真实迁移面见 §1.6，并入验收标准 §四。**本断言在 owner 于 gate④ 接受这项破坏性变更之前，不再作为成立的前提使用。** |

**r2 补充：生产方在 v2 §八 提出的两点，评审方逐条判定——**

| v2 的主张 | r2 判定 | 本版处置 |
|---|---|---|
| concepts 教程命令同时触发 B2a/B2b，比一般陈旧 usage 更重 | **确认** | 保留 AM-101 |
| AM-12 变为空洞 | **确认** | 保留该事实 |
| 因此应对 AM-12 用 `## REMOVED` | **反驳，且成立** | **改正**：AM-12 是 **Scenario** 不是 Requirement，delta 语法的 `REMOVED` 作用于整个 `### Requirement:` 块。经实测，AM-12 所在块是 `archive-merge applies delta specs to the living store`，含 **AM-01..AM-12 共 12 个场景**——用 `REMOVED` 会把仍然有效的 AM-01..AM-11 一并 deprecated。见 §1.8 与改写后的 AM-99。 |
| `SECURITY.md` 无需修改 | **反驳，且成立** | **撤回生产方的反驳**。`SECURITY.md:10` 的**末句**（v2 的测量被 250 字符截断而漏读）原文为 “Explicit operator-given file arguments (single-file `archive --store <f> --delta <f>`, `stamp <file>`) are used as given, like any file tool.”——这正是对单文件形式的显式承诺，B2b 与之直接冲突。AM-106 改为**修改** SECURITY.md。 |

---

## 一、问题（状态 A，全部可复现）

### 1.1 `apriori archive` 从来没有读过 change bundle 的任何流程文件

```
$ grep -n "flow-state\|tasks\.md\|ledger" lib/archive-merge.js
860:      console.log('\nCONFLICTS (stop — open a ledger issue, human resolves):');
```

唯一命中是一句提示文本中的 "ledger" 一词。**零判据。**
`apriori archive --change X --write` 会在 X 仍在 STEP2、`tasks.md` 还有 45 项未勾、
ledger 还有 `open` 行的情况下，把它的规格增量并进 living store，并把目录移进 `archive/`。
这是**不可逆写入**（写规格库 + 移目录）。

### 1.2 这不是假想

复盘 §5 FN-1：一次归档时 `tasks.md` 是 6 项 `[x]` / 45 项 `[ ]`，无人拦下。
FN-1 的直接原因（gate 缺 `test-cmd` 时整体不启动）已由本分支的 `gate-degrades` 修好——
但 **gate 是事后检查**：归档已经发生了。`gate-degrades` 让人**知道**出了事，本 change 让它**不发生**。

### 1.3 单文件形式是同一个洞的第二个入口（前身 F-1，已实证）

`lib/archive-merge.js` 的单文件路径：带 `--changes-dir` 时**同样会移动**正式 bundle；
**不带**该 flag 时 `--delta apriori/changes/X/specs/foo/spec.md` **照样把内容写进 store**。

### 1.4 判据现在住在哪里

| gate | 函数 | 行 | 判什么 |
|---|---|---|---|
| C3 | `checkFlowState(state, name)` | `:28` | 五个必填键存在且非占位符、`change` 与名字一致、`current-step` ∈ `STEP_ENUM`、`tier` ∈ `TIER_ENUM` |
| C2 | `checkTasks(dir, tier)` | `:40` | `/^\s*-\s\[\s\]/gm` 计数；缺文件时 trivial → `n/a`，其余 → `blocked` |
| C4 | `checkLedger(tier, stage, dir)` | `:96` | 逐行 `classifyStatus`；`stage === 'archived'` 时额外要求终态 |

辅助：`classifyStatus`（`:56`，**已导出**）、`gatesEntries`（`:75`）、`waiveEvidence`（`:91`）、
`reviewDirDefect`（`:128`，**私有**）、`STEP_ENUM`（`:18`，**含 `ABANDONED` 与 `DONE`**）、`TIER_ENUM`（`:20`）。

**C3 判「词汇表合法」，不判「可以归档」**——`ABANDONED` 能通过 C3。

### 1.5 状态 A 的读取安全现状（r1·REQ-1 的实证）

- `checkTasks`（`:41`）用 **裸 `fs.existsSync` + `fs.readFileSync`**，无 symlink / 类型 / 逃逸判断。
- `checkLedger`（`:97`）同样裸读 `review/issues.md`；它的结构守卫 `reviewDirDefect` 是 **gate 在别处调用的**（C4/C5 共用的 review 根守卫），**不在 `checkLedger` 内部**。
- `checkFlowState` 接的是**已解析好的 state 对象**，读取发生在调用方。
- `lib/resolve.js:134` 已有 **`fileReadDefect(bundleDir, p)`** 并**已导出**（`:158`），
  返回 `{kind: 'missing'|'symlink'|'not-file'|'escape'|'bad-ancestor', path}`；`lib/status.js:9` 已在用。
  → 结构类判定（symlink / not-file / escape / bad-ancestor）**可以复用**。
  **但它不能兑现权限语义**（r2·REQ-1）：`:136` 的 `catch` **不检查 `e.code`**，
  任何 `lstatSync` 异常（`EACCES` / `EIO` / …）都落进 `missing` 分支；祖先探测的 `catch`（`:141`）同样吞掉全部异常。
  `reviewDirDefect`（`gate.js:131`）的 `catch { return null; }` 亦然——把「读不到」当成「不存在」。
  → **archive 安全层必须自己做错误分类**，见 B7a。
- `reviewDirDefect` 用的 `containsReal` 是 **`gate.js:13` 从 `archive-merge.js` 引入的那一份**。
  若「原样搬入」`readiness.js`，就会形成 `archive-merge → readiness → archive-merge` **环**（r2·REQ-1）。
  本仓有**两份** `containsReal`：`resolve.js:41`（要求 target 已存在）与 `archive-merge.js:277`
  （容忍不存在路径、且排除「等于根」）。前身实测：二者**只在 `target === root` 一格分歧**，
  而 `reviewDirDefect` 的 target 恒为 `<dir>/review`，**永不等于 root** → 在该调用形态下行为一致。
  → `readiness.reviewDirDefect` **必须取 `resolve.containsReal`**，并以差分测试证明该调用域内与状态 A 一致。
- 附带发现（advisory，不在本 change 处理）：`resolve.js:153` 与 `:154` 是**完全相同的两行**
  `if (!containsReal(bundleDir, p)) return { kind: 'escape', path: p };`——重复的死代码。

**gate 的裸读对 gate 自己是可接受的**（gate 只报告，不写）；对 **archive 不可接受**（archive 不可逆写入）。
这正是需要**两层**而不是一层的理由。

### 1.6 单文件收窄的真实迁移面（r1·REQ-6，v1 漏报，本版补全）

全仓 `--delta` 命中 **38 处**（排除前身目录）：

| 类别 | 处数 | 文件 |
|---|---|---|
| 测试 | 19 | `test/archive-merge.test.js`(12) `test/archive-change.test.js`(5) `test/resolve.test.js`(1) `test/cli.test.js`(1) |
| 实现 | 5 | `lib/archive-merge.js` |
| **活跃文档** | **7** | `docs/concepts.md` `docs/concepts_cn.md` `docs/cli.md` `docs/cli_cn.md` `RUNBOOK.md` `RUNBOOK_cn.md` `SECURITY.md` |
| **living spec** | **7** | `apriori/specs/archive-merge/spec.md`(5) `apriori/specs/resolve/spec.md`(1) `apriori/specs/cli/spec.md`(1) |

**两处比 r1 描述得更重：**

1. `docs/concepts.md:553-555`（与 `docs/concepts_cn.md:553-555`）——**入门教程的 STEP6 归档命令**：

   ```shell
   apriori archive --store apriori/specs/mini-kv.md \
     --delta apriori/changes/add-mini-kv/specs/mini-kv.md \
     --change add-mini-kv --changes-dir apriori/changes --write
   ```

   它**同时**触发 B2 的两条判据（带 `--changes-dir`，且 delta 在 changes root 内）。

2. `apriori/specs/archive-merge/spec.md:48` 的 **`AM-12`**：

   > WHEN the single-file form `apriori archive --store <f> --delta <f> --change <name> --write --changes-dir <dir>` runs and the change-dir move fails

   B2 之后，单文件形式**不再接受 `--changes-dir`**，因此**永不移动目录**——
   AM-12 的 WHEN 子句失去主语，该场景**变为空洞**。这不是文档更新，是 **living spec 的 `## REMOVED` 操作**。

`AM-19`（两种形式互斥）与 `apriori/specs/cli/spec.md:13`（usage 行）需 MODIFIED；
`SECURITY.md:10` 只描述「由 change name 派生的路径」，**不涉及**单文件形式，经核**无需修改**（r1 此条不成立，见 §八 REQ-6 的处置）。

### 1.8 delta 语法的操作粒度是 Requirement 块，不是 Scenario（r2·REQ-6，实测）

`AM-12` 位于 `apriori/specs/archive-merge/spec.md:48`，其所属 Requirement 块为
**`### Requirement: archive-merge applies delta specs to the living store`**（`:1`），
该块含 **`AM-01` … `AM-12` 共 12 个场景**。

delta 的 `## REMOVED` / `## MODIFIED` 都以**整个 `### Requirement:` 块**为单位
（`## REMOVED` 保留块并标 `deprecated (superseded by <change>)`，块内 scenario 停止被 `verify` 要求）。
**不存在 scenario 级的 REMOVED。**

→ 对 AM-12 用 `## REMOVED` 会把仍然有效的 **AM-01..AM-11 一并弃用**。
正确操作是 `## MODIFIED` 整块、保留 AM-01..AM-11、只去掉 AM-12，
并由 **MODIFIED 完整性报告**打印 `! dropped: AM-12` 作为机械证据。

### 1.9 `SECURITY.md:10` 确实承诺了单文件形式（r2·REQ-6，生产方的反驳被推翻）

该行**末句**原文：

> Explicit operator-given file arguments (single-file `archive --store <f> --delta <f>`, `stamp <file>`)
> are used as given, like any file tool.

B2b 让一部分 operator-given 的 `--delta` 不再 "used as given"。**这是直接冲突**，须同步该文档。
（v2 §八 断言此处无需修改，系生产方读取被截断所致的错误，本版撤回。）

### 1.7 `--force` 今天不存在

`USAGE`（`:790`）无 `--force`；今天向 archive 传 `--force` 会因 unknown flag **exit 2**（`withStrict`）。

---

## 二、目标状态 B

### B1 — 就绪度：三条判据，与 gate 同源

`apriori archive --change <name>`（dry-run 与 `--write` 皆然）在合并结果落盘之前判定：

- **R1 步位**：flow-state 通过 C3 的全部合法性检查，**且** `current-step` 恰为 `STEP6`。
- **R2 任务**：`tasks.md` 零个未勾选框；缺文件时 trivial 层 n/a，medium/large 层不就绪。
- **R3 台账**：`review/issues.md` 按 **`stage = 'archived'`** 判；缺文件时 trivial 层 n/a，medium/large 层不就绪。

三条判据与 gate 的 C3 / C2 / archived-C4 **由同一份代码实现**（新增 `lib/readiness.js`，gate 改为从它取）。

### B7 — 安全读取层：archive 独有的一层，gate 一字不变（r1·REQ-1）

**两层结构，职责分明：**

- **基础层**（`lib/readiness.js`）：`checkFlowState` / `checkTasks` / `checkLedger` / `classifyStatus` /
  `gatesEntries` / `waiveEvidence` / `reviewDirDefect` / `STEP_ENUM` / `TIER_ENUM` 原样搬入，
  **行为逐字节等于状态 A 的 gate**（含裸读）。gate 改为从这里取，对外零变化。
- **archive 层**（`lib/archive-merge.js` 侧）：在调用基础层**之前**，对每个 artifact 跑
  `fileReadDefect(bundleDir, p)`（`lib/resolve.js:134`，已导出）；台账另需**先**跑 `reviewDirDefect(bundleDir)`
  再判叶子文件。

#### B7a — 错误分类：只有真正的 `ENOENT` 才算「缺失」（r2·REQ-1）

`fileReadDefect` 与 `reviewDirDefect` 的 `catch` **都不看 `e.code`**（§1.5），
因此「复用既有 helper」**无法**兑现权限语义：`EACCES` 会被报成 `missing`，
在 trivial 层被判 `n/a`，archive 继续写入——**这是一个 fail-open**。

archive 安全层 SHALL 在调用 helper **之外**自行分类：

1. 对每个 artifact（含 `review/` 根）先做一次 `fs.lstatSync`；
2. 抛错且 **`e.code === 'ENOENT'`** → 交由 helper 走 tier 敏感的「缺失」分支；
3. 抛错且 `e.code` **不是** `ENOENT`（`EACCES` / `EIO` / `ELOOP` / `ENOTDIR` / …）
   → **结构类**，不就绪，**不可 force**，诊断含原始 `e.code`；
4. 不抛错 → 交由 helper 判 symlink / not-file / escape / bad-ancestor；
5. `realpath` 在本层若被使用，适用同一分类规则。

**基础层不做这件事**——它必须保持状态 A 的 gate 行为（RY-06）。

#### B7b — `containsReal` 的取用（r2·REQ-1）

`readiness.reviewDirDefect` SHALL 使用 **`require('./resolve').containsReal`**，
**不得**使用 `archive-merge.js` 的那一份——后者会形成
`archive-merge → readiness → archive-merge` 的环。
两份实现只在 `target === root` 一格分歧，而此处 target 恒为 `<dir>/review`，
故在该调用形态下行为一致（§1.5），须以差分测试证明（RY-07）。

**artifact × 缺陷类 × tier 判定表**（穷举）：

| artifact | `fileReadDefect` 结果 | trivial | medium / large |
|---|---|---|---|
| `flow-state.md` | `null`（干净） | 继续判 C3 + STEP6 | 同左 |
| `flow-state.md` | `missing` | **不就绪·R1·结构类** | 同左 |
| `flow-state.md` | `symlink` / `not-file` / `escape` / `bad-ancestor` | **不就绪·R1·结构类** | 同左 |
| `tasks.md` | `null` | 继续判 R2 | 同左 |
| `tasks.md` | `missing` | **R2 = n/a** | **不就绪·R2·进度类** |
| `tasks.md` | `symlink` / `not-file` / `escape` / `bad-ancestor` | **不就绪·R2·结构类** | 同左 |
| `review/`（目录） | `reviewDirDefect` 非空 | **不就绪·R3·结构类** | 同左 |
| `review/issues.md` | `null` | 继续判 R3 | 同左 |
| `review/issues.md` | `missing` | **R3 = n/a** | **不就绪·R3·进度类** |
| `review/issues.md` | `symlink` / `not-file` / `escape` / `bad-ancestor` | **不就绪·R3·结构类** | 同左 |
| 任一 | 守卫通过后 `readFileSync` 抛错（竞态/权限） | **不就绪·结构类**，诊断含原始 `e.code` | 同左 |

**结构类一律不可 force**（B3）。`flow-state.md` 缺失在 **trivial 层也是结构类**——
因为无法排除这是一个 ABANDONED 的 change，而 R1 的存在理由就是这条排除。

### B2 — 单文件形式：不再触碰 change bundle（r1·REQ-5 重写为可实现的算法）

**用一句话陈述目标：单文件形式失去移动 bundle 的能力，也不再消费 bundle 内的 delta。**

**B2a — `--changes-dir` 不再与单文件形式兼容。** 二者同时出现 → exit 2 + usage
（与既有的「`--change` 不能只配 `--store`/`--delta` 之一」同类）。
**推论：单文件形式此后永不移动任何目录**（移动本就只在 `--changes-dir` 显式给出时发生）。

**B2b — `--delta` 落在规范 changes root 内 → 拒绝。** 算法（穷举、可直接实现）：

1. `deltaAbs = path.resolve(cwd, <--delta 实参>)`（`path.resolve` 已规范化 `.` 与 `..`）。
2. `rootAbs = path.resolve(cwd, 'apriori', 'changes')`。**只有规范 root**——显式 root 已被 B2a 吃掉。
3. **词法量度**：`deltaAbs === rootAbs || deltaAbs.startsWith(rootAbs + path.sep)`。
   用**路径段边界**，不用裸字符串前缀 → `apriori/changes-other/...` **不命中**。
4. **realpath 量度**：对 `rootAbs` 与 `deltaAbs` 各取 `fs.realpathSync`；
   - 任一取 realpath 失败（不存在 / 悬空 / 权限）→ **该量度不产生命中**（不是命中，也不是免罪），
   - 两者都成功 → 按第 3 步同样的段边界判定。
5. **两个量度任一命中即拒绝。** 皆不命中 → 落入既有行为（若 delta 本就不存在，仍由既有的
   「delta 文件读不到」错误按状态 A 报，退出码不变）。

**词法量度必须保留**：root 自身是 symlink 而调用方用词法路径书写时，realpath 量度会失配。
**realpath 量度必须保留**：外部 symlink 指向 bundle 内 delta 时，词法量度会失配。

**时机措辞（r1·REQ-5）**：判定发生在**读取 store 或 delta 的内容之前**；
作用域判定本身所需的路径元数据读取（`path.resolve` / `realpathSync` / `lstat`）**不在此限**。

**诊断必须给出替代命令**：`use the high-level form: apriori archive --change <name> [--changes-dir <dir>] [--write]`。

**不落在 changes root 内的 `--delta`**（真正的单模块手术）——除 B2a 外行为不变（见 B5 的精确表述）。

### B3 — `--force`：可 force 的类别是穷举的，且需要预存的人类证据（r1·REQ-2 / REQ-3）

**可 force（进度类，穷举）：**

- R2：`tasks.md` 存在且有 N 个未勾选框；
- R3：台账行 status 为 `open`、`fixed`、或**带理由的** plain `rejected`（即 `classifyStatus` 判 `legal && hasReason`）。

**不可 force（穷举）：**

- **R1 的任何情形**（含 `ABANDONED`——RUNBOOK §283 的硬规则在代码层**没有旁路**）；
- 任何**结构类**（B7 表中的 symlink / not-file / escape / bad-ancestor / 守卫后读取异常）；
- **artifact 缺失**：medium/large 层缺 `tasks.md` 或缺台账；
- 台账行 status **不在词汇表内**（格式问题，不是进度问题）；
- `rejected` / `rejected-verified` / `waived` **缺理由**；
- `waived` **缺 `gates:` 人类记录**——`--force` **不能**代替 waive 证据。

**人类证据协议（r2·REQ-2 重写——按类绑定，且如实命名其有效期）**：

`--force` 对某一类失败生效的前提是，bundle 的 `flow-state.md` 的 `gates:` 段里**预先存在**
一条**按类具名**的记录：

```
archive-force tasks   <reason>
archive-force ledger  <reason>
```

- **类 token 必须精确匹配**：`archive-force` 与其后的类名各自按
  `(^|[^A-Za-z0-9-])<tok>([^A-Za-z0-9-]|$)` 判边界（`archive-force-2` / `tasks2` 均不命中）。
- **一条记录只授权它列出的那一类**。要同时越过 R2 与 R3，需要两条记录（或一条同时列出两个类名）。
- **理由必须含至少一个 `\w` 字符**（`archive-force tasks —` 不算理由）。
- **有效期，如实陈述**：该记录是**该类在本 bundle 生命周期内持续有效的授权**（standing），
  **不是**「本次运行」的证据——文件内容无法证明「本次」。
  记录写下之后新出现的同类失败**会被同一条记录覆盖**，直到该记录被显式删除。
  **这是本协议已知的弱点，须在 gate④ 如实呈报**；不把它包装成 per-run 证据。
- **来源的准确表述**：该条目**记录一项先前的人类决定**（RUNBOOK 的机制是人类作决定、
  agent 把其原话记进 flow-state）；文件本身**无法证明作者身份**。
  它的作用是让 force 需要一次**独立于本次运行的、可审计的书面动作**，而不是身份证明。
- 证据缺失时 `--force` **无效果**，archive 仍拒绝，并打印一段**可复制的模板**
  （形如 `  - <date> gate⑤ (owner): archive-force tasks — <your reason>`）——
  **不声称**打印人类尚未写下的理由全文。

**输出格式**：force 生效时逐条打印被越过的项，一项一行，前缀 `forced: `；
随后打印所引用的每条 `gates:` 记录的 **原始首行**（`flow-state.md` 中的字面文本，
**不是** `gatesEntries()` 拼接续行后的规范化文本）。**不打印笼统的一句 "forced"。**

**dry-run 与 write 的关系（r1·REQ-2 的矛盾修正）**：
`--force` 在 dry-run 与 `--write` 中**同样改变就绪度结论**；**只有 `--write` 产生磁盘副作用**。

**单文件形式与 `--force`（r1·REQ-3）**：`--force` **只出现在高层 usage**；
单文件形式收到 `--force` → **exit 2 + usage**。这是 B5 的**唯一一处**兼容性例外，见 B5。

### B4 — dry-run 说的就是 `--write` 会做的

未就绪时 dry-run **不得**打印 `RESULT: MERGED (dry-run…)`，退出码 1，零写入。

### B5 — 零变化的精确边界（r1·REQ-4 / REQ-3）

- **既有 preflight 失败**（`discoverDeltas` 错误 / `buildProjection` validation / CAS 拒绝 / hygiene /
  base 失配 / 同 ID 冲突 / `--write` 的预存温存文件 / 显式 root 的归档目的地包含性）时：
  诊断与退出码**一字不变**，且就绪度**不被求值**。
- **就绪的 bundle** 的成功输出（逐模块报告、MODIFIED 完整性报告、`RESULT: MERGED…`、移动路径）**一字不变**。
- **单文件形式、delta 在 changes root 之外**：行为不变，**唯二例外**是
  ① 同时传 `--changes-dir` → exit 2（B2a）；② 传 `--force` → exit 2（B3）。
  两者在状态 A 分别是「合法组合」与「unknown flag exit 2」，本版把前者改为 exit 2、
  后者保持 exit 2 但**改变诊断文本**。这两处例外**必须逐条写进 CHANGELOG**。

### B6 — 精确调用序（r1·REQ-4，按源码事实书写）

```
cli 参数校验（含 B2a：单文件 + --changes-dir → exit 2；单文件 + --force → exit 2）
  ↓ [单文件形式]  B2b 作用域判定 → 命中即拒绝，零读取内容、零写入、零移动
  ↓ [高层形式]
discoverDeltas          (:676)   ── 既有
buildProjection         (:678)   ── 既有；**内存合并在此完成**
逐模块报告 / CAS 拒绝集 (:681)   ── 既有
preflightFailures 判定  (:702)   ── 既有；失败即 FAILED PREFLIGHT
jobs 构造               (:708)   ── 既有
--write 温存文件守卫    (:713)   ── 既有
--write 归档目的地守卫  (:721)   ── 既有
**readiness（R1 → R2+R3）**      ── 新增，插在这里
pushIntegritySection    (:733)   ── 既有；未就绪时**不打印**
dry-run 出口 / stage / commit / move ── 既有
```

「合并」一词在本文件中一律指 **`buildProjection` 的内存投影**；落盘只在 commit 阶段发生。
把 readiness 放在两个 `--write` 守卫之后、integrity report 之前，
是为了让 dry-run 与 `--write` 在**同一个逻辑点**求值就绪度（B4），同时保住 B5 的字节不变。

---

## 三、判定矩阵

### 3.1 就绪度结论（**有序**；先命中者先报）

顺序：**读取/结构失败 → C3 基础合法性 → STEP6 overlay → R2/R3 进度**（r1·REQ-7）。

| # | 情形 | 类 | 结论 | 可 force |
|---|---|---|---|---|
| 1 | flow-state 的 `fileReadDefect` 非空，或守卫后读取抛错 | R1·结构 | 不就绪 | **否** |
| 2 | flow-state 解析后未过 C3（缺键、占位符、名字不符、step/tier 不在词汇表） | R1·合法性 | 不就绪，**报 C3 的原始 detail** | **否** |
| 3 | C3 全过，`current-step: ABANDONED` | R1·STEP6 overlay | 不就绪，专门措辞 + 引 RUNBOOK §283 | **否** |
| 4 | C3 全过，`current-step: DONE` | R1·STEP6 overlay | 不就绪，措辞：`in-flight bundle declares DONE; expected STEP6` | **否** |
| 5 | C3 全过，`current-step` 为其他合法值 | R1·STEP6 overlay | 不就绪，报实际值与期望值 `STEP6` | **否** |
| 6 | R1 全过，`tasks.md`/台账 的结构缺陷 | R2/R3·结构 | 不就绪 | **否** |
| 7 | R1 全过，medium/large 层 `tasks.md` 或台账缺失 | R2/R3·缺失 | 不就绪 | **否** |
| 8 | R1 全过，trivial 层 `tasks.md` 或台账缺失 | — | n/a | — |
| 9 | R1 全过，`tasks.md` 有 N 个未勾选框 | R2·进度 | 不就绪，报 N | **是**（需 `archive-force tasks`） |
| 10 | R1 全过，台账行为 `open` / `fixed` / 带理由的 `rejected` | R3·进度 | 不就绪，逐条报 | **是**（需 `archive-force ledger`） |
| 11 | R1 全过，台账行 status 非法 / 缺理由 / `waived` 缺人类记录 | R3·格式·证据 | 不就绪，逐条报 | **否** |
| 12 | 全过 | — | 就绪 | — |

> **互斥性的准确表述（r1·REQ-7）**：#1..#5 属 R1，**内部有序**，只报第一个命中者。
> #6..#11 属 R2/R3，**可同时成立**，R1 通过时**一次报全**（避免挤牙膏式往返）。
> #3/#4 的专门措辞**只在 C3 其余部分已通过时**使用；C3 有其他错误时按 #2 报 C3 的原始 detail。

### 3.2 单文件形式的作用域（**有序**、穷举）

| # | 情形 | 结论 |
|---|---|---|
| 1 | 同时传 `--changes-dir` | exit 2 + usage（B2a） |
| 2 | 传 `--force` | exit 2 + usage（B3） |
| 3 | `deltaAbs` 词法落在 `rootAbs` 内（段边界） | 拒绝，零写入零移动，诊断给出高层形式 |
| 4 | `realpath(deltaAbs)` 落在 `realpath(rootAbs)` 内（两者 realpath 均成功） | 同上 |
| 5 | 以上皆否 | 现有行为不变（含 delta 不存在时的既有错误与退出码） |

---

## 四、验收标准

### 新模块 `readiness`（store 前缀 `RY-`）

- **RY-01** 基础层的三条判据与状态 A 的 gate C3 / C2 / archived-C4 **逐项一致**：
  同一批 bundle 喂给两边，`{id,status,detail}` 逐条相同（差分断言）。
- **RY-02** gate 改用基础层之后，`runGate()` 的返回对象与每条 detail **字节不变**；
  抛错分支只比 error class / code / message，**显式排除** stack 的文件名与行号。
- **RY-03** `STEP6` 是在 C3 通过**之后**追加的一条 overlay，不是替换 C3：
  C3 失败时报 C3 的原始 detail，不报 STEP6 措辞。
- **RY-04** 每个合法的非 `STEP6` 取值都使 archive 不就绪，而 gate 的 C3 仍 pass
  （断言方向：`archive 就绪 ⇒ gate C3 pass`，反之不成立）。
- **RY-05** 静态断言：`archive-merge.js` 不出现 `require('./gate')`；`gate.js` 不重实现三条判据；
  `gate.js` 仍导出 `classifyStatus`。
- **RY-06** 基础层**不含**任何 `fileReadDefect` 调用（安全层是 archive 独有的；
  基础层若加守卫就会改变 gate 行为，与 RY-02 冲突）。
- **RY-07**（r2·REQ-1）静态断言 `readiness.js` **不 require `archive-merge.js`**；
  且 `readiness.reviewDirDefect` 用 `resolve.containsReal` 时，
  与状态 A（`archive-merge.containsReal`）在**该调用形态**下结论逐例相同——
  差分测试至少覆盖：正常目录 / symlink / 非目录 / 逃逸 / 不存在，五种输入各一。

### archive 的安全读取层（r1·REQ-1）

- **AM-74** B7 表逐格：三个 artifact × 五个缺陷类（`missing` / `symlink` / `not-file` / `escape` /
  `bad-ancestor`）× 两个 tier 侧，各自 refuse 或 n/a，**结果与表一致**。
- **AM-75** 构造一个 `current-step: ABANDONED` 的 bundle，其 `flow-state.md` 是**指向 bundle 外一份
  `STEP6` 文件**的 symlink → refuse（结构类），且**带 `--force` 仍 refuse**。
- **AM-76** `review/` 本身是**指向 bundle 内另一目录**的 symlink、而 `issues.md` 完全正常
  → refuse（只守叶子会放行）。
- **AM-77** 守卫通过后 `readFileSync` 抛错（注入 seam 模拟竞态/权限）→ refuse，诊断含原始 `e.code`，不可 force。
- **AM-107**（r2·REQ-1）**守卫自身**抛错：`lstatSync` 抛 `EACCES` / `EIO` / `ELOOP`
  → **结构类** refuse，诊断含原始 `e.code`，不可 force。
  **关键控制**：同一场景在 **trivial 层**也必须 refuse，**不得**因 helper 把它归成 `missing` 而判 `n/a`
  （这条是 r2 指出的 fail-open 的直接机械证明）。
- **AM-108** 真正的 `ENOENT` 仍走 tier 敏感分支：trivial 层 `tasks.md`/台账不存在 → `n/a`。

### archive 的就绪度（r1·REQ-4 / REQ-7）

- **AM-78** 三类不就绪各自 refuse：打印 `RESULT: NOT READY — nothing written`，退出码 1，零写入零移动。
- **AM-79** R1 有序：#1..#5 只报第一个命中者；R1 通过则 R2 与 R3 一次报全。
- **AM-80** `ABANDONED` 与 `DONE` 各有专门措辞（`DONE` 的文案为
  `in-flight bundle declares DONE; expected STEP6`，**不得**声称「已经归档过」），且不可 force。
- **AM-81** C3 有其他错误的 `ABANDONED` bundle → 报 C3 的原始 detail，**不报** ABANDONED 专门措辞。
- **AM-82** trivial 层缺 `tasks.md` / 缺台账 = n/a；medium/large 层缺失即不就绪且**不可 force**。
- **AM-83** 既有 preflight 的**每一个** guard（discoverDeltas 错误 / validation / CAS 拒绝 / hygiene /
  base 失配 / 冲突 / 温存文件 / 归档目的地）失败时，诊断与退出码**一字不变**，
  且就绪度**未被求值**（以计数 seam 断言调用次数为 0）。
- **AM-84** 未就绪时 **integrity report 不打印**；就绪时打印且位置不变。
- **AM-85** 未就绪的 dry-run **不**打印 `RESULT: MERGED (dry-run…)`，退出码 1，零写入。

### `--force`（r1·REQ-2 / REQ-3）

- **AM-86** 可 force 类逐项：未勾任务、`open`、`fixed`、带理由的 `rejected` → 有证据时放行。
- **AM-87** 不可 force 类逐项：R1 全部五种、结构类全部、medium/large 的 artifact 缺失、
  非法 status、缺理由、`waived` 缺人类记录 → 带 `--force` 仍 refuse。
- **AM-88**（r2·REQ-2）人类证据协议：无 `archive-force <class>` 条目 → `--force` 无效果，
  且打印**可复制的模板**（断言输出含模板骨架，**不**断言含任何人类理由文字）；
  有条目但理由不含 `\w` → 同样无效果；token 边界正确
  （`archive-force-2 tasks` / `archive-force tasks2` 均不命中）。
- **AM-89**（r2·REQ-2）**按类绑定**：只有 `archive-force tasks` 时，R2 被越过而 R3 仍 refuse；
  只有 `archive-force ledger` 时反之；两条（或一条同时列两类）时两者皆过。
- **AM-109** 输出逐条 `forced: …`，并打印所引用记录的**原始首行**——
  控制：构造一条**跨行**的 `gates:` 记录，断言打印的是首行字面文本，
  **不是** `gatesEntries()` 拼接后的规范化文本。
- **AM-90** `--force` 在 dry-run 与 `--write` 中同样改变结论；dry-run 下**零磁盘副作用**。
- **AM-91** 单文件形式 + `--force` → exit 2 + usage。

### 单文件形式的作用域（r1·REQ-5）

- **AM-92** 单文件 + `--changes-dir` → exit 2 + usage，零写入零移动。
- **AM-93** 词法命中逐例：`apriori/changes/X/specs/a.md`、`./apriori/changes/X/specs/a.md`、
  `apriori/changes/../changes/X/specs/a.md` → 全部拒绝。
- **AM-94** 段边界：`apriori/changes-other/X/specs/a.md` → **不**拒绝（前缀兄弟目录）。
- **AM-95** realpath 命中：bundle 外的 symlink 指向 `apriori/changes/X/specs/a.md` → 拒绝。
- **AM-96** 词法命中而 root 自身是 symlink（realpath 量度失配）→ 仍拒绝（词法量度保住）。
- **AM-97** root 不存在 / delta 悬空 / realpath 权限失败 → realpath 量度不产生命中；
  若词法亦不命中，则落入既有行为，**退出码与诊断与状态 A 一致**。
- **AM-98** changes root 之外的单文件手术（含 `--write` 成功路径）→ **逐字节不变**。

### 迁移与文档（r1·REQ-6，v1 漏报的全部补入）

- **AM-99**（r2·REQ-6 改正）`apriori/specs/archive-merge/spec.md` 的 **AM-12** 经
  **`## MODIFIED` 其所属 Requirement 块**去除——该块是
  `### Requirement: archive-merge applies delta specs to the living store`，含 AM-01..AM-12。
  **不得使用 `## REMOVED`**：那会把仍然有效的 AM-01..AM-11 一并 deprecated（§1.8）。
  验收三条：① 合并后该块仍含 AM-01..AM-11 共 **11** 个场景，内容逐字节不变；
  ② **MODIFIED 完整性报告**恰好打印 `! dropped: AM-12`，**且不打印其他 dropped**；
  ③ AM-12 的绑定测试相应处置。`AM-19` 经 `## MODIFIED` 更新为新的互斥规则。
- **AM-100** `apriori/specs/cli/spec.md` 的 usage 场景经 `## MODIFIED` 更新。
- **AM-101** `docs/concepts.md` 与 `docs/concepts_cn.md` 的 STEP6 教程命令迁移到高层形式
  （`apriori archive --change add-mini-kv --changes-dir apriori/changes --write`）；
  可 grep 断言：两份文件中不再出现 `archive --store`。
- **AM-102** `docs/cli.md` / `docs/cli_cn.md` 的 archive 段落描述就绪度、`--force` 的边界与证据协议、
  单文件形式的作用域限制；`USAGE` 的高层行含 `--force`，单文件行**不含**。
- **AM-103** `RUNBOOK.md` / `RUNBOOK_cn.md` 的 archive 算法段落记录：归档前判就绪度；
  单文件形式仅用于**不在 changes root 内**的单模块手术，且不再接受 `--changes-dir`。
- **AM-104** `CHANGELOG.md` 显著位置声明**三项破坏性变更**：
  ① 未就绪的 change 不再能归档（新退出路径 `RESULT: NOT READY`）；
  ② 单文件形式不再接受 `--changes-dir`（**失去移动能力**）；
  ③ 单文件形式不再接受 changes root 内的 `--delta`。
- **AM-105** `truth/archive-merge.md` 与新增的 `truth/readiness.md` 记录：判据同源、两层结构、
  不成环的理由、以及「基础层不加守卫」的决策；`truth/gate.md` 记录 gate 改从基础层取。
- **AM-106**（r2·REQ-6 改正，生产方的反驳被推翻）**`SECURITY.md` 必须修改**：
  `:10` 末句 "Explicit operator-given file arguments (single-file `archive --store <f> --delta <f>`,
  `stamp <file>`) are used as given, like any file tool." 是对单文件形式的显式承诺，与 B2b 冲突。
  改为写明新的拒绝边界（changes root 内的 `--delta` 不再 used as given，`--changes-dir` 不再兼容），
  并以可 grep 断言新边界文字存在。

---

## 五、明确不做（out of scope）

1. **G3 全组**——不作任何「归档之后那次 gate 会解析到这个 bundle」的承诺。
   随之不做：N0..N3 命名空间前置条件、时钟 seam、同名归档目录排序检查、自定义 root 的提示语。
2. **前身 F-2**：`resolveChange` 在同名归档中取字典序最后者 → resolver 自身缺陷，本 change 不处理。
3. **前身 F-4**：`archive-merge.js:753` 的 phase 4 自行 `new Date()` → 属 G3，不处理。
4. **不改 `lib/resolve.js`**（含 §1.5 发现的 `:153`/`:154` 重复行——那是独立的清理项）。
5. **不改 gate 的任何对外行为**（RY-02 是机械保证）。
6. **不引入并发/锁**。TOCTOU 窗口存在且不在本 change 关闭（见 §六-1）。
7. **G3 findings 的独立追踪入口（r1·A-2，按 r2·A-1 改形）**：F-2 与 F-4 的稳定标识
   `finding:resolver-archive-tiebreak` 与 `finding:archive-move-clock`
   **写进本轮 advisory batch row 的 Issue 文本**（而不是另开两条 `advisory-acked` 行——
   RUNBOOK/P0 规定 advisory 每轮只落一个 batch row）。目的不变：本 change 完成后仍可 grep 到。

---

## 六、已知后果与风险

1. **TOCTOU 窗口存在（r1·A-1，本版给出精确前置条件）**：
   本 change 保证的区间是「**从第一次读取 readiness artifact 开始，到 dry-run 返回、
   或（无 move 的）commit 结束、或 move 尝试结束为止，调用方不得并发修改 bundle**」。
   实现**不声称**能检测该竞态。机械化表述（r2·A-2）：`--write` 路径须提供一个 hook，
   **在就绪度全部判完之后、第一次写 store 之前**触发；测试在该 hook 内修改 bundle，
   并断言 archive **不重新读取 readiness artifact、也不检测该修改**。
   「看守一次」**不等于**提交时刻的状态保证。**须在 gate④ 如实呈报。**
2. **三项对外可见的破坏性变更**（AM-104 已具名）。其中「单文件形式失去移动能力」
   会使 **living spec 的 AM-12 变为空洞**，须以 `## MODIFIED` 整块的方式去除该 scenario（§1.8）——
   这是本 change 唯一一处**删除既有承诺**的地方，须在 gate④ 单独点名，
   并以 MODIFIED 完整性报告的 `! dropped: AM-12` 作为呈报证据。
   同时 `SECURITY.md` 的显式承诺句需同步（§1.9）。
3. **入门教程会改**：`docs/concepts{,_cn}.md` 的 STEP6 命令迁移到高层形式。
   这实际上让教程与 RUNBOOK 的推荐路径一致（RUNBOOK 早已把高层形式作为正道），
   但它是**用户第一次归档时照抄的那条命令**，改错的代价很高。
4. **迁移面：61 个高层调用点 / 6 个测试文件**（gap-report §A6）。
   风险不在数量，在**遗漏**——该清单是单行 grep 判据，抓不到跨行调用，
   STEP5 的 M1 必须逐文件人工走完，**不得以该表收尾**。
5. **`--force` 是一个新的逃生舱**。缓解：类别穷举、结构类与 R1 永不可解、
   需要**预存的、按类具名的人类 `gates:` 证据**、逐条打印。
   **已知弱点，如实呈报（r2·REQ-2）**：该证据是**该类在本 bundle 生命周期内持续有效的授权**，
   不是「本次运行」的证据——记录写下之后新出现的同类失败会被同一条记录覆盖，
   直到该记录被显式删除。本版**不把它包装成 per-run 证据**；
   若 owner 认为这个有效期太宽，可在 gate④ 要求改为绑定当前失败集合摘要。
6. **第二次不收敛的处置**：若本轮 STEP0 再撞 cap，生产方**不提议第三次重开**，
   而是把「判 ABANDONED」作为选项如实呈给 owner（RUNBOOK §283：只能由人类裁定）。

---

## 七、与前身 `archive-preflight` 的关系

前身**不删除、不实现、不归档**，原地保留（`current-step: SUPERSEDED`）。
其九轮评审的实证发现 F-1..F-4 已转录在它的 flow-state 尾部。
本 change 继承 F-1（以拒绝方式关闭），F-2/F-4 转独立 finding（§五-7），F-3 存档备查。

**CAS 复核（已做）**：当前 `apriori/specs/archive-merge/spec.md` 的 base 为
`sha256:51620e96cd6b3c4a4b1af5e1e0865fd7f55bcf0333ecc47aeca727cf997282c5`；
前身触及的块与 `id-pattern-and-delta-notes` 新增 AM-71..73 所在的块**不同**，无 §4.11 冲突。
（r1 独立复核并确认了这一点。）

---

## 八、STEP0·r1 处置说明（本版）

**7 条全部 accept，无一 rejected。**

| ID | 处置 |
|---|---|
| REQ-1 | 新增 **B7**（两层结构 + artifact × 缺陷类 × tier 判定表）与 **RY-06 / AM-74..77**。实证补充：`fileReadDefect` 已存在且已导出（`resolve.js:134`/`:158`），**不需新写**；`reviewDirDefect` 是 gate 私有，随基础层搬入。 |
| REQ-2 | **B3 重写**：可 force / 不可 force 两个穷举清单 + 预存的人类 `gates: archive-force` 证据协议 + 多失败覆盖规则 + 逐条输出格式；矛盾措辞改为「dry-run 与 write 同样改变结论，只有 write 产生磁盘副作用」。验收 AM-86..90。 |
| REQ-3 | 采纳评审方的**推荐分支**：`--force` 只出现在高层 usage，单文件形式收到即 exit 2；并把它写成 **B5 的具名例外**（连同 B2a 共两处），验收 AM-91。 |
| REQ-4 | **B6 按源码逐行重写**，明确 readiness 插在两个 `--write` 守卫之后、`pushIntegritySection` 之前；「合并」一词统一指内存投影。验收 AM-83（逐 guard + 计数 seam）与 AM-84（integrity report 的出现条件）。 |
| REQ-5 | **B2b 给出五步算法**（`path.resolve` / 段边界 / 双量度 / realpath 失败的 disposition / 时机措辞修正）；验收 AM-93..97 逐例覆盖 `.`、`..`、前缀兄弟、symlink root、外部 symlink、缺失 root、悬空 delta。 |
| REQ-6 | **§零-3 撤回**，§1.6 补全真实迁移面（38 处的分类清点）。**两点比评审方描述得更重**：`docs/concepts.md:553` 是入门教程的 STEP6 命令；living spec 的 **AM-12 变为空洞**，需 `## REMOVED` 而不只是文档更新。**一处不成立**：`SECURITY.md:10` 只描述「由 change name 派生的路径」，与单文件形式无关，故改为 **AM-106 的可 grep 断言**（断言其确实不含该承诺）而非修改。 |
| REQ-7 | **3.1 改为有序矩阵**（读取/结构 → C3 → STEP6 overlay → 进度），互斥性改为精确表述；`DONE` 文案改为 `in-flight bundle declares DONE; expected STEP6`。验收 AM-79..81。 |
| A-1 | §六-1 写成精确的调用前置条件区间 + seam 要求。 |
| A-2 | §五-7：F-2/F-4 以带稳定标识的 `advisory-acked` 台账行落地，可 grep。 |
| A-3 | 采纳其准确结论：不重建 G2/G3，但**完整恢复** G1 的安全读取（B7）与 force 分类（B3）。 |

---

## 八·2、STEP0·r2 处置说明（本版）

**verdict 序列 7 → 3。** r2 verified 四条：**REQ-3 / REQ-4 / REQ-5 / REQ-7**（本版不再改动）。
重开三条，**全部 accept，无一 rejected**：

| ID | 残余缺陷 | 本版处置 |
|---|---|---|
| REQ-1 | ① `fileReadDefect` 与 `reviewDirDefect` 的 `catch` 都不看 `e.code`，`EACCES` 被报成 `missing`，在 trivial 层判 `n/a` → **fail-open**；AM-77 只覆盖「守卫之后」的读取异常，抓不到守卫**自身**的异常。② 「原样搬入」`reviewDirDefect` 会连 `archive-merge.containsReal` 一起搬，形成 `archive-merge → readiness → archive-merge` 的**环**。 | 新增 **B7a**（archive 安全层自行分类：只有真正的 `ENOENT` 才进 tier 敏感的缺失分支，其余 `e.code` 一律结构类不可 force）与 **B7b**（`readiness.reviewDirDefect` 取 `resolve.containsReal`）。§1.5 补入两条实证。新增 **AM-107**（守卫自身抛 `EACCES`/`EIO`/`ELOOP`，**含 trivial 层的关键控制**）、**AM-108**、**RY-07**（静态禁 require + 五例差分）。 |
| REQ-2 | 泛化的 `archive-force <reason>` 是**永久的、无范围绑定的 blanket waiver**，却被称作「本次运行」的证据：为两项旧任务写的记录会自动授权后来出现的任意 tasks/ledger 问题。另外「由人类写入」不可由文件证明；AM-88 要求打印「需要写入的确切文字」而人类理由尚未知；「非空文字」不构成理由定义；「打印 gates 条目原文」未说明是原始多行还是规范化拼接。 | **采纳推荐分支并加一条诚实声明**：token 改为**按类具名**（`archive-force tasks` / `archive-force ledger`），一条记录只授权它列出的类；理由须含 `\w`；措辞由「由人类写入」改为「**记录一项先前的人类决定**」，并注明文件无法证明作者身份；AM-88 改为打印**可复制的模板**；输出改为打印记录的**原始首行**。**并如实命名其有效期**：这是该类在本 bundle 生命周期内**持续有效的授权**，不是 per-run 证据——写进 §六-5 供 gate④ 裁决。新增 **AM-89**（按类绑定）与 **AM-109**（原始首行 vs 规范化文本的控制）。 |
| REQ-6 | ① 生产方主张对 AM-12 用 `## REMOVED` —— **错误**：AM-12 是 Scenario，delta 语法的操作粒度是整个 `### Requirement:` 块，实测该块含 **AM-01..AM-12 共 12 个场景**，`REMOVED` 会把 AM-01..AM-11 一并弃用。② 生产方对 `SECURITY.md` 的反驳 —— **不成立**：`:10` 末句明确承诺单文件形式 "used as given"。 | **两条都改正**。新增 **§1.8**（delta 语法的操作粒度，含实测的 12 个场景清单）与 **§1.9**（SECURITY.md 末句原文）。**AM-99 改写**为 `## MODIFIED` 整块 + 三条验收（AM-01..AM-11 共 11 个场景逐字节保留 / 完整性报告恰好打印 `! dropped: AM-12` 且无其他 dropped / 绑定测试处置）。**AM-106 改写**为**修改** SECURITY.md。**生产方的两处判断错误已记录在案**：一处是把 scenario 当 Requirement，一处是 grep 输出被截断而漏读末句。 |

**r2 确认的两条**：concepts 教程命令同时触发 B2a/B2b（比一般陈旧 usage 更重）；AM-12 确将变为空洞。

**advisory 处置**：A-1 → §五-7 改为写进 batch row 文本；A-2 → §六-1 机械化为「就绪度判完之后、
首次写 store 之前」的 hook + 「不重读、不检测」的断言；A-3 → **接受**，本文件的 `:676` 等行号
**只作定位**，STEP2 的 design/tasks 一律绑定**命名步骤与函数调用**，不得以行号为验收接口。
