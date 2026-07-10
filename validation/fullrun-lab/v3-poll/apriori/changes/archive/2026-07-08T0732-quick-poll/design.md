# design — quick-poll

> 需求：`requirement/req-final.md`；规格：`specs/poll-service.md`；差距与风险：`apriori/explore/quick-poll-gap-report.md`。

## 1. 总体结构（零 npm 依赖，Node ≥20，ESM）

```
server.js               入口：读 HOST/PORT，组装依赖，启动 http.Server
lib/
  store.js              存储层：读/原子写 data/<pollId>.json；fs 操作可注入
  queue.js              per-poll 串行化：Map<pollId, Promise 链> 任务队列
  polls.js              业务：create/vote/close/getResults + 全部输入校验
  router.js             路由分发、请求体读取(64KB 上限)、统一错误形状、静态页
  ids.js                pollId/adminKey 生成（crypto.randomBytes → base64url），可注入
public/
  index.html            创建页
  poll.html             投票+结果页（模板，由路由注入 pollId）
  admin.html            管理页（模板，注入 pollId/key）
  poll-core.js          客户端纯逻辑：轮询调度、已投判定、结果渲染数据 —— 浏览器与 node:test 双用
  app.js / poll.js / admin.js   DOM 胶水（浏览器专用，薄）
  style.css             含移动端适配（viewport + 弹性布局）
data/                   投票文件（gitignore）
tests/                  node:test 测试（TAP 输出，场景 ID 命名）
  e2e/                  Playwright（绑定门之上的附加验证层，不参与 apriori verify）
```

依赖注入贯穿始终：`store.js` 接受 fs 实现，`ids.js` 接受随机源，`poll-core.js` 接受计时器/fetch/storage —— 这是 PS-01/PS-02/PS-05/CR-05/PG-04/PG-05 可测的前提（gap report R-c 的回应）。

## 2. 数据与状态

- 文件 schema：req-final §4.4（`schemaVersion:1`，预留 `multiChoice:false`/`deadline:null`）。`adminKey` 明文存于文件（仅服务器可读；不经任何公开接口返回）。
- 状态机：`open --close--> closed`（终态）。所有变更（vote/close）经 `queue.js` 的 per-poll 队列，进入队列的顺序即生效顺序（req-final §4.3；gap report R-a）。
- **队列的失败隔离（SPEC-3）**：`queue.js` 维护 `Map<pollId, tail>`；入队实现为 `const run = tail.catch(() => {}).then(task); tail = run` —— 前序任务的 reject 被吞掉后再挂新任务，**一次失败绝不断链**；调用方拿到的是 `run` 本身（自己的错误自己收）；`run.finally` 中若 `Map` 里的 tail 仍是本任务则删除条目（防泄漏、防竞态误删）。
- 原子写分两条路径（SPEC-2）：
  - **更新已有投票**（vote/close）：同目录临时文件 `data/.tmp-<pollId>-<rand>` → `fs.rename` 覆盖目标（同文件系统，R-b）。
  - **创建新投票**：`rename` 会覆盖已存在目标，**不可用于 create**。改用 `fs.link(tmp, target)`——目标已存在时以 `EEXIST` 失败、原子且绝不覆盖——成功后 `unlink(tmp)`；`EEXIST` → 清理 tmp、重新生成 pollId 重试（上限 5 次，超限 500）。store API 相应拆分为 `writeNew`（no-overwrite）与 `writeExisting`（replace）。
  - 两条路径成功响应都在落盘完成后发出。写失败：删残留 tmp，返回 500，内存中不缓存任何未落盘状态（无内存缓存，每次读盘——几十人规模下代价可忽略，换取"文件即唯一真相"）。

## 3. 请求处理管线（router.js）

1. 解析路径 → 路由表匹配；含参路由先跑 regex（pollId `^[A-Za-z0-9_-]{16}$`、key `^[A-Za-z0-9_-]{22,}$`），失败即 404 —— 早于任何 store 调用（PS-05）。
2. POST：读 body，累计 >64KB 即 413 并断开；JSON.parse 失败 / 字段缺失 / 类型错误 → 400（PS-03）。
3. 业务错误映射：NotFound→404、Closed→409、BadKey→403、Validation→400、Corrupt/IO→500；错误体一律 `{"error":"<原因>"}`。
4. 密钥比较用 `crypto.timingSafeEqual`（长度不等先短路为不匹配）。
5. 管理页路由 GET `/admin/<id>/<key>`：key 错与 poll 不存在统一 404（PG-03，不泄露存在性）。
6. 静态页：`public/` 白名单文件直出；`poll.html`/`admin.html` 由路由替换 `{{POLL_ID}}`/`{{ADMIN_KEY}}` 占位符（不含用户输入的插值——标题等动态内容一律由客户端 JS 经 API 取回并以 `textContent` 注入，杜绝服务端 HTML 注入）。
7. **链接构造（SPEC-4）**：create 响应中的 `voteUrl`/`adminUrl` 以请求的 `Host` 头为 origin（`http://<Host>/…`）；`Host` 缺失时回退 `<监听HOST>:<PORT>`（监听 HOST 为 `0.0.0.0` 时回退 `localhost:<PORT>`）。绝不硬编码 localhost。
8. **日志脱敏（SPEC-1）**：请求日志中 `/admin/<pollId>/<key>` 一律记为 `/admin/<pollId>/<redacted>`；错误日志不包含完整 URL、key、请求体。logger 可注入（测试断言脱敏）。

## 4. 客户端（poll-core.js 双用设计）

纯函数 + 显式依赖，无顶层 DOM 引用：

```js
createPoller({ fetchResults, onUpdate, setInterval, intervalMs = 3000 })  // PG-04
votedState({ storage, pollId })      // 'voted' | 'can-vote' | storage 异常 → 'can-vote'（PG-05 退化）
markVoted({ storage, pollId })
```

浏览器端 `poll.js` 以真实 `fetch`/`window.setInterval`/`localStorage` 组装；测试以假计时器/假 storage 组装。轮询失败：`onUpdate` 不被调用，保留上次渲染（req-final §4.6）。

## 5. 测试策略（STEP5 的绑定与叠加层）

- **绑定层（`apriori verify` 消费）**：`node --test --test-reporter=tap tests/`。服务器场景用注入依赖 + 真实 http 端口（`server.listen(0)`）跑端到端 HTTP 断言；PG-01..03 断言路由输出的 HTML；PG-04/05 直接测 poll-core。每个场景 ≥1 个以其 ID 开头命名的测试。
- **叠加层（UI 验证矩阵）**：Playwright chromium 跑核心流（创建→投票→已投锁定→关闭→409），截图落 `apriori/tmp/`，文本化 pass/fail 输出；不参与 verify 绑定（Playwright 不吐 TAP）。
- AC12/PS-02 的写失败注入即 store 的 fs 注入点；无需 mock 库。

## 6. 已决事项（设计层）

- `data/` 目录：服务启动时确保存在（`mkdir recursive`），并清理历史残留 `.tmp-*` 文件——回应评审 advisories。
- adminKey 长度：`randomBytes(16).toString('base64url')` = 22 字符——回应评审 v3 advisory。
- 日志：每请求一行 `method path status ms`（stdout，admin 路径按 §3.8 脱敏）；错误分支额外一行原因（不含敏感内容）——满足 P7 的关键分支日志要求，不引日志库。
- 413 处理：先写回 JSON `{"error":…}` 响应再结束请求，不直接 destroy socket——回应 P5 v1 advisory。
- 优雅关闭：SIGINT/SIGTERM → `server.close()`；无需排空队列持久化（每个已成功响应的请求都已落盘）。

## 7. 明确不做（设计层）

- 内存缓存/索引、进程集群（单进程假设是串行化正确性的前提，部署文档注明）、HTTPS（内网；由使用者自担）、投票文件清理任务。
