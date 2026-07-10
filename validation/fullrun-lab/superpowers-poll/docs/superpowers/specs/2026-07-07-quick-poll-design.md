# 快速投票小工具 — 设计文档

日期：2026-07-07
状态：已获用户批准的设计（brainstorming 产出）

## 1. 目标与场景

给开会 / 群聊征集意见用的快速投票工具，几十人规模。发起人创建投票后得到一个链接，
发到群里，参与者点开即投，无需注册登录。

核心需求：

- 建投票：问题 + 若干选项，可勾选"允许多选"，可选截止时间
- 发起人得到两个链接：**投票链接**（公开分享）与**管理链接**（可手动关闭投票）
- 匿名投票；浏览器 localStorage 标记简单防重投（可绕过，接受）
- 结果随时可看：投票页直接展示当前计票，每 3 秒自动刷新
- 运行方式：本地 / 局域网起服务给大家用；Node 实现，文件存储，不用数据库

明确不做（YAGNI）：账号体系、严格防刷、投票者补充选项、结果导出、部署上线方案。

## 2. 技术选型

**零依赖 Node**：只用 Node 内置模块（`http`、`fs`、`crypto`、`node:test`），
前端为纯 HTML/CSS/原生 JS，由服务直接托管静态文件。无 npm 依赖、无构建步骤，
`node server.js` 即起。测试用 `node --test`。

已考虑并否决的替代方案：Express + 前端框架（依赖与构建成本对几个接口的小工具
不划算）。

## 3. 结构与分层

```
superpowers-poll/
├── server.js          # HTTP 服务：路由 + API 接线 + 静态文件托管
├── lib/
│   ├── store.js       # 数据层：读写 data/polls.json
│   └── polls.js       # 业务逻辑：校验/建投票/投票/关闭/计票/状态判断
├── public/
│   ├── index.html     # 首页：创建投票表单
│   ├── poll.html      # 投票页（/poll/<id>）：投票 + 实时结果
│   └── admin.html     # 管理页（/admin/<adminToken>）：结果 + 关闭按钮
└── data/polls.json    # 数据文件（git 忽略）
```

分层职责：`store.js` 只管文件读写；`polls.js` 只管业务规则，不碰 HTTP 与文件路径；
`server.js` 只管 HTTP 接线。三层可独立测试。

服务监听 `0.0.0.0:3000`（端口可用环境变量 `PORT` 覆盖），局域网内通过发起人 IP 访问。

## 4. 页面流程

1. **首页 `/`**：填问题、逐行加选项（初始 2 行，可加减）、勾"允许多选"、可选截止
   时间 → 提交成功后展示投票链接与管理链接，并提醒：管理链接丢失无法找回。
2. **投票页 `/poll/:id`**：显示问题与选项（单选圆钮 / 多选方框），下方常驻当前
   结果（每选项票数 + 百分比条），每 3 秒拉取刷新。以下情况隐藏提交按钮、只显
   结果并说明原因：本浏览器已投过（localStorage 键 `voted:<pollId>`）、投票已
   关闭、已过截止时间。
3. **管理页 `/admin/:adminToken`**：同结果视图 + "关闭投票"按钮（关闭后按钮变为
   已关闭状态）。

## 5. 数据模型

`data/polls.json`——单个 JSON 对象，poll id 做 key：

```json
{
  "a1b2c3": {
    "id": "a1b2c3",
    "adminToken": "x9y8z7w6q5r4t3s2",
    "question": "周五团建去哪",
    "options": ["烤肉", "火锅", "轰趴馆"],
    "multiple": false,
    "deadline": "2026-07-10T18:00:00+08:00",
    "closed": false,
    "votes": [[0], [2], [1]],
    "createdAt": "2026-07-07T10:00:00+08:00"
  }
}
```

- `id`：6 位随机字母数字（URL 友好）；`adminToken`：16 位随机。均用 `crypto`
  的安全随机生成，互不可推导。
- `votes`：每次投票记录一个"所选选项下标"数组（单选即单元素数组）。保留原始
  记录，票数由 `polls.js` 现算。
- `deadline` 可为 `null`。**可投状态** = `!closed && (deadline 为 null || now < deadline)`。
- 持久化：写临时文件再 `rename`，防止进程中断损坏数据文件。
- 启动时数据文件不存在→从空数据开始；文件损坏（JSON 解析失败）→将原文件备份为
  `polls.json.bak-<时间戳>` 后从空数据开始，不悄悄丢弃。

## 6. API

全部返回 JSON。页面路由 `/poll/:id`、`/admin/:token` 返回对应 HTML，页面自行从
URL 提取 id/token 调 API。

| 方法 | 路径 | 作用 | 成功返回 |
|---|---|---|---|
| POST | `/api/polls` | 建投票 | `{id, adminToken}` |
| GET | `/api/polls/:id` | 投票详情 + 计票（公开视图，**不含 adminToken**） | 公开字段 + `counts`、`total`、`open` |
| POST | `/api/polls/:id/vote` | 投票，body `{choices:[下标...]}` | 更新后的公开视图 |
| GET | `/api/admin/:adminToken` | 管理视图 | 与公开视图同款字段 |
| POST | `/api/admin/:adminToken/close` | 关闭投票 | 更新后的管理视图 |

公开视图字段：`id, question, options, multiple, deadline, closed, open, counts, total`。
`counts` 为与 `options` 等长的计票数组；`total` 为投票人次；`open` 为当前可投状态。

## 7. 校验与错误处理

校验统一在 `polls.js`，出错抛带 `status` 与中文 `message` 的错误；`server.js`
统一转成 `{"error": "<消息>"}` 响应，前端直接展示消息。

建投票（400）：

- 问题：去空白后非空，≤200 字符
- 选项：逐行去空白、丢弃空行后 ≥2 个且 ≤20 个，每个 ≤100 字符
- deadline：可省略；给了必须能被 `Date` 解析且晚于当前时间

投票：

- 404：poll 不存在
- 409：投票已关闭 / 已过截止时间（消息区分两种原因）
- 400：`choices` 缺失或为空、含非法下标、含重复下标；单选却提交多个选项

其他：未知 API 路径 404；请求体非法 JSON 400；`GET /api/admin/:token` token 不存在 404。

并发：Node 单线程 + 内存单例 store，请求逐个处理，写文件串行化，无覆盖问题。
截止时间不用定时器：每次读取现算是否过期。

## 8. 测试策略

全部用 `node:test`，`node --test` 一条命令运行：

- **store.js 单测**：写→读往返；文件不存在→空数据；文件损坏→备份 .bak 并从空
  数据开始。测试用临时目录，不碰真实 data/。
- **polls.js 单测**：建投票各校验分支；单选/多选计票正确；closed / 过期 / 不存在
  的拒投分支；公开视图不泄露 adminToken。
- **server.js 集成测试**：起真实 HTTP 服务（随机端口、临时数据目录），全流程：
  建投票→投票→查结果→关闭→再投被 409 拒；外加 404/400 路径与静态页面可达。
- **Playwright 冒烟**：真实浏览器走通 建投票→打开投票链接→投票→看到结果；
  已投浏览器刷新后不能再投。
