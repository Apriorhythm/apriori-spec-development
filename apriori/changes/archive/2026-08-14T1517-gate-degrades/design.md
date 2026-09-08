# design — gate-degrades

> 对应 `requirement/req-final.md` 与 `gap-report.md` 的 G1..G10 / R1..R6。
> 行号取自 235a121。本文件不含实现代码，只含结构决定与其理由。

---

## D0 一句话结构

把「测试命令」从 **gate 的前置条件**降级为 **C1 的前置条件**，
并让 gate 的结果类型从三值扩到四值以承载「C1 没跑」这个事实。
其余六项检查的代码一行不动。

---

## D1 `lib/spec-runner.js` — 一个导出、两个 seam（G6/G7/G8）

### D1.1 为什么必须是 seam 而不是导出

`verify()` 与 `buildChangeProjection` 在同一文件里，前者调用后者用的是**词法绑定**。
把后者加进 `module.exports` **不会**让外部替换 `module.exports.buildChangeProjection` 生效——
被替换的只是导出对象的一个属性。所以「两条路径经过同一个函数」这件事，
**导出证明不了**，必须靠一个双方都读的可替换引用。

### D1.2 形状

```
let projectionBuilderOverride = null;
function _setProjectionBuilder(fn) { projectionBuilderOverride = fn; }
function currentProjectionBuilder() { return projectionBuilderOverride || buildChangeProjection; }

let testRunnerOverride = null;
function _setTestRunner(fn) { testRunnerOverride = fn; }
function currentTestRunner() { return testRunnerOverride || runTestCommand; }
```

- `verify()` 内 `:615` 的调用改为 `currentProjectionBuilder()(opts.change, cwd)`；
- `verify()` 内 `:642` 的调用改为 `currentTestRunner()(opts.testCmd, cwd)`；
- 新导出**恰为四个**：`buildChangeProjection`、`currentProjectionBuilder`、`_setProjectionBuilder`、`_setTestRunner`。
  `currentTestRunner` **不导出**——它只被 `verify()` 内部读取（STEP2·r1 / SPEC-4）。

**命名与既有 `_setChildRunner`（`:44`）同族**；下划线前缀是本仓既定的「测试 seam」标记。

### D1.3 为什么导出 `currentProjectionBuilder` 而不只导出 `buildChangeProjection`

gate 若直接 `require('./spec-runner').buildChangeProjection`，它拿到的是**原函数**，
测试包裹 seam 时 gate 那一路不会被包住——AC-GD-15b 的「同一个 wrapper」立刻失效。
gate 必须调 `currentProjectionBuilder()`，即**每次调用时**去读那个可替换引用。

> 这是本设计里最容易实现错的一处：`const b = sr.currentProjectionBuilder()` 提到模块顶层
> 就等于把引用冻结了。必须在调用点内取。

### D1.4 行为不变的保证

两个 override 默认 `null`，`current*()` 回落到原函数。
配置齐备路径上 `verify()` 的**调用序列确实变了**——两处调用点各插入一层解析器间接
（`currentProjectionBuilder()` / `currentTestRunner()`），说它「不变」是不诚实的（STEP5·r5 勘误）。
守恒的是**行为与结果**：底层 builder 与 runner 在配置齐备路径上仍是原函数（一处身份断言、
一处静态源码断言），且完整公共结果在**三态**下结构相等
（初始 / 装了 projection override 再清空 / 装了 runner override 再清空），由 SR-75 的
同进程 `deepStrictEqual` + 反向守卫证明。

> **【STEP5 记名修正 · `step5-amendment.md`】** 此处原写「逐字节不变」。
> 「与改动前逐字节相同」在本仓内**观察不到**（无状态 A 冻结 golden，且 CI 浅 checkout
> 使运行期解析父提交不可行）。已缩为上述可验证形式；残余风险在修正文件里具名接受。

---

## D2 `lib/gate.js` — 测试命令分类（G1/G4/G5）

### D2.1 CLI 层：真值判定 → 存在性判定

```
:353  testCmd: f['--test-cmd'] || null
   →  testCmd: ('--test-cmd' in f) ? f['--test-cmd'] : null
```

与紧邻的 `:354`（`--id-pattern`）写法完全一致。这一行是 T2/T3 得以与 T7 区分的**唯一**入口。

### D2.2 `runGate` 层：`resolveTestCmd(opts, cwd)` → 三态

单一函数，返回 `{ kind, value?, error? }`，`kind ∈ {'ok','error','absent'}`：

| 判定顺序 | 条件 | 返回 |
|---|---|---|
| 1 | `opts.testCmd` 既非 `undefined` / `null`，**又不是 string** | `{kind:'error', error:"--test-cmd must be a string (got <type>)"}` → T?（AC-GD-13b） |
| 2 | `opts.testCmd` 是 string 且 `.trim() === ''` | `{kind:'error', error:'empty --test-cmd'}` → T2 / T3 |
| 3 | `opts.testCmd` 是 string（含非空白） | `{kind:'ok', value: opts.testCmd}` → T1 |
| 4 | 否则查 config：`configTestCmd(cwd)` 返回 `{error}` | `{kind:'error', error: 'verify: ' + error}` → T4 / T5 |
| 5 | config 返回真值 | `{kind:'ok', value}` → T6 |
| 6 | 其余 | `{kind:'absent'}` → T7 |

> 第 6 行**自然**吞掉「config 有 `test-cmd` 行但值为空」——`lib/config.js:67` 早已把它跳过，
> gate 在消费点看到的就是 `undefined`。AC-GD-08b 断言的正是这个「什么都不做」的结果。

`kind==='error'` → 走既有的 `err(res, ...)`，exit 2，与今日同形。

### D2.3 插入位置

`runGate` 的次序**只在一处改变**：`:310-316` 的三行换成
`const tc = resolveTestCmd(opts, cwd); if (tc.kind==='error') return err(res, tc.error);`
`:293-306`（`--change` → 名字 → resolve → **hotfix** → **flow-state**）一行不动，
这自动保证矩阵的 **M7 先于 M5**（`:301` 早于 `:306`），无需额外代码。

---

## D3 `lib/gate.js` — 绑定阶段的两条路（G6）

```
if (tc.kind === 'ok')  → 现状：checkBinding(cwd, change, stage, tc.value, idPattern)
if (tc.kind === 'absent') → 新增：checkBindingSkipped(cwd, change, stage, idPattern)
```

`checkBindingSkipped` 做且只做四件事：

1. **解析 id-pattern**（M3）。C1 不跑也要解析：坏 pattern 是**坏配置**不是**缺配置**，
   容忍它会造出第二个 false-negative，且会让 GT-24 的既有断言不再普遍成立。
   失败 → 返回 `{infra:[...]}`，沿用 `:318-320` 的既有 ERROR 出口。
   —— 只做**编译期**校验（进程内、廉价）；**不**收集场景、**不**起匹配子进程，
   故 GT-25（matcher 被终止）的运行期前提不可达，其判定原样保留。
2. **archived 阶段：不建 projection**（M8）。`checkCas(:275)` 在 archived 直接返回 `n/a`，
   根本不读 projection——「不建」是已经成立的事实，实现只要不主动去建。
3. **in-flight 阶段：调 `sr.currentProjectionBuilder()(change, cwd)`**（M4）。
   判据是「返回**任何**非空 `errors`，或未产出可信 `texts`」——
   而不是枚举 merge conflict / 畸形 / CAS 偏移三类，因为 `discoverDeltas()` 的
   validation 失败（无 delta 文件、路径逃逸）同样可达且不属于那三类。
   非空 → `{infra: errors}` → exit 2。
   **补充（STEP2·r1 / SPEC-1）**：还存在 `errors` 为空但 `texts` 不可信的一格。
   此时不能直接 `{infra: []}`——那会产出一个 `errors` 为空的 ERROR，等于「报错但说不出原因」。
   实现必须**合成一条确定的诊断**，例如
   `projection produced no trustworthy texts and reported no error — refusing to judge`，
   使 ERROR 类别下 `errors` **恒非空**。
4. 成功 → 返回 `{check:{id:'C1', status:'skipped', detail:<见 D5>}, projection}`。

**gate 绝不引入 `discoverDeltas` / `buildProjection` 这两个符号**（AC-GD-15a 否定面）。
gate 对 `archive-merge` 的既有依赖只有 `CHANGE_NAME_RE` / `containsReal`（`:12`），不受影响。

---

## D4 `lib/gate.js` — 四值结果（G2）

```
:336  res.blocked = res.checks.filter((c) => c.status === 'blocked').length;   // 不变
:337  const skipped = res.checks.some((c) => c.status === 'skipped');          // 新增
      res.result = res.blocked ? 'BLOCKED' : skipped ? 'INCOMPLETE' : 'PASS';
      res.code   = res.blocked ? 1        : skipped ? 3            : 0;
```

`errors` 非空的路径**从不到达这里**（每条都提前 `return`），所以判定式的第一档
（`errors → ERROR/2`）由既有控制流天然满足，不需要在这里再写一次。

`blocked` 字段语义**不变**：只数 `blocked`，不数 `skipped`——
否则 GT-02 等既有断言里的计数会漂（R? 见 gap-report G2）。

`toJson` 不动：键集恒为 `{change, stage, checks, result, blocked, errors}`，
**不新增 `code` 字段**（AC-GD-10）；扩大的只有 `result` 与 `checks[].status` 的**取值域**。

---

## D5 `lib/gate.js` — 输出（G3）

```
:359  const mark = { pass:'✓', blocked:'✗', 'n/a':'–', skipped:'○' };      // 补键
:361  三分支：
      code 0 → `GATE: PASS — ${CAVEAT}`
      code 1 → `GATE: BLOCKED (${res.blocked} item(s))`
      code 3 → `GATE: INCOMPLETE — C1 did not run; PASS was not reached`
      code 2 → 不打印总结行（现状）
```

C1 的 detail（AC-GD-01 要求同时含「未执行的事实」与「修复指引」）：

```
C1 skipped — no test command (pass --test-cmd or add a test-cmd row to
apriori/process-config.md); the binding check did not run
```

> `mark` 少一个键就会打印 `undefined C1 …`，且**不会有任何既有测试自然失败**。
> tasks.md 为此单列一条断言输出行的任务。

---

## D6 `lib/doctor.js` — D5 分支次序（R1 / G9，本设计的关键点）

### D6.1 现状次序（`:157-161`）与它为什么会咬人

```
1. idPatternBroken        → n/a  'probe skipped (invalid id-pattern config)'
2. cfgCmd.error           → finding 'config: …'
3. !testCmd               → n/a  'no test command configured …'     ← 要升为 finding
4. opts.noRun             → n/a  'probe skipped (--no-run)'
5. else                   → classifyProbe(runTestCommand(...))
```

「无配置 + `--no-run`」今天在第 3 档就被 `n/a` 接住。
若原地把第 3 档改成 `finding`，这个组合会变成 finding，**直接违反 AC-GD-17**。

### D6.2 目标次序

```
1. idPatternBroken        → n/a   （AC-GD-19，最高优先级不变）
2. cfgCmd.error           → finding（AC-GD-18，文案与第 4 档必须可区分）
3. opts.noRun             → n/a   'probe skipped (--no-run)'        ← 上提一档
4. !testCmd               → finding                                 ← 由 n/a 升级
5. else                   → classifyProbe(...)
```

**只把 `--no-run` 分支上提一档**，是满足 AC-GD-16 + AC-GD-17 的最小改动。

第 4 档的文案（AC-GD-16 要求点明后果 + fix 指向 process-config）：

```
detail: 'no test command configured — `apriori gate` cannot run C1 (the binding check) at all'
fix:    "add a test-cmd row to apriori/process-config.md (or pass --test-cmd)"
```

与第 2 档的 `config: <problem>` / `keep one live test-cmd row` 明显可区分（AC-GD-18）。

### D6.3 副作用面

`findings` 计数与 `result` 的计算（`:232-234`）**不动**——
第 4 档变成 finding 后，整体自然从 HEALTHY 变 FINDINGS / exit 1。
D8（`:206-210`）一行不动（AC-GD-20 的回归护栏）。

---

## D7 测试策略（AC-GD-14 / 15a / 15b / 15c）

| AC | 手法 |
|---|---|
| 15a | 读 `lib/gate.js` 源文本：断言不含 `discoverDeltas` / `buildProjection`；断言含 `currentProjectionBuilder` 且来自 `require('./spec-runner')` |
| 15b | `sr._setProjectionBuilder(wrap)` + `sr._setTestRunner(count)` → 跑 T7 的 `runGate` → 断言 wrap 调用 1 次、count 调用 0 次；再跑有命令的 `verify --change` → 断言经过**同一个** wrap |
| 15c | 6 个 fixture 各跑两条路，比较 wrap 捕获到的**完整** `{projection:{modules,conflicts,unstampedMutations,notes}, errors}` |
| 14 | 即 15b 里 `_setTestRunner` 的计数断言（**不是** `_setChildRunner`——它只拦 id-match 子进程） |

**三个零调用保证互不替代（STEP2·r1 / SPEC-2）**——必须各用各的 seam：

| 保证 | seam | 场景 |
|---|---|---|
| T7 路径不起**测试进程** | `_setTestRunner` | SR-74 / AC-GD-14 |
| T7 + 合法 config 来源 pattern 时不起 **matcher 子进程** | `_setChildRunner` | GT-36 |
| 归档态 T7 不建 **projection** | `_setProjectionBuilder` | GT-38 |

**每一处 override 都必须在 `finally` 里 `_set*(null)` 复位（STEP2·r1 / SPEC-3）**——
模块级变量泄漏会造成同进程内后续测试的顺序依赖与假阳性。这是**每个使用点**的义务，
不是靠 SR-75 那一条「装了再清空能复原」的测试代劳。

**`currentTestRunner` 保持模块私有（STEP2·r1 / SPEC-4）**：新增公共导出恰为四个——
`buildChangeProjection`、`currentProjectionBuilder`、`_setProjectionBuilder`、`_setTestRunner`。
`currentTestRunner` 只被 `verify()` 内部读取，导出它会无端扩大公共面并逼 STEP6 记录一个没人消费的符号。

其余 AC 走常规的 `runGate` / `runDoctor` 单元断言 + CLI 退出码断言。

---

## D8 外部共享状态的三个时刻

本 change **不引入**任何外部共享状态：gate 与 doctor 都是同步只读命令，
两个新 seam 是**进程内模块级变量**，默认 `null`：

| 时刻 | 说明 |
|---|---|
| init | 模块加载时 `null`；`current*()` 回落到原函数 |
| runtime update | 只有测试通过 `_set*` 改写 |
| cleanup / invalidation | 测试**必须**在 `finally` 里 `_set*(null)` 复位——与既有 `_setChildRunner` 的用法一致（`test/change-scope.test.js:189/201/215`）。tasks.md 单列一条任务确保每处都有 `finally` 复位 |
