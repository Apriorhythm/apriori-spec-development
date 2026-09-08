# Requirement Review v3 — modified-block-integrity

评审对象：`apriori/changes/modified-block-integrity/requirement/req-v3.md`

依据：

- `apriori/truth/archive-merge.md`
- `apriori/truth/spec-runner.md`
- 当前工作区 `lib/archive-merge.js`
- 当前工作区 `lib/spec-runner.js`
- 当前工作区 `lib/config.js`
- `bin/apriori.js`
- round-2 ledger REQ-1..11

评审口径：仅将 ambiguous target state、untestable acceptance criteria、missing edge/boundary coverage、state-A conflicts 计入最终结论。其他建议单列为 P0 advisories。

## 总结

req-v3 已关闭 round 2 的大多数问题：

- cardinality truth table 已统一覆盖 ID 与 normalized-title keys；
- ambiguous key 明确跳过其他分类及 body comparison；
- JSON 字段取值、human significance、截断规则明显收紧；
- archive custom/default/invalid/matcher-failure 路径已有 acceptance coverage；
- Requirement heading、closed fence 与 rename-then-modify 边界已声明；
- AC4 已改为直接的 GREEN/GAPS/archive oracle；
- 四条 advisory 均已吸收。

仍有 2 个正式问题：

1. `ambiguous` 排序以及 archive warning 的 sanitization/cap 仍没有唯一 machine oracle；
2. unclosed fence 和 scenario-heading syntax 所宣称的 state-A 行为与实际 `spec-runner.js` 冲突。

## 1. Target state B 是否清晰且无歧义

结论：不通过。

### REQ-3 reopened：部分输出值仍不能唯一确定

描述：

B4 规定“场景类按旧块出现序，added 按新块出现序”，但没有给出 `ambiguous` 的完整排序规则。

对于 `o=0,n>1` 的 new-only ambiguous key，不存在旧块出现位置；当数组同时包含 old-present ambiguous keys 和多个 new-only ambiguous keys 时，可产生多种合理顺序：

- union-map insertion order；
- key lexical order；
- old-present keys 后追加 new-only keys；
- 全部按新块顺序。

现有 AC3 只有单个 old-side ambiguous entry，无法裁决这些实现。

archive warning 也仍有两处不一致：

- requirement 写“经 `sanitizeMsg`”同时又写“控制字符剥离”；实际 state A 的 `sanitizeMsg()` 将控制字符替换为 `·`，不是删除；
- `≤200` 没有明确约束完整 stderr line，还是仅约束固定前缀之后的 reason。若先 sanitize reason 再拼接 prefix，总行长会超过 200；若对完整字符串调用 `sanitizeMsg`，则总长不超过 200。

风险：

同一输入可产生不同 `ambiguous` 数组顺序和不同 warning bytes。`deepStrictEqual`、warning bounded assertion 和 downstream machine consumer 没有唯一 oracle。

建议修复：

明确：

- `ambiguous` keys 中，`o>0` 的项按旧块首次出现顺序排列，其后追加 `o=0` 的 new-only keys，并按新块首次出现顺序排列；
- 完整 warning line 先组成 `warning: modified-integrity <reason>`，再将完整字符串传入 state-A `sanitizeMsg()`；
- 控制字符按 state A 替换为 `·`，不是删除；
- 最终完整 stderr line 长度不超过 200 UTF-16 code units。

AC3 增加混合顺序案例；AC6 对 warning 做完整字符串和长度 oracle。

## 2. Edge cases 与 exception paths 是否覆盖

结论：不通过。

### REQ-10 remains open：unclosed fence 规则与实际 state A 冲突

描述：

B1 第⑥条规定：

> 未闭合 fence 沿用 state A 语义：其后内容全部归入当前围栏，不再切分场景。

实际 state A 并非如此。`lib/spec-runner.js` 当前实现为：

```js
function stripFences(text) {
  return text.replace(/```[\s\S]*?```/g, '');
}
```

该正则只移除存在 closing delimiter 的匹配。unclosed opener 不会匹配、不会移除；后续 `#### Scenario:` 仍会被 `scanTitles()` 识别。因此“unclosed fence swallows the tail”不是沿用 state A，而是新的、不同的 scenario picture。

第④条也把有效标题描述为精确字面语法 ``#### Scenario: ` ``，但 state A 实际使用：

```js
/^####\s+Scenario:\s+(.*)$/gm
```

它允许 `####` 与 `Scenario:` 之间以及冒号后的一个或多个 whitespace。按字面实现 req-v3 会与 verify 当前收集到的 scenario set 不同。

AC8 只覆盖 closed fence 中的 fake heading，没有覆盖：

- unclosed fence 后的 scenario-looking heading；
- state-A regex 接受的多空格或 tab 形式。

风险：

integrity analyzer 与 verify 对同一 block 得到不同的 scenario occurrences。旧标题 matcher payload、分类和 `missingLines` 可能与实际 projected scenario binding 不一致；若为满足 req-v3 而修改 `stripFences()`，又会违反 `--specs` byte-compatible 和“不改 state A verify semantics”的约束。

建议修复：

推荐保持 state A：

- 有 closing delimiter 的 fenced span 中，scenario-looking line 不作为 delimiter；
- unclosed opener 不隐藏后续 scenario headings，完全按当前 `stripFences()` 行为处理；
- valid scenario heading 明确复用 state-A `SCENARIO_RE`，不要另写字面单空格规则。

如果产品确实选择“unclosed fence swallows tail”，则必须明确这是 state-B semantic change，并同步修改 verify scenario collection、兼容声明及相关 golden；这会扩大当前 change scope。

AC8 增加：

- unclosed opener 后的 heading 与 `scanTitles()` 得到相同分类；
- 多空格/tab heading 与 state-A scanner 得到相同分类；
- integrity scanner 与 projection scanner 的 title list identity assertion。

## 3. 是否有 implied but undeclared state changes 或 side effects

结论：通过。

已明确声明：

- verify 不增加 matcher batch；
- archive 可新增 bounded matcher child invocation；
- archive matcher/config failure 仅 warning + skip report；
- 不新增持久化；
- 不新增 archive JSON；
- 不新增 confirmation/override flag；
- gate 不消费；
- single-file archive 不变。

除 REQ-3 的 warning byte contract 外，未发现未声明的状态变化。

## 4. 每条 acceptance criterion 是否均为可测试的 if/then

结论：不通过。

AC4 已成为可直接执行的确定 oracle，REQ-11 可以关闭。AC6 也覆盖了 archive 的主要 matcher paths，REQ-4 可以关闭。

剩余缺口来自两个正式问题：

- AC3 没有覆盖多个 `ambiguous` keys，尤其是 new-only 与 mixed-side 排序；
- AC6 没有裁定 warning 中控制字符究竟删除还是替换，以及 200 上限作用于完整 line 还是 reason；
- AC8 没有覆盖 unclosed fence 和 state-A whitespace heading syntax。

补齐上述输入和 expected values 后，现有 AC 集即可形成确定 oracle。

## 5. 是否与 current state A 冲突

结论：不通过。

唯一实质冲突为 REQ-10：

- req-v3：unclosed fence 吞掉余下内容；
- state A：unclosed fence 不被 `stripFences()` 移除，后续 scenario heading 仍可被识别。

另有 syntax 描述偏差：

- req-v3 看似要求字面单空格；
- state A 使用 `\s+`。

REQ-3 的“控制字符剥离”也与 state-A `sanitizeMsg()` 的 replacement 行为不一致，但归入同一个输出契约问题，不另计 issue。

其余设计与 state A 一致：

- matcher 两批纪律保留；
- invalid pattern 仍 fail early；
- archive dependency direction 不反转；
- high-level/single-file boundary明确；
- ERROR report presence 与 `storeReport/changeScope` 纪律一致；
- merge、exit、write 和 gate semantics 不变。

## 6. Target lineage 是否声明且符合 repo reality

结论：通过。

lineage 正确声明了：

- `main` v4 产品线；
- 未归档的 `gate-id-pattern` 为前置 state A；
- 未归档的 `verify-change-scope` 为前置 state A；
- 当前工作区代码优先于尚未同步的 truth；
- 三个 change 按依赖顺序归档。

与 repo 当前 dirty worktree 现实相符。REQ-8 维持 verified。

## Explicit out-of-scope 检查

结论：通过。

显式 `## 范围外（won't do）` section 存在，并明确排除：

- single-file archive；
- archive `--json`；
- gate consumption；
- confirmation/override flag；
- 自动补回；
- 跨块移动检测；
- Requirement prose 新增行报告；
- merge/verdict/exit/write semantic changes。

## P0 advisories（不计入结论）

### P0-1：对 cardinality table 做完整 table-driven test

B1 已覆盖全部 cardinality classes。建议测试逐行遍历 truth table，而不只验证 `o>1,n=0`，防止将来重构时漏掉 `both` 或 new-only ambiguity。

### P0-2：增加完整 human golden

B4 已足以指导 renderer，但建议至少固定一个包含 retained、titleChanged、dropped、ambiguous 和 missingLines 的完整 human golden，避免 verify/archive 两个 surface 在缩进、count 或 prefix 上漂移。

### P0-3：lineage 中的 “v1/v3” 建议标注为 legacy product lines

当前文件本身名为 `req-v3`，“不合并 v1/v3”容易被误读为不合并 requirement revision。建议写为“不合并 legacy product v1/v3 lines”，仅改善可读性。

## Ledger delta

| ID | r2 状态 | r3 状态 | 复核结论 |
|---|---|---|---|
| REQ-1 | verified | verified | 唯一 line algorithm、normalization、duplicate consumption 与 comparison scope 保持闭合 |
| REQ-2 | reopened | verified | cardinality truth table 已统一两类 key；ambiguous 跳过规则及 counts 已明确 |
| REQ-3 | reopened | reopened | machine schema 主体已闭合，但 ambiguous mixed/new-only ordering 与 warning sanitization/cap 仍不唯一 |
| REQ-4 | reopened | verified | verify batch discipline 与 archive custom/default/invalid/matcher-failure paths 已有确定 coverage |
| REQ-5 | verified | verified | high-level archive 专属，single-file 明确 out of scope |
| REQ-6 | verified | verified | report presence matrix 保持完整 |
| REQ-7 | verified | verified | frozen fixture、hand-derived literal expected value 已明确 |
| REQ-8 | verified | verified | target lineage 与实际 composite state A 一致 |
| REQ-9 | verified | verified | 无 confirmation/override flag，既有 write/exit semantics 保持 |
| REQ-10 | open | open | heading/fence boundary 多数已闭合，但 unclosed fence 与 whitespace syntax 仍和实际 state A 冲突 |
| REQ-11 | open | verified | AC4 已提供 GREEN 0、GAPS 1、archive dry-run/write 的直接 oracle |

VERDICT: 2 issues open
