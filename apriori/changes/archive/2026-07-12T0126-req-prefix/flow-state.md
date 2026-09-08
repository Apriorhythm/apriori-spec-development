change: req-prefix
tier: medium         # protocol-convention change, both editions + binding test (docs-only precedent: authz-boundary)
track: harden
track-rationale: global requirement-path collision dogfooded twice this batch; V1.4 stopgap ported per owner order
lineage: v3 branch (never merge to main or v2)
current-step: STEP6
round: STEP0 converged at r3; RP-1..4/ADV-1 verified
reviewer-session: 019f4b30-68f9-7222-9b64-17f52a333b4c
next-action: archive + preservation-clause dogfood + post-archive gate, then release 3.4.1   # 2026-07-12
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root
gates:
  - 2026-07-12T00:58 note: change scaffolded by `apriori new`
  - 2026-07-12 authorization (owner, verbatim): "要,动手吧,搞定之后记得跑 github 的 ci,没问题之后顺手发 npm" — covers this change + push/CI + npm publish conditioned on CI green (class/scope/expiry: this change's completion).
  - 2026-07-12 gate④ KB sign-off: covered by the same owner order (this change is its named scope). KB: the protocol docs ARE the change; no truth doc for new/protocol (C6 informational, precedent). Gate PASS C1-C7; ledger 9 rows all verified (P1 r3, P5 r2, P8 r3 — P8 r2's reopen exposed and fixed a line-level-grep verification bug).
  - 2026-07-12 post-archive gate: PASS at archived stage. Preservation clause dogfooded on its own change: requirement/req-prefix-req-{v1,v2,final}.md copied into the archive dir per the new STEP6 rule — first change needing no hand-rescue.
