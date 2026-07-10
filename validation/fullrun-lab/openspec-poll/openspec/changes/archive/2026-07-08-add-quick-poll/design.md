# Design: add-quick-poll

## Context

空仓库，从零构建。需求见 proposal.md 与 specs/：网页投票小工具，匿名免登录、多人共享结果、文件存储、发起人可关闭。用户明确约束：不上数据库、保持"小"。部署形态假定为单进程、单实例的小型 Node 服务。

## Goals / Non-Goals

**Goals:**
- 一条命令启动的自包含 Web 服务（`node server.js` 或 `npm start`）。
- 创建 → 分享 → 投票 → 看结果全流程，秒级上手，手机浏览器可用。
- 并发提交下计票准确、文件不损坏。
- 代码量与依赖面尽可能小，便于阅读与改造。

**Non-Goals:**
- 强防刷（跨设备/IP 级防重）、真实身份鉴权、登录体系。
- WebSocket/SSE 实时推送（刷新即最新）。
- 投票编辑、删除、列表/发现页、导出、多语言。
- 多进程/多实例水平扩展（进程内写锁的前提是单进程）。

## Decisions

### D1: 零依赖 Node 原生 HTTP 服务（而非 Express/Fastify）
需求只有约 7 个路由、无中间件需求。用 `node:http` + 手写小路由表即可，省掉 node_modules 与安全更新负担。备选 Express：更顺手但对这个体量是纯开销。**Node ≥ 18，ESM。**

### D2: 服务端渲染 HTML 模板字符串，无前端框架、无构建步骤
页面共 5 个（创建、创建成功、投票、结果、管理），均为简单表单/展示页。用模板函数（tagged template + HTML 转义工具）服务端拼 HTML，内联一份共享 CSS。表单用原生 `<form>` POST 提交（302 跳转），JS 仅用于"复制链接"按钮等增强，无 JS 也能完整投票。备选 SPA + JSON API：交互更花哨，但引入构建链与状态管理，违背"小"。

### D3: 数据模型与文件布局
```
data/<pollId>.json
{
  "id": "x7Kp2mAq",            // nanoid 风格，[A-Za-z0-9_-]{8}，crypto 随机
  "title": "午饭吃什么",
  "options": ["面", "饭", "饺子"],
  "multi": false,               // 单选/多选
  "maxChoices": null,           // 多选上限；null = 不限
  "deadline": null,             // ISO 8601 字符串或 null
  "adminKey": "…",              // crypto 随机 24 字符
  "closed": false,              // 手动关闭标记
  "counts": [0, 0, 0],          // 与 options 对齐
  "totalVoters": 0,             // 总提交人数（一人一次提交）
  "createdAt": "…"
}
```
开放判定为纯函数：`!closed && (!deadline || now < deadline)`。占比分母用 `totalVoters`（多选下各选项占比含义为"多少比例的人选了它"，总和可超 100%，页面注明）。

### D4: 写并发控制——进程内每投票一条 promise 链 + 原子写
每个 pollId 维护一条串行 promise 链（`Map<pollId, Promise>`），写操作（投票、关闭）排队执行"读文件 → 改 → 写临时文件 → rename"。rename 同目录内原子，读方永远看到完整 JSON。备选：文件锁库（proper-lockfile）——为多进程设计，这里单进程用不上；追加日志（JSONL）——重启需重放，复杂化读路径。

### D5: 软防重用 Cookie
投票成功后 `Set-Cookie: voted_<pollId>=1`（一年有效、SameSite=Lax、Path 限定该投票路径）。GET 投票页与 POST 投票时检查该 Cookie：GET 重定向到结果页，POST 拒绝（303 到结果页）。备选 localStorage：需要 JS 且服务端无法在 POST 时校验，Cookie 两端都能看到，更符合"无 JS 也能用"。

### D6: 安全基线
- pollId 与 adminKey 均来自 `crypto.randomBytes`，URL 安全字母表；ID 不可枚举。
- 路由参数白名单校验 `^[A-Za-z0-9_-]+$`，杜绝路径穿越（specs/poll-storage）。
- 所有用户输入输出经 HTML 转义，防 XSS。
- adminKey 校验用 `crypto.timingSafeEqual`；错误一律 404，不暴露管理入口存在性。
- 请求体大小上限（16KB）防滥用。

### D7: 目录结构
```
openspec-poll/
├── server.js          # 入口：http server + 路由分发
├── lib/
│   ├── store.js       # 读写 JSON、串行化、原子写、ID/密钥生成
│   ├── poll.js        # 领域逻辑：校验、开放判定、计票
│   └── pages.js       # HTML 模板（5 个页面 + 布局 + 转义）
├── test/              # node:test 单测 + Playwright E2E
├── data/              # 运行时生成（gitignore）
└── package.json       # 无运行时依赖；devDep: playwright
```

### D8: 路由表
| 方法 | 路径 | 行为 |
|------|------|------|
| GET  | `/` | 创建表单 |
| POST | `/create` | 创建投票 → 303 到创建成功页 |
| GET  | `/p/:id/created?key=…` | 创建成功页（双链接展示，一次性） |
| GET  | `/p/:id` | 投票页（已投/已关闭 → 302 结果页） |
| POST | `/p/:id/vote` | 提交投票 → 303 结果页 |
| GET  | `/p/:id/results` | 结果页 |
| GET  | `/p/:id/admin/:key` | 管理页 |
| POST | `/p/:id/admin/:key/close` | 关闭投票 → 303 管理页 |

创建成功页经 303 重定向携带 `?key=`，页面本身提示"仅此一次，请保存"；不持久化"是否已展示"，保持简单（拿到 URL 即拿到权限，与管理链接同一信任模型）。

## Risks / Trade-offs

- [软防重可绕过：换浏览器/清 Cookie 即可再投] → 明确的产品取舍，场景是会议/群聊熟人环境；spec 已将其定义为"软防重"。
- [管理链接丢失则无法手动关闭] → 截止时间兜底；文档提示创建时保存。
- [单进程假设：多实例部署会破坏写串行化] → Non-Goal，README/design 明示；文件模型天然不支持多写者。
- [data/ 无限增长（无删除/过期清理）] → 初版接受；JSON 文件极小，量级可忽略。
- [创建成功页 URL 含 key，可能进浏览器历史/日志] → 与"管理链接即凭证"模型一致，风险不高于管理链接本身。

## Migration Plan

全新项目，无迁移。回滚 = 停服删目录。

## Open Questions

（无——范围已在 explore 阶段与用户确认。）
