# 规格/设计评审 — quick-poll（STEP2 round 1，P5 异构评审）

> 评审者：codex（read-only），thread `019f3f1c-1a41-7553-acde-5da7c5d889ef`
> 过程：round 1 首次调用被本地 2min 工具超时中断，按 R2 resume 同一 session 续跑（provider 侧 websocket 一度 404，第 3 次 resume 恢复并落 verdict）。
> 原始输出存档：`apriori/review/quick-poll-design-review-v1-raw.md`（及 `.jsonl`）

## 问题（按维度）
### 5. 安全（外部输入）
- **SPEC-1（high · security）**：用户输入 `title` / `options[].text` 会进入 SSR 页面、结果 JSON 和前端渲染，但 spec/design 未声明 HTML escaping / 安全 JSON 序列化 / DOM 安全渲染。风险：**stored XSS**，可窃取 `adminKey`、伪造关闭请求、污染结果页。
  修复建议：SSR 插值必须 HTML-escape；内联 JSON 转义 `<`,`>`,`&`,U+2028/U+2029；客户端用 `textContent` 而非 `innerHTML`；补 XSS regression tests 覆盖 PC-01/PC-06/PC-09。

### 1–4 维度
- 场景覆盖、三个时刻、状态-A、spec/design 一致性：未发现会导致返工/事故的 formal gap（单进程前提已按人类锁定，不作为 issue）。

## Advisory（不计入 verdict）
- 建议补 unknown `pollId` 的 GET 路由 404 覆盖。
- 统一 `counts[]` 与 counts map 的文档表述，减少测试夹具歧义。

## Verdict（原文，逐字）
VERDICT: 1 issues open
