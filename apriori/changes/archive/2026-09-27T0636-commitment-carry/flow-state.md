change: commitment-carry
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a0dfd9-241b-7a73-ac57-7942d22e3a1d   # codex exec, round 1 (2026-09-27)

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/commitment-carry`（从 v6-dev 开出，A=source-intake 合回后变基）；本地提交；评审通过后合回 v6-dev 并推 judge 与 GitHub；不进 release/v6 / preview 快照
- decision: requirement — 人类 09-27 /goal 第 2 条 B 项 + `work/astra-discuss/next-improve/NI-CONSENSUS.md` §一 B（Claude × Astra）：Split first / P2 / §5 各一句——交付依赖的承诺保留 pending + 承接指针、不复制 follow-up；独立诉求才 follow-up；接手端保留来源 ID、据退出证据关闭，不因接手/归档/改名自动关闭；不新增语法
- decision: 边界 — 只加句、改句；不改 R1 停点、owner 授权语义、归档放行（C9/R5 谓词不变，承接项是普通 pending 条目）；P3 不动（RIB-10）
- observed: RUNBOOK.md §4 Specify「Split first」只要求把拆分判定记为 decision，未规定拆分交出去的承诺落在哪；P2 Split first 同；§4 处置段 follow-up 的接手端写法是「其 Reality Check 以 `observed:` 行带上原 id 与原文」（scope-disposition 84b6e83），接手后不阻断
- observed: lib/readiness.js:234 FOLLOW_UP_RE 只认以 `follow-up →` 开头的行；不带该前缀的 `- <ID>: <text> — carried by <change>` 按普通 pending 由 C9/R5 阻断；**但在 follow-up 行尾追加 carried by 仍被认作 follow-up**（评审 CC-01，test/commitment-carry.test.js 用 checkEvidenceStatus 实测两者）
- observed: 真实语料（work/diag-0926/D-59-split.md:178-179,241）——纪要 §23 交给 C8 的 7 项在 C8 归档时未兑现、无门拦下，C9/C10 事后补切；C4→C5 ONW-04（D-59:166）是下游需要改上游已接受契约，走 MODIFIED delta（既有文法），本 change 只让「交出去的承诺」可追，不直接解决上游契约先行定错
- observed: Build 完成 —— RUNBOOK 两版 Split first / P2 / §4 落点句 / §5 各一句；scope-disposition PR-44 断言随落点句更新；变基到 v6-dev@0bb1d2d 后重打 CAS 戳；全套 848/848；check --self PASS；verify --change GREEN
- observed: 层 2 限定行为 5 次（HM，候选包 b1dcdb6，/srv/benefit/cc）全部 DONE、0 回复、src/test 不动：split 3/3 依赖项 pending「carried by greet-trim」、独立诉求 follow-up、无重复 id；receive 2/2 原 id pending + 来源 observed、未当作关闭、归档 bundle 未改；详见 /root/asd-lab/work/next-improve-0927/B-报告.md
- observed: Review 第 1 轮（`review/code-review-v1.md`）= `VERDICT: gaps found`，1 条：CC-01 承接行模板未排除 follow-up 前缀，`follow-up → x — … — carried by x` 仍被 FOLLOW_UP_RE 认作 follow-up、不阻断。修：Split first 两版加一句「承接行绝不保留 follow-up 前缀；只追加指针仍是 follow-up」；delta 需求与 PR-57 THEN 同步；测试加该混合形式的 C9 实测（仍 pass）以钉住规则所依赖的机器事实
- observed: Review 第 2 轮（`review/code-review-v2.md`）= `VERDICT: no spec-vs-code gaps`；CC-01 判 ADDRESSED；无新发现、无 advisory

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write → 合回 v6-dev

gates:
  - 2026-09-27T06:35 note: Review 第 2 轮接受；进入 gate / archive
  - 2026-09-27T06:34 note: Review 第 1 轮落盘（gaps found：CC-01）；已修；开第 2 轮
  - 2026-09-27T06:31 note: 变基、Build 与层 2 完成；review-ready；开 Review 第 1 轮
  - 2026-09-27T06:10 note: Ground 完成；Specify 与测试已写（PR-57/58 基线红、改后绿）
  - 2026-09-27T06:10 note: change scaffolded by `apriori new`
