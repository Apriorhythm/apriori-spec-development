# req-v1 — id-pattern-and-delta-notes：默认值该认得真实项目的 ID，delta 该给说明留个位置

> change: `id-pattern-and-delta-notes` · tier: large · track: harden
> lineage: 分支 `brownfield-round2`（自 main@235a121 切出）；产品线 v4，最终目标 main；**禁止**合并到 v1 / v3
> 证据来源：`apriori-in-practice/5.1/Apriori棕地项目使用复盘.md` §6 FP-1 / FP-2 / §8 P1-4，
> 加本仓源码实证与两处**本次实测**

---

## 一、问题（状态 A，全部可复现）

本 change 打包三件互相独立、但共同指向「**默认值与语法把合法输入判成了缺陷**」的事。

### 1.1 默认 id-pattern 认不出真实项目的 ID（复盘 FP-1）

`lib/config.js:16`：

```js
const DEFAULT_ID = '[A-Z]+-\\d+';
```

它认不出**三段式**（`AC-BIS-01`、`LIFE-DWS-01`）与**带字母后缀**（`AC-30f`）的 ID。
这类 ID 完全符合「可绑定 ID」的实质要求——唯一、稳定、可被测试名携带——只是不匹配这条正则。

**为什么后缀也认不出**：`leadId`（`lib/spec-runner.js`）在正则匹配之后还查边界——

```js
const next = text.trim()[m[0].length];
if (next !== undefined && /[A-Za-z0-9_]/.test(next)) return null;
```

所以 `AC-30f` 里即使 `AC-30` 匹配上，紧跟的 `f` 也会让它作废。

**影响链**：verify 报 GAPS → gate C1 BLOCKED → 每个 change 都要在 flow-state 里手写一段
「这是结构局限不是缺陷」的免责说明。

**本次实测（棕地样本 `/mnt/d/agent-base/t_just-projects/apriori/specs`）**：
共 **151** 个场景，按现行默认式有 **50** 个绑不上；换成 §二 提议的默认式后 **0** 个绑不上。

**为什么 4.1.0 的修复没解决它**：`gate-id-pattern` 那个 change 把 id-pattern 变成了**项目可配置**，
但**默认值一个字没动**，而配置行住在 `apriori/process-config.md`——一个 **R3 人类持有、agent 只读**的文件。
实测那个棕地项目升到 4.1 之后，`process-config.md` **仍是模板原样**（只改了 language / cas / caps），
`id-pattern` 行**从未被加过**。修复躺在二进制里，落地率为 **0**。

### 1.2 doctor D6 的修复提示指向了错误的对象

`lib/doctor.js:147`：

```js
d6Entries.push({ id: 'D6', status: 'finding',
  detail: `scenario(s) without a bindable ... ID${src}: ...`, fix: 'add leading IDs' });
```

在上面那个项目里，那 50 个 ID **完全合法**，问题在正则。
按提示做，人会去改 50 个 ID；正确动作是加一行 config（或者，本 change 之后，什么都不用做）。
**错误的 fix 提示比没有提示更贵。**

### 1.3 delta 的语法里没有「说明性内容」的位置（复盘 FP-2）

`lib/archive-merge.js` 的 delta 解析器（`parseDeltaStrict`）只认三种 h2 段
（`## ADDED|MODIFIED|REMOVED|RENAMED Requirements`）。作者写的说明被当成指令解析：

| 现象 | 位置 | 性质 |
|---|---|---|
| `## 场景 ID 逐条映射` 这类说明性小节 → `unrecognized section heading`，归档被阻断 | `:127` | **响亮**的误判——作者被迫降级标题或改写成段内附注（绕过而非表达） |
| **`### 非-Requirement 标题` 落在 requirement 块内 → 被 `blockLines.push(line)` 当作正文并入，最终写进 store** | `:166` | **静默**的错误——比响亮的那个更危险 |

第二条是我在读源码时自查发现的，复盘没提。它的形状是：

```js
:166  if (state === 'IN_REQUIREMENT') { blockLines.push(line); continue; }   // scenarios and prose are body
```

`### 说明` 不匹配 `REQ_LINE_RE`（`/^###\s+Requirement:\s+(.+?)\s*$/`），也不是 h2，
于是在 `IN_REQUIREMENT` 状态下被当成正文，**原样并进 store 的 Requirement 块**。
MODIFIED 路径上 4.1.0 的 MODIFIED INTEGRITY 报告能照出来（它逐行比对被替换的块），
**ADDED 路径上照不出来**——没有旧块可比。

### 1.4 状态 A 的其余事实（决定范围与风险）

**`DEFAULT_ID` 的全部消费者**（本次 grep 实证）：

| 消费者 | 位置 | 用途 |
|---|---|---|
| `resolveIdPattern` 的兜底 | `lib/config.js:131` | flag > config 行 > **DEFAULT_ID** |
| `check` 的 CK-04 | `lib/check.js:163` `checkScenarioIds(specText, name, idPattern = DEFAULT_ID)` | 结构一致性检查 |
| `doctor` 的 D5 探针 | `lib/doctor.js:33` `const idRe = new RegExp(DEFAULT_ID)` | TAP 解析（`truth/doctor.md` 称其 count 分类「pattern-insensitive」——**需在 STEP1 核实**） |
| `doctor` 的 D6 | 经 `resolveIdPattern`（config > 默认） | 库健康 |
| `spec-runner` 的 verify / gate C1 | 经 `resolveIdPattern` | 绑定门 |

**本仓自身的 store 对默认值变更免疫（本次实测）**：

| pattern | identified | unidentified | duplicates |
|---|---|---|---|
| 现行 `[A-Z]+-\d+` | 353 | 0 | 0 |
| 提议 `[A-Z]+(?:-[A-Z]+)*-\d+[a-z]*` | 353 | 0 | 0 |

且两者产出的 **ID 集合逐个相同**。本仓的既有测试因此不会因这条改动而变色。

**delta 语料对语法变更免疫（本次实测）**：
`apriori/changes/archive/*/specs/**/*.md` 里
——非 `### Requirement:` 的 h3 共 **0** 处；非三种法定 h2 的段共 **0** 处。
`apriori/specs/` 的 store 里非 `### Requirement:` 的 h3 也是 **0** 处。
**没有任何存量产物需要迁移。**

---

## 二、目标状态 B

### B1 — 默认 id-pattern 放宽到认得真实世界的 ID 形状

新默认值：

```
[A-Z]+(?:-[A-Z]+)*-\d+[a-z]*
```

- 是现行默认式的**严格超集**（`AC-01` 仍匹配，且匹配到的**子串完全相同**）；
- 认得三段及以上（`AC-BIS-01`、`LIFE-DWS-01`）；
- 认得字母后缀（`AC-30f`）——与 `leadId` 的边界规则相容（整个 ID 被吃掉，其后是空格）。

**不改 `leadId` 的边界规则**（见 §五 O3）。

### B2 — doctor D6 按「ID 长什么样」给不同的修复提示

D6 报 unidentified 时，必须先分辨这两类，给出**不同**的 fix：

| 情形 | fix 指向 |
|---|---|
| 场景标题**根本没有**形如 ID 的前导 token | 「给场景加上前导 ID」——现状文案，正确 |
| 场景标题**有**一个形似 ID 的前导 token，只是不匹配当前生效的 pattern | 「这些 ID 看起来是合法的，只是不匹配当前 pattern `<source>`；改 `apriori/process-config.md` 的 `id-pattern` 行」——并回显**样例 ID** |

### B3 — delta 给说明性内容一个合法位置，并堵掉静默并入

1. **一个被解析器忽略的 h2 段**：`## Notes`。它的整段内容不参与任何合并，也不产生 problem。
2. **requirement 块内的非-`Requirement` h3 变成一个 problem**（带行号），不再静默并入 store。
3. RUNBOOK 的 delta 模板给出 `## Notes` 的示例。

---

## 三、验收标准

### 默认 pattern（A 组）

| ID | 若 | 则 |
|---|---|---|
| AC-IP-01 | 一个场景标题为 `AC-BIS-01 …` / `LIFE-DWS-01 …` / `AC-30f …`，在**未配置** `id-pattern` 的项目里跑 `verify` | 三者都被识别为已绑定 ID（今日全部 unidentified） |
| AC-IP-02 | 现行默认式能识别的**任何**输入 | 新默认式识别出**逐字节相同**的 ID（严格超集，且不改变已有绑定） |
| AC-IP-03 | 本仓自身的 store，分别用新旧默认式跑 `collectScenarios` | identified / unidentified / duplicates 三个计数与 **ID 集合**全部相同 |
| AC-IP-04 | 一个标题没有任何前导 ID 的场景 | 仍为 unidentified（放宽不等于放弃） |
| AC-IP-05 | 项目**配置了** `id-pattern` 行 | 配置仍然优先，默认值不参与——`resolveIdPattern` 的优先级（flag > config > 默认）一字不变 |
| AC-IP-06 | 一个项目里同时存在 `AC-30` 与 `AC-30f` | 两者是**两个不同的 ID**，不构成重复 |
| AC-IP-07 | 放宽后新出现的重复 ID（两个此前都 unidentified、现在都识别成同一 ID 的场景） | 照常报 duplicate——这是**期望的新失败**，须在 CHANGELOG 声明 |
| AC-IP-08 | `check` 的 CK-04、`doctor` 的 D6、`verify`、`gate` C1 四个消费者 | 全部经由**同一个** `DEFAULT_ID`，无第二处硬编码 |
| AC-IP-09 | `doctor` 的 D5 探针（`lib/doctor.js:33`） | 其 TAP 计数分类的结论**不因默认值放宽而改变**（`truth/doctor.md` 声称它 pattern-insensitive——本条把该声称变成断言） |

### doctor D6 的 fix 提示（B 组）

| ID | 若 | 则 |
|---|---|---|
| AC-IP-10 | store 里有场景标题带形似 ID 的前导 token，但不匹配当前生效 pattern | D6 的 fix **指向 `process-config.md` 的 `id-pattern` 行**，detail 回显样例 ID 与当前 pattern 的来源 |
| AC-IP-11 | store 里有场景标题**完全没有**前导 ID token | D6 的 fix 仍是「加前导 ID」，文案与本 change 前一致 |
| AC-IP-12 | 两类同时存在 | 两条 fix 都出现，各自点名自己的场景，不混为一谈 |
| AC-IP-13 | D6 的其余行为（重复 ID、空库、缺目录、坏 pattern 配置） | **一字不变** |

### delta 语法（C 组）

| ID | 若 | 则 |
|---|---|---|
| AC-IP-14 | delta 含一个 `## Notes` 段 | `archive` 与 `verify --change` 正常通过；该段内容**不参与合并**、**不写进 store**、**不产生 problem** |
| AC-IP-15 | `## Notes` 段内出现 `### Requirement:` / `#### Scenario:` / `<!-- apriori-base: … -->` | 全部被忽略（Notes 段是不透明的），不产生额外的合并操作、不打乱 CAS 戳的判定 |
| AC-IP-16 | delta 含**其它**未识别的 h2（如 `## 场景 ID 逐条映射`） | 仍是带行号的 problem，文案与本 change 前一致——只有 `## Notes` 是新开的口子 |
| AC-IP-17 | requirement 块内出现非-`Requirement` 的 h3（如 `### 说明`） | **成为带行号的 problem**，该 delta 被拒绝；今天它会被静默并入 store |
| AC-IP-18 | 同上，但在 `ADDED` 段（无旧块可比） | 同样被拒绝——这正是 MODIFIED INTEGRITY 报告**照不到**的那一路 |
| AC-IP-19 | `apriori/changes/archive/**` 的全部存量 delta 语料 | 逐个仍**逐字节等价**地解析（既有语料测试不得变色；实测语料中两种构造各 0 处） |
| AC-IP-20 | 代码围栏内的 `### …` 与 `## …` | 仍然不透明，不受本 change 影响 |

### 文档（D 组）

| ID | 若 | 则 |
|---|---|---|
| AC-IP-21 | 读 `templates/process-config.md` | `id-pattern` 行的默认值列与新默认式一致 |
| AC-IP-22 | 读 `RUNBOOK.md` / `RUNBOOK_cn.md` 的 delta 相关段落 | 出现 `## Notes` 的用法说明与一个示例 |
| AC-IP-23 | 读 `docs/cli.md` / `docs/cli_cn.md` 中提及默认 id-pattern 的位置 | 与新默认式一致 |
| AC-IP-24 | 读 `CHANGELOG.md` | 显著声明**默认值变更**（可能让既有项目新出现 duplicate 报告）与 **delta 语法的两处变更** |

---

## 四、明确不做（out of scope）

| # | 不做 | 理由 |
|---|---|---|
| O1 | 改 `resolveIdPattern` 的优先级（flag > config > 默认） | 那是 `gate-id-pattern` 刚立的契约，本 change 只换兜底值 |
| O2 | 把 `id-pattern` 行写进用户的 `process-config.md` | 违反 R3；而且本 change 的**要点**正是让大多数项目**不需要**那一行 |
| O3 | 改 `leadId` 的边界规则 | 它是「ID 后面不能紧跟字母数字下划线」这条独立保证，与 pattern 宽窄正交；改它会影响每一个消费者的绑定语义 |
| O4 | 让解析器「智能判断」哪些 h2/h3 是说明、哪些是指令 | 复盘明确列为过度方案。**一个**约定好的段名，就够了 |
| O5 | 给 `## Notes` 之外再开别的忽略段 | YAGNI；需要时是另一个 change |
| O6 | 回溯修补存量 store 里被静默并入的说明性内容 | 实测为 **0** 处，无事可修 |
| O7 | change 2（`archive-preflight`）的任何内容 | 它已挂起；本 change 只碰 delta **解析器**，与它改的高层 archive 块不是同一个 Requirement |

**触及范围（源码）**：`lib/config.js`（`DEFAULT_ID` 一个常量）、`lib/doctor.js`（D6 的 fix 分支）、
`lib/archive-merge.js`（`## Notes` 忽略段 + 非-Requirement h3 的 problem）。

---

## 五、已知后果与风险

| # | 事项 | 处置 |
|---|---|---|
| K1 | **默认值变更是外部可见的行为变更**：既有项目里此前 unidentified 的场景会变成已识别；若其中两个恰好识别成同一 ID，会**新出现** duplicate 报错 | 期望行为（重复 ID 本来就是缺陷，只是此前被 unidentified 掩盖）。必须在 CHANGELOG 显著声明（AC-IP-24） |
| K2 | 此前 unidentified 的场景变成 **UNBOUND**（识别了但没有对应测试） | 同样是期望行为：从「这条我看不懂」变成「这条你没测」——后者才是真话 |
| K3 | `doctor` D5 用 `DEFAULT_ID` 做 TAP 解析（`:33`） | AC-IP-09 把「pattern-insensitive」这个 KB 声称变成断言；若实测不成立，STEP2 需重新设计 |
| K4 | `## Notes` 是新的**语法面**，一旦发布就要长期兼容 | 段名与语义在本 change 里定死；O5 声明不再开第二个 |
| K5 | 非-Requirement h3 由「静默并入」变「拒绝」是**收紧** | 实测存量语料 0 处受影响；但外部项目可能有——CHANGELOG 需声明，并给出「改成 `## Notes` 或降级为正文」的迁移建议 |
| K6 | 与挂起的 change 2 的 CAS 戳冲突 | 本 change 归档后，`archive-preflight` 的 archive-merge delta 需换戳。已记在其 flow-state |

---

## 六、与另外两个 change 的边界

本 change 是三连中的第 3 个。**不涉及** gate 的降级与退出码（change 1，已归档待签）、
archive 的就绪度准入（change 2，**已按 owner 裁定挂起**）。
本 change 触及 `lib/archive-merge.js` 的 **delta 解析器**（Requirement `the delta parser consumes its whole input`），
与 change 2 要改的高层 archive 块不是同一个 Requirement。
