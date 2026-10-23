change: status-last-gate-order
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: n/a                     # the reviewer's resumable session id, the moment round 1 prints it

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/status-last-gate-order`（worktree，从 v6-dev@d44a0c2 开出）；本地提交；评审接受后 squash、ff 合回 v6-dev（在 cli-json-pipe-flush 之后），推 judge 与 GitHub，删分支，不打 tag
- observed: 来源——follow-up LG-1，登记于已归档 `apriori/changes/archive/2026-09-27T0704-status-last-recorded/`Open 区第 22 行）；人类 2026-10-23 原话「修 JP-1 和 LG-1，修完再升级公司电脑」
- observed: 现状——lib/flow.js parseFlowState 取 gates 块里文本上最后一条带日期的条目作 lastGate，note: 也算；status 以「last decision:」显示；ST-42 的规格与测试当时明写「textually last, unchanged」是为等本 change 而钉住的
- decision: approach — 新函数 lastDecision(entries)：只取 ownerEntry 能读的条目（分钟必填、范围检查、围栏/注释行不算），按规范化时间戳取最晚，同分钟取靠后那行，输出仍是去掉 bullet 的首行；无 owner 条目为 null（文本不打印该行，JSON 为 null）；lastRecorded 不动；JSON 键名与类型不变
- observed: Build —— 新 test/status-last-gate-order.test.js（ST-45 解析层六种日志、ST-46 文本/JSON/列表三面）实现前 2/2 红；flow-corpus 与 status-last-recorded 里钉旧语义的三处断言改为新语义；相关四个测试文件 28/28；cli 中英文 lastRecorded 段末句同步
- observed: Review 第 1 轮（`review/code-review-v1.md`，Opus 子 agent）= `VERDICT: no spec-vs-code gaps`，无实质发现；advisory：「last decision」与治理读法（按追加顺序判生效）是两种含义、续行形式只显示时间戳（契约所定）、归一化无测试、flow.js 过时注释与无用 DATED_RE、测试注释不符、ownerEntry 重复调用
- decision: advisory 处理 — 文档补一句「说的是最后记下的决定，不是哪条在生效；逐项状态看 open: 行」（中英）；ST-45 补 THHMM 与 THH:MM 混合夹具（契约 WHEN/THEN 同步）；删 flow.js 过时注释与无用 DATED_RE；改测试注释；续行形式与重复调用按契约/无害不改


## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write → 在 cli-json-pipe-flush 之后合回 v6-dev

gates:
  - 2026-10-23T12:20 note: change scaffolded by `apriori new`
  - 2026-10-23T12:22 note: Ground → Build（ST-45/46 红→绿）；LG-1 以本 change 的退出证据关闭（ST-45/ST-46）；phase 设为 review
  - 2026-10-23T12:27 note: Review 第 1 轮接受（no spec-vs-code gaps）；advisory 已处置（测试/注释/文档，无产品行为变化）；进入 gate / archive
  - 2026-10-23T12:30 note: 归档重做——上一次归档（2026-10-23T1227，仅在本地 worktree 的 squash 提交里，未合并未推送）的 flow-state 被生产方的编辑切坏：「来源」行里的「（## Open 第 22 行）」在插入评审记录时被当成 ## Open 标题定位，行被从中间切开，Reality Check 丢了三行（cli-json-pipe-flush 评审第 2 轮 B3 指出同一问题）。从归档前的提交 a086686 恢复全部代码改动与评审文档，修好记录（改写为「Open 区第 22 行」），重新 check/gate/archive；旧归档目录随被丢弃的提交 bf2693b 一起不再使用
