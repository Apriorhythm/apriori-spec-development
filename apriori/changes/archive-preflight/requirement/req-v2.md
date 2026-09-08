# req-v2 — archive-preflight：不可逆的 store 写入不该对「这个 change 真的完成了吗」一无所知

> change: `archive-preflight` · tier: large · track: harden
> lineage: 分支 `brownfield-round2`（自 main@235a121 切出）；产品线 v4，最终目标 main；**禁止**合并到 v1 / v3
> 证据来源：`apriori-in-practice/5.1/Apriori棕地项目使用复盘.md` §5 FN-1 / §8 P0-2，加本仓源码实证
> 本版处置 STEP0·r1 的 REQ-1..7（处置说明见 §九）

---

## 一、问题（状态 A）

### 1.1 `apriori archive --write` 不看 change 是否真的完成

`lib/archive-merge.js:661-691` 的 phase 1「preflight」只校验**与 delta 有关**的三类东西：
`discoverDeltas` 的 validation（`:662`）、`buildProjection` 的 validation / hygiene / conflicts（`:664, :688`）、
CAS 戳（`:672-687`）。

**全文 grep `flow-state` / `tasks` / `issues.md` / `current-step` → 0 命中。**

**真实后果（棕地实测）**：`dashboard-etl-slim-pipeline` 的 `tasks.md` **6 项 `[x]` / 45 项 `[ ]`**、
bundle 内一致性评审 **0 份**，`archive --write` 成功重写 store。RUNBOOK STEP5 的退出条件一条也没被机械校验过。

### 1.2 这个缺口为什么特别贵

归档不可逆（store 重写 + bundle 移走）。而能抓住它的检查**已经存在**——gate 的 C2/C3/C4——
只是 `archive` 不要求 gate 通过，两条命令互不知情。复盘里两个缺口叠加：
gate 因缺一行 `test-cmd` 而从未运行（change 1 已修），archive 又不自查。

### 1.3 依赖图与共享位（r1·REQ-5 已复核属实，本版给出确切结构）

实测 `lib/` 的 require 图：

```
archive-merge → args, config, resolve
status        → args, resolve
resolve       → config
gate          → archive-merge, args, config, resolve, spec-runner, status
```

`gate → archive-merge` 已存在，故 **`archive-merge → gate` 会成环**。

**关键新事实（本版实证补充）**：`containsReal` 在本仓有**两份语义不同的实现**——
- `lib/resolve.js:41`：要求 target **已存在**（对 target 做 realpathSync），且允许 `real === realRoot`；
- `lib/archive-merge.js:277`：向上走到**最近存在的祖先**（容忍尚不存在的路径），且 `full === realRoot` **不算包含**。

gate 的 `reviewDirDefect`（C4/C5 共用的 review 根守卫）用的是 **archive-merge 那一份**（`lib/gate.js:12`）。
这决定了共享模块的形状：若共享模块要复刻 gate 的守卫，它就不能经由 archive-merge 取这个函数，
否则 `archive-merge → readiness → archive-merge` 成环。

### 1.4 gate C2/C3/C4 的**完整**判据（r1·REQ-1 的事实基础）

| 检查 | 完整判据（`lib/gate.js`） |
|---|---|
| C2 tasks | 零个 `- [ ]`（`[x]`/`[X]` 算已勾）；文件缺失 → trivial 为 `n/a`，其余 **blocked** |
| C3 flow-state | 必需键 `change`/`tier`/`track`/`lineage`/`current-step` **全部存在且非占位符**（含 `<`/`>` 即占位）；`current-step` 与 `tier` 各自在**精确词汇表**内；`change` 值必须等于被查询的名字；文件缺失/不可读 → **exit 2** |
| C4 ledger（**archived 阶段**） | 每行状态在词汇表内（未知即 block，两阶段皆然）；`rejected`/`rejected-verified`/`waived` 必须有理由（token 之后含单词字符）；`waived` 还需**同 bundle flow-state `gates:` 里预先存在**的人类证据（含该行 ID 的精确 token + `waiv`）；`open` 阻断；**归档阶段每行必须终态**；文件缺失 → trivial `n/a`，其余 blocked；`review/` 根经 `reviewDirDefect` 先 lstat（悬空 symlink 是缺陷不是缺席），symlink / 非目录 / 逃逸 → C4 与 C5 同时 blocked |

**只做「current-step + tasks 未勾 + ledger 终态 token」三条，覆盖不了上面任何一列的全部。**

### 1.5 dry-run 的既有依赖（r1·REQ-7 的事实基础，已实测）

- `test/archive-change.test.js` 的 `twoModuleProject()` **没有** flow-state / tasks / ledger，
  32 个测试建在它之上；`AM-13` 断言 high-level dry-run exit 0。
- `test/modified-integrity.test.js` 的 `archiveProj()` 只有 medium flow-state、**无** tasks / ledger；
  `AM-46` 对 `RESULT: MERGED (dry-run…)` 做字面断言。
- living spec `archive-merge` 的 `AM-13` 把 dry-run 描述为「成功报告整个 change」。
- 未发现 `scripts/` / README / golden-path 依赖「dry-run 恒 MERGED」。

---

## 二、目标状态 B

**一句话**：不可逆的 store 写入之前，先用**纯文件读取**问一遍
「这个 change 的状态机走到该走的位置了吗、活儿干完了吗、账平了吗」——
判据**与 post-archive gate 将要问的完全同源**，任何一条答不上来就什么都不写。

### B1 — 就绪度 = gate 的 C2 + C3 + **归档态** C4 的**完整**判据，同一份代码

不是「三条简化检查」，而是**复用 gate 现有的三个检查器本身**（§1.4 那三行判据一字不减）。
这是 REQ-1 的直接处置：只有判据同源，B2 的充分性命题才可能成立。

`current-step` 的允许集合额外收窄为 **`{STEP6}`**（见 §三）。

### B2 — 充分性命题（收窄后的准确表述）

> 若一次归档**未使用 `--force`**、且在 readiness 读取到 bundle 移动完成之间**没有并发修改**该 bundle，
> 则紧随其后的 `apriori gate --change <name>` 的 **C2、C3、C4 不会 BLOCK**。

命题**不覆盖** C1（绑定/测试）、C5（verdict↔raw 证据）、C6（KB 新鲜度）、C7（n/a）——
那三项不是纯文件读取，或不在本 change 范围内。这三个限定词（非 force、无并发、只覆盖 C2/C3/C4）
是 REQ-1/REQ-3/REQ-6 三条的共同处置：**把一个假命题改成一个真命题**。

### B3 — 失败即「什么都不写」，诊断能直接照着修

走**现有**的 preflight 失败路径：`RESULT: FAILED PREFLIGHT — nothing written`，退出码 **1**。
每条失败点名具体对象（哪个 key / 未勾几项与首项文本 / 哪几行 ID 是什么状态 / 哪个路径什么缺陷）。

### B4 — `--force` 是**受限**的、需要预先存在人类证据的可见豁免

见 §四的豁免矩阵。三条铁律：
① 结构性失败**不可豁免**；② `--force` 只作用于就绪度，**绝不**触及既有的 delta / CAS / temp / containment preflight；
③ `--force` **绝不**替人类往 flow-state 写任何东西。

### B5 — 只对**新**归档生效，不回溯

不扫描、不修改、不重判 `apriori/changes/archive/` 下的任何存量 bundle。

### B6 — dry-run 也要说实话

dry-run 同样执行就绪度并报告结果；被拦下时**不**打印 `RESULT: MERGED (dry-run…)`。
理由：dry-run 的用途是「告诉我 `--write` 会发生什么」。
其对既有测试与 living spec 的冲击按 §七的迁移计划处理（REQ-7）。

---

## 三、`current-step` 的允许集合

**允许集合 = `{STEP6}`，仅此一个**（r1·REQ-4 处置：v1 曾允许 `STEP5`）。

| current-step | 允许？ | 理由 |
|---|---|---|
| `STEP6` | ✅ | 归档就是 STEP6 的动作 |
| `STEP5` | ❌ | RUNBOOK 把 archive action 定义在 STEP6，且要求每步后立即更新 flow-state。STEP5 的出口条件是 tests + verify + lint + tasks + P8 verdict **全部**满足；就绪度只覆盖其中 tasks 与 ledger，**证明不了**一个仍标记 STEP5 的 change 已出栈。允许它，恰好保留了「实现还在进行中却归档」这条路径——与本 change 的目标正面冲突。precedent：`gate-degrades` 归档时正是 `STEP6` |
| `STEP0`–`STEP4` / `INTENT-CARD` / `SPIKE` / `EXTRACTION` | ❌ | 尚未进入实现或尚未合流 |
| `DONE` | ❌ | 诊断措辞必须是「**在途 bundle 却自称 DONE，自相矛盾**」，**不得**断言「它已经归过档了」——在途目录里出现 `DONE` 只说明状态文件与位置不一致 |
| `ABANDONED` | ❌ **且不可 `--force`** | RUNBOOK §4 明文：放弃的 change「**写什么都不进 KB 与 spec store**」。这是硬规则，不是就绪度问题 |
| 缺失 / 占位符 / 词汇表外 / 与 `--change` 不符 | ❌ **且不可 `--force`** | 与 gate C3 同判据；结构性失败 |

---

## 四、豁免矩阵（`--force` 能与不能，r1·REQ-3 处置）

| 失败类 | 可 `--force`？ | 理由 |
|---|---|---|
| `tasks.md` 有未勾项 | ✅ | 「活儿没干完」是**程度**问题，人类可以判断某几项确实不必做 |
| ledger 有非终态行（`open` / `fixed` / 无理由 `rejected`） | ✅ | 同上；但代价是 post-archive gate C4 会 BLOCK，输出必须提前说明这一点 |
| `current-step` ∈ {`STEP0`..`STEP5`, `INTENT-CARD`, `SPIKE`, `EXTRACTION`, `DONE`} | ❌ | 状态机位置不是程度问题；强行归档一个 STEP2 的 change 没有任何合理场景 |
| `current-step: ABANDONED` | ❌ | RUNBOOK 硬规则，工具不得提供绕过 |
| flow-state 缺失 / 不可读 / 结构不安全（symlink / 非文件 / 坏祖先 / 逃逸） | ❌ | 结构性失败；连「豁免依据写在哪」都无处可查 |
| flow-state 必需键缺失 / 占位符 / 词汇表外 / `change` 不符 | ❌ | 同上；且 tier 不可知会让 R2/R3 无从判定 |
| `tasks.md` / ledger / `review/` 的结构不安全（symlink / 非文件 / 坏祖先 / 逃逸） | ❌ | 结构性失败：坏掉 ≠ 未完成（沿用 change 1 的 D-GT-7 口径） |
| 既有 preflight（delta 语法 / conflict / CAS 戳 / 预存 temp / containment） | ❌ | 不在 `--force` 的语义范围内，一字不动（AC-AP-11） |

### 4.1 人类证据的**机械语法**

`--force` 放行需要该 bundle 的 flow-state `gates:` 块里**预先存在**一条记录，同时满足：

1. 含**精确 token** `archive-preflight-waiver`（大小写不敏感；精确 token 匹配，`LS-1` 不得命中 `LS-10` 那类子串误配沿用 gate C4 的既有做法）；
2. 含被豁免的**失败类标识**：`tasks` 与/或 `ledger`（两类都豁免则两个都要出现，**一条记录可覆盖多类**）；
3. 该记录属于**同一个 bundle** 的 flow-state（与 C4 的 `waived` 证据同一形态：人类写的、机械可查的、预先存在的）。

缺任一条 → 仍然 `FAILED PREFLIGHT`，诊断说明**缺的是哪一条**。

### 4.2 放行时的输出（可断言格式）

放行时 stdout 必须含一行以 `WAIVED (--force):` 开头的记录，其后列出被豁免的失败类与依据记录的**首行文本**；
并**必须**追加一行以 `NOTE:` 开头的后果说明，点明 post-archive gate 的 C2/C4 将 BLOCK。

---

## 五、就绪度失败的判定与聚合顺序（r1·REQ-2/REQ-5 处置）

### 5.1 相对既有 preflight 的位置

就绪度插入在**既有 preflight 全部通过之后**、`--write` 的 stage 阶段**之前**；
既有 preflight（delta validation / hygiene / conflicts / CAS / 预存 temp / containment）
的判定、诊断文案与退出码**一字不动**。既有 preflight 与就绪度**同时**失败时，
输出**既有那一组**并按既有路径返回——就绪度根本不被求值（AC-AP-11 的护栏）。

### 5.2 就绪度内部的聚合

1. **先判 flow-state（R1）**。它决定 `tier`，而 `tier` 决定 R2/R3 对缺失文件的判定。
   R1 失败 → **只报 R1**，不报 R2/R3——它们此时不可知，编造结论是不诚实的。
2. R1 通过 → **R2 与 R3 一并求值，一次报全**（不是修一条撞一条）。

### 5.3 artifact × 缺陷 × tier 判定表

读取一律经 `resolve.fileReadDefect(bundleDir, p)`（既有函数，返回结构化 kind），**绝不**裸 `existsSync/readFileSync`；
`review/` 根另经 gate 既有的 `reviewDirDefect` 语义（lstat 优先，悬空 symlink 是缺陷不是缺席）。

| artifact | 缺陷 kind | trivial tier | medium / large | 可 force？ |
|---|---|---|---|---|
| flow-state | `missing` | 失败 | 失败 | ❌ |
| flow-state | 其它任何 kind（symlink / 非文件 / 坏祖先 / 逃逸 / 权限） | 失败，诊断点名 kind 与路径 | 同左 | ❌ |
| tasks.md | `missing` | **n/a**（trivial 无 STEP2，可以没有） | 失败 | ❌（缺失是结构性的，不是「没干完」） |
| tasks.md | 其它 kind | 失败，点名 kind | 失败 | ❌ |
| tasks.md | 存在且可读，有未勾项 | 失败，点名数量与首项文本 | 同左 | ✅ |
| ledger | `missing` | **n/a** | 失败 | ❌ |
| ledger | 其它 kind | 失败，点名 kind | 失败 | ❌ |
| `review/` 根 | symlink / 非目录 / 逃逸 / 悬空 | 失败，点名路径与缺陷 | 同左 | ❌ |
| ledger | 存在且可读，有非终态/非法/缺理由/缺 waiver 证据的行 | 失败，**逐行**点名 ID 与状态 | 同左 | ✅（仅「非终态」子类；非法状态与缺理由属**格式**错误，见下） |

> **ledger 内部再分两类**：`open` / `fixed` / 无 reviewer concurrence 的 `rejected` 是**进度**问题，可 force；
> 词汇表外的状态、`waived` 缺人类证据、`rejected*` 缺理由是**格式/证据**问题，**不可 force**——
> 它们是「这行写坏了」，不是「这行还没做完」。

### 5.4 读取竞态

`fileReadDefect` 与后续读取之间文件可能消失。任何读取期异常一律归入「结构性失败」类，
诊断点名路径与错误，**不可 force**，绝不抛出未结构化异常。

---

## 六、并发（r1·REQ-6 处置）

就绪度在 phase 1 读取，bundle 直到 phase 4 才移动。其间另一进程可以修改 tasks / ledger / flow-state。
本 change **不引入锁**，理由：`apriori` 的既有事务模型已明确只承诺
「失败原子性到 commit 点为止，**不承诺** crash durability」（living spec `archive-merge` 的高层 archive 需求原文），
再引入一套跨进程锁与它不匹配，且没有真实并发使用的证据。

因此：

- **前置条件（写进契约）**：从就绪度读取开始到 bundle 移动完成，**调用方须保证该 change bundle 不被并发修改**。
- B2 的充分性命题**以此为前提**（已写进其表述）。
- **可测试性**：实现必须提供一个测试 seam，使测试能在「就绪度已通过、首次写入之前」注入一次 bundle 修改，
  并断言实现**不声称**检测到它（即：这是已声明的前提条件，不是暗坑）。

---

## 七、迁移计划（r1·REQ-7 处置）

| 对象 | 处置 |
|---|---|
| `test/archive-change.test.js` 的 `twoModuleProject()` | 补齐一个**就绪的** bundle：`current-step: STEP6` 的合法 flow-state、全勾的 tasks、全终态的 ledger。32 个既有测试的**断言一字不改**，只补 fixture |
| `test/modified-integrity.test.js` 的 `archiveProj()` | 同上（其 flow-state 已存在，需改 `current-step` 并补 tasks/ledger） |
| living spec `AM-13` | **拆成两条**：`AM-13` = ready 的 dry-run 成功报告整个 change（原语义 + ready 前提）；新增一条 = unready 的 dry-run **不**报 MERGED |
| 其余 archive 测试 | 保持 MERGED / 保持既有断言——它们测的是 delta/CAS/temp/containment，与就绪度正交 |
| CHANGELOG | 声明 dry-run 语义变化与新的归档准入 |

**验收面**：迁移后 `npm test` 全绿，且**不得**通过放宽就绪度来让老测试通过（AC-AP-16）。

---

## 八、验收标准

| ID | 若 | 则 |
|---|---|---|
| AC-AP-01 | tasks.md 含至少一个 `- [ ]`，跑 `archive --change X --write` | `RESULT: FAILED PREFLIGHT — nothing written`，退出码 1；诊断点明**未勾项数**与**首项文本**；store 与 bundle 均未改动 |
| AC-AP-02 | ledger 含至少一行非终态 | 同上；**逐行**点名 ID 与状态 |
| AC-AP-03 | `current-step` 取 §三表中每一个**不允许**值（逐值验收） | 同上；`DONE` 的诊断措辞为「在途 bundle 自称 DONE」而非「已归档」 |
| AC-AP-04 | flow-state 的每一种缺陷 kind（缺失 / symlink / 非文件 / 坏祖先 / 逃逸），以及每一种非法内容（缺键 / 占位符 / 词汇表外 / `change` 不符） | 逐类失败并点名 kind 或键；**均不可 force** |
| AC-AP-05 | R1 通过、R2 与 R3 同时失败 | **一次报全两条** |
| AC-AP-06 | R1 失败 | **只报 R1**；不对 R2/R3 下任何结论 |
| AC-AP-07 | 三项全通过 | 归档照常，输出与本 change 前**逐字节一致**（就绪度通过时不新增任何输出行） |
| AC-AP-08 | 就绪度失败 + `--force`，但 gates 无合规证据（分别构造：无该记录 / 有 token 但缺失败类标识 / 记录在别的 bundle） | 仍 `FAILED PREFLIGHT`；诊断说明**缺的是哪一条** |
| AC-AP-09 | 就绪度失败 + `--force` + 合规证据（含「一条记录覆盖两类」） | 放行；stdout 含 `WAIVED (--force):` 行（列出失败类 + 依据记录首行）与 `NOTE:` 行（点明 post-archive C2/C4 将 BLOCK） |
| AC-AP-10 | §四矩阵中每一个**不可 force** 的失败类，各自叠加 `--force` 与合规证据 | 仍失败；诊断说明该类不可豁免。`ABANDONED` 单列一条 |
| AC-AP-11 | 既有 preflight 失败（delta 语法 / conflict / CAS / 预存 temp / containment），无论就绪度是否也失败 | 行为、诊断文案、退出码**与本 change 前完全一致**；就绪度不被求值 |
| AC-AP-12 | dry-run（无 `--write`）且就绪度失败 | 报告就绪度失败，**不**打印 `RESULT: MERGED (dry-run…)`，退出码 1 |
| AC-AP-13 | 单文件形式 `--store/--delta` | 完全不受影响 |
| AC-AP-14 | 已归档的存量 bundle | 不被扫描、修改或重判 |
| AC-AP-15 | 静态检查 `lib/archive-merge.js` | 不出现 `require('./gate')`；就绪度三项经由**共享模块**取得 |
| AC-AP-16 | 差分断言：同一批构造的 bundle 分别喂给共享检查器与 `gate` 的 C2/C3/C4（archived stage） | 两侧结论**逐项一致**——证明是同一份判据而非两套 |
| AC-AP-17 | **B2 的充分性命题**：任取一个未 force、就绪度通过并成功归档的 change，紧接着跑 `apriori gate --change X` | C2、C3、C4 **均不 BLOCK**。测试须覆盖 trivial（无 tasks/ledger 的 n/a 路径）与 medium/large 两种 tier |
| AC-AP-18 | 用 force 放行一个 tasks 未勾的 change 后跑 gate | C2 **BLOCK**——证明 AC-AP-17 的「未 force」限定不是空话 |
| AC-AP-19 | 用测试 seam 在就绪度通过后、首次写入前修改 bundle | 归档照常完成；实现**不声称**检测到并发修改（已声明的前提条件） |
| AC-AP-20 | 迁移后跑全量测试 | 全绿，且就绪度判据**未被放宽**（由 AC-AP-16 的差分断言守卫） |

---

## 九、明确不做 + 处置说明

### 9.1 out of scope

| # | 不做 | 理由 |
|---|---|---|
| O1 | 让 archive 自己跑测试或 verify | 重、慢，与 gate C1 职责重叠；复盘亦列为过度方案 |
| O2 | 要求「gate 曾经 PASS」作为前置 | 需要一个可信的通过记录锚点（谁写的？针对哪个 commit？），那是另一个设计问题 |
| O3 | 回溯校验存量已归档 bundle | B5 |
| O4 | 改动单文件形式 | 它不面向 change bundle |
| O5 | `--force` 自动写 flow-state | 等于工具替人类签字 |
| O6 | 改动 STEP5 退出条件本身 | 只把其中可纯文件读取的部分变成机械关卡 |
| O7 | 跨进程锁 / TOCTOU 检测 | §六：与既有事务模型不匹配，且无真实并发证据。改为**声明前置条件**并用 AC-AP-19 钉死「不声称检测」 |
| O8 | 统一 `resolve.js` 与 `archive-merge.js` 两份语义不同的 `containsReal` | §1.3 是既有事实，不是本 change 造成的。本 change 只把**共享模块需要的那一份**搬到可被无环依赖的位置并保持既有再导出 |

### 9.2 触及范围（源码）

- **新增** `lib/readiness.js`（leaf-ish：只 require `./status` 与 `./resolve`）——
  owner 为 `classifyStatus`、`gatesEntries`、`waiveEvidence`、`reviewDirDefect` 与三个检查器
  `checkTasksReady` / `checkFlowStateReady` / `checkLedgerReady`；
- `lib/gate.js`：改为从 `./readiness` 引入这些，并**继续再导出** `classifyStatus`（`truth/gate.md` 记载它是已导出符号，GT-15 的语料测试在用）；
- `lib/archive-merge.js`：phase 1 末尾调用 `./readiness`；
- `lib/resolve.js`：接收 archive-merge 那份**容忍不存在路径**的 `containsReal`（以区分名 `containsRealAllowingMissing` 落位），
  `archive-merge` 继续以原名再导出，**行为逐字节不变**——这是消环所必需的最小搬迁（§1.3）。

### 9.3 STEP0·r1 处置说明

| ID | 处置 | 说明 |
|---|---|---|
| REQ-1 | **accept** | 就绪度不再是「三条简化检查」，而是**复用 gate 的 C2 / C3 / 归档态 C4 完整判据**（B1，§1.4 列全）；充分性命题改写为**有三个限定词的真命题**（B2），并用 AC-AP-16 的差分断言 + AC-AP-17/18 钉死 |
| REQ-2 | **accept** | 新增 §5.3 的 artifact × 缺陷 kind × tier 判定表（读取一律经既有 `fileReadDefect`），§5.4 覆盖读取竞态；ledger 内部再分「进度类可 force / 格式证据类不可 force」；AC-AP-04 要求逐类验收 |
| REQ-3 | **accept** | 新增 §四豁免矩阵：`ABANDONED` / `DONE` / 结构性失败 / 非法 flow-state **一律不可 force**（`ABANDONED` 尤其——RUNBOOK 硬规则）；§4.1 给出机械语法（精确 token `archive-preflight-waiver` + 失败类标识 + 同 bundle）；§4.2 给出可断言的输出格式；并明确 `--force` 绝不触及既有 preflight |
| REQ-4 | **accept** | 允许集合收窄为 **`{STEP6}` 单值**，理由与 precedent 写进 §三；`DONE` 的诊断措辞按评审建议改为「在途 bundle 自称 DONE」 |
| REQ-5 | **accept** | §9.2 给出**确切结构**（新模块名、其依赖、owner 的符号清单、gate 的再导出义务、archive-merge 的调用点）；§5.1 给出相对既有 guards 的**精确顺序**与「同时失败时输出哪一组」；并补上 §1.3 的新实证——两份语义不同的 `containsReal`，这正是共享位必须绕开 archive-merge 的原因 |
| REQ-6 | **accept**（按「声明前置条件」一支） | §六说明为何不引锁（与既有「不承诺 crash durability」的事务模型一致，且无真实并发证据），把「无并发修改」写成**契约前置条件**并纳入 B2 的限定词；AC-AP-19 用测试 seam 钉死「实现不声称检测到并发修改」 |
| REQ-7 | **accept** | §七给出迁移计划（补 fixture 而非改断言、`AM-13` 拆两条、CHANGELOG），AC-AP-20 加一条「不得靠放宽判据让老测试通过」的反向护栏 |

---

## 十、已知后果与风险

| # | 事项 | 处置 |
|---|---|---|
| K1 | 存量项目里 tasks 未勾 / ledger 未终态的在途 change，升级后第一次归档会被拦 | **期望行为**——拦下的正是复盘里那类归档。`--force` + gates 证据是逃生口且留痕 |
| K2 | `classifyStatus` 换家会改变 `gate` 的模块内部结构 | gate 必须继续再导出该符号（GT-15 的语料测试在用），由 AC-AP-16 的差分断言与既有测试共同守卫 |
| K3 | 本 change 归档时要过自己这一关（自举） | 好事，且是 AC-AP-17 的天然演练 |
| K4 | dry-run 语义变化 | CHANGELOG 显著说明；方向是「dry-run 变诚实」 |
| K5 | 搬迁 `containsReal` 触及 `resolve.js` 与 `archive-merge.js` 的导出面 | 以区分名落位 + 原名再导出，行为不变；O8 声明不统一那两份语义 |

---

## 十一、与另外两个 change 的边界

本 change 是三连中的第 2 个。**不涉及** gate 的降级与退出码（change 1，已归档待签）、
默认 id-pattern / doctor D6 的 fix 指向 / delta 的说明性内容位置（change 3）。
**change 3 也会触及 `lib/archive-merge.js`**（delta 解析器），故必须在本 change 归档之后开始。
