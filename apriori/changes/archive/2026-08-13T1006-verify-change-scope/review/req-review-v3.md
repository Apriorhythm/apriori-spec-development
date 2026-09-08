# req-review-v3 — verify-change-scope 需求复审

评审基线：

- 需求：`apriori/changes/verify-change-scope/requirement/req-v3.md`
- ledger：`apriori/changes/verify-change-scope/review/issues.md`
- state A：当前 workspace 的 `lib/spec-runner.js`、`lib/gate.js`、`lib/archive-merge.js`
- lineage：`main@10aef21`，package `4.0.7`
- r2 复核结果：REQ-6、REQ-7 已关闭；REQ-4 尚有 module API presence 歧义
- 新增问题：REQ-8
- 明确的 `范围外（won't do）`：已存在

## 维度 1：target state B 是否清晰、无歧义

结论：不通过。存在 REQ-4、REQ-8。

### REQ-4 reopen：module API 的 ERROR shape 仍允许两种实现

描述：

B6 已明确 JSON 中 `storeReport` 当且仅当 `result ∈ {GREEN,GAPS}` 存在，所有 ERROR 均省略；但 module API 又规定：

> `run.storeReport`（同 JSON 结构的原始形态；ERROR 类为 null/缺省）

`null` 与属性不存在是两个不同的 JavaScript API shape，机器消费者可通过 `run.storeReport === null`、`'storeReport' in run` 或 destructuring 区分。类似地，`run.changeScope` 在以下 ERROR 路径是否存在也未明确：

- invalid pattern：尚未读取 delta 内容；
- projection failure：可能只有部分 projection metadata；
- title matcher failure：projection 已成功，但 scenario IDs 尚不可用；
- post-TAP ERROR：完整 change scope 已构造。

AC7 要求四类“完整 JSON oracle”，能够固定 CLI JSON，但不能消除 `verify()` module run object 的上述分歧。

风险：

两个实现可以生成完全相同的 CLI JSON 和 exit code，却向 `gate` 或其他 module consumer 提供不同的 run object。尤其是 ERROR 路径使用 `null` 还是 omitted，会形成不必要的接口分叉。

建议修复：

为 module API 增加明确 presence matrix，例如：

| result/path | `run.storeReport` | `run.changeScope` |
|---|---|---|
| GREEN/GAPS | present object | present object |
| invalid pattern | omitted | omitted |
| projection/title matcher ERROR | omitted | omitted |
| post-TAP ERROR | omitted | present object |

也可以选择所有 ERROR 均省略两字段，但必须唯一裁定。将“null/缺省”改成单一规则，并在 AC7 增加 module-level shape 断言。

### REQ-8：合法的 RENAMED + MODIFIED 组合无法用单值 `operation` 表达

描述：

state A 的 delta parser 允许同一 delta 先：

- `RENAMED Alpha -> Gamma`
- 再 `MODIFIED Gamma`

`merge()` 固定按 RENAMED、ADDED、MODIFIED、REMOVED 顺序执行，因此该组合可以合法成功：最终 `Gamma` 块的名称来自 RENAMED，内容来自 MODIFIED。

B1 将该块同时纳入 RENAMED/MODIFIED provenance，但 B6 把每个 requirement 固定为：

`{file, name, operation}`，其中 `operation ∈ ADDED|MODIFIED|RENAMED`

单值 `operation` 无法表达该块同时经过 RENAMED 和 MODIFIED，也没有声明 precedence。AI 可以合理输出 `RENAMED` 或 `MODIFIED`，两者均符合部分文字。类似的 RENAMED 后 REMOVED 虽会因最终 deprecated 而排除 scope，但也应明确 provenance 以最终 projection 状态为准。

风险：

`changeScope.requirements` 在合法 delta 上不确定，测试、JSON consumer 和后续诊断可能得到不同 provenance。实现若错误地假定每个块只对应一个操作，还可能漏掉最终块或错误处理 rename-then-modify。

建议修复：

二选一并增加 oracle：

- 推荐将字段改为 `operations: [...]`，按 merge 顺序排序，例如 `{file, name:"Gamma", operations:["RENAMED","MODIFIED"]}`；
- 或规定单值 precedence，例如最终内容操作优先，输出 `operation:"MODIFIED"`，并另设 rename metadata。

同时明确：

- RENAMED + MODIFIED target 的最终块属于 change scope；
- RENAMED + REMOVED target 的最终 deprecated 块不属于 change scope；
- AC3 增加 rename-then-modify 的合法组合断言。

## 维度 2：边界与异常路径是否覆盖

结论：不通过。

REQ-6、REQ-7 的 r2 缺口已经补齐：

- 空范围已区分 pure-REMOVED 与含 ADDED/MODIFIED/RENAMED 的其他合法情况；
- 通用文案包含实际 ops summary，不再误标 removal-only；
- invalid-pattern、projection/title matcher failure、GREEN/GAPS、post-TAP ERROR 的调用次数均已分路径裁定；
- invalid pattern 保持 0 projection、0 content read、0 spawn、0 parse。

剩余缺口：

- REQ-4 的 module ERROR presence matrix 未覆盖；
- REQ-8 的合法 multi-operation provenance 未覆盖。

null、out-of-range、timeout、rollback 方面没有新增未决项：

- null/空范围已由 B5 覆盖，但 module field 的 `null`/omitted 仍是 REQ-4；
- TAP plan out-of-range 等 infra ERROR 沿用 state A；
- matcher `2000ms` timeout 保持不变；
- 不新增 rollback，test-command side effect 仍不回滚；
- 两段报告共享单次快照，不引入新的并发观察窗口。

## 维度 3：是否存在 implied but undeclared 的状态变化或副作用

结论：不通过。

- REQ-4 对 `run.storeReport` 使用“null/缺省”，隐含两个不同的 module API 状态。
- REQ-8 未声明 multi-operation block 的 provenance 折叠规则。
- B3 已明确不二次执行 projection/test/TAP parse，因而 r2 所担心的新增测试副作用已消除。
- 没有要求持久化写入；`verify` 与 `gate` 继续保持 read-only。

## 维度 4：acceptance criteria 是否均可表达为 if/then oracle

结论：不通过。

当前 AC 已能测试：

- scoped GREEN/GAPS；
- explained 与 unexplained non-zero；
- scoped、cross-boundary 和纯范围外 duplicate；
- RENAMED 保留场景 ID；
- 五类零范围；
- 四条调用路径；
- GREEN/GAPS/pre-test ERROR/post-TAP ERROR 的完整 CLI JSON；
- `--specs` 兼容与文档同步。

仍缺：

- 如果 `verify()` 返回任一 ERROR，那么 `run.storeReport` 和 `run.changeScope` 分别必须 present、omitted 还是 `null`；
- 如果合法 delta 对同一最终块执行 RENAMED 后 MODIFIED，那么 `changeScope.requirements` 应输出什么唯一对象。

## 维度 5：是否与当前 state A 冲突

结论：通过，但存在 REQ-8 所述未定义映射。

已解决的 state-A 冲突：

- RENAMED 继续只修改 Requirement 名，SR-19 不动；
- invalid pattern 保持 matcher resolution 优先及 enumeration-only early exit；
- `--specs`、archive、`merge()`、matcher timeout 均不改；
- D-SR-x 的变化已明确限定为 `--change` amendment；
- non-zero 且 `failCount===0` 继续 ERROR。

REQ-8 不是要求与 state A 直接冲突，而是没有为 state A 已允许的组合操作定义新的 provenance 输出。

## 维度 6：target lineage 是否声明且符合仓库现实

结论：通过。

需求声明 `main（v4 产品线；不合并 v1/v3）`，与当前 `main@10aef21`、package `4.0.7` 一致。对未归档 `gate-id-pattern` workspace 实现的依赖已在 flow-state 中声明，并正确以实际 `lib/` 作为 state A。

## r1/r2 issue 逐条复核

- REQ-1：维持 verified。
- REQ-2：维持 verified。
- REQ-3：维持 verified。
- REQ-4：reopen。CLI JSON 已收口，但 module API 的 ERROR presence 仍允许 `null` 或 omitted，`changeScope` 的 ERROR presence 也未定义。
- REQ-5：维持 verified。
- REQ-6：verified。零范围分类、文案和 AC 已完整覆盖 r2 问题。
- REQ-7：verified。条件式四路径表与 workspace fail-early state A 一致。
- REQ-8：新增 open。合法 RENAMED + MODIFIED target 的多操作 provenance 无法映射到单值 `operation`。

## Advisories（不计入 verdict）

### ADV-1：gate store summary 可补齐六类计数

gate detail 的 store suffix 只列 `boundRed/unbound/orphan/unattributed`，未列 `duplicates/unidentified`。完整信息仍存在于 verify 的 store report，因此不构成正式缺口；为减少 gate 用户回查成本，建议补齐。

### ADV-2：`runbook-version` 保持 `4.0` 合理

当前 package major 为 4，行为变化未引入 CLI major。保持 `runbook-version: 4.0`，同步更新双语语义和 CHANGELOG，符合现有 CK-11 规则。

### ADV-3：显式 `won't do` 已满足

v3 保留 v1 的范围外条目，并明确不改 archive 和 `merge()`，范围边界充分。

## Ledger delta

| ID | Status delta | Reason |
|---|---|---|
| REQ-1 | verified → verified | 无变化 |
| REQ-2 | verified → verified | 无变化 |
| REQ-3 | verified → verified | 无变化 |
| REQ-4 | fixed (v3) → open (reopened r3) | CLI JSON 已钉死，但 module API 的 ERROR `storeReport` 为 null 或 omitted 仍未唯一裁定，`changeScope` 的 ERROR presence 也未定义 |
| REQ-5 | verified → verified | 无变化 |
| REQ-6 | fixed (v3) → verified | pure-REMOVED 与其他合法空范围已分别裁定并纳入 AC8 |
| REQ-7 | fixed (v3) → verified | 条件式调用次数表保持 invalid-pattern fail-early，并覆盖四条路径 |
| REQ-8 | new → open | 合法 RENAMED + MODIFIED target 会产生多操作 provenance，但 `changeScope.requirements[].operation` 只能表达一个操作且无 precedence |

VERDICT: 2 issues open
