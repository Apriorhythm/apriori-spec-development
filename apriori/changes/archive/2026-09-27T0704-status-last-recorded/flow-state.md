change: status-last-recorded
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a0dff1-8b1b-7a72-9784-a019b75c5c5d   # codex exec, round 1 (2026-09-27)

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/status-last-recorded`（从 v6-dev@d934b99 开出）；本地提交；评审通过后合回 v6-dev 并推 judge 与 GitHub；不进 release/v6 / preview 快照
- decision: requirement — 人类 09-27 /goal 第 2 条 E 项 + `work/astra-discuss/next-improve/NI-CONSENSUS.md` §一 E（Claude × Astra）：status 列表显示每个在途 change 的最后记录时间，取 flow-state 的 gates 时间戳；缺失报 unknown；标明来源；不作停滞判定；自填时间不当活动证明
- decision: producer — 「最后」取 gates 块里**日期最晚**的一条，而不是文本上最后一条：RUNBOOK 把 gates 定为 append-only 日志，但真实日志并不总按序追加（见下一条 observed）
- decision: producer — 时间戳按条目首个词读：`YYYY-MM-DD` 范围校验（月 01–12、日 01–31，不查日历，与 owner 条目同一口径）；其后可读的 `THH:MM` / `THHMM`（时 00–23、分 00–59）精确到分钟，其他后缀（`T22:0x`、`T夜`）退为只到日；按规范化文本取最大（同日只到日的一条排在带时刻的一条之前）；日期越界的条目不计入；围栏代码与 HTML 注释里的条目是文档、不计入（flow.js 同一读法）
- decision: producer — 显示面：列表视图每行追加最后记录时间并在列表后加一行来源说明；`--change` 详情视图加一行；`--json` 每个 change 视图加 `lastRecorded: {at, source, reason}`（错误视图为 null）。不算天数、不标 stale、不与当前时钟比较
- decision: 边界 — 不改 `lastGate` / 「last decision:」的既有语义（文本上最后一条带日期的条目）；不改任何 gate / archive / 授权判定；RUNBOOK 与模板不动
- observed: lib/status.js 列表视图只打印 phase 与 open 数；`--change` 视图打印 `last decision: <lastGate>`；lib/flow.js:230 `lastGate` = gates 块文本顺序的最后一条带日期条目（CHANGELOG 记为「lastGate reads the gates block only」）
- observed: 真实语料（/srv/diag 快照，只读）20 个在途 change：5 个无带日期的 gates 条目、10 个按时间升序、5 个顺序混杂；混杂的 5 个里 4 个文本末条早于最晚一条——2 个差数天（winshang-selectdb-sync 文本末条 09-09T10:05、最晚 09-11T20:45；winshang-collect-direct-push 09-09T11:35 对 09-15T10:00），2 个同日差几分钟到几十分钟（points-service-fee-coupon-price-caliber 12:08 对 12:12；skill-usage-selectdb-sync 00:30 对 01:12）。本仓 A/B/C 的 flow-state 也把新条目插在顶部（本会话的书写偏差，归档不回改）
- observed: gates 条目首词形态（/srv/diag 快照 + 本仓归档）：`YYYY-MM-DDTHH:MM` 778、只到日 `YYYY-MM-DD` 74、`T22:0x` 10、`T夜` 3
- observed: Build 完成 —— lib/flow.js `lastRecorded`（与 gatesEntries 同一结构化读法）；lib/status.js 列表行 + 列表后来源说明行、`--change` 一行、JSON `lastRecorded` 与错误视图 null；docs/cli.md 与 cli_cn.md 各加一段；CHANGELOG Unreleased 一条；三个 JSON 契约测试的键集合 / 键数随之加一（accept-r1 STATUS_VIEW_KEYS、json-contracts JC-04、accept-r2 STATUS_CHANGE_VIEW 26→27）；全套 856/856；verify --change GREEN；check --self PASS
- observed: 真实语料复核 —— /srv/diag 两个项目 20 个在途 change，新 status 的 lastRecorded 与独立 Python 实现 20/20 一致；5 个 `unknown (no dated entry)`；4 个 lastRecorded 与 lastGate 不同（即上一条的 4 个乱序日志）；运行前后快照内无文件变动（find -newer 为 0）
- observed: 复核时发现既有缺陷（与本 change 无关，v6-dev@d934b99 同样存在）：`status --json` 经管道输出超过 64KB 即被截断（agent-work 146KB → 65536 字节，JSON 解析失败），重定向到文件则完整；bin/apriori.js 在 console.log 之后立即 `process.exit(code)`。登记为 follow-up JP-1，本 change 不修
- observed: Review 第 1 轮（`review/code-review-v1.md`）= `VERDICT: 2 issues open`。发现 1：lastRecorded 沿用了 lastGate 的 DATED_RE，要求首行在时间戳后还有正文，正文写在续行上的条目（owner 读法照样认）被漏算。修：只读首个词，不再套 DATED_RE；lastGate 不变；测试加续行条目与裸时间戳。发现 2：遗留 hotfix 通道 bundle 的 `--change` 详情视图（在途与已归档）提前返回，列表与 JSON 有 unknown (no flow-state)，详情视图却没有。修：所有成功的详情路径都打印这一行；测试加两种遗留 bundle。delta 需求、ST-42 THEN 与 docs 两版同步
- observed: Review 第 2 轮（`review/code-review-v2.md`，resume 同一会话，消息按 §4 后续轮次范围写）= `VERDICT: no spec-vs-code gaps`；两条均 ADDRESSED；无新发现、无 advisory；评审方确认 LG-1、JP-1 独立于本交付

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>
- LG-1: follow-up → status-last-gate-order — `lastGate` / 「last decision:」取 gates 块文本上最后一条带日期的条目，并把 `note:` 条目也标为 decision；在真实语料 20 个在途 change 里有 4 个它不是最晚一条（2 个早数天）。本 change 不依赖它（lastRecorded 另算），也不改它的既有语义
- JP-1: follow-up → cli-json-pipe-flush — `apriori <cmd> --json` 经管道输出超过 64KB 时被截断：bin/apriori.js 在 console.log 之后立即 process.exit(code)，管道上的异步写未刷完；真实语料 agent-work 的 status --json 146KB 经管道只剩 65536 字节、解析失败；与本 change 无关，v6-dev@d934b99 同样存在

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write → 合回 v6-dev

gates:
  - 2026-09-27T06:52 note: change scaffolded by `apriori new`
  - 2026-09-27T06:52 note: Ground 完成；Specify 与测试已写（ST-41..43）
  - 2026-09-27T06:58 note: Build、真实语料复核完成；review-ready；开 Review 第 1 轮
  - 2026-09-27T07:02 note: Review 第 1 轮落盘（2 issues open）；已修；开第 2 轮
  - 2026-09-27T07:03 note: Review 第 2 轮接受；进入 gate / archive
