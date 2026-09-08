# tasks — gate-degrades

STEP5 按本表顺序执行；每完成一项立刻打 `[x]`。
测试先行：先按 §T 写出**失败**的测试并给出失败运行，再按 §I 实现。

## T — 测试先行（一场景一失败测试，测试名带场景 ID）

- [x] T0 **先跑一次全量测试并记录全绿基线**（STEP2·r1 advisory）——之后才加新测试，红灯才分得清是 TDD 预期红还是既有回归
- [x] T1 `test/gate-degrade.test.js` 新建；GT-30 一条失败测试（无 test-cmd → C1 `skipped`、C2..C7 出结论、`GATE: INCOMPLETE`、exit 3）
- [x] T2 GT-31（缺席 + 至少一项 blocked → BLOCKED / exit 1，且 `blocked` 计数不含 skipped）
- [x] T3 GT-32（`--test-cmd ""` / `"   "` / 非字符串 `runGate({testCmd:1})` → exit 2，各自消息可区分；**不**回落 config）
- [x] T4 GT-33（config 不可读 / `test-cmd` 行冲突 → exit 2；`test-cmd` 行值为空 → 视为缺席，exit 3）
- [x] T5 GT-34（缺席 + 未打戳 mutation delta → C7 仍 blocked 并给 `apriori stamp` 指引）
- [x] T6 GT-35（缺席 + projection 失败的**五类**：merge conflict / delta 畸形 / CAS 偏移 / 无 delta 文件 / 路径逃逸 → exit 2，C7 不出结论）
- [x] T6b GT-35 第二支（SPEC-1）：用 `_setProjectionBuilder` 注入 `{projection, errors: [], texts: null}` → 断言仍 exit 2、`errors` **非空**（合成的确定诊断）、C7 不出结论
- [x] T7 GT-36（缺席 + id-pattern 解析失败的四个子情形 → exit 2；in-flight 与 archived 各一次）
- [x] T7b GT-36 第二支（SPEC-2）：缺席 + **合法的 config 来源** id-pattern → 用 `_setChildRunner` 断言 matcher 子进程调用数为 **0**
- [x] T8 GT-37（缺席 + hotfix bundle → exit 2 且指向 `apriori hotfix archive`，**不是**「flow-state 缺失」文案；缺席 + 无 flow-state 的正式 change → exit 2 的 flow-state 文案）
- [x] T9 GT-38（缺席 + 已归档 change → C1 skipped / C7 `–` / C4 要求全行终态 / 退出码按全序）
- [x] T9b GT-38 第二支（SPEC-2）：同一路径下用 `_setProjectionBuilder` 断言 projection builder 调用数为 **0**
- [x] T10 GT-11 扩展（`--json` 在 INCOMPLETE 类别下键集仍恰为六键、无 `code` 字段、`result` 与 `checks[].status` 取新值）
- [x] T11 **输出行断言**（易漏项）：`skipped` 状态在人类可读输出里有自己的符号，绝不出现 `undefined`；`GATE: INCOMPLETE` 总结行存在
- [x] T12 `test/doctor.test.js` 的 `DR-07` 改写为两条：`--no-run` → `n/a`（AC-GD-17）；完全未配置 → `finding` + 后果文案 + fix（AC-GD-16）
- [x] T13 DR-07 的分支优先级四例：id-pattern 坏 → `n/a`（AC-GD-19）；config 冲突 → `finding` 且文案与「未配置」可区分（AC-GD-18）；**无配置 + `--no-run` → `n/a`**（本 change 最易踩的回归）；有命令 → 行为不变
- [x] T14 SR-73，**分三阶段**（STEP2·r2 / SPEC-5 更正——r1 的写法要求「两次调用经同一 wrapper」又要求「两次调用之间换掉 wrapper」，字面不可同时成立）：
      ① 在安装 override **之前**先 `require` gate 模块；装上 wrapper **A**；
      ② 让 gate 的 T7 路径与 `verify --change` 都调用，断言二者经过的是**同一个 A**，且 6 个 fixture 的**完整** projection 与 errors 逐项相等；
      ③ ②**做完之后**再换成 wrapper **B**（或清空），做第三次调用，断言读到的是 B/默认值——这一步独立证明引用是**按调用时**解析的，打穿「模块加载时冻结」的错误实现；
      全程 override 在 `finally` 里清理
- [x] T15 SR-74（缺席路径下 test-runner seam 计数为 0）
- [x] T16 SR-75（seam 默认惰性；装了再清空后行为复原）
- [x] T16b **每一个** `_setProjectionBuilder` / `_setTestRunner` / `_setChildRunner` 使用点都包在 `try/finally` 里复位为 `null`（SPEC-3）——模块级 override 泄漏会让同进程后续测试产生顺序依赖与假阳性；T16 只测「能复原」，不能代替每个使用点的义务
- [x] T17 AC-GD-15a 结构断言：读 `lib/gate.js` 源文本——不含 `discoverDeltas` / `buildProjection`；含 `currentProjectionBuilder` 且经 `require('./spec-runner')`
- [x] T18 AC-GD-09 回归护栏，**按 `step5-amendment.md` 的记名修正范围**（STEP5·r5 改写——原文写「与改动前一致」并声称加了一条显式断言，那是修正**之前**的口径，且本仓内无从断言）：
      ① SR-75 的同进程三态完整结果 `deepStrictEqual` + 反向守卫；
      ② 导出的 projection 解析器身份断言 + 私有 runner 解析器的静态源码断言；
      ③ 配置齐备路径上的既有 `test/gate.test.js` / spec-runner 测试**一字未动且全绿**
      （唯一被改写的既有断言是 `DR-07`，那属于本 change 有意改变的行为面，已在修正文件里点明）
- [x] T19 AC-GD-20 回归护栏：D8 行为不变
- [x] T20 跑一次全量测试，**记录失败清单**（实测：gate-degrade 15 条中 14 红 1 绿——GT-37 因既有拒绝路径本就正确而先绿；doctor 2 条全红。基线 375 绿）

## I — 实现（按依赖顺序）

- [x] I1 `lib/spec-runner.js`：新增 `_setProjectionBuilder` / `currentProjectionBuilder` / `_setTestRunner` / `currentTestRunner`；`verify()` 内 `:615` 与 `:642` 两处调用改走 `current*()`；**新增导出恰为四个**：`buildChangeProjection`、`currentProjectionBuilder`、`_setProjectionBuilder`、`_setTestRunner`——`currentTestRunner` **保持模块私有**，导出它会无端扩大公共面（SPEC-4）
- [x] I2 `lib/gate.js`：CLI 层 `--test-cmd` 改存在性判定（`('--test-cmd' in f)`）
- [x] I3 `lib/gate.js`：新增 `resolveTestCmd(opts, cwd)` 三态函数（非字符串 → error / 空白 → error / 有值 → ok / config error → error / config 有值 → ok / 否则 absent）
- [x] I4 `lib/gate.js`：用 `resolveTestCmd` 替换 `:310-316`；`kind==='error'` 走既有 `err()`
- [x] I5 `lib/gate.js`：新增 `checkBindingSkipped(cwd, change, stage, idPattern)`——解析并编译校验 id-pattern（失败 → `{infra}`）；archived 不建 projection；in-flight 调 `sr.currentProjectionBuilder()(change, cwd)`，`errors` 非空或无可信 `texts` → `{infra}`；成功 → C1 `skipped` + projection
- [x] I6 `lib/gate.js`：结果计算改四值（`blocked` 语义不变，只数 blocked）
- [x] I7 `lib/gate.js`：`mark` 表补 `skipped` 键；总结行改三分支（加 `GATE: INCOMPLETE`）
- [x] I8 `lib/doctor.js`：D5 分支**把 `--no-run` 上提一档**，缺席分支升为 `finding` 并写后果文案 + fix
- [x] I9 跑全量测试到绿；`node bin/apriori.js check --self` PASS
- [x] I10 `apriori verify --change gate-degrades` GREEN

## D — 文档与 KB（可 grep 的断言）

- [x] D1 `docs/ci.md` + `docs/ci_cn.md` 的 exit-code cheat table 加 `3` 行，gate 列含 `INCOMPLETE`（AC-GD-21）
- [x] D2 `docs/cli.md` + `docs/cli_cn.md` 的 gate 小节 Exit 行加 `3` 与 `INCOMPLETE`（AC-GD-22）
- [x] D3 `docs/troubleshooting.md` + `_cn.md` 的 D5 小节补「未配置 test-cmd → D5 finding，且 gate 的 C1 会 skipped」与修复行（AC-GD-23）
- [x] D4 `CHANGELOG.md` Unreleased 条目含字面串 `INCOMPLETE` 与 `exit code 3`，并声明退出码语义扩展（AC-GD-25）
- [x] D5 逐条核对 AC-GD-01..25 全部有对应证据（列一张对照表进 flow-state）

## S — STEP5 出口

- [x] S1 `apriori verify --change gate-degrades` GREEN（机械绑定门）——实测 GREEN；`npm run verify` 的 store-only 形式报 12 ORPHAN，是本 change 新 ID 尚未并入 store 的**在途正常态**，归档后自动清零
- [x] S2 P8 异构一致性评审（R2，codex）——r1..r8 共八轮，verdict 序列 6→2→1→1→1→1→1→0；八份 review 文档 + 八份 raw 全部落盘
- [x] S3 ledger 全行进入可归档终态（16 verified + 2 advisory-acked）

（STEP6 的 KB 写回——含 `truth/doctor.md` 的 seven→eight checks 修正（AC-GD-24）——
在 P9 阶段做，不列在 STEP5 的 tasks 里。）
