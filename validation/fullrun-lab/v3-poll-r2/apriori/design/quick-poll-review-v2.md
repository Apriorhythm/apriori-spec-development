# 规格/设计评审 — quick-poll（STEP2 round 2，P5 异构评审，resumed）

> 评审者：codex（read-only），resumed thread `019f3f1c-1a41-7553-acde-5da7c5d889ef`
> 原始输出存档：`apriori/review/quick-poll-design-review-v2-raw.md`（及 `.jsonl`）

## 判定
- **SPEC-1 reopen（high）**：PC-15 的 spec 覆盖面正确，但 design §5b 的 `jsonForScript` 替换映射写成了"原字符→原字符"（HTML 实体在 md 里渲染成原字符，字面上等于空操作），`</script><script>` 仍可逃逸内联脚本。要求改为明确的安全 ASCII `\uXXXX` 转义（`<`→`<` 等），并在 PC-15 断言内联脚本源码不含裸 `</script`/`<script`/U+2028/U+2029。
- 无新增独立 formal issue。

## Advisory
- design 目录布局漏列 `src/escape.js`；§8 测试策略未显式列入 PC-15（建议同步）。

## Verdict（原文，逐字）
VERDICT: 1 issues open

> Producer 处理（P6）：§5b `jsonForScript` 已改为 `</>/&/ / ` 明确转义，PC-15 测试断言"内联脚本源码不含裸 </script/<script/U+2028/U+2029"；两条 advisory 已采纳（escape.js 入布局、PC-15 入 §8）。SPEC-1 → fixed(design r2)。
