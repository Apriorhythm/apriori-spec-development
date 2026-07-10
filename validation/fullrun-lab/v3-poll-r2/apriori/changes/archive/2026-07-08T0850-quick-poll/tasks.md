# Tasks — quick-poll（STEP5 按序消费；完成即打 [x]）

> 顺序：先地基（ids/validate/store/queue）→ 再 server/views/前端 → 最后 E2E。
> 每个 PC-xx 场景先写失败测试（测试名以场景 ID 开头），再实现。

## T0 项目骨架
- [x] `package.json`（type=module 或 commonjs 二选一；scripts.test = `node --test --test-reporter=tap`）
- [x] `.gitignore` 增加 `data/` 与 `apriori/tmp/`
- [x] 目录 `src/ test/ public/ data/polls/`

## T1 ids（PC-01/08 支撑）
- [x] `src/ids.js`：`newPollId()`/`newAdminKey()` = `crypto.randomBytes(16).toString('base64url')`
- [x] 测试：两次生成互不相同、长度稳定、URL-safe 字符集

## T2 validate（PC-02/04/12/14）
- [x] `src/validate.js`：`validateCreate(body)`（类型契约+边界，返回归一化 poll 或错误）
- [x] `validateVote(poll, body)`（single 恰一/ multiple ≥1 去重 / unknown/重复/类型/空 → 分类错误码）
- [x] 失败测试 → 实现：PC-02, PC-04(含 k=0), PC-12, PC-14

## T3 store + 原子写（PC-11/13 支撑）
- [x] `src/store.js`：`create/read/applyVote/close`；`writeAtomic(file,data,_hooks)`（tmp→fsync→rename）
- [x] 注入 seam：`_hooks.afterTmpWrite` / `_hooks.failRename`
- [x] 失败测试 → 实现：PC-11（写中断→旧/新完整）、PC-13（rename 失败→非 2xx 语义在 T5 断言，store 层断言不落盘）

## T4 queue（PC-10）
- [x] `src/queue.js`：`runExclusive(pollId, fn)` per-poll Promise 链
- [x] 失败测试 → 实现：PC-10 并发 N 次 vote 总计数守恒

## T5 server + 路由（PC-01/03/06/07/08/12/13）
- [x] `src/server.js`：路由；vote/close 走 `runExclusive`；durable 成功后才 2xx
- [x] 关闭鉴权 `timingSafeEqual`；日志不含 adminKey
- [x] 截止判定在临界区内 `Date.now()>=deadlineMs`
- [x] results endpoint 返回约定 JSON 形状
- [x] 失败测试 → 实现：PC-01, PC-03, PC-07, PC-08, PC-13（HTTP 非 2xx + 不改状态）, PC-12（404/400）

## T6 views + 前端 + 输出安全（PC-05/06/09/15）
- [x] `src/escape.js`：`htmlEscape` / `jsonForScript`（& < > " ' + U+2028/U+2029）
- [x] `src/views.js` SSR：创建/投票/结果/管理页；**用户文本一律走 htmlEscape，内联 JSON 走 jsonForScript**
- [x] `public/poll.js`：结果轮询（加载即拉 + 每 3000ms POLL_INTERVAL_MS）、localStorage 软限、关闭态渲染；渲染用户文本一律 `textContent`
- [x] 未知 pollId 的 GET 路由返回 404
- [x] 失败测试 → 实现：PC-05（软限跳转）、PC-06（拉取时机+JSON 形状）、PC-09（closed 不渲染投票控件）、**PC-15（注入元字符→各出口被转义、无脚本执行）**

## T7 验证收口
- [x] `node --test` 全绿；`apriori verify --specs apriori/changes/quick-poll/specs --test-cmd "npm test"` GREEN
- [x] Playwright E2E：创建→投票→结果→关闭核心流，截图存 apriori/tmp/，留一行观察
- [x] lint/static（若配置）
- [x] P8 一致性异构评审 → `VERDICT: no spec-vs-code gaps`
