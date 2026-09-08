# Requirement Review v1 — modified-block-integrity

评审对象：`apriori/changes/modified-block-integrity/requirement/req-v1.md`

依据：

- `apriori/truth/archive-merge.md`
- `apriori/truth/spec-runner.md`
- `lib/archive-merge.js`
- `lib/spec-runner.js`
- 当前工作区实际 state A：`main@10aef21` 加两个尚未归档的先行 change：`gate-id-pattern` 与 `verify-change-scope`

评审目标：判断 requirement 是否已经精确到可直接交给 AI 实现。仅将以下问题计入最终 verdict：target state B 歧义、acceptance criteria 不可测试、边界/异常路径缺失、与 state A 冲突。其他意见列为 P0 advisory。

## 总结

需求方向明确：对 MODIFIED 整块替换生成 informative integrity report，不改变 merge、verify、archive 的 verdict、exit code 或写入语义；`verify --change` 提供 human/JSON，archive 提供 human，gate 不消费。显式 out-of-scope section 已存在。

但当前文本仍存在 9 个阻止直接实现的问题，主要集中在：

- 行级算法存在自相矛盾；
- scenario identity、重复 ID、无 ID occurrence 的匹配规则未闭合；
- JSON/human 输出契约不足以形成唯一实现；
- effective id-pattern 与 state A 的 matcher/fail-early 纪律未兼容；
- archive 的两个实际入口未划定范围；
- ERROR/preflight failure 的报告存在性矩阵缺失；
- AC7 使用“若干如实”，没有确定 oracle；
- target lineage 未声明实际依赖的两个未归档 change；
- Q2 与“不改变写入/exit 语义”的硬约束冲突。

## 1. Target state B 是否清晰且无歧义

结论：不通过。

### REQ-1：行级比较算法自相矛盾

描述：

B3 同时规定：

- 使用“逐行子序列”；
- 原行“按序出现在”新场景体；
- “乱序但存在算保留”。

subsequence 必须保持相对顺序，只是不要求连续；“乱序但存在算保留”描述的则是 unordered membership 或 multiset comparison。两种算法对行重排以及重复行会给出不同结果。Q3 又没有裁定比较范围是列表行还是全部非空行。

风险：

AI 无法选择唯一算法。不同实现可能分别采用 LCS/subsequence、Set 或 multiset，导致 `missingLines`、human report 和 JSON 不一致，也无法写出确定测试。

建议修复：

明确选择一种算法并给出伪定义。例如：

- 若顺序重要：对 normalized old lines 做 order-preserving subsequence matching；
- 若乱序仍保留：按 normalized text 做 multiset matching，重复次数必须守恒。

同时明确：

- 是否比较全部非空行；
- 是否排除 scenario heading、空行、围栏内容和内部 Markdown heading；
- CRLF、lone CR、tab、行首空白、行尾空白的 normalization；
- 重复旧行在新体中出现次数不足时，缺失多少次。

删除或裁定 Q3，并为重排、重复行、散文行分别增加 AC。

### REQ-2：scenario identity 与分类集合没有唯一语义

描述：

AC1/AC7 暗示 `retained` 与 `titleChanged` 是互斥分类：9 个场景被分为 retained 7、titleChanged 2。但 B1 的“同 ID 保留”也可以理解为 title-changed scenario 仍属于 retained。以下情况也未定义：

- 同一块内一个 ID 出现多次；
- old/new 两侧 duplicate ID 数量不同；
- 无 ID scenario 的标题变化；
- 标题完全相同但 occurrence 数量不同；
- title-changed scenario 是否继续进行 body line comparison；
- title 比较是否进行 whitespace normalization。

风险：

数组计数、duplicate occurrence 的配对方式以及 `missingLines.scenario` 都可能不一致。当前 schema 只有 ID 字符串，无法无损表达 duplicate 或无 ID occurrence。

建议修复：

定义 occurrence-level matching 算法和互斥分类。例如：

1. 有 ID occurrence 先按 ID 分组；
2. 明确 duplicate ID 是合法逐 occurrence 配对、产生额外 dropped/added，还是报告不可分析；
3. 同 ID 同标题为 `retained`，同 ID 不同标题为 `titleChanged`，两者互斥；
4. `titleChanged` 仍比较 body；
5. 无 ID occurrence 按 normalized full title 做 multiset matching，未配对 occurrence 分别进入 dropped/added；
6. 为每种数组定义能够表达 ID、title、oldTitle/newTitle 和 occurrence index 的元素结构。

增加 duplicate ID、无 ID 标题改变、title-changed 且 body 缺行的 AC。

### REQ-3：输出契约不完整且存在内部冲突

描述：

AC4 只给出了字段名，没有钉死元素类型、排序和存在性。另有以下冲突或空白：

- “每 MODIFIED 一项”与 AC6“零报告行”没有说明 JSON 中 identical MODIFIED 是省略 entry、保留空 entry，还是整个 `modifiedIntegrity` 字段缺省；
- GREEN/GAPS 时数组是恒存在（可为空）还是仅有差异时存在；
- `retained/dropped/added/titleChanged` 是 string[] 还是 object[]；
- `titleChanged` 是否包含 old/new title；
- `missingLines.line` 在 JSON 中是完整文本还是 human 截断文本；
- human 截断长度、ellipsis、排序、section heading、缩进及 `!` 前缀未定；
- 一个 MODIFIED 块文本不同但没有 scenario，或仅改动 scenario 之外的 requirement prose 时，是否输出一个全空 report；
- archive 所谓“同一报告”是与 verify 使用同一数据语义，还是要求 byte-identical human section；
- AC4 中的“archive `--json`？……评审裁”仍是未决问题。

风险：

这是新增的 machine-consumable API。实现者无法产生稳定 schema，消费者和 golden test 也没有唯一 oracle。

建议修复：

增加完整的 JSON schema 示例和 human golden，至少明确：

- `modifiedIntegrity` 在 GREEN/GAPS 恒存在且可能为 `[]`，或明确其他存在规则；
- identical MODIFIED 是否产生 entry；
- 每个字段的元素 shape；
- `titleChanged` 的 old/new 表达；
- JSON 保留完整 line，human 单独按固定长度截断；
- module、requirement、scenario 和 missing line 的排序规则；
- 无 scenario structural difference 的输出规则；
- archive 仅有 human output，明确不新增 `--json`。

裁定 Q1，并将 AC6 扩展为 human 与 JSON 两个 oracle。

### REQ-9：archive confirmation 的开放问题与硬约束冲突

描述：

Q2 询问 dropped 时是否要求 `archive --write` 二次确认 flag；但 B1、B2 和 out-of-scope 已明确报告 informative，且不得改变 archive 的 exit、写入语义。确认 flag 会新增交互、拒绝路径或 usage/exit 行为，直接违反这些硬约束。

风险：

AI 可能按 Q2 增加确认机制，也可能按 out-of-scope 不增加，target state B 不唯一；非交互 CI 下还会产生额外边界行为。

建议修复：

按当前倾向明确裁定“不增加确认或 override flag，含 dropped 的 `--write` 与既有流程完全相同”，删除 Q2。若产品确实需要确认，则必须修改 B1/B2/out-of-scope，并完整定义 TTY、CI、flag、exit code 和 failure atomicity。

## 2. Edge cases 与 exception paths 是否覆盖

结论：不通过。

除 REQ-1、REQ-2 中的行重复、scenario duplicate、无 ID occurrence 等边界外，还有以下缺口。

### REQ-4：effective id-pattern 的失败路径和执行纪律未定义

描述：

需求要求使用 effective `id-pattern`，但没有定义：

- `verify --change --id-pattern`、config row、default 的解析优先级是否完全复用 state A；
- config-origin matcher timeout、signal、spawn error、malformed output 时 integrity report 如何处理；
- archive 没有 `--id-pattern` flag，应使用 config 还是 default；
- archive 遇到 invalid/terminated config pattern 时，是跳过报告并继续、输出 warning，还是改变 preflight 结果。

state A 还要求 config-origin `verify --change` 正常路径只运行两个 matcher batch：一次 projection/sibling titles，一次 TAP descriptions。为 integrity report 单独调用 matcher 会产生第三次 batch，破坏 SR-63 和现有测试。invalid-pattern 路径也必须保持 0 projection/0 content read/0 spawn。

风险：

直接调用 `leadId`/RegExp 可能绕过 catastrophic-pattern 隔离；额外 matcher batch 会与 state A 冲突；若 archive 因 informative report 的 matcher failure 而失败，又违反“不改变 exit/write semantics”。

建议修复：

增加 surface/path matrix：

- verify flag/config/default 的 resolution 与 state A 完全一致；
- integrity titles 必须并入现有第一批 title matcher，不新增 matcher invocation；
- verify 的 invalid-pattern 和 matcher failure 仍走既有 ERROR 路径，ERROR 不带 `modifiedIntegrity`；
- archive 明确 pattern 来源及 matcher failure 行为；若报告必须保持 informative，建议 bounded warning + skip integrity report，同时 archive 原有结果不变；
- 不允许 unbounded inline execution config-origin pattern。

为正常、invalid pattern、matcher timeout、projection failure 各加 invocation-count 和 field-presence AC。

### REQ-5：`archive` 覆盖哪个 CLI form 未声明

描述：

state A 有两个 archive form：

- high-level：`archive --change <name> ...`，使用 `buildProjection()`；
- single-file：`archive --store <f> --delta <f> --change <name> ...`，直接 parse/merge，不经过 `buildProjection()`。

需求笼统写“archive dry-run 与 `--write`”，背景又声称 archive 与 verify 同用 `buildProjection()`；该陈述只适用于 high-level form，不符合完整 state A。

风险：

AI 可能只改 high-level form，也可能同时改 single-file form；两个实现都能自称满足当前文字，用户却会观察到不同产品行为。`file` 字段在 single-file form 中应取 delta path、store path 还是 suffix 也无定义。

建议修复：

显式裁定：

- 两种 archive form 都报告；或
- 仅 high-level form 报告，并把 single-file form 列入 out-of-scope。

若两者都覆盖，分别定义 `file` identity、pattern 来源、human 输出位置以及 dry-run/`--write` 的 AC。

### REQ-6：ERROR 与 preflight failure 的报告存在性矩阵不完整

描述：

AC4 只规定 verify ERROR 缺省。archive 在以下路径是否输出已计算出的 integrity report 未定义：

- malformed/zero-op delta；
- missing MODIFIED target；
- duplicate store requirement；
- CAS mismatch；
- unstamped mutation denial；
- 同一 change 中另一 module 冲突；
- rerun repair；
- temp pre-exists；
- staging、commit 或 move failure。

B1 的“每个 MODIFIED 都报告”与“preflight 输出”可能要求失败时也报告，但有些失败路径不存在可信 baseline，有些则已经完成了比较。

风险：

错误路径可能泄露半可信报告、遗漏本可用诊断，或因为为了报告而改变 fail-fast/read order。多 module change 在部分失败时尤其不确定。

建议修复：

给出存在性矩阵。建议至少区分：

- parse/validation/baseline 不可信：不产生该 entry；
- merge conflict/CAS mismatch：是否允许基于同一已读 snapshot 产生 informative entry；
- clean preflight：在 RESULT 前输出；
- stage/commit/move failure：复用已完成的 preflight report，不重新读取；
- verify 所有 ERROR：按 AC4 全部缺省。

同时说明任何报告计算失败都不得改变 archive 的既有 code、write jobs 或 transaction ordering。

## 3. 是否有 implied but undeclared state changes 或 side effects

结论：不通过。

计入 verdict 的问题为 REQ-4 与 REQ-9。

需求已明确禁止改变 store、verdict、exit code 和写入语义，这是好的；但 archive 为识别 effective `id-pattern` 可能新增 config read 和 matcher child process，尚未声明。若选择 confirmation flag，则还会新增交互和拒绝写入路径。

建议在需求中明确 integrity analysis 的允许副作用边界：

- 可复用当次已读 store/delta snapshot；
- 不二次读取 store/delta；
- 不运行 test command；
- 不新增持久化；
- config-origin matcher 允许 bounded child process，但其失败不得改变 archive 结果；
- 不新增 prompt、confirmation 或 override flag。

## 4. 每条 acceptance criterion 是否均为可测试的 if/then

结论：不通过。

REQ-1、REQ-2、REQ-3 已导致 AC1、AC2、AC6 的 oracle 不完整。

### REQ-7：AC7 不是确定 oracle

描述：

AC7 规定 `missingLines 若干如实`。这没有给出预期数量、scenario、完整 line 文本、顺序或 human truncation，因此无法形成 pass/fail assertion。“真实 delta”目前还是活跃 change 中的可变文件，未来归档后路径也会改变；“作为测试 fixture 固化”没有指定复制后的 fixture 内容和固定位置。

风险：

测试可以只断言字段存在或任意非空，从而在漏报、误报、顺序错误时仍通过。后续归档或修改 `verify-change-scope` 会让测试漂移。

建议修复：

把 state A store block 与 delta block复制成独立 immutable fixture，并在 AC7 中列出完整 oracle：

- `retained` 的 7 个具体 ID；
- `titleChanged` 的 2 个 object，包括 old/new title；
- `dropped=[]`、`added=[]`；
- `missingLines` 的精确长度及每个 `{scenario,line}`；
- 数组排序；
- human report 的关键完整行或 golden；
- JSON 的完整 `modifiedIntegrity` entry。

AC3 也应改为可直接断言的条件：同一 fixture 下明确期望 verify exit/result 和 archive code/最终 RESULT 文本，而不是依赖不存在的“关闭报告”运行模式进行比较。

## 5. 是否与 current state A 冲突

结论：不通过。

### 已确认冲突

- REQ-4：若新增独立 matcher pass，会破坏 config-origin `verify --change` 的 exactly-two-batches 契约和 SR-63。
- REQ-5：需求声称 archive 共用 `buildProjection()`，但 single-file archive 实际直接 parse/merge。
- REQ-9：confirmation flag 会改变需求同时承诺保持不变的 archive write/exit semantics。

### REQ-8：需求依赖的实际 state A 未进入 target lineage

描述：

文件声明 `target lineage: main`，但当前实现基础不是纯 `main@10aef21`：

- `gate-id-pattern` 已在 `lib/` 引入 `resolveIdPattern`、config-origin bounded matcher 与 fail-early 纪律；
- `verify-change-scope` 已在 `lib/archive-merge.js` 增加 `deltaOps`，并在 `lib/spec-runner.js` 增加 `storeReport`、`changeScope` 及 matcher batch 约束；
- 两个 change 均尚未归档/提交，truth KB 也没有完整反映这些工作区行为。

本 requirement 实际已经依赖这些能力，例如“effective id-pattern”、`buildProjection` 同 snapshot 数据以及 GREEN/GAPS-only JSON 扩展点。

风险：

AI 若严格按 `main` 或旧 KB 实现，会覆盖或绕开未归档机制；若按当前 `lib/` 实现，则与声明的 lineage 不一致。归档顺序不同还可能改变 fixture 与 CAS baseline。

建议修复：

将 lineage 明确写为类似：

`target lineage: main@10aef21 + gate-id-pattern req-final/implementation + verify-change-scope req-final/implementation（均为 required state A predecessors；不得基于纯 main 实现）`

并声明：

- 两个先行 change 的归档/落地顺序；
- 本 change 是否允许在它们仍 active 时实现；
- truth KB 与 `lib/` 冲突时以哪些具体 state A contract 为准；
- 不得破坏 `deltaOps/storeReport/changeScope` 与 matcher invocation guarantees。

## 6. Target lineage 是否声明且符合 repo reality

结论：不通过。

已有 `target lineage` 行，但内容只写 `main（v4 产品线）`，没有表达当前工作区的 composite lineage，因此不符合 repo reality。详见 REQ-8。

## Explicit out-of-scope 检查

结论：通过。

需求存在明确的 `## 范围外（won't do）` section，并覆盖：

- 不改变 verdict、exit code、写入语义；
- 不自动合并或补回；
- 不扩展到 ADDED/REMOVED/RENAMED；
- 不做跨块移动检测；
- 不改 hotfix 与前两个 change 的语义。

需要在修订时把 single-file archive 是否覆盖、confirmation flag 的最终裁定以及 matcher failure policy一并纳入 target/out-of-scope 边界。

## P0 advisories（不计入 verdict）

### P0-1：不要把存量测试数量作为长期产品契约

AC8 的“306 存量测试全绿”符合当前工作区事实，但测试数量会自然增长。建议写成“完整存量 suite 全绿；本轮基线为 306 tests”，避免未来新增测试导致 requirement 文义失真。

### P0-2：明确文档文件名

“docs/cli 双语”建议直接写为 `docs/cli.md`、`docs/cli_cn.md`，并明确是否还需同步 `RUNBOOK.md`、`RUNBOOK_cn.md`。当前 AC8 与 out-of-scope 没有完全列明后两者。

### P0-3：将 integrity analyzer 定义为 pure helper

建议要求一个以 old block、new block、resolved identity results 为输入的 pure helper，由 verify 和 archive 共用。这样更容易证明：

- 不影响 `merge()`；
- 不二次读取；
- 两个 surface 数据语义一致；
- unit test 不依赖 CLI 或 filesystem。

这是实现建议，不要求锁定具体函数名或文件位置。

### P0-4：human output 应处理控制字符和超长文本

delta 内容属于 repository input。除固定截断长度外，建议要求 human renderer 对 control characters 做可见化或安全替换，避免一条 requirement line 操纵终端展示；JSON 保留完整语义文本。

### P0-5：将“默认不改变 verdict/exit”改为“始终不改变”

当前没有声明 strict mode 或 enforcement flag。“默认”会暗示存在未声明模式。建议改为“该报告在所有 surface 上始终 informative，不参与 verdict/exit/write decision”。

## Ledger delta

| ID | Dimension | 状态 | 摘要 |
|---|---|---|---|
| REQ-1 | 1, 2, 4 | open | subsequence 与 unordered preservation 冲突，line normalization/scope 未闭合 |
| REQ-2 | 1, 2, 4 | open | scenario identity、titleChanged、duplicate ID、无 ID occurrence 语义未定义 |
| REQ-3 | 1, 4 | open | JSON/human schema、排序、截断及 identical entry 存在性不确定 |
| REQ-4 | 2, 3, 5 | open | effective id-pattern failure policy 未定义，并可能破坏 state A matcher 调用纪律 |
| REQ-5 | 1, 2, 5 | open | archive high-level 与 single-file form 的覆盖范围不明 |
| REQ-6 | 2, 4 | open | archive ERROR/preflight failure 的 report 存在性矩阵缺失 |
| REQ-7 | 4 | open | AC7 的“missingLines 若干如实”不是确定 oracle，fixture 也未固定 |
| REQ-8 | 5, 6 | open | target lineage 未包含两个未归档先行 change，不符合实际 state A |
| REQ-9 | 1, 3, 5 | open | Q2 confirmation flag 未裁定且与既定 informative/write semantics 冲突 |

VERDICT: 9 issues open
