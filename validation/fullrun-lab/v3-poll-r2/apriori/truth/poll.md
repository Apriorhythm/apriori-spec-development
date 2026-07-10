# KB — poll 模块（quick-poll 匿名快速投票工具）

> module: poll · 覆盖 `src/{ids,escape,validate,store,queue,views,server}.js` + `public/{poll,create,admin}.js`
> 首次建立于 change `quick-poll`。

## Contract (code-is-truth)

> source-commit: `ddb3b49c2d766a8077c53e0f0f49ce64cb47bf75`（本 Contract 依此 commit 的实现反向抽取；仅覆盖本节）

### 公开职责 / HTTP 接口
单进程 Node http 服务（`src/server.js` `createServer({ dataDir, _hooks? })`），文件存储、无数据库。路由：
- `GET /` → 创建页（SSR）。
- `POST /api/polls` → 创建。请求体 JSON `{title:string, options:string[], mode:'single'|'multiple', deadline?:string|int}`。成功 `201 {pollId, adminKey, voteUrl, adminUrl, resultUrl}`。校验失败 `400 {error}` 且不落盘。链接 origin 取自 `req.headers.host`。
- `GET /p/:id` 投票页 / `GET /r/:id` 结果页 / `GET /admin/:id?key=` 管理页（SSR）；未知 id → 404；管理页 key 无效 → 403。
- `POST /api/polls/:id/vote` → 请求体 `{optionIds:string[]}`。未知 poll→404；已关闭/过期→409；payload 非法（未知/重复 option、类型错、单选非恰一、多选空）→400；成功 `200 {ok,resultUrl,results}`。
- `GET /api/polls/:id/results` → `200 {title, options:[{id,text,count}], total, status:'open'|'closed', deadline}`；未知→404。
- `POST /api/polls/:id/close` → 请求体 `{adminKey}`。有效 key→`200 {ok:true}` 置 status=closed；无效/缺失→403 状态不变；未知 poll→404。

### 核心数据流 / 状态与副作用（三个时刻）
- **初始化**：`ids.newPollId()/newAdminKey()` = `crypto.randomBytes(16).base64url`（128-bit，URL-safe，不可枚举）。poll 记录 `{pollId,title,options:[{id:'opt-i',text}],mode,deadlineMs|null,status:'open',counts:{opt-i:0},adminKey}` 经 `store.save` 落 `<dataDir>/<pollId>.json`。
- **运行时更新**：vote/close 经 `queue.runExclusive(pollId, fn)` —— **per-poll 串行化写队列**（单进程内每 pollId 一条 Promise 链）；临界区内 `store.read` 读最新 → 判定 `effectiveClosed`（`status==='closed' || (deadlineMs!=null && Date.now()>=deadlineMs)`，进入临界区时求值）→ 变更 counts/status → `store.save`。
- **清理/失效**：无自动清理；status='closed' 为逻辑失效，文件保留可读。

### 持久化契约（`src/store.js`）
`writeAtomic(file,str,hooks)`：写唯一后缀 tmp（非 `.json`）→ `fsync` → `renameSync`。任一步失败 → 清理 tmp、抛错、目标文件保持原样。`save` 抛错则调用方返回非 2xx，**计数/状态不落盘、durable 成功后才 2xx**。`read` 缺文件返回 null。

### 输出安全（`src/escape.js`）
`htmlEscape` → HTML 实体（先 `&`）；`jsonForScript` → `JSON.stringify` 后 `< > &` 转 `</>/&`、U+2028/U+2029 转 ` / `（内联脚本源码不含裸 `</script`/`<script`/裸分隔符）。SSR 用户文本走 htmlEscape，内联 JSON 走 jsonForScript，前端渲染用 `textContent`。

### 约定与坑
- 关闭鉴权用 `crypto.timingSafeEqual`（长度不等直接拒）；**adminKey 不进任何日志/错误响应**。
- option 提交用**稳定 option ID**（非文本）；计票/去重基于 ID。
- 前端软限：投票成功(2xx)后 `localStorage['voted:'+origin+':'+pollId]='1'`；投票页加载若标记存在 → 跳结果页。**换设备/清缓存/无痕不阻止**（刻意的零门槛取舍）。
- 结果页轮询间隔 `views.POLL_INTERVAL_MS = 3000`（加载即拉一次 + `setInterval`）。

## Decisions (doc-is-truth)

- **D1 · 单进程单实例部署（invariant, active）**：并发不丢票 / 崩溃不半写 / 无假成功三条保证依赖单 Node 进程内的内存写队列 + 原子 rename，**只在单进程下成立**。多实例/多进程部署会使 per-poll 内存锁失效 —— 明确 out of scope。若未来需多实例，须引入外部串行化（与"文件存储、内网单机"前提冲突，属新决策）。人类于 gate② 确认（"给内网一台机器用，不会搞多实例"）。
- **D2 · 文件存储、不使用数据库（decision, active）**：发起人明确否决 DB（含 SQLite）。每投票一 JSON 文件，锁粒度 = pollId。被否决替代：SQLite/DB、全局单文件存全部投票（锁粒度过粗）。
- **D3 · 匿名零门槛，重复投票仅浏览器软限（decision, active）**：不做账号/登录，不做 IP 防刷（同办公室共用出口 IP 会误伤）。软限用 localStorage，刻意可被绕过。
- **D4 · 输出编码防 stored XSS（invariant, active）**：用户 title/选项为不可信输入，所有出口（SSR/内联 JSON/前端 DOM）必须安全编码。来源：STEP2 P5 评审 SPEC-1。code 若违反此不变量按 bug 处理。
- **D5 · 无实时推送、无改票、无改题、无结果导出、无自动过期（decision, active）**：均因几十人量级 YAGNI 或避免复杂度；各有升级路。
- **D6 · adminKey/pollId 用 CSPRNG 128-bit、不可枚举（invariant, active）**：禁止递增或时间派生 ID；adminKey 禁入日志。来源：STEP0 REQ-3/REQ-9。
