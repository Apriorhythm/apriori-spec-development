# req-v2 — gate-degrades：缺一行配置不该让七项机械检查全体停摆

> change: `gate-degrades` · tier: large · track: harden
> lineage: 分支 `brownfield-round2`（自 main@235a121 切出）；产品线 v4，最终目标 main；**禁止**合并到 v1 / v3
> 证据来源：`apriori-in-practice/5.1/Apriori棕地项目使用复盘.md` §5 FN-4 / §7-1 / §8 P0-1，加本仓源码实证
> 本版处置 STEP0·r1 的 REQ-1..5（处置说明见 §八）

---

## 一、问题（状态 A，全部可复现）

### 1.1 `apriori gate` 把「C1 的前置条件」当成了「整个 gate 的前置条件」

`lib/gate.js:316`：

```js
if (!testCmd) return err(res, 'no test command: pass --test-cmd or add a test-cmd row to apriori/process-config.md');
```

这一行位于**七项检查全部之前**。后果：项目的 `apriori/process-config.md` 少一行 `test-cmd`，
则 C1..C7 **一项都不执行**，gate 退出码 2（评估不可信）。

**真实后果（棕地实测）**：`dashboard-etl-slim-pipeline` 这个 change 的**整个生命周期内 gate 运行次数 = 0**。
而该 change 的 `tasks.md` 有 45 项未勾、bundle 内 P8 一致性评审 0 份——
**C2 与 C4 恰好就是能抓住这两件事的检查，它们因为一行缺失的配置而从未启动。**

### 1.2 「只有 C1 需要测试命令」这句话在语义上成立，在**代码耦合**上不成立（r1·REQ-1 勘误）

语义上：C2（tasks）、C3（flow-state）、C4（ledger）、C5（verdict↔raw）、C6（KB 新鲜度，一次 `git log`）、
C7（CAS 戳）全是纯文件读取，都不需要跑测试。

但**代码上 C7 的输入由 C1 的执行路径生产**：

```js
// lib/gate.js:318          const b = checkBinding(cwd, opts.change, loc.stage, testCmd, ...)
// lib/gate.js:334          res.checks.push(checkCas(b.projection, loc.stage, !!opts.noCas, cwd));
```

`b.projection` 来自 `verify()`。关键事实（决定本 change 可行性）：

```
lib/spec-runner.js:512-523   projection 在此构建（modules / conflicts / unstampedMutations / notes）
lib/spec-runner.js:642       runTestCommand(opts.testCmd, cwd)   ← 测试在此才执行
```

即 **projection 的构建先于测试执行，且不依赖测试命令**——但 `spec-runner` 目前**没有导出**
projection-only 的入口，`gate` 也没有别的合法途径拿到它。

因此：若只删掉 `gate.js:316` 的提前返回，无 test 命令时要么无法安全调用 `verify()`，
要么以空 projection 调用 `checkCas()`——后者会把 `unstampedMutations` 当成空数组而**错误放行 C7**，
恰好复制出本 change 要消灭的那类 false-negative。

**结论**：本 change 的触及范围必须包含 `lib/spec-runner.js`（导出一个 projection-only 接口），
且 gate **不得**自行重建一套 projection 逻辑。

### 1.3 `apriori doctor` 在同一情形下报「健康」

`lib/doctor.js:159`：

```js
else if (!testCmd) checks.push({ id: 'D5', status: 'n/a',
  detail: 'no test command configured — pass --test-cmd or set one via apriori init --test-cmd' });
```

`n/a` 不计入 findings → 整体 `DOCTOR: HEALTHY`。
于是形成闭环：**gate 因为缺配置而死，而唯一该诊断这件事的命令说一切正常。**

### 1.4 状态 A 的其余事实（r1·REQ-4 勘误 + r1 反馈的调用点核查）

- **doctor 实际有 D1..D8**（`lib/doctor.js:206-210` 的 D8 = legacy 3.x 布局检测，living spec 的 `DR-13` 绑定它）。
  而 `apriori/truth/doctor.md` 的 Contract 段仍写「**The seven checks**」并只列 D1..D7。
  **该 Contract 段的 `source-commit: 4127653` 按 `git log <stamp>..HEAD -- lib/doctor.js` 判定为「新鲜」，
  但文本本身是陈旧的**——戳被刷新过而正文没跟上。本 change 的 STEP6 必须顺带修正它（见 AC-GD-24）。
  （这条本身是对「新鲜度检查只看 commit range、看不见内容陈旧」这一机制局限的证据，
  但**不在本 change 范围内**处理，只作观察记录。）
- **仓内没有把 gate 退出码钉死为 0/1/2 的可执行消费者**：`.github/workflows/ci.yml` 不调用 gate；
  `docs/ci*.md` 的示例显式传 test command；`scripts/golden-path.mjs` 的流程由 `init --test-cmd` 写入配置。
  受影响的是**文档**（见 §四文档侧）与 `test/doctor.test.js:168` 的 `DR-07`（当前断言缺配置 = `n/a`，实施 AC-GD-13 时必须改写）。
- `truth/gate.md` 的既有契约：`runGate` → `{ code, stage, checks:[{id,status,detail}], result, blocked, errors, change }`；
  但 `toJson()` **不含 `code` 字段**，`--json` 形状是 `{change, stage, checks, result, blocked, errors}`（r1·REQ-3 勘误）。
- `truth/gate.md` D-GT-2（active）：基础设施性失败产出带原因的 `n/a`，**绝不伪造 block**。
- `truth/gate.md` D-GT-5（active）：`--id-pattern` 按**存在性**判定，空 flag 是 flag 来源的错误，绝不回落到 config。
- `truth/doctor.md` D-DR-a（active）：坏掉的 id-pattern 配置是 **finding（退出 1）而非 UNUSABLE**。
- `truth/doctor.md` D-DR-3（active）：doctor 只诊断、指向修复者，从不自己修。

---

## 二、目标状态 B

**一句话**：机械检查的可执行范围由「配置是否齐备」决定，而不是被它**归零**；
凡是不能执行的部分，必须在输出与退出码上**说出来**，而不是伪装成通过，也不是让整体拒绝。

### B1 — gate：C1 降级为 skipped，其余六项照常执行

在「**测试命令缺席**」这一种情形下（区别于「配置坏了」，见 §三的分类表）：
- C1 状态 = `skipped`，detail 说明未执行的事实、原因与修复方式；
- C2..C7 照常执行并给出真实结论——**C7 基于真实 projection**，绝不因缺测试命令而空过；
- 整体结果不是 PASS。

**例外（B1 的边界）**：任何在检查开始**之前**就已判定「评估不可信」的情形（§三矩阵中结果为 ERROR/2 的行），
按现状整体退出，不产出逐检查结论——这与本 change 前的行为一致，B1 不覆盖它们。

### B2 — 新增一个「不完整」的结果类别与退出码

现有三值（PASS/BLOCKED/ERROR ↔ 0/1/2）无法表达「跑了，但没跑全」：
- 报 PASS/0 = **说谎**（C1 没跑过却宣布通过），正是本 change 要消灭的那类失效；
- 报 BLOCKED/1 = **伪造阻断**，违反 D-GT-2；
- 报 ERROR/2 = 回到现状，而六项检查的结论明明是可信的。

因此引入第四类：`INCOMPLETE` ↔ 退出码 **3**。

**优先级（严格全序）**：`ERROR(2) > BLOCKED(1) > INCOMPLETE(3) > PASS(0)`。
即：真有 block 时报 BLOCKED——一个已确证的阻断不因为另一项没跑成而降级。

**判定式（唯一，无歧义）**：
```
if (errors.length)                    → ERROR,      exit 2
else if (blocked > 0)                 → BLOCKED,    exit 1        // blocked = status==='blocked' 的条数
else if (any check status==='skipped')→ INCOMPLETE, exit 3
else                                  → PASS,       exit 0
```
`blocked` 字段的语义不变：**只数 `blocked`，不数 `skipped`**。

### B3 — doctor：把「未配置」的后果说出来

完全未配置测试命令时，D5 由 `n/a` 升为 `finding`，其 detail 必须点明**后果**
（`apriori gate` 的 C1 无法执行），`fix` 指向 `process-config.md` 的 `test-cmd` 行。

人类显式要求跳过（`--no-run`）时**仍是 `n/a`**——显式跳过不是缺陷。

### B4 — 有配置时零变化

配置齐备的项目，本 change 后 gate 与 doctor 的检查集合、每项 detail 文案、
`--json` 的**键集与取值**、退出码**完全不变**。

---

## 三、判定矩阵（r1·REQ-2 的处置）

### 3.1 测试命令来源的分类（穷举）

| # | 输入 | 分类 | 结果 |
|---|---|---|---|
| T1 | `--test-cmd "<非空>"` | 有效（flag） | 照常执行，与本 change 前一致 |
| T2 | `--test-cmd ""`（flag 存在、值为空） | **flag 来源错误** | ERROR / exit 2；**绝不**回落到 config、绝不降级为 skipped（与 D-GT-5 对 `--id-pattern` 的存在性判定同构） |
| T3 | `--test-cmd "   "`（仅空白） | **flag 来源错误** | 同 T2——一个只有空白的命令无法执行，静默降级会造出新的 false-negative |
| T4 | 无 flag，config 有合法 `test-cmd` 行 | 有效（config） | 照常执行，与本 change 前一致 |
| T5 | 无 flag，config 的 `test-cmd` 行**冲突**（同键不同值） | **配置错误** | ERROR / exit 2（现状不变）——「配置坏了」与「配置没有」是两件事 |
| T6 | 无 flag，config 的 `test-cmd` 行存在但值为空/仅空白 | **配置错误** | ERROR / exit 2——同样不得归入「缺席」 |
| T7 | 无 flag，无 config 文件 / 无该行 | **缺席** | C1 = `skipped`，进入 §3.2 |

### 3.2 「缺席」情形下的逐检查行为矩阵

前置说明——`runGate` 的判定顺序（本 change 只在标注处插入，其余次序不动）：

```
① --change 缺失 / 名字非法 / 解析失败            → ERROR 2
② hotfix bundle（mapping m1）                    → ERROR 2   ← 发生在测试命令解析之前，不受本 change 影响
③ flow-state 缺失 / 不可读                       → ERROR 2
④ 测试命令来源判定（§3.1）                        ← 本 change 在此改：T7 不再 ERROR，标记 c1-skipped
⑤ id-pattern 解析（flag > config > 默认）         ← 本 change 在此显式化：**无论 C1 是否跑，都要解析并校验**
⑥ 绑定阶段：有命令 → verify()；缺席 → 只建 projection
⑦ C2..C6
⑧ C7（消费 ⑥ 的 projection）
```

| # | 情形（均以 §3.1 的 T7「缺席」为前提） | id-pattern 是否解析 | 是否建 projection | 是否启动测试进程 | C1 | C7 | C2..C6 | errors | result / exit |
|---|---|---|---|---|---|---|---|---|---|
| M1 | 一切正常，C2..C7 无阻断 | 是 | 是 | **否** | `skipped` | 真实结论 | 各自真实结论 | `[]` | **INCOMPLETE / 3** |
| M2 | C2..C7 中至少一项 `blocked` | 是 | 是 | 否 | `skipped` | 真实结论 | 真实结论 | `[]` | **BLOCKED / 1** |
| M3 | id-pattern（flag 或 config）**不可编译** | 是（并失败） | 否 | 否 | — | — | — | 非空 | **ERROR / 2**（GT-24 语义保持） |
| M4 | projection 存在 merge conflict / delta 畸形 / CAS base 已偏移 | 是 | 是（失败） | 否 | — | — | — | 非空 | **ERROR / 2**（AC-GD-05；C7 绝不基于坏 projection 出结论） |
| M5 | flow-state 缺失/不可读 | — | — | 否 | — | — | — | 非空 | **ERROR / 2**（发生在 ④ 之前） |
| M6 | flow-state 可读但内容非法（C3 可判定） | 是 | 是 | 否 | `skipped` | 真实结论 | C3 = `blocked` | `[]` | **BLOCKED / 1**（同 M2） |
| M7 | 目标是 hotfix bundle | — | — | 否 | — | — | — | 非空 | **ERROR / 2**（② 早于 ④） |
| M8 | **已归档**的 change | 是 | **否**（归档态 C7 恒为 `n/a`，无需 projection） | 否 | `skipped` | `n/a` | 真实结论（C4 按归档态要求全行终态） | `[]` | 按 B2 优先级（无阻断 → INCOMPLETE / 3） |

**关于 GT-25（config 来源的 matcher 被终止 → gate ERROR）**：该场景的前提是**执行**场景匹配子进程，
而匹配只在收集场景时发生（C1 的工作）。C1 被 skip 时不收集场景，故 GT-25 的前提**不可达**，
其判定保持原样、无需修改。M3 覆盖的是**编译期**失败（进程内、廉价），与 GT-25 不是同一件事。

**为什么 C1 被 skip 时仍要解析 id-pattern（M3）**：一个不可编译的 pattern 是**坏配置**，
不是**缺配置**。容忍它会造出第二个 false-negative（"配置全坏但 gate 说 INCOMPLETE"），
且会让 GT-24 的既有断言不再普遍成立。O4 要求七项检查的判据一字不动——保持 ERROR 正是履行它。

---

## 四、验收标准（每条可表达为「若…则…」）

### gate 侧

| ID | 若 | 则 |
|---|---|---|
| AC-GD-01 | T7（测试命令缺席），对一个 in-flight change 跑 `apriori gate --change X` | C1 状态为 `skipped`，其 detail 同时含「未执行」的事实与修复指引；C2..C7 各自产出真实状态 |
| AC-GD-02 | 矩阵 M1 | `result: INCOMPLETE`，退出码 **3**；人类可读输出显式声明「未达成 PASS，因为 C1 未执行」 |
| AC-GD-03 | 矩阵 M2 | `BLOCKED`，退出码 **1**——已确证的阻断优先于不完整 |
| AC-GD-04 | 矩阵 M5 | 退出码 **2**，与本 change 前逐字节一致 |
| AC-GD-05 | 矩阵 M4 | 退出码 **2**；C7 不得基于坏 projection 给出任何结论 |
| AC-GD-06 | T7 且该 change 有**未打戳的 mutation delta** | C7 仍 `blocked` 并给出 `apriori stamp` 修复指引——证明 C7 消费的是**真实** projection |
| AC-GD-07 | T2 / T3（`--test-cmd ""` 或仅空白） | ERROR，退出码 **2**；不回落 config、不降级 skipped |
| AC-GD-08 | T5 / T6（config 冲突，或值为空/仅空白） | ERROR，退出码 **2** |
| AC-GD-09 | T1 / T4（任一有效来源） | gate 的检查集合、每项 detail 文案、`--json` 键集与取值、退出码**与本 change 前完全一致**（回归护栏） |
| AC-GD-10 | 任一情形加 `--json` | 输出是纯 JSON，键集恒为 `{change, stage, checks, result, blocked, errors}`（**不新增 `code` 字段**）；`result` 可取 `INCOMPLETE`，`checks[].status` 可取 `skipped`；进程退出码按 `PASS→0 / BLOCKED→1 / ERROR→2 / INCOMPLETE→3` 映射 |
| AC-GD-11 | 矩阵 M8（已归档 change + T7） | C1 `skipped`、C7 `n/a`、C4 按归档态要求全行终态；退出码按 B2 优先级 |
| AC-GD-12 | 矩阵 M7（hotfix bundle + T7） | 仍以 mapping m1 的拒绝退出（退出码 2 并指向 `apriori hotfix archive`） |
| AC-GD-13 | 矩阵 M3（id-pattern 不可编译 + T7） | 退出码 **2**，与本 change 前一致 |
| AC-GD-14 | T7 的任一情形 | **测试进程一次都不被 spawn**（可用 sentinel 命令——如写标记文件的脚本——断言其副作用未发生） |
| AC-GD-15 | 同一个 change，分别走「有测试命令」与「T7」两条路径 | 两次得到的 projection **等价**（modules / conflicts / unstampedMutations 逐字段相等）——证明没有第二套实现 |

### doctor 侧

| ID | 若 | 则 |
|---|---|---|
| AC-GD-16 | 项目无 `test-cmd` 配置行、未传 `--test-cmd`、未加 `--no-run` | D5 = `finding`，detail 点明「`apriori gate` 的 C1 无法执行」这一后果，`fix` 指向 process-config 的 `test-cmd` 行；整体 `FINDINGS`，退出码 1 |
| AC-GD-17 | 同上但加了 `--no-run` | D5 仍为 `n/a`（显式跳过不是缺陷） |
| AC-GD-18 | `test-cmd` 配置行冲突 | 维持现状：D5 = `finding`，其 detail 与 AC-GD-16 的「未配置」文案**可区分** |
| AC-GD-19 | id-pattern 配置不可编译 | 维持现状：D5 = `n/a`「probe skipped (invalid id-pattern config)」，优先于本 change 的新分支 |
| AC-GD-20 | 测试命令可用 | doctor 全部行为不变；**D8 原样保留**（回归护栏） |

### 文档与 KB 侧（r1·REQ-5 / REQ-4 的处置——全部改为可 grep 的断言）

| ID | 若 | 则 |
|---|---|---|
| AC-GD-21 | 读 `docs/ci.md` 与 `docs/ci_cn.md` 的 exit-code cheat table | 表中存在一行，其 `code` 列为 `3`，`gate` 列含 `INCOMPLETE` |
| AC-GD-22 | 读 `docs/cli.md` 与 `docs/cli_cn.md` 的 `apriori gate` 小节 | 其 Exit 行含 `3` 与 `INCOMPLETE` |
| AC-GD-23 | 读 `docs/troubleshooting.md` 与 `docs/troubleshooting_cn.md` 的 D5 小节 | 含「未配置 test-cmd → D5 finding」的说明，且点明 `apriori gate` 的 C1 会 `skipped`，并给出修复行 |
| AC-GD-24 | 读 `apriori/truth/doctor.md` 的 Contract 段 | 不再出现 `seven checks`；正确描述 D1..D8（含 D8 legacy 布局检测），且 `source-commit` 刷新到本 change 的实现 commit |
| AC-GD-25 | 读 `CHANGELOG.md` 的本次条目 | 含字面串 `INCOMPLETE` 与 `exit code 3`，并声明这是**退出码语义扩展**（仓外 CI 受影响） |

> AC-GD-19（原 v1 的 RUNBOOK 一致性条）已**删除**：实测 `RUNBOOK.md` 只写「aggregates … into one exit code」，
> 从不枚举 gate 的退出码取值，因此没有需要同步的断言面。留着会是一条永远无法机械判定的验收。

---

## 五、明确不做（out of scope）

| # | 不做的事 | 理由 |
|---|---|---|
| O1 | 自动探测项目的测试命令（按语言/框架内置猜测） | 脆弱且不可预测；复盘 P0-1 亦明确列为「不建议的过度方案」 |
| O2 | 让 agent 自动把 `test-cmd` 写进 `process-config.md` | 违反 R3（该文件人类持有，agent 只读） |
| O3 | 新增 `test-cmd: none` 一类的「本项目声明没有测试命令」取值 | 见 §六 K1；它是独立的一件事，需要自己的验收面 |
| O4 | 改动 C1..C7 **各自的判定逻辑** | 本 change 只改「哪些能跑」与「跑不成怎么说」，七项检查的内部判据一字不动 |
| O5 | 让 `apriori verify` 在无 test-cmd 时降级 | verify 的全部职责就是把测试绑到场景上；没有测试命令时它没有任何可降级的产出。**本 change 对 `lib/spec-runner.js` 的改动仅限于导出一个既有 projection 构建路径的入口，不改 verify 自身的任何行为** |
| O6 | 改动 hotfix bundle 的拒绝路径（mapping m1） | 该拒绝发生在测试命令解析**之前**，不受影响；保持原样 |
| O7 | 修复「新鲜度检查看不见内容陈旧」这一机制局限（由 §1.4 的 truth/doctor.md 暴露） | 本 change 只把这一份文档改对；机制本身是独立议题，需要自己的证据与设计 |

**触及范围（源码）**：`lib/gate.js`、`lib/doctor.js`、`lib/spec-runner.js`（仅导出 projection-only 入口）。

---

## 六、已知后果与风险

| # | 事项 | 处置 |
|---|---|---|
| K1 | 真正 docs-only 的项目（RUNBOOK §4 允许其以 `apriori check` 代替 `npm test`）本就没有测试命令，本 change 后其 doctor 会**长期显示一条 D5 finding** | 接受。这条 finding 陈述的是事实（该项目的 gate C1 确实不可执行），不是误报。若将来出现真实的 docs-only 使用者抱怨，走 O3 的声明式取值，作为独立 change |
| K2 | 退出码 3 是**仓外可见**的契约扩展；按 `exit != 0` 判定的 CI 会把 INCOMPLETE 当失败 | 这是**期望行为**——不完整的 gate 本就不该被当作通过。必须在 CHANGELOG 与 docs 显著说明（AC-GD-21/22/25） |
| K3 | 新增 `skipped` 进入 `--json` 的 `checks[].status` 枚举，是机器消费面的扩展 | 同 K2 一并说明；键集不变（AC-GD-10），只有取值域扩大 |
| K4 | 本 change 之后 gate 仍**不会**因为「C1 没跑」而变红（只变 INCOMPLETE），因此仍不能替代「必须配 test-cmd」这件事 | 这正是 B3（doctor 升为 finding）存在的理由：两条命令各说各的一半，合起来才完整 |
| K5 | 导出 projection-only 入口扩大了 `spec-runner` 的公共面 | 用 AC-GD-15 的等价性断言钉死「只有一套实现」；truth/spec-runner.md 的 Contract 需在 STEP6 记录该入口 |

---

## 七、与后续两个 change 的边界

本 change 是三连中的第 1 个。**不涉及**：
- `apriori archive` 的前置校验（→ change 2 `archive-preflight`）；
- 默认 id-pattern 的宽窄、doctor D6 的 fix 指向、delta 的说明性内容位置（→ change 3）。

三者按模块重叠串行执行；本 change 触及 `lib/doctor.js`，change 3 也会触及它（D6），
故 change 3 必须在本 change 归档之后开始。

---

## 八、STEP0·r1 处置说明

| ID | 处置 | 说明 |
|---|---|---|
| REQ-1 | **accept** | 新增 §1.2 完整记录 C7↔projection 的真实耦合与两处行号；触及范围加入 `lib/spec-runner.js` 并限定为「仅导出既有 projection 构建入口」（O5）；新增 AC-GD-14（测试进程不启动）与 AC-GD-15（两条路径的 projection 等价，钉死无第二套实现）；K5 记录公共面扩大的后果 |
| REQ-2 | **accept** | 新增 §三：§3.1 测试命令来源 7 分类（含空 flag / 仅空白 / config 空值三种此前未定义的边界），§3.2 八行逐检查矩阵（含 id-pattern 是否解析、是否建 projection、是否启动测试、C1/C7 状态、errors、退出码）；B2 给出唯一判定式；B1 显式声明 ERROR 类为其例外；并说明 GT-25 前提不可达、GT-24 语义保持 |
| REQ-3 | **accept**（取「不新增字段」一支） | AC-GD-10 改写为：键集恒为 `{change, stage, checks, result, blocked, errors}`，**不新增 `code`**；退出码按 result 映射。§1.4 勘误了 v1 对 `toJson()` 的错误描述，B4 的字节不变承诺因此成立 |
| REQ-4 | **accept** | §1.4 勘误状态 A：doctor 实际 D1..D8，`truth/doctor.md` 的 Contract 文本陈旧（戳新鲜但正文没跟上）；新增 AC-GD-24 要求 STEP6 修正该文档；AC-GD-20 补上「D8 原样保留」的回归护栏；机制层面的局限记入 O7 不做 |
| REQ-5 | **accept** | 文档验收面补齐 `docs/ci{,_cn}.md`、`docs/cli{,_cn}.md`、`docs/troubleshooting{,_cn}.md`；「一致」「显著」全部替换为可 grep 的断言（AC-GD-21/22/23/25）；原 AC-GD-19（RUNBOOK 一致性）经实测无断言面，**删除并记录理由** |
