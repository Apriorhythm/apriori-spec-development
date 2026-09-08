# STEP5 implementation review v6 — modified-block-integrity

## 结论

IMPL-6 已正确修复，可更新为 `verified`。本轮未发现新的 spec-vs-code gap；此前 IMPL-1..6 与 MBI-1 均可关闭。

## IMPL-6 复核

`scanBlockStructure()` 现在对跨行 scenario delimiter 的 raw range 做了精确区分：

- 构成 delimiter 的 raw fragments 继续排除；
- 完整位于 closed fence span 内的非空 raw lines 被 prepend 到该 scenario body；
- 随后的普通 body lines保持原始顺序；
- line matching 使用 normalized text，报告继续返回 raw old line。

Round-5 精确反例现在得到：

```json
{
  "retained": [
    {"id":"KV-01","title":"KV-01 one"}
  ],
  "titleChanged": [],
  "dropped": [],
  "added": [],
  "ambiguous": [],
  "missingLines": [
    {"scenario":"KV-01","line":"fenced-old"}
  ]
}
```

扩展为多条 fenced lines 后，未变化行仍被 subsequence 消费，只有被替换的 `fenced-old` 被报告；delimiter fragments 没有产生假阳性。该行为同时满足：

- state-A fence-stripped delimiter discovery；
- fenced non-empty lines 参与 body comparison；
- heading 本身不参与比较；
- `missingLines` 保留旧侧 raw text。

新增 AM-45 exact oracle 能区分旧实现与当前修补。

## 最终 P8 checklist

### Semantic faithfulness

AM-43..47 与 SR-65..68 的实现路径均符合场景意图：

- cardinality truth table、互斥分类与 ambiguous ordering；
- normalized greedy subsequence 与 raw missing-line reporting；
- requirement prose、closed/unclosed fence、inline fence、split heading及 fence-within-delimiter 边界；
- rename-then-modify 与 repaired rerun capture；
- verify fourth matcher segment 零 binding 污染；
- archive matcher DI、warning degradation 与 preflight 后输出；
- GREEN/GAPS presence、ERROR/`--specs` absence；
- frozen fixture 的 retained=9、titleChanged=0、两条旧 THEN line。

### Spec’d behavior and silent branches

未发现仍未实现或被静默忽略的正式分支。历轮发现的 raw preservation、assembled-line truncation、repaired rename capture 与复杂 fence boundaries 均已有能够击穿旧实现的 regression oracle。

### External-input report path

human formatter 对 titles、lines、requirement names、file suffixes 与 ambiguous keys先执行 C0/DEL replacement，再对 assembled line 执行 state-A 120 UTF-16-unit cap。JSON 继续保留完整 raw text并由 `JSON.stringify()` 转义。

### Guarantee claims

实现结构继续满足：

- report 不参与 verdict、exit 或 write bytes；
- config-origin verify 保持 exactly two matcher batches；
- `modifiedIntegrity` 在 GREEN/GAPS always present，在 ERROR 与 `--specs` absent；
- archive integrity section 位于所有 preflight guards 后、RESULT/write-result lines 前。

此前提出的 reportless differential baseline、完整 preflight failure table 与 warning full-string oracle仍可作为测试强化，但未发现相应实现偏差，不计 verdict。

### Design fidelity

G1–G3 的核心设计均已实现：

- single-snapshot `modifiedBlocks`；
- pure comparison helper；
- fourth title segment；
- bin-level matcher factory seam；
- shared human formatter；
- raw-boundary-aware state-A structure scan。

文档方面仍建议把 CHANGELOG 的 `120-unit field truncation` 改为 assembled-line truncation，并在双语 archive CLI 段明确 warning degradation；这些属于非阻断性文档精度 advisory。

只读 sandbox 下，纯 engine tests 与精确对抗样本可执行通过；依赖 `mkdtemp` 的集成测试受 `EROFS` 限制。该结果属于题面指定的 R2 artifact；完整环境证据为 318/318 GREEN、`verify --change` GREEN、`check --self` PASS。

## Ledger delta

| ID | Final status | 裁定 |
|---|---|---|
| MBI-1 | verified | 冻结 fixture 的正确人工推导为 retained=9、titleChanged=0、两条旧 THEN line。 |
| IMPL-1 | verified | normalized matching 与 raw missing-line reporting 正确。 |
| IMPL-2 | verified | assembled human lines 正确执行 state-A 120-unit truncation。 |
| IMPL-3 | verified | repaired `RENAMED + MODIFIED` 保留 equal-text pair。 |
| IMPL-4 | verified | inline closed fence 后暴露的 heading 正确映射。 |
| IMPL-5 | verified | engine/archive 使用 verbatim state-A regex，split headings 与 archive ID pairing 正确。 |
| IMPL-6 | verified | delimiter raw range 内的 fenced content 正确进入 scenario body并参与比较。 |

VERDICT: no spec-vs-code gaps
