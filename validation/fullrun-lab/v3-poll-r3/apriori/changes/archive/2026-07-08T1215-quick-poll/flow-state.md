change: quick-poll
tier: medium
track: harden
track-rationale: goal + acceptance clearly stateable after brainstorm (create/share/vote/close a single-question poll, file-backed, no login); approach chosen (方案1: Node stdlib HTTP + per-poll JSON). Single module, no cross-module boundary/migration/external service — sized Medium per §2 "start one tier lower". Concurrency-on-shared-file is the known surprise-generator: escalate to Large if concurrent-write design needs cross-cutting rework.
lineage: master (mainline) — greenfield repo, no merge taboo
current-step: DONE
round: 0
reviewer-session: 019f3f74-2857-7c12-a72d-77820c69b604
next-action: DONE. gate ④ approved (KB diff + req-final §8/D4 ratified). Finalizing: archive change dir + merge branch change/quick-poll -> master.   # 2026-07-08T10:40
# STEP5 DONE: P8 3 rounds -> VERDICT no spec-vs-code gaps; all GAP-1..5 verified; 50/50 node --test, verify GREEN 44, e2e 4/4.
# STEP6 work: committed impl 18ece846 (branch change/quick-poll); apriori archive --write merged 6 requirements (44 scenarios) into apriori/specs/quick-poll.md; verify(store) GREEN 44; KB apriori/truth/poll.md written (source-commit 18ece846, Contract + 8 Decisions).
# round-started STEP5·r3(P8) 2026-07-08T10:20 / round-ended STEP5·r3(P8) 2026-07-08T10:26
# NOTE: req-final §8 wording was refined in STEP5 (guarantee-claim precision, not a goal change) — MUST flag for human ratification at gate ④.
# STEP5 evidence r2 (post-fix): node --test 50 pass; apriori verify GREEN 44 (added CL-09, CC-05); e2e 4 pass; node --check clean.
# round-started STEP5·r1(P8) 2026-07-08T10:03 / round-ended STEP5·r1(P8) 2026-07-08T10:07
# round-started STEP5·r2(P8) 2026-07-08T10:12 / round-ended STEP5·r2(P8) 2026-07-08T10:18
# round-started STEP5·r3(P8) 2026-07-08T10:20
# STEP1 DONE: apriori/explore/quick-poll-gap-report.md; greenfield, all-new-build, no state-A conflicts.
# STEP2 DONE round 2: VERDICT no major issues, ready to proceed to execution; SPEC-1..6 all verified.
# round-started STEP2·r1 2026-07-08T09:33 / round-ended STEP2·r1 2026-07-08T09:43
# round-started STEP2·r2 2026-07-08T09:48 / round-ended STEP2·r2 2026-07-08T09:52
# STEP0 DONE round 3: VERDICT no major issues; req-final.md finalized; REQ-1..REQ-11 all verified.
# round-started STEP0·r1 2026-07-08T09:15 / round-ended STEP0·r1 2026-07-08T09:18
# round-started STEP0·r2 2026-07-08T09:20 / round-ended STEP0·r2 2026-07-08T09:24
# round-started STEP0·r3 2026-07-08T09:26 / round-ended STEP0·r3 2026-07-08T09:29
gates:
  - 2026-07-08T09:13 note: change scaffolded by `apriori new`
  - 2026-07-08T09:14 note: brainstorm exit approved by human ("go, 方案 1, 开始吧"); funnel -> STEP0 harden. Crystallized understanding carried into requirement/req-v1.md.
  - 2026-07-08T09:52 gate③-pending: STEP3 technical review packet assembled (proposal/design/spec/tasks/ledger); awaiting human decision.
  - 2026-07-08T09:57 gate③: APPROVED by human ("1,批准,进 STEP5"). No design changes requested -> STEP4 skipped.
  - 2026-07-08T09:57 consolidation: human authorized running through to gate ④ (KB sign-off), self-digesting STEP5's `apriori verify` + P8 consistency review without stopping. Scope: STEP5 routine completion only. Gate ④ (KB sign-off) is the stop point and is NOT covered (protected, §1). Revocable anytime by the human. A genuine blocker (step5-cap hit, a reopened closed ledger ID/oscillation = gate ⑤, lineage conflict, or a design-infeasible/requirement-wrong reversal) is a real escalation and will still be surfaced immediately.
  - 2026-07-08T10:34 gate④-pending: STEP6 store-merge + KB writeback done; committed 18ece846. Awaiting human KB-diff sign-off AND ratification of the req-final §8 guarantee-wording refinement (GAP-5, §4.8 scoping). Protected gate — not covered by the run-to-gate④ consolidation, which stops exactly here.
