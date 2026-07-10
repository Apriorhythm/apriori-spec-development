# quick-poll req review v1

## 维度结论

| Dimension | Verdict | 说明 |
|---|---|---|
| 1. Target state B clear and unambiguous | Fail | 主流程清楚，但创建输入规范和安全密钥强度仍有会影响实现选择的歧义。 |
| 2. Edge cases and exception paths covered | Fail | 缺少输入边界、关闭与投票并发、文件写入失败/回滚等关键路径定义。 |
| 3. Implied but undeclared state changes or side effects | Pass | 投票文件、票数变更、关闭状态、本地浏览器标记等主要副作用已声明。 |
| 4. Acceptance criteria testable | Fail | AC1 的“不可猜测”没有客观阈值；AC7/AC9 在并发和持久化失败下缺少可判定规则。 |
| 5. Conflict with current state A | Pass | 当前态 A 声明为空仓库；未发现冲突。 |
| 6. Target lineage declared and matches repo reality | Pass | 需求声明落在 `master` 主线；仓库当前分支为 `master`，且无 KB 指出多 lineage 冲突。 |

## 正式问题

### Dimension 1 / 4

#### REQ-1 — 管理密钥“不可猜测”缺少可测试定义

- Description: AC1 要求管理链接含“不可猜测的密钥”，但没有定义随机源、最小熵、长度、字符集或生成方式。实现可能用短 token、时间戳、`Math.random` 等方式，仍自称满足需求。
- Risk: high。管理密钥可猜会允许未授权关闭投票，直接破坏关闭权限模型；同时验收无法客观判断“不可猜测”。
- Suggested fix: 明确管理密钥必须由 Node 标准库 `crypto` 的 CSPRNG 生成，至少 128 bit 熵，例如 `crypto.randomBytes(16)` 后用 URL-safe 编码；管理密钥只出现在管理链接中，不在公开投票页或结果数据中返回。

### Dimension 1 / 2

#### REQ-2 — 创建输入边界和选项规范未完整定义

- Description: AC1/AC2 只说“标题 + ≥2 个非空选项”，但未定义空白修剪、重复选项、选项数量上限、标题/选项长度上限，以及重复显示文本如何计票。尤其是重复选项会让“提交一个合法选项”和“该选项票数 +1”产生歧义。
- Risk: med。不同实现会对 `" A "`、空白字符串、重复选项、超长输入给出不同结果，导致创建、展示和计票行为不可预测。
- Suggested fix: 增加输入规范：标题和选项均先 `trim`；标题长度范围例如 1-120；选项数量范围例如 2-20；每个选项长度例如 1-80；trim 后重复选项拒绝创建并提示原因；展示顺序按创建顺序保留。

### Dimension 2 / 4

#### REQ-3 — 关闭投票与并发投票的竞态规则未定义

- Description: AC7 说关闭后任何投票提交都被拒绝，AC9 说 50 个并发投票不丢票，但没有定义关闭请求和投票请求同时到达时的线性化顺序。例如关闭请求处理过程中已有投票请求是否可成功，取决于实现选择。
- Risk: high。实现和测试可能对同一竞态给出不同预期，出现“关闭成功后仍有票增加”或“本应成功的在途投票被拒”的争议。
- Suggested fix: 明确每个投票的状态变更必须串行化；投票和关闭使用同一 per-poll 锁/队列；请求按进入临界区的顺序生效；关闭状态持久化完成后，后续进入临界区的投票一律拒绝；关闭响应只在状态持久化后返回成功。

### Dimension 2 / 4

#### REQ-4 — 文件写入失败、部分写入和成功响应的回滚语义未定义

- Description: 需求规定文件存储和并发不损坏，但没有说明创建、投票、关闭在文件写入失败、磁盘错误、进程中断或 JSON 部分写入时应如何响应，也没有规定成功响应是否必须代表已经持久化。
- Risk: high。系统可能先返回成功再写文件，或写坏 JSON 后丢票/丢状态；AC9 的“总票数等于成功响应数”在写入失败时无法验证。
- Suggested fix: 明确所有变更操作只有在 JSON 原子写入成功后才能返回成功；写入失败返回错误且不得改变已持久化状态；采用临时文件写入后 `rename` 的原子替换策略；读取到损坏文件时返回明确错误而不是崩溃或静默重置。

## Advisory

- 建议明确默认监听地址、端口和链接生成规则，例如 `HOST`/`PORT` 环境变量及默认值；否则 AI 会自行选择，影响手工验收。
- 建议给出页面/API 路由、HTTP 状态码和 JSON 响应形状，尤其是创建、结果、投票、关闭接口；这会让后续自动化测试更稳定。
- 建议把第 7 节开放问题改成明确决定，例如“管理页展示公开结果 + 关闭按钮，不展示额外信息”，避免 `req-final` 仍带开放项。
- 建议声明每个投票 JSON 文件的最小 schema、schema version，以及为“多选”和“截止时间”预留的字段名和默认值。
- 建议定义客户端轮询失败、请求超时、`localStorage` 不可用时的页面行为；这不是核心正确性阻塞，但会减少实现差异。

VERDICT: 4 issues open
