# req-v2 — archive-readiness：不可逆的归档写入，现在完全不问这个 change 做完了没有

> change: `archive-readiness` · tier: large · track: harden
> lineage: 分支 `brownfield-round2`（自 main@235a121 切出）；产品线 v4，最终目标 main；**禁止**合并到 v1 / v3
> 证据来源：`apriori-in-practice/5.1/Apriori棕地项目使用复盘.md` §5 FN-1 / §8 P0-2，加本仓源码实证
> 前身：`apriori/changes/archive-preflight/`（current-step: SUPERSEDED）
> **本版处置 STEP0·r1 的全部 7 条（REQ-1..REQ-7 全 accept，无一 rejected）**；处置说明见 §八

---

## 〇、收窄主张的现状（r1 已判，本节按判定重写）

评审方 r1 对 v1 §零 的三条断言逐条判定：

| 断言 | r1 判定 | 本版处置 |
|---|---|---|
| 1. 收窄不违反 advisory A-3 | **成立** | 保留；但 A-3 的**准确结论**是「不必重建 G2/G3，**必须恢复 G1 里前身已验证过的安全读取与 force 分类**」——v1 把它们随收窄一并删掉了，这是错误。见 B7 与 B3。 |
| 2. G3 可整体放弃 | **成立** | 保留。条件：需求**不得**声称 post-archive gate 的充分性（本版全文无此语句），且 F-2 / F-4 必须保有独立追踪入口（见 §五-7）。 |
| 3. 单文件收窄的成本可接受 | **不成立** | **撤回**。v1 的「全仓 19 处、全部在 test」是**只量了 `test/` 却写成「全仓」**——生产方的测量错误。真实迁移面见 §1.6，并入验收标准 §四。**本断言在 owner 于 gate④ 接受这项破坏性变更之前，不再作为成立的前提使用。** |

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
  → **安全读取层不需要新写**，只需要在 archive 侧接上。
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

**人类证据协议**：`--force` 生效的前提是 bundle 的 `flow-state.md` 的 `gates:` 段里
**预先存在**一条记录，其中含精确 token `archive-force`（按 `waiveEvidence` 同款的
`(^|[^A-Za-z0-9-])archive-force([^A-Za-z0-9-]|$)` 边界判定）**且**其后有非空文字（理由）。

- 该条目**由人类写入**，与 `waived` 的证据规则同源——`--force` 不是 AI 可自助的旗标。
- **一条记录覆盖本次运行的全部可 force 失败**（多失败覆盖规则）；
- 证据缺失时 `--force` **无效果**，archive 仍拒绝，并打印需要写入的确切文字。

**输出格式**：force 生效时逐条打印被越过的项，一项一行，前缀 `forced:`，
并打印所引用的 `gates:` 条目原文；随后照常继续。**不打印笼统的一句 "forced"。**

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
| 9 | R1 全过，`tasks.md` 有 N 个未勾选框 | R2·进度 | 不就绪，报 N | **是** |
| 10 | R1 全过，台账行为 `open` / `fixed` / 带理由的 `rejected` | R3·进度 | 不就绪，逐条报 | **是** |
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

### archive 的安全读取层（r1·REQ-1）

- **AM-74** B7 表逐格：三个 artifact × 五个缺陷类（`missing` / `symlink` / `not-file` / `escape` /
  `bad-ancestor`）× 两个 tier 侧，各自 refuse 或 n/a，**结果与表一致**。
- **AM-75** 构造一个 `current-step: ABANDONED` 的 bundle，其 `flow-state.md` 是**指向 bundle 外一份
  `STEP6` 文件**的 symlink → refuse（结构类），且**带 `--force` 仍 refuse**。
- **AM-76** `review/` 本身是**指向 bundle 内另一目录**的 symlink、而 `issues.md` 完全正常
  → refuse（只守叶子会放行）。
- **AM-77** 守卫通过后 `readFileSync` 抛错（注入 seam 模拟竞态/权限）→ refuse，诊断含原始 `e.code`，不可 force。

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
- **AM-88** 人类证据协议：无 `archive-force` 条目 → `--force` 无效果且打印需要写入的确切文字；
  有条目但无理由文字 → 同样无效果；token 边界正确（`archive-force-2` 不算命中）。
- **AM-89** 一条 `archive-force` 记录覆盖本次运行的全部可 force 失败；
  输出逐条 `forced: …`，并打印所引用的 `gates:` 条目原文。
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

- **AM-99** `apriori/specs/archive-merge/spec.md` 的 **AM-12** 经 `## REMOVED` 弃用
  （单文件形式不再接受 `--changes-dir`，其「提交+移动一体事务」失去主语），
  且其绑定测试相应处置；`AM-19` 经 `## MODIFIED` 更新为新的互斥规则。
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
- **AM-106** `SECURITY.md` 经核**无需修改**（`:10` 只涉及「由 change name 派生的路径」）——
  以可 grep 的方式断言该文件不含单文件形式的承诺。

---

## 五、明确不做（out of scope）

1. **G3 全组**——不作任何「归档之后那次 gate 会解析到这个 bundle」的承诺。
   随之不做：N0..N3 命名空间前置条件、时钟 seam、同名归档目录排序检查、自定义 root 的提示语。
2. **前身 F-2**：`resolveChange` 在同名归档中取字典序最后者 → resolver 自身缺陷，本 change 不处理。
3. **前身 F-4**：`archive-merge.js:753` 的 phase 4 自行 `new Date()` → 属 G3，不处理。
4. **不改 `lib/resolve.js`**（含 §1.5 发现的 `:153`/`:154` 重复行——那是独立的清理项）。
5. **不改 gate 的任何对外行为**（RY-02 是机械保证）。
6. **不引入并发/锁**。TOCTOU 窗口存在且不在本 change 关闭（见 §六-1）。
7. **G3 findings 的独立追踪入口（r1·A-2）**：F-2 与 F-4 在本 change 归档时，
   须以**独立 finding 行**落进本 change 的台账（status `advisory-acked`，
   Issue 文本含稳定标识 `finding:resolver-archive-tiebreak` 与 `finding:archive-move-clock`），
   使它们在本 change 完成后仍可被 grep 到，而不是只活在历史文档的叙述里。

---

## 六、已知后果与风险

1. **TOCTOU 窗口存在（r1·A-1，本版给出精确前置条件）**：
   本 change 保证的区间是「**从第一次读取 readiness artifact 开始，到 dry-run 返回、
   或（无 move 的）commit 结束、或 move 尝试结束为止，调用方不得并发修改 bundle**」。
   实现**不声称**能检测该竞态；`--write` 路径须有一个 seam 可断言「未做任何提交时复检」。
   「看守一次」**不等于**提交时刻的状态保证。**须在 gate④ 如实呈报。**
2. **三项对外可见的破坏性变更**（AM-104 已具名）。其中「单文件形式失去移动能力」
   会使 **living spec 的 AM-12 变为空洞**并需要 `## REMOVED`——
   这是本 change 唯一一处**删除既有承诺**的地方，须在 gate④ 单独点名。
3. **入门教程会改**：`docs/concepts{,_cn}.md` 的 STEP6 命令迁移到高层形式。
   这实际上让教程与 RUNBOOK 的推荐路径一致（RUNBOOK 早已把高层形式作为正道），
   但它是**用户第一次归档时照抄的那条命令**，改错的代价很高。
4. **迁移面：61 个高层调用点 / 6 个测试文件**（gap-report §A6）。
   风险不在数量，在**遗漏**——该清单是单行 grep 判据，抓不到跨行调用，
   STEP5 的 M1 必须逐文件人工走完，**不得以该表收尾**。
5. **`--force` 是一个新的逃生舱**。缓解：类别穷举、结构类与 R1 永不可解、
   需要**预存的人类 `gates:` 证据**、逐条打印。
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
