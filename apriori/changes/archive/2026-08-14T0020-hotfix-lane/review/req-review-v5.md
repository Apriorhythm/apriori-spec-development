<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r5 transport=codex-exec-wsl-proxy -->

核验结果：REQ-24/25 已闭合；REQ-19/23/26/28/29 仍未完全闭合。REQ-27 原问题的“无边界授权未披露”已闭合，但其补偿机制产生 2 条新问题。

**REQ-19（reopened）— 风险：阻断（选填定位头 fallback 未进入判定函数）。**  
依据：[字段契约](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v5.md:42) 说若 owner 裁 prior-art 选填案，`touched-modules+fix-ref` 可成对缺失，fallback 为 R3；但 [判定次序](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v5.md:52) 没有“code-* 且定位头全缺 → R3”条件。合法的零 delta `code-behavior` 会直接命中次序 3 成为 R2；`code-trivial` 则因无法满足 `touched-modules=1` 而没有任何结果。必须把 fallback 显式放入次序 1，并参数化必填/选填两案的 AC。

**REQ-23（reopened）— 风险：阻断（f1 仍没有可执行的新鲜度 oracle）。**  
依据：[req-v5.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v5.md:69) 只说工件基线行与“fix-ref/当前 HEAD”比较，未定义：

- 工件基线应等于 fix-ref、HEAD，还是两者；
- fix-ref 早于 HEAD 时允许何种祖先关系；
- dirty worktree、staged/untracked 代码如何进入基线；
- 测试运行时基线与 preflight 时 HEAD 不同如何处理；
- 仅由测试输出自报一个 hash，如何证明实际执行字节就是该 hash；
- 外仓 `unverifiable` 是拒绝、降级还是仍可通过机械退出条件。

尤其 commit hash 无法代表未提交工作树。应定义精确比较算法与错误谱，至少要求 clean tree 或使用运行时代码 tree hash；外仓不可验证若仍放行，应像其他弱候选一样要求 owner 明示接受保证弱化。

**REQ-26（reopened）— 风险：高（两评审轴仍不能给逐格唯一结果）。**  
依据：正文宣称两轴对每个 radius×profile 产生唯一要求，[req-v5.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v5.md:31)，但耦合表不一致：

- R0×docs 写“结论即全部”，而 `docs-P8=retain` 按定义适用于 docs profile 的 hotfix；
- R1×docs 显式引用 Q-11，R2×docs 却未写评审要求；
- R2×docs 在 `code-review-scope=R2` 且 `docs-P8=retain` 时，是跑一次兼具两种职责的 P8，还是“R2 点检 + P8”两轮，未定义；
- “单轮异构点检”的 prompt、verdict 和机械验收行也未定义。

应给出 code-review-scope×docs-P8 的六格矩阵及去重规则，再投影到 R0/R1/R2×profile 表。

**REQ-28（reopened）— 风险：阻断（backend-touched 未纳入字段契约，fallback 仍非机械闭包）。**  
依据：[判定次序 1](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v5.md:54) 新增 `backend-touched`，却没有在字段契约表中定义其 requiredness、合法值、缺失/未知/不该出现时的 F1 语义，跨字段表也没有相关不变量。Q-2c 只让 owner 选择“是否引入类型表”，没有让 owner 在无类型表后继续裁 28-a/28-b/28-c；正文却仅称 28-a“倾向”。因此“无类型表”仍对应多个未裁结果。须把字段完整加入契约，并把 fallback 选择纳入 Q-2c 或明确 28-a 是唯一合法 fallback。

**REQ-29（reopened）— 风险：高（决策摘要与 AC 再次落后于正文）。**  
依据：

- [Q-6b](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v5.md:118) 仍写“时间戳底线强制”，但正文已经改为 f1/f2/f3，且 f3 仅属明示弱化；
- [Q-11](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v5.md:123) 仍使用已废弃的 E0/E1/E2/E3，而正文已改为 `code-review-scope × docs-P8`；
- [AC-D3](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v5.md:105) 仍只称覆盖面/准入/证据类型“三正交”，没有把新增评审两轴纳入唯一预期；
- [AC-I](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v5.md:109) 未覆盖 backend-touched 错误谱、定位头选填 fallback、f1/f2 基线失配、blast marker 自授/删除以及评审六格。

这些会让 gate③ 决策摘要向 owner 展示已经废弃的选项，并使设计包缺少新增机制的验收 oracle。

**REQ-30（new）— 风险：高（对 modified-integrity 的能力声明不真实）。**  
依据：[req-v5.md](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v5.md:61) 称既有 modified-block-integrity 会让“整块差异对呈阅者可见”。实读 [lib/archive-merge.js](/root/apriori-spec-development/lib/archive-merge.js:509)：它分类 retained/titleChanged/dropped/added/ambiguous，并只逐行输出旧内容的 `missingLines`；human formatter 甚至在只有新增内容、没有丢失时完全不输出，[lib/archive-merge.js](/root/apriori-spec-development/lib/archive-merge.js:567)。对应 spec 也明确是 structural fidelity/lost-line 报告，而非 full diff，[archive-merge spec](/root/apriori-spec-development/apriori/specs/archive-merge/spec.md:210)。因此它看不见多数新增或改写语义，不能作为 `blast: low` 越界替换的审查补偿。应依赖 d 的完整 dry-run diff，或新增明确的完整 old/new 呈阅契约，不能声称现状已有。

**REQ-31（new）— 风险：阻断（γ′ 的风险承接依赖未强绑的人工审查）。**  
依据：[γ′](/root/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v5.md:61) 承认已标块的新内容仍可越过展示类边界，称由“呈阅人审”承接；但 Q-8 仍允许签收 a/b/c，它们没有完整内容呈阅，且 Q-11 又允许 `code-review-scope=none`。因此合法待裁组合 `γ′ + a/b/c + none` 会让永久低风险授权下的任意整块替换既无语义机械检查，也无人查看差异，却仍进 hotfix。γ′ 至少应强绑 `d` 或 `code-review-scope≥R2`；否则必须把该组合列为仅在 owner 明示放弃语义边界保证后才合法。

VERDICT: 7 issues open