# gap-report — archive-readiness（STEP1，Large 层必做）

> 本报告只陈述**状态 A 的事实**，不含设计选择。每一条都可复现。
> 采集时间 2026-08-15，分支 `brownfield-round2` @ `edfdf2e`（两个 gate④ 已由 owner 签收）。
> RUNBOOK §287 允许 gap-report 提前于 req-v1；本报告的 §A 与 §C 在 STEP0·r1 之前即已采集。
> **2026-08-15T17:50 修订**：STEP0 在 5 轮内收敛（7→3→3→1→0），期间新采集的状态 A 事实补入 §A8..§A11；§D 风险重排。

---

## A、组件级清点

### A1 `lib/archive-merge.js` — 归档的四阶段

`archiveChange(o)`（`:668`）：**preflight → stage → commit → move**。

| 阶段 | 行 | 内容 |
|---|---|---|
| 1 preflight | `:675`–`:717` | `discoverDeltas` → `buildProjection` → 逐模块报告 → CAS 拒绝集 → `preflightFailures = [casDenials, hygiene, casMismatches, conflicts]` → 失败即 `RESULT: FAILED PREFLIGHT — nothing written`，code 1 |
| 1b `--write` 专属 | `:719`–`:731` | 温存文件已存在检查；`--changes-dir` 显式时的归档目的地包含性检查（`containsReal`） |
| 1c 完整性报告 | `:733` | `pushIntegritySection(...)` —— **信息性**，位于全部 preflight 守卫之后、任何写结果行之前 |
| dry-run 出口 | `:735` | `RESULT: MERGED (dry-run; N module(s)) — pass --write to apply`，code 0 |
| 2 stage | `:740` | 逐 job 写 `<store>.tmp-archive`；失败则清掉本轮温存，store 未动 |
| 3 commit | `:753` | 逐文件原子 rename，排序；中途失败**不回滚**，逐条打印已提交/未提交/残留温存 |
| 4 move | `:753` 之后 | 自行 `new Date()` 生成 `<YYYY-MM-DDThhmm>-<name>`，把在途目录移入 `archive/` |

**关键事实：`archiveChange` 不调用 `resolveChange`。** bundle 目录来自
`discoverDeltas(changesDirAbs, name)`（`:329`）的 `path.join(changesDirAbs, name)`（`:333`），
且该函数已经做完三重守卫：`validateChangeName`（`:331`）、`existsSync`（`:334`）、
`containsReal(changesDirAbs, changeDir)`（`:335`）、以及 `specs/` 自身的包含性（`:339`）。

→ **就绪度所需的 bundle 目录，是一个已被证明包含在 changes root 内的真实目录。**
本 change 因此**不需要**为 bundle 目录本身再做包含性判断（前身在这一点上做了大量重复建设）。
**但 bundle 内部的三个 artifact 仍需各自判**（symlink 出界、坏祖先等）——见 §A8 与 req-final 的 B7a/B7c。

### A2 `archive` 完全不读 bundle 的流程文件

```
$ grep -n "flow-state\|tasks\.md\|ledger" lib/archive-merge.js
860:      console.log('\nCONFLICTS (stop — open a ledger issue, human resolves):');
```

唯一命中是一句提示文本中的 "ledger" 一词。**零判据。**

### A3 `lib/gate.js` 已有的三条同类判据

| gate | 函数 | 行 | 判什么 | 返回 |
|---|---|---|---|---|
| C3 | `checkFlowState(state, name)` | `:28` | 五个必填键存在且非占位符（`<`/`>` 检测）、`change` 与名字一致、`current-step` ∈ `STEP_ENUM`、`tier` ∈ `TIER_ENUM` | `{id,status,detail}` |
| C2 | `checkTasks(dir, tier)` | `:40` | `/^\s*-\s\[\s\]/gm` 计数；缺文件时 trivial → `n/a`，其余 → `blocked` | 同上 |
| C4 | `checkLedger(tier, stage, dir)` | `:96` | 逐行 `classifyStatus`：非法词汇 / rejected-waived 缺理由 / waived 缺 `gates:` 人类记录 / `open`；**`stage === 'archived'` 时额外要求终态** | 同上 |

辅助：`classifyStatus`（`:56`，**已导出**，`GT-15` 语料测试在用）、`gatesEntries`（`:75`）、
`waiveEvidence`（`:91`）、`STATUS_RE`（`:55`）、`STEP_ENUM`（`:18`）、`TIER_ENUM`（`:20`）。

`STEP_ENUM` = `STEP0..STEP6, INTENT-CARD, SPIKE, EXTRACTION, DONE, ABANDONED` —— **`ABANDONED` 是合法值**，
C3 会让它通过。C3 判「词汇表合法」，不判「可以归档」。

### A4 模块依赖方向（实测）

```
gate.js          → status.js, spec-runner.js, archive-merge.js(:13), resolve.js, config.js, args.js
archive-merge.js → args.js, resolve.js(:14), config.js(:607 惰性), 
status.js        → args.js, resolve.js
resolve.js       → config.js(:102,:108 惰性)
spec-runner.js   → archive-merge.js(:15), args.js, config.js
```

`gate.js → archive-merge.js` **已成立**（`:13` 取 `CHANGE_NAME_RE` 与 `containsReal`）。
→ `archive-merge.js → gate.js` **会成环**。archive 不能直接调 gate 的三个 checker。

可行的无环形态：`readiness.js → status.js → resolve.js → config.js`；
`gate.js → readiness.js`、`archive-merge.js → readiness.js` 皆无环
（`status.js` 与 `resolve.js` 都不依赖 `archive-merge.js`）。

### A5 `--force` 今天不存在

`USAGE`（`:790`）无 `--force`；`cli()`（`:792`）的两种形式互斥校验在 `:807`。

### A6 迁移面：期望 archive 成功的既有调用点（**逐文件清点，不以「大概就这两个」收尾**）

判据：测试源码中同一行同时出现 `archive` 与 `--change`。

**高层形式**（含 `--change`，**不含** `--store`/`--delta`）——这些的 fixture 需要补成「就绪 bundle」：

| 文件 | 调用点 |
|---|---|
| `test/archive-change.test.js` | 38 |
| `test/config.test.js` | 10 |
| `test/modified-integrity.test.js` | 8 |
| `test/id-default-and-notes.test.js` | 3 |
| `test/protocol.test.js` | 1 |
| `test/resolve.test.js` | 1 |
| **合计** | **61**（分布在 **6** 个文件） |

**单文件形式**（含 `--store`/`--delta`）——B2 的作用域限制影响面：

| 文件 | 调用点 | 其中 `--delta` 路径含 `changes` |
|---|---|---|
| `test/archive-change.test.js` | 4 | **0** |
| `test/cli.test.js` | 1 | **0** |
| `test/resolve.test.js` | 1 | **0** |
| **合计** | **6** | **0** |

> **限定**：以上为**单行**匹配。跨行拼装的调用（参数数组分行书写）不会被这个判据捕捉。
> STEP5 的 M1 任务必须逐文件人工走一遍，把跨行调用补进清单，**不得以本表收尾**。

**结论**：B2（拒绝 changes root 内的单文件 delta）在本仓测试套件内的已知冲击为 **0 处**；
真正的迁移工作量在 61 个高层调用点的 fixture 上。

### A7 归档语料中的实际使用

`apriori/changes/archive/` 下**无任何**归档记录使用过 `archive --delta`（单文件形式）。
`RUNBOOK.md:252` 对单文件形式的承诺原文为 "the single-file form (`--store <f> --delta <f>`) remains for one-module surgery"。

### A8 状态 A 的三个 helper **全部**吞掉异常（STEP0·r1/r3/r4 累积实证）

| helper | 位置 | 吞法 | 后果 |
|---|---|---|---|
| `fileReadDefect` | `resolve.js:136` `:141` | `catch { … }`，不看 `e.code` | `EACCES` → 归成 `missing` |
| `reviewDirDefect` | `gate.js:132` | `catch { return null; }` | 「读不到」当成「不存在」 |
| `containsReal` | `resolve.js:42` `:44` | `catch { return false; }` ×2 | `EACCES` 与真逃逸不可区分 |

三者服务的调用方（gate / status / resolve）**只报告不写入**，这个设计对它们是合适的。
archive 要拿它们守一次**不可逆写入**则不成立——这是本 change 需要**第二份实现**的根本理由，
不是重复建设（req-final §八·4 已写成决策）。

**衍生的两个陷阱，均由 STEP0 查获：**

1. **二次 `lstat` 窗口**：外层先分类、再调 helper **无效**——helper 内部会再 `lstat` 一次并再次吞错。
   → 必须**单趟**分类。
2. **类型规则错配**：`resolve.js:151-155` 含 `if (!st.isFile()) return not-file`；
   照抄到 `review/` **目录**上会恒定 `not-file`，**拒绝每一个正常 bundle**。
   → artifact 用 `isFile()`，review 根用 `isDirectory()`。

### A9 delta 语法的操作粒度是 Requirement 块，不是 Scenario（STEP0·r2 实证）

`AM-12`（`apriori/specs/archive-merge/spec.md:48`）所属块为
`### Requirement: archive-merge applies delta specs to the living store`（`:1`），
含 **AM-01..AM-12 共 12 个场景**。`## REMOVED` 以整块为单位 → 用它会把仍有效的 AM-01..AM-11 一并弃用。
正解：`## MODIFIED` 整块、只去掉 AM-12，由 **MODIFIED 完整性报告**打印
`    ! dropped: AM-12 the store commit and the dir move are one transaction (single-file form)` 作证。
（formatter 见 `archive-merge.js:593` 的 `! dropped: ${sanField(d.title)}`——**完整标题**，非 ID；
该行约 93 字符，未触及 `:588` 的 120 字符截断。）

### A10 单文件形式的真实承诺面（STEP0·r1/r2 实证，req-v1 曾漏报）

全仓 `--delta` 命中 **38 处**（排除前身目录）：测试 19 / 实现 5 / **活跃文档 7** / **living spec 7**。

两处最重：

- `docs/concepts.md:553-555` 与 `docs/concepts_cn.md:553-555` —— **入门教程的 STEP6 归档命令**，
  `--store` + `--delta apriori/changes/…` + `--changes-dir` 三样齐全，同时触发 B2a 与 B2b。
- `SECURITY.md:10` **末句** —— "Explicit operator-given file arguments (single-file
  `archive --store <f> --delta <f>`, `stamp <file>`) are used as given, like any file tool."
  这是对单文件形式的**显式承诺**，与 B2b 直接冲突，必须同步。

### A11 `gates:` 是 append-only（`RUNBOOK.md:212`，STEP0·r3 实证）

原文注释：`gates:                  # append-only log of human decisions`。
→ 任何「删除某条记录」的机制都**不是合法流程动作**；`--force` 的撤销必须走**追加**一条
`archive-force-revoke <class>`，同类以 `gatesEntries()` 顺序中的最后一条为准。

---

## B、KB 新鲜度（`git log <source-commit>..HEAD -- lib/<m>.js`）

| truth 文档 | source-commit | 其后该模块的提交数 |
|---|---|---|
| `truth/archive-merge.md` | `b54bb5d` | **0** |
| `truth/gate.md` | `3d32d6f` | **0** |
| `truth/status.md` | `6dc5f98` | **0** |
| `truth/resolve.md` | `6dc5f98` | **0** |

四份 Contract 段**全部新鲜**。本 change 若落地，需更新 `truth/archive-merge.md`、`truth/gate.md`，
并**新增** `truth/readiness.md`。

---

## C、与前身 `archive-preflight` 的差分

| 项 | 前身 | 本 change |
|---|---|---|
| 共享基础层 | 新 store 模块 `readiness` + 导出 `archiveNamespaceDefect`（改 `lib/resolve.js`） | 只有 `readiness`，**`lib/resolve.js` 一字不动** |
| 归属算法 | 有序互斥阶梯 + 集合算法 + root 双形态去重 + 身份一致集 | **无**——落在 changes root 内即拒绝 |
| 命名空间 N0..N3 | 有（含时钟 seam、同名归档排序、显式 root 提示） | **无**——G3 整体放弃 |
| 包含性判断 | 自建 | bundle 目录**复用 `discoverDeltas` 的三重守卫**（A1）；bundle 内 artifact 用自带的 `containDefect`（A8） |
| 触及的既有文件 | `lib/archive-merge.js`、`lib/gate.js`、`lib/resolve.js` | `lib/archive-merge.js`、`lib/gate.js` |
| 新增文件 | `lib/readiness.js` | `lib/readiness.js` |

---

## D、风险（供 gate② 与 STEP2 使用）

- **R1 分层边界**：把三个 checker 搬出 `gate.js` 必须做到 gate 对外**零变化**。
  机械保证 = 差分断言（同一批 bundle 喂两边）+ 抛错分支只比 class/code/message
  （**显式排除** stack 的文件名行号——搬函数必然改这两者，这是前身 r3 的实证结论）。
- **R1b 两份实现的差分基准不是同一个**（r4 实证）：`artifactDefect` 的基准是
  `resolve.fileReadDefect`，`reviewRootDefect` 的基准是 `gate.reviewDirDefect`。
  合成一组差分会漏掉「review 根不存在 → 状态 A 返回 `null`」这一格。
- **R1c 依赖环**（r2/r4 实证）：`gate.js:13` 已 `require('./archive-merge')`，故 `archive-merge → gate` 成环；
  且「原样搬入 `reviewDirDefect`」会连 `archive-merge.containsReal` 一起搬，形成
  `archive-merge → readiness → archive-merge`。基础层取 `resolve.containsReal`，
  archive 层自带 `containDefect`；三条静态断言锁住（RY-05 / RY-07 / RY-10）。
- **R1d 类型规则错配会当场炸掉**（r4 实证）：照抄 `isFile()` 到 `review/` 目录 → 每个正常 bundle 被拒。
  护栏 = AM-112（完全正常的 bundle 必须就绪并归档成功）。
- **R2 迁移面**：61 个高层调用点 + 6 个单文件调用点（其中落在 changes root 内的 **0** 个）。
  风险不在数量，在**遗漏**——A6 的单行判据抓不到跨行调用。
- **R3 TOCTOU**：就绪度求值到 commit 之间的窗口不关闭（req-final §六-1 已给出精确前置条件区间，
  并要求一个「readiness 判完之后、首次写 store 之前」的 hook 证明实现不重读不检测；须在 gate④ 呈报）。
- **R4 契约变更（三项）**：① 未就绪的 change 不再能归档；② 单文件形式不再接受 `--changes-dir`
  （**失去移动能力**，导致 living spec 的 AM-12 变为空洞，须 `## MODIFIED` 整块去除该场景——
  本 change 唯一一处**删除既有承诺**）；③ 单文件形式不再接受 changes root 内的 `--delta`
  （与 `SECURITY.md:10` 末句的现行承诺冲突，须同步）。本仓测试冲击为 0，**外部脚本未知**。
- **R5 第二次不收敛（已解除）**：前身在同一目标上两次撞 cap；本 change 的 STEP0 **在 cap 内收敛**
  （7→3→3→1→0）。该承诺**对 STEP2 仍然有效**：若 STEP2 撞 `step2-cap`，
  生产方**不提议第三次重开**，而是把「判 ABANDONED」作为选项呈给 owner（RUNBOOK §283）。
