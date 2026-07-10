# STEP1 探索 · gap report — quick-poll

> change: `quick-poll` · tier: medium · track: harden · module: none(greenfield)
> 输入:requirement/req-final.md;KB:none(全新仓库,无既有代码);design.md:尚无。

## KB pre-check

仓库为 greenfield(`git` 无提交、无源码),无 `apriori/truth/*` 模块文档。故无 Contract/Decisions 需要复核或反向捕获;module = `none`。STEP6 将首次为本模块建立 KB。

## 当前态 A

- 空仓库:仅有 apriori 流程脚手架与本 change 的过程产物;无 `package.json`、无源码、无测试。
- Node v24、npm 11 可用;Playwright 1.60(+chromium)全局可用;codex 可用作异构评审。
- 无 HTTP 服务、无数据目录、无任何投票逻辑。

## 目标态 B(据 req-final)

一个单进程 **Node 标准库 HTTP 服务** + 每投票一个 JSON 文件的匿名快速投票工具,提供:
- 创建投票(标题 + 2–10 选项 + single/multi + 可选 deadline)→ 返回分享链接 + 私密管理链接;
- 匿名投票(single/multi)、投完即看实时结果、软拦截重复投票;
- 结果页(票数/百分比/条形/总人数);
- 发起人手动关闭 + deadline 自动关闭;
- 完整错误码体系、XSS 转义、并发不丢票、持久化失败不谎报成功。

## A → B 的差距(全部为"从零新建")

| # | 差距 | 涉及 |
|---|---|---|
| G1 | 无项目骨架 | `package.json`、目录结构、测试脚手架(`node --test` TAP 输出以喂 `apriori verify`) |
| G2 | 无 HTTP 路由层 | §12 六个端点的请求分发、方法/路径解析、16 KiB body 读取与 JSON 解析 |
| G3 | 无领域模型/存储层 | poll 的创建/读取/投票/关闭;JSON 文件的原子读写;id/token 生成 |
| G4 | 无并发控制 | per-poll mutation queue(vote+close 串行),§9/REQ-11 |
| G5 | 无原子落盘 | 临时文件 + fsync(file) + rename + fsync(dir),§8/REQ-3 |
| G6 | 无前端页面 | 投票页/结果页/管理页/创建页的 SSR HTML + 少量原生 JS + 软拦截 localStorage |
| G7 | 无校验/错误层 | §11 错误码表、§12.1 payload schema 校验、XSS 转义 |
| G8 | 无测试 | AC-1..AC-19 的绑定测试,含 3 项对抗性测试(并发投票、落盘失败注入、close/vote 并发) |

## 顶部风险(将折入 STEP2 propose,Medium tier 无 gate ②)

1. **并发正确性(最高)**:per-poll 串行队列 + 原子落盘是本变更的技术核心。风险点:队列必须覆盖 vote 与 close 两类写;原子落盘必须对**文件和其父目录都 fsync**,否则崩溃后 ack 丢失(§4.8 经典陷阱)。AC-11/AC-15/AC-18 必须真正注入对抗条件,不能只测 happy path。
2. **持久化失败语义**:"成功=已落盘"这条硬保证要有注入测试(AC-15),错误路径测试不能替代成功路径保证。
3. **admin token 泄露面**:token 只能存服务端 JSON,绝不能进任何面向投票人的响应/HTML/JS(AC-10);需在实现和 P8 复审时专门查。
4. **XSS**:标题/选项是不可信输入,SSR 到三张页面都必须转义(AC-13)。
5. **verify 绑定 vs Playwright**:`apriori verify` 走 TAP(`node --test`);Playwright E2E 不发 TAP,作为额外出口条件叠在绑定门之上(§4 verification matrix)。scenario ID 通过单元/组件测试绑定 verify。
6. **tier 复核**:并发设计若需要跨模块重构则升 Large;当前判断——单进程单模块、per-poll 队列是局部机制,维持 Medium。**探索未发现需要升级的信号。**

## 探索结论

差距清晰、全为绿地新建、无与既有系统的冲突。风险集中在并发/持久化/安全三处,已有对应 AC 与对抗性测试要求锚定。可进入 STEP2 propose。
