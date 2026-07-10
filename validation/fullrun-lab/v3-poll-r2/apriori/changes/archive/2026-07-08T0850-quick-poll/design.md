# Design — quick-poll

## 0. 部署前提（锁定）
**单进程、单实例**（内网一台机器，`node server.js`）。并发正确性依赖单 Node 进程内的内存锁；**多实例会破坏所有并发/崩溃保证，明确不支持**（proposal / spec 均声明）。选择文件存储而非 DB 是发起人的明确决定；本设计的职责是让文件存储在此前提下正确。

## 1. 架构总览
```
                 ┌─────────────────────────── Node 单进程 ───────────────────────────┐
  浏览器  ──HTTP──▶  http server (stdlib http)                                          │
   │                   │  路由 → 处理器                                                  │
   │                   ├─ GET  /                创建页 (SSR)                             │
   │                   ├─ POST /api/polls       创建 → validate → store.create          │
   │                   ├─ GET  /p/:id           投票页 (SSR，读 store)                   │
   │                   ├─ POST /api/polls/:id/vote   validate → queue(id, mutate)        │
   │                   ├─ GET  /api/polls/:id/results 读 store → JSON（轮询目标）         │
   │                   ├─ GET  /r/:id           结果页 (SSR + 前端轮询脚本)              │
   │                   ├─ GET  /admin/:id?key=  管理页 (SSR，校验 adminKey)              │
   │                   └─ POST /api/polls/:id/close  校验 adminKey → queue(id, close)     │
   │                                                                                     │
   │              writeQueue: Map<pollId, Promise-chain>  ← per-poll 串行化              │
   │              store: 读改写 + 临时文件原子 rename                                     │
   └─────────────────────────────────────────────────────────────────────────────────┘
                        data/polls/<pollId>.json     ← 每投票一文件
```

## 2. 模块划分（便于 tasks / 测试注入）
| 模块 | 文件 | 职责 |
|---|---|---|
| ids | `src/ids.js` | `newPollId()` / `newAdminKey()`：`crypto.randomBytes(16)` → base64url（128 bit，不可枚举） |
| validate | `src/validate.js` | 创建 schema+边界校验、投票 payload 校验（纯函数，易测 PC-02/12/14/04） |
| store | `src/store.js` | `create/read/applyVote/close`；**原子写** `writeAtomic()`；失败注入 seam |
| queue | `src/queue.js` | `runExclusive(pollId, fn)`：per-poll Promise 链串行化（PC-10） |
| server | `src/server.js` | 路由 + SSR + 组装上面模块；durable 成功后才 2xx（PC-13） |
| escape | `src/escape.js` | `htmlEscape` / `jsonForScript`：输出编码，防 XSS（PC-15） |
| views | `src/views.js` | SSR 页面 + 注入前端轮询/软限脚本（用户文本走 htmlEscape） |
| public | `public/poll.js` | 前端：结果轮询（加载即拉 + 每 3000ms）、localStorage 软限（PC-05/06/09） |

## 3. 外部共享状态的三个时刻
- **初始化**：`store.create()` 用 CSPRNG 生成 `pollId`/`adminKey`，构造 `{pollId, title, options:[{id,text}], mode, deadlineMs|null, status:'open', counts:{opt-i:0}, adminKey}`，`writeAtomic()` 落 `data/polls/<pollId>.json`。
- **运行时更新**：vote/close 一律经 `queue.runExclusive(pollId, async () => { read → 判定 → mutate → writeAtomic })`。**状态与截止判定在临界区内、读到最新文件后求值**（PC-06/07/08/10）：进入临界区若 `status==='closed' || (deadlineMs && Date.now()>=deadlineMs)` → 拒绝，不改计数。
- **清理/失效**：v1 无自动清理；`status:'closed'` 为逻辑失效标志，文件保留可读。

## 4. 并发与崩溃正确性（三条硬保证 + 对抗测试 seam）
### 4.1 PC-10 并发不丢票 — per-poll 串行化
`queue.runExclusive` 对每个 pollId 维护一条 Promise 链：`chain = chain.then(() => fn())`。同一投票的读改写永不交叠（单进程事件循环内严格串行）。**对抗测试**：`Promise.all` 并发发起 N 次 vote，断言 `sum(counts) === N`（合法提交数）。

### 4.2 PC-11 崩溃不半写 — 临时文件 + 原子 rename
`writeAtomic(file, data)`：写 `file.tmp.<rand>` → `fs.fsyncSync(fd)` → `fs.renameSync(tmp, file)`（同目录 rename 在 POSIX 上原子）。读者永远看到旧完整或新完整文件。**对抗测试 seam**：`writeAtomic` 接受可注入的 `_hooks.afterTmpWrite`，测试在 tmp 写完、rename 前抛错模拟中断，断言目标文件仍是旧完整内容且可 JSON.parse。

### 4.3 PC-13 无假成功 — durable 后才响应
处理器仅在 `runExclusive` 内 `writeAtomic` 成功 resolve 后才返回 2xx；`writeAtomic` 提供 `_hooks.failRename` 注入 rename 失败。**对抗测试**：注入写失败，断言 vote 返回非 2xx、`store.read()` 计数不变、状态不变；前端仅在收到 2xx 后才置 localStorage 标记（保证浏览器标记也不假成功）。

## 5. 标识符与安全（PC-01/02/08）
- `newPollId`/`newAdminKey` = `crypto.randomBytes(16).toString('base64url')`（128 bit）。二者独立生成，均不含顺序/时间信息。
- adminKey 仅存于投票文件与管理链接；**日志与错误响应一律不打印 adminKey**（validate/server 统一走一个不含 key 的日志字段）。
- 关闭鉴权：常量时间比较 `crypto.timingSafeEqual` 比对 adminKey（防计时侧信道；长度不等直接拒绝）。

## 5b. 输出安全 / XSS（PC-15，STEP2·r1 SPEC-1）
用户输入 `title`/`options[].text` 为不可信数据，经三个出口外泄：SSR 页面、结果 endpoint 的内联 JSON、前端 DOM。统一防线：
- `src/escape.js`：
  - `htmlEscape(s)` — 映射到 HTML 实体：`&`→`&amp;`、`<`→`&lt;`、`>`→`&gt;`、`"`→`&quot;`、`'`→`&#39;`（先替换 `&`）。
  - `jsonForScript(obj)` — `JSON.stringify(obj)` 后，把会破坏 `<script>` 上下文的字符替换为**安全 ASCII `\uXXXX` 转义序列**（而非原字符）：`<`→`\u003c`、`>`→`\u003e`、`&`→`\u0026`、U+2028→`\u2028`、U+2029→`\u2029`。产出的内联脚本源码中**不含裸 `</script`、裸 `<script`、也不含实际 U+2028/U+2029 分隔符**，无法逃出脚本上下文。
- `views.js` 所有用户文本插值走 `htmlEscape`；任何内联 `<script>` 里的数据走 `jsonForScript`。
- `public/poll.js` 渲染选项文本/标题一律 `el.textContent = …`，**禁止 `innerHTML` 拼接用户数据**。
- 结果 `/results` 端点为 `application/json`（非 HTML 上下文），但前端仍用 textContent 渲染。
- 未知 `pollId` 的 GET 路由（投票/结果/管理页与 /results）返回 404（补 advisory 的路由覆盖）。
- **测试**：PC-15 注入 `<script>`/`</script>`/引号/`&`/U+2028 到 title 与各选项，断言：SSR 输出被 HTML-escape；内联 `<script>` 的 JSON 源码**不含裸 `</script`、`<script`、裸 U+2028/U+2029**；前端 textContent 路径不产生脚本执行；覆盖 PC-01/06/09 渲染路径。

## 6. 时间语义（PC-07）
- `deadline` 输入：ISO 8601 带时区 或 epoch ms 整数 → 存 `deadlineMs`（UTC epoch）。创建时 `deadlineMs <= Date.now()` 拒绝。
- 关闭判定基准恒为 `Date.now()`；判定点 = 进入临界区那一刻。

## 7. 前端（PC-05/06/09）
- 结果页脚本：`load → fetch(/results) 一次 → setInterval(fetch, POLL_INTERVAL_MS=3000)`；渲染票数/总数/关闭态。
- 软限：投票成功(2xx)后 `localStorage.setItem('voted:'+origin+':'+pollId,'1')`；投票页加载时若标记存在 → 跳转结果视图。
- 关闭态：SSR 与轮询响应都带 `status`；closed 时不渲染投票控件，显示关闭原因/截止信息。

## 8. 测试与验证策略
- 测试框架：Node 内建 `node:test` + `--test-reporter=tap`（喂 `apriori verify` 的 TAP 绑定门）。每个 PC-xx 至少一个测试，测试名以场景 ID 开头（如 `test('PC-10 并发投票不丢票', …)`）。
- 单元/集成：validate（PC-02/04/12/14）、store+queue（PC-10/11/13 对抗注入）、server 路由（PC-01/03/07/08）、escape/XSS（PC-15）。
- UI/E2E：Playwright 叠加在绑定门之上，跑创建→投票→结果→关闭核心流，截图存 `apriori/tmp/`（gitignored），留一行文字观察。
- `apriori verify --specs apriori/changes/quick-poll/specs --test-cmd "<tap cmd>"` GREEN 为 STEP5 绑定门。

## 9. 目录布局
```
package.json  server.js(入口→src/server)  src/{ids,validate,escape,store,queue,server,views}.js
public/poll.js  test/*.test.js  data/polls/(运行时, gitignore)
```

## 10. 被否决的替代方案（供 KB Decisions）
- SQLite / DB：发起人明确否决。
- 全局单文件存所有投票：并发热点集中、单文件锁粒度粗；改为每投票一文件，锁粒度=pollId。
- WebSocket 实时推送：几十人量级轮询足够，YAGNI。
- 多实例部署 + 外部锁(Redis 等)：与"文件存储、内网单机"前提冲突，明确 out of scope。
