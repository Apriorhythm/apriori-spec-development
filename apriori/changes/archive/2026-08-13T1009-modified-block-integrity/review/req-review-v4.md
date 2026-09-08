# Requirement Review v4 — modified-block-integrity

评审对象：`apriori/changes/modified-block-integrity/requirement/req-v4.md`

依据：

- `apriori/truth/archive-merge.md`
- `apriori/truth/spec-runner.md`
- 当前工作区 `lib/archive-merge.js`
- 当前工作区 `lib/spec-runner.js`
- 当前工作区 `lib/config.js`
- `bin/apriori.js`
- round-3 ledger REQ-1..11

评审口径：仅将 ambiguous target state、untestable acceptance criteria、missing edge/boundary coverage、state-A conflicts 计入最终结论。

## 总结

req-v4 已关闭 round 3 剩余的两个问题，当前目标态足够精确，可以进入 spec/design 与实现：

- `ambiguous` 的 cardinality、分类互斥、字段和值域及 mixed old/new ordering 均已确定；
- archive warning 的组装顺序、sanitization、控制字符替换、长度单位和输出通道均已固定；
- structural scanner 与 state-A `SCENARIO_RE`、`stripFences()` 的实际行为一致；
- closed fence、unclosed fence、whitespace-flexible heading、rename-then-modify 均有明确 oracle；
- verify matcher batch、archive degradation、JSON presence、human significance、exit/write invariants 均已闭合；
- target lineage 和 out-of-scope 与 repo reality 一致。

未发现新的正式 issue。

## 1. Target state B 是否清晰且无歧义

结论：通过。

关键 target semantics 均有唯一解释：

- line normalization 与 greedy order-preserving subsequence 唯一确定；
- duplicate line 按 occurrence consumption；
- ID key 与 normalized-title key 共用同一 cardinality truth table；
- ambiguous key 不进入其他分类且不做 body comparison；
- Requirement heading、prose、scenario body 和 fence boundary 明确；
- JSON entry shape、field value、ordering、presence 和 full-text policy 明确；
- human significance、prefix 与 truncation 明确；
- rename-then-modify 的 baseline/name/missing-line behavior 明确。

REQ-3 的 mixed ordering 已闭合：old-present keys 按 old first occurrence，new-only keys随后按 new first occurrence。

## 2. Edge cases与 exception paths 是否覆盖

结论：通过。

已覆盖的关键边界包括：

- cardinality truth table 全八行；
- old/new/both ambiguity；
- ID 与无 ID title keys；
- titleChanged 后继续比较 body；
- whitespace-only 差异；
- reordered lines；
- duplicate lines 数量不足；
- Requirement prose；
- closed fence 内 fake scenario heading；
- unclosed fence 后 scenario heading 继续生效；
- multi-space/tab scenario heading；
- rename-then-modify 不因 Requirement heading 改名而误报；
- identical rerun；
- verify ERROR；
- archive preflight failure与 partial-module failure；
- custom/default/invalid config pattern；
- bounded matcher failure；
- single-file archive 明确 out of scope。

REQ-10 已与实际 state A 一致：只有 closed triple-backtick pairs 被 `stripFences()` 移除；unclosed opener 留作普通文本，后续符合 `SCENARIO_RE` 的 heading 仍被识别。

## 3. 是否有 implied but undeclared state changes 或 side effects

结论：通过。

需求明确限制了所有新增行为：

- report 始终 informative；
- 不改变 `merge()`；
- 不改变 verify/archive verdict、exit code 或 write semantics；
- 不新增 confirmation/override flag；
- 不新增 archive `--json`；
- gate 不消费；
- verify 不增加 matcher batch；
- archive 仅新增可终止 matcher invocation；
- config/matcher failure 只产生 bounded stderr warning 并跳过报告；
- 不二次读取 comparison snapshot；
- single-file archive 保持不变。

没有发现隐含持久化、额外交互或未声明的 gate behavior。

## 4. 每条 acceptance criterion 是否均为可测试的 if/then

结论：通过。

AC 已形成确定 oracle：

- AC1：四种互斥 scenario classification；
- AC2：normalization、ordering、duplicates、fence 与 prose；
- AC3：完整 cardinality table、ambiguous values 和 mixed ordering；
- AC4：GREEN exit 0、GAPS exit 1、archive dry-run exit 0、RESULT 与 write bytes；
- AC5：JSON `deepStrictEqual`、empty diff entry 与 presence matrix；
- AC6：matcher invocation count、fail-early、archive pattern paths 和完整 warning string；
- AC7：frozen fixture 加人工独立推导的 literal expected object；
- AC8：rename、closed/unclosed fence 和 whitespace-flexible heading；
- AC9：archive human/preflight/write ordering；
- AC10：compatibility、docs、RUNBOOK、CHANGELOG 和 self-check。

REQ-11 维持 verified。

## 5. 是否与 current state A 冲突

结论：通过。

req-v4 与实际 state A 一致：

- scenario heading 使用 `^####\s+Scenario:\s+(.*)$` 语义；
- closed/unclosed fence 行为与当前 `stripFences()` 一致；
- config resolution 沿用 `flag > config > default`，archive 无 flag；
- `sanitizeMsg()` 将控制字符替换为 `·`，完整结果最多 200 UTF-16 code units；
- verify config-origin 路径仍恰好两个 matcher batches；
- invalid pattern 仍在 projection/content read 前失败；
- `archive-merge` 不反向依赖 `spec-runner`；
- `deltaOps`、`storeReport` 和 change-scoped verdict 保持；
- gate、single-file archive、merge 与 transaction semantics 不变。

REQ-3 与 REQ-10 均可转为 verified。

## 6. Target lineage 是否声明且符合 repo reality

结论：通过。

lineage 已准确声明：

- 目标为 `main` v4 产品线；
- v1/v3 明确指 legacy product lines，而非 requirement revision；
- `gate-id-pattern` 是 matcher/config 前置 state A；
- `verify-change-scope` 是 `deltaOps`、single-title-batch、`storeReport` 前置 state A；
- 当前工作区代码是 specification/design 的实际基线；
- 三个 changes 按依赖顺序归档。

## Explicit out-of-scope 检查

结论：通过。

显式 `## 范围外（won't do）` section 存在，并明确排除：

- single-file archive；
- archive `--json`；
- gate consumption；
- confirmation/override flag；
- 自动合并或补回；
- ADDED/REMOVED/RENAMED 独立检查；
- 跨块移动检测；
- Requirement prose 新增行报告；
- hotfix 与 legacy product lines；
- merge/verdict/exit/write semantic changes。

## P0 advisories（不计入结论）

### P0-1：清理 AC3 的示例记法

AC3 中的 `newCount:0..` 不是合法 JSON-like notation。cardinality table 和 table-driven test 已使语义确定，因此不构成正式问题；建议实现前将该示例改为一个具体 row，例如 `newCount:0`。

### P0-2：实现阶段保留完整 human golden

需求裁定记录已要求完整 human golden。建议 golden 同时包含 `titleChanged`、`dropped`、`ambiguous`、`missingLines`、retained/added counts 和 120-unit truncation，以证明 verify/archive renderer 使用同一数据语义。

## Ledger delta

| ID | r3 状态 | r4 状态 | 复核结论 |
|---|---|---|---|
| REQ-1 | verified | verified | line algorithm、normalization、duplicate consumption 与 comparison scope 保持闭合 |
| REQ-2 | verified | verified | cardinality truth table、互斥分类及 ambiguous skip 规则保持闭合 |
| REQ-3 | reopened | verified | ambiguous ordering 与完整 warning sanitization/cap oracle 已确定 |
| REQ-4 | verified | verified | verify batch discipline 与 archive matcher/config paths 保持完整 |
| REQ-5 | verified | verified | high-level archive 专属，single-file form 明确 out of scope |
| REQ-6 | verified | verified | GREEN/GAPS、ERROR、archive preflight 与 rerun presence matrix 完整 |
| REQ-7 | verified | verified | frozen fixture 与 hand-derived literal expected value 明确 |
| REQ-8 | verified | verified | composite state-A lineage 与 repo reality 一致 |
| REQ-9 | verified | verified | 无 confirmation/override flag，write/exit semantics 不变 |
| REQ-10 | open | verified | unclosed fence 与 whitespace-flexible heading 已修正为实际 state-A behavior |
| REQ-11 | verified | verified | GREEN/GAPS/archive direct oracle 保持确定 |

VERDICT: no major issues
