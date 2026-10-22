change: check-recipe-revision
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: claude-fable-5-1 subagent (resumed in place for later rounds)   # round 1 2026-10-23

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/check-recipe-revision`（从 v6-dev@c69174a 开出）；本地提交；评审接受后 squash、ff 合回 v6-dev，推 judge 与 GitHub，删分支，不打 tag
- observed: 来源——Claude × Astra 共识 `/root/asd-lab/work/astra-discuss/s1-s6/S16-CONSENSUS.md`（2026-10-23，四轮，DISAGREEMENTS 0）第二、三节；人类 2026-10-23 原话「批准;AI二期 QA 已经测试完毕了，构建的是 test 分支，我们没有旧后台页面前端的代码」
- observed: 现状——需求级核对配方只在「拆成多个 change」时适用、在「最后一个 change 归档后」做、只取已归档契约，缺回归/数据入口权限范围/并发事务三维（docs/operator.md:43）；剧本挂在核对配方末尾；concepts.md:180 称忠实度审查「快且便宜就够」；RUNBOOK §4 只说把 WHY 写进 Notes，没说 Notes 与前言不进主库（lib/archive-merge.js 丢弃）
- decision: approach — 只改文档、规格、测试：operator 中英（配方说明段与配方块，配方块中英一字不差）、剧本单列一段、原型指南 §9、concepts 中英一行、RUNBOOK §4 一句；P3 原文与哈希不动（RIB-10）；不加 CLI、gate、机器检查；新指南版本登记进 GUIDE_GENERATIONS，已有项目可凭字节收编
- observed: Build —— 先改文档再改测试；test/requirement-check-recipe.test.js 的 PR-67/68 断言改写，新增 PR-69（剧本独立成段、先跑可跑步骤并披露）、PR-70（RUNBOOK 句 + 合并确实丢 Notes 与前言、保留正文）、PR-71（concepts 不承诺评审档位）；把六份文档换回 v6-dev 时这 5 条全红；全套首跑 PW-02、UP-09 红（指南字节不在已发布版本表里），登记新哈希后 897/897；`check --self` PASS；verify --change GREEN（PR-67..71 全部 bound-green）；archive dry-run 无 DROPPED
- observed: Review 第 1 轮（`review/code-review-v1.md`，Fable 子 agent，自带 provenance）= `VERDICT: 2 issues open`：CR-1 中文版断言弱于 PR-67/69 场景（P3 覆盖面句、风险面非阈值、提交与基线、钉不住版本记缺口、剧本 kit/守卫/派生只在英文版断言；中文无旧触发的反向断言）；CR-2「有效契约」有歧义（已归档 delta 已在主库里，照字面会重复应用；没说主库取哪个时点、多 delta 的顺序）；advisory：concepts 里「向下审」的提醒、Notes 里的归因说法、缺 CHANGELOG、修复落回已收敛的在途 change 需新一轮评审（既有流程已覆盖）
- decision: CR-2 fixed — 统一定义为「以比较基线时点的规格库为底，把各 change 的 delta 按合并顺序应用上去（已归档的也算在内）」，英文说明、中文说明、共用配方块与 PR-67 规格同步；证据：PR-67 正则随之更新，换回 c57f54a 的文档时 PR-67 变红
- decision: CR-1 fixed — 中文版补 P3 覆盖面句、风险面非阈值、提交与基线、有效契约定义与缺口的断言，PR-69 中文补派生与 kit/守卫/一次性授权/先记后分类的断言，并加中文旧触发与旧剧本名的反向断言；证据：删掉中文版「不是经过验证的…阈值」时测试变红
- decision: advisory — Notes 里的归因改为不作归因的说法；补 CHANGELOG 条目；concepts 的「向下审」提醒按共识 S3 只改那一格的范围不动，留给 owner；在途修复需新一轮评审已由「照常修复和评审」覆盖，不改
- observed: Review 第 2 轮（`review/code-review-v2.md`）= `VERDICT: no spec-vs-code gaps`：CR-1、CR-2 ADDRESSED，无新发现；advisory「未归档 delta 的合并顺序可写成 or would merge」与 concepts 提醒都只涉及文档，按人类 10-23 口径不改

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write → 合回 v6-dev，推两远端

gates:
  - 2026-10-23T00:23 note: change scaffolded by `apriori new`
  - 2026-10-23T00:27 note: Ground → Specify → Build（897/897，verify GREEN）；phase 设为 review；评审方按人类 2026-10-20「不要用 codex 评审，用子agent就行」用不同档位的全新 Claude 子 agent
  - 2026-10-23T00:32 note: Review 第 1 轮 2 issues open（CR-1、CR-2）均已修复，advisory 已处置；续接同一评审子 agent 开第 2 轮
  - 2026-10-23T00:37 note: 人类 2026-10-23 原话「上面你列的这些东西都是文档之类的，不是关键的，在评审或者其他之类的可以忽略，文档可以更新，也可以滞后，一般而言都是一个版本稳定之后，可以发 release 之后才更新他们，他们描述的是代码的成果；另外，上面这些保留中文，没有问题，可以继续了」——所指为 README/VISION/docs/*（含中文版）；自第 2 轮起评审对这些文档上的问题只记 advisory，关键面为 RUNBOOK、guides/、lib/、测试与 specs
  - 2026-10-23T00:38 note: Review 第 2 轮接受（no spec-vs-code gaps）；进入 gate / archive
