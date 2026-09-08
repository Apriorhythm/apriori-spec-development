# req-v1 — archive-readiness：不可逆的归档写入，现在完全不问这个 change 做完了没有

> change: `archive-readiness` · tier: large · track: harden
> lineage: 分支 `brownfield-round2`（自 main@235a121 切出）；产品线 v4，最终目标 main；**禁止**合并到 v1 / v3
> 证据来源：`apriori-in-practice/5.1/Apriori棕地项目使用复盘.md` §5 FN-1 / §8 P0-2，加本仓源码实证
> 前身：`apriori/changes/archive-preflight/`（current-step: SUPERSEDED），其 STEP0×5 + STEP2×4 共九轮评审的产物全部原地保留

---

## 〇、给评审方的抬头（请优先攻击这一节）

本 change 是前身 `archive-preflight` 的**收窄重开**，owner 逐字裁定「B」。前身**两次撞 cap 且都未收敛**
（STEP0 序列 7→6→3→2→2；STEP2 序列 4→1→1→1）。生产方对不收敛原因的归因如下，**这个归因本身未经任何独立复核**：

九轮的 reopen 聚成三组——

| 组 | 内容 | 证据 |
|---|---|---|
| **G1 核心** | 高层形式 `archive --change X` 的就绪度判定 | STEP0·r2 之后**再未被 reopen** |
| **G2 归属** | 单文件形式 `--store/--delta` 也能消费、并移动正式 bundle | REQ-3 被 reopen **4 次**，全部落在这里 |
| **G3 充分性** | 「归档之后那次 gate 一定会查到刚归档的这个 bundle」的机械保证（N0..N3 + 时钟 seam + 排序前置条件） | REQ-1 被 reopen **4 次**，全部落在这里 |

本 change 的收窄手法是：**对 G2 与 G3 拒绝，而不是推理**。

- G2：不再试图把一份 delta「归属」到某个 bundle（前身的有序互斥阶梯 + 集合算法 + root 双形态去重 + 身份一致集）。
  改为「delta 落在任何 changes root 之内，或调用带 `--changes-dir`」→ **整个调用 refuse**。
- G3：**整体放弃充分性主张**。archive 的就绪度是**对 archive 自身的前置条件**，它不对「稍后那次 gate 会解析到谁」作任何承诺。

**三条需要评审方判定的断言（生产方自认最脆弱之处）：**

1. **收窄不违反评审方 advisory A-3。** A-3 原文的理由是「各部分共同维护同一条 archive-safety 不变量，硬拆会产生**无法安全落地的中间状态**」。
   生产方的判断：A-3 反对的是把某条路径留在**宽松**的中间态；本 change 把未建模的路径**关掉**（拒绝），是保守方向，
   因此不产生不安全中间态，反而使不变量在被关闭的路径上**平凡成立**。**此判断未经评审方复核——请直接攻击。**
2. **G3 可以整体放弃而不损害本 change 的目的。** 复盘 §8 P0-2 要求的是「归档时拦住没做完的 change」，
   不是「保证归档后的 gate 查的是它」。放弃 G3 之后，本 change 的验收标准里**不出现任何**关于后续 gate 的语句。
3. **G2 的拒绝成本可接受。** 实测：`RUNBOOK.md:252` 对单文件形式的承诺仅为「remains for one-module surgery」；
   全仓 `archive --delta` 的调用共 19 处，**全部在 `test/` 内**（`archive-change.test.js` / `archive-merge.test.js` / `cli.test.js` / `resolve.test.js`）；
   `apriori/changes/archive/` 下**无任何**归档记录使用过该形式。真正的单模块手术（delta 不在任何 changes root 内）不受影响。

若评审方认为以上任何一条不成立，请明确指出应当回到哪一组的完整建模——生产方会如实呈报给 owner，
而不是在收窄与全量之间反复摇摆。

---

## 一、问题（状态 A，全部可复现）

### 1.1 `apriori archive` 从来没有读过 change bundle 的任何流程文件

```
$ grep -n "flow-state\|tasks\.md\|ledger" lib/archive-merge.js
860:      console.log('\nCONFLICTS (stop — open a ledger issue, human resolves):');
```

**唯一一处命中是一句提示文本里的 "ledger" 一词。** `lib/archive-merge.js` 全文不读
`flow-state.md`、不读 `tasks.md`、不读 `review/issues.md`。

它现在的四阶段（`:666` 起，preflight → stage → commit → move）在 preflight 里检查的是
**规格库一侧**的东西：CAS 拒绝、卫生问题、base 失配、同 ID 冲突（`:702`）。
关于「这个 change 做完了没有」——**零判据**。

后果：`apriori archive --change X --write` 会在 X **仍在 STEP2**、
**tasks.md 还有 45 项未勾**、**ledger 还有 open 行**的情况下，把它的规格增量并进 living store，
并把它的目录移进 `apriori/changes/archive/`。这是**不可逆写入**（写规格库 + 移目录，两件事）。

### 1.2 这不是假想——复盘里就是这么发生的

复盘 §5 FN-1：一次归档时 `tasks.md` 是 **6 项 `[x]` / 45 项 `[ ]`**，无人拦下。
FN-1 的直接原因是 gate 当时根本没启动（缺 `test-cmd`），那条已由本分支的 `gate-degrades` 修好——
现在 gate 会在没有测试命令时照样点名那 45 项（见 `~/terra/r2-lab-report.md` Lab 1）。

**但 gate 是事后检查。** 归档已经发生了：规格库已经写了，目录已经移了。
`gate-degrades` 让人**知道**出了事，本 change 让它**不发生**。

### 1.3 单文件形式是同一个洞的第二个入口（前身 F-1，已实证）

`lib/archive-merge.js:860` 一带的单文件路径：

- 带 `--changes-dir` 时，它**同样会移动**正式 bundle；
- **不带** `--changes-dir` 时，`--delta apriori/changes/X/specs/foo/spec.md` **照样把内容写进 store**。

也就是说：即使高层形式加了就绪度，`--store/--delta` 仍然是一条把未就绪（乃至 ABANDONED）的
change 的规格写进 living store 的通路。这是前身九轮里 REQ-3 反复 reopen 的实质。

### 1.4 状态 A 的其余事实（判据现在住在哪里）

`apriori gate` 已经有三条**完全同类**的判据，全在 `lib/gate.js`：

| gate 检查 | 函数 | 位置 | 它判什么 |
|---|---|---|---|
| C3 | `checkFlowState(state, name)` | `:28` | 五个必填键存在且非占位符、`change` 与名字一致、`current-step` ∈ STEP_ENUM、`tier` ∈ TIER_ENUM |
| C2 | `checkTasks(dir, tier)` | `:40` | `tasks.md` 的未勾选框数；缺文件时 **trivial → n/a，其余 → blocked** |
| C4 | `checkLedger(tier, stage, dir)` | `:96` | 每行 status 合法、rejected/waived 有理由、waived 有 `gates:` 人类记录、无 `open`；**`stage === 'archived'` 时额外要求每行终态** |

以及词汇表分类器 `classifyStatus(status)`（`:56`，已 `module.exports`，`GT-15` 的语料测试在用）。

`STEP_ENUM`（`:18`）= `STEP0..STEP6, INTENT-CARD, SPIKE, EXTRACTION, DONE, ABANDONED`。
注意 **`ABANDONED` 是合法取值**——C3 会让它通过，因为 C3 判的是「词汇表合法」，不是「可以归档」。

**模块依赖方向（实测，决定实现形态）：**

```
gate.js         → status.js, spec-runner.js, archive-merge.js(:13 CHANGE_NAME_RE, containsReal), resolve.js, config.js, args.js
archive-merge.js → args.js, resolve.js, config.js
status.js       → args.js, resolve.js
resolve.js      → config.js
```

`gate.js → archive-merge.js` **已经成立**。因此 `archive-merge.js → gate.js` 会**成环**，
archive 不能直接调 gate 的三个 checker。这是本 change 必须引入一个共享基础层的**结构性理由**，
不是设计偏好。（`readiness.js → status.js → resolve.js → config.js` 无环：`status.js` 与 `resolve.js` 都不依赖 `archive-merge.js`。）

### 1.5 `--force` 今天不存在

`USAGE`（`:790`）当前是：

```
usage: apriori archive --store <f> --delta <f> --change <name> [--write] [--changes-dir <dir>] [--no-cas]
   or: apriori archive --change <name> [--write] [--changes-dir <dir>] [--no-cas]
```

没有 `--force`。本 change 若引入，是**新增旗标**，须自带边界。

---

## 二、目标状态 B

### B1 — 就绪度：三条判据，与 gate 同源

`apriori archive --change <name>`（两种模式：dry-run 与 `--write`）在合并之前判定 bundle 就绪度：

- **R1 步位**：flow-state 通过 C3 的全部合法性检查，**且** `current-step` 恰为 `STEP6`。
- **R2 任务**：`tasks.md` 零个未勾选框；缺文件时 trivial 层 n/a，medium/large 层不就绪。
- **R3 台账**：`review/issues.md` 按 **`stage = 'archived'`** 判——每行合法、有理由、waived 有人类记录、
  无 `open`、且**全部终态**；缺文件时 trivial 层 n/a，medium/large 层不就绪。

三条判据**必须与 gate 的 C3 / C2 / archived-C4 逐项一致**，实现上由二者共用同一份代码
（新增 `lib/readiness.js`，gate 改为从它取；`gate.js` 继续再导出 `classifyStatus` 以免打断 GT-15 的语料测试）。

**R1 先判，R2/R3 后判。** 理由：flow-state 读不出来（缺失、不可读、结构损坏）时，
无法排除这是一个 ABANDONED 的 change，此时任何「任务都勾完了」的判断都不可信。
R1 失败只报 R1；R1 通过则 R2 与 R3 一次报全（避免挤牙膏式的往返）。

`current-step: ABANDONED` 与 `current-step: DONE` 都不就绪，各有专门措辞：
前者是 **RUNBOOK 硬规则**（§283：ABANDONED「写不进 KB 与规格库」），后者提示「这个 change 已经归档过了」。

### B2 — 单文件形式：落在 changes root 内就拒绝

`apriori archive --store <f> --delta <f>` 在**任何读取与写入之前**拒绝，当以下任一成立：

- 调用带 `--changes-dir`；
- `--delta` 的路径落在任一 changes root 之内——**词法拼写与 realpath 两种量度任一命中即算命中**
  （两种都留，是为了同时挡住「root 自身是 symlink 而调用方用词法路径」与「外部 symlink 指向 bundle 内 delta」两个方向）。

拒绝的诊断必须**说明替代做法**：`use the high-level form: apriori archive --change <name>`。

不落在任何 changes root 内的 `--delta`（真正的单模块手术）**行为一字不变**。

### B3 — `--force`：只解进度类，不解步位类

新增 `--force`，**只**能越过 **R2（未勾任务）与 R3（非终态台账）**，
**不能**越过 **R1（步位）**——尤其 `ABANDONED` 与「flow-state 读不出来」**永不可 force**。
理由：R2/R3 是「人可能有正当理由认为可以放行」的进度问题；R1 是「这东西根本不该进 store」的类别问题。

`--force` 生效时必须**打印被越过的每一条**（不是一句笼统的 forced），
且只在 `--write` 下有意义；dry-run 下 `--force` 同样改变结论，以保持 B4。

### B4 — dry-run 说的就是 `--write` 会做的

未就绪时 dry-run **不得**打印 `RESULT: MERGED (dry-run…)`，退出码 1，零写入。
dry-run 与 `--write` 在就绪度上的结论必须一致（同一份判据、同一个 `--force` 语义）。

### B5 — 就绪时零变化

bundle 就绪（或既有 preflight 已失败）时，本 change 的输出**逐字节不变**：

- **既有 preflight 失败**（CAS 拒绝 / 卫生 / base 失配 / 同 ID 冲突）时，诊断与退出码**一字不变**，
  且就绪度**根本不被求值**——就绪度排在既有 preflight **之后**。
- 就绪的 bundle 的成功输出（merged / modified / deprecated / renamed 列表、MODIFIED 完整性报告、
  `RESULT: MERGED`、移动路径）**一字不变**。

### B6 — 顺序（完整调用序）

```
参数校验 → [单文件] B2 作用域拒绝 → [高层] 既有 preflight → 就绪度(R1 → R2+R3) → 合并 → 提交 → 移动
```

---

## 三、判定矩阵

### 3.1 就绪度结论（互斥且穷举）

| # | 情形 | 结论 | 可 `--force`？ |
|---|---|---|---|
| 1 | flow-state 缺失 / 不可读 / 解析不出 | 不就绪（R1） | **否** |
| 2 | flow-state 未过 C3（缺键、占位符、名字不符、step 或 tier 不在词汇表） | 不就绪（R1） | **否** |
| 3 | `current-step: ABANDONED` | 不就绪（R1，专门措辞 + 引 RUNBOOK §283） | **否** |
| 4 | `current-step: DONE` | 不就绪（R1，专门措辞「已归档过」） | **否** |
| 5 | `current-step` 为其他合法值（STEP0..STEP5 / INTENT-CARD / SPIKE / EXTRACTION） | 不就绪（R1，报出实际值与期望值 STEP6） | **否** |
| 6 | R1 通过，`tasks.md` 有 N 个未勾选框 | 不就绪（R2，报 N） | 是 |
| 7 | R1 通过，medium/large 层 `tasks.md` 缺失 | 不就绪（R2） | 是 |
| 8 | R1 通过，trivial 层 `tasks.md` 缺失 | R2 n/a | — |
| 9 | R1 通过，台账有 open / 非终态 / 非法 status / 缺理由 / waived 无人类记录 | 不就绪（R3，逐条报） | 是 |
| 10 | R1 通过，medium/large 层台账缺失 | 不就绪（R3） | 是 |
| 11 | R1 通过，trivial 层台账缺失 | R3 n/a | — |
| 12 | R1/R2/R3 全过 | 就绪 | — |

> 情形 6..11 可同时成立；R1 通过时 R2 与 R3 **一次报全**。

### 3.2 单文件形式的作用域（互斥且穷举）

| # | 情形 | 结论 |
|---|---|---|
| 1 | 带 `--changes-dir` | 拒绝（B2） |
| 2 | 不带 `--changes-dir`，`--delta` 的**词法路径**落在任一 changes root 内 | 拒绝（B2） |
| 3 | 不带 `--changes-dir`，`--delta` 的 **realpath** 落在任一 changes root 内 | 拒绝（B2） |
| 4 | 以上皆否 | 现有行为，一字不变 |

> 「任一 changes root」在本 change 里 = 规范 root `apriori/changes`。
> 显式 root 的情形由 #1 直接吃掉（带 `--changes-dir` 即拒绝），因此**不需要**前身的 root 集合与去重算法。

---

## 四、验收标准

### 新模块 `readiness`（store 前缀 `RY-`）

- **RY-01** 基础层的三条判据与 `gate` 的 C3 / C2 / archived-C4 **逐项一致**：同一批 bundle 喂给两边，
  结论与 detail 文本逐条相同（差分断言，不是各写各的）。
- **RY-02** gate 改用基础层之后，`runGate()` 的返回对象与每条 detail **字节不变**
  （抛错分支只比 error class / code / message，**显式排除** stack 的文件名与行号——搬函数必然改这两者）。
- **RY-03** `readiness` 判定 `STEP6` 是在 C3 通过**之后**追加的一条，而不是替换 C3。
- **RY-04** 每一个合法的非 `STEP6` 取值都使 archive 不就绪，而 gate 的 C3 仍 pass
  （断言方向：`archive 就绪 ⇒ gate C3 pass`，反之不成立）。
- **RY-05** 静态断言：`archive-merge.js` 不出现 `require('./gate')`；`gate.js` 不重实现三条判据；
  `gate.js` 仍导出 `classifyStatus`。

### `archive-merge`（store 前缀 `AM-`，自 AM-74 起）

- **AM-74** 三类不就绪各自 refuse：打印 `RESULT: NOT READY — nothing written`，退出码 1，零写入零移动。
- **AM-75** R1 先判：flow-state 类失败**只**报 R1；R1 通过则 R2 与 R3 一次报全。
- **AM-76** `ABANDONED` 与 `DONE` 各有专门措辞，且**不可 force**（带 `--force` 仍 refuse）。
- **AM-77** trivial 层缺 `tasks.md` / 缺台账 = n/a，不阻断；medium/large 层缺失即不就绪。
- **AM-78** 既有 preflight 失败时诊断与退出码**一字不变**，且就绪度**不被求值**（以计数 seam 断言「未被调用」）。
- **AM-79** 未就绪的 dry-run **不**打印 `RESULT: MERGED (dry-run…)`，退出码 1，零写入。
- **AM-80** `--force` 越过 R2/R3 时**逐条打印**被越过的项；不能越过 R1 的任何情形。
- **AM-81** 单文件形式带 `--changes-dir` → 拒绝，零写入零移动，诊断给出高层形式的替代命令。
- **AM-82** 单文件形式不带 `--changes-dir`、`--delta` 词法落在 `apriori/changes` 内 → 拒绝。
- **AM-83** 单文件形式不带 `--changes-dir`、`--delta` 词法在外而 **realpath** 落在 `apriori/changes` 内
  （外部 symlink 指向 bundle 内 delta）→ 拒绝。
- **AM-84** 单文件形式、delta 在任何 changes root 之外 → **现有行为逐字节不变**（含 `--write` 成功路径）。
- **AM-85** 就绪 bundle 的成功输出与移动路径**逐字节不变**（对照 change 前的 golden）。

### 文档与 KB 侧（全部可 grep）

- **AM-86** `USAGE` 两行都出现 `--force`；`docs/cli.md` 与 `docs/cli_cn.md` 的 archive 段落
  同时描述就绪度、`--force` 的边界（不解 R1）、单文件形式的作用域限制。
- **AM-87** `RUNBOOK.md` 与 `RUNBOOK_cn.md` 的 archive 算法段落记录：归档前会判就绪度；
  单文件形式仅用于**不在 changes root 内**的单模块手术。
- **AM-88** `truth/archive-merge.md` 与新增的 `truth/readiness.md` 记录判据同源的决策与不成环的理由。

---

## 五、明确不做（out of scope）

1. **G3 全组**——不作任何「归档之后那次 gate 会解析到这个 bundle」的承诺。
   随之不做：N0..N3 命名空间前置条件、时钟 seam、同名归档目录的排序检查、自定义 root 的提示语。
2. **前身 F-2**：`lib/resolve.js` 的 `resolveChange` 在同名归档中取字典序最后者，
   因此「刚归档的一定是后续解析到的那个」不成立。这是 **resolver 自身的缺陷**，
   与 archive 就绪度无关 → 留作独立 finding，**不在本 change 处理**。
3. **前身 F-4**：`lib/archive-merge.js:753` 的 phase 4 自行 `new Date()`，
   使「检查所用目录名」与「实际创建的目录名」可以不同。属 G3，随 G3 一并放弃。
4. **不导出 `archiveNamespaceDefect`**，`lib/resolve.js` **一字不动**——
   前身把它做成导出符号，只是为了给 N 组共用判据；N 组既然不做，这个改动没有理由存在。
5. **不改 gate 的任何对外行为**。gate 的检查项、退出码、输出一字不变（RY-02 是这条的机械保证）。
6. **不引入并发/锁**。就绪度到提交之间的 TOCTOU 窗口存在且**不在本 change 关闭**（见 §六）。

---

## 六、已知后果与风险

1. **TOCTOU 窗口存在。** 就绪度求值与 commit 之间，别的进程仍可改动 bundle。
   本 change **不关闭**这个窗口，只把「无人看守」变成「看守一次」。
   理由：关闭它需要文件锁或原子快照，那是另一条不变量，硬塞进来会重蹈前身的覆辙。**这一条须在 gate④ 如实呈报。**
2. **单文件形式的能力收窄是对外可见的契约变更。** 今天 `archive --store S --delta apriori/changes/X/specs/…`
   能写 store，之后会拒绝。实测无归档记录使用过该形式，但**外部项目可能有脚本在用**——须写进 CHANGELOG 显著位置。
3. **既有测试的 fixture 需要补就绪 bundle。** 全仓 archive 相关测试文件共 11 个（前身 gap-report §A6 清点）。
   凡是期望 `--change X --write` 成功的调用点，其 fixture 都要补上 `STEP6` 的合法 flow-state、全勾 tasks、全终态 ledger。
   **只补 fixture，断言一字不改**——断言若需要改，说明本 change 改变了不该改变的行为。
4. **`--force` 是一个新的逃生舱。** 它的存在本身会被使用。缓解：只解进度类、逐条打印、
   且 R1 永不可解，使 RUNBOOK §283 的硬规则在代码层面**没有旁路**。
5. **本 change 建在两个 gate④ 已签收的 store 之上**（`gate-degrades` 与 `id-pattern-and-delta-notes`，
   owner 于 2026-08-15T14:00 逐字签收），因此不继承前身「基线可能失效」的风险。
6. **第二次不收敛的处置。** 若本轮 STEP0 再次撞 cap，这将是同一目标的第二次不收敛。
   届时生产方**不会**提议第三次重开，而是把「判 ABANDONED」作为选项如实呈给 owner
   （RUNBOOK §283：ABANDONED 是 harden 轨的合法出口，且**只能**由人类裁定）。

---

## 七、与前身 `archive-preflight` 的关系

前身**不删除、不实现、不归档**，原地保留在 `apriori/changes/archive-preflight/`
（`current-step: SUPERSEDED`，`next-action` 指向本 change）。它的价值是记录**为什么全量版本很难**：
req-v1..v5 + req-final、gap-report、design(262 行) 的 §D6b 六批次、10 份评审文档 + raw 全部可查。
其九轮评审的实证发现 F-1..F-4 已转录在它的 flow-state 尾部，本 change 只继承 F-1（以拒绝方式关闭），
F-2 转独立 finding，F-3 存档备查，F-4 随 G3 放弃。

**CAS 复核（已做，2026-08-15T14:20）**：前身 MODIFIED 的块
`high-level archive merges a whole change transactionally` 在当前 store 有 `AM-13..AM-22` 共 10 个场景；
`id-pattern-and-delta-notes` 新增的 `AM-71/72/73` 落在**另一个块**（`the delta parser consumes its whole input`）。
**无 §4.11 冲突**。本 change 将对同一个块新增就绪度场景，须重新盖戳（当前 base `sha256:51620e96…`）。
