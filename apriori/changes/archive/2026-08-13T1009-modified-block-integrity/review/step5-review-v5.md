# STEP5 implementation review v5 — modified-block-integrity

## 结论摘要

IMPL-5 已正确修复，可以更新为 `verified`：

- engine 与 archive collector 均使用 verbatim state-A regex；
- `\s+` 跨 newline 的两种 split heading 均被识别；
- scenario body 从 match 的 raw `endLine` 之后开始，delimiter 片段没有泄漏进 body；
- archive inline-fence titles 继续通过 matcher 按 ID 配对。

最终交互检查发现 1 个新的 formal gap：当 closed fence 位于一个跨行 delimiter 的内部时，整个 raw delimiter span 被跳过，其中本应参与比较的 fenced lines 也随之丢失。

## IMPL-5 复核

Status: verified

engine 与 archive collector 现在均使用：

```js
/^####\s+Scenario:\s+(.*)$/gm
```

以下两种 state-A 合法形式均产生正确标题：

```text
####
Scenario: KV-01 split-a
```

```text
#### Scenario:
KV-02 split-b
```

对 replacement 删除场景的实际结果分别为：

```json
{
  "dropped": [{"id":"KV-01","title":"KV-01 split-a"}],
  "missingLines": []
}
```

```json
{
  "dropped": [{"id":"KV-02","title":"KV-02 split-b"}],
  "missingLines": []
}
```

`endLine` 映射也正确排除了 delimiter 占用的全部 raw lines。AM-45 的两个 exact oracle 能区分 round-4 实现与当前修补。

archive collector 同样在 fence-stripped view 上使用该 regex；IMPL-4 的 inline-fence `titleChanged` archive regression 仍有效。

## 新发现

### IMPL-6 — 跨行 delimiter 内的 fenced content 被结构扫描静默丢弃

Risk: med

SPEC-DOC 的结构规则同时要求：

1. scenario delimiters 在 fence-stripped view 上按 state-A regex 发现；
2. fence delimiter lines 与 fenced non-empty lines 仍作为当前 prose/body lines 参与比较。

当前实现把每个 heading 映射为：

```js
{rawLine, endLine}
```

随后：

- prose 只收集到 `rawLine` 之前；
- scenario body 从 `endLine + 1` 开始。

因此位于 `rawLine..endLine` 内的所有 raw lines 都被当作 delimiter 丢弃。普通 split heading 需要这样处理；但如果这个 span 中含有被 stripped 的 closed fence，其 fenced content 也被一并丢弃。

反例：

````text
### Requirement: R
#### ```
fenced-old
``` Scenario: KV-01 one
- body
````

replacement：

````text
### Requirement: R
#### ```
fenced-new
``` Scenario: KV-01 one
- body
````

两侧经过 `stripFences` 后都是：

```text
### Requirement: R
####  Scenario: KV-01 one
- body
```

所以 KV-01 正确配对为 retained；但 raw `fenced-old` 是 closed fence 内的非空旧行，规范要求它参与当前 prose/body comparison。replacement 不再保留该行，应产生相应 `missingLines`。

当前实际结果为：

```json
{
  "retained": [{"id":"KV-01","title":"KV-01 one"}],
  "titleChanged": [],
  "dropped": [],
  "added": [],
  "ambiguous": [],
  "missingLines": []
}
```

即 fenced content 被静默忽略。

现有 closed-fence test 的 fence 位于普通 scenario body 内，不会进入 heading raw span，因此无法发现该问题；新增 split-heading tests 又不含 fence，二者组合分支仍未覆盖。

### 建议修复

delimiter mapping 不能只保存粗粒度的 raw start/end lines。需要区分：

- stripped view 中实际构成 heading 的 raw fragments；
- heading span 内被删除的 closed-fence raw content。

后者必须重新归入 heading 之前的当前 prose/body，并保持原始行序；只有真正构成 scenario heading 的部分不参与 body comparison。

至少补充一个组合 oracle：

- closed fence 夹在跨行 delimiter 中；
- old/new scenario title 与 body相同；
- 仅 fenced non-empty line 改变或删除；
- scenario retained；
- 旧 fenced line 出现在 `missingLines`，且不误报 heading fragments。

## 其余 P8 复核

未发现其他新的 formal gap：

- IMPL-1：normalized matching 与 raw reporting 正确；
- IMPL-2：assembled human line 的 120-unit truncation 正确；
- IMPL-3：repaired rename-then-modify equal-text pair 正确；
- IMPL-4：inline closed fence 后的 heading 正确暴露；
- IMPL-5：verbatim state-A regex、archive matcher channel 与 split-heading boundaries 正确；
- MBI-1：9 retained、0 titleChanged、两条旧 THEN line 的人工推导正确；
- JSON presence/absence、two-batch contract、sanitization、preflight insertion 与 informative-only data flow 未发现回归。

动态执行中 6 个纯 engine tests 通过；依赖 `mkdtemp` 的其余 tests 因 read-only sandbox 返回 `EROFS`，属于题面指定的 R2 artifact，不计为实现失败。题面提供的完整环境结果仍为 318/318 GREEN。

## Ledger delta

| ID | Round-5 status | 裁定 |
|---|---|---|
| MBI-1 | verified | 冻结 fixture 人工推导正确。 |
| IMPL-1 | verified | normalized matching、raw missing-line reporting 正确。 |
| IMPL-2 | verified | assembled-line 120-unit truncation 正确。 |
| IMPL-3 | verified | repaired `RENAMED + MODIFIED` 保留 equal-text pair。 |
| IMPL-4 | verified | inline closed fence 后的 heading 正确映射。 |
| IMPL-5 | verified | engine/archive 使用 verbatim state-A regex；split headings 与 archive ID pairing 正确。 |
| IMPL-6 | open | 跨行 delimiter raw span 内的 fenced lines 被整体跳过，违反 fenced content 参与比较的契约。 |

VERDICT: 1 issues open
