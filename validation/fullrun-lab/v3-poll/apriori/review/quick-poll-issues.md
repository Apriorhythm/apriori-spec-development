# quick-poll — issue ledger

> STEP0 各轮评审行均由 codex（read-only）产出、producer 代录（recorded on behalf of the reviewer）；原始输出见 `quick-poll-req-review-v{N}-raw.md`。

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | 管理密钥"不可猜测"缺少可测试定义 | high | 1 | verified |
| REQ-2 | 创建输入边界和选项规范未完整定义 | med | 1 | verified |
| REQ-3 | 关闭投票与并发投票的竞态规则未定义 | high | 1 | verified |
| REQ-4 | 文件写入失败、部分写入和成功响应的回滚语义未定义 | high | 1 | verified |
| REQ-5 | pollId 的生成、格式校验和碰撞处理未定义 | high | 2 | verified |
| REQ-6 | POST 请求体异常路径未定义 | med | 2 | verified |
| ADV-1 | advisory batch acknowledged (5 items) | low | 1 | advisory-acked |
| ADV-2 | advisory batch acknowledged (3 items) | low | 2 | advisory-acked |
| ADV-3 | advisory batch acknowledged (2 items) | low | 3 | advisory-acked |
| SPEC-1 | 管理密钥会进入请求日志 | high | 1 | verified |
| SPEC-2 | create 的"绝不覆盖已有 poll 文件"缺少可执行设计 | high | 1 | verified |
| SPEC-3 | per-poll Promise 链在失败后可能永久断裂 | high | 1 | verified |
| SPEC-4 | Host 头生成链接的需求未进入 spec 场景和设计 | med | 1 | verified |
| ADV-4 | advisory batch acknowledged (3 items) | low | 1 | advisory-acked |
| ADV-5 | advisory batch acknowledged (2 items) | low | 1 (STEP5) | advisory-acked |

> SPEC-n / ADV-4 由 STEP2 P5 评审员（codex session 019f3ed7-7d18-7de3-9adc-fa0bf0725d81, read-only）产出，producer 代录；原始输出见 `quick-poll-design-review-v{N}-raw.md`。Round found 按 STEP2 轮次计。
> ADV-5 即 STEP5 P8 评审员原始输出中的 "ADV-CODE-1" 批次（2 项：PS-03 逐接口覆盖粒度、tmp 清理可观测性）——评审员的行格式与 P0 批次行约定不一致，producer 按约定归一化落账；原始行见 `quick-poll-consistency-v1-raw.md`。P8 verdict：no spec-vs-code gaps。
