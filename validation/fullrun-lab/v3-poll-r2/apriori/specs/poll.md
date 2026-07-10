### Requirement: Poll Creation
发起人提交标题、2..20 个选项、投票模式与可选截止时间，系统创建投票并返回投票链接与管理链接。创建请求受严格 schema 与边界校验。

#### Scenario: PC-01 创建投票成功返回两条链接
- **Given** 合法输入：`title`(string, trim 后 1..200)、`options`(array of string, trim 后各 1..200 且非空, 数量 2..20)、`mode`∈{single,multiple}、可选 `deadline`(晚于当前服务器时间)
- **When** POST 创建投票
- **Then** 返回 2xx，含**投票链接**与**管理链接**；两条链接不同；管理链接携带 `adminKey`
- **And** `pollId` 与 `adminKey` 均由 CSPRNG 生成、各 ≥128 bit、URL-safe、不可从创建顺序/时间推断
- **And** 每个选项被分配稳定 option ID `opt-0..opt-{k-1}`，初始各计数为 0，`status=open`

#### Scenario: PC-02 创建输入非法则拒绝且不建记录
- **Given** 违反任一校验：字段缺失/为 null/类型错误（title 非 string、options 非 array-of-string、mode 非 string）、title trim 后为空或 >200、任一选项 trim 后为空、有效选项数 <2 或 >20、mode 非法、deadline malformed 或 ≤ 当前服务器时间
- **When** POST 创建投票
- **Then** 返回非 2xx（类型/schema 错误为 400），含可读错误
- **And** 不创建任何投票记录（无新文件落盘）
- **And** 错误信息与日志中不出现任何 adminKey

### Requirement: Voting
拿到投票链接的人匿名、不登录，按投票模式提交 option ID 完成投票；非法请求被拒绝且不改变计数。

#### Scenario: PC-03 单选投票计数加一并进入结果视图
- **Given** 一个 `mode=single`、`status=open`、未过截止的投票
- **When** 投票人提交**恰好一个**合法 option ID
- **Then** 该选项计数 +1（其余不变），返回 2xx 并导向结果视图

#### Scenario: PC-14 单选提交多个选项被拒绝
- **Given** 一个 `mode=single`、open 的投票
- **When** 投票人提交多于一个 option ID
- **Then** 返回非 2xx，所有选项计数不变

#### Scenario: PC-04 多选投票各选项计数加一
- **Given** 一个 `mode=multiple`、open 的投票
- **When** 投票人提交 k(k≥1) 个**互不相同**的合法 option ID
- **Then** 这 k 个选项各 +1，返回 2xx 并导向结果视图
- **And** 若 k=0（未选任何项）→ 返回非 2xx 并提示

#### Scenario: PC-12 非法投票请求被拒绝且计数不变
- **Given** 一个存在或不存在的投票
- **When** 提交 unknown `pollId` / unknown option ID / 重复 option ID / payload 类型错误或为空
- **Then** unknown pollId → 404；其余 → 400
- **And** 任何选项计数与投票状态均不变

### Requirement: Duplicate-Vote Soft Limit
同一浏览器对同一投票默认只记一次（localStorage 软限，刻意不阻止换设备/清缓存/无痕）。

#### Scenario: PC-05 同浏览器重复访问直接进入结果视图
- **Given** 某浏览器已对某投票成功投票（2xx 后置 localStorage 标记，key 作用域 `origin + pollId`）
- **When** 同一浏览器再次打开该投票链接
- **Then** 直接呈现结果视图而非投票视图
- **And** 换设备/清缓存/无痕不受本工具阻止（刻意的零门槛取舍）

### Requirement: Live Results
投票人投完即看结果；结果页加载即拉取一次，之后按固定间隔轮询刷新。

#### Scenario: PC-06 结果视图展示票数并按固定间隔轮询
- **Given** 投票成功后进入结果视图
- **When** 结果页加载
- **Then** 立即拉取一次结果并显示各选项票数与总票数
- **And** 之后每 `POLL_INTERVAL_MS`（默认 3000ms，常量可配置）自动拉取最新结果
- **And** 结果 endpoint 返回 `{title, options:[{id,text,count}], total, status, deadline}`

### Requirement: Poll Lifecycle & Close
投票可因到达截止时间自动关闭，或被持管理密钥的发起人手动关闭；关闭后不能再投，结果仍可读，视图显式呈现关闭态。

#### Scenario: PC-07 到达截止时间自动关闭
- **Given** 一个设置了 `deadline` 的投票
- **When** 处理投票请求时 `Date.now() >= deadline`（UTC 基准，进入 per-poll 临界区那一刻求值）
- **Then** 投票视为已关闭，投票提交返回非 2xx 并提示已结束
- **And** 结果仍可读

#### Scenario: PC-08 发起人凭管理密钥手动关闭
- **Given** 一个 open 的投票
- **When** 携带**有效 adminKey** 的关闭请求到达
- **Then** `status` 变为 closed，返回 2xx；此后投票提交返回非 2xx，结果仍可读
- **And** 携带无效/缺失 adminKey 的关闭请求返回非 2xx，`status` 不变

#### Scenario: PC-09 已关闭态在视图中显式呈现
- **Given** 一个 `status=closed`（手动或到期）的投票
- **When** 打开投票视图或结果视图
- **Then** 视图显式呈现「已关闭」（含关闭原因/截止信息）
- **And** 不渲染投票提交控件

### Requirement: Output Safety (XSS)
用户提供的 `title` 与 `options[].text` 属不可信输入；在 SSR 页面、内联 JSON、前端 DOM 渲染的任何出口都必须安全编码，杜绝 stored XSS。

#### Scenario: PC-15 用户输入在所有输出出口被安全编码
- **Given** 一个 title 或某选项文本含 HTML/脚本元字符（如 `<script>`, `"`, `&`, `</`, U+2028/U+2029）
- **When** 该投票被渲染到创建/投票/结果/管理页（SSR）、结果 endpoint 的内联 JSON、或前端结果轮询渲染
- **Then** SSR 文本插值一律 HTML-escape（`<`,`>`,`&`,`"`,`'`）；内联 `<script>` 中的 JSON 额外转义 `<`,`>`,`&`,U+2028,U+2029；前端一律用 `textContent` 而非 `innerHTML`
- **And** 页面中不出现可执行的注入脚本，`adminKey` 不因注入而泄露
- **And**（regression）注入用例覆盖 PC-01/PC-06/PC-09 的渲染路径，断言元字符被转义、无脚本执行

### Requirement: File-Store Concurrency & Durability
投票数据以每投票一文件的形式持久化；在单进程前提下，per-poll 串行化写队列 + 临时文件原子 rename 保证并发不丢票、崩溃不半写、失败无假成功。

#### Scenario: PC-10 并发投票不丢票
- **Given** 单进程运行、一个 open 投票
- **When** N 个合法投票请求几乎同时到达同一投票
- **Then** 最终各选项计数 = 各自合法提交次数之和（无读改写交叠覆盖）
- **And**（对抗测试）以并发注入 N 次投票并断言总计数守恒

#### Scenario: PC-11 崩溃不产生半写文件
- **Given** 正在写入某投票数据文件
- **When** 写入过程中进程中断/写临时文件失败
- **Then** 目标数据文件要么是旧完整内容、要么是新完整内容，绝不为半写损坏内容（临时文件 + 原子 rename）
- **And**（对抗测试）注入写中断并断言目标文件可完整解析、内容为旧或新完整版本

#### Scenario: PC-13 失败不产生假成功
- **Given** 一次 create/vote/close 操作
- **When** 持久化写失败（如 rename/写盘失败被注入）
- **Then** 返回非 2xx
- **And** 计数、状态、以及客户端「已投」标记均不改变（durable 写成功后才返回 2xx、才置浏览器标记）
- **And**（对抗测试）注入写失败并断言计数/状态不变且响应非 2xx
