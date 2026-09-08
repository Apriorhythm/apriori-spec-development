<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-14 round=STEP2-r1 transport=codex-exec-wsl-proxy -->

结论：设计包尚未通过 STEP2，存在 13 条开放问题。

1. **DES-1｜阻断｜本应在 STEP2 定式的机械接口仍被推迟到实现阶段。**  
   依据：[design.md:9](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:9)写“定式留实现”，[process-config-rows.md:8](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/process-config-rows.md:8)也将行定式留给实现；但 req-v41 已明确把 c1′ 标题、摘要规范化/排序/散列、R2 子型序列化位置、Q-3=ii 工件序列化留给 STEP2（[req-v41.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v41.md:31)、[req-v41.md:34](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v41.md:34)、[req-v41.md:60](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v41.md:60)、[req-v41.md:94](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v41.md:94)）。当前设计不足以让实现者唯一实现摘要、bindings、证据工件和 verdict parser。

2. **DES-2｜高｜gate③ 必需的 decision-summary.md 缺失。**  
   依据：[proposal.md:32](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/proposal.md:32)把它列入交付物，[design.md:106](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:106)用它承接 AC-D5；但 bundle 中不存在该文件。Q-1..Q-12 及 Q-8 内嵌 prior-art 候选无法按合法联合表完成 gate③ 裁定记录。

3. **DES-3｜高｜D1.1 没有完整物化 doc-fix 字段契约。**  
   依据：[design.md:14-21](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:14)只把 `touched-modules` 写成 code-* 必填，也没有写出 doc-fix 的 `touched-modules == delta 模块集`、`fix-ref` 必填及 v1/v2 校验、定位头成对必需。req-v41 对这些都是显式 F1 不变量（[req-v41.md:53](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v41.md:53)）。按当前表实现会接受非法 doc-fix 超集或缺定位头形态。

4. **DES-4｜高｜分级函数重新引入已删除的“次序 2a”，且 Q-12 口径跨文档矛盾。**  
   依据：[design.md:30](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:30)增加 doc-fix 2a，与 req 明确“2a 删除、docs 与 code 同一次序 2”冲突（[req-v41.md:60](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v41.md:60)），也破坏首中唯一模型。同时 [proposal.md:14](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/proposal.md:14)称只有“人类白名单标注”可降 R2，遗漏 Q-12=yes 的 ADDED-only 机械白名单②。

5. **DES-5｜高｜D1.3 缺陷账走查不随待裁参数变化，和 D1.2 不能保持一致。**  
   依据：[design.md:44](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:44)无条件把单模块一条 decision 判 R0；Q-10 的 N 尚未裁，N=0 时按 D1.2 应先命中 `>N` 得 R3。[design.md:46](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:46)又称 R2 whitelist“强制测试”，但 Q-4c 明确允许 R2 keyed no-test。两例都需参数化，不能写确定结论。

6. **DES-6｜高｜D2.3 并非其声称的“全笛卡尔”物化。**  
   依据：[design.md:73-81](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:73)只有 3×4 的 hotfix 汇总表：R3 没有显式 n/a 行，R2 whitelist/behavior 未拆，ui/fullstack 合并，trivial/medium/large 仅一段散文，也没有展开 Q-5、Q-3、Q-4、Q7c、Q-6b 轴。它无法满足 [req-v41.md:112-113](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v41.md:112)要求的逐格 oracle、唯一机械预期及 human-domain 标注。

7. **DES-7｜高｜D3 合法联合选项表漏联动，并错误收窄 Q-3×Q-4。**  
   依据：[design.md:95](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/design.md:95)写成保留案绑定 Q-3=i，但 req 的 AC 明确要求 `Q-3=ii × Q-4c` 的 behavior、mixed-key 等合法交叉例（[req-v41.md:117](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v41.md:117)）。表中还漏：

   - Q-6c t2 仅能配无评审组合；
   - prior art `w1 × 定位头必填`，`w1 × 选填`非法；
   - freshness 只能 `r1` 或 `r1+r2`，`r2-only` 非法；
   - c1 载体与 AC1 文件数阈值联动；
   - m2 与 C6 e 子候选联动；
   - k1/k2 与 affected-ID duplicate 解释联动。

8. **DES-8｜高｜D1.4 对 state A 实现触点清单不完整。**  
   依据：新命令必须修改 [bin/apriori.js:23-49](/mnt/d/Workbench/misc/apriori-spec-development/bin/apriori.js:23)，单改 `lib/new.js` 不会产生 `apriori hotfix`。Q-3 的 `(delta∪affected)−no-test` scope 也不能由现有 [lib/spec-runner.js:586-625](/mnt/d/Workbench/misc/apriori-spec-development/lib/spec-runner.js:586)接口表达，需明确修改或抽出共享 oracle；D1.4 未列两者。相反，现有 [lib/resolve.js:49-94](/mnt/d/Workbench/misc/apriori-spec-development/lib/resolve.js:49)按目录解析、不读状态文件，真正硬编码 `flow-state.md` 的是 [lib/status.js:44-73](/mnt/d/Workbench/misc/apriori-spec-development/lib/status.js:44)和 [lib/gate.js:297-300](/mnt/d/Workbench/misc/apriori-spec-development/lib/gate.js:297)。触点分解尚未达到可实施设计精度。

9. **DES-9｜高｜HL-GRADE/HL-BIND 未覆盖 req-v41 AC-I 全谱。**  
   依据：[cli-checkpoints.md:3-14](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:3)至少漏掉：

   - 定位头选填案次序 0.5 正例；
   - doc-fix touched 必填、精确等于 delta、fix-ref 必填及 v1/v2 不存在拒绝；
   - no-code 携任一定位/触及/affected 字段拒绝；
   - ADDED 默认 R3 与 doc-fix 标注/未标注两分支；
   - 类型表词表外键、重复模块、未知类型的独立场景；
   - c1′ 标题错序；
   - `p2×c2/c3` 非法组合；
   - c1′ 与 c2/c3 各自的多目标键正例。

10. **DES-10｜高｜HL-VERIFY 对 Q-3=ii/Q-4c 的交叉与错误谱不全。**  
    依据：[cli-checkpoints.md:16-23](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:16)没有列出 req-v41 指定的三个交叉组合：behavior×ii×Q-4c×p2、delta×ii×Q-4c mixed-key、affected 与 delta no-test 键重叠且不得复活。还漏非法结果值、f3 缺时间戳/新鲜度失配/基线字段缺失非错误，以及 no-test 理由非空负例，因而“证据契约全谱”声明不成立。

11. **DES-11｜高｜HL-REV 与回归场景没有覆盖评审六格及耦合逐格 oracle。**  
    依据：[cli-checkpoints.md:32-43](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/cli-checkpoints.md:32)只单列 R0 与 doc-fix retain/waive，没有覆盖 R1×all-code、R2 code 在 none/R2/all-code 下的投影、R2×docs 双职责、none×retain 单 P8、单职责恰一 verdict 等。`HL-REG-04` 的“module-type-map 谱”也是集合标签，不是 scenario 级全谱。故 AC-I 的“评审两轴六格”和“耦合表逐格 oracle”仍无映射。

12. **DES-12｜高｜RUNBOOK 草案与 req 及现行 RUNBOOK 的命令语义冲突。**  
    依据：[runbook-hotfix-lane-section.md:5](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/runbook-hotfix-lane-section.md:5)把“一切未标注 ADDED”列为禁止，预先否定 Q-12=yes；第 7 行把签收误写成顶层 Q-1，实际签收来自 Q-8/prior-art 命名空间。草案只说“直接归档”，却未明确走专属 `hotfix` 命令；现行 [RUNBOOK.md:185](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:185)的普通 `archive --change` 是 delta 驱动，而 [archive-merge.js:327-329](/mnt/d/Workbench/misc/apriori-spec-development/lib/archive-merge.js:327)对零 delta 明确拒绝。若不写清专属路径，会与 AM-17 保持不变的承诺冲突。

13. **DES-13｜中｜RUNBOOK/config 草案还不是可落地的双语 delta。**  
    依据：仓库有独立 [RUNBOOK.md:1](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK.md:1)和 [RUNBOOK_cn.md:1](/mnt/d/Workbench/misc/apriori-spec-development/RUNBOOK_cn.md:1)，但所谓“双语要点”文件实际只有中文，无法验证两份 canonical 文档同步。另 [process-config-rows.md:3-6](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/specs/process-config-rows.md:3)使用三列 `key/value/notes`，现行模板是四列 `Field/Value/Legal range/Default`（[templates/process-config.md:9](/mnt/d/Workbench/misc/apriori-spec-development/templates/process-config.md:9)）；它不是可直接合入的模板行，也未给出两个新键的 Default 列。

VERDICT: 13 issues open