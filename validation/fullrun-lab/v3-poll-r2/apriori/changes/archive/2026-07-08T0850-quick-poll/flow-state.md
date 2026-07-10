change: quick-poll
tier: large
track: harden
track-rationale: 目标与验收可陈述（建投票→分享→匿名投票→看结果→关闭），仅技术路径需设计；harden。
lineage: master (mainline; greenfield 空仓，无 merge 禁忌)
current-step: DONE
round: 0
reviewer-session: 019f3f30-7ade-71d1-9eed-bcf6931122ca   # STEP5 P8 codex thread (STEP2 P5=019f3f1c-...; STEP0 P1=019f3f0c-...)
next-action: n/a — change DONE
gates:
  - 2026-07-08T08:05 note: change scaffolded by `apriori new`
  - 2026-07-08T08:12 note: brainstorm 退出经人类批准（"开始吧"）；tier=large（外部共享状态触发线，§2），track=harden
  # ISO 时间为分钟精度；缺失时长记 n/a，不估算
  - 2026-07-08T08:20 note: STEP0·r1 codex P1 verdict = "VERDICT: 9 issues open"（原文）；实际 formal open = 8（REQ-1..8），REQ-9 为 advisory batch，被评审误计入 N——按 P0 规范化为 advisory-acked，不计入 formal 计数。
  - 2026-07-08T08:30 note: STEP0·r2 codex P1 verdict = "VERDICT: 3 issues open"；REQ-2..8 verified，REQ-1 reopen + 新增 REQ-9/REQ-10；已修订 req-v3。
  - 2026-07-08T08:38 note: STEP0 收敛于 r3 "VERDICT: no major issues"（3 轮，cap=5 未触顶，无 gate①）；req-final 落盘；REQ-1..10 verified。
  - 2026-07-08T08:44 note: STEP1 explore 完成——greenfield 无 KB pre-check，gap report 落盘（apriori/explore/quick-poll-gap-report.md），顶层风险 R-A 单进程并发前提。
  - 2026-07-08T09:00 gate②: 人类 skim gap report 通过——"单进程部署这个前提我接受,就是给内网一台机器用,不会搞多实例。放行进 STEP2,把这前提和那三个对抗测试锁进设计"。放行 STEP2。
  - 2026-07-08T09:12 note: STEP2·r1 P5 评审 session 019f3f1c-1a41-7553-acde-5da7c5d889ef 被本地 2min 工具超时中断（非 provider 故障），verdict 未落。按 R2 resume 同一 session 续跑，不代填。
  - 2026-07-08T09:30 note: STEP2·r1 P5 verdict = "VERDICT: 1 issues open"（SPEC-1 stored XSS，security 不可 advisory）；已 P6 修订 spec+design+tasks 增补 PC-15 输出编码。
  - 2026-07-08T09:44 note: STEP2·r2 P5 verdict = "VERDICT: 1 issues open"（SPEC-1 reopen：jsonForScript 映射写成原字符）；已 P6 改为明确 \uXXXX 转义 + PC-15 断言无裸 </script。
  - 2026-07-08T09:55 note: STEP2 收敛于 r3 "VERDICT: no major issues, ready to proceed to execution"（3 轮，cap=4 未触顶）；SPEC-1(XSS) verified；ledger 0 open。
  - 2026-07-08T10:05 gate③: 人类技术评审通过——"A,通过。继续"。DESIGN-REVIEW-DOC=apriori/design/quick-poll-step3-packet.md（无改动）。STEP4 跳过（STEP3 未改动设计）。进入 STEP5。
  - 2026-07-08T10:40 note: STEP5 实现完成——npm test 16/16 green，apriori verify GREEN(15 BOUND-GREEN)，Playwright E2E PASS(6/6)，tasks 全 [x]。修了 2 个 bug(origin/E2E 正则)。待 P8。
  - 2026-07-08T10:47 note: STEP5 P8 session 019f3f30-7ade-71d1-9eed-bcf6931122ca 读完 spec/design/tests 后被 provider websocket 404 中断，verdict 未落。按 R2 resume 同一 session 续跑。
  - 2026-07-08T11:00 note: STEP5 收尾——P8 "VERDICT: no spec-vs-code gaps"（0 formal，1 advisory batch，采纳 2 项）；17 测试绿，verify GREEN。进入 STEP6。
  - 2026-07-08T11:10 note: STEP6——commit ddb3b49；apriori archive --write 合并 7 requirements/15 scenarios 进 apriori/specs/poll.md，change dir 归档到 changes/archive/2026-07-08T0850-quick-poll；apriori check PASS，verify GREEN(store)。
  - 2026-07-08T11:12 note: KB writeback——新建 apriori/truth/poll.md：Contract(code-is-truth, source-commit ddb3b49) + Decisions(D1..D6)。停在 gate ④。
  - 2026-07-08T11:20 gate④: 人类批准 KB diff——"批准"。current-step=DONE。quick-poll 全流程收官。
