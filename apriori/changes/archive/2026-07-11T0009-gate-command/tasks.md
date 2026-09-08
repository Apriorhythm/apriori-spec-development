# Tasks — gate-command (STEP5 consumes this order)

- [x] T1. Failing tests first: one per scenario GT-01..12 (test/gate.test.js; GT-07/GT-11 via spawned BIN, others in-process runGate) + CL-09 (test/cli.test.js) — show the failing run.
- [x] T2. lib/gate.js: runGate (validate → resolve → C1..C6 → aggregate) + cli per design.
- [x] T3. bin/apriori.js: `gate` dispatch + USAGE line.
- [x] T4. Full suite green; `apriori verify --change gate-command` GREEN (13 new scenarios bound).
- [x] T5. Dogfood: `apriori gate --change gate-command` → GATE: PASS on this very change.
- [x] T6. Docs: README/README_cn cheat-sheet rows; RUNBOOK/RUNBOOK_cn §1 verdict-evidence clause names `apriori gate --change`.
- [x] T7. `apriori check --self` PASS.
