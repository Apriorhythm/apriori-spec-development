# KB — poll-service（quick-poll 全部）

## Contract (code-is-truth)

`source-commit: ce55e11e11f01e421a38cfa9615739b6fc3eeeb7`（本节以代码为唯一真相；stamp 只覆盖本节）

### 职责与接口

零 npm 依赖 Node（≥20，ESM）HTTP 服务：匿名单选投票的创建/投票/结果/关闭。入口 `server.js`（`HOST` 默认 `0.0.0.0`，`PORT` 默认 `3000`；`createApp(opts)` 供测试注入 `dataDir/fs/ids/logger`）。

HTTP 面（`lib/router.js`；错误体一律 `{"error":"…"}`）：

| 路由 | 行为 | 成功 / 失败 |
|---|---|---|
| GET `/` `/style.css` `/poll-core.js` `/app.js` `/poll.js` `/admin.js` | 静态白名单 | 200 |
| POST `/api/polls` | 创建 | 201 `{pollId, voteUrl, adminUrl}` / 400 |
| GET `/api/polls/<id>` | 结果 | 200 `{title, options[{text,votes}], status, total}` / 404、500(损坏) |
| POST `/api/polls/<id>/vote` `{optionIndex}` | 投一票 | 200 最新结果 / 400、404、409(已关闭)、500(写失败) |
| POST `/api/polls/<id>/close` `{key}` | 关闭（幂等） | 200 / 400、403(key 错)、404 |
| GET `/p/<id>` | 投票页（`{{POLL_ID}}` 模板注入） | 200 / 404 |
| GET `/admin/<id>/<key>` | 管理页 | 200 / 404（key 错与不存在统一 404） |

链接 origin 取请求 `Host` 头（缺失回退监听地址）。请求体上限 64KB→413；JSON/字段类型错误→400。

### 数据与三时刻

`data/<pollId>.json`，schema v1：`{schemaVersion, id, title, options[{text,votes}], status: open|closed, adminKey(明文，仅存文件、绝不出公开面), createdAt, multiChoice:false(预留), deadline:null(预留)}`。

- **init**：服务启动 `mkdir data/` + 清理 `.tmp-*` 残留；创建投票经 `writeNew`（tmp + `fs.link`，EEXIST 撞 id 重试 ≤5，绝不覆盖）。
- **runtime update**：vote/close 经 per-poll 队列（`lib/queue.js`：入队序=生效序，前序失败被吞、绝不断链）→ `writeExisting`（tmp + `rename` 原子替换）。成功响应 ⇔ 已落盘；无内存缓存，每请求读盘。
- **cleanup/invalidation**：无删除路径（文件永久保留）；损坏 JSON 读取 → 500，不改写不重置。

### 关键校验与安全

- 输入（`lib/polls.js`）：trim 后标题 1–120、选项 1–80、数量 2–20、去空项、拒重复；`optionIndex` 必须整数；`key` 必须字符串。
- 标识（`lib/ids.js`）：pollId=`randomBytes(12)`→base64url 16 字符；adminKey=`randomBytes(16)`→22 字符；比较用 `timingSafeEqual`。
- 路由参数先过 regex（`^[A-Za-z0-9_-]{16}$` / `{22,64}`）再触存储；store 内 `path.resolve` 纵深防御，杜绝 `data/` 外访问。
- 日志：`method path status ms`；admin 路径 key 记为 `<redacted>`；错误日志不含 URL/key/body。

### 客户端约定

`public/poll-core.js` 为浏览器/node:test 双用纯逻辑（轮询 3000ms、失败保留上次结果；localStorage `quick-poll-voted:<id>` 已投锁定，storage 异常退化为可投）。页面动态内容一律 `textContent` 注入（无服务端用户输入插值）。

### 坑

- **单进程前提**：串行化在进程内存中，多实例/cluster 会破坏并发正确性（README 已声明）。
- `rename` 原子性依赖同文件系统：tmp 文件必须在 `data/` 内，不能用系统 /tmp。
- 测试命令：`npm test`（TAP，供 `apriori verify` 绑定）；E2E：`NPMROOT=$(npm root -g) node tests/e2e/e2e.mjs`。

## Decisions (doc-is-truth)

- **D1 (active)** 文件即唯一真相：无数据库、无内存缓存，每个投票一个 JSON 文件；成功响应 ⇔ 已落盘。规模假设：几十人/投票。
- **D2 (active)** 全透明结果：任何人任何时刻可看实时票数（含未投票者）——开会投影是一等场景；已否决"投完才可见/关闭才揭晓"。
- **D3 (active)** 防手滑不防刷票：浏览器 localStorage 级防重，换浏览器可再投是已接受的退化；对手是误操作不是黑产。
- **D4 (active)** 管理权 = 持有管理链接：CSPRNG 密钥、无账号体系；链接丢失即无人能关闭（已接受）；管理页不比公开页多展示任何数据。
- **D5 (active)** 关闭幂等（200）；投票与关闭 per-poll 串行化，关闭持久化后才返回成功，在途票有效。
- **D6 (active)** 扩展预留不实现：`multiChoice`/`deadline` 字段恒 `false`/`null`——多选无场景、截止与手动关闭重叠；升级路径已留。
- **D7 (active)** 轮询不推送：3 秒轮询替代 WebSocket（规模不需要）；单次轮询失败静默保留上次结果。
- **D8 (active)** 被否决的替代方案：Express 等框架（内网装依赖不便）、按 IP 限票（NAT 误伤）、历史列表页（链接即入口）、创建后编辑（票据失义）。
