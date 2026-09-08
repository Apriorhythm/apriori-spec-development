# Tasks — doctor-command (STEP5 consumes this order)

- [x] T1. Failing tests first: one per scenario DR-01..12 (test/doctor.test.js) + CL-10 (test/cli.test.js) — show the failing run.
- [x] T2. lib/doctor.js: runDoctor + classifyProbe + cli per design.
- [x] T3. bin/apriori.js: `doctor` dispatch + USAGE line.
- [x] T4. Full suite green; `apriori verify --change doctor-command` GREEN.
- [x] T5. Dogfood: `apriori doctor` on this repo — record the honest output (expected: D2 finding, no runbook copy) in the gate-④ packet; `apriori gate --change doctor-command` → GATE: PASS.
- [x] T6. Docs: README/README_cn cheat-sheet rows; RUNBOOK/RUNBOOK_cn §0 doctor clause.
- [x] T7. `apriori check --self` PASS.
