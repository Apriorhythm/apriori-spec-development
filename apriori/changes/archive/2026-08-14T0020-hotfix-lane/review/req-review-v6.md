<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r6 transport=codex-exec-wsl-proxy -->

核验结果：REQ-19/29/30 已闭合；REQ-23/26/28/31 仍未完全闭合。另发现 1 条新问题。

**REQ-23（reopened）— 风险：高（截图证据仍未绑定代码基线）。**  
依据：[f1](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v6.md:72) 只要求 E2E 输出/测试运行头携带基线行，没有覆盖 ui hotfix 必需的截图。截图仍只需路径存在和观察记录，因此可以复用旧图片；即使测试工件基线等于 HEAD，也不能证明截图来自同一次运行或同一代码。f2 的“工件哈希”也未明确包含截图文件。应要求截图观察记录携同一代码基线和运行 ID，或由带基线的 E2E manifest 枚举并哈希截图；补旧截图、混合运行 ID、截图运行早于 HEAD 的拒绝 AC。

**REQ-26（reopened）— 风险：高（R0 并非总是“无评审对象”）。**  
依据：[投影规则](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v6.md:31) 以“R0 无代码无 delta，因此无 artifact”为由令所有 R0 评审 n/a；但 R0 的主用例允许向 truth 写入最多 N 条 Decisions，[判定函数](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v6.md:60)。这既有 bundle 结论，也有将被写入的 doc-is-truth artifact，甚至可能新增业务 invariant。尤其 R0×docs、`docs-P8=retain` 时，强制 n/a 与 retain 的定义冲突。应至少区分 `R0 conclusion-only` 与 `R0 with decisions`，并规定后者在 docs retain 或适用审查轴下如何评审。

**REQ-28（reopened）— 风险：阻断（双端硬准入仍错误地依赖 verification-profile）。**  
依据：`frontend-touched` 和 `backend-touched` 仅在 ui/fullstack profile 下存在，[字段表](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v6.md:44)。因此 profile 未声明或声明 backend 时，两个字段必须不出现；[双端判定](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v6.md:56) 永远无法命中。爆炸半径与验证 profile 应是正交维度：未声明 profile 的跨端修复恰恰仍需硬拒绝。前后端触及信号的 requiredness 应由代码模块类型/申报模式决定，而非 verification-profile；无类型表时所有 code-* 都应提供足够的对称信号，或保守升 R3。

**REQ-31（reopened）— 风险：高（`scope≥R2` 没有定义白名单越界审查职责）。**  
依据：[γ′合法性条件](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v6.md:63) 允许以 `code-review-scope≥R2` 替代 d 的完整呈阅，但“R2 单轮异构点检”仅规定存在 verdict+raw，未要求评审者查看完整 old/new 或判断新内容是否仍属于 `blast: low` 授权边界。这样 `γ′ + a/b/c + scope=R2` 虽被列为合法，仍可能没有任何机制执行所依赖的语义检查。须把“完整 old/new 输入 + 低风险授权边界结论”写入该评审的强制职责、verdict 和 AC；否则 γ′只能强绑 d。

**REQ-32（new）— 风险：阻断（无 scenario 的 delta 可伪造测试覆盖）。**  
依据：[scoped verify](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v6.md:76) 的 scope 是“delta scenarios ∪ affected-scenario-ids”。但现行 delta 合法包含没有任何 scenario 的 requirement 块；prior art 为此明确以 requirement 块标题作为声明目标，[req-v13.md](/root/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:49)。v6 删除了这个 fallback。若 γ′ 降级一个无 scenario 的 MODIFIED 块，或 Q-12 允许无 scenario 的 ADDED 块，作者只需填写任意既有 GREEN scenario ID，即可满足非空字段和 scoped verify，却没有证据覆盖新增/修改的规范性正文。应恢复“无 scenario 块以 requirement ID 为目标”的绑定契约，并定义其可执行 oracle；若没有可执行测试目标，则该 delta 不得降入 R2。

VERDICT: 5 issues open