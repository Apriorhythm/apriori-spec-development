# req-v1 — gate-degrades：缺一行配置不该让七项机械检查全体停摆

> change: `gate-degrades` · tier: large · track: harden
> lineage: 分支 `brownfield-round2`（自 main@235a121 切出）；产品线 v4，最终目标 main；**禁止**合并到 v1 / v3
> 证据来源：`apriori-in-practice/5.1/Apriori棕地项目使用复盘.md` §5 FN-4 / §7-1 / §8 P0-1，加本仓源码实证

---

## 一、问题（状态 A，全部可复现）

### 1.1 `apriori gate` 把「C1 的前置条件」当成了「整个 gate 的前置条件」

`lib/gate.js:316`：

```js
if (!testCmd) return err(res, 'no test command: pass --test-cmd or add a test-cmd row to apriori/process-config.md');
```

这一行位于**七项检查全部之前**。后果：项目的 `apriori/process-config.md` 少一行 `test-cmd`，
则 C1..C7 **一项都不执行**，gate 退出码 2（评估不可信）。

而七项里只有 **C1 需要跑测试**。C2（tasks 终态）、C3（flow-state 合法性）、C4（ledger 终态）、
C5（verdict↔raw 证据）、C6（KB 新鲜度）、C7（CAS 戳）**全是纯文件读取 + 一次 `git log`**。

**真实后果（棕地实测）**：`dashboard-etl-slim-pipeline` 这个 change 的**整个生命周期内 gate 运行次数 = 0**。
而该 change 的 `tasks.md` 有 45 项未勾、bundle 内 P8 一致性评审 0 份——
**C2 与 C4 恰好就是能抓住这两件事的检查，它们因为一行缺失的配置而从未启动。**
这是该复盘定级最高的 false-negative。

### 1.2 `apriori doctor` 在同一情形下报「健康」

`lib/doctor.js:159`：

```js
else if (!testCmd) checks.push({ id: 'D5', status: 'n/a',
  detail: 'no test command configured — pass --test-cmd or set one via apriori init --test-cmd' });
```

`n/a` 不计入 findings（`runDoctor` 的 `findings` = finding 状态条数）→ 整体 `DOCTOR: HEALTHY`。

于是形成一个闭环：**gate 因为缺配置而死，而唯一该诊断这件事的命令说一切正常。**
这就是 1.1 能潜伏整整一个 change 生命周期而无人察觉的机制原因——
它不是没人看 doctor，是 doctor 看了以后说没事。

### 1.3 现有契约（不得破坏的部分）

- `truth/gate.md`：`runGate` → `{ code, stage, checks:[{id,status:'pass'|'blocked'|'n/a',detail}], result:'PASS'|'BLOCKED'|'ERROR', blocked, errors, change }`；
  退出码 `0 PASS · 1 BLOCKED · 2 评估不可信`；`--json` 在**每一个**结果类别下都是纯 JSON。
- `truth/gate.md` D-GT-2（active）：基础设施性失败产出带原因的 `n/a`，**绝不伪造 block**——假阻断会训练人类忽略 gate。
- `truth/gate.md` D-GT-5（active）：`--id-pattern` 按**存在性**判定，空 flag 是 flag 来源的错误，绝不回落到 config。
- `truth/doctor.md`：`0 HEALTHY · 1 FINDINGS · 2 UNUSABLE`；D-DR-3（active）：doctor 只诊断、指向修复者，从不自己修。
- `truth/doctor.md` D-DR-a（active）：坏掉的 id-pattern 配置是 **finding（退出 1）而非 UNUSABLE**——doctor 诊断可修复的配置。

（KB 预检已完成：两份 truth 文档的 Contract 段对 `lib/gate.js` / `lib/doctor.js` 均新鲜，见 flow-state。）

---

## 二、目标状态 B

**一句话**：机械检查的可执行范围由「配置是否齐备」决定，而不是由「配置是否齐备」**归零**；
凡是不能执行的部分，必须在输出与退出码上**说出来**，而不是伪装成通过、也不是让整体拒绝。

### B1 — gate：C1 降级为 skipped，其余六项照常执行

无有效 test 命令时：
- C1 状态 = `skipped`，detail 说明「未执行」及其原因与修复方式；
- C2..C7 **照常执行并给出真实结论**；
- 整体结果不是 PASS。

### B2 — 新增一个「不完整」的结果类别与退出码

现有三值（PASS/BLOCKED/ERROR ↔ 0/1/2）无法表达「跑了，但没跑全」：
- 报 PASS/0 = **说谎**（C1 没跑过却宣布通过），正是本 change 要消灭的那类失效；
- 报 BLOCKED/1 = **伪造阻断**，违反 D-GT-2；
- 报 ERROR/2 = 回到现状（评估整体不可信），但六项检查的结论明明是可信的。

因此引入第四类：`INCOMPLETE` ↔ 退出码 **3**。

**优先级（严格全序）**：ERROR(2) > BLOCKED(1) > INCOMPLETE(3) > PASS(0)。
即：真有 block 时报 BLOCKED——一个已确证的阻断不因为另一项没跑成而降级。

### B3 — doctor：把「未配置」的后果说出来

完全未配置 test 命令时，D5 由 `n/a` 升为 `finding`，其 detail 必须点明**后果**
（`apriori gate` 的 C1 无法执行），fix 指向 `process-config.md` 的 `test-cmd` 行。

人类显式要求跳过（`--no-run`）时**仍是 `n/a`**——显式跳过不是缺陷。

### B4 — 有配置时零变化

配置齐备的项目，本 change 后 gate 与 doctor 的行为、输出、退出码**逐字节不变**。

---

## 三、明确不做（out of scope）

| # | 不做的事 | 理由 |
|---|---|---|
| O1 | 自动探测项目的测试命令（按语言/框架内置猜测） | 脆弱且不可预测；复盘 P0-1 亦明确列为「不建议的过度方案」 |
| O2 | 让 agent 自动把 `test-cmd` 写进 `process-config.md` | 违反 R3（该文件人类持有，agent 只读） |
| O3 | 新增 `test-cmd: none` 一类的「本项目声明没有测试命令」取值 | 见 §五 已知后果 K1；它是独立的一件事，需要自己的验收面 |
| O4 | 改动 C1..C7 **各自的判定逻辑** | 本 change 只改「哪些能跑」与「跑不成怎么说」，七项检查的内部判据一字不动 |
| O5 | 让 `apriori verify` 在无 test-cmd 时降级 | verify 的全部职责就是把测试绑到场景上；没有测试命令时它没有任何可降级的产出 |
| O6 | 改动 hotfix bundle 的拒绝路径（mapping m1） | 该拒绝发生在 test-cmd 解析**之前**，不受影响；保持原样 |

---

## 四、验收标准（每条可表达为「若…则…」）

### gate 侧

| ID | 若 | 则 |
|---|---|---|
| AC-GD-01 | 项目无 `test-cmd` 配置行，也未传 `--test-cmd`，对一个 in-flight change 跑 `apriori gate --change X` | C1 状态为 `skipped`，其 detail 同时含「未执行」的事实与修复指引；C2..C7 各自产出真实状态 |
| AC-GD-02 | 同上，且 C2..C7 **无一 blocked** | 整体 `result: INCOMPLETE`，退出码 **3**；人类可读输出显式声明「未达成 PASS，因为 C1 未执行」 |
| AC-GD-03 | 同上，但 C2..C7 中**至少一项 blocked** | 整体 `BLOCKED`，退出码 **1**——已确证的阻断优先于不完整 |
| AC-GD-04 | 无 test-cmd，且该 change 的 flow-state 缺失/非法到无法解析 | 仍是评估错误，退出码 **2**（ERROR 优先于一切）；与本 change 前的行为一致 |
| AC-GD-05 | 无 test-cmd，且该 change 的 delta 投影存在 merge conflict | 仍是退出码 **2**（投影不可信 → 评估不可信）；C7 不得基于坏投影给结论 |
| AC-GD-06 | 无 test-cmd，且该 change 有未打戳的 mutation delta | C7 仍 `blocked` 并给出 `apriori stamp` 修复指引——**投影的构建不依赖测试执行** |
| AC-GD-07 | 显式传入空的 `--test-cmd ""` | flag 来源的错误，退出码 **2**；**绝不**回落到 config、也绝不降级为 skipped（与 D-GT-5 对 `--id-pattern` 的存在性判定同构） |
| AC-GD-08 | `process-config.md` 的 `test-cmd` 行**冲突**（同键不同值） | 仍是退出码 **2** 的配置错误——「配置坏了」与「配置没有」是两件事，不得合流为 skipped |
| AC-GD-09 | 传了 `--test-cmd` 或配置行存在（任一有效来源） | gate 的检查集合、每项 detail 文案、`--json` 形状与退出码**与本 change 前完全一致**（回归护栏） |
| AC-GD-10 | 任一上述情形加 `--json` | 输出是纯 JSON；`result` 可取 `INCOMPLETE`，`checks[].status` 可取 `skipped`；`code` 与进程退出码一致 |
| AC-GD-11 | 对一个**已归档**的 change 在无 test-cmd 下跑 gate | 同样降级（C1 skipped、C4 仍按归档态要求全部行终态），退出码按 B2 优先级 |
| AC-GD-12 | 目标是 hotfix bundle 且无 test-cmd | 仍以 mapping m1 的拒绝退出（退出码 2 并指向 `apriori hotfix archive`）——拒绝发生在 test-cmd 解析之前 |

### doctor 侧

| ID | 若 | 则 |
|---|---|---|
| AC-GD-13 | 项目无 `test-cmd` 配置行、未传 `--test-cmd`、未加 `--no-run` | D5 = `finding`，detail 点明「`apriori gate` 的 C1 无法执行」这一后果，`fix` 指向 process-config 的 `test-cmd` 行；整体 `FINDINGS`，退出码 1 |
| AC-GD-14 | 同上但加了 `--no-run` | D5 仍为 `n/a`（显式跳过不是缺陷）；该情形下不因缺配置而产出 finding |
| AC-GD-15 | `test-cmd` 配置行冲突 | 维持现状：D5 = `finding`，detail 为配置错误（与「未配置」的文案**可区分**） |
| AC-GD-16 | id-pattern 配置不可编译 | 维持现状：D5 = `n/a`「probe skipped (invalid id-pattern config)」，优先于本 change 的新分支 |
| AC-GD-17 | test 命令可用 | doctor 全部行为不变（回归护栏） |

### 文档侧

| ID | 若 | 则 |
|---|---|---|
| AC-GD-18 | 查阅 `docs/cli.md` / `docs/cli_cn.md` 的 gate 小节 | 退出码表列出 `3 INCOMPLETE` 及其含义 |
| AC-GD-19 | 查阅 `RUNBOOK.md` / `RUNBOOK_cn.md` 中提及 gate 机械面的位置 | 与新的退出码语义一致（§1 R3 的 enforcement 段落提到 gate 聚合退出码） |
| AC-GD-20 | 查阅 `CHANGELOG.md` | 退出码语义扩展被**显著**标注（消费 gate 退出码的 CI 是仓外受影响方） |

---

## 五、已知后果与风险

| # | 事项 | 处置 |
|---|---|---|
| K1 | 真正 docs-only 的项目（RUNBOOK §4 允许其以 `apriori check` 代替 `npm test`）本就没有 test 命令，本 change 后其 doctor 会**长期显示一条 D5 finding** | 接受。这条 finding 陈述的是事实（该项目的 gate C1 确实不可执行），不是误报。若将来出现真实的 docs-only 使用者抱怨，走 O3 的声明式取值，作为独立 change |
| K2 | 退出码 3 是**仓外可见**的契约扩展；按 `exit != 0` 判定的 CI 会把 INCOMPLETE 当失败 | 这是**期望行为**——不完整的 gate 本就不该被当作通过。但必须在 CHANGELOG 显著说明（AC-GD-20），并在 docs 的退出码表列出（AC-GD-18） |
| K3 | 新增 `skipped` 状态值进入 `--json` 的 `checks[].status` 枚举，是机器消费面的扩展 | 现有消费者若做穷举匹配会遇到未知值；同 K2 一并在 CHANGELOG 说明 |
| K4 | 本 change 之后 gate 仍**不会**因为「C1 没跑」而变红（只变 INCOMPLETE），因此仍不能替代「必须配 test-cmd」这件事 | 这正是 B3（doctor 升为 finding）存在的理由：两条命令各说各的一半，合起来才完整 |

---

## 六、与后续两个 change 的边界

本 change 是三连中的第 1 个。**不涉及**：
- `apriori archive` 的前置校验（→ change 2 `archive-preflight`）；
- 默认 id-pattern 的宽窄、doctor D6 的 fix 指向、delta 的说明性内容位置（→ change 3）。

三者按模块重叠串行执行；本 change 触及 `lib/gate.js` 与 `lib/doctor.js`，
change 3 也会触及 `lib/doctor.js`（D6），故 change 3 必须在本 change 归档之后开始。
