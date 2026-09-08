# issue ledger — id-pattern-and-delta-notes

轮次标签：`STEP0·rN`（P1）/ `STEP2·rN`（P5）/ `STEP5·rN`（P8）。
状态词汇：`open` / `fixed` / `verified` / `rejected` / `rejected-verified` / `waived` / `advisory-acked`。
生产方只能 `open → fixed | rejected`；`verified` / `rejected-verified` 属评审方，`waived` 属人类。
重开（reopen）是**事件**不是状态：复现的问题回到原 ID 的 `open`，绝不新开一行。

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | AC-IP-09 的 D5 pattern-insensitive 断言不成立：newly-recognized SKIP/TODO 可使 D5 从 ok 变成 truncated/malformed finding；须先确定并声明 D5 的目标语义 | high | 1 | verified |
| REQ-2 | AC-IP-21 只要求更新模板 Default 列；fresh init 的 active Value 仍可配置旧 pattern 并覆盖新 DEFAULT_ID，config-origin 路径因而得不到 B1 行为 | high | 1 | verified |
| REQ-3 | D6 的「形似 ID 前导 token」没有语法、边界、样例选择及 pattern source/origin 输出契约，AC-IP-10～12 无唯一 oracle | med | 1 | verified |
| REQ-4 | `## Notes` 未定义完整状态转移、位置、重复、fence 与 CAS 关系，且 AC-IP-14 未排除 Notes-only delta，和 state A 的 zero-op refusal 冲突 | high | 1 | verified |
| REQ-5 | 非-Requirement h3 仅定义 IN_REQUIREMENT；FILE_PREAMBLE、section preamble、RENAMED、h4/h5 及错误后 block 恢复/丢弃语义未声明 | med | 1 | verified |

<!-- STEP0·r1（codex gpt-5.6-sol, session 019fff86）的 ledger delta，逐字落盘。五条全部 accept。 -->

<!-- STEP0·r2：REQ-2 / REQ-3 → verified；REQ-1 / REQ-4 / REQ-5 reopened，三条都成立：
       REQ-1 → 方向对了，但我在 v2 里留下两处 v1 旧话（K3 与触及范围），同一份需求同时要求
         「现在解耦」和「以后再决定」。
       REQ-4 → **真矛盾**：Notes 只在下一个 h2 结束，所以「Notes 之后、首个操作段之前」的 CAS 戳
         仍在 Notes 内，与「段内戳一律忽略」不可兼得。裁定取「Notes 真正不透明」——戳必须前置。
         另把「三种法定操作段」改正为四种（漏了 RENAMED）。
       REQ-5 → `RENAMED` 不是 state 而是正交的 kind，「RENAMED 内非法 Requirement 之后」这个真实
         复合态会同时命中矩阵两格；且漏了 `SKIP_UNRECOGNIZED`。矩阵改按真实 state 表述 + 两条优先级规则。
     三条全 accept，落 req-v3.md。verdict 序列：5→3。 -->

<!-- STEP0·r3：REQ-1 / REQ-4 → verified；REQ-5 第三次 reopened，理由成立：P1 写成「后续**所有**
     非-h2、非合法-Requirement 行继续静默吸收」，而状态 A 在每一个非跳过状态都**先**匹配
     STAMP_ATTEMPT_LINE_RE 再进 body 分支。按字面实现会把作废块内的 CAS 戳一并吞掉，
     恰好打破我自己承诺的「RENAMED 逐字节不变」。改为「P1 只抑制新增的 h3 判定，不改状态 A 的
     行处理顺序」，新增 AC-IP-17h。verdict 序列：5→3→1。 -->

<!-- STEP0·r4：REQ-5 → verified，「VERDICT: no major issues」——**STEP0 收敛**。
     verdict 序列 5→3→1→0（r1..r4，未触 step0-cap=5）。req-v4 冻结为 req-final.md。 -->

| SPEC-1 | widening 后仍保留多条与新 default 矛盾的 living scenarios（SR-13 / SR-50 / SR-53 / CK-13，以及新 SR-08 的前提措辞） | high | STEP2·r1 | verified |
| SPEC-2 | 「逐字节相同子串」的 strict-superset oracle 按裸 RegExp 解释时为假 | med | STEP2·r1 | verified |
| SPEC-3 | D6 delta spec 遗漏样例数量、顺序和截断契约 | med | STEP2·r1 | verified |
| SPEC-4 | fresh-init/template 端到端行为只存在于 design/tasks，不存在于 delta spec | med | STEP2·r1 | verified |

<!-- STEP2·r1：SPEC-1..4 open，四条全部 accept：
       SPEC-1（high）→ 我只改了 SR-08，漏了**四条既有 living scenario 会因放宽而变假**：SR-13（断言
         `XX-01b` unidentified）、SR-50 与 CK-13（其 config 行恰好就是新默认式，于是「没有行就失败」不再成立）、
         SR-53（断言「行为与本 change 前完全一致」）。delta 从 3 个模块扩到 **5 个、6 个 MODIFIED 块**；
         SR-50/CK-13 改用**比新默认式更窄**的行，用「加了行反而更严」来证明优先级。
       SPEC-2（med）→ 「逐字节相同子串」在**裸正则层是假的**（`AC-30f` 旧式返回 `AC-30`）。
         契约改到 **`leadId` 层**：对每个旧 leadId 绑定成功的标题，新 leadId 返回逐字节相同的 ID。
       SPEC-3（med）→ 样例 ≤3 / 库内顺序 / 截 40 字符只活在 design 与 tasks 里，已写进 doctor delta 正文与 DR-20。
       SPEC-4（med）→ 模板三处 + fresh-init 端到端只在 design/tasks，已加进 config delta（CF-12 正文 + 新 CF-18）。
     **另有一次机械捕获值得记**：我第一次构造 spec-runner 第二个 MODIFIED 块时把边界多取了一行，
     把「change-scoped verify」那个块的开头也吞了进去——`archive --change` 的 MODIFIED INTEGRITY 报告
     当场列出 `dropped: SR-57..SR-64` 八条。修正边界后归零。这正是 modified-block-integrity 那个 change 的价值。 -->

<!-- STEP2·r2：SPEC-3 / SPEC-4 → verified；评审方另确认「projected living spec 中未发现其他旧 default 行为假设」。
     SPEC-1 / SPEC-2 reopened，两条都是**我改漏的同一条保证的其它副本**：
       SPEC-1 → SR-08 的 WHEN 仍只写「`--id-pattern` is omitted」，没要求 config row 也不存在
         （与同一份 delta 的 SR-50 优先级直接冲突）；SR-53 的**标题**仍写「binds unchanged」，
         与已改过的正文（识别集合变宽）矛盾。两处已改，SR-53 因此新增一个 titleChanged。
       SPEC-2 → `proposal.md` 的 WHAT 仍留着「对旧式能识别的每一个输入返回逐字节相同的子串」
         这句裸正则层的旧说法——同一个 change 于是给出两个不同的测试 oracle。已与 design 对齐并附反例。
     另：proposal 的触及范围「3 份 living spec」也已改为 5 份。 -->

<!-- STEP2·r3：SPEC-1 / SPEC-2 → verified，「VERDICT: no major issues, ready to proceed to execution」
     —— **STEP2 收敛**。verdict 序列 4→2→0（r1..r3，未触 step2-cap=4）。 -->

| IMPL-1 | SR-08 的逐字节兼容保证只用五个同质样例验证 | med | STEP5·r1 | verified |
| IMPL-2 | CF-12 未独立断言 VALUE 列 / DEFAULT 列 / 相邻注释三处的确切 pattern | med | STEP5·r1 | verified |
| IMPL-3 | CF-18 绕过了 config 来源子进程，也没测四个消费者的一致性 | high | STEP5·r1 | verified |
| IMPL-8 | AM-47 与 SR-54 的成功态 config-origin 对照组，其 pattern 在放宽后已被默认式吞掉，config 行被忽略也照样绿 | med | STEP5·r3 | verified |
| ADV-STEP5-r3 | advisory batch acknowledged (1 item) | low | STEP5·r3 | advisory-acked |
| IMPL-7 | GT-22 / GT-23 的 fixture 在放宽后与默认式等价，不再能证明 gate 的 flag/config 优先级；GT-22 的 `/unidentified/` 断言还会被「0 unidentified」满足 | med | STEP5·r2 | verified |
| IMPL-4 | DR-19 的源码切片断言无法稳健证明 D5 不会间接消费 DEFAULT_ID | med | STEP5·r1 | verified |
| IMPL-5 | DR-20 未钉死库内顺序、40 字符上限与 bounded pattern source | med | STEP5·r1 | verified |
| IMPL-6 | AM-73 只测了解析器状态，没有端到端验证 CAS 默认拒绝与零操作拒绝 | med | STEP5·r1 | verified |

<!-- STEP5·r1（P8 一致性评审）：IMPL-1..6 open，六条全部 accept。它们**全是测试强度问题，没有一条是代码错误**：
       IMPL-3（high）→ CF-18 用裸 RegExp 走 collectScenarios，**根本没碰 config 来源的子进程**，
         而那正是模板设了 Value 之后每个新项目实际走的路径；也没验四个消费者一致。
         已改为 `makeIdMatcher(resolved).batch(...)` 走真子进程，并把 check / doctor D6 / verify 三个消费者
         在同一个 fresh-init 项目上跑一遍。
       IMPL-1 → 兼容性保证原来只有五个手挑字符串。改为**系统化扫描**（前缀 × 位数 × 尾随上下文 × 近似形状
         共 500+ 组合，其中 50+ 命中被保护的分支），外加对本仓 store **353 个真实 ID** 逐个断言。
       IMPL-2 → CF-12 原来只断言「无陈旧 + 含新式」。改为**三处各自独立断言**：parseConfig 的 VALUE、
         表格行的第四列、注释里的 built-in default。
       IMPL-4 → 源码切片断言脆弱。改为**结构上消除耦合**——`lib/doctor.js` 现在**根本不 import** 那个常量，
         断言改为「全文件不出现 DEFAULT_ID」，任何未来编辑都无法悄悄把耦合加回来。
       IMPL-5 → 补齐库内顺序（前三个恰为 AC-BIS-00/01/02）、每个样例 ≤40 字符、detail 回显生效 pattern。
       IMPL-6 → 新增端到端测试：Notes-only delta 走真命令被零操作拒绝；**戳藏在 Notes 段内的 mutation delta
         触发 CAS 默认拒绝且 store 未写、bundle 未移**；同一 delta 把戳挪到 Notes 之前则戳被消费。 -->

<!-- STEP5·r2：IMPL-1/2/4/5/6 → verified。两条 open：
       IMPL-3 再开——CF-18 的注释写着「四个消费者一致」，实际只跑了三个，**漏了 gate C1**。
         已在同一个 fresh-init 项目里补一个最小 change bundle 并跑 `runGate`，断言 C1 pass 且 `0 unidentified`。
       IMPL-7（新）——**放宽默认式让 GT-22/GT-23 的 fixture 失去了鉴别力**：`SUFFIX_PATTERN = [A-Z]+-\d+[a-z]*`
         对 `XA-01b` 与新默认式**等价**，于是带不带 flag 都过，测试不再证明任何东西；而 GT-22 的
         `/unidentified/` 还会被 store 摘要里的「0 unidentified」满足，掩盖了这一点。
         改用**默认式刻意不认**的小写 ID（`xa-01`）+ `[A-Za-z]+-\d+` 的 flag/config pattern，
         并把断言收紧为 `/[1-9]\d* unidentified/`。
       这条是本 change 最有教育意义的一处：**放宽一个默认值，会让某些既有测试从「证明了什么」
         静悄悄退化成「什么都没证明」**——而它们仍然是绿的。 -->

<!-- STEP5·r3：IMPL-3 / IMPL-7 → verified。新开 IMPL-8——按我请求做的**全库横扫**又找到两处同类：
       AM-47 与 SR-54 的「成功态」config-origin 对照组用的 pattern 在放宽后已被默认式吞掉，
       config 行就算被完全忽略也照样绿。
     修 AM-47 时踩到一个更细的点：**dropped 行打印的是场景标题原文，与 ID 识别无关**，
       所以我最初写的「无 row 时不应出现 `! dropped: ac-09b`」这个对照**本身也不成立**（实测两边一样）。
       换成 `titleChanged` —— 它必须在两侧都识别出同一个 ID 才可能产生，是真正的鉴别器：
       有 row → `titleChanged: ac-08a old title -> ac-08a new title`；无 row → `dropped` + `added 1`。
     SR-54 的成功态对照改用小写 spec + `[a-z]+(-[a-z]+)*-\d+` 行，并加一条「无 row 时不是 GREEN」的反向断言。
     advisory ADV-1（两个遗留测试标题仍印着退役的旧措辞）也已实施。 -->

<!-- STEP5·r4：AM-47 与 SR-54 的第一个对照组 → verified（评审方确认 `titleChanged` 确实是
     pattern 依赖信号，而 `dropped` 不是；SR-54 的反向断言成立）。IMPL-8 再开——
     `test/id-pattern.test.js` **末尾还有第二个 SR-54 对照组**（TAP-batch 失败那条测试里的
     same-store contrast），它配的 `[A-Z]+(-[A-Z]+)*-\d+[a-z]*` 与新默认式**语言等价**，
     三条断言在 config 行被忽略、回落到进程内默认时同样成立。
     按评审方给的第一条建议修：**给子进程 seam 装计数与回显**，断言两个批次都经过 config 来源的
     child，且 child 收到的是**配置的**源串而不是默认串。 -->

<!-- STEP5·r5：IMPL-8 → verified，「VERDICT: no spec-vs-code gaps」——**STEP5 收敛**。
     P8 verdict 序列 6→2→1→1→0（r1..r5）。评审方确认「放宽默认值使对照组失效」这一类已扫尽。 -->
