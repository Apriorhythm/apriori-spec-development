change: doctor-command
tier: medium         # one new module lib/doctor.js + cli dispatch; new user-visible behavior; read-only except the declared TAP probe
track: harden
track-rationale: goal and acceptance stateable — roadmap item 4, owner ordered "先5后4" on 2026-07-10 (item 5 gate-command completed first, per that order)
lineage: v3 branch (independent lineage; never merge to main or v2)
current-step: DONE
round: STEP6·r0   # STEP5 exited 02:50 at P8 r3: "VERDICT: no spec-vs-code gaps" (DIMPL-1 verified after two fix rounds); impl committed 4c73156; self-archived via archive --change; post-archive: plain verify GREEN, 142/142, check PASS
reviewer-session: 019f4b30-68f9-7222-9b64-17f52a333b4c   # codex (same resumable session)
next-action: none — change DONE, released in 3.2.0   # 2026-07-11T03:05
# KB pre-check DONE 00:30: truth/{init,update,check}.md captured (P10), codex "KB-CHECK: 5 corrections needed", all 5 applied; raw: apriori/review/doctor-command-kb-check-raw.txt. spec-runner/status/gate/archive-merge truth already fresh.
artifact-root: .
gates:
  - 2026-07-11T00:23 note: change scaffolded by `apriori new`
  - 2026-07-11T00:30 note: owner directive verbatim: "先5后4" (2026-07-10) — this is the "4". Medium tier: no mandatory intermediate human gates; stops at gate ④ as normal.
  - 2026-07-11T01:55 note: STEP3 (Medium async look-over) — packet: proposal/design/specs/tasks + ledger (11 verified 0 open, 3 advisory batches) + STEP2 verdict verbatim "VERDICT: no major issues, ready to proceed to execution" (codex, apriori/design/doctor-command-review-v3.md). Full packet re-presented at gate ④.
  - 2026-07-11T02:55 note: STEP6 archive done (stores: doctor/spec.md created DR-01..12; cli block modified CL-10). KB writeback: truth/doctor.md captured (source-commit 4c73156, D-DR-1..4). Gate ④ pending — protected, awaits the human.
  - 2026-07-11T03:05 gate④: owner reply to the itemized report, verbatim: "你决定" — explicit proxy after itemized presentation; agent decision under that proxy: KB diff APPROVED (truth/doctor.md new D-DR-1..4 + truth/{init,update,check}.md; KB-CHECKed, ledger 13 verified 0 open). current-step → DONE.
