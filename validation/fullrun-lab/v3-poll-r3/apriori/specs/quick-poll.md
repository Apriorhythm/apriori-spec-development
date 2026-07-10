### Requirement: PC — 创建投票 (Poll Creation)

发起人提交标题 + 2–10 选项 + 可选 mode/deadline,服务端校验后持久化并返回分享链接与私密管理链接。所有 `POST` body ≤ 16 KiB、`Content-Type: application/json`。

#### Scenario: PC-01 创建合法投票返回两条链接
- **If** `POST /api/polls` body `{title:"午饭吃啥", options:["火锅","麻辣烫"]}`(合法,mode 省略)
- **Then** 201,响应含 `shareUrl` 与 `adminUrl`;新 poll `status="open"`、`mode="single"`、各选项 `votes=0`、`totalVoters=0`;`shareUrl` 不含 admin token。

#### Scenario: PC-02 选项少于 2 个被拒
- **If** `POST /api/polls` 的 `options` 长度 < 2
- **Then** 400 `{error:"OPTION_COUNT_OUT_OF_RANGE"}`,不创建任何文件。

#### Scenario: PC-03 恰好 10 个选项创建成功
- **If** `options` 长度 = 10 且各项合法
- **Then** 201 创建成功,10 个选项全部保存。

#### Scenario: PC-04 选项多于 10 个被拒
- **If** `options` 长度 > 10
- **Then** 400 `OPTION_COUNT_OUT_OF_RANGE`,不创建。

#### Scenario: PC-05 空白标题被拒
- **If** `title` 为空串或仅空白(trim 后为空)
- **Then** 400 `TITLE_REQUIRED`。

#### Scenario: PC-06 标题超长被拒
- **If** `title` 的 Unicode code point 数 > 100
- **Then** 400 `TITLE_TOO_LONG`。

#### Scenario: PC-07 空白选项被拒
- **If** 任一 option 的 text trim 后为空
- **Then** 400 `OPTION_REQUIRED`。

#### Scenario: PC-08 选项超长被拒
- **If** 任一 option 的 code point 数 > 50
- **Then** 400 `OPTION_TOO_LONG`。

#### Scenario: PC-09 mode 缺省为 single
- **If** 创建时不传 `mode`
- **Then** poll 的 `mode` 持久化为 `"single"`。

#### Scenario: PC-10 非法 mode 被拒
- **If** `mode` 不是 `"single"` 或 `"multi"`
- **Then** 400 `INVALID_MODE`。

#### Scenario: PC-11 过去/等于当前的 deadline 被拒
- **If** 创建时 `deadline` 解析后 ≤ 当前服务器时间
- **Then** 400 `DEADLINE_IN_PAST`。

#### Scenario: PC-12 不可解析的 deadline 被拒
- **If** `deadline` 不是可解析的 ISO 8601 字符串
- **Then** 400 `INVALID_DEADLINE`。

#### Scenario: PC-13 malformed JSON 被拒
- **If** `POST /api/polls` 的 body 不是合法 JSON
- **Then** 400 `INVALID_JSON`,不创建。

#### Scenario: PC-14 字段缺失/类型错误被拒
- **If** `title` 非 string、或 `options` 非数组等类型不符
- **Then** 400 `INVALID_PAYLOAD`。

#### Scenario: PC-15 请求体超过 16 KiB 被拒
- **If** `POST` body 字节数 > 16384
- **Then** 413 `PAYLOAD_TOO_LARGE`,不创建。

#### Scenario: PC-16 缺失/错误 Content-Type 被拒(SPEC-1)
- **If** 任一 `POST` API(create/vote/close)的 `Content-Type` 不是 `application/json`(缺失或其它类型)
- **Then** 415 `UNSUPPORTED_MEDIA_TYPE`,不处理 body、不产生任何状态变化。所有 POST handler 在解析 body 前统一校验。

### Requirement: VT — 投票 (Voting)

投票人经分享链接对指定选项 id 提交投票;服务端串行计票并原子落盘,返回结果快照。

#### Scenario: VT-01 单选投票计票
- **If** single poll,`POST /api/polls/<id>/vote` body `{optionIds:["<opt>"]}`
- **Then** 200,该选项 `votes+1`、`totalVoters+1`,响应含各选项票数与总人数。

#### Scenario: VT-02 单选投多项被拒
- **If** single poll 且 `optionIds` 长度 > 1
- **Then** 400 `SINGLE_CHOICE_VIOLATION`,不计票。

#### Scenario: VT-03 多选投多项计票
- **If** multi poll,`optionIds` 含多个不同合法选项
- **Then** 200,所选各项各 `+1`,`totalVoters` 只 `+1`。

#### Scenario: VT-04 空选择被拒
- **If** `optionIds` 为空数组
- **Then** 400 `NO_SELECTION`,不计票。

#### Scenario: VT-05 一次请求内重复选项被拒
- **If** `optionIds` 含重复 id(如 `["a","a"]`)
- **Then** 400 `DUPLICATE_OPTION_ID`,不计票(不出现某项 +2 而 totalVoters 只 +1)。

#### Scenario: VT-06 投给不存在的选项被拒
- **If** `optionIds` 含该 poll 不存在的 option id
- **Then** 400 `OPTION_NOT_FOUND`,不计票。

#### Scenario: VT-07 投给不存在的投票被拒
- **If** vote 的 poll id 不存在
- **Then** 404 `POLL_NOT_FOUND`。

#### Scenario: VT-08 软拦截:投过再打开只见结果
- **If** 同一浏览器成功投票(2xx)后再打开分享页
- **Then** 页面据 localStorage(键按 poll id 隔离)直接渲染结果视图,不显示投票表单。

#### Scenario: VT-09 投票失败不置已投标记
- **If** 一次投票返回非 2xx(如 `POLL_CLOSED`)
- **Then** 浏览器不写入该 poll 的已投标记,用户可重试。

### Requirement: RS — 结果展示 (Results)

#### Scenario: RS-01 百分比整数四舍五入
- **If** 某选项 `votes/totalVoters*100` = 33.33…
- **Then** 结果显示为四舍五入整数(`33%`)。

#### Scenario: RS-02 零投票显示 0%
- **If** `totalVoters == 0`
- **Then** 所有选项显示 `0%`(不出现除零错误)。

#### Scenario: RS-03 多选百分比可合计超 100%
- **If** multi poll 中多数人各选多项
- **Then** 各选项百分比按 `votes/totalVoters` 计,合计允许 > 100%。

### Requirement: CL — 生命周期与管理 (Lifecycle & Admin)

> **close token 契约(SPEC-2)**:`POST /api/polls/<id>/close` 的 admin token 经 **body `{adminToken}` 或 header `X-Admin-Token`** 提供;两者都在时 **body 优先**;两者都缺 → 403 `INVALID_ADMIN_TOKEN`。校验用常量时间比较。

#### Scenario: CL-01 手动关闭后拒新票
- **If** 持合法 admin token `POST /api/polls/<id>/close`,随后经分享链接投票
- **Then** close 返回 2xx 且 `status="closed"`;其后 vote 返回 409 `POLL_CLOSED`;结果仍可 `GET`。

#### Scenario: CL-02 到点自动关闭拒新票
- **If** poll 设了 deadline 且当前时间 ≥ deadline,此时投票
- **Then** 409 `POLL_CLOSED`,不计票。

#### Scenario: CL-03 无 token 关闭被拒
- **If** `close` 请求不带 admin token
- **Then** 403 `INVALID_ADMIN_TOKEN`,状态不变。

#### Scenario: CL-04 错误 token 关闭被拒
- **If** `close` 带错误 admin token
- **Then** 403 `INVALID_ADMIN_TOKEN`(常量时间比较),状态不变。

#### Scenario: CL-05 重复关闭幂等
- **If** 对已 closed 的 poll 用合法 token 再次 close
- **Then** 幂等返回 2xx,`status` 仍为 `closed`。

#### Scenario: CL-06 deadline 过期持久化 closed
- **If** deadline 已过的 poll 首次被读取/写入
- **Then** 其磁盘 JSON 的 `status` 被持久化为 `"closed"`(该读时状态转移经 per-poll 队列串行执行,见 design SPEC-4)。

#### Scenario: CL-07 已关闭投票的分享页只读(SPEC-3)
- **If** `status="closed"` 的 poll,`GET /poll/<id>`
- **Then** 页面渲染结果视图,**不显示投票表单/提交控件**(顶部标注已关闭)。

#### Scenario: CL-08 已过期投票的分享页只读(SPEC-3)
- **If** poll 设了 deadline 且 `now >= deadline`,`GET /poll/<id>`
- **Then** 页面按 closed 渲染,只读、无投票表单;服务端同时 lazy 持久化 `status="closed"`(CL-06)。

#### Scenario: CL-09 过期后首次请求是投票也持久化 closed(GAP-4)
- **If** poll 已过 deadline 且 `status` 仍为 open,过期后**第一个到达的请求是投票**
- **Then** 返回 409 `POLL_CLOSED` 且**磁盘 JSON 的 `status` 同时被持久化为 `"closed"`**(lazy-close 在同一 per-poll 队列内完成,不因拒票而漏写)。

### Requirement: SEC — 安全 (Security)

#### Scenario: SEC-01 admin token 不泄露给投票人
- **If** 请求 `shareUrl`、投票页 HTML、以及公开结果接口 `GET /api/polls/<id>`
- **Then** 响应体与页面均不包含该 poll 的 `adminToken`(全文搜索无匹配)。

#### Scenario: SEC-02 标题/选项 HTML 被转义(含投票后动态视图,SPEC-6)
- **If** 标题或选项文本含 `<script>alert(1)</script>` 之类 HTML
- **Then** 在**初始 SSR 的投票页/结果页/管理页**、以及**投票成功后前端动态切换出的结果视图**中,均以文本形式转义呈现,不作为 HTML 执行(SSR 输出无未转义 `<script>`;客户端 DOM 更新仅用 `textContent`/安全属性赋值,禁止拼入 `innerHTML`)。

### Requirement: CC — 并发与持久化保证 (Concurrency & Durability)

#### Scenario: CC-01 并发投票不丢票
- **If** 约 50 个合法投票请求并发打到同一 poll
- **Then** 落盘后 `totalVoters` = 返回 2xx 的请求数,各选项票数之和与之一致,无丢失/覆盖(对抗性并发测试)。

#### Scenario: CC-02 崩溃持久化:正常路径下 ack 后进程被杀数据仍在
- **If** 在**正常路径(临时文件 fsync 与目录 fsync 均成功)**下,一次投票返回 2xx 成功后立即 `SIGKILL` 服务进程,再重启读取该 poll
- **Then** 该票仍在磁盘 JSON 中。实现须先对临时文件 fsync、`rename`、再对父目录 fsync,全部成功后才返回 2xx —— 此路径即"成功=跨崩溃持久"。(目录 fsync **失败**的异常路径不在本 scenario,见 CC-05:提交已成立,返回 2xx,承担极小残余风险;两者共同保证"2xx=已提交可见、`500`=无可观测变更"。)

#### Scenario: CC-03 close 与 vote 并发被串行化
- **If** 一个 close 与多个 vote 并发到达同一 poll
- **Then** 二者进入同一 per-poll 队列按序执行;close 持久化后其后到达的 vote 一律 409 `POLL_CLOSED`;最终 `totalVoters` = close 生效前的成功 vote 数,无竞态丢失或越权计票。

#### Scenario: CC-04 持久化失败不谎报成功
- **If** 注入**提交点(rename)之前**的落盘失败(临时文件写/fsync/rename 失败)
- **Then** 投票返回 500 `PERSIST_FAILED`,该 poll 计数不增加,旧 JSON 文件仍可解析(未被破坏)。

#### Scenario: CC-05 提交后目录 fsync 失败不谎报失败(GAP-5)
- **If** `rename` 已成功(写入已提交、对外可见),此后目录 fsync 失败
- **Then** 投票**返回 200 且计票已持久化**(不返回 500)——因为 `rename` 是提交点,提交后不得谎报失败;目录 fsync 失败仅记录告警(承担极小的崩溃即失同步的残余风险)。这保证"500 ⇒ 无可观测变更"始终为真。
