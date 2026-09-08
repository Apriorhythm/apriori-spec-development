<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff8f0-a6af-7ad1-88fc-551b1b4e45d4 date=2026-08-13 round=STEP0-r11 transport=codex-exec-wsl-proxy -->

# req-review-v11 — hotfix-channel 需求复审

评审对象：`apriori/changes/hotfix-channel/requirement/req-v11.md`

评审标准：本 change 为 design-first；不要求 requirement 预先裁定 Q1–Q9，只判断每个候选及其合法组合的语义、后果、约束与 acceptance 是否完整、真实。

## r10 REQ-16 核验

| ID | 复核结果 | 依据 |
|---|---|---|
| REQ-16 | reopened | w1 与必填强绑、w2+全缺的第五项放弃、外仓类别 1+本仓类别 3 的逐模块 C6 均已补齐；但正文仍同时规定“C6 不消费 fix-ref”和“C6 按 fix-ref 仓域路由”，λ2 也只有名称而无错误谱及验收。Q9 摘要还误写为“四项放弃”。 |

## 正式 findings

### REQ-16 — 仓域路由存在内部矛盾，λ2 不是完整可裁候选

风险：`high`。AI 无法确定 C6 能否读取 `fix-ref`；若人类选择 λ2，多 ref 与模块之间的歧义可能导致本仓模块未检查、外仓模块假 clean，且现有 AC 无法判定实现是否正确。

依据：

1. C6 对 `fix-ref` 的消费契约互相矛盾。

   - B1 明确写道：`C6 不消费 fix-ref`。
   - B9/w1、w2 又规定仓域判定依赖 `fix-ref` 的本仓或外仓形态。
   - B9 的混合规则进一步要求 C6：
     - 对外仓 `touched` 模块逐模块给出 `n/a`；
     - 对本仓 Decision 模块照常检查；
     - 不把整个 C6 降为 `n/a`。
   - 在没有其他模块→仓域映射输入时，C6 必须读取 `fix-ref` 或读取由它派生的路由结果，才能完成该分区。
   - “不使用 `fix-ref` 的 commit 值计算 freshness”和“完全不消费 `fix-ref`”是两种不同契约，当前文本没有区分。
   - 应明确：C6 是否只消费 `fix-ref` 的仓域标记、但绝不把其 ref 用作 `source-commit` 比较边界；或者由 preflight 负责分区并把结构化结果交给 C6。

2. λ2 只有目标名称，没有可实现的数据和错误契约。

   - λ2 仅写为“多 ref 逐模块绑定”，没有定义：
     - 一个 ref 如何绑定一个或多个 `touched-modules`；
     - 每个 touched module 是否必须恰好绑定一次；
     - 重复绑定、遗漏绑定、未知模块及本外仓冲突是否为 F1；
     - delta module 与绑定模块的超集关系如何延伸；
     - 多个外仓 host/ref 如何分别进入 archive advisory；
     - 本仓、外仓和 Decision 模块混合时的 C6 聚合。
   - AC15 只覆盖单一外仓 fixture、单一本仓 fixture和外仓类别 1+本仓类别 3；没有按 λ1/λ2 参数化，也没有多 ref fixture或错误谱。
   - λ1 已诚实定义为 RUNBOOK 纪律不变量，并给出拆分 hotfix/升格 change 的路径，可以直接进入人类裁决；λ2 尚不能。

3. Q9 摘要没有同步第五项放弃。

   - B1 已把仓域策略失效列为选填全缺的第五项放弃。
   - Q9 仍将选填案概括为“成对全缺豁免，四项放弃明示”。
   - 同一行稍后又写 `w2+选填全缺=五项放弃`，形成直接自相矛盾。
   - Q9 是人类 gate③ 的决策摘要，不能依赖人类回正文自行修正计数。

这不要求人类预选 λ1 或 λ2。可选择删除尚未闭合的 λ2，只保留完整的 λ1；也可补齐 λ2 的映射、不变量、F1 错误谱、逐模块输出及参数化 AC。

## 六维评审

| 维度 | 结论 | 说明 |
|---|---|---|
| 1. target state B | issues open | w1/w2 主组合清楚；λ2 和 C6 仓域输入仍有歧义。 |
| 2. edge cases / exception paths | issues open | 全缺与类别 1+3 已覆盖；λ2 的漏绑、重绑和混合仓域冲突未覆盖。 |
| 3. implied state changes / side effects | issues open | C6 是否新增对 `fix-ref` 的依赖没有一致声明。 |
| 4. acceptance testability | issues open | AC15 未按 λ1/λ2 参数化，无法验收多 ref 逐模块绑定。 |
| 5. state A compatibility | pass | 正式 change C6、AM-17、UNBOUND/GAPS、CAS、modified-integrity 和七项 gate 不弱化约束均保留。 |
| 6. target lineage | pass | `on-the-fly`、v4 产品线及 `4127653` P0 trio 声明真实。 |

## 新鲜审查结果

未新开 `REQ-17+`。发现均属于 REQ-16 的仓域组合契约：C6 路由输入不一致、λ2 候选不完整及 Q9 摘要未同步。

## Advisories

- w1+选填已明确为非法组合，避免外仓禁令被缺失的 `fix-ref` 绕过。
- w2+选填全缺已诚实降级为通用提醒，不虚构仓域判断。
- 混合 bundle 不再整体 `n/a`，本仓 Decision 模块仍接受 freshness 检查，方向正确。
- `won't do` 节存在，并继续保护既定范围。

## Ledger delta

| ID | Status flip |
|---|---|
| REQ-16 | fixed → open（C6 是否消费 `fix-ref` 自相矛盾；λ2 缺映射错误谱和参数化验收；Q9 的第五项放弃摘要未同步） |

VERDICT: 1 issues open