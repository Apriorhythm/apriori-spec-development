<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r26 transport=codex-exec-wsl-proxy -->

v26 有实质进展：`scoped` 非法状态已删除，HL-K-01 与 HL-N-84i5 已修正，D7 也增加了回退 STEP2 和二次 gate③。但四项尚未全部闭合。

- **DES-1｜高风险｜平台口径仍残留两处相反结论。**  
  RUNBOOK 前文已正确说明只有触发四条件的 bundle 不可归档，末句却仍只要求改裁“非 f2”；选 π3 或出现 `hash=` 时，即使非 f2 仍会触发安全打开。decision-summary 也仍保留“该平台 hotfix 全部不可归档”，随后才说未触发者照常归档。同一段内部矛盾。应统一为：必须避开 `f2 ∨ π2-copy ∨ π3 ∨ hash-present` 全部触发条件；仅命中者不可归档。依据：[decision-summary.md:41](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:41)、[runbook-hotfix-lane-section.md:49](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/runbook-hotfix-lane-section.md:49)。

- **DES-2｜阻断｜AC1 的检查点已修，但 D3 与 owner 摘要仍保留旧的无条件表述。**  
  D3 正确列出 `a/b/c×外源≤4` 合法，随后却仍称“仅调到 ≤4 而选仓外源”非法，未限定 `d`；非法组合列也只列“未调阈值×d×π2”，漏掉未调阈值的 `a/b/c×外源`。decision-summary 开头又把 `d×π2` 无条件写成 4 条，未区分外源实际为 5 条。HL-K-01 与 HL-N-84i5 已闭合，但三份 gate③ 决策输入仍不是同一个四格函数。依据：[design.md:113](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:113)、[decision-summary.md:41](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:41)、[cli-checkpoints.md:69](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:69)、[cli-checkpoints.md:83](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:83)。

- **DES-3｜高风险｜账本拆行改变了 r24 finding 的身份与内容。**  
  原 r24 的 DES-1 是平台指引、DES-2 是 AC1 矛盾、DES-3 才是目标目录；现账本把 DES24-1 改成目标目录、DES24-2 改成 rename，后续整体重新编号，并把原 DES-7 的“AC 缺谱＋复合 ID”缩成仅复合 ID。这不是拆分，而是覆写历史 ID，导致平台与 AC1 修复失去可核验的原 finding 行，也使“七条全部属于 π2 事务链”成为不实记录。应恢复原 ID→finding 映射；需要拆分 DES-7 时另增子 ID，不得重定义旧 ID。依据：[design-review-v24.md:5](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/review/design-review-v24.md:5)、[design-review-v24.md:8](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/review/design-review-v24.md:8)、[issues.md:249](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/review/issues.md:249)。

- **DES-4｜阻断｜重新准入方向正确，但两条 owner 分支的账本状态机尚未闭合。**  
  改裁 π1/π3 时，摘要只说七行“与本 change 无关”，没有规定这些 `open` 行如何合法终结；它们会继续阻止后续归档。仍裁 π2 时，又要求先把七行 `waived`，随后复审至“π2 相关行全部 verified”；同一行不能同时保持 waived 又成为 verified，且 D7 末句把“owner waive”写成解除实现阻塞的充分候选，削弱了前文必须完成增量和二次 gate③ 的无条件要求。应分别定义：

  - π1/π3 分支：按未选方案出域处理，并经 reviewer concurrence 转为合法终态；
  - π2 分支：首次 waiver 只处置当前包的不完整性，绝不解除重新准入阻塞；后续增量使用明确的 successor/reopened 行，全部收敛并二次批准后才能实现。

  依据：[design.md:158](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:158)、[decision-summary.md:53](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:53)、[RUNBOOK.md:290](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:290)。

除上述四项外，未发现新的分级函数、耦合表、评审两轴、签收、摘要域或 π1/π3 AC 全谱缺口。

VERDICT: 4 issues open.