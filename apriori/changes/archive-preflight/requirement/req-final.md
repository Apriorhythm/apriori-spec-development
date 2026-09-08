# req-final — archive-preflight：不可逆的 store 写入不该对「这个 change 真的完成了吗」一无所知

> change: `archive-preflight` · tier: large · track: harden
> lineage: 分支 `brownfield-round2`（自 main@235a121 切出）；产品线 v4，最终目标 main；**禁止**合并到 v1 / v3
> 证据来源：`apriori-in-practice/5.1/Apriori棕地项目使用复盘.md` §5 FN-1 / §8 P0-2，加本仓源码实证
> 本版处置 STEP0·r5 重开的 REQ-1 / REQ-3（处置说明见 §9.3）
>
> **⚠ STEP0 在 cap 上退出（step0-cap = 5，r5 用满）。** 按 RUNBOOK «cap hit → gate ①»；
> gate① 不在三个受保护关卡之列，已被 kickoff 的关卡合并授权覆盖（flow-state 2026-08-14T20:35），
> 故不停、并入 gate④ 一并呈报。**必须让人类看见的事实**：本版（req-final）承载 r5 的三条修复，
> 而它本身**没有再经过独立评审**。缓解：STEP2 的 P5 评审读的就是 req-final，
> 且有自己的 cap=4 循环，等于给这三条修复一次独立复核的机会。

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

### B1 — 就绪度 = gate 的 C2 + C3 + **归档态** C4 的**完整**判据，同一份代码；archive 在其上**叠加**收窄

不是「三条简化检查」，而是**复用 gate 现有的三个检查器本身**（§1.4 那三行判据一字不减）。
这是 REQ-1 的直接处置：只有判据同源，B2 的充分性命题才可能成立。

**共享的那一份 = gate 今天的行为，一字不改（r2·REQ-8 处置）。**
gate 的 C2/C4 目前用的是裸 `existsSync`；若共享模块改用 `fileReadDefect` 的安全读取，
**gate 的既有行为会随之变化**（symlink / 非文件 / 读异常的判定与诊断文本），
那是一个未声明的副作用。因此本 change 采取**组合而非替换**：

| 层 | 内容 | 谁用 |
|---|---|---|
| 基础层（共享，**行为与今日逐字节相同**） | `classifyStatus` / `gatesEntries` / `waiveEvidence` / `reviewDirDefect` / `checkTasks` / `checkFlowState` / `checkLedger` | gate 与 archive **都用** |
| archive 叠加层（**只在 archive 侧**） | ① `current-step` 收窄为 `{STEP6}`；② 三个 artifact 的结构安全读取（`fileReadDefect`，§5.3）；③ N 组解析命名空间检查（§B2） | 只有 archive |

**叠加层的确切接口与调用顺序（r3·REQ-8 处置）**：三个 wrapper——
`readArchiveFlowState(dir, name)` / `checkArchiveTasks(dir, tier)` / `checkArchiveLedger(dir, tier)`——
每个都**必须先**跑完 `resolve.fileReadDefect`（以及 flow-state 的 `reviewDirDefect` 对应物），
**确认安全之后**才调用基础层 checker，并捕获 guard 之后的读取竞态。
顺序写反（先读后守）会在 overlay 有机会阻断之前就跟随 symlink 或抛错——
这是本设计里最容易实现错的一处，故写进契约而不是留给实现者。

叠加层**只会更严**，绝不放松——这保证了 B2 的方向（archive 通过 ⇒ gate 的 C2/C3/C4 不 BLOCK）仍然成立，
同时 gate 一行行为都不变。

**C3 的具体形状（r2·REQ-5 处置）**：共享模块导出两个函数——
`checkFlowState(state, name)` 是 gate 今天的 C3，一字不改；
`checkArchiveFlowState(state, name)` = 先调用前者，再叠加 `current-step === 'STEP6'` 的限制。
gate 只用前者，archive 只用后者。

### B2 — 充分性命题（收窄后的准确表述）

> 若一次归档**未使用 `--force`**、**移动的 root 正是 gate 的规范 root** `<cwd>/apriori/changes`、
> 在 §六定义的前置区间内**没有并发修改**该解析命名空间、
> 且随后的 `gate --change <name>` **解析到的正是本次刚移动的那个 bundle**，
> 则该次 `apriori gate` 的 **C2、C3、C4 不会 BLOCK**。

**第二个限定词是 r5·REQ-1-1 的处置**：`--changes-dir` 可以指向**任意**目录，而
`apriori gate --change X` 只会经 `resolveChange(cwd, X)` 去查 `<cwd>/apriori/changes`——
gate 没有接受自定义 root 的参数。因此在自定义 root 上归档时，**N0..N3 保证不了**
「gate 解析到刚移动的 bundle」；那条路径明确**不享有** post-archive gate 保证，
输出须在该情形下打印一行提示（见 AC-AP-17h）。扩展 gate/resolver 的接口去接受自定义 root
**不在本 change 范围内**（O10）。

**第三个限定词是 r2·REQ-1 的处置，且它由实现机械保证**：`resolveChange()` 在 active bundle 移走后，
会在同名的归档目录里取**字典序最后**的时间戳目录。若已存在一个同名、且时间戳排序**在本次之后**的
归档目录（未来时间戳、或时钟回拨造成的排序反转），gate 就会去检查**另一个** bundle——
这个反例既没用 force，也没有并发修改。

因此就绪度**额外增加一组「解析命名空间」检查（r3 补全为四项）**，
统称 **N 组**，全部**不可 `--force`**（结构性事实，不是进度问题）：

| # | 检查 | 说明 |
|---|---|---|
| **N0** | **时间戳只捕获一次** | preflight 捕获**唯一**的 `archiveDate` 并据此算出 `archiveBasename`；**同一个值**必须传给 phase 4 的 `archiveChangeDir`。现状是 phase 4 自己 `new Date()`（`lib/archive-merge.js:753`），检查与实际创建的目录名之间隔着一次分钟切换或时钟回拨就会脱钩（r3·REQ-1-1） |
| **N1** | 同名归档目录的排序 | `<changes-dir>/archive/` 下同名 change 的归档目录，其目录名排序**不得 ≥** N0 算出的 `archiveBasename`；`=` 也拒绝（目的地冲突），`>` 拒绝（resolver 会选旧的） |
| **N2** | 解析结构与 resolver 对齐 | 凡是会让 `resolveChange()` 拒绝或选错的结构，同样拒绝并**采用 resolver 自己的判据**（见下方 §B2.1 的共享 predicate）。覆盖三类对象：<br>① **两个 trust root**：`<changes-dir>` 与 `<changes-dir>/archive` 的 `rootDefect`（含指向 changes 内部的 symlink、非目录、逃逸）；<br>② **待移动的 active 条目本身**（r4 补：`<changes-dir>/<name>` 可以是一个指向 changes root 内真实目录的 **symlink**——`discoverDeltas` 与 `archiveChangeDir` 的 containment 都放行它，move 会把它重命名成一个 **archived symlink**，而 `resolveChange()` 随后判定该 archived 条目为结构错误。因此必须用 resolver 的 **active-entry 判据**（lstat 优先、非 symlink、必须是目录、contained）先确认它）；<br>③ **同名归档条目**：stamp 形状合法的 symlink（无论排序早晚，resolver 都会 ERROR）、stamp 形状匹配但**日期非法**的目录（Gregorian 往返失败） |
| **N3** | 只对**会移动 bundle 的调用**求值 | 带 `--changes-dir` 的调用（含**带 `--changes-dir` 的 dry-run**，它预测同一次移动）执行 N0..N2；不带 `--changes-dir` 的调用**跳过**——它不创建归档目录，跑这组只会造出与实际写入无关的假阻断（r3·REQ-1-2） |

**并发限定的扩展（r3·REQ-1-4，r4 补全 trust roots）**：§六的稳定性前置条件从「该 bundle」扩展到
**该 change 的整个解析命名空间**——即**两个 trust root** `<changes-dir>` 与 `<changes-dir>/archive`
**本身**，加 active 条目 `<changes-dir>/<name>`，加**全部**同名归档条目 `<changes-dir>/archive/*-<name>`——
区间从 preflight 的 N 组检查开始，到紧随其后的 gate 解析为止。
（r4 指出：检查后替换或改名 archive root，仍满足 v4 的字面前置条件，却能让 move 或后续 gate 走在不同的解析结构上。）

### B2.1 共享 predicate（r4·REQ-1-3 处置——「用 resolver 自己的判据」与「resolve.js 不动」不可兼得）

`rootDefect` 在状态 A 里是 `lib/resolve.js` 的**私有**函数；`resolveChange()` 又会在 active 条目存在时**提前返回**，
借不到它去扫同名归档条目。而 v4 的 §9.2 同时写着「`lib/resolve.js` 不动」——
实现者只能自己抄一份判据（必然漂移）或违反触及范围。**两者不能同时成立**。

处置：**`lib/resolve.js` 导出一个结构化的共享 predicate**

```
archiveNamespaceDefect(changesDir, name) → null | { kind, path, detail }
```

它一次性覆盖：两个 trust root 的 `rootDefect`、active 条目的 active-entry 判据、
以及全部同名归档候选的判据（symlink / 非目录 / stamp 形状与 Gregorian 合法性 / containment）。
`resolveChange()` 与 readiness **共用它**——readiness **不得**复制 resolver 的规则。
`lib/resolve.js` 因此进入触及范围（§9.2 相应更正），其既有导出与行为不变。

**`resolveChange()` 必须保持 active-first 短路（r5·REQ-1-2 处置）**：状态 A 里
`resolveChange()` 在 active 条目合法时**立刻返回**，根本不看同名归档条目。
若新版让它在 active 快路径**之前**无条件调用综合 predicate，
「合法 active + 同名归档 symlink」这种今天能正常解析的项目就会开始报错——
那会改变 gate / status 等既有消费者的解析结果。
因此：**resolver 与综合 predicate 共享的是更小的私有 predicates**，
综合扫描只在 readiness 侧调用；`resolveChange()` 的短路语义一字不改（AC-AP-17i 守卫）。
另一进程在检查后新建一个排序更后的归档条目、或在移动后 gate 之前新建一个同名 active 目录（resolver 优先选 active），
都会推翻 B2；这已超出「不改这个 bundle」的范围，必须显式写进前置条件。

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
| ledger 有**进度类**非终态行（`open`；`fixed`；**带理由但缺 reviewer concurrence** 的 `rejected`） | ✅ | 「还没做完」是程度问题；但代价是 post-archive gate C4 会 BLOCK，输出必须提前说明 |
| ledger 有**格式/证据类**坏行（词汇表外的状态；`rejected` / `rejected-verified` / `waived` **缺理由**；`waived` 缺人类证据） | ❌ | **r2·REQ-3 勘误**：v2 的 §四把「无理由 `rejected`」列为可 force，与 §5.3 把它归为格式错误自相矛盾。以 §5.3 为准——这是「这行写坏了」，不是「这行没做完」 |
| `current-step` ∈ {`STEP0`..`STEP5`, `INTENT-CARD`, `SPIKE`, `EXTRACTION`, `DONE`} | ❌ | 状态机位置不是程度问题；强行归档一个 STEP2 的 change 没有任何合理场景 |
| `current-step: ABANDONED` | ❌ | RUNBOOK 硬规则，工具不得提供绕过 |
| flow-state 缺失 / 不可读 / 结构不安全（symlink / 非文件 / 坏祖先 / 逃逸） | ❌ | 结构性失败；连「豁免依据写在哪」都无处可查 |
| flow-state 必需键缺失 / 占位符 / 词汇表外 / `change` 不符 | ❌ | 同上；且 tier 不可知会让 R2/R3 无从判定 |
| `tasks.md` / ledger / `review/` 的结构不安全（symlink / 非文件 / 坏祖先 / 逃逸） | ❌ | 结构性失败：坏掉 ≠ 未完成（沿用 change 1 的 D-GT-7 口径） |
| 既有 preflight（delta 语法 / conflict / CAS 戳 / 预存 temp / containment） | ❌ | 不在 `--force` 的语义范围内，一字不动（AC-AP-11） |
| **单文件形式 + `--changes-dir`**（会移动正式 bundle） | ❌ | 见 §4.3——该路径同样要过就绪度 |

### 4.3 单文件形式的漏洞（r2·REQ-3 处置）

**实证**：单文件形式 `--store <f> --delta <f> --change X --write --changes-dir <dir>`
在成功后**同样会移动** `<dir>/X`（`lib/archive-merge.js:860` 的 `archiveChangeDir`）。
也就是说 v2 的 O4「单文件形式完全不受影响」+ AC-AP-13，等于给
`current-step: ABANDONED` 的正式 bundle 留了一条把 store 写掉并搬走的路——
与 RUNBOOK 的 ABANDONED 硬规则直接冲突。

**r3 勘误：「是否带 `--changes-dir`」不是充分判据。** 下面这条命令不移动任何东西，
却把一个正式 bundle 的 delta 写进了 living store：

```text
apriori archive --store apriori/specs/m/spec.md \
  --delta apriori/changes/X/specs/m/spec.md --change X --write
```

若 `X` 是 ABANDONED，它照样绕过就绪度——RUNBOOK 的硬规则再次被绕开。

**处置：归属算法（r4 更正——只按 realpath 三分是不够的）**

r4 指出：若**词法路径**落在 `<bundle>/specs/` 内，而某个 symlink 让 **realpath** 落到 bundle 之外，
「按实路径在 changes root 外 → 外科手术」与「symlink 出界 → 拒绝」会同时成立。
因此归属必须**两步走，缺一不可**：

**对每一个 delta，两种归属都要算（r5·REQ-3 更正——v5 只在「词法在内」时才算 realpath，漏了反方向）**：

1. **词法归属**：把 `--delta` 规范化（不解 symlink）后，看它是否**声称**位于
   某个 changes root（默认 `apriori/changes`，或显式 `--changes-dir`）下的 `<change>/specs/` 内；
2. **realpath 归属**：解开 symlink 后，看它**实际**落在哪个 bundle 的 `specs/` 内。

v5 漏掉的反方向是：`/tmp/delta-link.md -> <cwd>/apriori/changes/X/specs/m/spec.md`——
词法在 changes root **之外**，v5 因此把它归为「真正的外科手术输入」直接放行，
而它的 realpath 明明指向正式 bundle `X` 的 delta；`X` 若是 ABANDONED，硬禁令再次被绕过。
**这不属于 O9**：复制出来的文件确实无法归属，但一个外部 symlink 的**目标**是可以机械归属的。

| 词法归属 | realpath 归属 | 处置 |
|---|---|---|
| 不属于任何正式 bundle | 不属于任何正式 bundle | **不执行**就绪度——真正的外科手术输入，保持今日行为 |
| 属于 bundle `X` | 属于同一个 `X`，且 `X` 与 `--change` **一致** | **执行** `X` 的就绪度，**与 `--changes-dir` 在不在场无关** |
| 属于 bundle `X` | **出界**（symlink 伪装） | **拒绝** |
| **不属于**任何 bundle | 属于某个 **active** 正式 bundle `X` | **执行** `X` 的就绪度（若 `X` 与 `--change` 不一致则**拒绝**）——r5 补的反方向 |
| 属于 `X` | 属于 `Y ≠ X` | **拒绝**（身份不一致） |
| 任一侧属于某 bundle 但该 `<change>` 与 `--change` **不一致** | — | **拒绝**（身份不明的输入不得写 store） |
| 词法落在 **`<changes-dir>/archive/<stamp>-X/specs/…`**（已归档 bundle 内的 delta） | **拒绝**（r4·REQ-3-4 处置：取评审给的「最简单安全规则」。它确实是正式 bundle 的 delta，把它当外科手术输入会给 ABANDONED 再开一道口子；而支持它需要从 stamp basename 反推 change 身份并跑对应就绪度——收益不明，先拒绝。这与 B5「不回溯扫描存量归档」不冲突：B5 说的是不主动扫，这里是调用方**显式**递过来的路径） |

把 delta 复制到 bundle 之外再喂进来，机械上已无法归属——明确列为**调用方责任**（O9）。

O4 相应改写为：「单文件形式在 `--delta` **按上述算法不属于任何正式 bundle** 时不受影响」。

### 4.1 人类证据的**机械语法**

`--force` 放行需要该 bundle 的 flow-state `gates:` 块里**预先存在**一条记录，同时满足：

1. 含**精确 token** `archive-preflight-waiver`（大小写不敏感；精确 token 匹配，`LS-1` 不得命中 `LS-10` 那类子串误配沿用 gate C4 的既有做法）；
2. 含被豁免的**失败类标识**，取值恰为 `tasks` / `ledger` 二者之一或全部——
   **同样按精确 token 匹配**（前后须为非 `[A-Za-z0-9-]` 的边界或行首行尾），**大小写不敏感**；
   `tasks-later`、`myledger` 这类子串**不得**命中（r2·REQ-3 处置：v2 只写了「含有」，允许子串误配）。
   两类都豁免则两个 token 都要出现，**一条记录可覆盖多类**；
3. 该记录属于**同一个 bundle** 的 flow-state（与 C4 的 `waived` 证据同一形态：人类写的、机械可查的、预先存在的）。

缺任一条 → 仍然 `FAILED PREFLIGHT`，诊断说明**缺的是哪一条**。

### 4.2 放行时的输出（可断言格式）

放行时 stdout 必须含一行以 `WAIVED (--force):` 开头的记录，其后列出被豁免的失败类与依据记录的**首行文本**；
并**必须**追加一行以 `NOTE:` 开头的后果说明，**按实际豁免的类**精确点名：只豁免 `tasks` 则说 C2 将 BLOCK，只豁免 `ledger` 则说 C4 将 BLOCK，两类都豁免才说两者都会 BLOCK（r2·REQ-3 处置：v2 无条件写成 C2/C4 都会 BLOCK）。

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

- **前置条件（写进契约，r2·REQ-6 处置——v2 只写了「到 bundle 移动完成」，而合法路径里有三条根本不移动）**：
  从**就绪度的首次读取**开始，到**本次 archive 调用返回**为止，调用方须保证该 change bundle 不被并发修改；
  **且（r3·REQ-1-4 扩展）**：该 change 的**整个解析命名空间**——active 条目 `<changes-dir>/<name>` 与
  全部同名归档条目 `<changes-dir>/archive/*-<name>`——从 N 组检查开始到**紧随其后的 gate 解析**为止不被并发新建或改名；
  若该次调用**包含移动**，区间至少覆盖到**移动完成**。逐路径：

  | 调用形态 | 区间终点 |
  |---|---|
  | dry-run（无 `--write`） | 调用返回（不移动，无 store 写入） |
  | `--write` 但**无**显式 `--changes-dir` | 调用返回（写了 store，不移动 bundle） |
  | `--write` + `--changes-dir`，移动成功 | 移动完成 |
  | `--write` + `--changes-dir`，移动**失败** | 调用返回——bundle 永远没完成移动，区间就在返回处结束；已提交的 store 不回滚（既有 AM-15 语义） |
- B2 的充分性命题**以此为前提**（已写进其表述）。
- **可测试性**：实现必须提供一个测试 seam，使测试能在「就绪度已通过、首次写入之前」注入一次 bundle 修改，
  并断言实现**不声称**检测到它（即：这是已声明的前提条件，不是暗坑）。
  验收须**同时覆盖 move 与 no-move 两条路径**（r2·REQ-6）。

---

## 七、迁移计划（r1·REQ-7 处置）

| 对象 | 处置 |
|---|---|
| `test/archive-change.test.js` 的 `twoModuleProject()` | 补齐一个**就绪的** bundle：`current-step: STEP6` 的合法 flow-state、全勾的 tasks、全终态的 ledger。32 个既有测试的**断言一字不改**，只补 fixture |
| `test/modified-integrity.test.js` 的 `archiveProj()` | 同上（其 flow-state 已存在，需改 `current-step` 并补 tasks/ledger） |
| living spec `AM-13` | **拆成两条**：`AM-13` = ready 的 dry-run 成功报告整个 change（原语义 + ready 前提）；新增一条 = unready 的 dry-run **不**报 MERGED |
| **其余每一个会走到成功路径的 archive fixture**（r2·REQ-7 处置：v2 只点了两个 helper，不完整） | 实现前先做一次**穷举清点**：`grep -l "archive'" test/*.js` 逐文件核对每个构造 change bundle 并期望成功（exit 0 / MERGED / 成功移动）的 fixture，逐个补齐就绪 bundle。清点结果作为一条任务列进 tasks.md，**不得**以「大概就这两个」收尾 |
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
| AC-AP-13 | 单文件形式 `--store/--delta`，且 `--delta` 按 §4.3 的归属算法**不属于任何正式 bundle** | 完全不受影响（外科手术用途）。**r4 勘误**：v4 此处写「不带 `--changes-dir` 一律不受影响」，与 AC-AP-13d 直接矛盾——同一次调用会同时命中两条 |
| AC-AP-13b | 单文件形式 **带** `--changes-dir`，目标 bundle 的 `current-step: ABANDONED` | `FAILED PREFLIGHT`，退出码 1，**不可 force**；store 未写、bundle 未移 |
| AC-AP-13d | 单文件形式**不带** `--changes-dir`，但 `--delta` 指向 `apriori/changes/X/specs/…` 且 `X` 是 ABANDONED | 同样 `FAILED PREFLIGHT`——r3 找到的绕过口，`--changes-dir` 不是充分判据 |
| AC-AP-13e | 单文件形式，`--delta` 位于 bundle `Y` 内但 `--change` 传的是 `X` | **拒绝**（身份不明），退出码 2 类的用法错误 |
| AC-AP-13f | 单文件形式，`--delta` **词法上**就在任何 changes root 之外（含把 delta 复制出来的情形） | 不执行就绪度，行为与本 change 前一致 |
| AC-AP-13g | 单文件形式，`--delta` **词法**位于 `<bundle>/specs/` 内，但经 symlink 使其 **realpath 出界** | **拒绝**——两步归属算法的第三行；只按 realpath 三分会把它误判成外科手术输入（r4·REQ-3-3） |
| AC-AP-13i | 单文件形式，`--delta` 是一个**词法在 changes root 之外**的 symlink，其 realpath 指向 **active** 正式 bundle `X` 的 delta（`X` 为 ABANDONED） | **拒绝**，**不可 force**——v5 会把它当外科手术输入放行（r5·REQ-3） |
| AC-AP-13j | 同上但 `X` 与 `--change` 不一致 | **拒绝**（身份不一致） |
| AC-AP-13h | 单文件形式，`--delta` 指向**已归档** bundle `<changes-dir>/archive/<stamp>-X/specs/…`（其 flow-state 为 ABANDONED 与非 ABANDONED 各一） | **两种都拒绝**——已归档 bundle 的 delta 不作为外科手术输入（r4·REQ-3-4） |
| AC-AP-13c | 单文件形式带 `--changes-dir`，目标 bundle 就绪度的其余每一个失败类 | 与高层形式**同判定、同诊断类别** |
| AC-AP-14 | 已归档的存量 bundle | 不被扫描、修改或重判 |
| AC-AP-15 | 静态检查 `lib/archive-merge.js` | 不出现 `require('./gate')`；就绪度三项经由**共享模块**取得 |
| AC-AP-16 | 差分断言：同一批构造的 bundle 分别喂给**基础层**共享检查器与 `gate` 的 C2/C3/C4（archived stage） | 两侧结论**逐项一致**——证明基础层是同一份判据而非两套 |
| AC-AP-16b | 对**每一个** `current-step` 合法但非 `STEP6` 的取值 | `checkArchiveFlowState` **block** 而 gate 的 C3 **pass**——两者按设计不同，AC-AP-16 的「逐项一致」不适用于收窄层（r2·REQ-5） |
| AC-AP-16c | 任取一批 bundle | `checkArchiveFlowState` pass ⇒ `checkFlowState`（gate C3）pass；即叠加层**只更严不更松** |
| AC-AP-16d | gate 的 C2/C4 在**不抛错**的结构性输入下（symlink / 非文件等）的返回对象与 `detail` | **与本 change 前逐字节一致**——共享是「gate 今天的那一份」，安全读取只叠加在 archive 侧（r2·REQ-8） |
| AC-AP-16e | gate 的 C2/C4 在**会抛错**的输入下（目录冒充文件、权限错误等） | 比较**稳定面**：error 的 class / `code` / `message`（或进程的退出类别）不变；**明确排除** stack 里的文件名与行号——把函数从 `gate.js` 搬进 `readiness.js` 必然改变它们，要求「完整诊断逐字节不变」是一条不可能满足的验收（r3·REQ-8） |
| AC-AP-16f | 静态断言 | `lib/gate.js` 只调用**基础层**（不出现三个 `checkArchive*` / `readArchive*` 名字）；`lib/archive-merge.js` 只经 **wrapper** 调用（不直接调基础层的三个 checker） |
| AC-AP-17 | **B2 的充分性命题**：任取一个未 force、就绪度通过并成功归档的 change，紧接着跑 `apriori gate --change X` | C2、C3、C4 **均不 BLOCK**。测试须覆盖 trivial（无 tasks/ledger 的 n/a 路径）与 medium/large 两种 tier |
| AC-AP-17b | N1：`<changes-dir>/archive/` 下已存在同名归档目录，其名排序 **>** / **=** 本次将写入的目录名（构造未来时间戳、时钟回拨、同名撞名三种） | `FAILED PREFLIGHT`，诊断点名那个目录，**不可 force** |
| AC-AP-17c | N0：注入一次「检查之后、移动之前」的时钟前进/回拨 | 实际创建的归档目录名**等于** preflight 检查所用的那个名字——两处消费**同一个**捕获值（用测试 seam 注入时钟） |
| AC-AP-17d | N2 的**三类对象**逐情形：<br>① trust root——`<changes-dir>` 与 `<changes-dir>/archive` 各自为指向 changes 内部的 symlink / 非目录 / 逃逸；<br>② **active 条目**——`<changes-dir>/<name>` 是指向 changes root 内真实目录的 symlink、或根本不是目录；<br>③ 同名归档条目——stamp 形状合法的 symlink（排序早、晚各一）、stamp 形状匹配但日期非法（如 `2026-02-31T0000-X`）的目录 | 逐情形 `FAILED PREFLIGHT`，**不可 force**，判据与 `resolveChange()` **共用同一个** `archiveNamespaceDefect` |
| AC-AP-17f | 静态断言 | `lib/readiness.js` **不复制** resolver 的规则——不出现 `rootDefect` 的重实现、不自行拼 stamp 正则；命名空间判定全部经 `resolve.archiveNamespaceDefect` |
| AC-AP-17h | 用**自定义** `--changes-dir`（非 `<cwd>/apriori/changes`）归档 | 就绪度照常执行；但输出打印一行提示，声明该路径**不享有** post-archive gate 保证（gate 只查规范 root）；AC-AP-17 的保证**不覆盖**该情形（r5·REQ-1-1） |
| AC-AP-17i | 「合法 active 条目 + 同名归档 symlink / 非法 stamp 目录」并存 | `resolveChange()` **仍解析到 active 条目**，与本 change 前一致——综合 predicate 绝不在 active 快路径之前无条件求值（r5·REQ-1-2） |
| AC-AP-17g | 用并发 seam 在 N 组检查**之后**替换/改名 `<changes-dir>/archive` 这个 trust root | 归档照常完成；实现**不声称**检测到它——这是 §六已声明的前置条件，不是暗坑（与 AC-AP-19 同构） |
| AC-AP-17e | N3：**不带** `--changes-dir` 的 `--write` 与 dry-run | N 组**不求值**（不得因此产生假阻断）；**带** `--changes-dir` 的 dry-run **求值** |
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
| O4 | 改动单文件形式的**真外科手术用途**（`--delta` 的实路径不在任何正式 bundle 内） | 那种调用确实不面向 change bundle。**凡 `--delta` 落在某个 bundle 的 `specs/` 内的调用都在范围内**，无论是否带 `--changes-dir`（§4.3，r2→r3 两轮更正） |
| O9 | 追踪被**复制**到 bundle 之外的 delta（真副本，非 symlink） | 复制出来后机械上已无法归属到任何 change，属**调用方责任**。**注意**：外部 **symlink** 不属于本条——它的目标可以机械归属，因此在范围内（r5·REQ-3） |
| O10 | 扩展 gate / resolver 的接口去接受自定义 changes root | 那是另一件事（要动 gate 的 flag 面与 resolver 的签名）。本 change 改为**明确声明**自定义 root 不享有 post-archive gate 保证（AC-AP-17h） |
| O5 | `--force` 自动写 flow-state | 等于工具替人类签字 |
| O6 | 改动 STEP5 退出条件本身 | 只把其中可纯文件读取的部分变成机械关卡 |
| O7 | 跨进程锁 / TOCTOU 检测 | §六：与既有事务模型不匹配，且无真实并发证据。改为**声明前置条件**并用 AC-AP-19 钉死「不声称检测」 |
| O8 | 统一 `resolve.js` 与 `archive-merge.js` 两份语义不同的 `containsReal` | §1.3 是既有事实，不是本 change 造成的。**且本 change 不再需要搬迁任何一份**——§9.2 的实测表明两者在 `reviewDirDefect` 的调用形态下行为一致 |

### 9.2 触及范围（源码）

- **新增** `lib/readiness.js`（leaf-ish：只 require `./status` 与 `./resolve`）。它导出**两层**：
  - **基础层（= gate 今天的那一份，一字不改）**：`classifyStatus`、`gatesEntries`、`waiveEvidence`、
    `reviewDirDefect`、`checkTasks(dir, tier)`、`checkFlowState(state, name)`、`checkLedger(tier, stage, dir)`；
  - **archive 叠加层**：`checkArchiveFlowState(state, name)`（= 基础层 + `STEP6` 限制）、
    以及三个 artifact 的结构安全读取（经 `resolve.fileReadDefect`）与同名归档目录排序检查。
- `lib/gate.js`：改为从 `./readiness` 引入**基础层**，并**继续再导出** `classifyStatus`
  （`truth/gate.md` 记载它是已导出符号，GT-15 的语料测试在用）。gate 的行为一字不变。
- `lib/archive-merge.js`：phase 1 末尾调用 `./readiness`。**高层形式与「`--delta` 按 §4.3 归属到正式 bundle」的单文件形式共用同一入口**——与 `--changes-dir` 在不在场**无关**（r4·REQ-3-2 更正：v4 此处仍写着旧判据）。另：phase 4 的 `archiveChangeDir` 改为消费 preflight 捕获的那一个 `archiveDate`（N0）。
- **`lib/resolve.js`：进入触及范围（r4·REQ-1-3 更正——v4 写「不动」与「用 resolver 自己的判据」不可兼得）**。
  新增导出 `archiveNamespaceDefect(changesDir, name)`（§B2.1），`resolveChange()` 与 readiness 共用它；
  既有导出与行为**不变**。
- **`containsReal` 仍不搬迁（r2 后的实证更正，r3 评审已确认成立）**。
  §1.3 记录两份 `containsReal` 语义不同，v2 因此打算搬迁一份。本轮实测了两份实现在
  `reviewDirDefect` 的**实际调用形态**下的差异：
  | 情形 | archive-merge 版 | resolve 版 |
  |---|---|---|
  | 正常存在的 `review/` 目录 | true | true |
  | 更深层的 `review/` 目录 | true | true |
  | `review` 是文件 | true | true |
  | **target === root** | false | true ← **唯一分歧** |
  | 指向外部 | false | false |
  而 `reviewDirDefect` 的 target 恒为 `<dir>/review`，**永远不可能等于** root `<dir>`；
  且该函数先 `lstat` 成功、symlink 先行返回，因此调用点上两份实现**行为完全一致**。
  → `readiness` 直接从 `./resolve` 取 `containsReal` 即可，**无需搬迁任何符号**，
  O8 与 K5 随之取消。

### 9.3 STEP0·r5 处置说明（本版，STEP0 在 cap 上退出）

| ID | 处置 | 说明 |
|---|---|---|
| REQ-1（第四次 reopened） | **accept**，两点全收 | ① **自定义 `--changes-dir` 让 B2 的机械保证失效**——gate 只经 `resolveChange(cwd, X)` 查 `<cwd>/apriori/changes`，没有接受自定义 root 的参数。B2 加第二个限定词「移动的 root 正是规范 root」，自定义 root 明确**不享有**该保证并打印提示（AC-AP-17h）；扩 gate/resolver 接口列为 O10 不做。② **综合 predicate 不得破坏 resolver 的 active-first 短路**——状态 A 里 active 合法就立即返回，从不看归档条目；若在快路径前无条件综合扫描，「合法 active + 同名归档 symlink」这种今天正常的项目会开始报错。改为「resolver 与综合 predicate 共享更小的私有 predicates，综合扫描只在 readiness 侧调用」，AC-AP-17i 守卫 |
| REQ-3（第四次 reopened） | **accept** | 两步归属只在「词法在内」时才算 realpath，**漏了反方向**：一个词法在 changes root 之外、realpath 指向正式 bundle delta 的 symlink，会被 v5 当成外科手术输入放行——ABANDONED 硬禁令再次被绕过。改为**对每个 delta 两种归属都算**，并给出六行的完整处置表；新增 AC-AP-13i/13j。同时澄清 O9：真副本无法归属属调用方责任，**外部 symlink 不在此列** |

**STEP0 出口状态（必须如实呈报）**：verdict 序列 **7→6→3→2→2**（r1..r5），
**未收敛**，在 step0-cap = 5 上退出 → gate①。gate① 已被 kickoff 的关卡合并授权覆盖，
故不停、并入 gate④。**req-final 承载的这三条修复没有再经独立评审**——
这是本 change 与 change 1（STEP0 收敛于 r5，verdict 5→2→2→1→0）最大的不同，
人类在 gate④ 应据此判断是否要求补一轮。

---

### 9.4 STEP0·r4 处置说明

| ID | 处置 | 说明 |
|---|---|---|
| REQ-1（第三次 reopened） | **accept**，三点全收 | ① **待移动的 active 条目自己可以是 symlink**——`discoverDeltas` / `archiveChangeDir` 的 containment 都放行指向 changes root 内真实目录的 symlink，move 把它重命名成一个 archived symlink，随后 `resolveChange()` 判它结构错误。N2 因此从「只看既存归档条目」扩到**三类对象**（两个 trust root + active 条目 + 同名归档条目），active 条目用 resolver 的 active-entry 判据；② 前置条件补上 `<changes-dir>` 与 `<changes-dir>/archive` **两个 trust root 本身**；③ **「用 resolver 自己的判据」与「resolve.js 不动」不可兼得**——`rootDefect` 是私有的，`resolveChange()` 又在 active 存在时提前返回。改为在 `resolve.js` **导出**结构化的 `archiveNamespaceDefect(changesDir, name)`，resolver 与 readiness 共用；`lib/resolve.js` 进入触及范围，并加 AC-AP-17f 静态断言「readiness 不得复制 resolver 规则」 |
| REQ-3（第三次 reopened） | **accept**，四点全收 | ① **AC-AP-13 与 AC-AP-13d 自相矛盾**（同一次调用同时命中），AC-AP-13 改按归属算法表述；② §9.2 仍留着旧 discriminator，已改为「按归属算法进入同一入口，与 `--changes-dir` 无关」；③ **只按 realpath 三分不够**——词法在 bundle 内而 realpath 被 symlink 带出界时两条规则同时成立。改为**两步归属**（先词法声称、后 realpath 印证），新增 AC-AP-13g；④ **已归档 bundle 的显式 delta 路径**此前无分类，取评审的「最简单安全规则」——**一律拒绝**，新增 AC-AP-13h（ABANDONED 与非 ABANDONED 各一），并说明它与 B5「不回溯扫描」不冲突 |
| REQ-8 | r4 已 **verified** | 16d/16e/16f 三条可同时满足；wrapper 命名与「安全 guard 先于任何读取」的顺序铁律已入契约 |
| REQ-2 / 4 / 5 / 6 / 7 | 保持 **verified** | — |

---

### 9.5 STEP0·r3 处置说明

| ID | 处置 | 说明 |
|---|---|---|
| REQ-1（第二次 reopened） | **accept**，四点全收 | ① **N0** 时间戳只捕获一次并由 preflight 与 phase 4 共用——现状 phase 4 自己 `new Date()`（`:753`），检查与实际目录名之间隔一次分钟切换就脱钩；② **N3** N 组只对会移动的调用求值（含带 `--changes-dir` 的 dry-run），否则制造假阻断；③ **N2** 排序检查不够——`archive/` root 的 symlink、同名 symlink 条目、日期非法的 stamp 目录都会让 `resolveChange()` 拒绝或选错，判据必须与 resolver 自身对齐；④ 并发前置条件从「该 bundle」扩到**整个解析命名空间**（active 条目 + 全部同名归档条目），区间延到紧随其后的 gate 解析。AC-AP-17b..17e 逐项验收 |
| REQ-3（第二次 reopened） | **accept** | 「是否带 `--changes-dir`」**不是**充分判据：`--store … --delta apriori/changes/X/specs/m/spec.md --change X --write` 不移动任何东西，却把 ABANDONED bundle 的 delta 写进了 store。改为按 `--delta` 的**实路径**三分（bundle 外 / bundle 内且身份一致 / bundle 内但身份不符或路径不安全），新增 AC-AP-13d/13e/13f；复制到 bundle 外的输入列为调用方责任（O9） |
| REQ-8（第二次 reopened） | **accept** | ① AC-AP-16d 的「诊断逐字节一致」对**抛错**分支是**不可能满足**的——把函数从 `gate.js` 搬到 `readiness.js` 必然改变 stack 里的文件名与行号。拆成 AC-AP-16d（不抛错：比返回对象与 detail 字节）与 AC-AP-16e（抛错：比 error class/code/message，**明确排除** stack 的文件名行号）；② §B1 补上三个 wrapper 的**确切名字**（`readArchiveFlowState` / `checkArchiveTasks` / `checkArchiveLedger`）与**调用顺序铁律**——安全 guard 必须先于基础层的任何读取，否则会在 overlay 阻断之前就跟随 symlink 或抛错；③ 新增 AC-AP-16f 静态断言两侧各走各的层 |
| REQ-2 / 4 / 5 / 6 / 7 | r3 已全部 **verified**，本版未改动其对应内容 | — |
| REQ-9 | advisory batch（1 项）已 ack | — |

评审方另确认：不搬迁 `containsReal` 的结论在 `reviewDirDefect` 的可达调用路径上**成立**，
且共享模块目前没有其它需要「允许 target 不存在」语义的调用点。

---

### 9.6 STEP0·r2 处置说明

| ID | 处置 | 说明 |
|---|---|---|
| REQ-1（reopened） | **accept** | 反例成立：`resolveChange` 取同名归档目录里字典序最后的一个，若已存在排序更后的同名归档（未来时间戳 / 时钟回拨），gate 会去检查**另一个** bundle——无 force、无并发。处置取评审给的第一条建议：**就绪度增加一项**——同名归档目录的排序不得 ≥ 本次将写入的目录名，否则 FAILED PREFLIGHT 且不可 force；B2 的命题相应加上第三个限定词并由该项机械保证；新增 AC-AP-17b 覆盖两种构造 |
| REQ-3（reopened） | **accept**，三点全收 | ① **单文件形式带 `--changes-dir` 会移动正式 bundle**（`lib/archive-merge.js:860`），v2 的「完全不受影响」等于给 ABANDONED 留了后门——新增 §4.3 按「是否消费正式 bundle」二分，O4 与 AC-AP-13 改写，新增 AC-AP-13b/13c；② **v2 的豁免矩阵自相矛盾**（§四说「无理由 rejected」可 force，§5.3 说格式错误不可 force）——以 §5.3 为准，矩阵拆成「进度类可 force / 格式证据类不可 force」；③ 失败类标识 `tasks`/`ledger` 改为**精确 token** 匹配并加子串负例，`NOTE:` 行改为按实际豁免类精确点名 |
| REQ-5（reopened） | **accept** | C3 的矛盾成立：gate 接受全部词汇，archive 只接受 STEP6，一个函数满足不了两边。改为两个函数——`checkFlowState`（gate 的 C3，一字不改）与 `checkArchiveFlowState`（前者 + STEP6）；AC-AP-16 只对**基础层**要求逐项一致，另加 AC-AP-16b（合法但非 STEP6 时 archive block / gate pass）与 AC-AP-16c（叠加层只更严） |
| REQ-6（reopened） | **accept** | 前置区间的**终点**按四条合法路径分别定义（dry-run / write-without-move / move 成功 / move 失败），并要求 AC-AP-19 同时覆盖 move 与 no-move |
| REQ-7（reopened） | **accept** | 迁移清单加一条**穷举清点**任务：逐文件核对每个期望成功的 archive fixture，并明确「不得以『大概就这两个』收尾」 |
| REQ-8（新，r2） | **accept**，按「组合而非替换」 | 若共享模块改用安全读取，**gate 的 C2/C4 行为会跟着变**——那是未声明的副作用。改为**两层**：基础层就是 gate 今天的那一份（行为逐字节不变，AC-AP-16d 守卫），安全读取只叠加在 archive 侧。这样 gate 一行不变，而 archive 更严，B2 的方向仍成立 |
| REQ-2 / REQ-4 | r2 已 **verified**，本版未改动其对应内容 | — |

**本版另一处自查更正**：§9.2 原计划搬迁 `containsReal`；本轮实测两份实现只在 `target === root` 一格分歧，
而 `reviewDirDefect` 的 target 恒为 `<dir>/review`，永不等于 root——**调用形态下行为一致，不必搬迁**。
O8 相应改写，K5 取消。

---

### 9.7 STEP0·r1 处置说明

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
| K5 | ~~搬迁 `containsReal`~~ | **取消**（r2 后实证：调用形态下两份实现行为一致，不需要搬迁）。取而代之的新风险：readiness 的基础层与 archive 叠加层是两个概念，实现者可能把安全读取误加进基础层从而改变 gate——由 AC-AP-16d 守卫 |

---

## 十一、与另外两个 change 的边界

本 change 是三连中的第 2 个。**不涉及** gate 的降级与退出码（change 1，已归档待签）、
默认 id-pattern / doctor D6 的 fix 指向 / delta 的说明性内容位置（change 3）。
**change 3 也会触及 `lib/archive-merge.js`**（delta 解析器），故必须在本 change 归档之后开始。
