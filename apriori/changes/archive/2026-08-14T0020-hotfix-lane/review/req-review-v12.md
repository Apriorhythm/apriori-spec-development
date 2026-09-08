<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r12 transport=codex-exec-wsl-proxy -->

核验结果：REQ-37、REQ-40、REQ-41、REQ-42、REQ-43 均已闭合。v10 标题、哈希、二次事故注记、账本与 flow-state 顺序纪律一致。

### Findings

**REQ-44 — `doc-fix` 与通用 fix-ref 配对契约冲突**  
风险：阻断  
依据：[req-v10.md:43](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v10.md:43) 规定 `fix-ref` 必须与 `touched-modules` 成对；[req-v10.md:50](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v10.md:50) 又规定 `doc-fix` 必须有 `fix-ref`，却没有定义 `touched-modules` 对 `doc-fix` 是必填、禁止还是例外。若配对规则全局生效，缺 `touched-modules` 的每个 doc-fix 都是半缺 F1；若允许出现，则该字段原有“代码修复触及模块”语义不适用于 docs-only，且 requiredness、模块语义均未定义。当前不存在唯一合法的 doc-fix 定位头形状。

**REQ-45 — clean-tree 规则破坏并行 change 的独立性**  
风险：阻断  
依据：[req-v10.md:73](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v10.md:73) 只排除“本 bundle”和 `apriori/tmp/**`；任何 sibling change 的在途文档若 dirty/staged/untracked，都会令 hotfix 归档失败。可是最高优先 goal 明确要求本 change 与其他 change 并行且 gate/verify 各自独立（[goal-verbatim.md:16](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/goal-verbatim.md:16)），state A 也明确承诺 parallel changes 可独立 GREEN（[RUNBOOK.md:250](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:250)）。t1 会拒绝所有 sibling dirty；t2 仍会拒绝 sibling 的 tracked 修改，故两案都未闭合。

**REQ-46 — Q-12 的肯定裁定没有机械分级分支**  
风险：阻断  
依据：[req-v10.md:129](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v10.md:129) 允许 owner 裁定 ADDED-only 降 R2，但分级次序 2 [req-v10.md:57](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v10.md:57) 唯一的 R2 降级条件仍是“store 侧既有 requirement 带 `blast:low`”。ADDED 块没有既有 store 块，天然无法命中该条件。AC-D1 只说肯定裁定后“启用 ADDED→R2 条件”，却没有定义该条件是所有单模块且有 scenario 的 ADDED，还是另需白名单、评审或其他信号。Q-12=yes 时分级函数仍不可实现。

VERDICT: 3 issues open