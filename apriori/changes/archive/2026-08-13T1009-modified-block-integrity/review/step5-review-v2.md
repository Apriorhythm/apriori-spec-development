# STEP5 implementation review v2 — modified-block-integrity

## 结论摘要

Round 1 的三项实现问题均已正确修复，可更新为 `verified`：

- IMPL-1：比较使用 `norm`，`missingLines` 输出旧侧 `raw`；
- IMPL-2：外部字段完成 C0/DEL sanitization 后，对 assembled line 执行 state-A `slice(0,119) + '…'`；
- IMPL-3：stamped repaired `RENAMED + MODIFIED` 能从 post-rename name 恢复 equal-text pair。

复扫发现 1 个新的 formal gap：closed fence 与 scenario heading 同行时，结构扫描没有严格复现 state-A `stripFences` 的“先删除 closed span、再匹配 heading”行为。

## Round-1 findings 复核

### IMPL-1 — verified

`scanBlockStructure()` 现在保存 `{raw, norm}`：

- 空行判定与 subsequence matching 使用 `norm`；
- unmatched old line 返回 `raw`；
- JSON 因而保留旧行的 leading indentation 与 trailing whitespace。

AM-44 新增的 tab-indented、trailing-whitespace fixture 使用 verbatim oracle，能够区分旧实现与修复后的实现。该修补符合 AM-44、SR-65 及 JSON full-text contract。

### IMPL-2 — verified

`formatIntegrityHuman()` 当前顺序为：

1. 每个 external field 经 `sanField()` 替换 C0/DEL；
2. 拼出完整 human line；
3. assembled line 经 `cap()` 执行 `slice(0,119) + '…'`。

新增测试覆盖长 `file + name`、长 `oldTitle + newTitle` 及长 `scenario + line` 组合，并断言每行不超过 120 UTF-16 units。原先可产生约 260-unit 行的反例已经关闭。

### IMPL-3 — verified

`captureModified()` 在 pre-rename source 不存在时回退到 post-rename name。新增组合测试同时证明：

- base stamp mismatch；
- `merge()` 判定整个 `RENAMED + MODIFIED` 已落地；
- module 进入 `repaired`；
- `modifiedBlocks` 仍含一个 pair；
- old/new text trim-equal。

这关闭了 repaired rename-then-modify 返回 `modifiedIntegrity: []` 的漏项。

## 新发现

### IMPL-4 — closed inline fence 后的 scenario heading 不遵循 state-A `stripFences`

Risk: med

AM-45 与总 requirement 要求 scenario boundary “fence-aware exactly like `stripFences`”。State A 的行为是先执行：

```js
text.replace(/```[\s\S]*?```/g, '')
```

再对结果运行 scenario-heading regex。

当前 `scanBlockStructure()` 没有生成该 stripped structural view；它对原始行运行 heading regex，并仅用该行起始 offset 是否位于 fence span 内作为过滤条件。两种算法在 closed fence 与 heading 同行时不同。

反例：

````text
### Requirement: R
```x```#### Scenario: KV-01 one
- body
````

State A `stripFences` 后为：

```text
### Requirement: R
#### Scenario: KV-01 one
- body
```

因此 `KV-01` 是有效 scenario。若 replacement 删除它，预期为：

```json
{
  "dropped": [{"id":"KV-01","title":"KV-01 one"}],
  "missingLines": []
}
```

当前 integrity engine 则没有识别 scenario，输出方向为：

```json
{
  "dropped": [],
  "missingLines": [
    {"scenario":null,"line":"```x```#### Scenario: KV-01 one"},
    {"scenario":null,"line":"- body"}
  ]
}
```

这不仅是罕见格式的显示差异：它把 scenario-level loss 错归为 requirement prose loss，违反 AM-45 的 boundary contract。

现有 AM-45 测试只覆盖 standalone opening/closing fence lines，无法区分 span-offset 实现与真正的 `stripFences` semantics。

建议 delimiter discovery 直接基于与 `stripFences` byte-equivalent 的 structural view，并保留 stripped-position 到原始行/片段的映射，以便 body comparison 继续使用 raw text。至少补充：

- closed span 后同行 heading；
- heading 后同行 closed span；
- 多个 closed spans 与 heading 组合；
- verify fourth-segment title collection和 engine classification 的一致性 oracle。

Status: open

## Scenario intent 复核

| Scenario | Round-2 裁定 | 说明 |
|---|---|---|
| AM-43 | pass with advisory | 主分类、八行 cardinality、互斥与 ambiguous ordering 正确；no-ID table row 仍缺直接测试，但实现符合。 |
| AM-44 | pass | raw/norm 分离已使完整旧原文、whitespace normalization、reorder 与 duplicate count 同时成立。 |
| AM-45 | fail | 常规 closed/unclosed fence、rename heading exclusion、多空格 heading 正确；inline closed-span boundary 不等价于 state A。 |
| AM-46 | implementation pass | section 位于全部已实现 preflight guards 后、RESULT 前，且不参与 write data；对抗测试矩阵仍不完整。 |
| AM-47 | implementation pass | custom/default、factory error、missing factory 与 returned matcher failure 路径符合设计；现有测试未直接注入 matcher failure。 |
| SR-65 | pass | report 与 verdict 路径隔离；GREEN/GAPS presence 正确。 |
| SR-66 | pass | GREEN/GAPS always-present、ERROR/`--specs` absent、普通及 repaired empty entry 均成立。 |
| SR-67 | pass | exactly two matcher batches，integrity titles 不进入 binding accumulation、count、scope 或 store report。 |
| SR-68 | pass | MBI-1 更正仍成立：9 retained、0 titleChanged、两条旧 THEN line。 |

## Guarantee claims

实现层未发现新的 verdict、exit 或 write-byte 耦合；`modifiedIntegrity` 的 presence/absence 路径及 exactly-two-batches 仍符合规范。

以下测试证明力债务仍属 advisory，不计本轮 verdict：

- `never changes verdict/exit/bytes` 尚无真正 reportless differential baseline；
- `no section on ANY preflight failure` 仍只直接覆盖 CAS denial 与 pre-existing temp；
- AM-47 尚未直接注入 `matcher.batch()` failure 并断言 exactly one 完整 warning；
- SR-65 的 GAPS 分支没有 deep-equal 整个 report 与 GREEN 分支完全相同。

## External-input posture

human path 的 C0/DEL replacement 与 assembled-line truncation 已符合正式契约；JSON 继续通过 `JSON.stringify()` 保留并转义 raw data。

测试仍可增强：当前 control characters 位于长字符串尾部，可能先被 truncation 隐去。建议将 NUL、TAB、LF、ESC、DEL 放在前 20 units，并逐字段断言被替换为 `·`。这是测试强化项；当前实现本身正确。

## Design fidelity

除 IMPL-4 外，核心实现与 G1–G3 一致。以下既有偏差继续作为 advisory：

- design 称 idempotent archive path “无需 matcher”，archive 当前仍先收集 titles 并运行 matcher，再由 helper fast-path 返回空 diff；
- design 写明用 `Map<line, consumption queues>`，实现采用线性游标加向后扫描；语义一致，但复杂度与设计描述不同；
- `docs/cli.md` / `docs/cli_cn.md` 的 archive section 仍未补 integrity section 与 warning degradation；CHANGELOG 仍写 `120-unit field truncation`，应改为 assembled-line truncation。

## Ledger delta

| ID | Round-2 status | 裁定 |
|---|---|---|
| MBI-1 | verified | 冻结材料确为 retained=9、titleChanged=0、两条旧 THEN line。 |
| IMPL-1 | verified | `{raw,norm}` 实现与 verbatim regression oracle 均正确。 |
| IMPL-2 | verified | assembled human lines 已执行 state-A 120-unit cap。 |
| IMPL-3 | verified | repaired `RENAMED + MODIFIED` 组合仍产生 equal-text pair。 |
| IMPL-4 | open | closed inline fence 后的 heading 未按 `stripFences` structural view 识别。 |

VERDICT: 1 issues open
