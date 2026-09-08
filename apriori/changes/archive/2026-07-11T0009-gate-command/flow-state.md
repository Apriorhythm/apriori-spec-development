change: gate-command
tier: medium         # one new module lib/gate.js + cli dispatch; new user-visible behavior; consumes (never mutates) existing artifacts
track: harden
track-rationale: goal and acceptance stateable — roadmap item 5, owner ordered "先5后4" on 2026-07-10
lineage: v3 branch (independent lineage; never merge to main or v2)
current-step: DONE
round: STEP6·r0   # STEP5 exited 01:20 at P8 r2: "VERDICT: no spec-vs-code gaps" (GIMPL-1 verified); impl committed 363bc79; self-archived via archive --change; post-archive: plain verify GREEN, 129/129, check PASS, and gate --change gate-command = "GATE: PASS" on the ARCHIVED stage (dogfood of both stages)
reviewer-session: 019f4b30-68f9-7222-9b64-17f52a333b4c   # codex (same resumable session as change-projection)
next-action: none — change DONE, released in 3.2.0   # 2026-07-11T03:05
# KB pre-check DONE 23:12: spec-runner/archive-merge truth fresh (lib untouched since 024ee2c); status.md captured (P10) + codex "KB-CHECK: accurate" (raw: apriori/review/gate-command-kb-check-raw.txt)
# PROTOCOL FINDING 23:20: shared requirement/ path collided across sequential changes — gate-command's req-v1 overwrote change-projection's (v2/v3/final preserved, moved into the archived change dir). Live evidence for roadmap item 13 (Change Bundle).
artifact-root: .     # process artifacts in-repo, gitignored per owner instruction 2026-07-10
gates:
  - 2026-07-10T23:09 note: change scaffolded by `apriori new`
  - 2026-07-10T23:10 note: owner directive verbatim: "先5后4" — authorizes executing roadmap item 5 (this change) then item 4 (doctor). Medium tier: no mandatory intermediate human gates (gate ② is Large-only, STEP3 is an async look-over, gate ⑤ only on cap hit); the change stops at gate ④ as normal.
  - 2026-07-11T00:20 note: STEP3 (Medium async look-over) — packet: proposal/design/specs/tasks + ledger (10 verified 0 open) + STEP2 verdict verbatim "VERDICT: no major issues, ready to proceed to execution" (codex, apriori/design/gate-command-review-v2.md). Outside decision record = the heterogeneous review; full packet re-presented at gate ④.
  - 2026-07-11T01:25 note: STEP6 archive done (stores: gate/spec.md created GT-01..12; cli block modified CL-09). KB writeback: truth/gate.md captured (source-commit 363bc79, D-GT-1/2/3), truth/status.md D-ST-1 refreshed. Gate ④ pending — protected, awaits the human.
  - 2026-07-11T03:05 gate④: owner reply to the itemized report (① gate-command KB sign-off ② doctor-command KB sign-off ③ 3.2.0 release), verbatim: "你决定" — explicit proxy after itemized presentation; agent decision under that proxy: KB diff APPROVED (truth/gate.md new + truth/status.md D-ST-1; heterogeneously checked, ledger 12 verified 0 open). current-step → DONE.
