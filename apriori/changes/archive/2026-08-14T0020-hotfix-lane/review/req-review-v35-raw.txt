<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r35 transport=codex-exec-wsl-proxy -->

核验结论：REQ-73 保持 verified；REQ-72/74/75 均未完全收口。target lineage、design-first 边界及 AC-D6 未发现新冲突。

### REQ-72 — 阻断：Q-4c singleton 未贯穿推论、B-C 与 AC

**风险：** 正文局部允许 R2 behavior 使用 singleton `no-test:`，但其他规范仍要求 R2 测试，owner 选择 Q-4c 后无法得到唯一准入结果。

**依据：**

- 行类型正文已补充 Q-4c singleton，明确包含 `(R2, behavior)`：[req-v33.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v33.md:31)。
- A3 推论仍只列 a/b，结尾仍称“Q-4 两案”，完全漏掉 c：[req-v33.md:65](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v33.md:65)。
- B-C 的 R2 格仍只描述“逐键可选”，没有投影零 delta、无键的 behavior singleton：[req-v33.md:94](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v33.md:94)。
- 正式表又称任何 R2 进入 hotfix 都“测试强制”，与 Q-4c singleton no-test 正面冲突：[req-v33.md:101](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v33.md:101)。
- AC-I 没有文末裁定记录所称的“R2-behavior singleton 例”；现有 generic p2 正例及 c 案 keyed 例均不能覆盖该组合：[req-v33.md:117](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v33.md:117)。

### REQ-74 — 高：集合语义已修，但关键回归 oracle 未落 AC

**风险：** 实现仍可错误退化为 `scope = tests 键集合`、静默丢弃额外 affected ID，同时通过当前验收清单。

**依据：**

- 正文已正确规定  
  `(delta scenarios ∪ affected-scenario-ids) − delta no-test keys`，并要求额外既有 affected ID 恒须 GREEN：[req-v33.md:80](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v33.md:80)。
- 但 AC-I 的 Q-4c 例只覆盖 keyed tests/no-test、条件式归档结果和全 no-test 空 scope；没有“delta 键均 no-test，但额外既有 affected ID 仍被执行且非 GREEN 即拒绝”的正反例：[req-v33.md:117](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v33.md:117)。

至少应加入：delta `D1=no-test`、额外 affected `E1` 时运行 scope 恰为 `{E1}`，`E1 GREEN` 通过，`E1 RED/UNBOUND` 拒绝。

### REQ-75 — 阻断：决策摘要仍写必然后果，且条件式结果谱漏掉 skip-only

**风险：** gate③ 摘要仍会误导 owner；同时 AC 会把 state A 实际判为 UNBOUND 的合法 TAP 输入错误断言为 GREEN/RED。

**依据：**

- 行类型与 B-C 已将后果改为条件式：[req-v33.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v33.md:31)、[req-v33.md:94](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v33.md:94)。
- 但 owner 决策摘要仍无条件写成“归档后 store UNBOUND → GAPS → archived gate 阻塞”，并称 g1 自然生效：[req-v33.md:124](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v33.md:124)。
- AC 将结果谱二分成“无同 ID TAP → UNBOUND”和“有同 ID 测试 → GREEN/RED”：[req-v33.md:117](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v33.md:117)。这不符合 state A：
  - `SKIP/TODO` 结果只累计 `skip`：[spec-runner.js:342](/mnt/d/Workbench/misc/apriori-spec-development/lib/spec-runner.js:342)。
  - 有同 ID TAP 行但 `pass=0 && fail=0` 仍判 UNBOUND：[spec-runner.js:381](/mnt/d/Workbench/misc/apriori-spec-development/lib/spec-runner.js:381)。

条件应改为“无有效非 skip/TODO 的同 ID 结果”才判 UNBOUND，并补 skip-only → UNBOUND/GAPS/阻塞例；Q-4 摘要也须同步改为条件式。

VERDICT: 3 issues open