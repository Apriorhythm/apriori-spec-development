<!-- provenance: provider=openai model=gpt-5.6-sol session=019ff8f0-a6af-7ad1-88fc-551b1b4e45d4 date=2026-08-13 round=STEP0-r13 transport=codex-exec-wsl-proxy -->

# req-review-v13 — hotfix-channel 需求复审

评审对象：`apriori/changes/hotfix-channel/requirement/req-v13.md`

评审标准：本 change 为 design-first；不要求 requirement 预先裁定 Q1–Q9，只判断每个候选及其合法组合的语义、后果、约束与 acceptance 是否完整、真实。

## r12 REQ-17 核验

| ID | 复核结果 | 依据 |
|---|---|---|
| REQ-17 | verified | w1 已拆为 `w1-strict` 与 `w1-weak`：前者拒绝 preflight 可确定的映射缺口，并保留运行期故障的 state A `n/a`；后者诚实降级为仓域限制并强制披露不可观察原因及清偿路径。w2 已补本仓不可观察的对称披露，AC15 覆盖无 truth、无合法 stamp、无可用映射三类负向 fixture。 |

## 正式 findings

无。

## 六维评审

| 维度 | 结论 | 说明 |
|---|---|---|
| 1. target state B | pass | 三类承接对象、Q1–Q9 及其合法组合均已完整陈列；保留的人类选择不影响 requirement 可实现性。 |
| 2. edge cases / exception paths | pass | 零 delta、no-test、重复键、部分提交、TOCTOU、外仓、定位头全缺/半缺、混合类别、本仓映射缺口及运行期故障均有明确路径。 |
| 3. implied state changes / side effects | pass | preflight 分区为只读派生结果；没有摘要域或 B4 事务边界外的新写入面。 |
| 4. acceptance testability | pass | AC1–AC15 均有可观察结果；AC15 已参数化 w1-strict、w1-weak、w2、外仓、混合 bundle、全缺定位头及本仓不可观察路径。 |
| 5. state A compatibility | pass | 正式 change 七项 gate、AM-17、UNBOUND/GAPS、CAS、modified-integrity、C6 运行期 `n/a` 和部分提交语义均未弱化。 |
| 6. target lineage | pass | `on-the-fly`、v4 产品线及 `4127653` P0 trio 的 lineage 声明真实。 |

## 新鲜审查结果

未发现 `REQ-18+`。

决策空间现已完整且诚实：

- `w1-strict` 真正保证资格阶段可映射，但不把运行期基础设施故障伪造成确定性拒绝。
- `w1-weak` 明确只限制仓域，不再暗示所有本仓模块必然可观察。
- `w2` 对外仓不可验证与本仓映射缺口采用对称的显式披露。
- C6 只消费 preflight 的仓域分区，仍以 truth `source-commit` 为 freshness 比较边界。
- λ1 是唯一合法单仓域形态；跨仓修复有拆分 hotfix 或升格 change 的明确路径。

## Advisories

- AC4 仍写“选填案缺失时四项放弃逐一断言”，而 B1/Q9 已更新为五项；第五项已由 AC15 的 `w2+选填全缺` fixture 独立验收，因此不构成 acceptance 缺口，建议后续编辑时同步措辞。
- STEP2 宜把“preflight 可确定的映射缺口”枚举直接复用 AC15 的三类词汇，避免实现自行扩张到 git 临时不可用等运行期故障。
- `won't do` 节存在，并继续保护 AM-17、普通 archive fail-closed、UNBOUND/GAPS、自动互转禁令及 Contract 相关性不做机械判断。

## Ledger delta

| ID | Status flip |
|---|---|
| REQ-17 | fixed → verified |
| REQ-18+ | no new issues |

VERDICT: 0 issues open