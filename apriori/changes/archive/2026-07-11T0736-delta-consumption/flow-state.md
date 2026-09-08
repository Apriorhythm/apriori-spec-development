change: delta-consumption
tier: medium         # parser rewrite in archive-merge's parse layer; fail-closed behavior change on malformed input
track: harden
track-rationale: P0-1 of the owner-ordered P0+P1 batch; defect reproduced verbatim from the GPT-5.6 second review
lineage: v3 branch (never merge to main or v2)
current-step: STEP6
round: P8·r2 done (VERDICT: no major issues, ready to proceed) — P1 conv. STEP0·r3, P5 conv. STEP2·r3, P8 conv. STEP5·r2
reviewer-session: 019f4b30-68f9-7222-9b64-17f52a333b4c
next-action: archive --write, commit, push   # 2026-07-11T16:0x
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
gates:
  - 2026-07-11T14:58 note: change scaffolded by `apriori new`
  - 2026-07-11T16:0x gate④ KB sign-off: covered by the owner's standing batch order "P0+P1 开始" (given after the itemized P0/P1/P2 presentation of the GPT-5.6 second-review findings; this change is P0-1 of that batch). KB updated: apriori/truth/archive-merge.md delta-parsing contract rewritten for the fully-consuming walker. Gate PASS C1-C6; ledger 12/12 verified.
