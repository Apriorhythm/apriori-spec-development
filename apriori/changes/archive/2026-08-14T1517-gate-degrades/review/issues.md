# issue ledger — gate-degrades

轮次标签：`STEP0·rN`（P1 需求评审）/ `STEP2·rN`（P5 规格设计评审）/ `STEP5·rN`（P8 一致性评审）。
状态词汇：`open` / `fixed` / `verified` / `rejected` / `rejected-verified` / `waived` / `advisory-acked`。
生产方只能 `open → fixed | rejected`；`verified` / `rejected-verified` 属评审方，`waived` 属人类。
重开（reopen）是**事件**不是状态：复现的问题回到原 ID 的 `open`，绝不新开一行。

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | C7 currently consumes projection produced through C1 verify, but the requirement claims only C1 depends on that path and limits source scope without declaring a projection-only seam | high | 1 | verified |
| REQ-2 | Reachable missing-test-command combinations do not define validation order, per-check statuses, continuation behavior, blocked count, and errors completely | high | 1 | verified |
| REQ-3 | AC-GD-10 implies a JSON code field while B4 and AC-GD-09 require the existing code-free JSON shape to remain byte-identical | med | 1 | verified |
| REQ-4 | The requirement claims the doctor KB Contract is fresh although it omits the implemented and living-spec D8 check | med | 1 | verified |
| REQ-5 | Documentation impact is incomplete and AC-GD-19/20 use non-mechanical consistency and prominence predicates | med | 1 | verified |
| SPEC-1 | GT-35 and tasks omit the frozen M4 branch where the builder returns no trustworthy texts with empty errors, while D3 would produce an opaque empty-errors ERROR | med | STEP2·r1 | verified |
| SPEC-2 | Tasks do not observe GT-36's zero matcher-child call or GT-38's zero projection-build guarantee, leaving two negative side effects unbound | med | STEP2·r1 | verified |
| SPEC-3 | Design requires every module-level seam override to be reset in finally, but tasks only test manual clear/restore and do not enforce cleanup at each use site | low | STEP2·r1 | verified |
| SPEC-4 | Task I1 exports currentTestRunner in addition to the exact public symbols declared by the spec and design, expanding the API beyond the frozen scope | med | STEP2·r1 | verified |
| ADV-STEP2-r1 | advisory batch acknowledged (3 items) | low | STEP2·r1 | advisory-acked |
| SPEC-5 | T14 simultaneously requires gate and verify to use the same wrapper and requires changing or clearing that wrapper between those two calls, making the task internally unsatisfiable | med | STEP2·r2 | verified |
| IMPL-1 | DR-07 says an unreadable process-config produces a D5 config finding, but doctor classifies it first as an id-pattern problem and returns D5 n/a, as the existing CF-11 test confirms | med | STEP5·r1 | verified |
| IMPL-2 | SR-75 and AC-GD-09 promise byte-identical configured behavior, output, and exits, but no test compares configured verify or gate against a state-A golden or exercises the test-runner default after clear | med | STEP5·r1 | verified |
| IMPL-3 | SR-73 compares only errors for the no-delta-files fixture, omitting the required full projection-object equivalence for the sixth fixture | low | STEP5·r1 | verified |
| IMPL-4 | GT-33 has no no-flag unreadable-config fixture, leaving §3.1 T4's ERROR-versus-absent boundary untested | low | STEP5·r1 | verified |
| IMPL-5 | GT-11's exact six-key JSON contract is asserted only for INCOMPLETE, not for every outcome class and the separate strict-parser error serializer | low | STEP5·r1 | verified |
| IMPL-6 | The troubleshooting docs incorrectly claim missing test-cmd yields INCOMPLETE/3 for every change, contradicting BLOCKED and ERROR precedence | med | STEP5·r1 | verified |
| ADV-STEP5-r1 | advisory batch acknowledged (4 items) | low | STEP5·r1 | advisory-acked |

<!-- 状态轨迹（recorded on behalf of the reviewer，逐字落盘其 ledger delta）：
     STEP0·r1（codex gpt-5.6-sol, session 019ffeaa）：REQ-1..5 五行 open。
     生产方 req-v2：五行 → fixed (v2)。
     STEP0·r2：REQ-3/4/5 → verified；REQ-1「AC-GD-15 仅比较部分样例输出，不能证明 gate 与 verify
       复用同一个 projection 实现」、REQ-2「T6 与共享 config parser 冲突，且不可读配置、id-pattern
       config problem、分类交集及直接 API presence 语义仍未覆盖」→ **reopened 回 open**。
     生产方 req-v3：REQ-1/2 → fixed (v3)。
     STEP0·r3：REQ-3/4/5 保持 verified；REQ-1「_setChildRunner 不是测试 runner seam，且当前不存在能同时
       拦截 verify 与 T7 gate 的 projection-builder seam」、REQ-2「M5/M7 优先级与源码相反，T7 + unreadable
       config 不可达，projection 错误未穷举，直接 API 非字符串输入未定义」→ **再次 reopened**。
     生产方 req-v4：REQ-1/2 → fixed (v4)。
     STEP0·r4：REQ-2 → **verified**（T 分类与 M 矩阵互斥穷举可构造，与源码控制流一致）；REQ-1 第三次
       reopened——§五「触及范围」括号仍写「仅导出 projection-only 入口」，与同节 O5 的三项改动直接矛盾。
     生产方 req-v5：REQ-1 → fixed (v5)。
     STEP0·r5：REQ-1 → **verified**；五行全 verified，「VERDICT: no major issues」，STEP0 收敛。
     verdict 序列 5→2→2→1→0（r1..r5）。req-v5 冻结为 req-final.md。 -->

<!-- STEP2·r1（同一 codex session）：SPEC-1..4 open + 3 条 advisory。
     生产方全部 accept 并落 STEP2·r1 修订：
       SPEC-1 → GT-35 加 `errors 空但 texts 不可信` 一支；design D3 要求合成确定诊断使 ERROR 下 errors 恒非空；tasks T6b。
       SPEC-2 → GT-36 加「合法 config pattern 时 matcher 子进程 0 次」；GT-38 加「projection builder 0 次」；tasks T7b/T9b；design D7 补三个零调用保证互不替代的表。
       SPEC-3 → tasks T16b：每个 seam 使用点必须 try/finally 复位。
       SPEC-4 → design D1.2/D7 与 tasks I1 都改为「新增导出恰四个，currentTestRunner 不导出」。
     advisory 三条也已实施（GT-11 的 WHEN 列出 INCOMPLETE；T14 加「先 require 再装 override」以打穿模块加载期冻结；新增 T0 全绿基线）。 -->

<!-- STEP2·r2：SPEC-1..4 全部 → verified（五维中 1/2/3/5 通过）；新开 SPEC-5——
     r1 为落实 advisory 而改写的 T14 自相矛盾（既要「两次调用经同一 wrapper」又要「两次调用之间换掉它」）。
     accept，按评审建议拆成三阶段：① 先 require gate 再装 wrapper A；② gate 与 verify 都调用并断言同一个 A
     且 6 个 fixture 全等；③ 之后才换成 B/清空做第三次调用，独立证明按调用时解析。 -->

<!-- STEP5·r1（P8 一致性评审，同一 codex session）：IMPL-1..6 open + 4 条 advisory。全部 accept：
       IMPL-1 → DR-07 delta 越权了：整份 process-config 不可读会先被 id-pattern 解析拦下（D5 = n/a，
         既有 CF-11 已如此断言），只有 `test-cmd` 行**冲突**才走 config-finding 分支。delta 文本改正。
       IMPL-2 → SR-75 的「byte-identical」原本只是散文。改为可观察的三态断言（虚拟态 / 清空 projection
         override 后 / 清空 runner override 后），并加一条「装上时确实被改道」的断言防止后一条空转。
       IMPL-3 → 第 6 个 fixture 补 projection 全对象比较。
       IMPL-4 → 补「无 flag + config 不可读」fixture（用目录占位，root 环境下 chmod 无效）。
       IMPL-5 → 六键契约扩到 PASS / BLOCKED / INCOMPLETE / resolved-ERROR / strict-parser-ERROR 五类。
       IMPL-6 → 两份 troubleshooting 的「对任何 change 都返回 INCOMPLETE」是错的，改为「其余检查全过时」。
     advisory 四条：GT-30b/SR-73b 其实不绑定任何场景（leadId 拒绝紧跟数字的字母），已按建议改名为精确
       前缀使补充覆盖可机械归属；truth 文档仍是状态 A 属 P9 职责；12 ORPHAN 是在途正常态；沙箱 EPERM
       不算 finding。 -->

<!-- STEP5·r2：IMPL-1/3/4/6 → verified；IMPL-2 与 IMPL-5 **reopened**，两条都对：
       IMPL-2 → 我的三态比较有两个洞：① `snap()` 起的是**子进程**，子进程有全新的模块注册表，
         根本看不到父进程装/清的 override，那段比较是空转的；② 只比了 gate 的部分字段，没有 verify。
         并且「与 pre-seam 实现逐字节相同」这件事**本仓内的测试根本观察不到**（没有状态 A 的冻结 golden）。
         改法两手：测试改为**同进程**比较 `runGate()` 与 `verify()` 的**完整**公共结果三态；
         场景措辞按 RUNBOOK「要么加测试、要么把话缩到实际验证得了的范围」缩为「三态一致 + 装上时确实改道」，
         并注明 pre-seam 同一性由未改动的既有测试基线继续通过来佐证。
       IMPL-5 → `gate --json` 解析是**成功**的，走的是 runGate 的 usage 错误，压根没碰 withStrict 的
         jsonError 序列化器。改用真正的解析拒绝（多余位置参数 `gate stray --change c --json`），
         实测输出确为 jsonError 的「unexpected argument」形状。
     advisory 两条（静态测试注释仍写 SR-73b、CHANGELOG 的 391 与实际 392 不符）也已修。 -->

<!-- STEP5·r3：IMPL-5 → verified（`gate stray --change c --json` 确实走 withStrict 的 jsonError）。
     IMPL-2 第二次 reopened，两点又都对：
       ① `JSON.stringify([g, v])` 会把 verify() 的 Map 值字段 `results` 悄悄拍成 `{}`——
          恰好瞎在 projection seam 最可能扰动的那个字段上。已改为整体 deepStrictEqual /
          notDeepStrictEqual（Map 按内容比），并加一条「Map 字段确实非空」的前置断言防空转。
       ② 「pre-seam 逐字节相同」这条硬保证仍留在 B4/AC-GD-09/SR-75 里而无人验证。
          考虑过冻结状态 A 的 byte golden，**否决**（CI 默认 fetch-depth:1 拿不到父提交；
          签入静态 golden 需路径归一化且给每次 gate 文案改动预埋重捕获义务）。
          按 RUNBOOK 的 guarantee-claim discipline **缩措辞**，并写成记名修正
          `step5-amendment.md`（含否决理由、缩后的三条证据、具名接受的残余风险、将来补强的触发条件），
          req-final 的 B4 与 AC-GD-09 就地加修正标记指向它。 -->

<!-- STEP5·r4：IMPL-2 第三次 reopened，理由是「测试已够，但**散文里还有五处更强的承诺没缩**」——
     全部核实属实并逐处修掉：
       ① delta 的父 Requirement 仍写 seams「leaving every configured path byte-identical」→ 改为三态结构相等；
       ② design D1.4 仍写「逐字节不变」→ 改为三态结构相等 + 记名修正说明；
       ③ req-final §3.1c 与 O5 的「一字不变」→ 加记名修正指向 step5-amendment.md；
       ④ AC-GD-04 的「与本 change 前逐字节一致」原本在 B4/AC-GD-09 的修正范围**之外** →
          缩为「退出码 2 + 诊断仍点明 flow-state」这一可断言形式；
       ⑤ SR-75 说「两个解析器都返回原函数本身」，但私有的 runner 解析器**无法从外部比身份** →
          场景措辞拆开（导出的直接可断言 / 私有的静态可断言），并**加了一条静态源码断言**
          `currentTestRunner() { return testRunnerOverride || runTestCommand; }`，把「默认即原函数」
          从声称变成可机械检查。
     评审方另确认：CHANGELOG 与用户文档**没有**这类未验证承诺（CHANGELOG 里其余 byte-identical
     字样属既往 change 各自已测的历史保证）。 -->

<!-- STEP5·r5：IMPL-2 第四次 reopened。评审方确认 r4 的五处已改对，但在**最后一遍梳理**里又抓到三条，
     三条都是我自己记录里的过强表述（不是代码问题）：
       ① `step5-amendment.md` 的证据 C 写「本 change 一条未改其断言」——**事实错误**，
          `DR-07` 是被刻意改写的（它原本断言「缺配置 → n/a」，正是本 change 要改掉的行为）。
       ② `tasks.md` 的 T18 仍引修正**之前**的口径，并声称「另加一条显式断言」——本仓无从断言。
       ③ `design.md` D1.4 仍写「调用序列与参数不变」——序列**确实变了**（两处调用点各插了一层
          解析器间接），守恒的是行为与结果，不是序列。
     三条全部改正；证据 A 也补上了私有 runner 解析器的静态断言来源；修正文件的 §四 扩成完整清单
     （同一条保证一共有九处副本，分三轮才清干净）。 -->

<!-- STEP5·r6：IMPL-2 第五次 reopened，抓到**第十份副本**——而且在 `lib/spec-runner.js` 的
     源码注释里（「so a configured run is byte-identical to its pre-seam form」），
     那是我在本 change 里新写的。前九处都在流程文档，第十处在实现文件里，比散文更容易被
     下一个读代码的人当成契约。已改为「解析器落到原函数 + 清空后结果结构相等」并明确不声称
     pre-seam 同一性；step5-amendment.md 的清单补进这一行，并记下检索范围本身就是陷阱这一教训。 -->

<!-- STEP5·r7：IMPL-2 第六次 reopened——第十一份副本在 `gap-report.md` §二「状态 B（目标）」第 4 条。
     它是 STEP1 交给 STEP2/STEP5 的**目标陈述**（不是历史引用），所以带操作性，已改。
     另在修正文件里点名 `requirement/req-v1..v5.md` 里的同类字样**不改**：那是 STEP0 的版本历史，
     改写会让「五轮评审如何把这条保证逼出来」的审计链失真；req-final 才是冻结生效的那份，已带标记。
     生产方本轮自行做了一次全 change 面的穷举 grep（含 lib/ 与 test/），确认剩余命中全部属于
     既往 change 的历史保证（GT-21、docs/cli.md 的 --specs golden、CHANGELOG 历史条目）。 -->

<!-- STEP5·r8：「VERDICT: no spec-vs-code gaps」——IMPL-2 → verified，评审方明确确认
     req-v1..v5 保留原样是正确决定（它们是有名的 STEP0 版本历史，req-final 才是在册契约并带修正标记，
     修正文件已点名它们），且清单现已完整、无任何现行产物仍承诺未验证的 pre-seam 逐字节同一性。
     STEP5 收敛。P8 verdict 序列：6→2→1→1→1→1→1→0（r1..r8）。 -->
