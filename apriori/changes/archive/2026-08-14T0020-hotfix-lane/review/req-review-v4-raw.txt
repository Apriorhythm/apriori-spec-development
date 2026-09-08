<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r4 transport=codex-exec-wsl-proxy -->

核验结果：上一轮 REQ-1/5/14/18/19/20/21/22 的针对性修复基本成立；REQ-23 仍未闭合。另发现 6 条新问题。

**REQ-23（reopened）— 风险：高（时间戳底线仍未把证据绑定到当前代码）。**  
依据：[req-v4.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v4.md:66) 的底线只要求工件 mtime 晚于“bundle 最后业务修改”。代码修复通常先于 bundle，且证据生成后代码还可继续变化而 bundle 不变；此时旧证据仍满足时间条件。mtime 还可被复制、touch 或时钟偏差影响。因此它只能证明“文件较新”，不能兑现文中所称“证据绑定当前代码”。底线至少还须绑定 `fix-ref` 所指代码快照/commit 或代码树摘要；d1 则应同时摘要代码基线与工件，而非只摘要工件。

**REQ-24（new）— 风险：阻断（R0×ui/fullstack 字段契约与耦合表不可同时满足）。**  
依据：

- [字段契约](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v4.md:41) 要求 ui/fullstack profile 下 `frontend-touched` 必填；
- `no-code + frontend-touched: yes` 又是 F1，因此 R0 只能填写 `no`；
- [R0 的 ui/fullstack 格](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v4.md:81) 却要求该字段“不出现”。

所以缺失会 F1，出现 `yes` 会 F1，唯一合法的 `no` 又违反决策表。应将 requiredness 改为仅 code-* 必填，或明确 R0 必填 `no`，并同步耦合表与 AC。

**REQ-25（new）— 风险：高（混合 bundle 的跨模块总爆炸半径仍漏算）。**  
依据：[判定次序 1](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v4.md:51) 分别检查 `touched-modules ≥2` 和 decisions 自身跨模块，却未检查二者模块集合的并集。于是“代码触及模块 A + 单模块 Decision 写模块 B”会以单代码模块、单 Decision 模块通过 R1/R2，尽管整个 bundle 实际跨两个模块。prior art 虽规定 Decision 目标与代码触及正交，但那是定位头一致性语义，不等于爆炸半径不计 truth 写面。应以 `union(touched modules, delta modules, decision target modules)` 判断跨模块半径，并给混合 bundle 正反例。

**REQ-26（new）— 风险：高（Q-11 评审强度候选重叠且不是可执行决策表）。**  
依据：[req-v4.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v4.md:28) 中：

- E1 = 所有 R2 点检；
- E2 = 所有含 delta 的 R2 + code-behavior 点检。

但当前获准进入 hotfix 的 R2 恰好只有“白名单 delta”与 `code-behavior`，因此 E1 与 E2集合完全相同。E3 又不是与 E0/E1/E2 同层互斥的选项，而是可叠加的 docs profile override；“E0+E3”是否允许也没有正式表达。应拆为两个正交轴，例如 `code review scope ∈ {none,R2,all-code}` × `docs P8 ∈ {retain,waive}`，列合法组合、成本及每个 radius/profile 的唯一结果。

**REQ-27（new）— 风险：阻断（永久块级 `blast: low` 是无边界的未来降级授权）。**  
依据：[γ′](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v4.md:58) 只检查旧 store requirement 块是否带低风险标注，命中后整个 MODIFIED replacement 即降为 R2；没有约束这次 replacement 仍然只是文案/展示修改。一个最初确属展示类的块可借该标注在 hotfix 中被改成数据口径、跨路径规则或其他高风险契约，机器仍会放行——恰好重新打开 owner 点名的核心反例。需求必须明确该标注意味着“人类预授权未来任意整块替换”并让 owner 单独确认，或给授权增加可机械约束、有效期/撤销、marker 保留及禁止借本次 delta 自授/扩权的规则。仅规定“标注变更走正式 change”不能限制已标块的新内容。

**REQ-28（new）— 风险：高（不引入模块类型表会让双端高风险信号失效）。**  
依据：[判定次序 1](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v4.md:51) 仅在 Q-2c 裁定模块类型表时，才能由 `frontend-touched: yes + 后端模块` 判 R3；若 owner 不引入类型表，需求没有替代的 `backend-touched`/`cross-end` 申报信号。这样单个 fullstack 模块内同时改前后端，或前端申报 yes 而模块类型不可知，都不会触发 R3，与 owner 明列的“双端漏改”缺陷账依据冲突。Q-2c 的“无类型表”分支必须提供保守 fallback，或标明仅在 owner 显式放弃双端机械硬准入后合法。

**REQ-29（new）— 风险：高（验收标准仍残留 v3 语义，无法作为 gate③ oracle）。**  
依据：

- [AC-D1](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v4.md:100) 仍要求“R2-ADDED 论证”，但正文默认 ADDED=R3，R2 仅是 Q-12 待裁例外；
- [AC-D5](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v4.md:104) 只列 Q-1..Q-11，漏掉新增 Q-12；
- [AC-D6](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v4.md:105) 仍称有 4 处 prior-art 取代，正文第 27 行已缩为 3 处；
- 第 32 行仍引用已不存在的“A2-④”，第 51 行仍保留旧 α/γ blast 候选名；
- 背景把截图规则定位为 RUNBOOK “STEP4 节”，真实位置是 STEP5/P7。

这些不是纯编辑瑕疵：AC-D1/D5/D6 会让设计包面对两个不同验收基线。须同步到参数化结果：Q-12 未裁时默认验证 ADDED→R3；若裁例外再启用 ADDED→R2 的条件 AC。

VERDICT: 7 issues open