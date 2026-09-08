# Requirement Review v2 — modified-block-integrity

评审对象：`apriori/changes/modified-block-integrity/requirement/req-v2.md`

依据：

- `apriori/truth/archive-merge.md`
- `apriori/truth/spec-runner.md`
- 当前工作区 `lib/archive-merge.js`
- 当前工作区 `lib/spec-runner.js`
- `bin/apriori.js`
- round-1 review ledger REQ-1..9

评审口径：仅将 target state 歧义、不可测试的 acceptance criterion、缺失的边界/异常路径、与实际 state A 冲突计入最终 verdict。其他建议列入 P0 advisories。

## 总结

req-v2 已实质解决 round 1 的大部分问题：

- 行级比较已收敛为确定的 greedy order-preserving subsequence；
- normalization、重复行消费、fenced content、requirement prose 已纳入目标；
- JSON 存在性、排序、空 diff entry、完整文本与 human 截断基本明确；
- verify 保持现有 matcher batch 数；
- archive 明确只覆盖 high-level form；
- ERROR/preflight presence matrix 已建立；
- confirmation flag 已明确排除；
- lineage 已反映两个未归档前置 change。

仍有 5 个 open issues。最重要的是无 ID occurrence 的 `ambiguous` 规则与 multiset 配对规则直接冲突，以及 requirement prose 的边界可能把 Requirement heading 本身纳入比较，从而让 rename-then-modify 产生伪缺失。另有若干 machine schema 和 matcher acceptance oracle 尚未闭合。

## 1. Target state B 是否清晰且无歧义

结论：不通过。

### REQ-2 reopened：无 ID occurrence 的分类规则互相冲突

描述：

B1 第 1 条规定：

> 无 ID 场景同规范化标题出现次数不一 → 记入 `ambiguous`，不进其他类。

但第 3 条又规定：

> 无 ID 场景按规范化全标题多重集配对；配上的 retained，未配上的分别 dropped/added。

例如旧块有两个同标题无 ID occurrence，新块有一个：

- 按第 1 条：整个标题进入 `ambiguous`，不得进入其他类；
- 按第 3 条：一个 occurrence 为 `retained`，另一个为 `dropped`。

两个结果互斥。

有 ID duplicate 的 `ambiguous` 规则也未完全定义：只说“同一 ID 出现 >1 次”，没有明确是在任一侧出现即 ambiguous，还是仅某一侧；双方都 duplicate 时，是一个 `ambiguous` entry 还是 old/new 各一个。

风险：

同一输入会得到不同分类、不同 JSON 和不同 human report。`ambiguous` 是否阻止 body comparison 也会随实现选择而变化。

建议修复：

给出唯一的 occurrence cardinality truth table，例如：

| old count | new count | 分类 |
|---:|---:|---|
| 0 | 1 | added |
| 1 | 0 | dropped |
| 1 | 1 | 正常配对 |
| 0 | >1 | ambiguous(new) |
| >1 | 0 | ambiguous(old) |
| >1 | 1 | ambiguous(old) |
| 1 | >1 | ambiguous(new) |
| >1 | >1 | ambiguous(both) |

然后明确同一规则是否同时适用于 ID key 与无 ID normalized-title key。若保留 `ambiguous`，发生 ambiguity 的 key 应完全跳过 retained/dropped/added/titleChanged 和 body comparison。

### REQ-3 reopened：machine/human 输出仍有未定义值

描述：

B4 已明确数组结构，但以下字段仍没有唯一值：

- `ambiguous[].side` 的允许值未定义，例如 `"old" | "new" | "both"`，也没有 count；
- `retained[].title` 在 old/new 原始标题只存在 whitespace 差异、规范化后相等时，应取 old title、new title还是 normalized title；
- `file` 未明确是 store-relative delta suffix、change-relative path、绝对 delta path还是 store path；
- `idOrTitle` 没有说明有 ID ambiguity 时放 ID，无 ID ambiguity 时放原始标题还是 normalized title；
- human significance wording存在歧义：一方面说 `titleChanged` 有“单行提示”，另一方面又说没有 dropped/missingLines/ambiguous 时整段静默。因此仅有 `titleChanged` 时究竟打印提示还是完全静默并不唯一；
- “120 字符 + `…`”没有说明最大输出长度是 120（119+ellipsis，state A 的既有惯例）还是 121（120+ellipsis），也没有明确按 JS UTF-16 code unit、Unicode code point 还是 display width 截断；
- bounded archive warning 没有固定最大长度、输出通道或稳定前缀。

风险：

`deepStrictEqual`、golden test 和 downstream JSON consumer 无法构造唯一 oracle；不同 AI 实现会产生 shape 相同但内容不同的结果。

建议修复：

补充以下确定契约：

- `file = delta/store-relative suffix`，例如 `spec-runner/spec.md`；
- `side ∈ {"old","new","both"}`，并定义何时取每个值；
- `idOrTitle`：有 ID 时为 ID；无 ID 时为 normalized title；
- `retained.title` 固定取 old 原始 title，或改为显式 `oldTitle/newTitle`；
- 仅有 `titleChanged` 时明确静默或打印；
- human 截断沿用 state A：JS `length > 120` 时 `slice(0,119) + "…"`，最终最多 120 UTF-16 code units；
- archive matcher warning 固定在 stderr、固定前缀并规定最大长度。

### REQ-10 new：requirement/scenario body 的结构边界没有钉死

描述：

B1 将 Requirement prose 定义为“块首至第一个场景标题之间”。按字面，块首包含：

```text
### Requirement: <name>
```

这会使 Requirement heading 本身参与 line comparison。对 AC8 的 rename-then-modify：

- old baseline heading 为 `### Requirement: A`；
- new MODIFIED heading 为 `### Requirement: G`。

如果 heading 属于 prose，系统会把旧 heading 报为 `missingLines[{scenario:null,...}]`，即使真正的 prose 完全保留。这与“对比基线为原 A 块、报告挂在 G 名下”的目的不一致。

此外，需求要求 fenced content 参与 line comparison，却没有定义 fenced content 中形如 `#### Scenario:` 的行是否是 scenario delimiter。state A 的 scenario collection 会先排除 triple-backtick fence，因此 fence 内 heading 不是场景；integrity parser 若直接扫描原块，则可能产生不同切分。以下边界也未明确：

- scenario body 到下一个有效 `#### Scenario:` 之前还是到任意 h4；
- closing/opening fence delimiter 自身是否作为非空 body line 比较；
- unclosed fence 如何处理；
- 块内 `#### Scenario:` 的 exact syntax 是否继续沿用 state A。

风险：

rename-then-modify 会产生确定的 false positive；含示例 Markdown 的 requirement 可能被切成虚假 scenario，甚至使用与 verify binding 不同的 scenario picture。

建议修复：

定义结构扫描规则：

1. Requirement heading 永不进入 prose comparison；
2. Requirement prose 从 heading 后第一行开始，到第一个有效 scenario heading 前结束；
3. scenario body 从该 heading 后开始，到下一个有效 scenario heading或 block end；
4. scenario delimiter 使用 state A exact syntax；
5. triple-backtick fence 内的 scenario-looking line不是 delimiter，但 fence delimiter和其内部非空行都是当前 prose/body 的比较行；
6. 明确 unclosed fence 按 state A 的哪种 fail-open/fail-closed 行为处理。

为 rename-then-modify 无伪 heading 缺失、fence 内伪 scenario heading 两个案例增加 AC。

## 2. Edge cases 与 exception paths 是否覆盖

结论：不通过。

REQ-2 和 REQ-10 涉及 duplicate cardinality、fenced heading 和 rename boundary 等关键边界。

### REQ-4 reopened：archive 的 id-pattern 路径缺少完整 acceptance coverage

描述：

B2 已正确声明 archive 使用 config > default，并通过 bounded matcher channel 执行；但 AC6 只覆盖“注入 matcher 失败”，没有覆盖：

- 合法 custom config pattern 确实被 archive 使用，而不是误回退 default；
- invalid config row 在 matcher 构造前失败；
- config-origin matcher timeout/signal/malformed-output；
- 无 config 时 default pattern 的正向路径；
- warning 的 stream、最大长度和稳定前缀。

“matcher 失败”不能自动覆盖 invalid config，因为 invalid regex 在 `resolveIdPattern` 阶段失败，matcher 根本不会建立。当前 archive 还没有 `id-pattern` consumer，这些都是本 change 新增的产品路径，不能只依赖 verify 的既有测试。

风险：

archive 可能始终使用 default matcher、把 invalid config 当作 matcher failure、执行未受限 regex，或因 warning formatting 泄露无界 repository input，而现有 AC 仍可能通过。

建议修复：

扩展 AC6，至少包括：

- custom config pattern 能识别 default 无法识别的 ID，并产生正确 integrity report；
- absent config 使用 default；
- invalid config：既有 archive RESULT/code/write behavior 不变，仅输出固定 bounded warning并跳过报告；
- timeout、signal、malformed child output：同样 warning + skip；
- 每条失败路径断言 matcher/test spawn 数、warning stream/长度，以及 store/change-dir 结果不变。

## 3. 是否存在 implied but undeclared state changes 或 side effects

结论：通过。

req-v2 已声明 archive 为识别 config-origin ID 可在 bin seam 使用可终止 matcher child process，并明确：

- 不新增 matcher dependency 到 `archive-merge`；
- 不新增 archive JSON；
- 不新增 confirmation/override flag；
- matcher failure 只 warning + skip；
- 不改变 verdict、exit、写入或 gate 语义。

除 REQ-3 中 warning channel 尚需明确外，没有发现新的持久化状态变化或未声明外部副作用。

## 4. 每条 acceptance criterion 是否均为可测试的 if/then

结论：不通过。

### REQ-11 new：AC4 仍没有确定的 verdict/exit oracle

描述：

AC4 表述为：

> AC1/AC2 fixture 的 verify exit 与报告前完全一致。

但 AC1/AC2 没有定义 test command/TAP output，因此无法推导该 verify 运行应是 GREEN、GAPS 还是 ERROR。“与报告前一致”还依赖另一个 state-A executable 或预先捕获的 golden；需求没有声明该 golden 的具体值或路径。

archive 的“`--write` 写入行为不变”同样没有给出最终 store bytes、write call sequence 或目标 change-dir 状态。

风险：

测试只能比较当前实现与另一个未指定版本，或者只断言“没有明显变化”，不能独立判断实现是否符合 requirement。报告逻辑若意外改变 exit code，也可能因错误的 baseline capture 而被共同接受。

建议修复：

将 AC4 改成直接 oracle。例如为 fixture 固定 TAP：

- 当 scoped scenarios 均有 passing TAP 时，`verify --change` 为 GREEN exit 0，加入报告前后相同；
- 当某 scoped scenario 无结果时，为 GAPS exit 1；
- projection/matcher ERROR 仍 exit 2；
- archive dry-run code 0 且 RESULT 完整字符串固定；
- archive `--write` code 0，最终 store bytes 等于既有 `renderStore(merge(...))` 的固定 golden，change-dir move行为按现有调用形式固定；
- gate human/JSON 与 state-A golden byte-identical。

可以保留 state-A golden regression，但不能让它成为唯一 oracle。

AC7 的 frozen fixture + literal `deepStrictEqual` 方向已足以关闭 round-1 REQ-7；测试实现时应确保 expected object 是独立硬编码，而不是调用 production analyzer 计算 expected。

## 5. 是否与 current state A 冲突

结论：通过。

本轮设计已与实际 state A 对齐：

- verify 仍保持 config-origin 的两个 matcher batch；
- invalid-pattern 仍先于 projection/content read；
- integrity 数据可随现有 projection snapshot 传递，不要求二次读取；
- `archive-merge` 不反向依赖 `spec-runner`；
- single-file archive 明确不变；
- gate 不消费；
- JSON ERROR presence 与现有 `storeReport/changeScope` 纪律一致；
- informative report 不进入 merge/verdict/write decision。

REQ-10 若不修复会产生产品 false positive，但不是当前 state A API 冲突。

## 6. Target lineage 是否声明且符合 repo reality

结论：通过。

lineage 已声明：

- 基线为 `main` v4；
- state A 包含未归档的 `gate-id-pattern`；
- state A 包含未归档的 `verify-change-scope`；
- spec/design 以当前工作区代码为事实；
- 三个 change 按前置关系顺序归档。

这与当前 repo 的 dirty worktree、`lib/` 已包含 matcher/deltaOps/storeReport 的现实一致。REQ-8 可关闭。

## Explicit out-of-scope 检查

结论：通过。

显式 `## 范围外（won't do）` section 存在，并新增明确排除：

- single-file archive form；
- archive `--json`；
- 跨块移动检测；
- Requirement prose 的新增行报告。

原有不改变 merge/verdict/exit/write semantics、无自动补回、gate 不消费等边界继续有效。

## P0 advisories（不计入 verdict）

### P0-1：存量测试数量应作为本轮基线而非永久契约

AC10 的“306 存量测试绿”符合当前 state A，但建议改为：

> 完整存量 suite 全绿；本轮基线为 306 tests。

这样后续增加本 change 测试后不会让文义过期。

### P0-2：AC7 expected value 必须独立于 production analyzer

`deepStrictEqual` 的 expected object 应作为 literal fixture/golden 固定，不能在测试中调用同一个 analyzer 或同构 helper 生成，否则实现与 oracle 可同时犯错。

### P0-3：建议同步 RUNBOOK 双语

该能力直接机械化 RUNBOOK 中的人工保真检查。除 `docs/cli.md`、`docs/cli_cn.md` 和 CHANGELOG 外，建议同步 `RUNBOOK.md`、`RUNBOOK_cn.md`，说明报告 informative、不阻断 archive。

### P0-4：建议将 analyzer 保持为 pure shared helper

建议由 archive projection 层生成 old/new block snapshot，由 pure analyzer 消费已经解析和匹配的 title identities。verify/archive 只负责 matcher orchestration 与 rendering。这有助于证明：

- store/delta 不二次读取；
- `merge()` 语义不变；
- 两个 surface 使用同一数据语义；
- config-origin matcher 不会被 pure helper 私自执行。

## Ledger delta

| ID | r1 状态 | r2 状态 | 复核结论 |
|---|---|---|---|
| REQ-1 | open | verified | greedy order-preserving subsequence、normalization、重复行消费和比较范围已明确 |
| REQ-2 | open | reopened | 无 ID count mismatch 的 ambiguous 规则与 multiset retained/dropped/added 规则直接冲突；duplicate side/cardinality 未闭合 |
| REQ-3 | open | reopened | schema 已大幅补齐，但 `side`、`file`、retained title、仅 titleChanged 的 human 行为及 warning/truncation 仍无唯一值 |
| REQ-4 | open | reopened | matcher 调用纪律已闭合，但 archive custom/default/invalid/timeout 等新消费路径缺少完整 acceptance coverage |
| REQ-5 | open | verified | high-level archive 专属，single-file form 已明确 out of scope |
| REQ-6 | open | verified | GREEN/GAPS、ERROR、archive preflight、partial failure、idempotent presence matrix 已明确 |
| REQ-7 | open | verified | frozen fixture 与 literal deepStrictEqual 已形成可执行回归方向 |
| REQ-8 | open | verified | lineage 已反映两个未归档前置 change 和实际工作区 state A |
| REQ-9 | open | verified | confirmation/override flag 已明确不做，写入与 exit semantics 不变 |
| REQ-10 | — | new open | Requirement heading、scenario body boundary及 fenced scenario-looking line 的解析规则未定义 |
| REQ-11 | — | new open | AC4 仍以未指定的“报告前行为”为唯一比较对象，缺少直接 GREEN/GAPS/ERROR 与写入 oracle |

VERDICT: 5 issues open
