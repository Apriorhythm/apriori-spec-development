change: discuss-save-fidelity
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a0d877-7f73-7b81-a5a3-1ea6388ca7fa   # codex exec, round 1 (2026-09-25)

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `v6-dev-s2`（主线，含 G/W/P3/apriori-discuss）；本地提交、不推送、不合入 v6-dev@46bb329（人类 09-25：apriori-discuss 一定要保留；下一阶段规划序 1 已获批开工）
- decision: requirement — `/root/asd-lab/work/astra-discuss/next-plan/NEXT-PLAN-CONSENSUS.md` 序 1（Claude × Astra 一致）：保存转换只允许四类内容，禁新增承诺/风险接受/需求/阻塞项，禁假设升格，语义幂等，不启动开发；层 2 验收 = 五类场景 × 2 次真实客户端运行（记录在仓库外）
- observed: 缺陷证据 —— `work/astra-discuss/s2-program/FC3Y-ADJUDICATION.md` §四「遗漏的保存质量边界」：B-opus-post-8 把决定记成「在…风险被明确指出后仍选择宽契约」（附加了所有者没说过的风险接受解释）；B-opus-post-9 新增阻塞项 OPEN-2（未讨论）
- observed: 现行文本 —— `templates/discuss.md`（薄壳，golden 同文，DS-01..13）、`RUNBOOK.md:263-267` §4 Discuss first、`:405-410` P6、`RUNBOOK_cn.md:254-257` / `:396-401`；三处只说「把结论写进 Reality Check / ## Open」，没有忠实性约束；`lib/managed.js:20` discuss 世代表一条
- observed: 存里没有 DS- 场景（discuss 测试为 orphan）；本 change 以 protocol 模块 ADDED 承载 DS-14/DS-15
- observed: Build 完成 —— 模板加「A save is a faithful record」段（薄壳仍不整段照搬 runbook）、golden 同步、世代表追加新摘要；RUNBOOK 双语 §4 加同义段、P6 加人称镜像句；test/discuss.test.js 新增 DS-14/DS-15

- observed: Review 第 1 轮（`review/code-review-v1.md`）= 1 issue open：DSF-01 DS-15 未逐条钉住护栏（尤其「未说过的理由/条件/风险接受」），P6 断言允许中间文本被删；ADV-03 幂等措辞统一为「nothing of substance」。修复：DS-15 改为按版本、按段逐条断言（§4 12 条 / P6 6 条，双语）；模板与 P6 加「reason/条件」、统一「of substance」

- observed: Review 第 2 轮（`review/code-review-v2.md`）= `VERDICT: no spec-vs-code gaps`；DSF-01 判 resolved

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- gate → archive --write → 本地提交 v6-dev-s2；随后层 2：导出 pkg-dsf、建 G-discuss-save-dsf 夹具、双号 10 次运行（work/benefit-stage1/pilot-s2/discuss_fidelity.py）

gates:
  - 2026-09-25T20:02 note: change scaffolded by `apriori new`
  - 2026-09-25T21:05 note: Review 第 1 轮落盘（code-review-v1，1 issue open）；DSF-01 与 ADV-03 已修；开第 2 轮
  - 2026-09-25T21:40 note: Review 第 2 轮接受；进入 gate / archive
