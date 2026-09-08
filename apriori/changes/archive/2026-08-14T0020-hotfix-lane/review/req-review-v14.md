<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r14 transport=codex-exec-wsl-proxy -->

核验结果：REQ-46、REQ-47 已闭合；REQ-48 原先“docs trivial 不可达”的问题已消除，但新增的 2a 分支引入四个问题。v12 确为新字节；lineage 实测仍真实；未发现新的 prior-art 误用或越过 design-first 停点。

### Findings

**REQ-49 — `R1-doc` 用“单模块”替代 trivial 判据，形成系统性 fail-down**  
风险：阻断  
依据：[req-v12.md:57](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v12.md:57) 明知 docs 面“无机械区分”，却把所有未命中次序 1 的单模块 MODIFIED/ADDED 直接降为 R1-doc。无法区分高低风险时应 fail-up，而不是反向放行。owner goal 明确把改契约、数据形态、选取口径列为高爆炸半径，只把文案、配置、单出口展示列为 trivial（[goal-verbatim.md:54](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/goal-verbatim.md:54)）；state A 还要求 Trivial 同时满足单文件、无新用户行为、无 shared-state change，而单模块新增行为属于 Medium（[RUNBOOK.md:93](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:93)）。一个模块可以跨多文件，ADDED 也可以增加规范性行为；当前 2a 会把这些全部判成 trivial，与自身“申报一致性 fail-up”声明冲突。

**REQ-50 — `waive → 正式流程` 的指路不能恢复 state A 的 P8**  
风险：阻断  
依据：Q-11 两轴被明确定义为 hotfix 通道的评审选择（[req-v12.md:28](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v12.md:28)）；doc-fix 在 waive 下拒绝 hotfix 并指路正式流程（[req-v12.md:50](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v12.md:50)），但正式 R0/R1 trivial 又规定复用 hotfix 对应行（[req-v12.md:98](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v12.md:98)）。因此正式 R1-doc 要么继续按 Q-11 waive P8，使“指路”没有恢复任何语义防线；要么 Q-11 不适用于正式流程，但正文没有给出该分支的独立 oracle。两种解释分别冲突于 state A 的 docs `check + P8`（[RUNBOOK.md:251](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:251)）或造成未定义组合。同一复用还可能让 `code-review-scope=none` 删除正式 Trivial 必有的一次 consistency review（[RUNBOOK.md:93](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:93)），且这项正式流程弱化没有进入 owner 决策面。

**REQ-51 — 新可达的 R1-doc 评审格有两个互斥投影**  
风险：高  
依据：[req-v12.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v12.md:31) 一方面规定 `R1×docs + retain` 的单轮评审必须合并承担“点检 + P8”，产生双 verdict；另一方面又规定 `code-review-scope=R2` 时 R1 不点检，docs retain 只保留 P8。于是 `R1-doc × docs × scope=R2 × retain` 同时得到“双职责”和“仅 P8”两个结果。该段还继续描述现已不可达的 `R2×docs` 双职责，而耦合表已将其设为 n/a（[req-v12.md:92](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v12.md:92)）。AC-D3 所称唯一投影目前不成立。

**REQ-52 — `R1-doc` 未纳入分级值域，正文与验收仍执行旧的“R1=零 delta”契约**  
风险：阻断  
依据：判定表新增结果字面量 `R1-doc`（[req-v12.md:57](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v12.md:57)），但紧接着仍定义“R1 = 零 delta”“任何 delta 走次序 2”（[req-v12.md:63](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v12.md:63)）；Q-1 又全称声明“delta 非零一律 R3”（[req-v12.md:64](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v12.md:64)）。AC-D1 仍要求默认所有 ADDED→R3，AC-D3 的正式值域也只有 `{R0..R3}`（[req-v12.md:109](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v12.md:109)）。当前无法机械确定 `R1-doc` 是新的第五种输出、R1 子型，还是只用于耦合表的标签；同一个 doc-fix ADDED fixture也会同时得到 R1-doc 与“默认 ADDED→R3”两个验收预期。

VERDICT: 4 issues open