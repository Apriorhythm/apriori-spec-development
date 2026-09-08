<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff8f0-a6af-7ad1-88fc-551b1b4e45d4 date=2026-08-13 round=STEP0-r4 transport=codex-exec-wsl-proxy -->

# req-review-v4 — hotfix-channel 需求复审

评审对象：`apriori/changes/hotfix-channel/requirement/req-v4.md`

评审标准：本 change 为 design-first；不要求 requirement 预先裁定 Q1–Q9，只判断决策空间、候选后果、约束和 acceptance 是否完整且真实。

## r3 六项核验

| ID | 复核结果 | 依据 |
|---|---|---|
| REQ-2 | reopened | d1 主方案已解决摘要自失效，但仍保留的 d1-ext 是一个缺少事务、路径和恢复契约的新写入面。 |
| REQ-3 | verified | TOCTOU 已诚实披露，o1/o2/o3 后果及 AC5 保证范围均已相应收窄。 |
| REQ-5 | reopened | 目标键、RENAMED 和 archived gate 后果已补齐，但 g1b 与正式 change gate 不弱化不变量冲突。 |
| REQ-6 | reopened | C1–C7 编号已修正，C3 映射已补；但 m2 的 C6 触发条件与 state A 及 B9 不一致。 |
| REQ-11 | verified | 改变 UNBOUND/GAPS verdict 的 g2 已从合法候选移除；g2' 仅增强报告，不改变判定。 |
| REQ-12 | reopened | Contract freshness 与 supersession 已进入 Q9，但 r2 单独选择的实际后果和对应 acceptance 仍不完整。 |

## 正式 findings

### REQ-2 — d1-ext 引入未声明的第四写入面

风险：若人类选择 d1-ext，批准证据可能在 spec/truth 已提交后写入失败、落到不安全路径，或与 bundle move 分离；B4 所承诺的失败报告和恢复语义不再覆盖完整写集合。

依据：

- d1-ext 把批准记录写到 bundle 外的“archive 侧独立文件”。
- B4 的完整写集合仍只有 spec stores、truth Decisions、bundle move 三段，没有批准工件阶段。
- d1-ext 未定义固定路径、与 bundle 的关联键、symlink/escape 防护、预存在文件冲突、atomic write、失败时点和重跑幂等。
- 若它在 bundle move 后失败，bundle 已归档但缺批准证据；若在此前写入，move 失败又会留下孤立证据。
- AC11 只覆盖 d+d1 的 bundle 内排除域文件，不覆盖 d1-ext。

d1 主方案已经收口；应删除不完整的 d1-ext，或把其写入顺序、路径安全、失败恢复和 acceptance 纳入决策空间。

### REQ-5 — g1b 与“正式 change gate 七项分毫不动”冲突

风险：选择 g1b 会使后续正式 change 的 archived C1 在 whole-store verify 为 GAPS 时仍可能放行，削弱 state A 的 fail-closed binding gate。

依据：

- B5 已正确说明 no-test 债务会让所有后续正式 change 的 post-archive C1 BLOCKED。
- g1b 的解决方式是让 archived gate 对该债务显式豁免。
- B6 的共通不变量却要求正式 change 的 gate 七项行为分毫不动。
- state A 的 archived C1 直接消费 whole-store verify；UNBOUND 必然 BLOCKED，没有“已声明理由”豁免。
- “如实标为弱化”说明了后果，但不能令它与不可弱化约束兼容。v4 已基于同一原则移除 g2，g1b 实质上是在 gate 层恢复同一种放行。

若正式 change gate 不弱化是硬约束，g1b 应与 g2 一样移出合法候选；否则必须把“不弱化”改成可由人类裁决的约束，而不能两者同时成立。

### REQ-6 — m2 的 C6 适用条件漏掉 delta-only 代码 hotfix

风险：类别 1 hotfix 可能使 Contract freshness 变 stale，却在 m2 gate 中得到 C6 `n/a`，与 B9 的债务披露目标相反。

依据：

- state A 的 C6 根据 delta suffix 得到 touched store modules，再检查相应 truth `source-commit`。
- B6 的 m2 却规定 C6“仅当有 decisions”才运行。
- 类别 1 可以有 delta 而没有 Decisions；其事前代码 commit 正是 B9 所说会造成 freshness debt 的路径。
- decisions-only hotfix 反而不一定有代码变化；仅用 decisions 存在性决定 C6，倒置了检查与风险之间的关系。
- B9 要求涉及模块打印 freshness advisory，但 B6 没有说明 m2 的 C6 与该 advisory 如何分工。

Q8 应分别陈列 delta-touched modules、decision-target modules 和纯结论三种情况，并说明 C6 是 PASS/BLOCKED、advisory 还是 `n/a`。

### REQ-12 — r2 不是 r1 的独立替代项，且没有验收资格拒绝路径

风险：人类若只选择 r2，非契约性代码修复仍会使 `source-commit` 机械过期，但需求既不要求提示，也不要求清偿；“改变 Contract 行为必须升格”的规则也没有可验证 acceptance。

依据：

- `source-commit` freshness 由对应 source path 上是否存在后续 commit 判定，不会分析该 commit 是否改变 Contract 语义。
- 因此即使 r2 判断修复“不改变 Contract 所述行为”，其代码 commit 仍会产生与 r1 相同的 mechanical stale 状态。
- B9 说 r1/r2“可并用”，Q9 允许单独裁 r2，却没有说明 r2-only 仍留下静默 freshness debt。
- AC12 只在选择 r1 时检查 advisory；没有覆盖 r2 的资格判据，也没有验证一个被认定为 contract-changing 的 hotfix会被拒绝并指向正式 change。
- B6 m2 的 C6 又只在有 decisions 时运行，使 r2-only 的债务更可能完全不可见。

应明确 r2 只能补充 r1、不能消除 mechanical stale，或为 r2-only 定义等价披露机制；AC12 还应覆盖 r2 的允许/拒绝实例及升格指引。

### REQ-13 — 紧急修复但 spec 不变的合法形态未声明

风险：实现者可能强迫用户编造无意义 delta，或把真实代码修复误报为“不用修”的纯结论，从而破坏 archive provenance 和类别语义。

依据：

- B1 类别 1 写成“紧急代码修复 = 结论 + spec delta + 测试声明/no-test”，看起来 delta 必须存在。
- 现实中常见的紧急修复只是让代码重新符合现有 spec，不产生 ADDED/MODIFIED/REMOVED/RENAMED。
- B6/AC4 允许 zero-delta 纯结论 hotfix，但没有说明它是否只对应类别 2“不用修”，还是也允许类别 1 的 spec-preserving fix。
- B5 的 test/no-test 契约只由 delta target 驱动；没有 delta 时，代码修复是否仍必须声明回归测试或 no-test 理由也未定义。
- B9 的 Contract freshness 又明确讨论类别 1 的代码 commit，说明 spec-preserving code fix 并非可以忽略的边界。

需要明确类别 1 的 delta 是 mandatory 还是“仅在 spec 变化时存在”，并为 spec-preserving fix 定义测试声明、归档和 acceptance。

## 其余维度

- 目标态 B：总体清楚；Q1–Q9 已承接主要设计选择。
- 异常路径：F1/F2、TOCTOU、签收新鲜度、no-test 债务和 Decision supersession 均比 v3 完整。
- Acceptance：AC2–AC11 大体可测；AC12 和 spec-preserving fix 仍有上述缺口。
- state A：AM-17、UNBOUND/GAPS、普通 archive 部分提交及三态语义均有明确保护；g1b、C6 映射仍冲突。
- target lineage：`on-the-fly`、v4 产品线、main 暂不动、不合并 v1/v3，声明真实。
- won't-do：存在且覆盖 AM-17、自动互转、批量回填、三态/GAPS 和 Contract 机械相关性判断。

## Advisories

- d1 的 bundle 内排除域已经解决摘要自引用；STEP2 可再规定 `approval.md` 必须由命令生成且结构可校验，避免人工改写审计证据。
- o1 对 residual TOCTOU 的接受及 AC5 缩窄是诚实的产品选择，不构成问题。
- s2 已明确 dry-run 呈现旧条目修改，并在同一 truth 文件内原子更新新旧条目；其事务边界足以进入设计。
- 五列表账本与 `flow-state.next-action` 均已保持同步。

## Ledger delta

| ID | Status flip |
|---|---|
| REQ-2 | fixed → open（d1-ext 外置批准工件缺事务、路径及恢复契约） |
| REQ-3 | fixed → verified |
| REQ-5 | fixed → open（g1b 与正式 change gate 不弱化不变量冲突） |
| REQ-6 | fixed → open（m2 C6 仅按 decisions 触发，漏掉 delta-only freshness debt） |
| REQ-11 | fixed → verified |
| REQ-12 | fixed → open（r2-only 仍产生 mechanical stale，资格拒绝路径无 AC） |
| REQ-13 | new → open（spec-preserving 紧急代码修复没有合法形态和测试规则） |

VERDICT: 5 issues open