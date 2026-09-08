# Issue ledger — gate-command

Rows recorded on behalf of the reviewer (codex session 019f4b30-68f9-7222-9b64-17f52a333b4c, read-only sandbox; raws: gate-command-req-review-v1-raw.txt).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| GREQ-1 | Archived stage resolution is ambiguous when multiple archive dirs match a change name. | Gate may read different archived artifacts across implementations. | STEP0·r1 | verified |
| GREQ-2 | Flow-state legality vocabulary and required fields are underspecified. | Valid flow states may be rejected or invalid placeholders accepted inconsistently. | STEP0·r1 | verified |
| GREQ-3 | Verdict raw matching lacks exact file, regex, symlink, and duplicate handling rules. | The simulated-review backstop can be bypassed or inconsistently enforced. | STEP0·r1 | verified |
| GREQ-4 | `gate --change` lacks explicit change-name validation and realpath containment. | Path traversal or symlink escapes can make gate read outside intended roots. | STEP0·r1 | verified |
| GREQ-5 | C6 git freshness check does not define git failure and invalid-commit handling. | CI/shallow/non-git environments can produce inconsistent PASS/BLOCKED/N/A results. | STEP0·r1 | verified |
| GREQ-6 | C1 verify invocation details and missing test-command handling are incomplete. | Gate can run the wrong verify target or classify verify setup failures inconsistently. | STEP0·r1 | verified |
| GREQ-7 | Ledger path is undeclared for archived changes and conflicts with status convention if inferred from resolved dir. | Gate may miss the actual issue ledger and falsely pass C4. | STEP0·r1 | verified |
| ADV-G1 | advisory batch acknowledged (3 items: version wording — fixed; trivial-tier-without-flow-state — now exit 2, stated in C3 spec; exact `open` rule — D3) | low | STEP0·r1 | advisory-acked |
| GREQ-8 | `--json` contract has no defined shape for exit-2 outcomes before a stage exists. | Usage/validation/not-found errors cannot be implemented or tested consistently as pure JSON. | STEP0·r2 | verified |
| ADV-G2 | advisory batch acknowledged (3 items: rejected-reason regex — now concrete; checkbox casing — fixed; id-pattern limitation — docs mention added to out-of-scope) | low | STEP0·r2 | advisory-acked |
| GSPEC-1 | C4 rejected-reason validation regex accepts `rejected:` / punctuation-only statuses as reasoned rejections. | Gate can falsely pass with a reasonless rejected ledger row. | STEP2·r1 | verified |
| ADV-GSPEC-1 | advisory batch acknowledged (2 items: ID/block fidelity clean; C5 raw symlink handling now explicit — lstat-regular first, then realpath) | low | STEP2·r1 | advisory-acked |
| GIMPL-1 | Archived resolution checks containment against `apriori/changes` instead of `apriori/changes/archive`, and selects archive candidates by matching basename without requiring a contained directory. | Gate can accept an archived symlink outside the archive root or select a non-directory candidate, violating GT-07 path semantics. | STEP5·r1 | verified |
| ADV-GIMPL-1 | advisory batch acknowledged (4 items: GT-05 raw-symlink case added; GT-11 missing-flow-state + verify-untrustworthy JSON classes added; GT-12 fingerprint limit accepted as-is (static inspection confirms zero writes); README/README_cn duplicate gate rows removed) | low | STEP5·r1 | advisory-acked |
