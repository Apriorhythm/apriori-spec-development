# Issue ledger — cas-enforcement

Rows recorded on behalf of the reviewer (codex session 019f4b30-68f9-7222-9b64-17f52a333b4c; raws: cas-enforcement-*-raw.txt).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| CE-1 | Rerun signature conflicted with MODIFIED semantics (never reports unchanged). | Already-applied MODIFIED deltas keep the dead-end. | STEP0·r1 | verified |
| CE-2 | cas: optional conflicted with the markdown-table config format. | Waiver documented one way, parsed another. | STEP0·r1 | verified |
| CE-3 | Archive warning scope ambiguous across the two archive forms. | Single-file surgery keeps the silent opt-in. | STEP0·r1 | verified |
| CE-4 | unstampedMutations JSON location/shape unspecified. | Machine-surface disagreement. | STEP0·r1 | verified |
| CE-5 | Mixed multi-file rerun repair after partial commit underspecified. | Over-repair or confusing diagnostics. | STEP0·r1 | verified |
| CE-ADV-1 | Advisory: ADDED exemption is clobber-focused (say so); C7 separate from C6; --no-cas never waives verify/archive mismatches (document). | Low. | STEP0·r1 | verified |
| CESPEC-ADV-1 | advisory batch acknowledged (3 items: SR-23-style projection JSON expectations updated with the new field; C7-on-C1-error behavior made explicit — gate already exits ERROR before C7, tested; configCas parsing boundaries tested absent/optional/required/junk) | low | STEP2·r1 | advisory-acked |
| CEIMPL-1 | truth D-AM-7 still said MODIFIED reruns re-apply — contradicting the ratified trim-equality unchanged. | State-A readers could revive the rerun dead-end. | STEP5·r1 | verified |
| CEIMPL-ADV-1 | Advisory: gate truth CLI line gains --no-cas; D-AM-8 documents why repaired suffixes need no temp handling. | Low. | STEP5·r1 | verified |
