# codex P1 raw output — quick-poll req-review round 1 (thread 019f3f0c-e1de-7042-9c59-425211e5801a)

A) 审查正文

**1. Target State B 是否清晰无歧义**

结论：不够清晰，存在可影响实现分歧的问题。

REQ-1：文档多处使用“有效选项”，但没有定义有效性的规则。  
风险：空白选项、前后空格、重复选项、超长选项、同名选项在不同实现中会被不同处理，PC-01、PC-02、PC-03、PC-04 的测试无法稳定。  
建议修复：声明选项归一化规则，例如 trim 后非空才有效；是否允许重复显示文本；提交投票时使用稳定 option ID 还是选项文本。

REQ-2：截止时间仍是开放问题，但已经进入核心能力。  
风险：服务器本地时间、浏览器本地时间、UTC、日期格式、过去时间、无效时间会导致 PC-07 的关闭时刻不可测试。  
建议修复：明确输入格式、存储格式、时区、过去截止时间的处理，以及“当前时间 ≥ 截止时间”的比较基准。

REQ-3：管理密钥的目标强度未定义。  
风险：PC-08 依赖“只有发起人持有的密钥”，但弱随机、短 token、可枚举 token 都可能满足字面实现却不满足安全目标。  
建议修复：声明 token 生成要求，例如使用 cryptographically secure random，最小 entropy，URL-safe 编码，禁止日志泄露。

**2. Edge Cases 与异常路径覆盖**

结论：覆盖不足，尤其是输入边界、投票 payload、并发关闭和失败回滚。

REQ-4：创建投票的边界输入不完整。  
风险：缺少 title 长度、option 长度、option 数量上限、mode 缺失或非法、deadline malformed 等规则，AI 实现会自行发挥。  
建议修复：把这些边界加入 PC-02 或新增验收项，并给出拒绝响应与“不创建记录”的要求。

REQ-5：投票提交 payload 的非法情况未覆盖。  
风险：未知 poll ID、未知 option ID、重复 option ID、多选中重复提交同一项、payload 为空或类型错误时，计数可能错误或出现 500。  
建议修复：新增验收项：若提交不存在的 poll/option、重复 option ID 或非法 payload，则返回非 2xx，且任何计数不变。

REQ-6：投票与关闭/截止的并发顺序未定义。  
风险：投票请求与手动关闭同时到达，或投票请求跨过 deadline 时，是否计票会因锁时机不同而不同。  
建议修复：声明状态检查必须在同一 per-poll lock 内完成，并定义判定时间点，例如“处理请求进入临界区时若 poll 已关闭或 now ≥ deadline，则拒绝”。

REQ-7：失败回滚语义只覆盖半写文件，未覆盖操作失败后的 HTTP 与状态。  
风险：disk full、rename 失败、写队列异常、进程超时、关闭失败等情况下，客户端可能收到成功但数据未落盘，或本地浏览器标记已投但服务端未计票。  
建议修复：声明 create/vote/close 只有在 durable write 成功后才返回成功；失败返回非 2xx；失败不得改变计数、状态或浏览器已投标记。

**3. 是否存在 implied but undeclared 状态变化或副作用**

结论：有，但多数为 advisory；其中浏览器标记与失败语义已计入 REQ-7。

advisory：PC-05 暗含浏览器本地状态写入，但未声明使用 localStorage、cookie 还是其他机制，也未声明 key 的作用域。建议明确为 localStorage/cookie 之一，并说明同 origin、同 poll ID 的行为。  
advisory：结果页轮询会产生周期性读取负载；几十人规模可接受，但建议声明 endpoint 返回的数据形状。  
advisory：数据长期保留已在 §5 和 §6 声明，不构成问题。

**4. Acceptance Criteria 是否都可测试**

结论：大体可测试，但仍有一个标准不够精确。

REQ-8：PC-06 的轮询间隔使用“N 可配置，默认约 3s”，其中“约”不可精确断言。  
风险：测试无法判断 2s、3s、5s 是否合格，也无法知道配置入口。  
建议修复：声明默认值精确为 3000ms，允许误差范围，配置方式，以及前端是否必须立即拉取一次。

**5. 是否与 Current State A 冲突**

结论：无冲突。该仓库当前是 greenfield，无应用代码；仅存在需求和流程文档。未发现会与现有实现冲突的问题。

**6. Target Lineage 是否声明且匹配仓库现实**

结论：已声明且匹配。文档声明 lineage 为 master；仓库当前分支为 master，且无已实现应用代码。  
advisory：仓库不是字面空目录，已有 requirement、apriori、CLAUDE.md、LAB-NOTES.md 等文档，但这不影响“空仓起步、无代码实现”的判断。

**其他 advisories**

§5 已存在明确非目标 section，满足 out-of-scope 要求。  
建议后续把 §8 的开放问题全部转化为验收项或非目标，否则它们会继续阻塞直接交给 AI 实现。

B) LEDGER DELTA

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | “有效选项”未定义，包括 trim、空白、重复、超长、稳定 option ID 规则 | PC-01/PC-02/PC-03/PC-04 实现和测试会分歧 | 1 | open |
| REQ-2 | 截止时间格式、时区、无效/过去时间规则未定义 | PC-07 自动关闭时刻不可稳定测试 | 1 | open |
| REQ-3 | 管理密钥强度和生成要求未定义 | PC-08 的“只有发起人持有”可能被弱 token 实现破坏 | 1 | open |
| REQ-4 | 创建投票缺少 title/option 长度、数量上限、非法 mode、malformed deadline 等边界规则 | 输入校验不完整，AI 实现会自行决定 | 1 | open |
| REQ-5 | 非法投票 payload 未覆盖，包括 unknown poll、unknown option、duplicate option ID、类型错误 | 可能错误计票、500 或状态污染 | 1 | open |
| REQ-6 | 投票与手动关闭/截止同时发生时的顺序语义未定义 | 并发场景下同一请求可能被不同实现计入或拒绝 | 1 | open |
| REQ-7 | 写入失败、rename 失败、timeout 等失败回滚和响应语义未定义 | 客户端成功感知与实际落盘状态可能不一致 | 1 | open |
| REQ-8 | PC-06 的轮询间隔“默认约 3s”不可精确测试，配置入口未定义 | 自动刷新验收不稳定 | 1 | open |
| REQ-9 | Advisory batch: 本地已投标记机制、轮询 endpoint 形状、仓库非字面空目录等为建议性澄清 | 不计入 correctness/testability/edge/conflict 阻塞项 | 1 | open |

VERDICT: 9 issues open