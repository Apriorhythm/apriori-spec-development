<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff8f0-a6af-7ad1-88fc-551b1b4e45d4 date=2026-08-13 round=STEP0-r10 transport=codex-exec-wsl-proxy -->

# req-review-v10 — hotfix-channel 需求复审

评审对象：`apriori/changes/hotfix-channel/requirement/req-v10.md`

评审标准：本 change 为 design-first；不要求 requirement 预先裁定 Q1–Q9，只判断每个候选及其合法组合的语义、后果、约束与 acceptance 是否完整、真实。

## r9 REQ-16 核验

| ID | 复核结果 | 依据 |
|---|---|---|
| REQ-16 | reopened | w1/w2 对“定位头存在、修复只有一个仓域”的主路径已经闭合；但它们与“定位头成对全缺”的合法候选无法组合，且未定义多仓或外仓修复与本仓 Decision 混合时 C6 的逐模块聚合语义。 |

## 正式 findings

### REQ-16 — 仓域策略与定位头选填、混合模块之间缺少组合契约

风险：`high`。人类可能裁出文本允许、实现却无法兑现的组合；w1 的外仓禁令可被缺失的 `fix-ref` 绕过，w2 的 `unverifiable` 保证也可能无法触发，混合 bundle 还可能错误跳过本仓可执行的 C6 检查。

依据：

1. w1/w2 的判断前提与选填定位头冲突。

   - w1 依靠 `fix-ref` 的仓域标记识别并拒绝外仓修复。
   - w2 同样依靠该标记识别外仓修复，继而输出 `freshness: unverifiable (external repo)` 和 C6 `n/a` 附因。
   - Q9 同时保留定位头选填案；该案允许 `touched-modules` 与 `fix-ref` 成对全缺并正常归档。
   - 在成对全缺时：
     - w1 无法识别并拒绝外仓修复；
     - w2 无法识别外仓，也无法输出承诺的外仓专属 advisory；
     - AC15 的外仓 fixture 均带有可识别的外仓形态 `fix-ref`，没有覆盖全缺路径。
   - B1 已诚实说明全缺会失去机械关联，但 Q9 没有说明这一选择会使 w1 不可执行，并使 w2 降级为通用提醒。四项放弃清单也没有把“仓域策略失效”列为第五项后果。

2. 单一 `fix-ref` 没有定义多仓触及的表达能力。

   - `touched-modules` 是列表，Q3 明确允许跨模块修复。
   - `fix-ref` 当前是一个“出处串”，w1/w2 把它分类为本仓形态或外仓形态。
   - 文本没有说明一个 hotfix 是否必须只涉及一个 repo，还是允许本仓和外仓模块并存。
   - 若允许混合，一个 bundle 级仓域标记无法把各 `touched-module` 绑定到对应 repo/ref，也无法决定哪些模块进入本仓 `touched∩stale`、哪些应标为 `unverifiable`。
   - 若禁止混合，应把“单 hotfix 单仓域”声明为不变量，并定义违规为 F1；目前没有该约束或 acceptance。

3. 外仓类别 1 与本仓类别 3 混合时，C6 总体结果不明确。

   - B6 的 C6 来源为 delta modules、Decision modules、touched modules 的并集。
   - 类别 1 可以与类别 3 并存；因此一个外仓代码修复可以同时携带本仓可检查的 Decision 目标模块。
   - w2 写成“gate C6 对外仓修复输出 n/a”，但没有说明这是整个 C6 的结果，还是仅对外仓代码来源的逐模块结果。
   - 若整个 C6 直接 `n/a`，会跳过本仓 Decision 模块本来可执行的 freshness 检查。
   - 若继续检查本仓模块，则需要定义混合聚合规则，例如本仓 stale 是否仍使 C6 按 e1/e2 出结果、外仓部分只作为附因；当前 AC13/AC15 都没有这一组合 fixture。

这不要求预选必填/选填或 w1/w2。应提供合法组合矩阵或明确优先级，例如：

- w1 必须与定位头必填组合；或者选填全缺时采用另一个可执行的仓域判定；
- w2 与选填全缺组合时，明确只剩通用 `unverifiable`，并把仓域不可判定列入放弃清单；
- 明确单 bundle 是否允许多仓修复；
- 对外仓类别 1 + 本仓 Decision 的 C6 定义逐模块处理、整体聚合及参数化 acceptance。

## 六维评审

| 维度 | 结论 | 说明 |
|---|---|---|
| 1. target state B | issues open | w1/w2 单一路径清楚，但与定位头选填及混合仓域的合法组合未闭合。 |
| 2. edge cases / exception paths | issues open | 外仓 ref 主路径已覆盖；全缺头、多仓 touched、外仓类别 1 + 本仓类别 3 尚未覆盖。 |
| 3. implied state changes / side effects | issues open | w2 全局 C6 `n/a` 可能隐式跳过本仓 Decision 模块检查。 |
| 4. acceptance testability | issues open | AC15 未覆盖选填全缺和混合仓域，也未与 AC14 的类别 1+3 fixture交叉。 |
| 5. state A compatibility | pass | w1/w2 均未修改正式 change 的 C6；AM-17、UNBOUND/GAPS、CAS、modified-integrity 和七项 gate 不弱化约束保持。 |
| 6. target lineage | pass | `on-the-fly`、v4 产品线及 `4127653` P0 trio 声明真实。 |

## 新鲜审查结果

未新开 `REQ-17+`。本轮发现的是 REQ-16 外仓可见性设计内部尚未覆盖的组合空间，应继续 reopened 原 ID。

## Advisories

- 对“本仓且落入 `source-files` 映射”才可由 C6 观察的措辞修正准确。
- w2 的仓域标记、双处禁止性措辞及纯外仓 `n/a` fixture，已经解决此前的假 clean 主路径。
- `fix-ref` v1 继续只证明声明格式、不证明 ref 真实性；该限制已诚实陈列。
- `won't do` 节存在，并继续保护 AM-17、普通 archive fail-closed、UNBOUND/GAPS、自动互转禁令及 Contract 相关性不做机械判断。

## Ledger delta

| ID | Status flip |
|---|---|
| REQ-16 | fixed → open（w1/w2 与定位头全缺不兼容；多仓触及及外仓类别 1 + 本仓 Decision 的 C6 聚合未定义） |

VERDICT: 1 issues open