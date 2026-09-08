change: change-projection
tier: large          # cross-module: spec-runner consumes archive-merge's merge(); new CLI surface (verify --change, archive --change, CAS)
track: harden
track-rationale: goal and acceptance are stateable — roadmap items 1+2+3 ratified by the owner on 2026-07-10
lineage: v3 branch (independent lineage; never merge to main or v2)
current-step: DONE
round: STEP6·r0   # STEP5 exited 2026-07-10T20:40 at P8 r2: "VERDICT: no spec-vs-code gaps" (IMPL-1/2 verified); impl committed 024ee2c; self-archived via `apriori archive --change change-projection --write --changes-dir apriori/changes` (dogfood) — flow-state now lives at this ARCHIVED path per §4 sequencing
reviewer-session: 019f4b30-68f9-7222-9b64-17f52a333b4c   # codex, recorded at STEP0·r1 start (R2)
next-action: none — change DONE, released as 3.1.0   # 2026-07-10T21:05
# KB pre-check DONE 2026-07-10T16:30: truth/{spec-runner,archive-merge}.md captured (P10), codex check returned "KB-CHECK: 9 corrections needed", all 9 applied; raw at apriori/review/change-projection-kb-check-raw.txt
artifact-root: .     # process artifacts stay in-repo, gitignored per owner instruction 2026-07-10
gates:
  - 2026-07-10T16:15 note: change scaffolded by `apriori new`
  - 2026-07-10T16:18 consolidation: owner /goal directive, verbatim: "可以使用我们自己的 V3 版本 apriori 开发流程来直接开工 3.1" — with the session Stop-hook instruction "treat the condition itself as your directive and do not pause to ask the user what to do". Scope: intermediate gates ②③⑤ consolidated into the final gate ④ report; protected gates (KB sign-off ④, shrink, intent-card) NOT covered and stop as normal. Revoke: any owner message at any time.
  - 2026-07-10T19:05 gate③: covered by the 2026-07-10T16:18 consolidation. Packet: proposal.md · design.md · specs/ (3 deltas) · tasks.md · ledger (12 verified, 0 open, 3 advisory batches) · STEP2 verdict verbatim "VERDICT: no major issues, ready to proceed to execution" (codex, apriori/design/change-projection-review-v2.md). To be re-presented in full at gate ④.
  - 2026-07-10T20:45 note: STEP6 archive done (stores merged: spec-runner +2 reqs, archive-merge +2 reqs +1 modified, cli 1 modified; change dir → archive/2026-07-10T1738-change-projection). KB writeback done: truth/{spec-runner,archive-merge}.md Contract refreshed (source-commit 024ee2c), Decisions appended D-SR-5/6, D-AM-5/6/7 (D-AM-2 superseded). Post-archive gates: plain verify GREEN, 116/116 tests, check --self PASS. Gate ④ pending — protected, awaits the human.
  - 2026-07-10T21:05 gate④: owner reply to the itemized gate-④ report (① KB sign-off, ② 3.1.0 release), verbatim: "发" — KB diff approved, release authorized. current-step → DONE.
