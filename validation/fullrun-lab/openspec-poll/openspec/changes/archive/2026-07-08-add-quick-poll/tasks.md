# Tasks: add-quick-poll

## 1. 项目骨架

- [x] 1.1 初始化 package.json（ESM、`npm start`/`npm test` 脚本、零运行时依赖、devDep: playwright）与 .gitignore（node_modules、data/）
- [x] 1.2 建立目录结构：server.js、lib/store.js、lib/poll.js、lib/pages.js、test/

## 2. 存储层（specs/poll-storage）

- [x] 2.1 实现 lib/store.js：数据目录自动创建、`readPoll(id)`、原子写（临时文件 + rename）、每投票 promise 链串行化写、ID/adminKey 生成（crypto，URL 安全字母表）、ID 格式白名单校验
- [x] 2.2 单测（node:test）：落盘字段完整、并发写不丢票不损坏文件、非法 ID 被拒绝

## 3. 领域逻辑（specs/poll-creation、poll-voting、poll-lifecycle）

- [x] 3.1 实现 lib/poll.js：创建输入校验（标题/选项数与长度/多选上限/截止时间）、开放状态纯函数、投票提交校验（单选恰 1 项、多选 1~上限、索引合法、开放中）、计票
- [x] 3.2 单测：各校验边界（选项 <2、截止时间过期、多选超上限、非法索引、向已关闭投票提交）

## 4. HTTP 服务与页面（specs 全部 + design D2/D5/D6/D8）

- [x] 4.1 实现 server.js 路由分发（design D8 路由表）、请求体解析（大小上限）、404 处理
- [x] 4.2 实现 lib/pages.js：布局 + HTML 转义 + 5 个页面（创建表单、创建成功双链接页、投票页、结果页含比例条、管理页）
- [x] 4.3 接通创建流：GET / → POST /create → 303 创建成功页（双链接、"仅此一次"提示；参与页/结果页不含 adminKey）
- [x] 4.4 接通投票流：GET /p/:id（已投/已关闭重定向）→ POST /p/:id/vote（校验 + 计票 + Set-Cookie 软防重）→ 303 结果页
- [x] 4.5 接通结果页与生命周期：GET /p/:id/results（票数/占比/状态、多选占比注明）、管理页 + POST close（timingSafeEqual 校验、错误密钥 404、关闭幂等）、截止时间被动判定

## 5. 端到端验证

- [x] 5.1 Playwright E2E：创建单选投票 → 投票 → 结果正确 → 同浏览器重访直达结果页；多选（含超上限拒绝）；管理链接关闭后无法再投；截止时间过期后只读；错误管理密钥 404
- [x] 5.2 并发验证：脚本并发 POST 10+ 票，总数准确；服务重启后数据仍在
- [x] 5.3 全量跑通 `npm test`，手动冒烟一遍手机宽度视口渲染
