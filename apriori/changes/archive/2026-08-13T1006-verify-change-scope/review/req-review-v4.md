# req-review-v4 — verify-change-scope 需求复审

评审基线：

- 需求：`apriori/changes/verify-change-scope/requirement/req-v4.md`
- ledger：`apriori/changes/verify-change-scope/review/issues.md`
- state A：当前 workspace 的 `lib/spec-runner.js`、`lib/gate.js`、`lib/archive-merge.js`
- lineage：`main@10aef21`，package `4.0.7`
- r3 复核结果：REQ-4、REQ-8 已关闭
- 新增正式问题：无
- 明确的 `范围外（won't do）`：已存在

## 维度 1：target state B 是否清晰、无歧义

结论：通过。

目标态已形成唯一实现语义：

- change scope 以最终 projection 中的 Requirement block provenance 定义，并保留 scenario occurrence 信息。
- ADDED、MODIFIED、RENAMED 和 REMOVED 对 scope 的影响明确。
- RENAMED 保持 state-A 语义，只改变 Requirement 名，不隐式改变 scenario ID。
- scoped duplicate、纯范围外 duplicate、scoped unidentified 和范围外 unidentified 的归属明确。
- store report 是整个 projection 与同一 TAP snapshot 的完整六类信息性评估。
- 顶层/module binding 字段使用 change 语义，full-projection duplicate 仅位于 `storeReport.duplicates`。
- `storeReport`、`changeScope` 的 presence matrix 已唯一确定：仅 GREEN/GAPS 存在，所有 ERROR 和 `--specs` 运行均 absent，绝不使用 null。
- `changeScope.requirements[].operations` 能完整表达合法 multi-operation provenance；排序与 final projection state 规则明确。

### REQ-4 复核：已关闭

描述：

v4 已消除 module API 的最后一个 shape 分叉：

- `run.storeReport` 与 `run.changeScope` 当且仅当结果为 GREEN/GAPS 时存在；
- pre-test ERROR、post-TAP ERROR 和 `--specs` 运行均不带这两个字段；
- absent 与 null 不再是两个合法实现；
- JSON 使用相同 presence rule；
- scoped 与 full-projection duplicates 的字段归属明确；
- requirements、scenario IDs 和 operations 均有确定 shape 与排序规则。

风险：

原风险已解除。module consumer、gate 和 JSON consumer 可依据稳定 presence contract 工作。

建议修复：

无。

### REQ-8 复核：已关闭

描述：

v4 将单值 `operation` 改为按 merge execution order 排列的 `operations` 数组，并明确：

- rename-then-modify 的最终块属于 scope；
- provenance 为 `["RENAMED","MODIFIED"]`；
- rename-then-remove 的最终 deprecated 块不属于 scope；
- provenance 以 final projection state 为准；
- AC3 已覆盖两个组合路径。

风险：

原先合法组合操作无法表达的问题已解除。

建议修复：

无。

## 维度 2：边界与异常路径是否覆盖

结论：通过。

已覆盖的主要边界和异常路径包括：

- invalid pattern：0 projection、0 content read、0 test spawn、0 TAP parse；
- projection failure 或 title matcher failure：一次 projection，不执行测试；
- GREEN/GAPS：一次 projection、一次 test spawn、一次 TAP parse；
- post-TAP ERROR：同样只执行一次测试和解析；
- explained non-zero 与 unexplained non-zero 的不同 exit 规则；
- matcher `2000ms` timeout 与既有 fail-early 规则保持不变；
- pure-REMOVED 空 scope；
- 含 ADDED/MODIFIED/RENAMED 的其他合法空 scope；
- 整个 projection 零场景；
- scope 中只有 unidentified occurrence；
- malformed 或零操作 delta；
- scoped、cross-boundary 和纯范围外 duplicate；
- rename-then-modify 与 rename-then-remove；
- ERROR 时不呈现不可信的 store binding report；
- 不新增 rollback，test command 的既有外部副作用不回滚；
- 两种视角共享同一 projection 和 TAP snapshot，不引入新的并发观察窗口。

## 维度 3：是否存在 implied but undeclared 的状态变化或副作用

结论：通过。

所有实质变化均已显式声明：

- `verify --change` verdict 从 full projection 收窄到 change scope；
- `--change` 顶层 JSON binding 字段改为 change 语义；
- 新增 `storeReport` 与 `changeScope`；
- D-SR-x 获得仅适用于 `--change` 的 scoped amendment；
- gate in-flight C1 改为消费 change-scoped verdict；
- store 历史缺口保留为信息性报告；
- ERROR 时省略不可信的 scope/report 数据；
- 单次 test execution 契约保持，不新增 timeout、持久化或 rollback 行为。

`--specs`、archived gate、archive、`merge()` 和 id-pattern 机制均明确不变。

## 维度 4：acceptance criteria 是否均可表达为 if/then oracle

结论：通过。

各 AC 均能转写为确定的 if/then 断言：

- AC1：如果当前 change clean，而范围外存在 unbound、orphan、unattributed failure 且 test command exit 1，则 `verify --change` GREEN exit 0，范围外问题进入 `storeReport`。
- AC2：如果 scoped scenario 无 passing test 或存在 red，则 GAPS exit 1。
- AC3：如果执行各类 delta operation 或合法组合操作，则 scope、scenario ID 和 operations provenance 符合指定结果。
- AC4：如果 duplicate/unidentified 涉及 change occurrence，则阻断；如果完全位于范围外，则只进入 store report。
- AC5：如果 change-B 有 red 而 change-A clean，则 A 的 C1 pass、B 的 C1 blocked。
- AC6：真实样本的前后计数和不可变身份可以直接复放核验。
- AC7：兼容性、四路径调用次数、四类 JSON shape、presence matrix 和 unexplained non-zero 均可直接断言。
- AC8：五种零范围/零 projection/malformed 情形均有唯一 verdict 和文案 oracle。
- AC9：文档文件、CHANGELOG 内容及 `check --self` 均可机械检查。

## 维度 5：是否与当前 state A 冲突

结论：通过。

v4 对 state A 的处理明确且自洽：

- RENAMED 与现有 SR-19 保持一致。
- multi-operation provenance 按现有 merge 顺序 `RENAMED → ADDED → MODIFIED → REMOVED` 表达。
- invalid-pattern 路径保留当前 resolution-first、enumeration-only early exit。
- matcher threading 与 `2000ms` timeout 不变。
- projection/TAP/test command 继续单次执行。
- unexplained non-zero 继续 ERROR exit 2。
- `--specs` 与 archived gate 保持现状。
- archive 和 `merge()` 不在修改范围内。

D-SR-x 的差异属于明确声明的 `--change` scoped amendment，而非未解决冲突。

## 维度 6：target lineage 是否声明且符合仓库现实

结论：通过。

需求声明 `main（v4 产品线；不合并 v1/v3）`，与当前仓库 `main@10aef21`、package `4.0.7` 一致。

flow-state 已声明本 change 建立在尚未归档的 `gate-id-pattern` workspace 实现之上，并要求评审以实际 `lib/` 为 state A。该依赖关系符合当前 dirty worktree 现实。

## Advisories（不计入 verdict）

### ADV-1：gate store summary 可考虑补齐全部六类

当前固定的 gate suffix 只摘要 `boundRed/unbound/orphan/unattributed`，没有显示 `duplicates/unidentified`。完整数据仍可从 verify 的 `storeReport` 获取，因此不构成正式缺口；补齐可减少用户回查。

### ADV-2：module presence oracle宜在测试名称中明确

B6 已把 module 与 JSON presence rule 钉死，AC7 也要求 presence oracle。实施时建议分别命名 module-level 与 CLI JSON-level 测试，避免只覆盖序列化结果而漏掉原始 run object。

### ADV-3：`runbook-version` 保持 `4.0` 合理

当前 package major 为 4，本 change 未改变 CLI major。保持 `runbook-version: 4.0`，同步双语行为说明和 CHANGELOG，符合 CK-11。

### ADV-4：显式 `won't do` 已满足

v4 保留既有范围外条目，并明确不修改 archive、`merge()`、`--specs`、id-pattern、hotfix 与跨 change 协调视图。

## Ledger delta

| ID | Status delta | Reason |
|---|---|---|
| REQ-1 | verified → verified | 无变化 |
| REQ-2 | verified → verified | 无变化 |
| REQ-3 | verified → verified | 无变化 |
| REQ-4 | fixed (v4) → verified | module 与 JSON 的 `storeReport`/`changeScope` presence 已统一为 GREEN/GAPS present、ERROR 与 `--specs` absent；不再允许 null/omitted 分叉 |
| REQ-5 | verified → verified | 无变化 |
| REQ-6 | verified → verified | 无变化 |
| REQ-7 | verified → verified | 无变化 |
| REQ-8 | fixed (v4) → verified | `operations` 数组、merge-order、rename-then-modify 和 rename-then-remove 的 final-state 规则及 AC 均已明确 |

VERDICT: no major issues
