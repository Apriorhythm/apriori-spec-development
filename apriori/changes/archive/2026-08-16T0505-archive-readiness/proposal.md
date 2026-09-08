# proposal — archive-readiness

> 依据 `requirement/req-final.md`（STEP0 收敛，verdict 序列 7→3→3→1→0）与 `gap-report.md`。

## 一句话

给 `apriori archive` 装上**归档前的就绪度准入**，并把单文件形式从「能碰 change bundle」收回到
「只做 changes root 之外的单模块手术」——两件事共同维护同一条不变量：
**没做完的 change 写不进 living store。**

## 做法（四件事，按依赖排序）

### 1. 新增 `lib/readiness.js`：两层

- **基础层**：`checkFlowState` / `checkTasks` / `checkLedger` / `classifyStatus` / `gatesEntries` /
  `waiveEvidence` / `reviewDirDefect` / `STEP_ENUM` / `TIER_ENUM` 从 `gate.js` **原样搬入**，
  行为逐字节等于状态 A。`gate.js` 改为从这里取并**继续再导出** `classifyStatus`。
  `reviewDirDefect` 的 `containsReal` 改取 `resolve` 的那一份（破环）。
- **archive 层**：**新写** `artifactDefect` / `reviewRootDefect` / `containDefect`，
  单趟 `lstat`、按 `e.code` 分类、artifact 用 `isFile()`、review 根用 `isDirectory()`。
  **不调用**任何吞异常的既有 helper。

> 为什么要两份实现：状态 A 的 `fileReadDefect` / `reviewDirDefect` / `containsReal` **全部**
> 以 `catch { …默认值 }` 吞异常，因为它们的调用方只报告不写入；archive 守的是不可逆写入。
> **同一段规则，两种责任等级，两份实现**——由 RY-05 / RY-07 / RY-08 / RY-09 / RY-10 五条锁住。

### 2. `archive --change` 新增就绪度判定

插在**既有 preflight 的全部守卫之后、`pushIntegritySection` 之前**——
dry-run 与 `--write` 在同一个逻辑点求值，既有失败的诊断与退出码一字不变。

有序判定：**读取/结构 → C3 → STEP6 overlay → R2/R3 进度**。
新结果行 `RESULT: NOT READY — nothing written`，退出码 1。

### 3. `--force`：只解进度类，且要有预存的、按类具名的人类记录

`archive-force tasks <reason>` / `archive-force ledger <reason>`，锚定语法、一条一类；
撤销走**追加** `archive-force-revoke <class> <reason>`（`gates:` 是 append-only）。
R1、结构类、artifact 缺失、格式/证据问题**永不可 force**。

### 4. 单文件形式收窄

- `--changes-dir` 不再与单文件形式兼容 → exit 2（**推论：该形式此后永不移动目录**）；
- `--delta` 落在规范 changes root 内（词法或 realpath 任一命中）→ 拒绝；
- `--force` 传给单文件形式 → exit 2。

## 明确不做

G3 全组（post-archive gate 的充分性、命名空间前置条件、时钟 seam）、`lib/resolve.js` 一字不动、
不改 gate 对外行为、不引入并发锁。两条留给后续 change 的稳定 finding：
`finding:resolver-archive-tiebreak`、`finding:archive-move-clock`。

## 代价（须在 gate④ 呈报）

1. **三项对外可见的契约变更**，其中「单文件形式失去移动能力」使 living spec 的 **AM-12 变为空洞**——
   本 change **唯一一处删除既有承诺**，以 `## MODIFIED` 整块的方式去除，
   由完整性报告的 `! dropped: AM-12 …` 作证。
2. **入门教程要改**：`docs/concepts{,_cn}.md:553` 的 STEP6 命令迁移到高层形式。
3. **`SECURITY.md:10` 末句要改**：它现在承诺单文件参数 "used as given"。
4. **TOCTOU 窗口不关闭**——只把「无人看守」变成「看守一次」。
5. **`--force` 的授权是 standing 的**：写下之后新出现的同类失败会被同一条记录覆盖，
   直到追加一条同类 revoke。范围宽窄由 owner 裁决。
6. **61 个高层调用点 + 6 个单文件调用点**的 fixture 迁移；判据抓不到跨行调用，须人工走完。
