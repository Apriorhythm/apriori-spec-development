# tasks — quick-poll（STEP5 按序执行；先测试后实现）

- [x] T1 项目底座：package.json（`"test": "node --test --test-reporter=tap tests/"`，type=module，无 runtime 依赖）、.gitignore（`data/`、`node_modules/`、`apriori/tmp/`）
- [x] T2 测试先行：按 `specs/poll-service.md` 28 个场景各写 ≥1 个失败测试（测试名以场景 ID 开头），展示失败运行
- [x] T3 `lib/ids.js`：pollId/adminKey 生成（可注入随机源）→ CR-02/CR-05 相关断言绿
- [x] T4 `lib/store.js`：读 / 原子写（`writeNew`=tmp+link 不覆盖、`writeExisting`=tmp+rename）/ 损坏检测 / fs 注入 → PS-01/PS-02/RE-03 绿
- [x] T5 `lib/queue.js`：per-poll 队列（失败隔离：前序 reject 吞掉后挂新任务，绝不断链）→ VO-04 前置
- [x] T6 `lib/polls.js`：输入校验 + create/vote/close/getResults 状态机 → CR-01..05、VO-01..03、CL-01..04、RE-01 绿
- [x] T7 `lib/router.js` + `server.js`：路由/参数校验/body 规则/错误形状/静态页/模板占位 → VO-04/VO-05、RE-02、PS-03..05、PG-01..03 绿
- [x] T8 `public/poll-core.js`：轮询调度 + 已投判定（依赖注入）→ PG-04/PG-05 绿
- [x] T9 前端页面：index/poll/admin HTML + DOM 胶水 + style.css（移动端适配）；实现中用 Playwright 渲染并目视截图（apriori/tmp/，留一行文字观察）
- [x] T10 全量绿：`npm test` 全绿 + `apriori verify --specs apriori/changes/quick-poll/specs --test-cmd "npm test"` GREEN
- [x] T11 Playwright 叠加层：核心流 E2E（创建→投票→已投锁定→关闭→再投 409），文本 pass/fail
- [x] T12 收尾：请求日志确认、README 一段部署说明（node server.js / HOST/PORT / 单进程前提）
