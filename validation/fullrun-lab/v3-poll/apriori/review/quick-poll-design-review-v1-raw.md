# quick-poll — design review v1

## Issues

### SPEC-1 — 管理密钥会进入请求日志

- **Description**: 设计要求日志记录 `method path status ms`，但管理页路由是 `/admin/<pollId>/<key>`，因此访问管理页时 `adminKey` 会被原样写入 stdout。
- **Risk**: 管理密钥泄漏到日志后，任何能读日志的人都可以关闭投票；这违反“密钥只在管理链接中出现”的安全边界。
- **Suggestion**: 日志中对敏感路径做脱敏，例如 `/admin/<pollId>/<redacted>`；错误日志也不要包含完整 URL、key 或请求体。

### SPEC-2 — create 的“绝不覆盖已有 poll 文件”缺少可执行设计

- **Description**: 设计只说明持久化使用 `tmp -> rename`，但 POSIX/Node 的 `rename` 会覆盖已存在目标文件。CR-05 要求 pollId 冲突时重新生成，不能覆盖旧投票；当前设计没有声明 create 如何在写入前/写入时检测并处理目标已存在。
- **Risk**: 实现若直接复用原子替换路径，注入式碰撞测试会失败；极端情况下会覆盖已有投票文件，造成数据丢失。
- **Suggestion**: 为创建单独设计 no-overwrite 路径：生成 id 后先检测目标存在，存在则重试；并在 store API 上区分 `createNewPoll` 与 `replaceExistingPoll`，create 遇到 `Exists` 必须清理 tmp 并重新生成 id。

### SPEC-3 — per-poll Promise 链在失败后可能永久断裂

- **Description**: 设计写成 `chain = chain.then(task)`。如果某次 vote/close 因 IO、损坏 JSON 或校验后的业务异常 reject，后续挂到同一 rejected chain 的任务会被跳过，除非实现显式吞掉前序错误并重建尾链。
- **Risk**: 一次磁盘错误或损坏文件访问后，同一 poll 的后续状态变更可能持续失败，形成生产事故。
- **Suggestion**: 明确 queue 实现：以前序 `catch(() => {})` 后的 resolved tail 执行任务；返回当前任务结果；并在 `finally` 中只清理当前 tail，避免 Map 泄漏和竞态删除。

### SPEC-4 — Host 头生成链接的需求未进入 spec 场景和设计

- **Description**: `req-final.md` 要求创建响应的链接以请求 `Host` 头为准，但 spec 只断言 URL 含 `/p/<pollId>` 和 `/admin/<pollId>/<key>`，design 也没有说明 create 响应如何取 Host 构造绝对链接。
- **Risk**: 实现可能硬编码 localhost 或使用监听 HOST/PORT，内网用户拿到不可分享的链接，核心创建流程返工。
- **Suggestion**: 增加场景断言带 `Host: 10.0.0.5:3000` 创建时返回该 origin 的链接；design 在 router/create 中明确从请求 Host 构造链接，缺失 Host 时使用安全 fallback。

## Advisories

- `data/` 的 cleanup-invalidation 基本可接受，因为投票文件无删除需求；但建议说明服务启动时是否清理历史残留 `.tmp-*` 文件。崩溃后残留 tmp 不会破坏读写，但会减少运维歧义。
- spec 未直接断言文件 schema 的所有预留字段（`schemaVersion`、`id`、`createdAt`、`multiChoice:false`、`deadline:null`）。设计引用了 req-final schema，当前不作为阻塞项，但补一个创建后 schema 断言会更稳。
- 超大 body 的设计写了“413 并断开”，建议明确为“先返回 JSON `{"error":...}` 再停止继续处理”，避免实现成直接 destroy socket 导致客户端拿不到规范错误体。

## LEDGER DELTA

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SPEC-1 | 管理密钥会进入请求日志 | high | 1 | open |
| SPEC-2 | create 的“绝不覆盖已有 poll 文件”缺少可执行设计 | high | 1 | open |
| SPEC-3 | per-poll Promise 链在失败后可能永久断裂 | high | 1 | open |
| SPEC-4 | Host 头生成链接的需求未进入 spec 场景和设计 | med | 1 | open |
| ADV-4 | advisory batch acknowledged (3 items) | low | 1 | advisory-acked |

VERDICT: 4 issues open
