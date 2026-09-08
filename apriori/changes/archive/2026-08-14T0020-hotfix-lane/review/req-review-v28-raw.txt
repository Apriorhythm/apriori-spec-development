<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r28 transport=codex-exec-wsl-proxy -->

核验结果：v26 为真实新字节，lineage 仍与 `HEAD/main/merge-base` 一致。REQ-65 的多目标键场景已收口，REQ-66 的联动展示要求也已落文；但两项各有一个剩余缺口。

- **REQ-67｜风险：阻断｜零 delta `p2` 与“声明行数等于目标键数”正面矛盾。**  
  **依据：**需求函数规定 `code-*` 零 delta 且选 `p2` 时必须有“一条 bundle 级声明”，但紧接着又规定一切载体的声明行都与目标键一一对应、总行数等于目标键数 [req-v26.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v26.md:31)。prior art 明确零 delta 没有目标键，而 `p2` 使用一条无键声明 [req-v13.md:59](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:59)。因此 `p2×c1/c1′` 同时要求一行和零行。AC-I 只有“`p2` 无节拒绝”的负例，没有合法 `p2` 单行正例 [req-v26.md:114](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v26.md:114)。需要把行层再分为“非零 delta 的 keyed rows”和“零 delta `p2` 的 singleton unkeyed row”，并补 `c1/c1′` 正例。

- **REQ-68｜风险：高｜AC-D5 声称 STEP2 机械拒绝非法决策，但没有可执行的决策输入或 oracle。**  
  **依据：**AC-D5 要求联动项成组展示，并断言“STEP2 的机械面拒绝非法配对” [req-v26.md:112](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v26.md:112)；然而 state A 中 STEP2 只产 spec/design/tasks 并接受异构文档评审，owner 决策发生在其后的 STEP3 gate③ [RUNBOOK.md:233](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:233)。当前需求没有定义决策结果的序列化形状、校验器、触发时点或拒绝验收例；而且裸名 `Q7a/Q7c` 实际属于 Q-8 内嵌 prior art，与本 change 的顶层 Q-7（RUNBOOK 版本）存在编号碰撞 [req-v26.md:124](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v26.md:124)。成组展示可以人工验收，但“机械拒绝”目前不成立。应改成可测的合法联合选项表，使用命名空间如 `Q-8/Q7a`，并明确 gate③ 决策记录必须命中合法表；若校验器留待实现，则不得声称 STEP2 已机械拒绝。

VERDICT: 2 issues open