# issue ledger — archive-preflight

轮次标签：`STEP0·rN`（P1）/ `STEP2·rN`（P5）/ `STEP5·rN`（P8）。
状态词汇：`open` / `fixed` / `verified` / `rejected` / `rejected-verified` / `waived` / `advisory-acked`。
生产方只能 `open → fixed | rejected`；`verified` / `rejected-verified` 属评审方，`waived` 属人类。
重开（reopen）是**事件**不是状态：复现的问题回到原 ID 的 `open`，绝不新开一行。

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | AC-AP-15 的充分性承诺不成立：R1/R2/R3 未覆盖 gate 完整 C2/C3/C4 判据 | high | 1 | fixed (final) |
| REQ-2 | tasks/ledger 缺失及 readiness 文件的 unsafe/unreadable 路径语义未定义 | high | 1 | verified |
| REQ-3 | `--force` 的证据协议和可豁免范围不明确，并可能 force 掉 ABANDONED 硬禁令 | high | 1 | fixed (final) |
| REQ-4 | 允许 STEP5 归档与 RUNBOOK 的 STEP5→STEP6 状态机及实际 precedent 冲突 | high | 1 | verified |
| REQ-5 | 共享分类器归位、完整共享 API 和 readiness 相对既有 preflight guards 的顺序未定 | med | 1 | verified |
| REQ-6 | readiness 检查到 commit/move 之间的并发修改与 TOCTOU 未覆盖 | high | 1 | verified |
| REQ-7 | B5 与现有 AM-13/AM-46/AM-47 测试及 living spec 冲突，迁移范围未声明 | med | 1 | verified |

| REQ-8 | 共享安全读取 checker 会改变 gate C2/C4 的现有行为，但该 side effect 未声明、未验收 | med | 2 | verified |

| REQ-9 | advisory batch acknowledged (1 item) | low | 3 | advisory-acked |
| SPEC-1 | 单文件 `--changes-dir` 的实际 move bundle 未与 delta attribution/readiness 绑定，可移动未就绪或不同 root 的正式 bundle；N0 也未钉死 `:860` | high | STEP2·r1 | verified |
| SPEC-2 | 六行 attribution 表未覆盖 realpath 指向 archived bundle或同名不同 stage 的路径，可经 symlink alias 重用 archived delta | high | STEP2·r1 | fixed (r4) |
| SPEC-3 | `checkArchiveLedger` 设计未要求先执行 `reviewDirDefect`，内部 review-root symlink 可令 archive 与 gate C4 分歧 | med | STEP2·r1 | verified |
| SPEC-4 | AM-19 与 AC-AP-13f 的旧「行为不变」措辞和新增单文件归属场景冲突，会生成相反验收 | med | STEP2·r1 | verified |
| ADV-STEP2-r1 | advisory batch acknowledged (3 items) | low | STEP2·r1 | advisory-acked |
| ADV-STEP2-r2 | advisory batch acknowledged (3 items) | low | STEP2·r2 | advisory-acked |
| ADV-STEP2-r3 | advisory batch acknowledged (0 items) | low | STEP2·r3 | advisory-acked |
| ADV-STEP2-r4 | advisory batch acknowledged (0 items) | low | STEP2·r4 | advisory-acked |

<!-- 以上 7 行为 STEP0·r1 评审方（codex gpt-5.6-sol, session 019fff33）的 ledger delta，逐字落盘。 -->

<!-- STEP0·r2：REQ-2 / REQ-4 → verified；REQ-1/3/5/6/7 reopened，另新开 REQ-8。六条全部 accept：
       REQ-1 → resolveChange 取同名归档里字典序最后者，已存在排序更后的同名归档时 gate 会去查**另一个**
         bundle（无 force、无并发的真反例）。就绪度增加「同名归档排序不得 ≥ 本次目录名」一项，不可 force。
       REQ-3 → ① 单文件形式带 --changes-dir **会移动正式 bundle**，v2 的「完全不受影响」给 ABANDONED 留了后门；
         ② v2 的豁免矩阵自相矛盾（无理由 rejected 一处可 force 一处不可）；③ 失败类标识允许子串误配、
         NOTE 行无条件说 C2/C4 都 BLOCK。三点全改。
       REQ-5 → C3 一个函数满足不了 gate（全词汇）与 archive（仅 STEP6），拆成 checkFlowState +
         checkArchiveFlowState。
       REQ-6 → 前置区间终点按四条合法路径分别定义。
       REQ-7 → 迁移清单加穷举清点任务。
       REQ-8 → 共享安全读取会改变 gate 的 C2/C4；改为**组合而非替换**（基础层 = gate 今天那一份、
         行为逐字节不变；安全读取只叠加在 archive 侧）。
     另有一处生产方自查更正：v2 计划搬迁 containsReal，本轮实测两份实现只在 target===root 一格分歧，
     而 reviewDirDefect 的 target 恒为 <dir>/review，**调用形态下行为一致，不必搬迁**（O8 改写、K5 取消）。 -->

<!-- STEP0·r3：REQ-5 / REQ-6 / REQ-7 → verified（共享模块结构、前置区间四路径、迁移穷举清点都过关）；
     REQ-1 / REQ-3 / REQ-8 第二次 reopened，三条都成立：
       REQ-1 → 排序检查方向对了，但前提没被机械保证：时间戳没绑定（phase 4 自己 new Date）、no-move 路径
         未定义是否求值、resolver 的结构性拒绝（archive root symlink / 同名 symlink / 非法 stamp 目录）
         未覆盖、同名 namespace 的并发未纳入前置条件。→ 归纳为 N0..N3 四项检查 + 命名空间级前置条件。
       REQ-3 → `--changes-dir` 不是「是否消费正式 bundle」的充分判据：不带它也能用 bundle 内的 delta 写 store。
         → 改按 --delta 实路径三分。
       REQ-8 → AC-AP-16d 要求抛错分支「诊断逐字节一致」是**不可能满足**的（搬文件必然改 stack 的文件名行号）。
         → 拆成不抛错/抛错两条，并补 wrapper 的确切命名与「安全 guard 先于任何读取」的顺序铁律。
     另：评审方确认不搬迁 containsReal 的论证成立。 -->

<!-- STEP0·r4：REQ-8 → verified；REQ-1 / REQ-3 第三次 reopened，两条都成立：
       REQ-1 → ① **待移动的 active 条目自己可以是 symlink**（containment 放行、move 后变成 archived symlink、
         resolver 随即判结构错误）；② 前置条件漏了两个 trust root 本身；③ **「用 resolver 自己的判据」与
         「resolve.js 不动」不可兼得**——rootDefect 是私有的。→ N2 扩到三类对象，resolve.js 导出
         archiveNamespaceDefect 并进入触及范围。
       REQ-3 → ① AC-AP-13 与 13d 自相矛盾；② §9.2 还留着旧 discriminator；③ **只按 realpath 三分不够**
         （词法在 bundle 内、realpath 被 symlink 带出界时两条规则同时成立）→ 改两步归属；
         ④ 已归档 bundle 的显式 delta 路径无分类 → 一律拒绝。
     verdict 序列：7→6→3→2。 -->

<!-- STEP0·r5（cap 轮）：REQ-1 / REQ-3 第四次 reopened，两条仍成立：
       REQ-1 → ① 自定义 --changes-dir 上归档时，gate 只查规范 root，B2 的机械保证不成立；
               ② 综合 namespace predicate 若在 resolver 的 active-first 快路径之前求值，
                  会改变「合法 active + 同名归档 symlink」这类项目今天的解析结果。
       REQ-3 → 两步归属漏了反方向：词法在 changes root 之外、realpath 指向正式 bundle delta 的
               外部 symlink 会被当外科手术输入放行，ABANDONED 硬禁令再次被绕过。
     两条 accept 并落 req-final。
     **STEP0 在 cap 上退出（未收敛，verdict 序列 7→6→3→2→2）→ gate①**；
     gate① 非受保护关卡，已被 kickoff 的关卡合并授权覆盖，故不停、并入 gate④。
     req-final 承载的这三条修复**未经独立评审**——已在 req-final 抬头与 §9.3 显著标注，
     由 STEP2 的 P5 循环（读的就是 req-final，cap=4）作为复核机会。 -->

<!-- STEP2·r1：SPEC-1..4 open + 3 条 advisory。四条全部 accept：
       SPEC-1（high）→ 单文件 `:860` 的 move 目标 `<changes-dir>/<change>` 与 delta 归属**互不相干**，
         v1 的设计只按 delta 归属决定就绪度，于是「真外科手术 delta + --changes-dir」照样能搬走一个
         ABANDONED bundle。改为把 moveBundle 立成**独立判定对象**（完整就绪度 + N 组），
         并要求 delta 若归属正式 bundle 必须与它同目录；N0 的捕获值同时喂两条 move 路径。
       SPEC-2（high）→ 归属身份不能只记 change name：同名可存在于不同 root、以及 active/archived 两个
         stage。改为 `{root, stage, name, bundleDir}`，任一侧落在 archived 即拒绝。
       SPEC-3（med）→ `review/` 若是指向 bundle **内部**另一目录的 symlink，叶子完全正常，
         只守叶子会让 archive 放行而 gate C4 阻断——正好打破核心保证。checkArchiveLedger 增加第 0 步。
       SPEC-4（med）→ 原样保留的 AM-19 仍写「single-file 行为不变」，与新增场景正面冲突，已收窄。
     advisory 三条也已实施（seam API 定名、composite predicate 措辞更正、--force 的 usage 可发现性）。 -->

<!-- STEP2·r2：SPEC-1 / SPEC-3 / SPEC-4 → verified；SPEC-2 reopened，两点又都成立：
       ① 我的正文写「两个 measure 必须一致」，而 AM-60 又要求外部 symlink 归属到 realpath 那个
          active bundle——**自相矛盾**；
       ② `--changes-dir` 可以**嵌套在默认 root 的某个 bundle 的 specs/ 之下**，于是同一个 delta 同时
          是 `A` 的 delta 和 `X` 的 delta；歧义发生在**单个 measure 内部**，两两比对抓不到。
     改为**集合算法**：两种 measure × 全部候选 root → 身份集合，五种结果（空 / 含 archived / 恰一个
     active / 多于一个 active / 词法在内 realpath 出界）。新增 AM-69 与 T24c。
     advisory 三条也已实施——其中 **A-3 明确不建议拆 change**（各部分共同维护同一条 archive-safety
     不变量，硬拆会产生无法安全落地的中间状态），改为六个可回滚实现批次，已写进 design §D6b 与 tasks 抬头。 -->

<!-- STEP2·r3：SPEC-2 第三次 reopened，两点又都成立：
       ① 集合的五个结果**不互斥**——「词法命中 bundle 而 realpath 出界」与「恰好一个 active bundleDir」
          可以同时成立，按表顺序实现会先进后者，于是 realpath 已跑到 bundle 外的 delta 被当成干净输入。
          改为**有序互斥阶梯**（1 安全规则 → 2 archived → 3 数 active bundleDir）。
       ② 显式 root 恰好**等于**默认 root 时的规范化/去重未定义——相对写法、结尾分隔符、经 symlink 的
          等价路径可能被判成两个身份，让最常见的调用自判歧义。改为「先解析绝对实路径再去重，
          bundleDir 一律按解析后的绝对路径比较」，新增 AM-70 / T24d，并加 T24e 钉死阶梯优先级。 -->

<!-- STEP2·r4（cap 轮）：阶梯本身获确认「优先级明确、覆盖全部集合基数、每个输入只产生一个结果」；
     SPEC-2 第四次 reopened，理由是 root 规范化的一处 **fail-open**：lexical measure 刻意不解 symlink，
     若候选 root 去重后只留实路径，则「changes root 本身是 symlink + 调用方用词法拼写」的 delta
     词法匹配不上，落到「谁都不属于」被当外科手术输入放行，而它的 leaf realpath 已经出界。
     accept：每个 root **两种形态都留**（实路径用于身份相等与去重，全部词法拼写供 lexical measure 匹配）。
     **STEP2 在 step2-cap=4 上退出**，verdict 序列 4→1→1→1，未收敛 → gate⑤（非受保护关卡，已被关卡合并覆盖）。 -->
