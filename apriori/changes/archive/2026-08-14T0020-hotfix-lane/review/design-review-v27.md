<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r27 transport=codex-exec-wsl-proxy -->

v27 已闭合平台四触发条件，原 r24 ID 映射也已在账本恢复。但终审仍有三处包级问题。

- **DES-1｜高风险｜owner 摘要仍使用覆写前的错误身份口径。**  
  摘要称 `DES24-1..7` 全是 π2 复制链且全部 open；实际账本中 DES24-1/2 分别是平台与 AC1 问题，状态为 fixed，只有 DES24-3..7 属 π2 链。flow-state 的 r24 注记也仍断言“七条全部落在 π2 复制事务链”。这会直接误导 gate③ 的处置范围，应同步更正为仅 DES24-3..7 进入 π 分支。依据：[decision-summary.md:55](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:55)、[issues.md:249](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/review/issues.md:249)、[flow-state.md:91](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/flow-state.md:91)。

- **DES-2｜高风险｜D3 四格正文已统一，但“非法”列仍不完整。**  
  同行正文正确列出 `a/b/c×外源` 未调至 ≤4、`d×内源` 未调至 ≤4、`d×外源` 只调至 ≤4 均非法；右侧正式“非法”列却仍只写 `未调阈值×d×π2`，遗漏 `a/b/c×外源`。这与表头宣称的合法联合选项全表及 decision-summary“非法配对已标明”不符。依据：[design.md:95](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:95)、[design.md:113](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:113)、[decision-summary.md:3](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:3)。

- **DES-3｜阻断｜π2 分支的 successor 行违反 state A finding 身份规则。**  
  D7 要求把已 waived 的 DES24-3..7 另开 `DES24-3s` 等 successor；state A 明定已关闭问题再次处理时应重开原 ID，且“never a new row”。同时 waiver 的既有语义是 owner 接受风险，不是临时延期状态。应改为：首次 gate③ 记录 π2 条件选择与回退 STEP2，但不得用 waiver 伪终结待修问题；若确需先 waive，则后续增量必须重开原 DES24-3..7，而非创建 successor。π1/π3 分支也应明确经过 producer `open→rejected + reason`、再由 reviewer `rejected→rejected-verified`，不能一步直写终态。依据：[design.md:158](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:158)、[decision-summary.md:57](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:57)、[RUNBOOK.md:290](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:290)。

其余核验通过：平台 EN/CN 与摘要已经统一；HL-K-01、HL-N-84i1..i5 使用同一四格函数；π1/π3 及分级、耦合、评审、签收、摘要域和 AC-I 未发现新的独立缺口。

VERDICT: 3 issues open.