# req-review-v2 — verify-change-scope 需求复审

评审基线：

- 需求：`apriori/changes/verify-change-scope/requirement/req-v2.md`
- ledger：`apriori/changes/verify-change-scope/review/issues.md`
- state A：当前 workspace 的 `lib/spec-runner.js`、`lib/gate.js`
- lineage：当前分支 `main`，HEAD `10aef21`，package `4.0.7`
- r1 复核结果：REQ-1、REQ-2、REQ-3、REQ-5 已关闭；REQ-4、REQ-6、REQ-7 需 reopen
- 新增独立 issue：无
- 明确的 `范围外（won't do）`：已存在

## 维度 1：target state B 是否清晰、无歧义

结论：不通过。REQ-4、REQ-6 仍未完全形成唯一实现。

### REQ-4 reopen：输出契约仍有三个未钉死的机器接口

描述：

B6 已明确大部分 JSON、module API 和 gate detail，但仍有以下歧义：

1. 当前顶层 JSON 存在 `duplicates`，当前 module run 存在 `run.duplicates`，但 B6 列出的“改为 change 语义”的顶层字段没有包含 `duplicates`。与此同时，B1 要求 scoped duplicate 阻断 change verdict，gate 又被要求消费“change 范围 duplicates”。因此无法确定：

   - `run.duplicates` 是否改为 scoped duplicates；
   - 顶层 `duplicates` 是否改为 scoped duplicates；
   - full-projection duplicates 是否只保存在 `storeReport.duplicates`；
   - 还是要新增另一个字段。

2. B2 要求六类“各类给 count + 清单”，但 B6 schema 中只有 `boundGreen` 和 `unattributedFailures` 显式带 count，其余五类只是数组。数组长度是否就是规定的 count，还是应使用 `{count, items}`，没有唯一答案。

3. ERROR shape 只规定“errors-run 不含绑定数据时 `storeReport` 缺省”，没有规定 test command 已运行、TAP 已解析后才发现 infra ERROR 时的 shape，例如 bailout、plan mismatch、signal 或 unexplained non-zero。此时 state A 已持有 binding 数据，但实现可以合理选择保留或省略 `storeReport`。

此外，`run.changeScope.requirements` 没有声明元素形状。Requirement 名称只在 module 内唯一；若只输出字符串名称，跨 module 同名时无法表达 occurrence provenance。

风险：

不同实现可能给出相同 exit code，却产生不兼容的 module/JSON shape。gate 对 duplicate 的消费也可能继续误用 full-projection `run.duplicates`，使纯范围外 duplicate 错误阻断当前 change。

建议修复：

在 B6 增加明确 schema：

- `run.duplicates` 和顶层 JSON `duplicates` 均为 change-scoped duplicates；
- full-projection duplicates 仅放在 `run.storeReport.duplicates` / JSON `storeReport.duplicates`；
- 六类统一采用明确形状，例如 `{count, items}`，或明确声明数组的 `length` 就是 count；
- 定义 pre-test ERROR 与 post-TAP ERROR 的字段存在矩阵；
- 将 `changeScope.requirements` 定义为带 module identity 的对象，例如 `{file, name, operation}`，并明确排序；
- 为 GREEN、GAPS、pre-test ERROR、post-TAP ERROR 各提供完整 JSON oracle。

### REQ-6 reopen：零范围表遗漏非 removal-only 的合法空范围

描述：

B5 第一行覆盖“change scope 空 + delta 有合法操作 + projection 非空”，但要求输出固定文案：

`0 scenario(s) in change scope (removal-only change)`

然而 state A 允许其他合法空范围：

- `ADDED` 一个没有 Scenario 的 Requirement；
- `MODIFIED` 后目标块没有 Scenario；
- `RENAMED` 一个本来没有 Scenario 的 Requirement；
- 上述操作与 `REMOVED` 混合，但最终 change scope 仍为空。

这些情况会命中同一行，却被错误标注为 `removal-only change`。AC8 只要求“四行各一个断言”，很可能只测试真正的 removal-only，无法覆盖这一边界。

风险：

实现会输出事实错误的原因说明；或者实现者为避免误报，自行把这些情况改判 GAPS/ERROR，从而出现不同 verdict。

建议修复：

将第一行拆成至少两类并分别裁定：

- 真正的 removal-only：GREEN，并使用 removal-only 文案；
- ADDED/MODIFIED/RENAMED change 块存在但没有 identified/unidentified Scenario occurrence：明确 GREEN、GAPS 或 ERROR，并使用准确的通用文案；
- 混合操作导致空范围时，明确按最终块 provenance 还是按 operation composition 选择原因文案。

AC8 为非 removal-only 的合法空范围增加独立 oracle。

## 维度 2：边界与异常路径是否覆盖

结论：不通过。REQ-6 和 REQ-7 仍有缺口，REQ-4 的 post-TAP ERROR shape 也未覆盖。

### REQ-7 reopen：`buildProjection` “恰好一次”与实际 state A 的 invalid-pattern 路径冲突

描述：

B3 规定每次 `verify --change` 都“恰好一次 `buildProjection`、一次 `runTestCommand`、一次 TAP parse、一个 resolved matcher”，随后又规定 pattern 非法是 pre-test ERROR。

实际 workspace state A 在 `verify()` 中先执行 `resolveIdPattern()`。若 pattern 非法，会调用 enumeration-only 的 `enumerateProjection()` 后直接返回：

- `buildProjection` 调用 0 次；
- `runTestCommand` 调用 0 次；
- TAP parse 0 次；
- 不读取 delta 内容。

这是上一 change 特意建立的安全顺序。要求 invalid pattern 时仍恰好调用一次 `buildProjection`，会改变该顺序并读取 delta/store 内容，与“id-pattern 机制不动”和“infra ERROR 类不变”不一致。

AC7 的 sentinel 只断言 test command spawn 一次，没有覆盖 projection、parse 和 invalid-pattern 的调用次数，因此不能解除矛盾。

风险：

AI 可能为了满足“恰好一次 buildProjection”而把 pattern resolution 移到 projection 之后，回退 `gate-id-pattern` 的 fail-early 契约；也可能保持 state A，却违反 B3 的绝对表述。

建议修复：

将 B3 改为条件式契约：

- pattern resolution 成功后，`verify --change` 至多且恰好一次 `buildProjection`；
- invalid pattern 保持 state A：0 次 `buildProjection`、0 次 spec/delta content read、0 次 test spawn、0 次 TAP parse；
- projection failure 或 scenario-title matcher failure：1 次 projection、0 次 test spawn、0 次 TAP parse；
- test command 已启动的正常/post-TAP ERROR 路径：1 次 projection、1 次 test spawn、1 次 TAP parse；
- 两视角永远共享同一个成功 projection 和同一份 parsed TAP snapshot。

为上述路径增加 spy/sentinel oracle，而不只统计 test-command spawn。

## 维度 3：是否存在 implied but undeclared 的状态变化或副作用

结论：不通过。

- REQ-7 的绝对“一次 buildProjection”会隐含改变 invalid-pattern 路径的文件读取行为。
- REQ-4 未明确 `run.duplicates` 的语义变化，却要求 gate 改为消费 scoped duplicates。
- REQ-6 会对非 removal-only change 输出错误的状态原因。

持久化方面已明确不新增 rollback；`verify`/`gate` 继续 read-only，test command 的既有外部副作用不回滚。该部分已覆盖。

## 维度 4：acceptance criteria 是否均可表达为 if/then oracle

结论：不通过。

已改善并可测试：

- AC1 明确了 `process.exit(1)` 下的 GREEN oracle；
- AC3 与 state-A `RENAMED` 一致；
- AC4 覆盖 scoped、cross-boundary 和纯范围外 duplicate；
- AC5 可验证不同 change 的 C1 独立性；
- AC7 包含 unexplained non-zero 反例和单次 spawn；
- AC8 覆盖当前 B5 表中四种主路径。

仍缺少：

- 顶层及 `run.duplicates` 的准确 JSON/module oracle；
- post-TAP ERROR 是否携带 `storeReport` 的 oracle；
- `changeScope.requirements` 的元素形状及跨 module 同名 oracle；
- 非 removal-only 合法空范围的 oracle；
- invalid-pattern 路径 0 次 projection/content read，以及其他路径 projection/parse 次数的 oracle。

## 维度 5：是否与当前 state A 冲突

结论：不通过，仅 REQ-7 构成尚未解决的直接冲突。

- REQ-1 已与 Requirement-only `RENAMED` 和 SR-19 对齐。
- REQ-5 已明确成为 D-SR-x 的 scoped amendment，不再是未裁定冲突。
- REQ-7 仍要求 invalid-pattern 路径调用一次 `buildProjection`，与当前 `resolveIdPattern` 优先、enumeration-only early exit 冲突。
- REQ-4 属待明确的目标接口变化，不是已经确定的 state-A 冲突。
- `--specs`、archive、merge、id-pattern timeout 和 matcher threading 均声明保持不变。

## 维度 6：target lineage 是否声明且符合仓库现实

结论：通过。

需求和 flow-state 均声明 `main（v4 产品线；不合并 v1/v3）`；当前仓库确在 `main@10aef21`、package `4.0.7`。对尚未归档 `gate-id-pattern` 的依赖也已记录，并以 workspace code 作为 state A，符合仓库现实。

## r1 issue 逐条复核

- REQ-1：已关闭。`RENAMED` 只改 Requirement 名，场景 ID 保持，AC3 与 SR-19 一致。
- REQ-2：已关闭。Requirement-block provenance、occurrence scope、idempotent unchanged、duplicate/unidentified 边界均已裁定。
- REQ-3：已关闭。store report 已覆盖六类完整评估，范围外信息不会从 verify 输出消失。
- REQ-4：reopen。duplicate 字段归属、ERROR presence matrix 和 `changeScope.requirements` shape 仍未钉死。
- REQ-5：已关闭。explained/unexplained non-zero 的 scoped amendment 和反例均明确。
- REQ-6：reopen。合法的非 removal-only 空范围没有独立语义和 oracle。
- REQ-7：reopen。绝对的一次 projection 与 invalid-pattern state A 冲突，现有 sentinel 只覆盖 spawn。

## Advisories（不计入 verdict）

### ADV-1：gate store summary 可考虑覆盖六类 outstanding

B6 的 gate suffix 只列 `boundRed/unbound/orphan/unattributed`，不列 `duplicates/unidentified`。这不会违反已明确的 gate string shape，但会让 `gate --change` 用户看不到两类 store 级问题；建议至少加入相应 count。

### ADV-2：`runbook-version` 保持 `4.0` 合理

当前 CLI/package major 为 4，CK-11 检查 major 同步。本 change 属同 major 行为细化，更新双语语义文字和 CHANGELOG、保持 `runbook-version: 4.0` 与仓库规则一致。

### ADV-3：真实样本证据应记录执行状态和 matcher 来源

AC6 已要求 HEAD、CLI、命令和计数。建议同时记录 test command exit status、resolved `id-pattern` source/origin，便于复核 B4 的 explained non-zero 分支。

### ADV-4：`won't do` 已满足显式范围外要求

v2 明确继承 v1 的范围外项目，并新增“不改 archive 语义、不改 `merge()`”，范围边界清楚。

## Ledger delta

| ID | Status delta | Reason |
|---|---|---|
| REQ-1 | fixed (v2) → verified | `RENAMED` 已恢复 state-A Requirement-only 语义，AC3 可唯一测试 |
| REQ-2 | fixed (v2) → verified | block provenance、occurrence scope、idempotent path 和分类边界已明确 |
| REQ-3 | fixed (v2) → verified | store report 已声明完整六类评估 |
| REQ-4 | fixed (v2) → open (reopened r2) | 顶层/module `duplicates` 归属、post-TAP ERROR 的 `storeReport` presence、`changeScope.requirements` shape 仍不明确 |
| REQ-5 | fixed (v2) → verified | D-SR-x scoped amendment、exit oracle 和反例均已明确 |
| REQ-6 | fixed (v2) → open (reopened r2) | 非 removal-only 的合法空 scope 未单独裁定，固定 removal-only 文案会误报 |
| REQ-7 | fixed (v2) → open (reopened r2) | “每次恰好一次 buildProjection”与 invalid-pattern 的 state-A early exit 冲突，AC7 未覆盖该路径 |

VERDICT: 3 issues open
