# Issue ledger — ledger-states

Rows recorded on behalf of the reviewer (codex session 019f4b30-68f9-7222-9b64-17f52a333b4c; raws: ledger-states-*-raw.txt).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| LS-1 | waived passed C4 on the row alone — producer self-waive recreates the self-rejection hole. | Formal issues waived without the human. | STEP0·r1 | verified |
| LS-2 | Archived-stage C4 not tied to a required post-archive gate run. | The terminal-only rule may never execute. | STEP0·r1 | verified |
| LS-3 | Unknown-status handling unspecified in-flight; case rules undeclared. | Typos/invented states pass. | STEP0·r1 | verified |
| LS-4 | rejected-verified reason provenance undefined. | Audit trail loses the original rationale. | STEP0·r1 | verified |
| LS-5 | Migration lacked a deterministic all-archived-ledgers scan. | Hidden non-terminal rows survive. | STEP0·r1 | verified |
| LS-ADV-1 | Advisory: advisory-acked ok with scope discipline; reopened stays an event (docs say so); cure-message exactness left to design. | Low. | STEP0·r1 | verified |
| LSSPEC-1 | Claim: PR-18's /^### STEP6 /m heading does not exist (only P9). REFUTED: `### STEP6 — archive + KB writeback` at RUNBOOK.md:255 and `### STEP6 —— 归档 + 知识库回写` at RUNBOOK_cn.md:251 — exactly the design's target; design now cites both line numbers. | (claimed) PR-18 unbound. | STEP2·r1 | rejected-verified — heading-does-not-exist claim refuted by grep (RUNBOOK.md:255, RUNBOOK_cn.md:251); reviewer concurred (design-review-v2) |
| LSSPEC-2 | Waiver evidence was block-wide — ID in one gates: entry and 'waived' in another would pass. | Self-waive fix weakened. | STEP2·r1 | verified |
| LSSPEC-ADV-1 | Advisory: GT-15 gains the reason floor; the gates: block/entry boundaries are explicit regexes. | Low. | STEP2·r1 | verified |
| LSSPEC-3 | Waiver ID matching was substring — LS-1 would match inside LS-10. | Wrong human entry satisfies a different row. | STEP2·r2 | verified |
| LSIMPL-1 | PR-18's rejected-status anchors could be satisfied by rejected-verified (\brejected\b matches inside it) — CN flagged; EN had the identical hole. | A future edit drops the plain producer-set state while PR-18 stays green. | STEP5·r1 | verified |
| LSIMPL-ADV-1 | Advisory: CN gains the waived example row for parity; markdown-decorated status cells stay illegal by design. | Low. | STEP5·r1 | verified |
