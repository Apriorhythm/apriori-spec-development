# req-v5 — gate-degrades：缺一行配置不该让七项机械检查全体停摆

> change: `gate-degrades` · tier: large · track: harden
> lineage: 分支 `brownfield-round2`（自 main@235a121 切出）；产品线 v4，最终目标 main；**禁止**合并到 v1 / v3
> 证据来源：`apriori-in-practice/5.1/Apriori棕地项目使用复盘.md` §5 FN-4 / §7-1 / §8 P0-1，加本仓源码实证
> 本版处置 STEP0·r4 唯一剩余的 REQ-1（处置说明见 §八·4；REQ-2/3/4/5 已全部 verified）

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
- **共享 config 解析器把「空值行」等同于「无该行」**（`lib/config.js:67`，单元格已 `trim()`）——
  对所有 key 一视同仁。这决定了 §3.1 的 T7 必须吞掉「`test-cmd` 行存在但值为空」这一情形（r2·REQ-2 勘误）。
- **`buildChangeProjection(change, cwd)`（`lib/spec-runner.js:509`）不接受测试命令参数**——
  这是「projection 的构建与测试执行无关」这一说法的直接证据；它目前**未被导出**（`lib/spec-runner.js:810-812`）。
- **既有 seam 只有一个，且不是本 change 需要的那个（r3 勘误）**：`_setChildRunner`
  （`lib/spec-runner.js:44`）只替换 **config 来源 id-pattern 的匹配子进程** runner
  （`makeIdMatcher` 的 `childRunnerOverride || defaultChildRunner`），**不拦截**
  `runTestCommand()`——后者在 `lib/spec-runner.js` 内用 `spawnSync(cmd, {shell:true})` 直接起进程，
  **没有任何注入点**。v3 曾用它来断言「测试进程零次 spawn」，那只能证明「ID matcher 子进程零次」。
- **CommonJS 的词法作用域事实（r3 勘误）**：`verify()` 直接调用同文件内的 `buildChangeProjection`；
  仅仅把它加进 `module.exports` **不会**让外部替换 `module.exports.buildChangeProjection` 生效——
  被替换的是导出对象的属性，不是 `verify()` 里的那个词法绑定。
  所以「两条路径经过同一个被包裹函数」必须靠**显式的可替换引用**（注入 seam），不能靠导出。

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

## 三、判定矩阵（r1·REQ-2 的处置，r2 收窄）

### 3.1 测试命令来源的分类（互斥且穷举）

判定按 T1→T7 顺序，**首个匹配者胜**。

| # | 输入 | 分类 | 结果 |
|---|---|---|---|
| T1 | `--test-cmd` **存在**，且值含**至少一个非空白字符** | 有效（flag） | 照常执行，与本 change 前一致 |
| T2 | `--test-cmd` **存在**，值为空字符串 `""` | **flag 来源错误** | ERROR / exit 2；**绝不**回落到 config、绝不降级为 skipped（与 D-GT-5 对 `--id-pattern` 的存在性判定同构） |
| T3 | `--test-cmd` **存在**，值仅由空白字符组成 | **flag 来源错误** | 同 T2——一个只有空白的命令无法执行；若静默降级为「缺席」，一个手滑的引号就会把 ERROR 变成 INCOMPLETE |
| T4 | 无 flag，`process-config.md` **存在但不可读**（目录、权限、不可达祖先——非 ENOENT 的任何失败） | **配置错误** | ERROR / exit 2（现状不变，由 `readConfig` 的既有分类产生） |
| T5 | 无 flag，config 的 `test-cmd` 行**冲突**（同键不同值） | **配置错误** | ERROR / exit 2（现状不变）——「配置坏了」与「配置没有」是两件事 |
| T6 | 无 flag，config 有合法 `test-cmd` 行（值含至少一个非空白字符） | 有效（config） | 照常执行，与本 change 前一致 |
| T7 | 其余一切：无 config 文件、无该行、**或该行的值为空/仅空白** | **缺席** | C1 = `skipped`，进入 §3.2 |

> **T7 为何吞掉「值为空/仅空白的 config 行」（r2 勘误）**：`lib/config.js:67` 是
> `if (!key || value === undefined || value === '') continue;`，且单元格在此之前已 `trim()`。
> 也就是说**共享 config 解析器按契约把空值/纯空白值等同于「该行不存在」**，对所有 key 一视同仁。
> v2 曾要求把它判为 ERROR——那需要改 `lib/config.js` 及其全局契约（影响每一个 key），
> 既超出本 change 声明的触及范围，也会把一个 gate 的局部问题变成全仓配置语义变更。
> 因此按状态 A 归入 T7。
>
> **flag 层严、config 层宽的不对称是刻意的**：flag 是操作者在**本次调用**中的显式动作，
> 其「存在性」可观察，写错了必须立刻报错；config 行的空值则被一个管辖全部 key 的共享解析器
> 提前归一化掉了，gate 在消费点已经看不见它。承认这个不对称，好过假装能区分。

### 3.1b `runGate()` 层面的契约（r2·REQ-2 新增）

flag 的**存在性**只有 CLI 层知道，因此 `runGate` 的 `testCmd` 取值域必须显式定义：

| `opts.testCmd` | 含义 | 归入 |
|---|---|---|
| 字段缺席 / `undefined` / `null` | flag 未出现 | 走 T4..T7 的 config 解析 |
| `''` 或仅空白字符串 | flag 出现但值非法 | T2 / T3 → ERROR / exit 2 |
| 含非空白字符的字符串 | flag 有效 | T1 |

| 任何其它类型（数字 / 数组 / 对象 / 布尔） | 契约外输入 | **ERROR / exit 2**，消息点明类型；绝不交给 `spawnSync` 去抛类型错误 |

CLI 层据此改为**存在性**传递：`testCmd: ('--test-cmd' in f) ? f['--test-cmd'] : null`
（现状是 `f['--test-cmd'] || null`，它把 `''` 塌缩成 `null`，正是 T2 无法被区分的原因）。
这与 `--id-pattern` 既有的存在性写法（`lib/spec-runner.js:786`，SR-52 / D-GT-5）完全同构。
最后一行（非字符串）是 r3 补上的：`runGate` 是导出的公共函数，JS 里这些取值可达，
留白等于把类型错误推迟到 `spawnSync` 抛异常——那是一个**没有 detail 的** exit 2。

### 3.1c 本 change 需要的两个测试注入 seam（r3·REQ-1 新增）

AC-GD-14 / 15b 的可机械断言性依赖两个**互不相同**的 seam，二者都必须是
`verify()` 与 gate 的 T7 路径**共用的同一个可替换引用**：

| seam | 包裹对象 | 用途 |
|---|---|---|
| `_setProjectionBuilder(fn)` | `buildChangeProjection` 的调用点 | 证明两条路径经过**同一个** builder（身份 + 次数），并让测试捕获 T7 路径内部拿到的完整 projection 对象——`runGate()` 本身不返回它 |
| `_setTestRunner(fn)` | `runTestCommand` 的调用点 | 断言 T7 路径下测试进程被起 **0** 次（现状无任何注入点，`spawnSync` 直接起进程） |

命名与既有 `_setChildRunner` 同族；默认值分别是现有的 `buildChangeProjection` / `runTestCommand`，
**配置齐备路径上的行为一字不变**（B4）。

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

**行判定顺序（r2 新增，r3 更正）**：矩阵按 **M7→M5→M3→M4→M8→M6→M2→M1** 的**因果先后**
判定，**首个匹配者胜**；下表的「情形」列因此都应读作「在此前各行都不匹配的前提下」。

> **M7 必须先于 M5（r3 勘误）**：`lib/gate.js:301` 的 hotfix 识别在 `lib/gate.js:306` 的
> flow-state 存在性检查**之前**。而一个正常的 hotfix bundle **本来就没有** `flow-state.md`，
> 因此它同时满足 M7 与 M5；v3 写成 M5→M7 会让它落进「flow-state 缺失」的错误文案，
> 违反 AC-GD-12 要求的 mapping m1 指引。

| # | 情形（均以 §3.1 的 T7「缺席」为前提） | id-pattern 是否解析 | 是否建 projection | 是否启动测试进程 | C1 | C7 | C2..C6 | errors | result / exit |
|---|---|---|---|---|---|---|---|---|---|
| M7 | 目标是 hotfix bundle | — | — | 否 | — | — | — | 非空 | **ERROR / 2**（② 早于 ④，且早于 ③） |
| M5 | flow-state 缺失/不可读 | — | — | 否 | — | — | — | 非空 | **ERROR / 2**（发生在 ④ 之前） |
| M3 | **id-pattern 解析期的任何问题**：空 flag / 不可编译的 flag / 不可编译的 config 值 / config 的 `id-pattern` 行冲突 | 是（并失败） | 否 | 否 | — | — | — | 非空 | **ERROR / 2**（GT-24 语义保持；对已归档 change 同样优先于 M8） |
| M4 | **projection-only builder 返回任何非空 errors，或未产出可信 texts** | 是（成功） | 是（失败） | 否 | — | — | — | 非空 | **ERROR / 2**（AC-GD-05；C7 绝不基于坏 projection 出结论） |
| M8 | **已归档**的 change（且 id-pattern 解析成功） | 是（成功） | **否**（归档态 C7 恒为 `n/a`，无需 projection） | 否 | `skipped` | `n/a` | 真实结论（C4 按归档态要求全行终态） | `[]` | 按 B2 优先级（无阻断 → INCOMPLETE / 3；有阻断 → BLOCKED / 1） |
| M6 | flow-state 可读但内容非法（C3 可判定） | 是（成功） | 是（成功） | 否 | `skipped` | 真实结论 | C3 = `blocked` | `[]` | **BLOCKED / 1**（M2 的一个实例） |
| M2 | C2..C7 中至少一项 `blocked` | 是（成功） | 是（成功） | 否 | `skipped` | 真实结论 | 真实结论 | `[]` | **BLOCKED / 1** |
| M1 | 其余（C2..C7 无阻断） | 是（成功） | 是（成功） | **否** | `skipped` | 真实结论 | 各自真实结论 | `[]` | **INCOMPLETE / 3** |

**关于 GT-25（config 来源的 matcher 被终止 → gate ERROR）**：该场景的前提是**执行**场景匹配子进程，
而匹配只在收集场景时发生（C1 的工作）。C1 被 skip 时不收集场景，故 GT-25 的运行期前提**不可达**，
其判定保持原样、无需修改。M3 覆盖的是**解析/编译期**失败（进程内、廉价），与 GT-25 不是同一件事。

**为什么 C1 被 skip 时仍要解析 id-pattern（M3）**：一个坏掉的 pattern 是**坏配置**，
不是**缺配置**。容忍它会造出第二个 false-negative（"配置全坏但 gate 说 INCOMPLETE"），
且会让 GT-24 的既有断言不再普遍成立。O4 要求七项检查的判据一字不动——保持 ERROR 正是履行它。

**M3 为何不含「config 文件不可读」（r3 勘误）**：一份不可读的 `process-config.md`
在 ④（测试命令来源判定）就已命中 **T4** 并以 ERROR/2 退出，根本走不到 ⑤ 的 id-pattern 解析。
「T7 缺席 + config 不可读」是**不可构造**的组合，v3 把它写进 M3 与 AC-GD-13 是一个不可达的验收分支。
该情形由 T4 / AC-GD-08 **完整拥有**。M3 保留的是那些能与 T7 共存的 **key 局部**问题
（`id-pattern` 行自身冲突、值不可编译、flag 为空或不可编译）。

**M4 为何按「builder 的 errors」判而不是按错误种类枚举（r3 勘误）**：
`buildChangeProjection` 的失败面不止 merge conflict / delta 畸形 / CAS 偏移——
`discoverDeltas()` 的 validation 失败（该 change 没有任何 delta 文件、change/specs/delta 路径逃逸等）
同样可达，且既不属于前三类、也绝不该落进 M1。因此 M4 的判据统一为
「**builder 返回非空 errors，或未产出可信 texts**」，覆盖其全部失败类别。

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
| AC-GD-07 | T2 / T3（`--test-cmd ""` 或仅空白） | ERROR，退出码 **2**；不回落 config、不降级 skipped。CLI 层按**存在性**传参，`runGate({testCmd:''})` 与 `runGate({testCmd:null})` 结果不同（§3.1b） |
| AC-GD-08 | T4 / T5（config 不可读，或 `test-cmd` 行冲突） | ERROR，退出码 **2** |
| AC-GD-08b | T7 的子情形：config 有 `test-cmd` 行但值为空/仅空白 | 归入**缺席**（同 AC-GD-01/02），**不是** ERROR——共享 parser 按契约已把它等同于「无该行」（`lib/config.js:67`）；本 change 不触碰 `lib/config.js` |
| AC-GD-09 | T1 / T6（任一有效来源） | gate 的检查集合、每项 detail 文案、`--json` 键集与取值、退出码**与本 change 前完全一致**（回归护栏） |
| AC-GD-10 | 任一情形加 `--json` | 输出是纯 JSON，键集恒为 `{change, stage, checks, result, blocked, errors}`（**不新增 `code` 字段**）；`result` 可取 `INCOMPLETE`，`checks[].status` 可取 `skipped`；进程退出码按 `PASS→0 / BLOCKED→1 / ERROR→2 / INCOMPLETE→3` 映射 |
| AC-GD-11 | 矩阵 M8（已归档 change + T7） | C1 `skipped`、C7 `n/a`、C4 按归档态要求全行终态；退出码按 B2 优先级 |
| AC-GD-12 | 矩阵 M7（hotfix bundle + T7） | 仍以 mapping m1 的拒绝退出（退出码 2 并指向 `apriori hotfix archive`） |
| AC-GD-13 | 矩阵 M3 的**每一个**子情形（空 flag / 不可编译 flag / 不可编译的 `id-pattern` config 值 / `id-pattern` 行冲突），各自叠加 T7 | 退出码 **2**，与本 change 前一致；对**已归档** change 亦然（M3 优先于 M8）。「config 文件不可读」**不在**本条，它归 AC-GD-08（T4） |
| AC-GD-13b | `runGate({testCmd: <非字符串>})`（数字 / 数组 / 对象 / 布尔） | ERROR，退出码 **2**，消息点明类型；**不得**把该值交给 `spawnSync` 去抛异常 |
| AC-GD-14 | T7 的任一情形 | **测试进程一次都不被 spawn**——以 `_setTestRunner` 计数 seam 断言调用数为 **0**（`_setChildRunner` 只拦 ID matcher 子进程，用它断言此事是错的） |
| AC-GD-15a | 静态检查 `lib/gate.js` 源码 | ① **否定面**：不出现 `discoverDeltas` / `buildProjection` 字样（gate 对 `archive-merge` 的既有依赖仅限 `CHANGE_NAME_RE` / `containsReal`，故不误伤）；② **肯定面**：gate 确实从 `./spec-runner` 引入并调用那个共享的 projection-only 入口 |
| AC-GD-15b | 用 `_setProjectionBuilder` 包裹**唯一**的 projection-only 构建引用，然后分别跑「T7 路径的 gate」与「有测试命令的 `verify --change`」 | 两条路径都恰好经过**同一个** wrapper（身份可断言）；T7 路径下 builder 被调用 **1** 次、`_setTestRunner` 计数为 **0** 次 |
| AC-GD-15c | 对 6 个 fixture——clean / 未打戳 mutation / delta 畸形 / CAS base 偏移 / merge conflict / **无 delta 文件（`discoverDeltas` 失败）**——分别走两条路径（T7 路径的 projection 由 15b 的 wrapper 捕获） | 两次得到的**完整** projection 对象（`modules` / `conflicts` / `unstampedMutations` / `notes` 全字段）**与** errors 数组逐项相等——成功与失败两类结果都比 |

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
| O5 | 让 `apriori verify` 在无 test-cmd 时降级 | verify 的全部职责就是把测试绑到场景上；没有测试命令时它没有任何可降级的产出。**本 change 对 `lib/spec-runner.js` 的改动限于三件事（r3 更正——v3 曾说「仅导出一个入口」，那不足以支撑 AC-GD-14/15b）**：① 导出既有的 projection-only 入口；② 新增两个**仅供测试**的注入 seam `_setProjectionBuilder` / `_setTestRunner`（同族于既有 `_setChildRunner`）；③ 把 `verify()` 自身对这两个函数的调用改为经由同一可替换引用。**默认值不变，配置齐备路径上的行为一字不变**（B4 由 AC-GD-09 守卫） |
| O6 | 改动 hotfix bundle 的拒绝路径（mapping m1） | 该拒绝发生在测试命令解析**之前**，不受影响；保持原样 |
| O7 | 修复「新鲜度检查看不见内容陈旧」这一机制局限（由 §1.4 的 truth/doctor.md 暴露） | 本 change 只把这一份文档改对；机制本身是独立议题，需要自己的证据与设计 |

**触及范围（源码）**：`lib/gate.js`、`lib/doctor.js`、`lib/spec-runner.js`——对 `spec-runner` 的改动**严格限于 O5 声明的三项**（导出 projection-only 入口、新增 `_setProjectionBuilder` / `_setTestRunner` 两个测试 seam、`verify()` 自身改走同一可替换引用），**O5 是范围的唯一定义**，此处不另设更窄的限制（r4·REQ-1 勘误：v4 此处写「仅导出 projection-only 入口」，与 O5 直接矛盾，实现者服从任一方都会违反另一方）。

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

## 八·4、STEP0·r4 处置说明（本版）

| ID | 处置 | 说明 |
|---|---|---|
| REQ-1（第三次 reopened） | **accept** | r4 指出的是我在 v4 里留下的**字面自相矛盾**：§五末尾的「触及范围（源码）」括号里仍写着「仅导出 projection-only 入口」，而同一节的 O5 已放宽为三项改动。实现者服从任一方都会违反另一方。已改写该行为「严格限于 O5 声明的三项」并写明 **O5 是范围的唯一定义**，同时把这次勘误本身记在行内 |
| REQ-2 | r4 已 **verified** | 评审方确认：T 分类域与 M 行优先级现已互斥、穷举、可构造，且与 `gate.js` / `config.js` / `spec-runner.js` 的实际控制流一致；无剩余不可构造的 AC |
| REQ-3 / REQ-4 / REQ-5 | 保持 **verified** | — |

r4 的六个维度中，维度 2/3/4/5/6 **全部通过**；唯一未通过的维度 1 就是上面这条范围文本矛盾。

---

## 八·3、STEP0·r3 处置说明

| ID | 处置 | 说明 |
|---|---|---|
| REQ-1（第二次 reopened） | **accept**，四点全收 | ① 勘误 `_setChildRunner` 的职责——它只包 config 来源 id-pattern 的匹配子进程，**不拦** `runTestCommand`（后者用 `spawnSync` 直起，无注入点）；② 勘误 CommonJS 事实——把 `buildChangeProjection` 加进 `module.exports` **不会**让外部替换生效，`verify()` 调的是词法绑定；③ 新增 §3.1c 明确要求**两个互不相同**的 seam：`_setProjectionBuilder`（证明同一 builder + 捕获 T7 内部 projection）与 `_setTestRunner`（断言测试进程 0 次），AC-GD-14/15b 改写为用正确的 seam；④ AC-GD-15a 补上**肯定面**断言（gate 确实引入并调用共享入口），不再只有否定面；⑤ O5 相应放宽为「导出入口 + 两个测试 seam + verify 自身改走同一引用」，不再宣称「仅限导出一个入口」 |
| REQ-2（第二次 reopened） | **accept**，四点全收 | ① 行顺序改为 **M7→M5**→M3→M4→M8→M6→M2→M1，并写明理由（`lib/gate.js:301` 的 hotfix 识别早于 `:306` 的 flow-state 检查，而正常 hotfix bundle 本就没有 flow-state，同时满足两行）；② 从 M3 与 AC-GD-13 **删除**「config 不可读」——它在 ④ 就被 T4 拦下，是不可构造的组合，该情形由 T4/AC-GD-08 完整拥有；③ M4 的判据改为「**builder 返回非空 errors 或未产出可信 texts**」，涵盖 `discoverDeltas` 的 validation 失败（无 delta 文件、路径逃逸），AC-GD-15c 的 fixture 从 5 个加到 6 个（补「无 delta 文件」）；④ §3.1b 补最后一行封闭类型域：`runGate` 的 `testCmd` 为非字符串时 ERROR/2 并点明类型，新增 AC-GD-13b |
| REQ-3 / REQ-4 / REQ-5 | r2 已 **verified**，r3 保持，本版未改动其对应内容 | — |

---

## 八·2、STEP0·r2 处置说明

| ID | 处置 | 说明 |
|---|---|---|
| REQ-1（reopened） | **accept** | v2 的 AC-GD-15 只比较三个字段的输出等价，确实证明不了「只有一套实现」。改为三条互补断言：**AC-GD-15a** 静态断言 `lib/gate.js` 不出现 `discoverDeltas`/`buildProjection`（gate 对 archive-merge 的既有依赖只有 `CHANGE_NAME_RE`/`containsReal`，故该断言不误伤）；**AC-GD-15b** 用注入 seam 断言两条路径经过同一个被包裹函数，且 T7 路径下 builder 调用 1 次、测试 runner 0 次；**AC-GD-15c** 把比较面扩到**完整** projection 对象（补上 `notes`）**与 errors 数组**，并覆盖 clean / 未打戳 / 畸形 / CAS 偏移 / conflict 五类 fixture（成功与失败两类结果都比）。AC-GD-14 也从「看副作用」改为「以 seam 计数断言 0 次」。§1.4 补记 `buildChangeProjection` 的签名、未导出事实与 `_setChildRunner` 既有 seam |
| REQ-2（reopened） | **accept**（其中 T6 一项按状态 A **改判**） | ① T6「config 值为空/仅空白 → ERROR」与 `lib/config.js:67` 的全局契约冲突，且修它要动全部 key——**改判归入 T7 缺席**，并新增 AC-GD-08b 把这个改判本身钉成一条验收；② T1 收窄为「至少一个非空白字符」，与 T3 不再相交；③ 新增 T4「config 存在但不可读 → ERROR/2」；④ M3 从「不可编译」扩到 **id-pattern 解析期的全部问题**（空 flag / 不可编译 flag / 不可编译 config / config 冲突 / config 不可读），AC-GD-13 相应要求逐子情形验收；⑤ M8 补上「id-pattern 解析成功」前提，并新增**行判定顺序**（M5→M7→M3→M4→M8→M6→M2→M1，首个匹配者胜）消除行交叠；⑥ 新增 §3.1b 定义 `runGate()` 层面 `testCmd` 的取值域（缺席/`null` vs `''`/纯空白），并指明 CLI 改为存在性传参 `('--test-cmd' in f)`，与 `--id-pattern` 同构 |
| REQ-3 / REQ-4 / REQ-5 | r2 已 **verified**，本版未改动其对应内容 | — |

---

## 八、STEP0·r1 处置说明

| ID | 处置 | 说明 |
|---|---|---|
| REQ-1 | **accept** | 新增 §1.2 完整记录 C7↔projection 的真实耦合与两处行号；触及范围加入 `lib/spec-runner.js` 并限定为「仅导出既有 projection 构建入口」（O5）；新增 AC-GD-14（测试进程不启动）与 AC-GD-15（两条路径的 projection 等价，钉死无第二套实现）；K5 记录公共面扩大的后果 |
| REQ-2 | **accept** | 新增 §三：§3.1 测试命令来源 7 分类（含空 flag / 仅空白 / config 空值三种此前未定义的边界），§3.2 八行逐检查矩阵（含 id-pattern 是否解析、是否建 projection、是否启动测试、C1/C7 状态、errors、退出码）；B2 给出唯一判定式；B1 显式声明 ERROR 类为其例外；并说明 GT-25 前提不可达、GT-24 语义保持 |
| REQ-3 | **accept**（取「不新增字段」一支） | AC-GD-10 改写为：键集恒为 `{change, stage, checks, result, blocked, errors}`，**不新增 `code`**；退出码按 result 映射。§1.4 勘误了 v1 对 `toJson()` 的错误描述，B4 的字节不变承诺因此成立 |
| REQ-4 | **accept** | §1.4 勘误状态 A：doctor 实际 D1..D8，`truth/doctor.md` 的 Contract 文本陈旧（戳新鲜但正文没跟上）；新增 AC-GD-24 要求 STEP6 修正该文档；AC-GD-20 补上「D8 原样保留」的回归护栏；机制层面的局限记入 O7 不做 |
| REQ-5 | **accept** | 文档验收面补齐 `docs/ci{,_cn}.md`、`docs/cli{,_cn}.md`、`docs/troubleshooting{,_cn}.md`；「一致」「显著」全部替换为可 grep 的断言（AC-GD-21/22/23/25）；原 AC-GD-19（RUNBOOK 一致性）经实测无断言面，**删除并记录理由** |
