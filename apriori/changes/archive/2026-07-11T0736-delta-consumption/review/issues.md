# Issue ledger — delta-consumption

Rows recorded on behalf of the reviewer (codex session 019f4b30-68f9-7222-9b64-17f52a333b4c; raws: delta-consumption-req-review-v1-raw.txt).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DC-1 | D3's tail grammar unresolvable (r2 reopened: DD-2 still said 'tail'). | Ambiguity for implementers. | STEP0·r1 | verified |
| DC-2 | Line-number rule didn't cover existing stamp problems. | Inconsistent diagnostics. | STEP0·r1 | verified |
| DC-3 | Section-preamble prose (heading → first requirement) unclassified. | Every-line-accounted-for claim had a hole. | STEP0·r1 | verified |
| DCSPEC-1 | Misplaced (late but well-formed) stamps could be absorbed as body text — design only recognized stamps in FILE_PREAMBLE. | Hygiene problem silently lost. | STEP2·r1 | verified |
| DCSPEC-2 | "Body lines accumulate until next heading" too loose vs REQ_RE semantics (scenario headings, ## boundary flush, trim+'\n'). | Well-formed inputs could reassemble differently old-vs-new. | STEP2·r1 | verified |
| DCSPEC-3 | CRLF normalization and fence-delimiter precision undefined. | Platform-dependent parses; inline backticks could toggle opacity. | STEP2·r1 | verified |
| DCSPEC-4 | Legal section matcher written as a precedence-broken regex (`^## ADDED\|MODIFIED\|...` alternation ungrouped). | `MODIFIED Requirements` without `## ` could be accepted as a legal section. | STEP2·r2 | verified |
| DCSPEC-5 | Design's stamp-attempt regex narrower than existing STAMP_ATTEMPT_RE hygiene (missed leading whitespace / missing colon). | Malformed stamp attempts consumed as legal text, evading CAS hygiene / AM-31. | STEP2·r2 | verified |
| DCSPEC-ADV-2 | Advisory: T1 should name the old-vs-new corpus equality assertion + a direct CRLF test. | Test-plan precision. | STEP2·r2 | verified |
| DCIMPL-1 | A valid stamp under SKIP_UNRECOGNIZED before the first legal section still became the returned delta stamp (stamp check ran before the SKIP guard). | Skipped content attributed into parser state, violating the no-rehome rule. | STEP5·r1 | verified |
| DCIMPL-2 | Body lines under an illegal `### Requirement:` inside RENAMED were still parsed as rename operations. | Invalid structure populated operation buckets despite the problem. | STEP5·r1 | verified |
| DCIMPL-ADV-1 | Advisory: CRLF block-text equality + rename-blind-spot + skipped-stamp assertions strengthened in AM-29/30/31. | Test blind spots. | STEP5·r1 | verified |
