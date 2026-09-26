change: source-intake
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a0dfd4-b546-7dd3-b46b-894836b94626   # codex exec, round 1 (2026-09-27)

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/source-intake`（从 v6-dev@f2ed9e4 开出）；本地提交；评审通过后合回 v6-dev 并推 judge 与 GitHub；不进 release/v6 / preview 快照
- decision: requirement — 人类 09-27 /goal 第 2 条 A 项 + `work/astra-discuss/next-improve/NI-CONSENSUS.md` §一 A（Claude × Astra）：P2 四问（来源要求都有落点 / 每条场景有依据 / 条件清晰可验 / 来源间无冲突；实现选择记 `decision: producer`，真正未决才 assumption）；Ground/Discuss 门：外部讨论产出按来源材料登记（路径、版本、批准范围，未知写未知），不自动取得一手验收权威，不自动获准 `apriori new`，不自动串接外部 plan（已授权的 plan 不禁止）；`/apriori-discuss` 可以现成设计文档为输入直接进入保存；意图分流不得把「已在外部聊完、现在开工」误判为继续讨论；顺带把 store protocol 的 PR-07/09/14 改为现行语义
- decision: 边界 — 只加句、改句、修陈旧，不删 RUNBOOK 既有段落；不改 R1 停点、owner 授权语义、归档放行；P3 不动（RIB-10，人类 09-20 裁定）
- decision: 判据 — 正确性优先（plan/13 末节 09-27）；验收 = 文本测试 + 真实语料对照 + 限定行为运行（HM 账号），不做成本配对
- observed: RUNBOOK.md L275-280 Ground 只规定三类事实与来源，无外部讨论产出（设计文档/原型）的登记规则与批准范围；L263-273 Discuss first 与 P6 L408-415、templates/discuss.md 只覆盖「在本入口内讨论后保存」，未覆盖「人指着别处产出的设计文档要求保存」
- observed: P2 L353-364 [Specify] 有 Split first、一输出一场景、写明范围外、共享状态三时刻；无「对照来源」的自查问题
- observed: templates/command.md Work 支条件是「the text above identifies one change to work on and they did not limit you to discussing」，兜底为讨论；末段穷尽声明由 test/protocol.test.js checkCommandTemplate + PR-14b 五类变异电池守卫（穷尽声明必须是最后一条路由规则）；模板改动须同步 test/fixtures/command.golden.md 与 lib/managed.js TEMPLATE_GENERATIONS（UP-11）
- observed: discuss 模板由 test/discuss.test.js DS-01 以 test/fixtures/discuss.golden.md 逐字钉住；同上须更新 TEMPLATE_GENERATIONS
- observed: store apriori/specs/protocol/spec.md 首个需求块内 PR-07（diverge→converge→funnel、P13、ASCII 草图 2-3 变体、覆盖清单）、PR-09（brainstorm exit、crystallized understanding）、PR-14（bare /apriori opens Brainstorm）均与现文及现测试（PR-07/09/14/14b 钉 discuss-first 短姿态、两份批准三类事实、意图优先六项含义）不一致——6.2-sub-doc 15f796b 删编排后未改 store
- observed: store 中 PR 最大 id = PR-52（protocol-text-consistency）
- observed: 真实语料（work/diag-0926/D-59-split.md:126-140；本会话核查）——C1/C5 的 PRD 要求被 agent 漏掉、由 spec-review 捞回（ONR-25、ONE-10）；C3/C7 的用户可见行为由 agent 自定；50 个真实 bundle 无一在 Reality Check 引用外部设计文档
- observed: Build 完成 —— RUNBOOK 两版 Ground / P2 / Discuss first / P6 / §0 两扇门各加一句；templates/command.md Work 支加一句（穷尽声明仍为最后路由规则）；templates/discuss.md 在 §4 指针点名（薄壳 2599 < 2600）；lib/managed.js 登记两个新 generation；goldens 同步；store protocol MODIFIED 首块（PR-07/09/14 现行语义）+ ADDED PR-53..56；test/source-intake.test.js 改前 4 红改后 4 绿；全套 846/846；check --self PASS；verify --change GREEN
- observed: 层 2 限定行为 12 次（HM，候选包 8ad1893，/srv/benefit/si）全部 DONE、0 回复：mixed 3/3 草案未升格、FR-3 落地、设计文档带批准范围登记（005 一处把生产方取舍归到「产品」名下）；clean 3/3 已批接住、无虚造阻塞；route 3/3 走 Work 支；save 3/3 忠实保存；详见 /root/asd-lab/work/next-improve-0927/A-报告.md
- observed: Review 第 1 轮（`review/code-review-v1.md`）= `VERDICT: no spec-vs-code gaps`；评审方核了两版义务对等、`decision: producer` 不越过「用户可见行为交 owner」、Ground 不给外部文档授权、Work 支句仍从属于讨论优先与穷尽声明、P3 两版逐字未动、MODIFIED 块保留 PR-01..16；advisory：层 2 的归属偏差与边界判断差异限制「模型稳定遵守」的说法，不构成规则矛盾

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write → 合回 v6-dev

gates:
  - 2026-09-27T06:29 note: Review 第 1 轮接受；进入 gate / archive
  - 2026-09-27T06:27 note: Build 与层 2 完成；review-ready；开 Review 第 1 轮
  - 2026-09-27T06:01 note: Ground 完成；进入 Specify
  - 2026-09-27T06:00 note: change scaffolded by `apriori new`
