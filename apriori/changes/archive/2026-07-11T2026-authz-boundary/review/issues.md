# Issue ledger — authz-boundary

Rows recorded on behalf of the reviewer (codex session 019f4b30-68f9-7222-9b64-17f52a333b4c; raws: authz-boundary-*-raw.txt).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| AB-1 | Standing authorization had no precise expiry boundary. | Scoped grants become blankets by precedent. | STEP0·r1 | verified |
| AB-2 | Paid-service carve-out ambiguous ("configured tooling"). | Cost/data-leak calls implicitly authorized. | STEP0·r1 | verified |
| AB-3 | Untrusted-data clause could be read as forbidding verdict-driven internal transitions. | Breaks protocol or under-protects. | STEP0·r1 | verified |
| AB-4 | Action classes omitted remote service admin/access-control mutations. | Security-relevant effects outside the rule. | STEP0·r1 | verified |
| AB-ADV-1 | Advisory: PR-17 semantic anchors, not sentences; local commits rightly excluded. | Test brittleness / recorded boundary. | STEP0·r1 | verified |
| ABSPEC-1 | PR-17 anchors were whole-file — pre-existing proxy text ('one-shot', verbatim gates:) could satisfy them while the new subsection dropped clauses. | Clause-dropping passes the only deterministic binding. | STEP2·r1 | verified |
| ABSPEC-2 | Anchor set underbound the mandatory class list and the carve-out's negative side. | High-impact classes or the paid boundary omitted while tests pass. | STEP2·r1 | verified |
| ABSPEC-ADV-1 | Advisory: insertion point verified in both editions; PR-17 numbering clean; docs-only tier sound once anchors tightened. | Low. | STEP2·r1 | verified |
| ABSPEC-1 (r2 reopened) | block() bounds only at the next ### — the bold heading (r1 fix) and even a plain ### placement would swallow later sections; needs a `##|###`-bounded extractor. | Clause-dropping passes from swallowed unrelated text. | STEP2·r2 | verified |
| ABSPEC-ADV-2 | Advisory: add settings + environments anchors for remote-administration subexamples. | Low. | STEP2·r2 | verified |
| ABIMPL-ADV-1 | Advisory: CN heading ASCII parens — typography artifact, semantically clean (reviewer: acceptable, non-blocking). | Low. | STEP5·r1 | verified |
