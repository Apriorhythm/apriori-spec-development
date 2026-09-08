<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=ruling-D-sync-2 transport=codex-exec-wsl-proxy -->

结论：裁定 D 本身不弱化 state A；backend-only 的 n/a 限定、HL-V-07、HL-X-02b 与 HL-X-09 已闭合。但范围收窄尚未贯穿全部权威文本与实施投影。

- **DES-1｜阻断｜范围收窄尚无完整的 owner/goal lineage。**  
  `goal-verbatim` 明定 E2E/视觉验证升格为对应 tier 的机械退出条件；gate③ 裁定也只说全量档“保留强制”，没有记录“本 change 仅写 RUNBOOK、机械化延期”的后续裁定。design/flow-state 中生产方单方面记为“定案”和“向 owner 明示”，不能证明 owner 已批准拆分最高优先目标；也没有实际 successor change 承接。需由 owner 明示确认范围拆分，并在 gate3-ruling 中留痕，或恢复本 change 的正式流程机械面。[goal-verbatim.md:61](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/goal-verbatim.md:61)、[gate3-ruling.md:52](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/gate3-ruling.md:52)、[design.md:64](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:64)

- **DES-2｜高风险｜待合入 RUNBOOK 的文字仍把未实现能力写成“机械退出条件”。**  
  范围声明说正式流程机械化留后续 change；但 decision-summary 及 RUNBOOK EN/CN 随后仍断言 medium/large 的 E2E、截图是机械退出条件。T10.1 会把该文本合入现行 RUNBOOK，届时用户看到的是已经存在机械阻断，实际 gate 又明确无新检查项。应改成“本 change 起为流程要求；机械退出条件待 successor change 生效”，并明确生效标志。[decision-summary.md:21](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:21)、[runbook-hotfix-lane-section.md:26](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design-drafts/runbook-hotfix-lane-section.md:26)、[runbook-hotfix-lane-section.md:30](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design-drafts/runbook-hotfix-lane-section.md:30)、[tasks.md:67](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/tasks.md:67)

- **DES-3｜高风险｜tasks/AC 仍把正式全量档强制项列入本 change 的实现基线。**  
  T6.1b、T6.3 要实现全量档截图及 n/a 强制，T6.5 又纳入 HL-E-03a、HL-E-10、HL-E-11a；这些只能由正式流程消费，却与 T6.4“正式机械强制不在本 change 范围”及 HL-X-09 冲突。应把这些检查点明确移至 future/successor AC，当前 T6 只保留 hotfix advisory、提供即校验和正式流程不变回归。[tasks.md:37](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/tasks.md:37)、[cli-checkpoints.md:35](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design-drafts/cli-checkpoints.md:35)、[cli-checkpoints.md:53](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design-drafts/cli-checkpoints.md:53)

- **DES-4｜高风险｜“机械判结论者恒强制”的量词仍使 hotfix E2E 同时必需与 n/a。**  
  design、summary 与 RUNBOOK 均把 `verify GREEN / E2E PASS` 写成各档恒须存在/PASS；但表 A 和 T6.4 明定增量 hotfix 的 E2E 为 n/a。应改为：“该 tier/profile 要求的机械判结论必须存在且 PASS；hotfix 的测试证明强制，E2E 不适用；正式全量 E2E 的机械消费留后续 change。”[design.md:63](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:63)、[design.md:74](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:74)、[runbook-hotfix-lane-section.md:28](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design-drafts/runbook-hotfix-lane-section.md:28)

VERDICT: 4 issues open.