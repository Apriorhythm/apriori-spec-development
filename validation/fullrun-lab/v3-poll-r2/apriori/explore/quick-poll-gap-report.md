# 差距报告 — quick-poll（STEP1 explore，P3）

> 输入：`requirement/req-final.md`；KB：none（greenfield，无 `apriori/truth/`）；代码：本仓库。
> module：none（新建子系统）。不写代码（无 tripwire 研究 spike 需求——技术路径已在 brainstorm 选定，非"vague-but-tripwired"）。

## 当前状态 A

- **空仓**：`master` 分支无任何提交、无应用代码（仅 apriori 流程脚手架 + 需求/流程文档）。
- 无 KB、无既有约定、无既有依赖；`package.json` 尚不存在。
- 运行时可用：Node v24.11.0、npm 11.6.1、Playwright 1.60.0（chromium 已缓存，供 UI E2E）。
- 结论：**无 A→B 的存量冲突**（P1 r3 亦确认无 state-A 冲突）。一切从零构建。

## 目标状态 B（摘自 req-final）

单 Node 服务 + 文件存储（无 DB）的匿名快速投票工具：建投票（标题+2..20 选项+单/多选+可选截止）→ 投票链接 + 管理链接（CSPRNG 密钥）→ 匿名单/多选、浏览器 localStorage 软限重复 → 投完即看轮询实时结果 → 到点自动关闭 / 发起人凭 adminKey 手动关闭。验收项 PC-01..PC-13。

## 差距（A→B 要新建的东西）

| # | 差距 | 关联验收 | 说明 |
|---|---|---|---|
| G1 | 项目骨架 | 全部 | `package.json`、依赖选择、测试框架（TAP 输出以喂 `apriori verify`）、目录布局、启动脚本、`.gitignore` |
| G2 | HTTP 服务 + 路由 | PC-01/03/04/06/07/08/12/13 | 创建 / 投票 / 结果 / 关闭 端点；SSR 页面（创建页、投票页、结果页、管理页） |
| G3 | 文件存储层 | PC-10/11/13 | 每投票一文件；读改写 + 临时文件原子 rename + durable 后才返回 |
| G4 | **per-poll 串行化写队列** | PC-10 | 单进程内按 pollId 加锁，消除读改写交叠——**并发不丢票的核心**（发起人明确不用 DB，此为 DB 替代方案） |
| G5 | 标识符生成 | PC-01/08 | `pollId`/`adminKey` 各 CSPRNG ≥128 bit，URL-safe，不可枚举，禁入日志 |
| G6 | 输入校验层 | PC-02/03b/04/12 | 创建 schema+边界校验；投票 payload 校验（未知/重复/类型/空 → 400，计数不变） |
| G7 | 状态与截止判定 | PC-07/08/09 | status(open/closed)；临界区内求值 `now>=deadline`；关闭鉴权（adminKey） |
| G8 | 前端 JS（轮询 + 软限） | PC-05/06/09 | 结果页加载即拉一次 + 每 3000ms 轮询；localStorage 标记（origin+pollId）；已关闭态渲染 |
| G9 | 测试装置 | PC-10/11/13 | 并发投票测试；崩溃/中断写模拟（临时文件残留检查）；durable 失败注入——**hard-guarantee 需注入对抗条件**（P8 纪律） |

## 风险与未知

- **R-A（高）· 文件存储并发**：不用 DB，正确性完全押在 G4 的单进程写队列 + 原子 rename 上。**已知边界**：仅在单 Node 进程内成立；一旦多进程/多实例部署，per-poll 内存锁失效——须在设计（STEP2）中显式声明"单进程部署"为前提，否则 PC-10/PC-11 的保证是假的。这是本变更最大的技术风险。
- **R-B（中）· hard-guarantee 可测性**：PC-10（不丢票）、PC-11（不半写）、PC-13（无假成功）都是"always/crash"类硬保证，必须有注入对抗条件的测试（并发写、写中途 kill、rename 失败注入），否则按 P8 纪律必须把措辞降级。测试注入失败注入点需要存储层留出 seam。
- **R-C（中）· 崩溃语义边界**：原子 rename 保证文件不半写，但"成功返回即已落盘"还依赖 rename 落盘时机（fsync 目录）。设计需明确 durable 的确切定义，避免 PC-13 过度承诺。
- **R-D（低）· 轮询负载**：几十人 × 每 3s 一次读，量级无压力；但结果 endpoint 若每次读盘，需确认读也走一致性路径（读到的是完整文件而非半写——由 G3 原子写保证）。
- **R-E（低）· adminKey 泄露面**：URL 中携带密钥——Referer 泄露、浏览器历史、分享误发。v1 接受此风险（brainstorm 已认可"管理链接"设定）；设计只需保证不进服务端日志。

## 建议带入 STEP2 的顶层风险（供本轮报告）

1. **单进程部署前提必须写进 proposal/design 并在 spec 中显式声明**——否则并发保证名不副实（R-A）。
2. **三个硬保证（PC-10/11/13）各需一个注入对抗条件的测试**，STEP2 设计时就为存储层留失败注入 seam（R-B/R-C）。
3. 测试框架选型需输出 **TAP**（喂 `apriori verify` 的绑定门）；UI 层用 Playwright 叠加在绑定门之上。

## 研究结论附录

不适用（非 research-spike 变体；未写任何 probe 代码）。
