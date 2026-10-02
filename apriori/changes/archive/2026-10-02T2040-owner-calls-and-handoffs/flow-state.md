change: owner-calls-and-handoffs
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a0fc96-2243-7100-a502-a4aa1324d226   # codex exec, round 1 (2026-10-02)

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/owner-calls-and-handoffs`（从 v6-dev@4f502fc 开出）；本地提交；评审通过后合回 v6-dev 并推 judge 与 GitHub
- decision: requirement — 计划 C-c（`/root/asd-lab/work/r59-1002/PLAN-改造计划.md` §一；Claude × Astra 共识 `/root/asd-lab/work/astra-discuss/r59/R59-CONSENSUS.md` §三 批 1），人类 10-02「执行」：R3「评审或外部报告明确标为 owner 口径、且尚无有效决定的项，宽泛的『其他全部修复』不替代决定；owner 可以一次批量确认，但确认须指明这些项」+ R6 代录示例（附出处说明；附了说明也不使代选方案变成人类决定）；R4「交给流程外的必要依赖（人工上线、别的仓）仍保留 id、责任落点和未验证状态；文档交接不等于兑现」；R2 /goal 配方分列「全部完成」与「停在人类停点并报告未完成项」两种终止结果，后者不报为交付完成；能实测先实测（≤3 次），不能则以待验证试用配方发布；均不加机器检查
- decision: producer — 编辑 R1 的 owner 决定段时，把其中陈旧的「a review family stopped at its limit (or by `escalate`) needs … `--force`」改为 limit-ruling 之后代码实际检查的「stopped by `escalate`, or past its one automatic re-review」（与 RUNBOOK §4 归档 `--force` 句一致）；同段改动，不另开 change
- decision: producer — R2 落到 operator 全部四条 /goal 配方（Specify、Build & Test、Review & Deliver、Build → Review → Archive）：四条都把人类停点只写在正文里，同一缺口；Build & Test 的第二种结果另含 25 轮上限。concepts §4.7 两版加一段说明为什么
- observed: 5.9 证据（`/root/asd-lab/work/r59-1002/` F1 G1/G4/G8、F3 §6.3）—— (1) 全量评审列出 O-1～O-3「需 owner 定口径」，owner 说「其他全部修复」，agent 自选方案写成 decision；(2) C6 把 task-scheduler 转发代码记为生产方 decision「作为上线交付物文档」，`
- observed: 上一个 change（runbook-english-only，已归档 2026-10-02T2012）的 gates 里有三条时间是我手填错的——`T20:58`（Build/review-ready）、`T21:38`（第 1 轮落盘）、`T21:52`（第 2 轮接受）都晚于实际，也晚于 20:12 的归档；按 codex 会话记录，第 1 轮 20:00:52 开始、第 2 轮 20:11:20 前结束，三件事实际都在 20:00–20:12 之间。归档 bundle 冻结，不回改，在此记录；本 change 起 gates 时间一律取 `date` 输出
- observed: Build 完成 —— RUNBOOK §1 R1 owner 决定段（陈旧 `--force` 句改准 + R3/R6 段）、§4 Split first 与 P2（R4）；operator 两版四条 /goal 配方的 Goal 行加第二种结果；concepts 两版 §4.7 加「goal 也要在人类停点结束」段；operator-move 的 LAUNCH_LINE 钉随之更新；新增 test/owner-calls-and-handoffs.test.js（PR-64..66，改前在 v6-dev 上 3 红）；CHANGELOG、MIGRATING 各一条；全套 875/875；`check --self` PASS；`verify --change` GREEN；P3 不动
- observed: R2 层 2 实测（`/root/asd-lab/work/next-improve-1002/C-c-R2实测.md`，HM 账号 4，单次 `claude -p "/goal <配方>"`，假 codex 恒给 escalate）—— old 配方 ×1：评估器 9 次 `met:false` 后自停；new 配方 ×2：报告停点那轮即 `met:true`，0 次空转；三次都未越权（无 owner/reframe 行、未归档、escalate 后未改代码、未开第 2 轮）。n 小，只测了一条配方与一种停点
- observed: Review 第 1 轮（`review/code-review-v1.md`）= `VERDICT: 2 issues open`。OC-01：合并配方（Build → Review → Archive）的终止条件漏了 Build & Test 阶段的 25 轮上限——到了上限、又没碰 R1 停点时两种结局都不成立，仍会空转——修：合并配方的第二种结果加「or at the Build & Test stage's 25-turn bound」，上限时报告未满足条件与失败证据，「never a pass or a delivery」；两版同步；PR-66 加钉「凡带 25 轮安全上限的配方，其条件里必须含 25-turn bound」。OC-02：改正后的 `--force` 句仍不准——代码按派生的 escalation（`f.escalating`：escalate 结论；越过唯一一次复核而未经放行或仍 revise；owner 以 reframe 接管上限轮后仍 revise）要求「已记录决定 + --force」，而不是按轮次位置——修：R1 段与 §4 归档 `--force` 句都改为「an escalated review family — 上述三种来源 (§1 R4)」；PR-64 钉两处。Advisory（评估器解释不要说成「首行/正文」的技术边界；R2 实测不支持「消除一切重复」，003 的 Build 行为差异与 goal 文本无关属过度断言）——delta Notes 与 concepts 段原本就未写「首行」；实测报告的 003 一句改为「无法判断是否与 goal 文本有关」
- observed: Review 第 2 轮（`review/code-review-v2.md`，resume 同一会话，消息按 §4 后续轮次范围写）= `VERDICT: no spec-vs-code gaps`；OC-01、OC-02 均 ADDRESSED；无新发现。Advisory：CHANGELOG 的 `--force` 括注仍是旧的两种情形简写——接受后改为「the derived escalation, including the owner-reframe path at the limit」；纯措辞。评审方注明：R2 实测只覆盖被测配方与 escalate 停点，未验证新加的 25 轮上限分支

## Open` 空，到提交当天才被 owner 追问出来；(3) S1 两条 goal 在两处人类停点 Stop hook 共空转 20 次（5 + 15，已复核 jsonl）；评估器原文写着「C8 因 goal 硬闸已停下」仍判「条件尚未满足」；(4) agent 代写 reframe 时加了一行 note 披露代写
- observed: /goal 文档（code.claude.com/docs/en/goal）：每轮结束后由小型快速模型按「条件 + 全部对话」判 Not yet met / Met / Impossible；连续数轮无工具调用时循环自停并警告；`claude -p "/goal …"` 在一次调用内跑完循环；条件可写「or …」分支，按对话可见内容判定
- observed: RUNBOOK 现状——§1 R1 owner 决定段（:88）只写「逐字、一次性、agent 自己追加的不算」，无 owner 口径项被宽泛授权覆盖的规则，也无代录披露规则；§4 Split first（:297）与 P2（:361）的承诺规则只写「交给另一个 change」；`carried by` 不受机器解析，非 follow-up 的 `- <ID>:` 即 pending、C9/R5 阻断直到 owner `evidence-accept`

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write → 合回 v6-dev

gates:
  - 2026-10-02T20:15 note: change scaffolded by `apriori new`
  - 2026-10-02T20:23 note: Ground、Specify、Build 完成（PR-64..66 测试改前在 v6-dev 上 3 红、分支上 3 绿；全套 875/875）；R2 层 2 实测进行中
  - 2026-10-02T20:27 note: R2 实测完成（old 9 次空转、new 0 次，三次均未越权）；review-ready；开 Review 第 1 轮
  - 2026-10-02T20:36 note: Review 第 1 轮落盘（2 issues open）；已修；开第 2 轮
  - 2026-10-02T20:40 note: Review 第 2 轮接受（no spec-vs-code gaps）；advisory 措辞已改；进入 gate / archive
