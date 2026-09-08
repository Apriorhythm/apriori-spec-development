<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff8f0-a6af-7ad1-88fc-551b1b4e45d4 date=2026-08-13 round=STEP0-r7 transport=codex-exec-wsl-proxy -->

# req-review-v7 — hotfix-channel 需求复审

评审对象：`apriori/changes/hotfix-channel/requirement/req-v7.md`

评审标准：本 change 为 design-first；不要求 requirement 预先裁定 Q1–Q9，只判断每个候选的语义、后果、约束与 acceptance 是否完整、真实。

## r6 两项核验

| ID | 复核结果 | 依据 |
|---|---|---|
| REQ-6 | reopened | e1-α 与 e2 已闭合；e1-β 虽声明新增第四态及 schema/renderer 变化，但未定义该状态如何影响 gate 的 `result`、`blocked` 和 exit code，AC13 也未断言这些结果。 |
| REQ-13 | reopened | 必填案错误谱和选填缺失后果均明显补强，但 `touched∩stale` 不能区分本 hotfix 新增债务与既有 stale；一致性超集还会在类别 1+3 混合 bundle 中把纯 Decision 模块误报为代码触及模块。AC4 的零-delta无-Decisions fixture 无法测试该一致性规则。 |

## 正式 findings

### REQ-6 — e1-β 第四态仍缺 gate 聚合契约

风险：`high`。若 gate③ 选择 m2+e1-β，AI 可以实现出不同的整体 verdict 和 exit code；下游无法知道 `advisory` 是非阻塞结果、阻塞结果，还是需要新增第三种 aggregate result。

依据：

- e1-α 已明确：
  - check status 为既有 `pass`；
  - detail 使用 `advisory:` 前缀；
  - `result = PASS`；
  - `blocked = 0`；
  - exit code 沿用 PASS；
  - JSON schema、renderer 与聚合不变。
- e2 也明确 stale 导致 `BLOCKED`。
- e1-β 只声明：
  - `checks[].status` 新增 `advisory`；
  - JSON schema 扩展；
  - renderer 增加 mark；
  - 下游消费者需要适配；
  - 正式 change 输出保持不变。
- 它没有声明 hotfix gate 遇到仅有 advisory 时：
  - `result` 是 `PASS`、`BLOCKED`，还是新增值；
  - `blocked` 是否仍为 `0`；
  - exit code 是 `0`、`1`，还是新增约定；
  - human footer 应打印 `GATE: PASS` 还是其他结果。
- state A 的聚合算法只统计 `status === 'blocked'`，但 requirement 不能依靠实现者自行推断新增状态的聚合语义。
- AC13 对 e1-β 只断言“第四态 + renderer mark + 正式 change 输出零变化”，没有覆盖上述 aggregate fields 和 exit code。
- 这不是要求现在选择 e1-α、e1-β 或 e2；问题是 e1-β 尚未成为可直接实现和验收的完整候选。

应像 e1-α 一样，为 e1-β 明确 `result`、`blocked`、exit code、human footer 和 JSON aggregate fields，并在 AC13 中逐项断言。

### REQ-13 — 定位头仍不能实现其因果归属目标，且组合规则产生错误触及关系

风险：`high`。归档可能把既有 freshness debt 误称为本 hotfix 引入，也可能把只承接业务事实的模块当成代码修复模块，从而产生错误的 Q3 尺度、C6 检查和 B9 advisory。

依据：

1. `touched-modules ∩ stale` 只能证明“当前涉及且当前 stale”，不能证明“stale 由本 hotfix 引入”。

   例如某模块的 `source-commit` 为 A，已有代码 commit B 已使它 stale，随后当前 hotfix commit C 再次触及同一模块。归档时：

   - `touched-modules` 包含该模块；
   - C6 的 stale 集也包含该模块；
   - 交集命中。

   但交集无法区分 B 所形成的既有债务与 C 新增的债务。v7 同时规定 C6 不消费 `fix-ref`，也没有保存 hotfix 前的 freshness baseline，因此不存在时间或 commit 边界可供因果比较。

   输出“本次触及且 stale”是准确的；声称它实现“本 hotfix 引入的债务 vs 既有 stale 的区分”则不成立。AC4 目前只断言交集输出，没有用预先 stale 的反例验证不发生错误归属。

2. `touched-modules ⊇ delta modules ∪ decision modules` 混淆了代码触及与知识承接。

   - B1 明确类别 3 可以与类别 1 并存。
   - 类别 3 的 Decision 可以写入一个未被代码修复触及的 truth 模块。
   - v7 却要求类别 1 的 `touched-modules` 必须包含所有 Decision 目标模块。
   - 这会让纯 Decision 模块被错误视为代码触及模块，并进一步：
     - 增大 Q3 的代码修复跨模块计数；
     - 进入 C6 的第三触发源，尽管 Decision 模块本已通过独立第二触发源进入并集；
     - 被 `touched∩stale` 描述为“本次触及且 stale”；
     - 在 Q3 硬上限案下，甚至可能错误拒绝一个实际单模块代码修复。
   - 一致性要求应至少区分代码修复模块与 Decision 目标模块；二者可以重合，但不能强制相等或包含。

3. AC4 无法测试所声称的一致性规则。

   - AC4 的固定前提是“无 delta、无 decisions”。
   - 在该前提下，`delta modules ∪ decision modules` 为空集。
   - 任意 `touched-modules` 都是空集的超集，因此不可能构造“子集缺失”的失败样本。
   - AC4 虽写了“一致性缺失拒绝”，但该断言在其测试形态中不可触发。
   - 必须另有带 delta、带 Decisions 以及类别 1+3 混合的 acceptance 才能验证超集规则及其边界。

4. 选填案只定义了字段完全缺失时的行为，未明确字段存在但 malformed 时是否继承必填案的 F1 校验。AC4 所称“四项放弃逐一断言”实际只具体列出了 Q3、C6、B9 三项；“无法与代码修复机械关联”没有对应可观察断言。

`fix-ref` v1 选择只做非空和格式校验、承认跨仓不可验证，本身是诚实的设计候选；finding 不要求预选 v1/v2。需要修正的是因果能力声明、混合类别的模块关系，以及相应 acceptance。

## 六维评审

| 维度 | 结论 | 说明 |
|---|---|---|
| 1. target state B | issues open | 主体及 Q1–Q9 清楚；e1-β 聚合语义与定位头的实际能力仍不完整。 |
| 2. edge cases / exception paths | issues open | 必填错误谱大幅补齐，但既有 stale、类别 1+3 混合、选填字段 present-but-invalid 尚未闭合。 |
| 3. implied state changes / side effects | issues open | e1-β 的 aggregate result/exit code 未声明；Decision 模块被隐式升级为代码触及模块。 |
| 4. acceptance testability | issues open | AC13 漏测 e1-β 聚合；AC4 的零-delta无-Decisions fixture 无法触发一致性缺失。 |
| 5. state A compatibility | conditional pass | e1-α、e2 及正式 change 回归保护与 state A 相容；e1-β 明示扩展 schema，但扩展契约仍需补全。五项 never-weaken protections 未被直接放宽。 |
| 6. target lineage | pass | 当前分支为 `on-the-fly`；`4127653` 存在并对应 P0 trio，lineage 声明真实。 |

## 新鲜审查结果

未新开 `REQ-16+`。类别 1+3 的模块混淆是 v7 新引入的一致性规则问题，但仍直接属于 REQ-13 的定位头语义和用途，不另建重复 ID。

## Advisories

- e1-α 使用 `pass + advisory:` 前缀会扩展 `pass` 的语义，但其机器区分方式、聚合结果和文档落点均已明确，是完整且可裁的候选。
- `fix-ref` v1 对跨仓引用只做声明格式检查，已经诚实说明不能证明真实性；这是产品权衡，不计问题。
- “未知模块拒绝”意味着 hotfix 不能引入尚未出现在 store/truth 词表中的新模块。文本已能推导该限制，建议 gate③ packet 再直述一次其升级路径。
- `won't do` 节存在，并继续保护 AM-17、普通 archive fail-closed、UNBOUND/GAPS、自动互转禁令及 Contract 相关性不做机械判断。

## Ledger delta

| ID | Status flip |
|---|---|
| REQ-6 | fixed → open（e1-β 缺 `result`、`blocked`、exit code 与 human footer 聚合契约及验收） |
| REQ-13 | fixed → open（`touched∩stale` 无法作因果区分；Decision 模块被误并入代码触及集合；AC4 无法测试一致性） |

VERDICT: 2 issues open