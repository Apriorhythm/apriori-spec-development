# STEP5 implementation review v1 — modified-block-integrity

## 结论摘要

实现的主结构与 SPEC-DOC 基本一致：cardinality truth table、greedy subsequence、fence-aware boundary、fourth batch segment、GREEN/GAPS presence、archive DI seam、warning degradation 与 preflight 后插入点均已落地。

发现 3 个计入 verdict 的 spec-vs-code gap：

1. `missingLines.line` 丢失旧行的原始首尾空白；
2. human formatter 截断字段而非最终整行；
3. `RENAMED + MODIFIED` 的 stamped rerun repair 会漏掉 MODIFIED entry。

318/318 GREEN 不能发现这些问题，因为相应测试没有构造能够区分正确与错误实现的 oracle。

## Open implementation issues

### IMPL-1 — `missingLines` 未保留完整旧行原文

Risk: med

SPEC-DOC 要求比较时使用规范化行，但输出的 `missingLines.line` 必须是完整、未截断的旧行原文。

`lib/archive-merge.js:442-445` 在结构扫描阶段只保存 `norml(line)`；`missingFrom()` 随后返回的也是规范化文本。因此旧行的 leading indentation 与 trailing whitespace 永久丢失。

例如旧行：

```text
\t- lost with tail···
```

当前结果为：

```json
{"scenario":"KV-01","line":"- lost with tail"}
```

而不是原始旧行。

`AM-44` 测试只让一个被保留的行发生 whitespace-only 差异，证明了“该差异不应误报”；真正丢失的几行本身没有首尾空白，所以没有验证“命中后返回原文”的另一半契约。

建议内部保存 `{raw, normalized}`：用 `normalized` 做 subsequence matching，用 `raw` 生成 `missingLines`。

Status: open

### IMPL-2 — human output 没有执行 state-A 整行 120-unit 截断

Risk: med

`req-final.md` B4 与 SR spec 规定每条 human line 使用：

```js
line.length > 120 ? line.slice(0, 119) + '…' : line
```

即最终整行不超过 120 UTF-16 units。

当前 `sanField()` 对每个外部字段分别截到 120，再拼接 prefix、suffix 或第二个字段。长 `file + name` 行以及 `oldTitle + newTitle` 行可分别达到约 266、262 units。

`test/modified-integrity.test.js:127` 将 oracle 放宽为 `line.length <= 150`，并且 fixture 只覆盖单个长字段，没有覆盖：

- 长 `file` 与长 `name` 同行；
- 长 `oldTitle` 与长 `newTitle` 同行；
- 长 `scenario` 与长 missing line 同行。

因此该测试忠实验证了“field truncation”这一实现行为，却没有验证 SPEC-DOC 的“line truncation”。

建议保持字段级 C0/DEL sanitization，但在整行组装后统一执行 state-A 的 `119 + …` 截断。

Status: open

### IMPL-3 — repaired rename-then-modify 漏掉 MODIFIED entry

Risk: med

SPEC-DOC 要求每个 MODIFIED operation 恒有一个 entry；stamped rerun repair 也必须产生 equal-text pair。

`captureModified()` 对所有 rename target 都固定执行：

```js
const oldName = renamedTo.get(name) || name;
const oldBlock = storeBlocks.get(oldName);
if (oldBlock === undefined) continue;
```

首次执行 `A -> G` 后再重跑时，store 中只有已经落地的 `G`，没有 `A`。`merge()` 能正确识别：

- rename 已完成；
- MODIFIED G 已完成；
- 整个模块进入 repaired path。

但 `captureModified()` 仍查找 `A` 并静默 `continue`，于是 `modifiedBlocks` 不含该操作。可信的 `verify --change --json` 最终得到 `modifiedIntegrity: []`，而不是一条 all-empty entry。

现有测试把两个维度拆开了：

- fresh rename-then-modify 只检查 capture 前缀；
- repaired rerun 只使用未 rename 的普通 MODIFIED。

它没有覆盖二者的组合。

Status: open

## 场景意图核验

| Scenario | 裁定 | 说明 |
|---|---|---|
| AM-43 | partial | ID cardinality 八行与 ambiguous ordering 有效；未覆盖 no-ID title keys，也未覆盖 titleChanged 场景继续进行 body comparison。 |
| AM-44 | partial | prose、drop、reorder、duplicate count、whitespace normalization 的最终 oracle 有效；但未验证 missing line 返回完整旧原文。`test:71-76` 另有一条恒等式断言，实际证明力为零，不过后续 exact oracle 有效。 |
| AM-45 | partial | heading exclusion、closed fence、unclosed fence、multi-space heading 均命中意图；raw capture 仅做 prefix match，且遗漏 repaired rename-then-modify 组合。 |
| AM-46 | partial | dry-run/write section 与 RESULT 顺序已验证；“bytes identical to reportless run”没有 reportless baseline；preflight 仅覆盖 unstamped denial 与 pre-existing temp。 |
| AM-47 | partial | custom/default/invalid/missing-factory 路径有效；未注入 `matcher.batch()` failure，未断言 warning 完整字符串或 exactly one。 |
| SR-65 | partial | GREEN/GAPS exit 与主要报告内容有效；GAPS 只比较 `dropped`，没有 deep-equal 验证与 GREEN 报告完全相同，也没有 reportless verdict baseline。 |
| SR-66 | partial | GREEN/GAPS presence、两类 ERROR absence、`--specs` absence、ADDED-only `[]` 与普通 idempotent entry 有效；未验证 repaired rerun 的最终 JSON entry。 |
| SR-67 | pass | counting seam 确认 exactly two batches；旧标题在第一批且不污染 scenario count、change scope 或 store report。 |
| SR-68 | partial | producer correction 正确；测试验证 9 个 ID 与两条旧 THEN line，但不是规范所称的完整 report `deepStrictEqual`，retained titles 仍可能错误而测试保持 GREEN。 |

## Guarantee claims

### `never changes verdict/exit/bytes`

证明不足。

- SR-65 只断言预期 GREEN/GAPS，没有与禁用 integrity report 的同输入 baseline 比较。
- AM-46 的注释声称 “bytes identical to a reportless write”，实际只检查 KV-01 存在、KV-02 不存在，没有逐字节 baseline。
- 当前代码结构确实把 report 放在 verdict/merge data 之外，但硬保证仍缺少对抗性回归测试。

### `exactly two batches`

已充分验证。SR-67 使用 config-origin counting child seam，覆盖 title batch 与 TAP batch，并证明 old titles 没有形成第三次 matcher call。

### `absent never null`

已验证到场景要求的主要 outcome classes：

- pre-test ERROR；
- post-TAP ERROR；
- `--specs`;
- GREEN/GAPS presence。

Change 2 的 SR-64 full-JSON ERROR oracles也继续证明字段是 absent，而非 `null`。

### `no section on any preflight failure`

证明不足。当前新增测试只覆盖：

- unstamped/CAS denial；
- pre-existing temp。

仍需逐路径覆盖 malformed delta、base-stamp mismatch、merge conflict、config denial、validation/containment failure，以及 escaping `--changes-dir` destination。代码插入点位于这些已知 guard 之后，但“ANY”保证需要分支级对抗测试。

## Producer disclosures 裁定

### MBI-1

更正成立，应从 `fixed — pending P8` 更新为 `verified`。

冻结 fixture 的 9 个 scenario headings 在 old/new 两侧逐字相同；唯一变化是 SR-16 与 SR-18 的 THEN 行。因此正确推导是：

- retained = 9；
- titleChanged = 0；
- dropped/added/ambiguous = 0；
- missingLines = SR-16、SR-18 的两条旧 THEN line。

这次纠正确实证明了“人工独立推导先于实现输出”的价值。

### Change 2 / SR-64 JSON oracle 扩展

扩展正确。

本 change 明确扩展 trustworthy `--change` GREEN/GAPS JSON，因此早先 full-object oracle 必须增加 `modifiedIntegrity: []`。ERROR oracles 保持字段 absent。该修改不是降低旧测试要求，反而继续保护其余 JSON 字段不被 fourth segment 污染。

### FIELDS 截断

不接受为 spec-conformant。实现和 CHANGELOG 描述的是 `120-unit field truncation`，但规范的 state-A wording 明确要求最终 line 使用 `slice(0,119) + '…'`。见 IMPL-2。

## External-input sanitization posture

代码对新 human report path 的 C0/DEL 防护方向正确：

- `file`、requirement `name`；
- old/new titles；
- dropped title；
- ambiguous key；
- missing scenario 与 line；

均经过 `sanField()`，newline/tab 也替换为 `·`。warning 则在完整前缀拼接后经过 `sanitizeMsg()`；JSON 经 `JSON.stringify()` 输出。

但现有安全测试证明力不足：控制字符被放在 150 个 `X` 之后，即使实现先截断再完全不 sanitization，测试也会通过；同时它只断言“控制字符不出现”，没有断言替换为 `·`，也未覆盖所有外部字段。应把 NUL、TAB、LF、ESC、DEL 放在前 20 units 内，并逐字段验证 replacement、截断顺序和单行性。

IMPL-1 还意味着 JSON 当前并未保存完整 raw line，虽不是控制字符注入问题，仍违反 raw-data contract。

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---:|---|---|
| IMPL-1 | `missingLines.line` 输出 normalized line，未保存完整旧行原文 | med | STEP5·r1 | open |
| IMPL-2 | human formatter 截断 external fields 而非最终 line，输出可超过 120 UTF-16 units | med | STEP5·r1 | open |
| IMPL-3 | stamped repaired `RENAMED + MODIFIED` 因只查 pre-rename key 而漏掉 MODIFIED entry | med | STEP5·r1 | open |
| MBI-1 | 冻结 fixture 实际为 retained=9/titleChanged=0，仅 SR-16/SR-18 旧 THEN 行丢失 | low | STEP5·r0(producer) | verified |

## Advisories（不计 verdict）

- ADV-1：为 AM-46 增加真正的 reportless differential harness，逐字比较 verdict、exit、RESULT 与 written bytes。
- ADV-2：补齐 AM-46 的全部 preflight failure table，并为 AM-47 注入 returned matcher failure；断言 warning 完整值、exactly one 及其余 stdout/exit 与 baseline 相同。
- ADV-3：补 no-ID cardinality、titleChanged body loss、CRLF/CR、丢失 fence delimiter、完整 SR-68 object oracle，以及 `buildProjection().modifiedBlocks` 的 strict raw equality。
- ADV-4：`design.md` 称 trim-equal archive 路径“无需 matcher”，当前 archive 在调用 helper 前仍构造 matcher 并 batch titles。形式 spec 对 missing factory 另有统一 degradation 规则，故作为 design-only drift，不计 verdict；设计或实现应统一。
- ADV-5：`docs/cli.md` 与 `docs/cli_cn.md` 的 verify 段已更新，但 archive 段没有按 G4/AC10 说明 integrity section 与 warning degradation；CHANGELOG 的 “field truncation” 也与规范的 line truncation 冲突。RUNBOOK 双语补句与 CHANGELOG 主功能说明其余部分已到位。
- ADV-6：`review/sample-evidence.md` 能证明真实材料上的实用价值，但它不是 byte/full-JSON oracle，不应替代上述 adversarial tests。

VERDICT: 3 issues open
