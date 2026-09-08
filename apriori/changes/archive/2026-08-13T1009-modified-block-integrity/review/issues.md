# Issue ledger — modified-block-integrity

<!-- recorded on behalf of the reviewer (codex read-only sandbox), R2 transcription rule; raws: review/*-raw.txt -->

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | subsequence 与 unordered preservation 冲突，line normalization/scope 未闭合（维度 1, 2, 4） | med | STEP0·r1 | verified |
| REQ-2 | scenario identity、titleChanged、duplicate ID、无 ID occurrence 语义未定义（维度 1, 2, 4） | med | STEP0·r1 | verified |
| REQ-3 | JSON/human schema、排序、截断及 identical entry 存在性不确定（维度 1, 4） | med | STEP0·r1 | verified |
| REQ-4 | effective id-pattern failure policy 未定义，并可能破坏 state A matcher 调用纪律（维度 2, 3, 5） | med | STEP0·r1 | verified |
| REQ-5 | archive high-level 与 single-file form 的覆盖范围不明（维度 1, 2, 5） | med | STEP0·r1 | verified |
| REQ-6 | archive ERROR/preflight failure 的 report 存在性矩阵缺失（维度 2, 4） | med | STEP0·r1 | verified |
| REQ-7 | AC7 的“missingLines 若干如实”不是确定 oracle，fixture 也未固定（维度 4） | med | STEP0·r1 | verified |
| REQ-8 | target lineage 未包含两个未归档先行 change，不符合实际 state A（维度 5, 6） | med | STEP0·r1 | verified |
| REQ-9 | Q2 confirmation flag 未裁定且与既定 informative/write semantics 冲突（维度 1, 3, 5） | med | STEP0·r1 | verified |
| REQ-10 | requirement/scenario body 结构边界未钉死（标题行入比较=rename 假阳性；fence 内伪标题切分）。 | med | STEP0·r2 | verified |
| REQ-11 | AC4 无确定 verdict/exit oracle。 | med | STEP0·r2 | verified |
| REQ-ADV-1 | Advisory batch acknowledged (4 items: 测试数量为本轮基线；AC7 期望人工推导；RUNBOOK 双语补句；analyzer 纯共享 helper——均已吸收)。 | — | STEP0·r2 | advisory-acked |
| SPEC-1 | identical MODIFIED 的全空 entry 契约与无条件基数分类冲突。 | med | STEP2·r1 | verified |
| SPEC-2 | archive 缓冲输出无法满足真实写前打印，且设计插入点早于 temp/destination preflight guards。 | high | STEP2·r1 | verified |
| SPEC-3 | AM-45/SR-66 无法证明 rename 前 raw capture 与 repaired-rerun entry。 | med | STEP2·r1 | verified |
| SPEC-4 | bin→cli→archiveChange 的 matcher DI 接口及 missing-factory 行为未定义，且所称 export 在 State A 不存在。 | med | STEP2·r1 | verified |
| SPEC-5 | integrity human section 直接输出外部文本，缺少 control-character sanitization。 | high | STEP2·r1 | verified |
| MBI-1 | T1 人工推导发现 req/SR-68 早先断言（titleChanged=2）与冻结材料不符——两场景仅 THEN 行变、标题未变。 | low | STEP5·r0(producer) | verified |
| IMPL-1 | `missingLines.line` 输出 normalized line，未保存完整旧行原文 | med | STEP5·r1 | verified |
| IMPL-2 | human formatter 截断 external fields 而非最终 line，输出可超过 120 UTF-16 units | med | STEP5·r1 | verified |
| IMPL-3 | stamped repaired `RENAMED + MODIFIED` 因只查 pre-rename key 而漏掉 MODIFIED entry | med | STEP5·r1 | verified |
| IMPL-4 | 同行内闭合 fence 后的场景标题在 state A（先剥后扫）有效，按行过滤实现漏识别。 | med | STEP5·r2 | verified |
| IMPL-5 | archive 侧标题采集器未跟上剥离视图语义（inline-fence 标题不入 matcher batch，ID 配对退化）。 | med | STEP5·r3 | verified |
| IMPL-6 | 跨行定界 span 内的闭合 fence 内容被连同定界行丢弃，未参与比较。 | med | STEP5·r4 | verified |
| MBI-ADV-1 | Advisory batch acknowledged (P8 各轮 advisory：basename 展示歧义沿传统、沙箱动态测试以 producer evidence 采信等)。 | — | STEP5·r6 | advisory-acked |
