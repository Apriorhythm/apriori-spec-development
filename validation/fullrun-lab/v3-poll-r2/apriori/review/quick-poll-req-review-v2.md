# 需求评审 — quick-poll req-v2（STEP0 round 2，P1 异构评审，resumed）

> 评审者：codex（read-only），resumed thread `019f3f0c-e1de-7042-9c59-425211e5801a`
> 原始输出存档：`apriori/review/quick-poll-req-review-v2-raw.md`（及 `.jsonl`）

## 逐项复核（round-1 findings）
- REQ-1：**未完全解决 → reopen**。空白选项规则仍有歧义（忽略后按有效数判断 vs 只要出现空选项即拒绝），影响 PC-01/PC-02 测试。
- REQ-2..REQ-8：**resolved → verified**（时间语义、adminKey、创建边界、非法投票 payload、并发临界区判定、durable 后才 2xx、轮询精确 3000ms + endpoint 形状，均已明确）。

## 新增问题
- **REQ-9**：`pollId` 声明"不可枚举"但无 entropy/生成方式/可测标准；实现可能用递增或短随机串。建议 CSPRNG、≥96/128 bit、不可从创建顺序推断。
- **REQ-10**：创建请求 payload 的 null/type 错误 schema 未明确（title 须 string、options 须 array of string 等），malformed create payload 可能 500 或实现分歧。建议：类型错误/null → 400 且不建记录。

## Verdict（原文，逐字）
VERDICT: 3 issues open
