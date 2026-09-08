<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=owner-ruling-D-review transport=codex-exec-wsl-proxy -->

结论：owner 的档位裁定本身不弱化 state A。现行 RUNBOOK 对截图属于 P7 自觉纪律，并非独立机械 gate；增量档新增 advisory 在机械层不弱于现状，全量档反而新增强制退出条件。`π1+{f1}+禁 hash`、`{R2}×{retain}` 与正式 trivial 的 tests/verify/P8 恒定义务也可并存，后者是 owner 独立裁定，不是继承 hotfix 豁免。

但同步和实现投影尚有四项问题：

- **DES-1｜阻断｜正式流程的截图规则没有定义可实施的消费路径。**  
  medium/large 的截图与 n/a 行被称为机械退出条件，trivial 也应产生 advisory；但 D1.4 只把证据解析放进 `lib/hotfix.js` 的 hotfix preflight，tasks T9 又要求正式 `lib/gate.js` 七项逻辑不动。现行 gate C1–C7 不读取截图、profile 或 n/a 行，正式 change 也没有 `hotfix-state.md` 的 `frontend-touched` 字段可用于判断 frontend:no。需明确正式 change 的证据载体、前端触及信号、执行命令及 gate 接入点，并补 medium/large 阻断与 trivial advisory 的独立 AC。依据：[design.md:47](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:47)、[tasks.md:37](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/tasks.md:37)、[tasks.md:60](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/tasks.md:60)、[gate.js:287](/mnt/d/Workbench/misc/apriori-spec-development/lib/gate.js:287)。

- **DES-2｜高风险｜证据总则仍无条件宣称截图必须存在。**  
  proposal 仍写“人类可查证物强制存在”；design D2.2 仍称与 req-v41 的存在性契约相同；RUNBOOK 草案又写所有 profile 证据都是机械退出条件、截图记录及豁免物必须存在、“缩放的只是覆盖面”。这些总则与随后“增量档 advisory”正面冲突，可能让实现者选择错误的强制解释。应把存在性改为按档参数化，并标明 owner D 取代 req-v41 原量词。依据：[proposal.md:15](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/proposal.md:15)、[design.md:61](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:61)、[runbook-hotfix-lane-section.md:26](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design-drafts/runbook-hotfix-lane-section.md:26)、[runbook-hotfix-lane-section.md:35](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design-drafts/runbook-hotfix-lane-section.md:35)。

- **DES-3｜高风险｜backend-only 的 n/a 行仍有未按档限定的旧规则。**  
  decision-summary 仍无条件规定“纯后端 change in ui profile 强制留痕”；RUNBOOK EN/CN 先说 n/a 行仅全量档强制，随后又无条件要求 backend-only change 留该行。增量档 frontend:no 因而同时可以无行通过、又必须有行。应将这些旧句明确限定为 medium/large；hotfix/trivial 下该行可选，但出现即校验。依据：[decision-summary.md:24](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:24)、[runbook-hotfix-lane-section.md:30](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design-drafts/runbook-hotfix-lane-section.md:30)、[runbook-hotfix-lane-section.md:37](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design-drafts/runbook-hotfix-lane-section.md:37)。

- **DES-4｜中风险｜AC-I 仍保留“增量档截图强制”的反向预期。**  
  HL-V-07 仍规定增量场景“截图仍强制”，与 owner D 直接相反。虽然该例同时命中未选的 Q-4c/p2，保留在完整设计草案中仍会造成未来复用误判；应改为截图 advisory，或明确标为被裁方案且不属于现行 AC 基线。同时应增加正式 trivial 的专门交叉例：缺截图仍通过，但 tests、verify GREEN 与 consistency review 缺一仍拒，以证明“advisory”不是 hotfix 验证豁免泄漏。依据：[cli-checkpoints.md:28](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design-drafts/cli-checkpoints.md:28)、[cli-checkpoints.md:54](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design-drafts/cli-checkpoints.md:54)。

DES24-3..7 的 `rejected-verified` concurrence 不受本次裁定影响；π2 仍为未选方案。

VERDICT: 4 issues open.