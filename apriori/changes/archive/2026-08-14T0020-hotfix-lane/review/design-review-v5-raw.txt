<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r5 transport=codex-exec-wsl-proxy -->

复审结论：DES4-1、DES4-3、DES4-7、DES4-9、DES4-10 的主体修复已落盘；v5 仍有 9 条开放问题。

1. **DES-1｜阻断｜k2 只声明“全链 occurrence-aware”，实际接口和工件语法仍退化为 scenario ID。**  
   依据：[design.md:125](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:125)定义 k2 为 `<scenario-id>@<requirement 标题>#<occurrence 序号>`，但没有规定序号是正整数、从 0/1 起算及 occurrence 的稳定排序来源；[design.md:52](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:52)仍将 scope 接口写成 scenario-ID 集合，[design.md:136](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:136)的 ii 工件仍是 `<scenario-id>: PASS|FAIL`。同 ID 多 occurrence 会在证明层再次合并，k2 不能端到端实施。

2. **DES-2｜高｜bindings 行定式仍存在可构造的解析歧义。**  
   依据：[design.md:126](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:126)允许任意非空理由，但未定义转义或保留字符：

   - c3 理由含 `-->` 会提前结束 HTML 注释；
   - k2 requirement 标题允许 `:`，同时 keyed 行也用 `:` 分隔；
   - 理由可包含 `: tests:`、`: no-test:`，未规定按首个还是末个 marker 切分；
   - c1/c1′ 文件/节内是否允许空行、注释或其他正文没有定义。

   “每目标键恰一行”需要先有唯一 parser；当前多个解析器可得到不同键和值。

3. **DES-3｜高｜π2/π3 截图载体尚未唯一化，并存在路径逃逸读文件风险。**  
   依据：[design.md:137](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:137)仍有四个缺口：

   - π2 只说图片入 bundle，没有固定目标目录、文件名及碰撞规则；
   - π3 `hash=<hex>` 未规定哈希算法；
   - 保留键禁用清单漏掉新增的 ` hash=`，`obs` 含该子串时解析两可；
   - “仓根相对”没有拒绝 `..`、绝对路径、symlink 或非普通文件。preflight 可能读取仓外文件并把其哈希或内容信息带入呈阅/归档。

4. **DES-4｜高｜review 最大轮次选择算法仍非全域唯一。**  
   依据：[design.md:141](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:141)没有禁止 `round-1` 与 `round-01` 同时存在，二者数值相同会产生两个“最大 n”候选；也没有说明较低轮次的孤立 doc/raw 是否 F1，还是静默忽略。另 `boundary=within|exceeds` 没有 requiredness：γ′ 边界点检时是否必需、普通 inspection 时是否禁止均未写，无法形成唯一 role×phrase×boundary 函数。

5. **DES-5｜高｜D3 漏掉合法的 Q-3=ii × Q-4b 组合。**  
   依据：[design.md:100](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:100)只显式承认 `ii×Q-4c`；但 req-v41 的 R1 格同时按 Q-3 i/ii 参数化，并允许 Q-4b 的 p2 singleton no-test。`R1×ii×Q-4b×p2` 下 final scope 为空、ii 工件 n/a、理由留痕，是有唯一结果的合法组合。当前合法联合表可能误导 gate③ 将其判非法。

6. **DES-6｜高｜decision-summary 仍把 hotfix 与正式 trivial 混成同一个验证格。**  
   依据：[decision-summary.md:22](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/decision-summary.md:22)把二者共同写成 scoped verify，并称 docs 的 P8“按评审轴”。Q-3、Q-4、Q-11 只辖 hotfix；正式 trivial 恒用 state A tests+verify GREEN及正式 consistency review，docs 恒为 check+P8，不按 hotfix 评审轴裁定。RUNBOOK 草案已拆开，但 gate③ 的 owner 摘要仍保留旧矛盾。

7. **DES-7｜高｜双语 RUNBOOK 对 no-test 债务载体的陈述不实。**  
   依据：[runbook-hotfix-lane-section.md:12](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/runbook-hotfix-lane-section.md:12)及中文第 21 行称 no-test 债务“只有零 delta 案有归档载体”。Q-4c 的非零 delta keyed no-test 同样有归档载体：c1/c1′随 bundle 归档，c2 行在归档前剥离但原 bundle仍归档，c3甚至随块进入 living store。零 delta 案的特殊点是“只有归档载体、没有 living-store 投影”，不是其他案没有归档载体。

8. **DES-8｜高｜RUNBOOK delta 漏掉设计自己要求的 verdict phrase-table 变更。**  
   依据：[design.md:53](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:53)和 [design.md:141](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:141)新增 `no findings`、`gaps found`、role/digest/boundary 尾注，并明确要求修改 RUNBOOK phrase table；但 [runbook-hotfix-lane-section.md](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/runbook-hotfix-lane-section.md)没有相应 EN/CN phrase-table delta。实现者无法从 spec 草案判断 canonical 短语、尾注 grammar 及与 state A 短语的共存方式。

9. **DES-9｜高｜cli-checkpoints 仍未兑现“一例一 ID”，并漏掉新定式的关键负例。**  
   依据：[cli-checkpoints.md](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md)中仍有复合 ID，例如 HL-F-13“本仓/外仓双反例”、HL-F-36a/b/c、HL-R-27a/b、HL-R-28 双例、HL-T-01/02/03。另至少漏：

   - k2 occurrence 的 end-to-end scope、bindings、ii 工件正反例；
   - π3 哈希内容失配拒绝，而非仅“hash 字段缺失”；
   - review 数字别名、孤立低轮次、γ′ boundary 缺失/域外出现；
   - truth 无 `## Decisions` 节和 malformed 条目；
   - o2/o3、s3 等仍在 gate③ 候选空间的参数化验收；
   - 路径 `..`、symlink、非普通截图文件拒绝。

VERDICT: 9 issues open