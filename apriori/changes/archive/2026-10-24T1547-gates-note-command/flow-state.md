change: gates-note-command
phase: review                            # ground | specify | build | review | done | abandoned
reviewer-session: n/a                     # the reviewer's resumable session id, the moment round 1 prints it

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/gates-note-command`（从 v6-dev@518b377 = 6.0.0 开出）；本地提交；评审接受后 squash、ff 合回 v6-dev，推 judge 与 GitHub，删分支，不打 tag、不发版
- observed: 来源——Claude × Astra 共识 `/root/asd-lab/work/astra-discuss/r1024/R1024-CONSENSUS.md`（2026-10-24，一轮，Astra 3 条分歧 Claude 全部接受）第一节 ③；人类同日「和 Astra 商量一下怎么做，你们统一意见直接开始」。证据：评估基线三次运行（change-email / recurring-work-items / custom-properties）的归档 flow-state 里，除 `apriori new` 写的第一条外，所有 gates 时间戳都是 agent 手填且与 attempt-state.json 的真实区间不符（例：custom-properties 写 17:10–18:45，实际 12:43–14:14 +08:00）
- observed: `lib/new.js` 已用 CLI 本地时钟写 `- <YYYY-MM-DDTHH:MM> note: change scaffolded by \`apriori new\``（flowStateSkeleton）；没有任何别的命令写 gates
- observed: `lib/flow.js` gatesEntries 以 `- ` 开头为一条、缩进续行并入上一条；stampInRange 只做范围检查；lastRecorded 注释明写「nothing here compares it with the clock」——时间戳无时区，故与时钟的比较只能是 advisory（Astra 分歧 1，已接受）
- observed: `lib/status.js` 的 change 视图已有 `last recorded:` 行与 `lastRecorded` json 字段、`review advisory:` 行与 `loop.advisories`；`gate` 的 C8 提示字符串在 `lib/review.js` progressLine / rulingLine；R4 与 §3 的 gates 语法句在 RUNBOOK.md 121/125/207-222 行；`docs/cli.md` 与 `docs/cli_cn.md` 每命令一节且 `apriori check` 核对中英标题对齐
- observed: `lib/resolve.js` resolveChange 已处理归档/符号链接/路径逃逸；`lib/args.js` withStrict 对未知 flag 退出 2
- observed: Build —— test/note.test.js 先红（9/9 fail：unknown command note），实现后 9/9 绿；全量 916/916；`apriori verify --change` 投影 GREEN（NT-01..06、ST-47/48、PR-73 各 1p/0f）；`--json` change 视图新增顶层 `advisories` 是**追加键**（先例 lastRecorded），三处形状冻结测试同步 +1（accept-r1 STATUS_VIEW_KEYS、accept-r2 STATUS_CHANGE_VIEW=28、json-contracts 类型表）；CHANGELOG 条目按 ID-06 的约束放在 `## 6.0.0` 下作 `### Unreleased since 6.0.0` 小节
- observed: Review 第 1 轮（`review/code-review-v1.md`，Opus 子 agent，R2 转录）= `VERDICT: 2 issues open`：GN-1 多行文本里以 `- ` 开头的续行被 gatesEntries 读成新条目（可造出 owner 决定；HTML 注释开标记会抹掉其后的日志）；GN-2 CRLF 文件被整体改成 LF，违背「只追加」；advisory A-1 列 0 条目的缩进回退、A-2 首行空白、A-3 以 `-` 开头的文本被当 flag、A-4 块末注释行后的落点
- decision: GN-1 fixed — 续行至少缩进 4 格；含 HTML 注释开/闭标记、续行开列表项或代码围栏的文本一律拒绝（exit 2，不改写，业主原话不被篡改）；NT-03 加 6 个对抗用例 + 纯函数断言（appendEntry 对伪造 owner 行返回 ok:false）
- decision: GN-2 fixed — 不再整体规范化换行：按原始行切分、保留每行末尾的 `\r`，新行用文件自己的 EOL，裸 CR 文件拒绝；NT-01 加 CRLF 用例（startsWith 原文、新行以 CRLF 结尾）
- decision: advisory — A-1 采纳（列 0 条目得列 0 新条目，NT-01 用例）；A-2 采纳（取首个非空行作条目头）；A-3 采纳（usage 写明文本不能以 `-` 开头）；A-4 采纳进契约文字（落在块的最后一个非空行之后）
- observed: Review 第 2 轮（`review/code-review-v2.md`，同一评审会话续接）= `VERDICT: 1 issues open`：GN-1、GN-2 ADDRESSED；新 GN-3 CRLF 且无末尾换行的文件被写出 `\r\r\n`，下一次 note 被自己的裸 CR 守卫拒绝；advisory A-5（`+ ` 也拒，比必要更严但无害）、A-6（拒绝注释标记时提示改写）
- decision: GN-3 fixed — 无末尾换行时只用文件自己的 EOL 闭合最后一行一次（补 CR 并压入空元素由 join 生成换行），不再事后追加 eol；NT-01 加 LF/CRLF 无末尾换行与 gates 不在文件末尾的用例（无裸 CR/双 CR、第二次 note 仍接受）
- decision: advisory — A-5 保持现状（契约文字「would open a list item」已覆盖）；A-6 采纳：拒绝信息里提示改写为箭头字符
- observed: Review 第 3 轮（`review/code-review-v3.md`，同一评审会话续接）= `VERDICT: no spec-vs-code gaps`：GN-3 ADDRESSED（11 种输入探测，无裸 CR/双 CR，第二次写入接受）；无新发现；advisory A-7 混合换行的文件取 CRLF（契约未定义，记录不改契约——评审已接受的契约文字不在接受后改动）
- observed: 收尾失误（15:4x）——第一次 `archive --write` 因 C8/R4「review-progress round 3 未覆盖 NT-03」判 NOT READY、未写入，但命令接在管道后退出码被吞，链条没停：change 以未归档状态被 squash 进 v6-dev（e516228）并推到两远端；补救：追加一条覆盖完整的 review-progress 记录（最后一条生效），重新 gate / archive，再提交推送。教训已记入 todo：带 `--write` 的命令不接管道
- decision: approach — 新子命令 `apriori note --change <name> [--owner] "<text>"` 只追加、用 CLI 时钟、不提供回填参数；`status --change` 对晚于本机时钟的时间戳打 advisory（文本 + json `advisories`），不进 stampInRange、不改 gate/archive；RUNBOOK §3 与 R4 改为「用 apriori note 追加」但保留条目语法原句；gate 提示加一行命令示例；cli.md 中英各加一节；P3 不动；旧归档不改

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write → squash 合回 v6-dev，推 judge 与 GitHub

gates:
  - 2026-10-24T15:23 note: change scaffolded by `apriori new`
  - 2026-10-24T15:24 note: Ground done（来源、现有代码落点、Astra 分歧 1 的结论已记入 Reality Check）；phase → specify
  - 2026-10-24T15:32 note: Specify done（specs/note NT-01..06、status ST-47..48、protocol PR-73）；Build done：test/note.test.js 红→绿，全量 916/916，verify 投影 GREEN，check PASS；phase → review。本条目由 apriori note 写入（首次 dogfood）
  - 2026-10-24T15:38 note: Review 第 1 轮 2 issues open（GN-1 条目注入、GN-2 CRLF 整体改写）已修复，A-1..A-4 采纳；全量测试与 verify 投影重跑；续接同一评审子 agent 开第 2 轮（R2 scoped to what changed）
  - 2026-10-24T15:43 note: Review 第 2 轮 1 issues open（GN-3 CRLF 无末尾换行）已修复，A-6 采纳；全量与 verify 重跑；续接同一评审会话开第 3 轮
  - 2026-10-24T15:44 note: Review 第 3 轮接受（no spec-vs-code gaps）；A-7 记录；进入 check / gate / archive
  - 2026-10-24T15:45 note: review-progress code-review round 3 — issues: GN-1, GN-2, GN-3, A-5, A-6; actions: GN-1 and GN-2 were ADDRESSED in round 2; GN-3 fixed in a216d09 (a file without a final newline is closed once with its own EOL, no bare or doubled CR, NT-01 cases added); A-5 kept as is; A-6 hint added; evidence: lib/note.js, test/note.test.js, apriori/changes/gates-note-command/review/code-review-v3.md; approach: kept — same writer, the fix only changes how the final newline is closed (this record is written after round 3 landed: the producer missed the rule before submitting the round; recorded as-is, not backdated)
  - 2026-10-24T15:46 note: review-progress code-review round 3 — issues: GN-1, GN-2, GN-3, NT-03, A-5, A-6; actions: GN-1 and GN-2 ADDRESSED in round 2 (NT-03 is the scenario GN-1's fix extended with six hazard cases, no further action); GN-3 fixed in a216d09; A-5 kept; A-6 hint added; evidence: lib/note.js, test/note.test.js, apriori/changes/gates-note-command/review/code-review-v3.md; approach: kept — same writer; this corrected record supersedes the one above, which missed NT-03 (recorded after round 3 landed, not backdated)
