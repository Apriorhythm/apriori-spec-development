change: authz-boundary
tier: medium         # normative protocol rule, both language editions + binding test
track: harden
track-rationale: P1-7 of the owner-ordered batch ("继续" resumed it); gap flagged by both external reviews
lineage: v3 branch (never merge to main or v2)
current-step: STEP6
round: STEP0 converged at r2; AB-1..4/ADV-1 verified
reviewer-session: 019f4b30-68f9-7222-9b64-17f52a333b4c
next-action: archive --write --changes-dir, commit, push   # 2026-07-12T00:2x
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
gates:
  - 2026-07-11T20:08 note: change scaffolded by `apriori new`
  - 2026-07-12T00:2x gate④ KB sign-off: covered by the owner's standing batch order "P0+P1 开始" resumed by "继续" (2026-07-11) after the P0-4 pause (itemized P0/P1/P2 presentation preceded the original order; this change is P1-7). KB: the rule IS the protocol doc itself (runbook §1 both editions + concepts mirror); protocol module has no truth doc (C6 informational). Gate PASS. Ledger 13/13 verified (P1 r2, P5 r3, P8 r1).
