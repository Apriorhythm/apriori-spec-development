change: review-round-scope
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: 01a0dfe3-2459-7460-84f4-cd9b22cd48e2   # codex exec, round 1 (2026-09-27)

## Reality Check         # observed / decision / assumption — one line each, as you find them
- decision: lineage — branch `feature/review-round-scope`（从 v6-dev 开出，A、B 合回后变基）；本地提交；评审通过后合回 v6-dev 并推 judge 与 GitHub；不进 release/v6 / preview 快照
- decision: requirement — 人类 09-27 /goal 第 2 条 C 项 + `work/astra-discuss/next-improve/NI-CONSENSUS.md` §一 C（Claude × Astra）：第 2 轮起判上一轮每条未决发现 ADDRESSED/NOT，审修复 diff 及其影响链（不按修改行裁剪）；diff 外违反当前契约或安全约束的仍计入；其余 advisory 不扩循环；「纯措辞」须确实不改契约、不误导执行，位置不决定 advisory
- decision: 边界 — P3 块由 test/review-input-boundary.test.js RIB-10 按人类 09-20 裁定逐字钉住，**不改**；条款落在 §4 Review & Deliver 新增一条 + R2 的 resume 括注指向它；不改 R4 轮次上限与停点、不改 verdict 词表
- observed: RUNBOOK.md L110 R2 只规定「rounds 2+: codex exec resume …」机制，未规定续轮范围；§4 Review & Deliver 规定默认四样输入与「不把前轮结论转包给下一轮」，未规定第 2 轮起判什么；P3 [Scope] 为「Only the above count toward the verdict」
- observed: 真实语料（work/diag-0926/B-review-loop.md:166）——5 个多轮样本 r3 及以后 13 条发现：文档措辞 9、重复上一轮 2（crm2 CYC-08、mcp-auto-update SPEC-016）、新契约缺口 1（SPEC-021）、其他 1
- observed: Build 完成 —— RUNBOOK 两版 §4 Review & Deliver 新增一条「后续轮次只审改了什么」（置于「Then one independent review」之后、「Disposition of findings」之前）；R2 的 rounds 2+ 括注指向它；P3 块字节不变（RIB-10）；变基到 v6-dev@059fafe（B 改了相邻的处置条，冲突按「保留 B 的处置条、C 条插在其前」解决）后重打 CAS 戳；全套 850/850；check --self PASS；verify --change GREEN
- observed: 层 2 限定行为 6 次（codex gpt-6-astra 评审者，read-only，新会话；P3 逐字 + 按新条款写的第 2 轮消息；/srv/benefit/rr）：regress 2/2 计入 diff 外调用方回归（shout 被默认导出打坏）→ `1 issues open`；latecontract 2/2 把 diff 外违反当前契约 GT-03 的旧代码计入并写明理由 → `1 issues open`；wording 2/2 只剩措辞 → `no spec-vs-code gaps`、措辞记 advisory；上一轮 F1 6/6 判 ADDRESSED。局限：真实第 2 轮是 resume 同一会话，这里用新会话 + 第 1 轮文档代替；夹具 PATH 上的 apriori 是旧版（无 gate），评审者如实记为工具限制；详见 /root/asd-lab/work/next-improve-0927/C-报告.md
- observed: Review 第 1 轮（`review/code-review-v1.md`）= `VERDICT: 2 issues open`。RRS-01：新条只挂在 resume 消息上，R2 的无 Codex 路径（新开 claude 会话）与调用恢复失败后的新开会话没有着落，若为补救把上一轮评审塞给新会话又违反相邻的输入边界。修：两版新条尾加一句——范围依托被 resume 的评审会话；新开会话只拿默认输入、像第 1 轮那样审整个 change，上一轮结论不转包给它；delta 需求与 PR-59 THEN 同步。RRS-02：PR-59 只校验了英文版次序、中文版全文搜索即可通过、也没钉紧邻。修：测试按版本定位 Review & Deliver 节，断言新条正是「独立评审」条的下一条、「发现的处置」条的上一条，且全文只一条；两版各一个测试
- observed: Review 第 2 轮（`review/code-review-v2.md`，resume 同一会话，消息按新 §4 条写）= `VERDICT: no spec-vs-code gaps`；RRS-01、RRS-02 均判 ADDRESSED；无新发现、无 advisory

## Open                  # substantive unresolved items — one line each, stable id first: - <ID>: <text>

## Next                  # at most three concrete actions; the first is the resume point
- check → gate → archive --write → 合回 v6-dev

gates:
  - 2026-09-27T06:47 note: Review 第 2 轮接受；进入 gate / archive
  - 2026-09-27T06:46 note: Review 第 1 轮落盘（2 issues open：RRS-01/02）；已修；开第 2 轮
  - 2026-09-27T06:41 note: 变基、Build 与层 2 完成；review-ready；开 Review 第 1 轮
  - 2026-09-27T06:13 note: Ground 完成；Specify 与测试已写（PR-59/60 基线红、改后绿）
  - 2026-09-27T06:13 note: change scaffolded by `apriori new`
