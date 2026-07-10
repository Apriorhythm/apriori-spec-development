# Design — quick-poll

## 架构总览

单进程 Node 标准库 HTTP 服务,分层:

```
                 ┌────────────────────────────────────────────┐
   HTTP 请求 ──▶ │ server.js  路由/方法分发/16KiB body 读取     │
                 └───────┬───────────────────────┬─────────────┘
             /api/*      │                       │  /poll /admin /
          (JSON API)     ▼                       ▼   (SSR HTML)
                 ┌──────────────┐        ┌────────────────┐
                 │ validate.js  │        │  render.js     │  (HTML 转义)
                 │ payload 校验  │        │  三张页面 SSR   │
                 └──────┬───────┘        └────────────────┘
                        ▼
                 ┌──────────────┐   per-poll 串行   ┌──────────────┐
                 │  store.js    │◀── mutation queue │  queue.js     │
                 │ 领域+持久化   │                   │ Map<id,Promise>│
                 └──────┬───────┘                   └──────────────┘
                        ▼  原子落盘 (tmp→fsync→rename→fsync dir)
                 data/polls/<id>.json
```

模块职责:
- **server.js**:`http.createServer`;路由表(§12 六端点);**每个 POST handler 在读 body 前先校验 `Content-Type: application/json`,否则 415 `UNSUPPORTED_MEDIA_TYPE`(SPEC-1)**;读取 body 时强制 16 KiB 上限(累计字节超限即中止并 413,不缓冲全部);根据路径分派到 API handler 或 SSR。close handler 的 admin token 取自 body `{adminToken}` 或 header `X-Admin-Token`,**body 优先**(SPEC-2)。
- **validate.js**:纯函数;创建/投票 payload 的类型与范围校验;返回 `{ok, code}`。错误码集中此处,单一事实源。
- **model.js**:poll 领域对象;`create()`(生成 id/adminToken)、`applyVote()`、`close()`、`isExpired(now)`、`toPublic()`(剥离 adminToken)、`toResult()`(票数/百分比,整数四舍五入,0 人 0%)。
- **store.js**:文件读写;`load(id)`、`save(poll)`(原子落盘);**无启动全量扫描——纯按需 `load`,仅在某 poll 被访问时读其文件,损坏则该次 load 记日志跳过**(advisory 澄清);所有写经 queue.js 串行。
- **queue.js**:`runExclusive(pollId, fn)` —— 以 `Map<pollId, Promise>` 尾接链保证同一 poll 的 mutation(vote/close/lazy-close)串行。**必须防队列毒化与 cleanup race(SPEC-5)**:
  ```js
  function runExclusive(id, fn) {
    const prev = map.get(id) ?? Promise.resolve();
    const run = prev.catch(() => {}).then(fn);       // 后续任务不因前序 reject 被跳过
    const tail = run.catch(() => {});                // tail 永不 reject
    map.set(id, tail);
    tail.finally(() => { if (map.get(id) === tail) map.delete(id); }); // 只删自己这条尾
    return run;                                       // 调用方拿到真实结果/错误
  }
  ```
  一次 persist 失败只影响当前请求的响应(500),不阻断同 poll 后续 vote/close(CC-04 + CC-03 前提)。
- **render.js**:创建页/投票页/结果页/管理页 SSR;所有用户文本经 `escapeHtml`;绝不注入 adminToken。
- 前端:投票页内联少量原生 JS —— 提交 fetch、成功后写 `localStorage["voted:"+pollId]`、据该键切换表单/结果视图。**客户端渲染安全(SPEC-6)**:投票成功后动态构建的结果视图,所有来自 API JSON 的 title/option 文本只能用 `el.textContent = ...` 或安全属性赋值注入 DOM,**严禁拼接进 `innerHTML`**;百分比/条形等数值可拼字符串。SEC-02 测试须覆盖初始 SSR 与投票后动态结果视图两条路径。

## 数据模型(`data/polls/<id>.json`)

```json
{
  "id": "Ab3xY7_qP0-KmN12",
  "title": "午饭吃啥",
  "options": [{"id":"o1","text":"火锅","votes":0}, {"id":"o2","text":"麻辣烫","votes":0}],
  "mode": "single",
  "createdAt": 1751931600000,
  "deadline": null,
  "status": "open",
  "totalVoters": 0,
  "adminToken": "<32 hex chars = 128-bit CSPRNG>"
}
```
- `id`:`crypto.randomBytes(12)` → base64url(16 字符,`[A-Za-z0-9_-]`),即文件名;拒绝任何含 `/`、`.` 的 id 查找(防路径穿越)。
- `adminToken`:`crypto.randomBytes(16).toString("hex")`(128-bit);校验用 `crypto.timingSafeEqual`。

## 外部共享状态 —— 三个时刻

### 共享状态 1:磁盘 JSON 文件(`data/polls/`)
- **init(初始化)**:进程启动时确保 `data/polls/` 存在(`mkdir -p`);不预加载全部文件(按需 `load`)。创建投票时首次写入该 poll 文件。
- **runtime update(运行时更新)**:每次 vote/close 经 per-poll 队列串行:`load → 校验/改内存 → 原子落盘`。原子落盘 = 写 `<id>.json.tmp.<rand>` → `fsync(tmpFd)` → `rename` 覆盖 → `fsync(dirFd)`;任一步失败抛错 → 该请求 500,内存改动丢弃(不对外可见)。
- **cleanup / invalidation(清理/失效)**:无自动清理(long-lived,YAGNI)。失效即"逻辑关闭":`status="closed"` 或 `now≥deadline`;deadline 过期在首次访问时 lazy 持久化为 closed(CL-06)。**该 lazy-close 的写盘必须经 `runExclusive(id)` 串行(SPEC-4)**:纯读路径(GET 结果/分享/管理页)默认不入队直接读;但若读时发现 `now≥deadline 且 status 仍 open`,则进入队列重新 `load → 若仍需转移则置 closed → 原子落盘`(队列内二次确认,避免与并发 vote/close 竞争写)。**磁盘文件的唯一写者始终是"队列内的 fn",无队列外写盘路径。** 启动无需全量扫描;按需 `load`,读到损坏 JSON → 记日志跳过该文件,不崩溃(见下"启动"澄清)。

### 共享状态 2:进程内 per-poll 队列(`queue.js` 的 `Map<pollId, Promise>`)
- **init**:模块级空 `Map`。
- **runtime update**:`runExclusive(id, fn)` 读取当前尾 Promise,追加 `.then(fn)`,写回新尾;保证同一 id 的 fn 串行,不同 id 并行。vote 与 close 共用同一 map,故二者互斥(CC-03)。
- **cleanup / invalidation**:链尾 settle 后从 map 删除已完成条目(避免无限增长);进程重启即全清(队列是易失的,真值在磁盘)。

> 单进程模型下磁盘文件的唯一写者是本进程,进程内队列即足以串行化;不引入跨进程锁(非目标)。若未来多进程部署 → 升级为文件锁/外部锁,记为 KB Decision。

## 关键正确性论证

- **不丢票(CC-01)**:所有计票写经 `runExclusive` 串行 + 每次 `load` 拿最新磁盘态 → 无读改写竞态。
- **崩溃持久化(CC-02)**:2xx 仅在 `rename` 且 `fsync(dir)` 成功后返回;fsync 覆盖文件与父目录 → 崩溃后 rename 已落盘。经典陷阱:只 fsync 临时文件不 fsync 目录会在崩溃后丢失 rename —— 本设计两者都 fsync。
- **close/vote 竞态(CC-03)**:同队列串行;vote 在 fn 执行时(而非入队时)重查 `status`/`deadline`,故 close 先执行则其后 vote 必见 closed。
- **持久化失败不谎报(CC-04)**:落盘在"改内存值 → 落盘 → 落盘成功才把结果作为响应"顺序;失败路径抛错、响应 500、下次 load 仍读旧文件。

## 测试策略(STEP5)

- 单元/集成:`node --test`,测试名带 scenario ID(TAP → `apriori verify` 绑定)。API 层用 `http` 请求真实 server 实例。
- 对抗性:
  - CC-01:`Promise.all` 并发 50 个 vote,断言最终 totalVoters=50 且各项和=50。
  - CC-02:`child_process` 起 server 子进程,vote 成功后 `SIGKILL`,重启读文件断言票在。
  - CC-03:并发 close + N vote,断言 close 后 vote 全 409、计数一致。
  - CC-04:注入 `fs` 写失败(monkeypatch/依赖注入 writer),断言 500 且文件未坏。
- E2E(Playwright,叠在绑定门之上):创建→投票→看结果核心流;并**驱动 spec 边界**——真的建到 10 选项上限、真的触发 single 拒多选,验证前端不会悄悄挡住后端 spec 的路径(P7 要求)。
- 安全:SEC-01 全文搜索响应无 token;SEC-02 断言输出转义。

## 未决(STEP2 可细化,非阻塞)
- 管理页 URL 形态:`/admin/<id>?token=<t>`(token 走 query)。分享页 `/poll/<id>`。
- 结果"实时":投票响应即带最新快照 + 结果页提供"刷新"按钮;不做 SSE/WS(见 proposal 非目标)。
