# STEP5 implementation review v3 — modified-block-integrity

## 结论摘要

IMPL-4 针对 round-2 inline-fence 反例的 engine 修补成立，可以更新为 `verified`。

但跨消费面复核发现 scenario-title discovery 仍未统一为 state-A 算法：

- `archive` matcher 输入仍使用旧的 raw-line fence filtering；
- engine 的新 delimiter regex 仍不等同于 state-A 的实际 regex。

因此尚不能关闭，本轮新增 1 个 formal issue。

## IMPL-4 复核

Status: verified

`scanBlockStructure()` 现在：

1. 对 CRLF/CR 做 LF normalization；
2. 以与 `stripFences` 相同的 regex 删除 closed fence spans；
3. 在 stripped view 上发现 headings；
4. 通过 span-offset arithmetic 映射回 raw line；
5. 从 raw text 的 heading boundaries 之间提取 body lines。

新增 AM-45 counterexample 能区分旧实现和新实现：

```text
```x```#### Scenario: KV-01 one
- body
```

replacement 删除该场景时，当前结果正确进入：

```json
{
  "dropped": [
    {"id":"KV-01","title":"KV-01 one"}
  ]
}
```

而非误归为 prose `missingLines`。已有 standalone closed fence、unclosed fence、multi-space heading 与 raw fenced-body tests 仍与新算法兼容。

## 新发现

### IMPL-5 — scenario-title discovery 尚未在 engine、verify 与 archive 间统一为 state-A contract

Risk: med

#### 1. Archive 仍漏掉 inline-fence 暴露的 heading

`pushIntegritySection()` 内部保留了旧 collector：

```js
for (const line of clean.split('\n')) {
  const m = /^####\s+Scenario:\s+(.*)$/.exec(line);
  if (m && !inSpan(off)) titles.push(m[1]);
}
```

它没有扫描 fence-stripped view。因此 IMPL-4 的 inline heading 虽然能被 `compareModifiedBlock()` 识别，却不会进入 archive matcher batch。

反例：

```text
old: ```x```#### Scenario: KV-01 old title
new: ```x```#### Scenario: KV-01 new title
```

正确语义应通过 ID `KV-01` 配对并产生：

```json
{
  "titleChanged": [{
    "id": "KV-01",
    "oldTitle": "KV-01 old title",
    "newTitle": "KV-01 new title"
  }]
}
```

archive 当前没有把两个 title 交给 matcher，`idOf()` 对两侧均返回 `null`；engine 随后按不同的 normalized full title 配对，结果退化成 `dropped + added`。

若标题相同，则虽能按 title key retained，entry 的 `id` 仍错误地成为 `null`。这违反 AM-43 的 pairing contract 与 AM-47 的 archive id-pattern channel。

新增 AM-45 测试只直接调用 engine，未经过 archive matcher seam，因此保持 GREEN。

#### 2. Engine delimiter regex 仍不等于 state-A 实际 regex

State A 使用：

```js
/^####\s+Scenario:\s+(.*)$/gm
```

当前 engine 使用：

```js
/^####[^\S\n]+Scenario:[^\S\n]+(.*)$/gm
```

后者刻意禁止 whitespace 跨 newline；前者的 `\s+` 可以跨 newline。于是以下两种输入会被 state A 的 `scanTitles()` 识别为 scenario，但 integrity engine 归为 prose：

```text
####
Scenario: KV-01 split-a
```

```text
#### Scenario:
KV-02 split-b
```

实际对抗结果是 state A 分别得到 `KV-01 split-a`、`KV-02 split-b`，而 integrity engine 得到 `dropped=[]`，并把三条 raw lines 放入 prose `missingLines`。

SPEC-DOC 明确钉死 state-A actual regex，而不只是通常的单行 Markdown 写法，因此这是正式行为差异。

#### 建议修复

建立一个 archive-merge 内部共享 helper，返回 state-A fence-stripped view 上发现的 titles 及其 raw boundaries，并让以下路径共同使用：

- `scanBlockStructure()`；
- `pushIntegritySection()` 的 matcher payload；
- 如可行，spec-runner 的 title collection。

共享 regex 应与 state A 的 `/^####\s+Scenario:\s+(.*)$/gm` byte-equivalent，避免再次出现三个近似实现漂移。

补充测试至少应覆盖：

- inline closed fence 后的 same-ID title change，经 archive seam 得到 `titleChanged`；
- archive matcher payload 确实含 inline heading；
- 两类 cross-newline `\s+` heading；
- engine 与 verify title discovery 对同一 corpus 返回相同 title sequence。

Status: open

## P8 checklist 复核

- Semantic faithfulness：IMPL-1/2/3/4 已符合；IMPL-5 仍造成 archive classification 与 state-A boundary 偏差。
- Spec’d behavior unimplemented：除 IMPL-5 外未发现新的缺失主路径。
- Silently ignored branches：archive collector 对 inline headings 静默漏送 matcher，是本轮 formal issue。
- External input：human C0/DEL sanitization、assembled-line 120-unit truncation 与 JSON escaping 保持正确。
- Guarantee claims：presence/absence、exactly two batches、preflight 后输出位置及 informative-only data flow未发现新实现偏差；上一轮所列 differential/preflight-matrix 测试不足继续作为 advisory，不增加 verdict count。
- Design fidelity：IMPL-4 的 raw-boundary design 已落地；archive duplicate collector 尚未随之迁移，是 IMPL-5 的直接设计漂移。

## Ledger delta

| ID | Round-3 status | 裁定 |
|---|---|---|
| MBI-1 | verified | retained=9、titleChanged=0、两条旧 THEN line 的人工推导正确。 |
| IMPL-1 | verified | normalized matching 与 raw missing-line reporting 均正确。 |
| IMPL-2 | verified | assembled human lines 已执行 state-A 120-unit cap。 |
| IMPL-3 | verified | repaired `RENAMED + MODIFIED` 保留 equal-text pair。 |
| IMPL-4 | verified | inline closed fence 后的 heading 已在 stripped view 被识别并映射回 raw boundary。 |
| IMPL-5 | open | archive matcher collector 仍不扫描 stripped view，且 engine regex 未与 state-A `\s+` regex完全一致。 |

VERDICT: 1 issues open
