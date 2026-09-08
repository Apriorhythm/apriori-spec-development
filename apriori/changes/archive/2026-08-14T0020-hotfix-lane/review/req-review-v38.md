<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r38 transport=codex-exec-wsl-proxy -->

核验结论：REQ-76、REQ-78 已收口；REQ-75 保持 verified。REQ-77 已完成 B-C 投影，但证据对象本身仍无可验收契约，不能关闭。另发现参数化耦合表的验收域缺失问题。lineage 与 design-first 边界无新增冲突。

### REQ-77 — 阻断：Q-3=ii 只有覆盖声明，没有证据结果契约

**风险：** 引用一个 FAIL、不可读或无法关联到当前基线的工件，也可能满足“覆盖全部 ID”，导致弱候选退化成无结果约束的自报。

**依据：**

- B-C 已要求证据覆盖 scope 全部 ID并满足 Q-6b 新鲜度，但没有定义每个 ID 必须携带什么结果、FAIL/RED 如何拒绝、缺失/重复/不可读工件如何处理：[req-v36.md:93](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v36.md:93)、[req-v36.md:94](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v36.md:94)。
- Q-6b 只定义工件基线、clean-tree、哈希/时间戳候选；它不定义测试证据的 per-ID 结果值域和成功条件：[req-v36.md:75](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v36.md:75)。
- B3 区分了可机械判的 `verify GREEN` 与其他证据，但没有给 Q-3ii 引用证据归类或 oracle：[req-v36.md:72](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v36.md:72)。
- AC-I 只验“缺任一 scope ID”和“新鲜度失配”，没有 FAIL 工件拒绝、结果缺失、重复 ID、不可读引用或基线字段缺失例：[req-v36.md:117](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v36.md:117)。
- R2 格在 ii 案规定 tests 键由证据证明，随后同一格又无条件写“tests 键 GREEN”，把 ii 再次解释成现场 verify：[req-v36.md:94](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v36.md:94)。

即使 owner 明示接受“机器不能证明它对应当前代码”，仍需定义最低逻辑契约：工件存在且可读、每个运行 scope ID 恰有结果、结果必须声明 GREEN/PASS、任一 FAIL/RED 拒绝，以及基线/摘要字段如何关联；具体序列化语法可留 STEP2。

### REQ-79 — 高：B-C 新增 Q-3×Q-4 参数轴，但 AC 覆盖域未同步

**风险：** 各参数分支单独有例，不代表组合后的结果唯一；实现可以漏掉或错误处理合法交叉组合而仍满足当前 AC。

**依据：**

- R1/R2 两格现均由 Q-3=i/ii、Q-4=a/b/c，以及零 delta 时的 Q-8/Q7c 共同决定：[req-v36.md:93](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v36.md:93)。
- AC-D3 的全覆盖域仍只有半径、profile、channel/tier 与 Q-5，未包含 Q-3、Q-4、Q-8/Q7c：[req-v36.md:113](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v36.md:113)。
- AC-I 仅分别列 Q-4c、Q-3ii 和 singleton 例，没有要求覆盖它们的交叉，例如：
  - R2 behavior × Q-3ii × Q-4c × p2 singleton no-test；
  - R2 delta × Q-3ii × Q-4c × tests/no-test 混合键；
  - `affected-scenario-ids` 与 delta no-test 键重叠时，证据集合究竟按“scope 全 ID”还是按“全部 affected ID”计算。
- 最后一例尤其存在文本歧义：B4 的集合差会删除重叠的 no-test 键，[req-v36.md:80](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v36.md:80)；B-C 的简写却称证据覆盖“tests 键与 affected ID”，可能重新把该键加入：[req-v36.md:94](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v36.md:94)。

应把 Q-3×Q-4×Q-8/Q7c 纳入合法联合表及 AC 覆盖维度，并规定一切证明机制统一消费 B4 最终计算出的运行 scope。

VERDICT: 2 issues open