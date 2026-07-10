# quick-poll — gap report（STEP1 / P3）

> 输入：`requirement/req-final.md`；KB：**none**（全新仓库）；设计文档：无。未写任何代码。

## 当前态 A

- 空仓库（无 commit）：只有 `apriori/` 流程脚手架、`CLAUDE.md`、本变更的流程工件。无任何源代码、测试、package.json、CI。
- 无既有约定可继承：命名、目录结构、日志、测试组织全部由本变更首次确立（将随 STEP6 进入 KB，成为后续变更的约定基线）。
- 运行环境：Node v24（满足需求的 ≥20）；`node:test` + 标准库可用；目标部署为内网机器 `node server.js`。

## 目标态 B（要点，全文见 req-final）

单文件级零依赖 Node HTTP 服务 + 原生 HTML/JS 前端 + `data/<pollId>.json` 文件存储：创建（标题+2–20 选项）→ 投票链接/管理链接 → 匿名单选投票 → 全透明实时结果（3s 轮询）→ 管理链接关闭。核心不变量：per-poll 串行化、原子写（tmp+rename）、成功响应 ⇔ 已落盘、密钥/ID 由 CSPRNG 生成、路由参数先校验后访问。

## 差距（A → B 需要从零建立的东西）

| # | 差距 | 说明 |
|---|---|---|
| G1 | HTTP 服务与路由层 | 标准库 `http` 手写路由分发（7 条路由）、请求体读取与 64KB 上限、统一错误形状 |
| G2 | 存储层 | `data/` 目录管理、原子写（tmp+rename）、损坏 JSON 的明确报错路径 |
| G3 | 并发控制 | per-poll 内存锁/队列的串行化原语（Node 单线程内仍需对 async 写入排队） |
| G4 | 业务规则 | 输入校验（§4.1）、pollId/adminKey 生成（§4.2）、投票/关闭状态机（§4.3）、幂等关闭 |
| G5 | 前端三页 | 创建页 / 投票+结果页（轮询、localStorage 已投标记、移动端适配）/ 管理页 |
| G6 | 测试设施 | `node:test` 组织、以场景 ID 命名的测试、并发测试（AC9）、写失败注入（AC12）、`apriori verify` 的 TAP 绑定 |
| G7 | 项目底座 | package.json（`npm test` 脚本；无 runtime 依赖）、.gitignore（data/、apriori/tmp/）、首个 commit |

## 风险（折叠进后续步骤的清单）

- **R-a（G3）**：Node 单线程 ≠ 免锁——`vote` 的读-改-写横跨多个 await 点，两个并发请求可交错读到同一票数。per-poll promise 队列是设计必答题（对应 AC9）。
- **R-b（G2）**：`rename` 原子性依赖 tmp 文件与目标同文件系统——tmp 文件必须放 `data/` 内，不能用 `/tmp`。
- **R-c（G6）**：AC12（写失败注入）在零依赖约束下只能靠注入点设计（如可替换的 fs 包装），设计阶段就要预留，否则测不了。
- **R-d（G5）**：AC6 属浏览器行为（localStorage），纯 `node:test` 无法覆盖 DOM——绑定用组件级/接口级测试完成，真实浏览器行为由 Playwright 层补（STEP5 验证矩阵：UI 项目 E2E 叠加在绑定门之上）。
- **R-e（G1）**：`Host` 头生成链接：内网可能用 IP:port 访问，链接生成必须原样使用请求 Host，不能拼死 localhost。
- **R-f（G7）**：greenfield 首 commit 顺序——STEP6 的 `source-commit` 要求实现先落 commit，注意收尾顺序。

## 结论

无与现状的冲突（现状为空）；无需研究性 spike——所有技术点（原子写、promise 队列、标准库 http）均为已知模式。可直接进入 STEP2 提案。
