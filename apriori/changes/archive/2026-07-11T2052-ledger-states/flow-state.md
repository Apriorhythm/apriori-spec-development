change: ledger-states
tier: medium         # gate C4 semantics + protocol vocabulary, fail-closed at archived stage
track: harden
track-rationale: P1-8 of the owner-ordered batch; C4 self-rejection defect code-verified; live evidence UMIMPL-1
lineage: v3 branch (never merge to main or v2)
current-step: STEP6
round: STEP0 converged at r2; LS-1..5/ADV-1 verified
reviewer-session: 019f4b30-68f9-7222-9b64-17f52a333b4c
next-action: archive, post-archive gate (the new rule, first dogfood), commit, push   # 2026-07-12T02:5x
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
gates:
  - 2026-07-11T20:29 note: change scaffolded by `apriori new`
  - 2026-07-12T02:5x gate④ KB sign-off: covered by the owner's standing batch order "P0+P1 开始" resumed by "继续" (this change is P1-8, second-to-last of the batch). KB updated: truth/gate.md C4 rewritten for the terminal-state vocabulary; the protocol docs ARE the P0/STEP6 rule. In-flight gate PASS C1-C6; ledger 12 rows: 11 verified + LSSPEC-1 rejected-verified (heading-exists claim refuted by grep, reviewer concurred). Post-archive gate result appended below after the archive action.
  - 2026-07-12T03:0x post-archive gate (the rule this change introduced, first dogfood): GATE: PASS at archived stage — C1 verify GREEN (archived), C4 12 rows all terminal under the new vocabulary, C1-C6 green; exit 0.
