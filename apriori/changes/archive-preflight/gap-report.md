# gap-report — archive-preflight（STEP1 / P3）

> 输入：`requirement/req-final.md`、`apriori/truth/{archive-merge,status,resolve,gate,args}.md`、
> `apriori/specs/{archive-merge,gate,status}/spec.md`、`lib/`、`test/`
> 规矩：本步不写代码，只对齐事实。行号取自 `brownfield-round2` @ f415824。

---

## 一、状态 A — 组件级清点

### A1 `lib/archive-merge.js` — `archiveChange()` 四阶段（`:652-775`）

| 位置 | 现状事实 |
|---|---|
| `:661` | phase 1 preflight 起点。**全文无** `flow-state` / `tasks` / `issues.md` / `current-step` 字样 |
| `:662` | `discoverDeltas(changesDir, o.change)` → validation 失败即 `return {code:2}` |
| `:664` | `buildProjection(...)` → `p.validation` 失败即 `return {code:2}` |
| `:672-687` | CAS 戳与 waiver（`casWaiver`） |
| `:688-693` | `preflightFailures = [...casDenials, ...hygiene, ...casMismatches, ...conflicts]` → `RESULT: FAILED PREFLIGHT — nothing written`，`code:1`。**就绪度要挂在这一组之后** |
| `:714-719` | MODIFIED 完整性报告；dry-run 在此打印 `RESULT: MERGED (dry-run; N module(s))` 并返回 |
| `:722+` | phase 2 stage（`.tmp-archive`）→ phase 3 commit（sorted rename）→ phase 4 move |
| `:753` | **`archiveChangeDir(changesDir, o.change, new Date(), ops)`** —— phase 4 **自己取时间**。req-final 的 **N0** 要求它改为消费 preflight 捕获的那一个值 |

### A2 `lib/archive-merge.js` — 单文件形式 `cli()`（`:778-872`）

| 位置 | 现状事实 |
|---|---|
| `:786-790` | 高层形式（`--change` 且无 `--store/--delta`）→ `archiveChange(...)` |
| `:851-862` | `--write` 时：写 `.tmp-archive` → **`if (a.changesDir) archiveChangeDir(a.changesDir, a.change, new Date())`** → `renameSync` 提交 store |
| **结论** | 单文件形式**确实会移动正式 bundle**（`:860`），且**即使不移动也会写 store**——这就是 req-final §4.3 两条绕过口的源头 |

### A3 `lib/gate.js` — 将被抽走的三个检查器与两个守卫

| 位置 | 符号 | 备注 |
|---|---|---|
| `:12` | `const { CHANGE_NAME_RE, containsReal } = require('./archive-merge')` | **`gate → archive-merge` 这条边是环的另一半** |
| — | `classifyStatus` | **已导出**（`truth/gate.md` 记载；GT-15 的语料测试在用）——搬家后 gate 必须继续再导出 |
| — | `gatesEntries` / `waiveEvidence` | C4 的 `waived` 人类证据 |
| — | `reviewDirDefect(dir)` | lstat 优先；symlink / 非目录 / `containsReal` 逃逸 → C4 与 C5 同时 blocked |
| — | `checkTasks(dir, tier)` | **裸 `existsSync`**——这是 REQ-8 的根源：换成安全读取就会改变 gate 的行为 |
| — | `checkFlowState(state, name)` | 五个必需键 + 占位符 + `change` 相符 + 两个精确词汇表 |
| — | `checkLedger(tier, stage, dir)` | 词汇 / 理由 / waiver 证据 / `open` / **归档态全终态** / 缺失的 tier 分支 |

### A4 依赖图（实测）与共享位

```
archive-merge → args, config, resolve          status → args, resolve
resolve       → config                          gate   → archive-merge, args, config, resolve, spec-runner, status
```

`gate → archive-merge` 已存在 ⇒ **`archive-merge → gate` 成环**。
新模块 `lib/readiness.js` 只依赖 `./status` 与 `./resolve` ⇒
`archive-merge → readiness → {status, resolve} → {args, config}` **无环**。

**`containsReal` 的两份实现**（req-final §1.3 / §9.2，本步实测复核）：

| 情形 | `archive-merge:277` | `resolve:41` |
|---|---|---|
| 正常存在的目录 / 更深目录 / 是文件 | true / true / true | true / true / true |
| **target === root** | false | true ← 唯一分歧 |
| 指向外部 | false | false |

`reviewDirDefect` 的 target 恒为 `<dir>/review`，永不等于 root，且调用前已 lstat 成功、symlink 先行返回
⇒ **调用点上两份行为一致，无需搬迁任何符号**（评审方已确认该论证成立）。

### A5 `lib/resolve.js` — 需要新导出的那一块

| 符号 | 状态 | 本 change 的关系 |
|---|---|---|
| `rootDefect(p, label)` | **私有，未导出**（`:32`） | req-final §B2.1 的 `archiveNamespaceDefect` 要用它 |
| `containsReal` | 已导出（`:41`） | readiness 直接用，不搬 |
| `stampValid` | 已导出（`:22`） | 归档候选的 Gregorian 往返校验 |
| `resolveChange(cwd, name)` | 已导出（`:51`） | **active 存在即提前返回**——r5·REQ-1-2 要求这条短路一字不改 |
| `fileReadDefect(bundleDir, p)` | 已导出（`:134`） | archive 叠加层的安全读取 |

### A6 受影响的测试面（req-final §七要求的穷举清点）

调用 `archive` 的测试文件共 **11 个**：

| 文件 | 测试数 | 与就绪度的关系 |
|---|---|---|
| `test/archive-change.test.js` | 32 | `twoModuleProject()` **无** flow-state / tasks / ledger → **全部需补就绪 bundle** |
| `test/modified-integrity.test.js` | 12 | `archiveProj()` 有 medium flow-state、**无** tasks / ledger → 需补，且 `current-step` 要改 STEP6 |
| `test/archive-merge.test.js` | 13 | 多为单文件形式；需按 §4.3 的归属算法逐条判定是否受影响 |
| `test/config.test.js` | 12 | 有 archive 的 CAS 相关用例 |
| `test/gate.test.js` | 22 | 主要是 gate 自己；但共享层搬家后需确认行为不变 |
| `test/cli.test.js` / `args.test.js` / `new.test.js` / `resolve.test.js` / `status.test.js` / `hotfix-archive.test.js` | 11/8/5/5/9/6 | 逐条核对是否触及 archive 成功路径 |

**STEP5 的第一件事就是把这张表逐条走完**（tasks.md 单列一条，不得以「大概就这两个」收尾）。

---

## 二、状态 B

见 `requirement/req-final.md` §二/§三/§四/§五。摘要：就绪度 = gate 的 C2+C3+归档态 C4 **完整判据**
（基础层与 gate 共用、行为不变）+ archive 叠加层（STEP6 收窄、安全读取、N0..N3 命名空间检查）；
失败即什么都不写；`--force` 受豁免矩阵约束且需预先存在的人类证据；dry-run 同样诚实。

---

## 三、差距（G1..G12）

| # | 差距 | 影响面 | 风险 |
|---|---|---|---|
| **G1** | 无就绪度检查 | archive-merge | 本 change 的主体 |
| **G2** | 三个检查器与两个守卫住在 `gate.js`，archive 够不着（环） | 新增 readiness + gate 改 import | **中**。必须保持 gate 行为与 `classifyStatus` 再导出 |
| **G3** | `checkTasks`/`checkLedger` 用裸 `existsSync` | readiness 分层 | **中**。安全读取只能加在 archive 叠加层，否则改 gate（REQ-8） |
| **G4** | C3 的允许步骤集合两边不同 | readiness | 两个函数：`checkFlowState` / `checkArchiveFlowState` |
| **G5** | phase 4 自取 `new Date()`（`:753`） | archive-merge | **中**。N0 要求 preflight 捕获一次并共用 |
| **G6** | `rootDefect` 私有 | resolve 新增导出 | **中**。且 `resolveChange` 的 active-first 短路不得被破坏 |
| **G7** | 单文件形式无就绪度（两条绕过口：带 `--changes-dir` 会移动；不带也会写 store） | archive-merge cli | **高**。ABANDONED 硬禁令的实际漏洞 |
| **G8** | 归属算法不存在 | archive-merge | **高**。需词法 + realpath 双算，六行处置表 |
| **G9** | dry-run 恒 MERGED | archive-merge | 撞 living spec AM-13 与多处测试 |
| **G10** | 无 `--force` flag、无豁免矩阵、无 gates 证据语法 | archive-merge + args | 中 |
| **G11** | 无并发 seam / 时钟 seam | archive-merge | 中。AC-AP-17c/17g/19 需要 |
| **G12** | 11 个测试文件的 fixture 迁移 + living spec AM-13 拆分 | test/ + specs | **工作量大**，但机械 |

---

## 四、风险与 STEP2 需定夺

| # | 事项 |
|---|---|
| R1 | **G3/G4 的分层边界**是最易实现错的一处：基础层必须是「gate 今天那一份」，安全读取与 STEP6 收窄只能在 wrapper 里，且 wrapper 必须**先守卫后读取** |
| R2 | **G6 的 active-first 短路**：综合 predicate 只在 readiness 侧调用；`resolveChange()` 一字不改 |
| R3 | **G7/G8 的归属算法**要覆盖六行处置表，且词法与 realpath 都要算 |
| R4 | G12 的迁移量：32 + 12 + 若干，需在 STEP2 的 tasks.md 里排成可核对的清单 |
| R5 | 本 change 自举：它自己归档时要过自己这一关 |
| R6 | **req-final 未经独立评审**（STEP0 在 cap 上退出）——STEP2 的 P5 是第一次有人独立读它 |

---

## 五、KB 新鲜度（STEP1 出口）

| truth | source-commit | `git log <stamp>..HEAD -- lib/<m>.js` | 结论 |
|---|---|---|---|
| `archive-merge.md` | 4127653 | 空 | 新鲜 |
| `status.md` | 6dc5f98 | 空 | 新鲜 |
| `resolve.md` | 6dc5f98 | 空 | 新鲜 |
| `gate.md` | 3d32d6f（change 1 刚刷） | 空 | 新鲜 |

---

## 六、STEP1 出口

Large tier → **gate ②**，已被 kickoff 的关卡合并授权覆盖，不停，直接进 STEP2。
top risks（R1 / R2 / R3 / R6）并入下一次向人类的汇报。
