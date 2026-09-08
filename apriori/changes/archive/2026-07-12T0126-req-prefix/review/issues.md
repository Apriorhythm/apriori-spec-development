# Issue ledger — req-prefix

Rows recorded on behalf of the reviewer (codex session 019f4b30-68f9-7222-9b64-17f52a333b4c; raws: req-prefix-*-raw.txt).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RP-1 | docs/concepts EN/CN still publish the old global paths — scope omitted them. | Split-brained protocol reproduces the collision. | STEP0·r1 | verified |
| RP-2 | STEP6 copy clause lacked exact set/destination/timing. | Inconsistent or impossible preservation. | STEP0·r1 | verified |
| RP-3 | PR-19 negative matcher undefined — could false-positive on legitimate requirement/ prose. | Brittle or blind binding. | STEP0·r1 | verified |
| RP-ADV-1 | Advisory: intent-card inclusion sound; protocol-only copy ok once precise; old archives grandfathered explicitly. | Low. | STEP0·r1 | verified |
| RP-4 | "Docs-only" label conflicted with the required lib/new.js scaffold-text edit. | Implementer skips it or reviewer rejects it as out of scope. | STEP0·r2 | verified |
| RPSPEC-1 | NW-05 bound only one of the three forbidden literals; lib/ side unbound for req-final/intent-card. | Stale literal survives in scaffold while bindings pass. | STEP2·r1 | verified |
| RPSPEC-ADV-1 | Advisory: per-file replacement counts recorded in design; P8 to check EN/CN preservation-sentence parity. | Low. | STEP2·r1 | verified |
| RPIMPL-1 | Bare req-v shorthands survived in both runbooks (the V1FIX-1 class) — r2 reopened: the STEP0 In-bullet's "then draft req-v1"/"再出 req-v1" hid from a LINE-level grep -v behind the prefixed form on the same line; PR-19's guard was also too narrow (unbackticked, "draft" not "drafts"). | The collision-prone naming could still be followed. | STEP5·r1 | verified |
