# codex P1 raw output — quick-poll req-review round 2 (resumed thread 019f3f0c-e1de-7042-9c59-425211e5801a)

A) 逐项确认与新增问题

REQ-1：未完全 resolved，需 reopen。v2 已定义 trim、重复文本、稳定 option ID 和长度，但“trim 后为空的选项无效（不计入选项数）”与 PC-02 中“空选项 → 拒绝创建”存在歧义：空白选项到底是忽略后按有效选项数判断，还是只要出现就拒绝。该差异会直接影响 PC-01/PC-02 测试。

REQ-2：resolved。时间输入、存储、比较基准和判定时点都已明确。

REQ-3：resolved。adminKey 的 CSPRNG、entropy、URL-safe 和禁入日志要求已明确。

REQ-4：resolved。创建边界中的长度、数量、mode、deadline malformed/过去时间均已覆盖。

REQ-5：resolved。PC-12 已覆盖 unknown pollId、unknown option ID、重复 option ID、非法/空 payload，并声明状态不变。

REQ-6：resolved。v2 已声明 per-poll lock 内判定，并定义进入临界区时的 now。

REQ-7：resolved。PC-13 已声明 durable write 成功后才返回 2xx，失败不改计数/状态/浏览器标记。

REQ-8：resolved。PC-06 已把轮询改为加载即拉取一次、之后每 3000ms，并声明 `POLL_INTERVAL_MS` 与结果 endpoint 形状。

新增问题：  
REQ-9：`pollId` 声明为“不可枚举”，但没有 entropy/生成方式/可测试标准。风险是实现可能使用递增 ID 或短随机串，满足 URL-safe 但不满足“不可枚举”。建议声明 `pollId` 也由 CSPRNG 生成，至少 96 或 128 bit entropy，URL-safe，且不得从创建顺序推断。

REQ-10：创建请求的 payload schema 对 null/type 错误仍不够明确。v2 规定了长度和数量，但没有明确 `title` 必须为 string、`options` 必须为 array of string、每个 option 非 string/null 时如何响应。风险是 malformed create payload 可能产生 500 或实现分歧。建议新增验收：若 create payload 类型错误/null，则 400，且不创建记录。

B) LEDGER DELTA

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | 空白选项规则仍有歧义：是忽略后按有效选项数判断，还是只要出现空选项就拒绝 | med | STEP0·r2 | open |
| REQ-2 | 截止时间格式/时区/无效/过去时间规则已明确 | med | STEP0·r2 | verified |
| REQ-3 | 管理密钥强度/生成要求已明确 | high | STEP0·r2 | verified |
| REQ-4 | 创建投票长度、数量、非法 mode、malformed/past deadline 边界已覆盖 | med | STEP0·r2 | verified |
| REQ-5 | 非法投票 payload 已覆盖并声明状态不变 | high | STEP0·r2 | verified |
| REQ-6 | 投票与关闭/截止并发顺序语义已明确 | high | STEP0·r2 | verified |
| REQ-7 | 写失败/rename 失败/timeout 的回滚与 HTTP 语义已明确 | high | STEP0·r2 | verified |
| REQ-8 | PC-06 轮询间隔和 endpoint 形状已可测试 | low | STEP0·r2 | verified |
| REQ-9 | `pollId` 的“不可枚举”缺少 entropy/生成方式/可测试标准 | med | STEP0·r2 | open |
| REQ-10 | 创建请求 payload 的 null/type 错误未明确 schema 与响应 | med | STEP0·r2 | open |

VERDICT: 3 issues open