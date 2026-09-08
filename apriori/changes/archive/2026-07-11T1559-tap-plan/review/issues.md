# Issue ledger — tap-plan

Rows recorded on behalf of the reviewer (codex session 019f4b30-68f9-7222-9b64-17f52a333b4c; raws: tap-plan-req-review-v*.txt).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| TP-1 | Multi-plan sum rule maskable: one stream's truncation offset by another's extra points; dup check skipped exactly there. | Truncated/garbled concatenated TAP still verifies GREEN. | STEP0·r1 | verified |
| TP-2 | Point-count regex /^(ok|not ok)\b/ broader than TAP result syntax (counts `ok:` diagnostic-like lines). | False plan mismatches; implementer divergence. | STEP0·r1 | verified |
| TP-ADV-1 | Advisory: `1..0 # SKIP` directive case, numeric dup-number comparison, doctor-scope exclusion kept intentional. | Edge precision. | STEP0·r1 | verified |
| TPSPEC-1 | infraErrors guards read run.plans/.points/.dupNumbers without defaults — legacy run shapes from direct callers would throw (signature break on an exported helper). | Existing tests/external callers crash. | STEP2·r1 | verified |
| TPSPEC-2 | Dup-number regex captured incomplete numeric tokens (`ok 1abc` misread as number 1). | False duplicate-number infra errors. | STEP2·r1 | verified |
| TPIMPL-1 | Delta requirement prose still said plan violations make gate C1 BLOCKED while code/SR-31 correctly make gate ERROR exit 2. | Spec-vs-code drift could reintroduce the wrong gate contract. | STEP5·r1 | verified |
