<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff946-122a-7532-ac83-e50910aa0efc date=2026-08-13 round=STEP0-r37 transport=codex-exec-wsl-proxy -->

核验结论：REQ-75 已收口，互斥有序函数及 pass+fail→RED 例与 `spec-runner` 一致。REQ-72/73/74 保持 verified。新发现 3 个跨契约问题；lineage 与 design-first 边界无新增问题。

### REQ-76 — 高：正式流程表仍残留旧的“Q-4 仅作用 R1”口径

**风险：** Q-4c 是否会泄漏到正式 R2-trivial 存在互斥解释。

**依据：**

- hotfix R2 在 Q-4c 下明确允许 keyed 或 behavior-singleton `no-test`：[req-v35.md:94](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v35.md:94)。
- 正式表却仍称“Q-4 参数化仅作用于 hotfix R1”：[req-v35.md:100](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v35.md:100)，已与上述 R2 分支不符。
- R2-whitelist×trivial 又称验证下限“同 hotfix R2 对应格”，同时括注 `scoped verify GREEN`：[req-v35.md:101](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v35.md:101)。Q-4c 下，“同格”会引入 no-test，而括注要求 GREEN。
- AC 则要求正式 trivial 恒为 tests+GREEN：[req-v35.md:117](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v35.md:117)。

应统一为：Q-4 仅参数化 **hotfix 通道**；其中 b/c 影响 R1、c 也影响 R2；正式流程任何 tier 均不继承 hotfix no-test，R2-trivial 直接列出独立 GREEN 下限，不再称“同 hotfix R2 格”。

### REQ-77 — 阻断：Q-3=ii 合法候选未投影进 B-C 和 AC

**风险：** owner 可合法选择“证据引用”，但正文仍要求现场 scoped verify，导致 gate③ 的合法组合没有唯一验收结果。

**依据：**

- Q-3 明确保留 i/ii 两案：[req-v35.md:123](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v35.md:123)。
- B4 的 scope 集合、Q-4 例外及 GREEN oracle只定义在 i 的隐式运行分支内；ii 仅有一句能力弱化说明：[req-v35.md:80](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v35.md:80)。
- B-C 的 R1/R2 格仍无条件写 `scoped verify GREEN`，未按 Q-3 参数化：[req-v35.md:93](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v35.md:93)。
- AC-I 只有 scoped verify 机制，没有 ii 下 tests 键、额外 affected ID、singleton 与新鲜度的验收例：[req-v35.md:117](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v35.md:117)。
- prior art 已给出必要的分键契约：证据只证明 tests 键，no-test 键由非空理由承接：[req-v13.md:58](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-channel/requirement/req-v13.md:58)。当前引用没有把它落入本 change 的 B-C/AC。

需参数化 Q-3=i/ii 的每格结果，并定义 ii 下证据覆盖集合、新鲜度 oracle、no-test 排除及正反例。

### REQ-78 — 高：no-test 的 TAP 结果函数未标定发生阶段

**风险：** 同一个 no-test 键若产生 RED，既可被实现为 preflight 拒绝，也可被忽略后归档；两种实现都能援引当前文本。

**依据：**

- preflight 明确把 keyed no-test 从运行 scope 中减去；singleton no-test 更豁免整个 scope：[req-v35.md:80](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v35.md:80)。
- 行类型段却无阶段限定地称“实际 TAP 结果说了算”：[req-v35.md:31](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v35.md:31)。
- AC 的有序结果函数同样未注明它只验收 post-archive whole-store 结果：[req-v35.md:117](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v35.md:117)。
- 只有开放问题摘要将条件式后果明确放在归档后：[req-v35.md:124](/mnt/d/Workbench/misc/apriori-spec-development/apriori/changes/hotfix-lane/requirement/req-v35.md:124)。

应拆成两个 oracle：preflight 对已排除的 no-test 键不消费其 per-ID GREEN/RED；post-archive whole-store 才按 `fail>0 / pass>0 / otherwise` 聚合。AC 应覆盖“preflight 排除键出现 RED 不改变准入”和“归档后同一 RED 阻塞”两例。

VERDICT: 3 issues open