### Requirement: 创建投票

发起人 POST 标题与选项创建投票；输入按 req-final §4.1 规范校验；成功返回投票链接与管理链接。

#### Scenario: CR-01 合法创建返回双链接
- **Given** 服务运行中
- **When** POST `/api/polls`（请求头 `Host: 10.0.0.5:3000`），body 为 `{"title":"午饭吃什么","options":["火锅","麻辣烫","沙拉"]}`
- **Then** 响应 201，body 含 `pollId`、`voteUrl`（形如 `http://10.0.0.5:3000/p/<pollId>`——origin 取自请求 Host 头）、`adminUrl`（同 origin 的 `/admin/<pollId>/<key>`）；`data/<pollId>.json` 已存在且符合 schema（`schemaVersion:1`、票数全 0、status 为 open、`multiChoice:false`、`deadline:null`、`createdAt` 为 ISO 时间）

#### Scenario: CR-02 管理密钥强度与不泄漏
- **Given** 一个已创建的投票
- **Then** 管理密钥匹配 `^[A-Za-z0-9_-]{22,}$`（base64url(randomBytes(16)) ≥128 bit 熵），且 GET `/api/polls/<pollId>` 响应体与投票页 HTML 中均不出现该密钥

#### Scenario: CR-03 非法创建输入被拒且不产生文件
- **When** 分别以以下 body POST `/api/polls`：空标题；trim 后有效选项 <2；选项数 >20；标题 >120 字符；单个选项 >80 字符；trim 后重复选项
- **Then** 每次都响应 400、body 含 `error` 字段，且 `data/` 中未新增任何文件

#### Scenario: CR-04 trim、空项过滤与顺序保持
- **When** POST `/api/polls`，选项为 `["  A  ", "", "B", "   "]`，标题为 `"  投票  "`
- **Then** 创建成功后标题为 `投票`，有效选项为 `["A","B"]`（trim 后、空项被忽略、顺序保持创建顺序）

#### Scenario: CR-05 pollId 服务端生成且绝不覆盖
- **Given** pollId 生成器被注入为先返回一个已存在的 id、再返回新 id
- **When** POST `/api/polls` 创建新投票
- **Then** 已存在投票的文件内容不变，新投票用重新生成的 id 落盘；pollId 匹配 `^[A-Za-z0-9_-]{16}$`

### Requirement: 投票

参与者对开放中的投票提交单选一票；票数变更串行化、原子落盘。

#### Scenario: VO-01 合法投票计数加一并返回最新结果
- **Given** 一个开放中的投票
- **When** POST `/api/polls/<pollId>/vote`，body `{"optionIndex":1}`
- **Then** 响应 200，body 含各选项最新票数（选项 1 票数 +1）；`data/<pollId>.json` 中票数已持久化

#### Scenario: VO-02 非法选项被拒且票数不变
- **When** 分别以 `optionIndex` 为 `-1`、越界值、`1.5`、`"1"`、缺失 POST vote
- **Then** 每次响应 400、含 `error`，且所有选项票数不变

#### Scenario: VO-03 已关闭投票拒绝投票
- **Given** 一个已关闭的投票
- **When** POST vote 合法 `optionIndex`
- **Then** 响应 409、含 `error`，票数不变

#### Scenario: VO-04 五十个并发投票不丢票
- **Given** 一个开放中的投票
- **When** 同时发起 50 个合法 vote 请求
- **Then** 全部完成后，持久化的总票数 = 返回 200 的响应数（不丢票、不多计）

#### Scenario: VO-05 对不存在的投票投票返回 404
- **When** POST `/api/polls/AAAAAAAAAAAAAAAA/vote`（格式合法但不存在）
- **Then** 响应 404、含 `error`

### Requirement: 查看结果

任何人随时可读任何投票的实时结果（全透明）。

#### Scenario: RE-01 结果数据完整
- **Given** 一个有若干票的投票
- **When** GET `/api/polls/<pollId>`
- **Then** 响应 200，body 含 `title`、`options`（每项 `text`+`votes`，顺序为创建顺序）、`status`、`total`（各选项票数之和）；不含 `adminKey`

#### Scenario: RE-02 不存在的投票返回 404
- **When** GET `/api/polls/AAAAAAAAAAAAAAAA`
- **Then** 响应 404、含 `error`

#### Scenario: RE-03 损坏数据文件明确报错不崩溃
- **Given** `data/<pollId>.json` 内容为非法 JSON
- **When** GET `/api/polls/<pollId>`
- **Then** 响应 500、含 `error`；服务进程不退出；该文件内容未被改写

### Requirement: 关闭投票

仅持有效管理密钥可关闭；关闭持久化后才返回成功；幂等。

#### Scenario: CL-01 有效关闭后不可再投、结果可读
- **Given** 一个开放中的投票及其管理密钥
- **When** POST `/api/polls/<pollId>/close`，body `{"key":"<正确密钥>"}`
- **Then** 响应 200；`data/<pollId>.json` 的 status 已为 closed；随后 vote 返回 409；GET 结果仍 200 且 status 为 closed

#### Scenario: CL-02 错误密钥被拒且状态不变
- **When** POST close，key 为错误字符串
- **Then** 响应 403、含 `error`，status 仍为 open

#### Scenario: CL-03 重复关闭幂等
- **Given** 一个已关闭的投票
- **When** 持正确密钥再次 POST close
- **Then** 响应 200，status 保持 closed

#### Scenario: CL-04 关闭不存在的投票返回 404
- **When** POST `/api/polls/AAAAAAAAAAAAAAAA/close`，key 格式合法
- **Then** 响应 404、含 `error`

### Requirement: 持久化与健壮性

原子写、成功响应 ⇔ 已落盘、恶意/异常输入不破坏状态或触达 `data/` 外路径。

#### Scenario: PS-01 写入走临时文件加原子落盘
- **Given** 存储层的文件操作被注入记录器
- **When** 执行创建与投票
- **Then** 每次持久化都先写 `data/` 内临时文件，再原子落盘——创建走 `link`（目标已存在则 EEXIST，绝不覆盖）、更新走 `rename`；操作完成后 `data/` 内无残留临时文件

#### Scenario: PS-02 写入失败返回 5xx 且状态不变
- **Given** 存储层被注入为写入抛错
- **When** POST vote 合法请求
- **Then** 响应 500、含 `error`；`data/<pollId>.json` 中票数保持原值

#### Scenario: PS-03 非法请求体统一 400 且状态不变
- **When** 分别以非法 JSON、空 body、`title` 非字符串、`options` 非数组、`key` 非字符串 POST 各写接口
- **Then** 每次响应 400、含 `error`，且无任何投票状态变化

#### Scenario: PS-04 超大请求体返回 413
- **When** POST `/api/polls`，body 超过 64 KB
- **Then** 响应 413、含 `error`

#### Scenario: PS-05 路由参数先校验后访问、杜绝路径穿越
- **When** 以 `../etc/passwd`、`..%2F..%2Fx`、过短/含非法字符的 pollId 访问各含参路由
- **Then** 每次响应 404，且存储层未发生任何 `data/` 目录之外的文件访问（以注入记录器断言）

#### Scenario: PS-06 请求日志不泄漏管理密钥
- **Given** logger 被注入记录器
- **When** GET `/admin/<pollId>/<正确密钥>`
- **Then** 日志行中该请求路径呈现为 `/admin/<pollId>/<redacted>`，完整密钥不出现在任何日志输出中

### Requirement: 页面与客户端

三个页面（创建/投票/管理）+ 客户端行为：3 秒轮询、localStorage 已投标记、移动端适配。

#### Scenario: PG-01 首页提供创建表单
- **When** GET `/`
- **Then** 响应 200 的 HTML，含标题输入、选项输入与提交入口

#### Scenario: PG-02 投票页对存在的投票返回 200、不存在返回 404
- **When** GET `/p/<存在的 pollId>` 与 GET `/p/AAAAAAAAAAAAAAAA`
- **Then** 前者 200 HTML（含该投票标题与选项渲染逻辑），后者 404

#### Scenario: PG-03 管理页需要正确密钥
- **When** GET `/admin/<pollId>/<正确密钥>` 与 GET `/admin/<pollId>/<错误密钥>`
- **Then** 前者 200 HTML 且含关闭入口；后者 404（不区分"poll 不存在"与"密钥错误"）

#### Scenario: PG-04 结果每三秒自动刷新
- **Given** 客户端轮询核心逻辑（poll-core）以注入的计时器运行
- **When** 启动结果轮询
- **Then** 以 3000ms 间隔重复拉取结果；单次拉取失败时保留上次结果并继续下一轮

#### Scenario: PG-05 已投标记锁定投票入口
- **Given** poll-core 以注入的 storage 运行
- **When** 投票成功后重新进入该投票页逻辑
- **Then** 状态为"已投过"、无提交入口（storage 中有该 pollId 标记）；storage 不可用时退化为允许投票
