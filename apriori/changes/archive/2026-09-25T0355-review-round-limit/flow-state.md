change: review-round-limit
phase: review                              # ground | specify | build | review | done | abandoned
reviewer-session: 01a0d4dd-dd62-7ad2-84de-db0156a42beb   # codex exec, round 1 (2026-09-25); rounds 2+ via `codex exec resume`

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `v6-dev-s2`（自 ac665ca 起）；本地提交、不推送、不合入 main/v6-dev；push 与 release 均未授权
- decision: requirement — `/root/asd-lab/work/astra-discuss/review-rounds/REQUIREMENT-review-round-limit.md`（Claude × Astra 两轮一致 + 人类 2026-09-25 确认「两点理解都是: 是」；默认 7 为人类容忍度）
- observed: `lib/review.js:389-390` 硬编码 `STOP_AFTER = 2`、`ESCALATE_AT = 5`；`escalatesNow` 与 `reviewLoop` 的 `f.round >= STOP_AFTER && verdict==='revise'` 分支实现第 2 轮停、第 5 轮升级；`REFRAME_EXITS` 不含 accept-risk（仅 ESCALATION_EXITS 含）
- observed: `reviewLoop(facts, flowText, stage)` 无 cwd；调用点 `lib/gate.js:66`（checkReviewLoop）、`lib/status.js:55`、`lib/readiness.js:621` 三处；`lib/config.js` 的 `getConfig(cwd,key)` 是唯一结构化配置读取入口，非法值以「消费时 problem」报告（id-pattern 先例：`resolveIdPattern`）
- observed: gates 条目解析 `lib/flow.js:187 gatesEntries`（`- <ts> owner: <payload>` 才有 payload；时间戳范围校验在 `ownerEntry`）；`HAS_REASON` 在 `lib/text.js:12`
- observed: 现行规则文本位置 —— RUNBOOK.md:82（R1 第 3 类停止）、:112（R3「no configured number…」）、:120-125（R4 两个控制点与 archive 语义）；RUNBOOK_cn.md:82/112/122-125；docs/operator.md:35-37；docs/concepts{,_cn}.md:252/308/400；docs/cli{,_cn}.md:111/171-173 与 §8.0（配置键列表）；CHANGELOG 6.0 段为历史，不改
- observed: 活规格里没有 RL-xx 场景（RL 测试未绑定 store 场景）；`archive-merge/spec.md:330`「--force overrides progress only」块与 AM-87 标题写有 round-2 / round-5 字样，须 MODIFIED；gate/config/protocol 三处以 ADDED 承载新场景
- observed: 引入历史 —— `acc61d6`（2026-08-23）加入两个控制点并删除 process-config 可配置上限（此前 default 5、floor 1）；实战 37 条评审线最多 4 轮、24% 第 2 轮未过、放开后全部收敛；实验批次 41% 运行卡于此
- observed: 基线测试 794 pass / 0 fail（`npm test`）；工作区干净
- observed: Build & Test 完成 —— 新增 test/review-round-limit.test.js（GT-50..56、CF-30..32、PR-40..41，先落红再实现）；lib/config.js `resolveReviewRoundLimit`；lib/review.js 取消 STOP_AFTER/ESCALATE_AT、新增 review-progress 记录解析与结构检查、reviewLoop(opts{limit,cwd})；gate/status/readiness 三处调用点传入限值；templates/process-config.md 新增行；RUNBOOK{,_cn} R1/R3/R4/§0 与 docs/operator,concepts,cli（双语）、CHANGELOG 同步；templates/command.md 与 golden 同步、TEMPLATE_GENERATIONS 追加
- observed: 既有多轮夹具按人类确认的迁移原则改造：以 `| review-round-limit | 5 |`（或 2）钉住旧语义、第 3 轮起补 review-progress 记录；旧措辞断言改为新文案；全量 806 pass / 0 fail
- observed: Review 第 1 轮（codex/gpt-6-astra，`review/code-review-v1.md`）= 10 issues open + 2 advisory：归档未消费进展记录失败（RRL-01）、自定义 changes 目录猜错项目根（02）、空/横线单元格静默默认（03）、evidence 路径未限界（04）、有序/`+` 列表项 ID 不计（05）、`transactions:` 冒充 `actions:` 且 approach 无理由可过（06）、派生文档仍教第 2 轮停（07）、runbook 承诺 `apriori check` 报 C8 等 CLI 未实现之事（08）、未答升级报 forceable:true（09）、resolver 错误缺键名/范围（10）；ADV-01 旧钉子未证明所有者停止、ADV-02 超长数字溢出为 Infinity
- observed: 第 1 轮全部修复 —— readiness 消费 `loop.progress`、`readinessOf({cwd})` 由 archive 传入项目根；`parseConfig` 记 blanks/conflictValues，resolver 自带键名+范围、拒 blank 与非安全整数；`PROGRESS_START` 强制时间戳+`note|owner`、`PART_RE` 只在部分边界识别、`APPROACH_RE` 要求理由、`OPENING_ID_RE` 加 `+`/有序项；`evidenceFileInside` 词法+realpath 限界；escalation blocker `forceable: !!reframe`，archive 对未答停止另打印 cure；docs/concepts,operator 双语与 RUNBOOK 双语措辞改为只承诺 CLI 所做（`gate`/`status`，引用只查项目内普通文件，续跑=提高上限或逐轮 reframe）；新增 GT-57..59、CF-33..35，PR-41 加旧措辞钉子，RL-21/23/24/35 钉 limit 2 并断言 stopped/acknowledged；812 pass / 0 fail

- observed: Review 第 2 轮（`review/code-review-v2.md`）= 6 issues open：RRL-03（blank 行并列有效行仍解析成功）、RRL-07（cli.md:65/69 与 RUNBOOK:295 Specify 退出仍写第 5 轮/第 2 轮）、RRL-08（R1 第 3 类仍要求提高上限；R4 说「每一轮」都停而代码放行 accept）、RRL-10（范围后缀可被 200 字符截断）、RRL-20（进展记录时间戳只查形状）、RRL-21（status 未输出有效上限与进展诊断）；RRL-01/02/04/05/06/09 与 ADV-01/02 判 resolved；ADV-03 文档钉子过拟合字面
- observed: 第 2 轮修复 —— `flow.stampInRange` 抽出并供 `ownerEntry` 与 `progressRecords` 共用；resolver 对 blank 行无条件报错、消息 `<key>: <body> — must be <range>` 的截断只落在 body；status 文本/JSON 增 `review.limit` 与 `review.progress`（新增 status delta ST-40）；cli{,_cn}.md:65/69、RUNBOOK{,_cn} R1 第 3 类/R4/Specify 退出改写；GT-58 加越界时间戳、CF-33 加并列两序、CF-35 加长冲突、PR-41 加通配否定与正向断言

- observed: Review 第 3 轮（`review/code-review-v3.md`）= 1 issue open：RRL-08 残留 —— docs/cli{,_cn}.md:171 与 docs/operator{,_cn}.md:37 仍写「续跑须提高上限」；其余 5 项与 ADV-03 判 resolved，第 3 轮进展记录判满足结构契约。修复：四处改为「提高上限或逐轮 reframe；accept 继续；escalate 不论上限」，PR-41 加对应否定/正向钉子

- observed: Review 第 4 轮（`review/code-review-v4.md`）= `VERDICT: no spec-vs-code gaps`；RRL-08 判 resolved，第 4 轮进展记录判满足结构契约，无新发现。code-review 族共 4 轮（10 → 6 → 1 → 0），全程在默认上限 7 之内，无 owner 停止

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- gate → archive --write → 本地提交到 v6-dev-s2（不推送、不合入）

gates:
  - 2026-09-25T02:22 note: change scaffolded by `apriori new`
  - 2026-09-25T03:40 note: Specify 完成（4 个 delta spec，projected verify 12 新场景 BOUND-RED）；Build & Test 完成（806/806 绿）
  - 2026-09-25T10:40 note: Review 第 1 轮落盘（code-review-v1，10 issues open）；RRL-01..10 与 ADV-01..02 全部修复，规格补 GT-57..59 / CF-33..35，812/812 绿；开第 2 轮（codex exec resume）
  - 2026-09-25T11:30 note: review-progress code-review round 3 — issues: RRL-01, RRL-02, RRL-03, RRL-04, RRL-05, RRL-06, RRL-07, RRL-08, RRL-09, RRL-10, RRL-20, RRL-21, ADV-01, ADV-02, ADV-03; actions: RRL-03 blank row fails beside a numbered row (either order); RRL-07 cli.md:65/69 (+cn) and RUNBOOK:295 Specify exit (+cn) reworded to the limit; RRL-08 R1 item 3 and R4 line 129 (+cn) say revise re-stops, accept proceeds, escalate independent; RRL-10 resolver spends the 200-char cap on the body only, conflicts bounded to 3 cells; RRL-20 flow.stampInRange shared by ownerEntry and progressRecords; RRL-21 status text/JSON carry review.limit and review.progress (status delta ST-40); ADV-03 PR-41 gains wildcard negatives and positive limit assertions; RRL-01/02/04/05/06/09, ADV-01/02 reported resolved, unchanged; evidence: lib/flow.js, lib/review.js, lib/config.js, lib/status.js, docs/cli.md, docs/cli_cn.md, RUNBOOK.md, RUNBOOK_cn.md, apriori/changes/review-round-limit/specs/status/spec.md, apriori/changes/review-round-limit/specs/config/spec.md, apriori/changes/review-round-limit/specs/gate/spec.md, test/review-round-limit.test.js; approach: kept — same design (one human-held limit, structural C8 record check), hardening the parsers and making the docs promise only what the CLI enforces
  - 2026-09-25T12:20 note: review-progress code-review round 4 — issues: RRL-03, RRL-07, RRL-08, RRL-10, RRL-20, RRL-21, ADV-03; actions: RRL-08 docs/cli.md:171 and docs/cli_cn.md:171 C8 paragraph, docs/operator.md:37 and docs/operator_cn.md:37 stop item 3 rewritten (raise the row OR one reframe per further revise round; accept proceeds; escalate independent of the limit), PR-41 asserts the absence of the must-raise wording and the presence of the alternative in all six files; RRL-03/07/10/20/21 and ADV-03 reported resolved, unchanged; evidence: docs/cli.md, docs/cli_cn.md, docs/operator.md, docs/operator_cn.md, test/review-round-limit.test.js; approach: kept — wording-only follow-up, the rule and the code are unchanged
  - 2026-09-25T12:50 note: Review 第 4 轮接受（no spec-vs-code gaps）；进入 gate / archive
