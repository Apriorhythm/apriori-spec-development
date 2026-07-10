change: vote-dedup
tier: medium
track: harden
track-rationale: goal and acceptance are stateable roughly ("server rejects a repeat vote on the
    same poll, cookie-level, no login") — the only unknown is technical approach (which cookie/token
    scheme), which is design work, not goal uncertainty.
lineage: master (single-branch repo; no multi-lineage / merge-taboo documented)
current-step: DONE
round: STEP6·r1 (round-started 2026-07-09T03:50, round-ended 2026-07-09T04:30 — gate④ approved;
    archive: 3 ADDED requirements merged into apriori/specs/polls.md, change dir at its archive path;
    KB Contract reconciled to source-commit c7a16058063ec15e2c7d3f20918a388346bc3b69, Decisions
    DEC-1..DEC-5 appended; apriori verify GREEN against the living store) — CHANGE CLOSED
reviewer-session: 019f4501-a346-77c3-917e-74c11995c3d2 (codex, STEP5 P8 — closed)
next-action: none — change complete (KB writeback committed at gate④ approval)  # 2026-07-09T04:30
artifact-root: .
gates:
  - 2026-07-08T17:46 note: reverse-captured apriori/truth/polls.md (project had no KB docs); asked
    human to check it before it feeds req-v1 drafting (RUNBOOK §4 KB pre-check). Logged as `note` —
    the fixed vocabulary has no dedicated label for this legacy-project checkpoint.
  - 2026-07-09T02:20 gate③: "通过,进 STEP5。一路做到 gate④(KB 签核)再叫我,中间的 verify/P8 自己
    消化,评审前台跑给足超时" — STEP2 design package approved unchanged.
  - 2026-07-09T02:20 consolidation: same verbatim message as gate③ above — scope: intermediate gates
    between STEP3 and gate④ are consolidated into gate④ (verify/P8 loops run without stopping);
    gate④ (KB sign-off) itself is NOT covered (protected — the agent stops there); a cap hit or
    reopened ledger ID (gate⑤) is treated as OUTSIDE this authorization (the human said to self-digest
    verify/P8, not failures/escalations — on any cap hit or oscillation I stop and report). Revocable
    at any time by saying so.
  - 2026-07-08T17:53 note (KB pre-check answered): "说实话我也不熟,这代码我就没怎么看过,前同事也联系
    不上了。你写的这份我扫了一遍,没看出毛病,那些 needs human confirmation 的地方我也确认不了——就按
    你理解的来吧,继续" — KB accepted as working truth; DEC-0 uncertainties remain unconfirmed
    (no one available who can confirm them), noted as a standing caveat rather than resolved.
  - 2026-07-09T04:30 gate④: "批准,提交收尾置 DONE" — KB diff + spec-store merge approved; STEP6
    writeback committed, change closed. (The same message also requested a new small fix — POST
    body parsing 500→400 — handled as its own separate trivial-tier change, not part of this one.)
