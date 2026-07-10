# Proposal — quick-poll

## WHY(为什么做)

开会或群里需要快速征集意见,现有做法(口头举手、聊天刷屏)难汇总、易漏统计。需要一个**发起与参与都近乎零成本**的匿名投票工具:建一个投票(标题+选项)、发一条链接、几十人点开即投、投完即看结果。

## WHAT(做什么)

一个单进程 Node 标准库 HTTP 服务(方案 1,无数据库、无框架),每个投票持久化为一个 JSON 文件:

- **创建**:标题 + 2–10 选项 + 单/多选(默认单选)+ 可选截止时间 → 返回分享链接 + 私密管理链接。
- **投票**:匿名、免登录;single/multi;投完即看实时结果(票数/百分比/条形/总人数)。
- **软拦截**:同一浏览器 localStorage 记"已投",再打开直接看结果。
- **生命周期**:发起人凭管理链接手动关闭;设了 deadline 则到点自动关闭;关闭后拒新票、结果可看。
- **健壮性**:完整错误码体系、XSS 转义、per-poll 串行写队列(vote+close)、原子落盘(fsync file+dir)、并发不丢票、持久化失败不谎报成功。

规格见 `specs/`;架构见 `design.md`;实现顺序见 `tasks.md`。验收锚点:`specs/` 中 **42 个 scenario ID**(覆盖 req-final 的 AC-1..AC-19 + STEP2 复审补入的 Content-Type / 关闭页只读 / 客户端 XSS 等),含 4 项对抗性测试(并发投票 CC-01、崩溃持久化 CC-02、close/vote 并发 CC-03、落盘失败注入 CC-04)。

## OUT OF SCOPE(明确不做)

- 账号/登录/用户体系(需求即匿名免登录)。
- 硬防刷(IP/实名/验证码)——已接受软拦截,防不住无痕/清缓存的硬刷。
- 现场大屏实时跳动 / 二维码现场秀(方向 A,非本工具)。
- 投票创建后编辑标题/选项;多问题问卷/分支逻辑。
- 数据库;投票文件自动清理/配额;人为并发队列上限/限流(仅设 16 KiB body 上限)。
- WebSocket/SSE 实时推送:结果"投完即看"= 提交后返回当前快照 + 可手动刷新;不做服务器主动推送(YAGNI,数十人规模)。

## 关键设计决策(详见 design.md,STEP3 复核)

- **D1** 零运行时依赖:仅 Node 标准库(`http`/`fs`/`crypto`);测试用 `node --test`(TAP,喂 `apriori verify`),E2E 用全局 Playwright。
- **D2** 每 poll 一个 `data/polls/<id>.json`;写走"临时文件→fsync→rename→fsync(dir)"原子路径。
- **D3** per-poll 串行:进程内 `Map<pollId, Promise>` 尾接链,vote 与 close 共用;保证同一 poll 的写不交错。
- **D4** id/adminToken 用 `crypto.randomBytes` (CSPRNG);token 仅存服务端 JSON,渲染层永不输出。
