change: ground-writeback-trace
phase: review                            # ground | specify | build | review | done | abandoned
reviewer-session: n/a                     # the reviewer's resumable session id, the moment round 1 prints it

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/ground-writeback-trace`（从 v6-dev@e8f9342 开出）；本地提交；评审接受后 squash 合回 v6-dev，推 judge 与 GitHub，删分支，不打 tag、不发版
- observed: 来源——暂定方案 `/root/asd-lab/work/astra-discuss/r1024/PENDING-ground-writeback-trace.md`（人类 2026-10-25「暂定这个修改」，触发条件「候选版 B4 仍栽」）；人类 2026-10-28「你来」。触发证据：evaluate-projects `comparisons/ref-e8f9342-custom-properties-1.report.md`——候选版 e8f9342 在 custom-properties@3 两次 B4 都栽（已存 OR/NOT/多条件视图加一个内置条件点 Update 后 rich_filters 被整体替换，API 200；裁判 rep-2 升 P1），机制与 cp-h2 两臂、6.0.0 参考一致
- observed: 失败的形状——候选 rep-2 的 Ground 已记下 `IssueView.rich_filters` 是 JSONField（Reality Check 第 17 行）与 web 过滤 store / 适配器的位置（第 21 行），规格也写了 rich_filters 的存储与校验规则，但没有一条 observed 说「已存值里新 UI 表示不了的部分，编辑后写回时去哪了」，浏览器也没走「已存视图 → 编辑器 → 加条件 → 保存 → 重读」；control 的只读盲审（cp-h2 CR-3）读代码就看出适配器丢弃条件——事实静态可得，缺的是固定追问而非更深搜索
- observed: 现行规则落点——RUNBOOK §4 Ground bullets 283–291（「Three kinds only」286、「Product facts may never be written from memory」290）；§4 Specify「Minimal means minimal」305 与 P2 375 都说「any external shared state (Redis / DB field / global singleton / in-memory cache) describes three moments」，但没把「本 change 扩展了语义的持久化结构」点名为这条规则的对象；P1 354–367 只说读 code/schema/interfaces，没有「追到写回」；回声：docs/concepts.md 463、567，docs/concepts_cn.md 463、563，docs/cli.md 260–261，docs/cli_cn.md 260–261
- observed: 契约落点——`apriori/specs/protocol/spec.md` 最后一个场景是 PR-75（330 行），本 change 加 PR-76；delta 文件头 `apriori-base` 取当前 base 的 sha256 8091782bd668bc0da5c2e9ffd4e3b576e2105daf032b6098cf2ce33e4d8d62be（lib/archive-merge.js:92 的严格格式）；CHANGELOG 条目放 `## 6.0.0` 下的 `### Unreleased since 6.0.0 · <name>` 小节（ID-06 禁止 `## Unreleased`）；flow-state 散文不能含 HTML 注释定界符（corpus-replay 测试）
- decision: approach（暂定方案 §3，最小形态）——§4 Ground 加一条 bullet：本 change 扩展了语义的持久化结构（存储的 JSON 字段、设置记录、已存文档）就是 Specify 三时刻意义上的共享状态，Ground 对每一个追踪 读取 → 中间表示 → 编辑 → 写回，并以 observed 记录「存储里有、新代码表示不了的部分」的命运（保留 / 合并 / 丢弃 / 拒绝）；只读到读取、没读到写回，这个命运仍是 assumption；P1 加同义句；P2 与 §4 Specify 的共享状态句加括号例并把「运行时更新」落到「表示不了的部分怎样」；concepts 中英、cli 中英各加半句回声；protocol delta 一个 ADDED Requirement + PR-76。不加门禁、字段、图、文档，不加「深度搜索」
- decision: 后果预知（暂定方案 §4）——追踪到「表示不了的部分」后，怎么处理（只合并可编辑部分并保留其余 / 禁止编辑这类对象）是来源未定的用户可见行为，按现行规则进 `## Open` 交业主；在无业主的基线里会成 ownerStop。这是设计选择，不在本 change 里改

- observed: Build——`test/ground-writeback-trace.test.js` 先红（Ground bullet 不存在）后绿；改动落点：RUNBOOK §4 Ground 新 bullet（「Product facts」与「Exit」之间）、P1 探针句后加一行、P2 与 §4 Specify 的共享状态句加括号例与「运行时更新」从句、docs/concepts(.md/_cn.md) 两处回声、docs/cli(.md/_cn.md) §8.1 两处、CHANGELOG `### Unreleased since 6.0.0 · ground-writeback-trace`；全量 919 通过（原 918 + 1）、`apriori check` PASS

- observed: Review 第 1 轮（`review/code-review-v1.md`，Opus 子 agent 自己写入，R2）= `VERDICT: gaps found`：GW-1 新 Ground 句把「新代码表示不了的部分」的命运一律当 assumption 并要 observed——当 change 自己建或替换写回路径时，这个命运是契约要选的行为（P2：只有未证实的事实才是 assumption；决定 / 交业主），现文会逼生产方写出不存在代码的 observed 或把设计问题当事实挂 Open；A-1 文档半边断言弱于 THEN；A-2 「新代码表示不了」应配可观察说法；A-3 concepts 427 与 legacy 表行未回声；A-4 四种命运像封闭列表
- decision: GW-1 fixed——Ground 的 observed/assumption 从句限定于**既有**读取 → 编辑 → 写回路径（「变化后的表示容纳不了的部分」），加一句：change 自己建或替换写回时，该命运是 Specify 运行时更新时刻要陈述的契约行为——来源或业主已定则 decision，否则 Open 交业主，不是 assumption；P1、spec（Requirement + PR-76 THEN）、CHANGELOG、测试同步；Specify/P2 从句保留「新代码」（规格阶段描述的正是新代码行为）
- decision: advisory——A-1 采纳（concepts 中英两处与 cli 中英两处的运行时更新从句各加一条断言；no-mechanism 扫描扩到 concepts/cli 片段）；A-2 采纳（Specify/P2 从句加「(what the changed page or API cannot show or edit)」）；A-4 采纳（四种命运后加 for example）；A-3 不做——concepts 427 与 legacy 表行只是引用这条规则并指向 cli §8.1，操作性文本已回声，再改会把引语改得不像引语

- observed: Review 第 2 轮（`review/code-review-v2.md`，同一评审会话续接）= `VERDICT: no spec-vs-code gaps`：GW-1 ADDRESSED（既有路径 / 自建或替换写回两案分开，与 P2 分类规则一致，Exit 可达，测试有对第 1 轮文本的回归守卫）；A-1/A-2/A-4 ADDRESSED，A-3 保留不做；新建议 A-5「builds or replaces」宜加「changes」、A-6 测试的 added() 切到文件尾会被无关文档改动误红、A-7 spec 括号里「new code」与 RUNBOOK「changed code」不一致
- decision: 评审接受后不再改契约文字——A-5、A-7 记录不改（语义相同、无断言依赖；下次触及这段文字时一并对齐）；A-6 只改测试：added() 切到行尾（产品文本未动，verdict 仍成立）

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write（不接管道）→ squash 合回 v6-dev，推 judge 与 GitHub

gates:
  - 2026-10-28T08:40 note: change scaffolded by `apriori new`
  - 2026-10-28T08:41 note: Ground 完成：来源与触发证据（候选版 B4 两次都栽）、现行规则落点（RUNBOOK §4 Ground/Specify、P1、P2、concepts/cli 两版）、契约落点（PR-76、base sha）已记入 Reality Check；approach 按暂定方案 §3 最小形态
  - 2026-10-28T08:43 note: Specify（protocol PR-76）→ Build：test/ground-writeback-trace.test.js 先红后绿；RUNBOOK §4 Ground 新 bullet、P1 一行、P2 与 §4 Specify 括号例+运行时更新从句、concepts 中英、cli 中英、CHANGELOG 小节；全量 919 通过、check PASS；phase → review
  - 2026-10-28T08:50 note: Review 第 1 轮 gaps found：GW-1（change 自建/替换写回时的命运是契约行为不是 assumption）已修——Ground 句限定既有路径并加 decision/Open 路由句，P1/spec/CHANGELOG/测试同步；A-1/A-2/A-4 采纳，A-3 不做（引语与 legacy 表行）；全量与 check 重跑；续接同一评审会话开第 2 轮
  - 2026-10-28T08:53 note: Review 第 2 轮接受（no spec-vs-code gaps）；A-5/A-7 记录不改，A-6 测试 added() 切到行尾；进入 check / gate / archive
