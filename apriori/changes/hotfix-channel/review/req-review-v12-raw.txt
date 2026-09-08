<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff8f0-a6af-7ad1-88fc-551b1b4e45d4 date=2026-08-13 round=STEP0-r12 transport=codex-exec-wsl-proxy -->

# req-review-v12 — hotfix-channel 需求复审

评审对象：`apriori/changes/hotfix-channel/requirement/req-v12.md`

评审标准：本 change 为 design-first；不要求 requirement 预先裁定 Q1–Q9，只判断每个候选及其合法组合的语义、后果、约束与 acceptance 是否完整、真实。

## r11 REQ-16 核验

| ID | 复核结果 | 依据 |
|---|---|---|
| REQ-16 | verified | 仓域解析现由 preflight 完成，C6 只消费模块分区且不以 `fix-ref` commit 值替代 `source-commit`；λ2 已从候选空间移除，λ1 成为单仓域不变量；Q9 已同步为五项放弃。w1/w2、定位头必填性和混合 bundle 的组合契约现已闭合。 |

## 正式 findings

### REQ-17 — w1 没有闭合“本仓但 C6 不可观察”的路径

风险：`high`。选择 w1 后，一个本仓 `fix-ref` 可能通过资格检查，但对应模块仍因 truth/source-files 映射不完整而得到 C6 `n/a`；该修复既没有被拒绝，也没有获得 w2 的 `unverifiable` 明示，从而违背 w1“只承接可观察修复”的承诺。

依据：

- w1 的目标写成“类别 1 只承接本仓/source-files 可观察的代码修复”。
- 其明确的拒绝条件和 AC15 目前只覆盖“外仓形态 `fix-ref` → F1 拒绝”。
- `fix-ref` 的本仓仓域标记只能证明出处被声明为本仓，不能证明每个 touched module 实际可由 C6 检查。
- B1 的模块词表是“既有 store/truth 模块后缀词表”，属于并集；因此一个只有 store、没有对应 truth doc 的模块仍可能通过模块名校验。
- state A 的 C6 对以下本仓路径会给出带原因的 `n/a`，而不是完成 freshness 判断：
  - 没有对应 truth doc；
  - truth doc 没有合法 `source-commit`；
  - 默认 `lib/<module>.js` 不存在；
  - 没有可用的 `source-files`；
  - ref 或 git 检查无法执行。
- 显式 `source-files` 的部分格式/缺失问题会 BLOCKED，但默认映射缺失及若干 precondition 仍会 `n/a`。因此不能把“本仓”自动等同于“可观察”。
- AC15 只有“本仓 fixture 照常路径回归”的正向样本，没有本仓但无 truth、无 stamp或无 usable source mapping 的负向样本。
- AC13 覆盖 stale 的 e1/e2 映射，不覆盖尚未形成 stale/clean 判断的 precondition `n/a`。
- w2 已为外仓不可观察定义专属声明，但没有说明本仓不可观察是否也应得到类似明确披露。

这不要求预选 w1 或 w2。应为 w1 明确选择：

- 将确定性的本仓不可映射状态纳入 F1 eligibility 拒绝，并在 AC15 增加负向 fixture；或
- 承认 w1 只限制仓域而不保证实际可观察，并完整声明 C6 `n/a`、archive advisory 和清偿路径。

对于 git 临时不可用等运行期故障，可以继续保留 state A 的 `n/a` 语义；但必须区分可在 preflight 确定的映射缺口与运行期不可用。

## 六维评审

| 维度 | 结论 | 说明 |
|---|---|---|
| 1. target state B | issues open | REQ-16 的外仓组合已闭合；w1 的本仓不可观察边界仍不明确。 |
| 2. edge cases / exception paths | issues open | 外仓、全缺、混合类别均已覆盖；本仓无 truth/stamp/source mapping 尚未覆盖。 |
| 3. implied state changes / side effects | pass | preflight 分区是只读派生结果，不增加摘要域或事务边界外写入面。 |
| 4. acceptance testability | issues open | AC15 缺少本仓但 C6 不可观察的负向或 `n/a` fixture。 |
| 5. state A compatibility | pass | C6 的 `n/a` precondition、正式 change 七项、AM-17、UNBOUND/GAPS、CAS 和 modified-integrity 均未被弱化；finding 正是要求目标态诚实承接该现状。 |
| 6. target lineage | pass | `on-the-fly`、v4 产品线及 `4127653` P0 trio 声明真实。 |

## 新鲜审查结果

新开 `REQ-17`。它不是 REQ-16 的外仓仓域组合遗留：REQ-16 已收口；新问题是 w1 内部“本仓”与“实际可由 C6 观察”并不等价。

## Advisories

- preflight 解析仓域、C6 仅消费结构化分区且仍以 truth `source-commit` 为比较边界，职责划分已经一致。
- λ2 的移除合理；λ1 的单仓域约束及拆分/升格路径完整可执行。
- AC4 仍写“选填案缺失时四项放弃逐一断言”，而 B1/Q9 已是五项；第五项已由 AC15 单独验收，因此不构成 acceptance 缺失，但建议同步文字避免误读。
- `won't do` 节存在，并继续保护既定范围。

## Ledger delta

| ID | Status flip |
|---|---|
| REQ-16 | fixed → verified |
| REQ-17 | new → open（w1 未定义本仓但 truth/source-files 不可观察时的拒绝或 `n/a`/advisory 契约，AC15 无对应 fixture） |

VERDICT: 1 issues open