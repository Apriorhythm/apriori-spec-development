# STEP5 implementation review v4 — modified-block-integrity

## 结论摘要

IMPL-5 的 archive inline-fence 子问题已正确修复：

- archive collector 现在扫描 fence-stripped view；
- inline-fence titles 会进入 injected matcher；
- AM-47 已证明同 ID 的 old/new title 被分类为 `titleChanged`。

但 IMPL-5 不能整体标记为 `verified`。engine 与 archive 目前共享的是收窄后的 `[^\S\n]+` regex，而 verify/state A 使用规范明确钉死的 `\s+` regex。跨换行 whitespace 的合法 state-A delimiter 仍被错误归为 prose。

因此本轮仍有 1 个 formal gap。

## 已验证的修补部分

`pushIntegritySection()` 不再按 raw line 与 fence span 起始位置过滤标题，而是先执行：

```js
.replace(/```[\s\S]*?```/g, '')
```

再扫描 headings。这与 IMPL-4 的 inline closed-fence 语义一致。

新增 AM-47 测试通过 `archiveChange({idMatcherFactory})` 验证：

```text
```x```#### Scenario: KV-01 old title
```

与：

```text
```x```#### Scenario: KV-01 new title
```

均进入 matcher，最终 human output 包含 ID-paired `titleChanged`，不再退化成 `dropped + added`。该子问题已关闭。

## Remaining formal gap

### IMPL-5 — shared delimiter regex 仍不等同于 state-A actual regex

Risk: med

SPEC-DOC 明确规定 scenario delimiter 沿用 state A 的实际 regex：

```js
/^####\s+Scenario:\s+(.*)$/m
```

verify 当前也确实使用：

```js
/^####\s+Scenario:\s+(.*)$/gm
```

但 engine 与 archive collector 共同使用：

```js
/^####[^\S\n]+Scenario:[^\S\n]+(.*)$/gm
```

`[^\S\n]+` 排除了 newline，`\s+` 则包含 newline。因此“engine、archive、verify one shared semantic”的声明尚未成立。

两个仍可复现的反例：

```text
### Requirement: R
####
Scenario: KV-01 split-a
- body
```

```text
### Requirement: R
#### Scenario:
KV-02 split-b
- body
```

State A/verify 分别识别：

```json
["KV-01 split-a"]
```

```json
["KV-02 split-b"]
```

replacement 删除这些内容时，正确 integrity classification 应包含对应 `dropped` scenario。当前 engine 实际返回：

```json
{
  "dropped": [],
  "missingLines": [
    {"scenario":null,"line":"…"}
  ]
}
```

即把 scenario loss 错归为 requirement prose loss。

318/318 GREEN 的原因是新增 AM-47 只覆盖 inline fence，没有覆盖 state-A `\s+` 跨换行行为。

## 建议修复与 oracle

应让 engine 与 archive collector 使用和 verify 完全相同的 shared regex，而不是三个文本相近的独立定义：

```js
/^####\s+Scenario:\s+(.*)$/gm
```

raw-boundary mapping 还需正确处理一个 delimiter 横跨多条 raw lines 的情形：delimiter 自身占用的所有 raw lines不得进入 prose 或 scenario body。

建议补充：

- `####\nScenario: KV-01 title`；
- `#### Scenario:\nKV-02 title`；
- 上述形式经过 archive injected matcher 后仍按 ID 配对；
- engine、archive collector、verify 对同一 corpus 得到完全相同的 title sequence。

## 其余 P8 复核

未发现其他新的 spec-vs-code gap：

- IMPL-1：raw `missingLines` 正确；
- IMPL-2：assembled human line 截断正确；
- IMPL-3：repaired rename-then-modify pair 正确；
- IMPL-4：fence-stripped delimiter discovery 与 raw body comparison 正确；
- MBI-1：retained=9、titleChanged=0、两条旧 THEN line 的修正正确；
- JSON presence/absence、two-batch contract、preflight insertion、sanitization 与 informative-only data flow 未出现回归。

## Ledger delta

| ID | Round-4 status | 裁定 |
|---|---|---|
| MBI-1 | verified | 冻结 fixture 的人工推导正确。 |
| IMPL-1 | verified | normalized matching、raw reporting 正确。 |
| IMPL-2 | verified | assembled-line 120-unit truncation 正确。 |
| IMPL-3 | verified | repaired `RENAMED + MODIFIED` 保留 equal-text pair。 |
| IMPL-4 | verified | inline closed fence 后的 heading 正确映射。 |
| IMPL-5 | open | archive inline-fence matcher path 已修复，但 engine/archive 的 `[^\S\n]+` 仍不等同于规范与 verify 的 state-A `\s+`。 |

VERDICT: 1 issues open
