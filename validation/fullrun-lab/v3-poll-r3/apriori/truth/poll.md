# TRUTH-DOC — module: `poll` (quick-poll)

> 快速匿名投票工具。单进程 Node 标准库 HTTP 服务 + 每个投票一个 JSON 文件。

## Contract (code-is-truth)

> `source-commit: 18ece846ef615d71513d79f8c39462ec45419376`
> 本节仅反映该提交下的实现;code 是唯一真相,变更后须刷新此 stamp。

### 公开职责与接口(`src/server.js`)

单进程 HTTP 服务,路由:

| 方法 · 路径 | 职责 | 关键返回 |
|---|---|---|
| `GET /` | 创建页(SSR) | HTML |
| `POST /api/polls` | 创建投票 | 201 `{shareUrl, adminUrl}` |
| `GET /api/polls/<id>` | 公开结果 JSON(**剥离 adminToken**) | 200 `toPublic(poll)` |
| `POST /api/polls/<id>/vote` | 投票 | 200 结果快照 |
| `POST /api/polls/<id>/close` | 关闭(需 admin token) | 200 `{status}` |
| `GET /poll/<id>` | 分享/投票页(SSR;closed→只读) | HTML |
| `GET /admin/<id>?token=` | 管理页(校验 token) | HTML / 403 |

- 所有 `POST`:`Content-Type: application/json` 必需(否则 415 `UNSUPPORTED_MEDIA_TYPE`);body ≤ 16 KiB(超限 413 `PAYLOAD_TOO_LARGE`);空 body 视为 `{}`;非法 JSON → 400 `INVALID_JSON`。
- close token 取值**按字段存在性**:body 有 `adminToken` 字段则用之(即使空串),否则用 `X-Admin-Token` header(`src/server.js`)。
- 错误码表(单一源 `src/errors.js` `ERROR_STATUS`):`TITLE_REQUIRED/TITLE_TOO_LONG/OPTION_REQUIRED/OPTION_TOO_LONG/OPTION_COUNT_OUT_OF_RANGE/DEADLINE_IN_PAST/INVALID_MODE/INVALID_DEADLINE/INVALID_PAYLOAD/INVALID_JSON/NO_SELECTION/SINGLE_CHOICE_VIOLATION/DUPLICATE_OPTION_ID/OPTION_NOT_FOUND/POLL_NOT_FOUND(404)/POLL_CLOSED(409)/INVALID_ADMIN_TOKEN(403)/UNSUPPORTED_MEDIA_TYPE(415)/PAYLOAD_TOO_LARGE(413)/PERSIST_FAILED(500)`。

### 领域模型(`src/model.js`)

- poll JSON 字段:`{id, title, options:[{id,text,votes}], mode:"single"|"multi", createdAt, deadline:ms|null, status:"open"|"closed", totalVoters, adminToken}`。
- `id` = `randomBytes(12).base64url`(16 字符,URL-safe);`adminToken` = `randomBytes(16).hex`(128-bit CSPRNG)。
- `toPublic()` 剥离 `adminToken`,附整数四舍五入百分比;`totalVoters==0` → 各项 0%。
- 长度口径 = Unicode code points(`[...s].length`);title ≤100、option ≤50(trim 后)。
- mode `single` 投多项 → `SINGLE_CHOICE_VIOLATION`;multi 各选项各 +1、`totalVoters` +1。

### 外部共享状态 — 三个时刻

**(1) 磁盘 JSON 文件 `data/polls/<id>.json`(`src/store.js`)**
- init:进程启动 `ensureDir`(`mkdir -p`);**无启动全量扫描**,纯按需 `load`。
- runtime update:每次 vote/close/lazy-close 经 per-poll 队列串行:`load → 改内存 → atomicWrite`。
- cleanup/invalidation:无自动清理;失效=逻辑关闭(`status="closed"` 或过 deadline);deadline 过期在首次访问时经队列 lazy 持久化 closed;load 到损坏 JSON → 记日志跳过,不崩溃。

**(2) 进程内 per-poll 队列 `Map<pollId,Promise>`(`src/queue.js`)**
- init:模块级空 Map。
- runtime update:`runExclusive(id,fn)` = `prev.then(fn,fn)` 尾接链;tail 永不 reject;同 id 串行、不同 id 并行;vote 与 close 共用 → 互斥。
- cleanup:尾 settle 后 `if(map.get(id)===tail) map.delete(id)`;进程重启即全清(队列易失,真值在磁盘)。

### 原子落盘与持久化契约(`src/store.js` `atomicWrite`)

- 路径:写 `<id>.json.tmp.<rand>` → `fsync(tmp)` → `rename` → `fsync(dir)`。
- **`rename` = 提交点**:
  - 提交前失败(tmp 写/fsync、rename 本身)→ 抛 `PERSIST_FAILED`(500),**旧文件不变、无可观测变更**。
  - 提交后目录 fsync 失败 → **提交成立、返回 2xx、记录持久性告警**(不谎报 500)。
- 因此:**2xx = 已提交且可见**;**跨崩溃持久性在目录 fsync 成功的正常路径下成立**。
- 常量时间 token 比较(`src/server.js` `safeTokenEqual`):对定长 buffer 恒定 `timingSafeEqual` + 单独查长度。

### 代码派生的坑

- path traversal:`id` 必须匹配 `/^[A-Za-z0-9_-]{1,64}$/`,否则 `load` 拒绝(不拼路径)。
- XSS:SSR 全部经 `escapeHtml`;客户端动态结果视图**只用 `textContent`**,禁止 `innerHTML` 拼接不可信文本。
- adminToken 仅存服务端 JSON,`toPublic`/分享页/公开接口永不输出。

### 验证锚点

- `apriori verify --specs apriori/specs --test-cmd "node --test --test-reporter=tap"` → GREEN(44 scenario 全绑定)。**注意:node 24 需显式 `--test-reporter=tap`,默认 reporter 非 TAP。**
- Playwright E2E 叠加层:`node --test e2e/poll.e2e.js`(不在 verify 的 TAP 发现内)。

## Decisions (doc-is-truth)

> 本节记录本次变更的决策/不变量/被否方案;**永不**从 code 反向校准——若 code 违反某 active 不变量,应报 bug。

- **D1 — 零运行时依赖,方案 1**(active):仅 Node 标准库(`http`/`fs`/`crypto`),不用数据库、不用 Web 框架。被否:方案 2(Express)——对该规模杀鸡用牛刀;方案 3(纯前端+公共 KV)——做不到多人一致同步且与"文件存储自持"冲突。
- **D2 — 每投票一个 JSON 文件 + 原子落盘**(active):不用数据库(需求硬约束);写走 tmp→fsync→rename→fsync(dir)。
- **D3 — 单进程 per-poll 串行队列**(active):vote 与 close 共用同一 `runExclusive`;磁盘文件的唯一写者是"队列内的 fn",无队列外写盘路径(含 lazy-close)。**不变量**:同一 poll 的任意两次写入不得交错。多进程部署需升级为文件锁/外部锁(当前非目标)。
- **D4 — 崩溃持久性保证的精确范围**(active,STEP5/P8 收敛,§4.8 保证声明纪律):POSIX 下目录 fsync 必在 rename 之后,无法同时满足"500⇒旧值可见"与"2xx⇒无条件崩溃持久"。**不变量**:`500 ⇒ 无可观测变更`;`2xx ⇒ 已提交且可见`;跨崩溃持久仅在目录 fsync 成功的正常路径下保证。**此决策精化了 req-final §8 的失败措辞(经 gate④ 人类追认)。**
- **D5 — 软拦截(soft block)**(active):重复投票仅靠投票人浏览器 `localStorage["voted:<id>"]`,仅在服务端 2xx 后写入;失败不写标记。**明确接受**:防不住无痕/清缓存的硬刷(免登录的取舍)。被否:IP/实名/验证码硬防刷——与免登录冲突。
- **D6 — 单选默认、多选可选**(active):`mode` 缺省 `single`;多选百分比按人数计,合计可超 100%。
- **D7 — 无实时推送**(active):结果"投完即看"=提交响应带最新快照 + 结果页可手动刷新;不做 SSE/WebSocket(数十人规模 YAGNI)。
- **D8 — 投票文件长期保留**(active):无自动清理/配额;关闭后结果仍可查看。未来磁盘增长成问题再加生命周期管理。
- **非目标(active)**:账号/登录、现场大屏实时跳动、创建后编辑、多问题问卷。
