change: scope-disposition
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a0d8ce-a062-7073-b070-8100b2404a58   # codex exec, round 1 (2026-09-26)

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `v6-dev-s2`（主线）；本地提交、不推送、不合入 v6-dev@46bb329
- decision: requirement — `work/astra-discuss/next-plan/NEXT-PLAN-CONSENSUS.md` 序 3（S6 范围判定最小协议）：处置写依据类别；必要修复判据一句；不因体量移出；改承诺走 owner；follow-up 登记稳定落点、移出 ≠ 关闭、不永久阻断；推荐写法非封闭词表；保留未解决状态；approach 不承载账本；**不加 C8 标记检查**
- decision: P3 模板不动 —— `test/review-input-boundary.test.js` RIB-10 按人类裁定（09-20「P3 默认输入措辞 → 不改」）逐字钉住两版 P3；本 change 曾拟在 P3 加一句「说明每条发现的依据」，撤回；处置是生产方的义务
- observed: 落点冲突 —— 现行 R5/C9 把任何未接受的 `## Open` 条目当阻断（cure 已写「move it to a new change」），与「follow-up 不因在 Open 而永久阻断」直接冲突；最小解法是给 `## Open` 一条精确语法 `- <ID>: follow-up → <新 change 名> — <内容>`，由同一状态判定当 note 报告（非 C8、非新闸门，语法不匹配即仍阻断）
- observed: 处置文本落点 —— `RUNBOOK.md` §4 Review & Deliver「Then one independent review」之后；`docs/cli.md` C9 段
- observed: Build 完成 —— readiness FOLLOW_UP_RE + note + cure 补 follow-up 形式；openSummary / archiveDeclaration 把 follow-up 计为 registered；status 标记与 JSON `followUp` 字段（既有钉形测试 OI-02/ST-04 加该字段）；RUNBOOK 双语 §4 处置条；docs/cli 双语；delta readiness RY-32/33、protocol PR-42；test/scope-disposition.test.js

- observed: Review 第 1 轮（`review/code-review-v1.md`，结论行经会话重发为词表形式）= 2 issues：SDP-01 落点名未经 validateChangeName（bad--name / archive / 日期前缀混过）；SDP-02 §5「只有未接受条目阻断」、条目分类句、docs/cli 157 与 store 需求均未区分 pending 与 follow-up。修：landing 须通过 validateChangeName 且 ≠ 本 change；§5 双语改准 + R1/R4 效力句；cli 157；readiness / gate / protocol 三个 MODIFIED 块各加一句（PR-18 措辞随之更新）；review-ready pending 排除 follow-up（ADV-02）；§4 加落点合法性与后续 change 承接方式（ADV-03）；RY-33 加 4 个坏落点、PR-44 新增

- observed: Review 第 2 轮（`review/code-review-v2.md`）= 2 issues：SDP-02 未闭合（readiness 第二条需求「the acceptance exit is closed…」仍说 open item 必阻断；cli_cn 159 未改）；SDP-11 自身名用原始正则读取，围栏/注释里的 `change:` 示例可骗过。修：第二个 readiness MODIFIED 块加豁免句；cli_cn 159；own 改由 flow.parseFlowState 读取；RY-33 加围栏/注释双向用例

- observed: Review 第 3 轮（`review/code-review-v3.md`）= `VERDICT: no spec-vs-code gaps`；SDP-02/SDP-11 判 resolved，第 3 轮进展记录判满足 R4；ADV-09（多行 HTML 注释用例）已顺手补上

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- gate → archive --write → 本地提交；随后层 2：假评审者双向场景 ×2 账号（work/benefit-stage1/pilot-s2/scope_gate.py）

gates:
  - 2026-09-25T21:33 note: change scaffolded by `apriori new`
  - 2026-09-26T01:20 note: Review 第 1 轮落盘（2 issues）；SDP-01/02 与 ADV-02/03 已修；开第 2 轮
  - 2026-09-26T02:00 note: Review 第 2 轮落盘（2 issues）；SDP-02/SDP-11 已修；开第 3 轮
  - 2026-09-26T02:05 note: review-progress code-review round 3 — issues: SDP-01, SDP-02, SDP-11, ADV-06, ADV-07; actions: SDP-01 reported resolved, unchanged; SDP-02 the readiness store requirement the acceptance exit is closed now carries the follow-up carve-out in a MODIFIED block with all scenarios retained, and docs/cli_cn.md's Open-item paragraph says a registered follow-up is a note; SDP-11 the change's own name is read once through flow.parseFlowState (fenced and commented examples inert) instead of a raw regex, with RY-33 covering both directions; ADV-06 and ADV-07 no action; evidence: lib/readiness.js, apriori/changes/scope-disposition/specs/readiness/spec.md, docs/cli_cn.md, test/scope-disposition.test.js, apriori/changes/scope-disposition/review/code-review-v2.md; approach: kept — the same minimal follow-up grammar and note semantics, hardened at the parser and completed in the contract
  - 2026-09-26T02:30 note: Review 第 3 轮接受；进入 gate / archive
