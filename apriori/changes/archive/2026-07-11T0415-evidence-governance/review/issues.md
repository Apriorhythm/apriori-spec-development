# Issue ledger — evidence-governance

Rows recorded on behalf of the reviewer (codex session 019f4b30-68f9-7222-9b64-17f52a333b4c; raws: evidence-governance-req-review-v1-raw.txt).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| EG-1 | Generic secret pattern lacks false-positive boundary rules. | Tripwire noise trains people to ignore it. | STEP0·r1 | verified |
| EG-2 | CK-10 scan scope ambiguous (files/traversal/symlinks). | Inconsistent implementations. | STEP0·r1 | verified |
| EG-3 | Provenance header lacks an exact format. | Convention nobody can follow uniformly. | STEP0·r1 | verified |
| EGSPEC-1 | CK-10 conflicted with CK-07 (r2 reopened: MODIFIED targeted the wrong store block — silent no-op replace). | Merged spec self-contradiction. | STEP2·r1 | verified |
| EGSPEC-2 | Design said "anchored regexes"; spec needs substring detection. | Embedded secrets missed. | STEP2·r1 | verified |
