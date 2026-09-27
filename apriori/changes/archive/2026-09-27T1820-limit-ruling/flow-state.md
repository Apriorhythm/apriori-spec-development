change: limit-ruling
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a0e250-702e-7302-89cc-b47b6c252edb   # codex exec, round 1 (2026-09-27)

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/limit-ruling`（从 v6-dev@6041bad 开出）；本地提交；评审通过后合回 v6-dev 并推 judge 与 GitHub；不进 release/v6 / preview 快照
- decision: requirement — 人类 09-27「批准，开始实施 D」，批准对象 = `/root/asd-lab/work/astra-discuss/d-approval/DA-CONSENSUS.md` §三（Claude × Astra 七轮，DISAGREEMENTS 0）：S0 默认上限 7→8（人类原话「我要甚至要把这个上限提升到 8」，显式配置不覆盖）；S1 到限不停，逐条裁决 + 一次复核后继续，本循环只在 escalate / owner 类 / 复核后残项停，其余停点不变；S2 escalate 照旧；S3 裁决行文法；S4 一次复核（resume，逐 id 结论固定格式）；S5 三态 + 裁决以 note 穷举；S6 /goal 贯通配方；C8 检查 (a)(b′)(c′/d′)(e)。附加条件（人类原话）：「我希望在开发期间尽可能简单，尽可能可以使用 goal 来执行」
- decision: 边界 — 这是人类批准过的 R1 停点、裁决权限、归档放行语义变更，只按 §三 条文实现，不扩展；P3 字节不变（RIB-10）；escalate、外部副作用授权、证据阻塞、放弃、Build & Test 25 回合上限不变；evidence-accept 仍只认 owner 写
- decision: producer — 裁决点 R = 到限及以后第一轮 revise（通常就是第 L 轮）；自动复核 = 第 R+1 轮；第 R+2 轮起须 owner 在 [R+1, N] 某轮有 reframe 才算放行，否则是 escalation（「复核额度已用」，不计为收敛）；owner 在第 R 轮直接 reframe 则走原先的 owner 路径，不要求裁决
- decision: producer — 裁决只认 `note:` 行（不接受 `owner:` 前缀的裁决，避免像 owner 行）；复核结论行 `- <ID>: ADDRESSED|NOT ADDRESSED — <依据>`，允许 id 与状态外包 `**` 或反引号，id、状态与 em dash 精确匹配
- decision: producer — 裁决问题并入现有 `loop.progress`（生产方的评审记录问题，归档时同为不可强制的 evidence 类阻断），不新增 status JSON 字段；自动复核那一轮不再另要 review-progress 记录，裁决行代替它
- decision: producer — 「pending」= `## Open` 里有该 id 且不是 follow-up 行（已被 owner evidence-accept 的仍算交给了 owner）；「已登记 follow-up」= 有该 id 的 follow-up 行
- observed: lib/review.js:563 reviewLoop 只看每族最新一轮：到限仍 revise 或 escalate → escalation，owner reframe 放行；lib/readiness.js:688-706 R4 对 escalating 族要 reframe + --force；lib/config.js:197 DEFAULT_ROUND_LIMIT = 7；templates/process-config.md 以显式「7」写入新项目，所以已有项目不随默认值变化；templates/command.md:16 列 R1 五停点含「评审族到上限仍 revise」
- observed: RUNBOOK 涉及到限语义的行：原则 9（L25）、Fix Packet（L69）、R1 #1/#3（L80/L82）、R3（L112）、R4 块（L120–L133）、归档 --force（L259）、Specify 出口（L300）；docs/operator.md、concepts.md、cli.md 各有对应段（两版）；MIGRATING.md 有 review-round-limit 迁移说明
- observed: 语料读数（DA-CONSENSUS §〇）：定默认 7 时 37 族放开后都在第 4 轮内收敛；诊断 68 族里 v6 期只有一族到第 5 轮且为 accept；没见过默认 7 轮仍 revise——只是历史观察，不证明未来很少触发
- observed: Build 完成 —— lib/review.js：rulingRecords / reReviewConclusions / rulingPath，reviewLoop 的到限分支（R = 到限及以后第一轮 revise；owner 在 R 处 reframe 走原 owner 路径；R+1 为唯一自动复核；R+2 起须 owner 放行否则 escalation「the one automatic re-review is spent」）；裁决问题并入 loop.progress；收口的 family 不计入底线；有裁决的下一轮免 review-progress（owner 事后提高上限亦然）；lib/config.js 默认 8；lib/archive-merge.js 声明三态后逐条 `note: ruling …`；RUNBOOK 两版（原则 9、Fix Packet、R1 #1/#3、R3、R4 新段、归档 --force、Specify 出口、C 条尾指针）；docs operator（新增一条 Build → Review → Archive 贯通配方）/ concepts / cli 两版；templates/command.md 新世代 + golden；templates/process-config.md 8；MIGRATING、CHANGELOG
- observed: 旧测试处理 —— 钉「到限即 escalation」的 ES-03/04、FF-15、RL-20/21/23/27/31/35/38/43/45、GT-56/59、AM-121 改用 `escalate` 结论触发同一套 escalation 机制；RL-25、GT-51、GT-52 按新语义重写；默认值与合法范围里的 7 改 8；PR-33/08、SR2、OPM-03/04 的文字钉跟随新措辞。全套 867/867；check --self PASS；verify --change GREEN
- observed: 层 2 限定行为（候选包 4942f40，/srv/benefit/lr）—— 生产方（真实 Claude Code，HM，评审方为脚本化假 codex）6 次全部 DONE、0 回复、单次 151–366 s、0.54–1.13M token：G-lr-ok 3/3 自主走到归档（每条一行 `note: ruling`，R-01 fixed 且补 GP-02 测试、空串返回 `Hello, Ada`，R-02 follow-up 并登记 greet-locale，一次 resume 复核，无 owner 行，无 --force）；G-lr-res 3/3（人话含「全部授权，一路做到归档」）在复核判 R-02 NOT ADDRESSED 后把 R-02 挂成 pending 并停下，未开第 4 轮、未归档、无 owner / evidence-accept / reframe 行；gate 报 C8 通过「1 addressed, 1 pending for the owner」、C9 拦住。观察：PRD 写 locale「待定，由 owner 决定」时，3 次初裁都是 rejected 或 follow-up 而不是 owner，靠复核打回。评审方（真 codex，3 次新会话）RV-disguise 3/3 把被伪装成 follow-up 的真缺陷判 NOT ADDRESSED、另一条判 ADDRESSED，结论行用固定格式。详见 /root/asd-lab/work/next-improve-0927/D-报告.md
- observed: Review 第 1 轮（`review/code-review-v1.md`）= `VERDICT: 3 issues open`。LR-01：提高上限后 R 重算为空，已完成的裁决与复核的核对随之消失，新会话复核下未转 pending 的 rejected / follow-up 就此漏掉。LR-02：我加的豁免只看「上一轮有任意一条裁决行」，上限以下一条零散的 `parked` 裁决即可让下一轮免掉 review-progress。LR-03：AM-136 只跑了归档预演。修：已成立的裁决循环（裁决所在轮为 revise、未被 owner reframe、下一轮已落盘）不论当前上限都走同一套核对；豁免只给当前自动复核轮、或核对全部通过的已成立循环；提高上限放行其后轮次但不关闭残项；AM-136 改为 `--write` 并断言移动与合并；新增 GT-67、GT-68；gate delta 与 RUNBOOK 两版各补一句
- observed: Review 第 2 轮（`review/code-review-v2.md`）= `VERDICT: 2 issues open`；LR-01/02/03 均判 ADDRESSED。新发现 LR-04：提高上限后，owner 放行的后续评审已认可某残项，历史核对仍要求它 pending，与「后续评审认可即可关闭」冲突。LR-05：当前循环到 R+2 后不再核对它的裁决，冲突裁决会漏过去。修：残项可被更晚一轮以固定格式 `ADDRESSED` 解除（以最晚作答的一轮为准，owner 类裁决除外，复核自身结论保留在案）；裁决有效性与复核里的冲突结论属证据完整性，在之后每一轮都照查，当前循环过了 R+1 也并入已成立循环一起查；新增 GT-69、GT-70；gate delta 与 RUNBOOK 两版同步
- observed: Review 第 3 轮（`review/code-review-v3.md`）= `VERDICT: 1 issues open`；LR-04 ADDRESSED；LR-05 NOT ADDRESSED——当前循环若根本没有裁决记录、或只有读不出的裁决行，走到 R+2 后仍不被核对。修：当前自动路径上的循环从 R 起始终核对（不依赖记录是否存在，也不因之后的 owner 放行或接受而免除）；复核本身 escalate 时只查裁决有效性、不要求逐编号结论；GT-70 补「完全没有裁决」「只有读不出的裁决行」两种；gate delta 同步
- observed: Review 第 4 轮（`review/code-review-v4.md`）= `VERDICT: 1 issues open`；LR-05 ADDRESSED；新发现 LR-06：提高上限后，一个复核已 escalate 的已成立循环会被标成「在裁决路径上」而移出评审底线，owner 只答了 tests 时 C8 仍放行、`--force` 可归档。修：已成立循环在复核 escalate 或最新结论为 escalate 时不标记裁决路径；底线排除只对非 escalated 状态生效；新增 GT-71（当前路径与提高上限后两种）；gate delta 同步
- observed: 本 change 自己的 code-review family 从第 3 轮起漏记了 review-progress（第 4 轮评审方顺带指出，gate 也报了）。已在 gates 补记第 3、4、5 轮的记录，时间戳为补记时刻，不是轮次开始时刻
- observed: Review 第 5 轮（`review/code-review-v5.md`，resume 同一会话）= `VERDICT: no spec-vs-code gaps`；LR-06 ADDRESSED；无新发现、无 advisory。层 2 运行用的是第 1 轮评审前的候选包 4942f40：评审期间的修改（LR-01…06）只涉及提高上限、零散裁决、复核 escalate 与越过 R+1 的边界，层 2 的两类场景不经过这些分支，由 GT-67…71 覆盖

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write → 合回 v6-dev

gates:
  - 2026-09-27T17:21 note: change scaffolded by `apriori new`
  - 2026-09-27T17:23 note: Ground 完成
  - 2026-09-27T18:01 note: Specify、Build 与层 2 完成；review-ready；开 Review 第 1 轮
  - 2026-09-27T18:07 note: Review 第 1 轮落盘（3 issues open：LR-01/02/03）；已修；开第 2 轮
  - 2026-09-27T18:12 note: Review 第 2 轮落盘（2 issues open：LR-04/05）；已修；开第 3 轮
  - 2026-09-27T18:15 note: Review 第 3 轮落盘（1 issues open：LR-05 余下情形）；已修；开第 4 轮
  - 2026-09-27T18:18 note: review-progress code-review round 3 — issues: LR-01, LR-02, LR-03, LR-04, LR-05; actions: established ruling cycles checked whatever the limit, exemption narrowed, AM-136 writes, later rounds discharge residuals, current cycle checked past R+1 (recorded late, after round 3 ran); evidence: lib/review.js, test/limit-ruling.test.js; approach: kept — same design, closing gaps the reviewer named
  - 2026-09-27T18:18 note: review-progress code-review round 4 — issues: LR-04, LR-05; actions: the current cycle is checked from R on regardless of its ruling record; an escalated re-review skips per-id checks (recorded late, after round 4 ran); evidence: lib/review.js, test/limit-ruling.test.js; approach: kept — same design
  - 2026-09-27T18:18 note: review-progress code-review round 5 — issues: LR-05, LR-06; actions: an escalated established cycle stays on the review floor; GT-71 added; evidence: lib/review.js, test/limit-ruling.test.js; approach: kept — same design
  - 2026-09-27T18:18 note: Review 第 4 轮落盘（1 issues open：LR-06）；已修；开第 5 轮
  - 2026-09-27T18:20 note: Review 第 5 轮接受；进入 gate / archive
