change: archive-drop-guard
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a0d8b4-a8b1-71e0-b030-78ae80d44ab4   # codex exec, round 1 (2026-09-25)

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `v6-dev-s2`（主线）；本地提交、不推送、不合入 v6-dev@46bb329
- decision: requirement — `work/astra-discuss/next-plan/NEXT-PLAN-CONSENSUS.md` 序 2（S4 归档防丢旧场景）：dropped 非空默认拒绝、零写入；放行 = owner `archive-drop <target> sha256:<归档输入指纹>` + `--force`；指纹 = 目标 + 各 store/delta 摘要 + 排序删除清单；改标题不算删；ambiguous 先消歧、不可 force；missingLines 只报告（S4 剩余缺口）；单文件入口一致护栏；不加比例配置键。完成后只称「场景丢失护栏完成」
- observed: 现状 —— `lib/archive-merge.js:548-760` 完整性引擎（compareModifiedBlock：retained/titleChanged/dropped/added/ambiguous/missingLines），`pushIntegritySection` 在 readiness 之后、写入之前只打印（AM-46 明写「不改变结果」）；`buildProjection` 只返回 modifiedBlocks，不带原始 store/delta 文本；单文件入口无完整性报告；owner 条目解析在 `lib/readiness.js`（gatesEntriesRaw + ownerPayload，forceGrant 样式）
- observed: 既有夹具 AM-05（archive-merge.test）与 AM-46/AM-47（modified-integrity.test）的 MODIFIED 替换本身就丢场景，须按新语义改写；delta 侧重复 ID 早被结构预检拦下，ambiguous 的可达用例是 store 侧重复
- observed: Build 完成 —— readiness `dropGrant/dropLine` + readinessOf 返回 flowText（同一快照）；archive-merge `integrityEntries/dropManifest/dropGuard/oldBlocksWithScenarios`，buildProjection 返回 `sources`；高层与单文件两处护栏；AM-123..126 新测试；AM-05/46/47 改写；docs/cli 双语、RUNBOOK 双语归档条目一句、CHANGELOG

- observed: Review 第 1 轮（`review/code-review-v1.md`）= 3 issues：ADG-01 manifest 字段未编码且整体做了 CR/LF 归一化（路径含 CR/LF 可复用授权）；ADG-02 空 store 与不存在的 store 同记为 new；ADG-03 AM-47 改写与结构预检顺序矛盾。修：字段 JSON 编码 + manifest 原始字节哈希、内容摘要仍归一化；sources 记 storeExists；AM-47/新需求措辞按「预检先拒、盲区只在完整性阶段」改准；新增 AM-127；AM-123 加零暂存断言、AM-124 加授权不绕过 R5

- observed: Review 第 2 轮（`review/code-review-v2.md`）= 1 issue：ADG-03 AM-47 仍含 store 继承的旧说法（缺工厂 warning+skip、不 require spec-runner、非法 pattern 打 warning）；改写为实际行为（默认工厂惰性组合、预检拒绝非法 pattern、完整性阶段的 batch 失败才 warning，且有旧场景即拒绝）。ADV-05 测试改为两条匹配 + 一条不匹配，断言最后一条匹配生效

- observed: Review 第 3 轮（`review/code-review-v3.md`）= `VERDICT: no spec-vs-code gaps`；ADG-03/ADV-05 判 resolved；ADV-07（pushIntegritySection 注释过时）已顺手改正

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- gate → archive --write → 本地提交 v6-dev-s2

gates:
  - 2026-09-25T21:06 note: change scaffolded by `apriori new`
  - 2026-09-25T23:20 note: Review 第 1 轮落盘（3 issues），ADG-01..03 与 ADV-02/04 已修；开第 2 轮
  - 2026-09-25T23:50 note: Review 第 2 轮落盘（1 issue）；ADG-03 与 ADV-05 已修；开第 3 轮（第 3 轮前 review-progress 见下）
  - 2026-09-25T23:55 note: review-progress code-review round 3 — issues: ADG-01, ADG-02, ADG-03, ADV-05, ADV-06; actions: ADG-01 and ADG-02 reported resolved in round 2, unchanged; ADG-03 the AM-47 scenario in the delta rewritten to the implemented channel behaviour (default factory composed lazily from lib/config + spec-runner, structural preflight refuses an unbindable id or an uncompilable row with no warning-and-skip, an integrity-stage batch failure prints one sanitized warning and since archive-drop-guard refuses when a MODIFIED old block carries a scenario); ADV-05 the last-decision test now records two matching decisions and a later non-matching one and asserts the second matching entry is the one printed; ADV-06 no action needed; evidence: apriori/changes/archive-drop-guard/specs/archive-merge/spec.md, test/archive-drop-guard.test.js, lib/archive-merge.js, apriori/changes/archive-drop-guard/review/code-review-v2.md; approach: kept — same guard design (fingerprint-bound double action), only the inherited scenario wording and one test strengthened
  - 2026-09-26T00:10 note: Review 第 3 轮接受；进入 gate / archive
