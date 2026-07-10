<!-- Recorded on behalf of the reviewer (codex, session 019f3f4b-f0b0-7681-a376-986dd14c55d8, read-only sandbox).
     Raw output archived verbatim at apriori/review/quick-poll-req-review-v2-raw.txt. -->

# quick-poll 需求评审 v2

## 既有问题复核

- REQ-1 resolved: yes(§6 明确 deadline 格式、UTC、边界、拒过去)。
- REQ-2 resolved: yes(§7 CSPRNG ≥128-bit、常量时间比较、不泄露 token)。
- REQ-3 resolved: yes(§8 原子落盘步骤、失败返回、旧文件可读)。
- REQ-4 resolved: yes(§9 成功=2xx、每 poll 串行队列、失败不计票)。
- REQ-5 resolved: yes(§5 localStorage 按 poll id 隔离、仅 2xx 后写)。
- REQ-6 resolved: yes(§10 公式、整数四舍五入、0 人显示 0%)。
- REQ-7 resolved: yes(§11 统一错误体 + status + code)。
- REQ-8 resolved: yes(AC-13 HTML 转义纳入三页)。

## 六维复审新增问题

### REQ-9(维度 1/4):API payload schema 与解析失败行为不完整
malformed JSON、null/类型错误字段、非法 mode/deadline、缺失 optionIds、请求体上限精确字节数均未定义。建议加"请求 schema 与解析规则"小节,固定 body 上限(如 16 KiB)、`400 INVALID_JSON`、非法 mode/deadline 各自的稳定 code。

### REQ-10(维度 2):单次投票内重复 optionIds 语义未定义
`["a","a"]` 去重还是拒绝未定;可致某项 +2 而 totalVoters 只 +1。建议:重复即 `400 DUPLICATE_OPTION_ID` 不计票(便于测试、防计票膨胀)。

### REQ-11(维度 2, high):close 与 vote 并发顺序未明确
§9 只串行化了 vote,未说明 close 是否进同一队列。并发可致关闭状态被旧投票覆盖 / 已关闭仍计票。建议:所有修改同一 poll 文件的操作(vote + close)进入同一 per-poll mutation queue,按入队顺序串行;vote 执行时重新检查 status/deadline。

## 维度 3 / 5 / 6 / Out-of-scope:通过(无新正式问题)。

## Advisories(REQ-ADV-2, 3 items)
- 自动过 deadline 后是否持久化 `status: closed`。
- 重复关闭已 closed 的 poll:idempotent 2xx vs `409`。
- 字符长度口径明确为 Unicode code points / JS string length(避免 emoji 边界不一致)。

VERDICT: 3 issues open
