# 一致性评审 — quick-poll（STEP5，P8 异构评审）

> 评审者：codex（read-only），thread `019f3f30-7ade-71d1-9eed-bcf6931122ca`（读完输入后被 provider websocket 404 中断，按 R2 resume 同一 session 续完）。
> 原始输出存档：`apriori/review/quick-poll-consistency-review-raw.md`（及 `.jsonl`）。

## 结论
无 spec-vs-code gap。实现与 spec 语义对齐：PC-01..04/12/14 校验与计数不变、PC-05 软限仅 2xx 后置标记、PC-06 结果形状+加载即拉+3000ms 轮询、PC-07/08/09 截止/手动关闭/关闭态、PC-15 三出口输出编码 + adminKey 不入日志 + timingSafeEqual 鉴权。

**三条硬保证测试确认为实质对抗测试（非空绑定）**：
- PC-10：`Promise.all` 并发 50 次 vote，断言总数守恒 + 两选项各 25。
- PC-11：`afterTmpWrite` 在 rename 前抛错，断言目标文件仍可解析且为旧完整内容。
- PC-13：`failRename` 注入写失败，断言 vote 非 2xx、计数/状态不变；另有 create 写失败不留记录。

## Advisory（reviewer 独有判定；不计入 verdict）
测试断言强度可提升（ADV-BATCH-1）：
1. PC-01 adminUrl 精确包含 adminKey —— **已采纳**。
2. PC-13 补 close writeFail 非 2xx + status 不变 —— **已采纳**。
3. PC-09 补 result page 关闭 banner 断言 —— 记录，未采纳（vote page 已充分覆盖场景 INTENT；E2E 已实际验证结果页关闭态）。
4. PC-15 补 admin/closed page + 真实前端执行断言 —— 部分由 Playwright E2E 覆盖（注入 <img onerror> 后 window.__XSS__ 未定义 + 截图肉眼确认）；单测层未加，记录。

## Verdict（原文，逐字）
VERDICT: no spec-vs-code gaps
