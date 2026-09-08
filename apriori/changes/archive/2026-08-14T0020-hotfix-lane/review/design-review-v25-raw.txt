<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r25 transport=codex-exec-wsl-proxy -->

结论：D7 对 DES24-3..7 的复制事务缺口披露基本诚实，但把 r24 七条全部归入该边界并不成立；设计包尚不能以终审 0 收敛。

- **DES-1｜高风险｜平台约束缺陷与 π2 无关，且仍未修复。**  
  安全打开适用面已定义为 `f2 ∨ π2-copy ∨ π3 ∨ hash-present`，但 RUNBOOK 仍只要求“改裁非 f2”，并笼统断言该平台全部 hotfix 不可归档；decision-summary 也先说命中任一条件即接受残余，随后又缩成“选 f2 即接受”。例如 `π1 + {f1} + 无 hash` 根本不触发安全打开，仍应可归档。该项是 π1/π3 与平台准入口径问题，不能由 D7 延后。依据：[decision-summary.md:41](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:41)、[runbook-hotfix-lane-section.md:49](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/runbook-hotfix-lane-section.md:49)。

- **DES-2｜阻断｜AC1 四格函数仍自相矛盾，属于 gate③ 决策接口而非复制实现细节。**  
  D3 与 HL-N-84i2 规定 `a/b/c × π2 × 仓外源` 调至 `≤4` 合法；同一组检查点的 HL-N-84i5 却无签收限定地断言“外源只调到 ≤4”拒绝，HL-K-01 又要求所有非 `d×π2` 组合 `≤3`。同一联合选择同时 PASS/F1。D7 自称本包负责准入与验证缩放决策表，而 AC1 成本阈值正是 owner 判断 π2 是否可选的包级输入，不能把矛盾表作为“起点”呈报。依据：[design.md:113](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:113)、[cli-checkpoints.md:69](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:69)、[cli-checkpoints.md:83](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:83)。

- **DES-3｜高风险｜π2 后续增量缺少可执行的重新准入协议。**  
  D7 只写“实现前补齐”，没有规定选 π2 后必须回到 STEP2、接受异构复审、收敛账本并再次取得 human gate 批准；当前 flow-state 却写明本轮收敛即组装 gate③ packet。这样 owner 一旦在 gate③ 选择 π2，谁有权认定后续增量完成、何时解除实现阻塞均未定义。state A 对重大设计变化要求返回 STEP2，因此应把该条件明确写成 gate 阻塞规则，而非普通后续事项。依据：[design.md:154](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:154)、[flow-state.md:9](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/flow-state.md:9)、[RUNBOOK.md:240](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:240)。

- **DES-4｜阻断｜缺陷账使用 state A 非法状态，并把不同裁定的七项压成一行。**  
  `DES24-1..7` 被标为 `scoped(...)`；现行解析器只接受 `open/fixed/verified/rejected-verified/rejected/advisory-acked/waived`，RUNBOOK 明定未知状态任何阶段均非法。同时合并行无法表达 DES24-1/2 仍开放、DES24-3..7 条件延期这两种不同处置。应恢复逐项状态：未修项保持 open；真正接受边界延期的项使用有理由且经 reviewer concurrence 的合法状态，或由 owner 正式 waive。依据：[issues.md:249](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/review/issues.md:249)、[gate.js:53](/mnt/d/Workbench/misc/apriori-spec-development/lib/gate.js:53)、[RUNBOOK.md:290](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:290)。

除上述问题外，D7 列出的五类 π2 事务缺口与 HL-P-01/02 的“起点级覆盖”口径一致；π1/π3 的路径、hash、containment、截图记录及 AC 映射未发现新的结构性漏项，分级函数、耦合表、评审两轴、签收、摘要域也未发现新的独立矛盾。

VERDICT: 4 issues open.