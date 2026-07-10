# Tasks — quick-poll(STEP5 按序执行,完成即勾 [x])

> 顺序:先脚手架与最内层(model/store/queue),再校验,再路由/API,再 SSR/前端,最后 E2E。
> 每个 scenario 先有失败测试(测试名带 ID),再实现到绿。

## T0 项目脚手架
- [x] `package.json`(`type:module`,`test: node --test`,无运行时依赖);`.gitignore`(`data/`, `node_modules/`, `apriori/tmp/`)
- [x] 目录:`src/`、`test/`、`public/`(如需静态)、运行时 `data/polls/`(启动时 mkdir)

## T1 model.js(领域,纯逻辑)
- [x] `create({title,options,mode,deadline})` 生成 id + adminToken(CSPRNG);默认 mode single → PC-01, PC-09
- [x] `toPublic()` 剥离 adminToken;`toResult()` 票数+整数四舍五入百分比,0 人 0% → RS-01, RS-02, RS-03, SEC-01
- [x] `applyVote(optionIds)`:mode/重复/存在性/空选择校验 + 计票 → VT-01, VT-03, VT-04, VT-05, VT-06, VT-02
- [x] `close()` 幂等;`isExpired(now)` → CL-05, CL-02

## T2 queue.js(per-poll 串行)
- [x] `runExclusive(id, fn)` 尾接链 + 完成后清理 → 支撑 CC-01, CC-03

## T3 store.js(持久化 + 原子落盘)
- [x] `atomicWrite(path, data)`:tmp → fsync(file) → rename → fsync(dir);失败抛错 → CC-02, CC-04
- [x] `load(id)`(拒绝路径穿越 id);deadline 过期 lazy 持久化 closed → CL-06, VT-07
- [x] `saveVote`/`saveClose` 经 queue 串行 → CC-01, CC-03
- [x] writer 可注入以便 CC-04 注入失败

## T4 validate.js(payload 校验,错误码单一源)
- [x] 创建校验:title 空/超长、option 空/超长、选项数 2–10、mode、deadline 解析/未来、类型 → PC-02..PC-14
- [x] 投票校验:optionIds 非空数组/类型 → VT-04, PC-14 类比

## T5 server.js(路由 + body 限制 + 错误响应)
- [x] `http` server + 路由表;body 读取强制 16 KiB → PC-15
- [x] 所有 POST 先校验 `Content-Type: application/json`,否则 415 → PC-16
- [x] malformed JSON → INVALID_JSON → PC-13
- [x] `POST /api/polls` 创建 → PC-01..PC-14
- [x] `POST /api/polls/<id>/vote` → VT-01..VT-07, CL-01, CL-02
- [x] `POST /api/polls/<id>/close`(token 经 body`{adminToken}` 或 header `X-Admin-Token`,body 优先;timingSafeEqual)→ CL-01, CL-03, CL-04, CL-05
- [x] `GET /api/polls/<id>` 公开结果(无 token)→ SEC-01

## T6 render.js + 前端(SSR + 软拦截 + 转义)
- [x] `escapeHtml`;创建页/投票页/结果页/管理页 SSR → SEC-02(SSR 路径)
- [x] closed/expired 分享页只渲染结果、隐藏投票表单 → CL-07, CL-08
- [x] 投票页内联 JS:提交 fetch、成功写 `localStorage["voted:"+id]`、切换视图;失败不写标记 → VT-08, VT-09
- [x] 客户端动态结果视图只用 `textContent` 注入 title/option,禁用 innerHTML → SEC-02(投票后动态路径)
- [x] 管理页 `/admin/<id>?token=` 展示概览 + 关闭按钮;不渲染 token 到分享视图 → SEC-01

## T7 对抗性 + E2E
- [x] CC-01 并发 50 vote 不丢票
- [x] CC-02 SIGKILL-after-ack 子进程崩溃持久化
- [x] CC-03 close/vote 并发串行
- [x] CC-04 注入落盘失败 → 500 且文件不坏
- [x] Playwright E2E:创建→投票→结果核心流;驱动 spec 边界(建到 10 选项、single 拒多选可达)

## T8 收口
- [x] `apriori verify --specs apriori/changes/quick-poll/specs --test-cmd "node --test --test-reporter=tap"` → GREEN (42/42 bound-green, 0 unbound/orphan). NOTE: `--test-reporter=tap` is required — node 24's default reporter isn't TAP, and verify's binding gate reads TAP. E2E lives in top-level `e2e/` so it is NOT in verify's discovery.
- [x] lint/static(若配置);全部 tasks [x]
- [x] P8 一致性复审 → `VERDICT: no spec-vs-code gaps`
