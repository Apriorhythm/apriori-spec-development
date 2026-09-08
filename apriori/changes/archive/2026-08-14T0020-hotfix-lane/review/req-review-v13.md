<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r13 transport=codex-exec-wsl-proxy -->

核验结果：REQ-44、REQ-45 已闭合；REQ-46 尚未真正进入分级函数。v11 标题、哈希和账本更新顺序正常。

### Findings

**REQ-46 — Q-12=yes 分支仍未写入判定次序表**  
风险：阻断  
依据：[req-v11.md:129](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v11.md:129) 在 Q-12 中定义了 `ADDED-only ∧ 每块有 scenario ∧ 单模块 → R2`，并声称已写入次序 2；但实际次序 2 [req-v11.md:57](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v11.md:57) 与 v10 完全相同，仍只有 `blast:low` 降级分支。Q-12 还称 no 案“维持次序 1 的默认 R3”，实际默认 R3 位于次序 2。AC-D1 定义唯一分级函数为三表，因此开放问题中的旁注不能代替判定表。

**REQ-47 — Q-6 仍保留旧 clean-tree 排除集，owner 决策摘要自相矛盾**  
风险：高  
依据：正文 [req-v11.md:73](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v11.md:73) 已正确改为排除全部 `apriori/changes/**`；但 gate③ 必答的 Q-6 [req-v11.md:123](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v11.md:123) 仍写“排除集固定为本 bundle+apriori/tmp”。AC-D5 要求决策摘要呈现全部待裁项，owner 当前会看到两个互斥契约，可能按旧范围拍板，从而重新打开 REQ-45。

**REQ-48 — `R1×docs=n/a` 把正式流程的 docs trivial 一并消灭，与 state A 冲突**  
风险：阻断  
依据：[req-v11.md:90](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v11.md:90) 将 R1×docs 判为不可达；正式流程又在 [req-v11.md:97](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v11.md:97) 声称 trivial 复用 hotfix 对应行。因此单文件、小范围 docs-only 修复也只能成为带 delta 的 R2，再受 Q-5 约束必须走 medium。state A 的 Trivial 定义允许单文件修复（[RUNBOOK.md:93](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:93)），docs-only 只是把测试 oracle 换成 `check + P8`，并未禁止 trivial（[RUNBOOK.md:251](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:251)）。这是未列入 owner 决策面的正式流程收紧，也使“docs≈现状”和“同一张表无套利”不能同时成立。

VERDICT: 3 issues open