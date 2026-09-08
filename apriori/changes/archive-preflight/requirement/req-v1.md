# req-v1 — archive-preflight：不可逆的 store 写入不该对「这个 change 真的完成了吗」一无所知

> change: `archive-preflight` · tier: large · track: harden
> lineage: 分支 `brownfield-round2`（自 main@235a121 切出）；产品线 v4，最终目标 main；**禁止**合并到 v1 / v3
> 证据来源：`apriori-in-practice/5.1/Apriori棕地项目使用复盘.md` §5 FN-1 / §8 P0-2，加本仓源码实证

---

## 一、问题（状态 A，全部可复现）

### 1.1 `apriori archive --write` 不看 change 是否真的完成

`lib/archive-merge.js:661-691` 的 phase 1「preflight」只校验**三类与 delta 有关**的东西：

| 现有 preflight 项 | 位置 | 检的是 |
|---|---|---|
| `discoverDeltas` 的 validation | `:662` | delta 文件是否存在、路径是否逃逸 |
| `buildProjection` 的 validation / hygiene / conflicts | `:664, :688` | delta 语法、同名冲突、合并可行性 |
| CAS 戳（`unstampedMutations` + waiver） | `:672-687` | mutation delta 是否打了基线戳 |

**全文 grep `flow-state` / `tasks` / `issues.md` / `current-step` → 0 命中。**
也就是说：`tasks.md` 45 项未勾、bundle 内 P8 一致性评审 0 份、ledger 满是 `open` 行——
`archive --write` 一概不看，照样重写 store 并把 bundle 移进 `archive/`。

**真实后果（棕地实测）**：`dashboard-etl-slim-pipeline` 的 `tasks.md` **6 项 `[x]` / 45 项 `[ ]`**，
bundle 内一致性评审 **0 份**，`apriori archive --write` **成功执行并重写了 store**。
RUNBOOK STEP5 的退出条件（tests green + verify GREEN + tasks 全 `[x]` + 一致性 verdict，**ALL of**）
**一条也没被机械校验过**。

### 1.2 这个缺口为什么特别贵

- **归档是不可逆的**：store 被重写、bundle 被移走（`:753` 的 `archiveChangeDir`）。
  其它检查失败最多是「白跑一趟」，这一条失败是「错误状态被固化进 living spec」。
- **能抓住它的检查存在，只是没人要求它先跑**：`apriori gate` 的 C2（tasks 全勾）、
  C3（flow-state 合法）、C4（ledger 终态）恰好就是这三件事——
  但 `archive` **不要求 gate 通过**，两条命令互不知情。
- 复盘里这两个缺口是**叠加**的：gate 因为缺一行 `test-cmd` 而从未运行（change 1 已修），
  archive 又不自查——于是**没有任何一道机械关卡拦过这次归档**。

### 1.3 状态 A 的其余事实（决定可行性与边界）

- **`archive-merge` 目前不依赖 `status` 也不依赖 `gate`**；而 **`gate` 依赖 `archive-merge`**
  （`lib/gate.js:12` 取 `CHANGE_NAME_RE` / `containsReal`）。
  因此「让 archive 复用 gate 的 C2/C3/C4」会形成**循环依赖**——这是本 change 的头号结构约束。
  `lib/status.js` 已导出 `parseFlowState` / `parseLedger`，且 `status` **不**依赖 `archive-merge`，
  是可用的共享位；但**终态词汇的分类器 `classifyStatus` 目前住在 `lib/gate.js`**（已导出）。
- **归档态的 ledger 规则比在途更严**：`truth/gate.md` 记载，C4 在 ARCHIVED 阶段要求**每一行都是终态**
  （`verified` / `rejected-verified` / `waived` / `advisory-acked`），而在途允许 `fixed` 与带理由的 `rejected`。
  也就是说：**带着 `fixed` 行归档，等于归档成一个 post-archive gate 立刻会 BLOCK 的状态**。
- `truth/gate.md` C4 的 `waived` 行要求**同条 flow-state `gates:` 里预先存在人类证据**
  （含该行 ID 与 `waiv`）——生产方自写的一行永远不算数。这是本仓既有的「人类豁免」形态，
  本 change 的 `--force` 应当**同构**，而不是另发明一种。
- `archiveChange(o)` 是纯返回函数（`{code, out, err}`），`cli()` 负责打印；`ops` 是既有的故障注入 seam。
- `--write` 之前的 dry-run **已经会打印完整报告**（`:718` 的 `RESULT: MERGED (dry-run; …)`）。

---

## 二、目标状态 B

**一句话**：不可逆的 store 写入之前，先用**纯文件读取**问三个问题——
这个 change 的状态机走到该走的位置了吗？活儿干完了吗？账平了吗？
任何一个答不上来，就**什么都不写**。

### B1 — 新增「就绪度 preflight」，三条纯文件读取

在现有 preflight（delta / CAS）**之后**、任何写入**之前**，追加三项：

| # | 检查 | 判据 |
|---|---|---|
| R1 | flow-state 的 `current-step` 处于允许归档的位置 | 见 §三 的允许集合 |
| R2 | `tasks.md` 无未勾项 | 零个 `- [ ]`（`[x]`/`[X]` 算已勾）——与 gate C2 同判据 |
| R3 | ledger 每一行都是**归档态终态** | `verified` / `rejected-verified` / `waived` / `advisory-acked`——与 gate C4 的 ARCHIVED 判据同源 |

**R3 用归档态判据而非在途判据**，理由是时序：archive 一旦成功，这个 bundle 立刻**就是**归档态，
post-archive gate 会按归档态要求它。带着 `fixed` 行归档 = 归档成一个立刻会 BLOCK 的状态。

### B2 — 失败即「什么都不写」，且诊断要能直接照着修

就绪度失败走**现有的** preflight 失败路径：`RESULT: FAILED PREFLIGHT — nothing written`，退出码 **1**。
每条失败必须**点名具体对象**（哪个 key / 未勾几项、首项文本 / 哪几行 ID 是什么状态），
而不是「change not ready」这类无从下手的话。

### B3 — `--force` 是**可见**的豁免，且需要预先存在的人类证据

`--force` 单独不足以放行。它要求该 change 的 flow-state `gates:` 块里**预先存在**一条人类豁免记录
（与 `truth/gate.md` 里 `waived` ledger 行的既有形态同构：人类写的、机械可查的）。
放行时输出**必须显著声明**豁免了哪几项、依据是哪条 gates 记录。

**不做**「`--force` 自动往 flow-state 里追加一条豁免」——那等于让工具替人类签字。

### B4 — 只对**新**归档生效，不回溯

存量已归档 bundle 不受影响；本 change 不扫描、不修改、不重判 `apriori/changes/archive/` 下的任何东西。

### B5 — dry-run 也要说实话

dry-run（无 `--write`）**同样执行**就绪度检查并报告结果。
理由：dry-run 的用途是「告诉我 `--write` 会发生什么」——
一个会被就绪度拦下的 change，dry-run 却打印 `RESULT: MERGED (dry-run)`，那是在说谎。

---

## 三、`current-step` 的允许集合（R1 的判据）

| current-step | 允许归档？ | 理由 |
|---|---|---|
| `STEP6` | ✅ | 归档就是 STEP6 的动作，这是正规位置 |
| `STEP5` | ✅ | STEP5 的出口条件满足后直接归档是常见且合法的流程；R2/R3 会独立把关「活儿是否真干完」 |
| `STEP0`–`STEP4` | ❌ | 实现还没做完就写 store |
| `INTENT-CARD` / `SPIKE` / `EXTRACTION` | ❌ | explore track 尚未合流进 STEP2 |
| `DONE` | ❌ | 已经归过档了；再归一次是重复操作，应报错而非静默重写 |
| `ABANDONED` | ❌ | 放弃的 change **按 RUNBOOK §4 明文「写什么都不进 KB 与 spec store」**——它的归档走的是移目录，不是 `apriori archive` |
| 缺失 / 含 `<占位符>` / 不在词汇表内 | ❌ | 与 gate C3 同判据 |

---

## 四、验收标准（每条可表达为「若…则…」）

| ID | 若 | 则 |
|---|---|---|
| AC-AP-01 | change 的 `tasks.md` 含至少一个 `- [ ]`，跑 `archive --change X --write` | `RESULT: FAILED PREFLIGHT — nothing written`，退出码 1；诊断点明**未勾项数**与**首项文本**；store 与 bundle 均未被改动 |
| AC-AP-02 | ledger 含至少一行非终态（`open` / `fixed` / 无理由 `rejected`） | 同上；诊断**逐行点名** ID 与其当前状态 |
| AC-AP-03 | `current-step` 不在 §三 的允许集合内（逐值验收，含 `DONE` 与 `ABANDONED`） | 同上；诊断点名当前值与允许集合 |
| AC-AP-04 | flow-state 缺失 / 不可读 / `current-step` 为占位符 | 同上；与 gate C3 的判据一致 |
| AC-AP-05 | 三项**同时**失败 | **一次报全三条**，不是修一条再撞下一条（与既有 preflight「每个诊断都留在同一份报告里」的写法一致） |
| AC-AP-06 | 三项全通过 | 归档照常进行，输出与本 change 前**在字面上一致**——就绪度通过时不新增任何输出行 |
| AC-AP-07 | 就绪度失败但传了 `--force`，且 flow-state `gates:` **没有**对应的人类豁免记录 | 仍然 `FAILED PREFLIGHT`，退出码 1；诊断说明 `--force` 需要预先存在的 gates 证据 |
| AC-AP-08 | 就绪度失败、传了 `--force`、且 flow-state `gates:` 存在人类豁免记录 | 放行；输出**显著声明**豁免了哪几项、依据哪条 gates 记录 |
| AC-AP-09 | 既有 preflight（delta 语法 / 冲突 / CAS 戳）失败 | 行为**完全不变**——就绪度检查不得改变它们的判定、诊断文案或退出码 |
| AC-AP-10 | dry-run（无 `--write`）且就绪度失败 | 报告就绪度失败，**不**打印 `RESULT: MERGED (dry-run…)` |
| AC-AP-11 | 单文件形式 `archive --store <f> --delta <f> --change <name>` | **不受影响**——该形式不面向一个 change bundle，没有 flow-state/tasks/ledger 可读（见 §五 O4） |
| AC-AP-12 | 已归档的存量 bundle | 不被扫描、不被修改、不被重判（B4） |
| AC-AP-13 | 检查 `lib/archive-merge.js` 的依赖 | **不**出现 `require('./gate')`——循环依赖（gate → archive-merge 已存在）不得成立 |
| AC-AP-14 | ledger 的终态判据 | 与 gate C4 归档态**共用同一个分类器**（同一份代码），而非各写一套；用差分断言钉死：同一批状态字符串两边判定一致 |
| AC-AP-15 | 一个刚被本工具归档的 change，紧接着跑 `apriori gate --change X` | C2/C3/C4 **不可能** BLOCK——archive 的就绪度是 post-archive gate 的**充分前置**（这是本 change 的价值命题，须机械验证） |

---

## 五、明确不做（out of scope）

| # | 不做的事 | 理由 |
|---|---|---|
| O1 | 让 archive 自己跑测试或跑 verify | 重、慢，且与 gate C1 职责重叠；复盘亦明确列为「不建议的过度方案」 |
| O2 | 要求「gate 曾经 PASS」作为归档前置 | 需要一个可信的「gate 通过记录」锚点（谁写的？何时？针对哪个 commit？），那是另一个设计问题；三条纯文件读取不需要任何锚点 |
| O3 | 回溯校验或修补存量已归档 bundle | B4 |
| O4 | 改动单文件形式 `--store/--delta` | 它不面向 change bundle；给它硬塞 flow-state 要求会破坏其「一个模块的外科手术」用途 |
| O5 | `--force` 自动往 flow-state 写豁免 | 等于工具替人类签字；本仓既有的人类豁免形态（C4 的 `waived`）都要求**预先存在**的人类证据 |
| O6 | 改动 STEP5 退出条件本身 | 本 change 只是把其中**可纯文件读取的三条**变成机械关卡 |

**触及范围（源码）**：`lib/archive-merge.js`；以及为消除 §1.3 循环依赖所需的**终态分类器归位**
（`classifyStatus` 现居 `lib/gate.js`，需移到一个 archive-merge 与 gate 都能依赖、且不构成环的位置）。

---

## 六、已知后果与风险

| # | 事项 | 处置 |
|---|---|---|
| K1 | 存量项目里可能有大量「tasks 未勾 / ledger 未终态」的在途 change，升级后第一次归档会被拦 | 这是**期望行为**——拦下的正是复盘里那类归档。`--force` + gates 证据是逃生口，且逃生留痕 |
| K2 | `classifyStatus` 从 `gate.js` 搬家会改变 `gate` 的导出面 | `truth/gate.md` 记载它是**已导出**符号（GT-15 的语料测试在用）。搬家须保持 gate 的再导出，避免破坏既有消费者 |
| K3 | 本 change 的**自举**：它自己归档时也要过自己这一关 | 这是好事，且是 AC-AP-15 的天然演练 |
| K4 | dry-run 语义变化（B5）：以前恒打印 MERGED，现在可能打印 FAILED PREFLIGHT | 属**行为变更**，须在 CHANGELOG 说明；但方向是「dry-run 变得诚实」 |

---

## 七、与另外两个 change 的边界

本 change 是三连中的第 2 个。**不涉及**：gate 的降级与退出码（change 1，已归档待签）；
默认 id-pattern、doctor D6 的 fix 指向、delta 的说明性内容位置（change 3）。
**change 3 也会触及 `lib/archive-merge.js`**（delta 解析器），故必须在本 change 归档之后开始。
