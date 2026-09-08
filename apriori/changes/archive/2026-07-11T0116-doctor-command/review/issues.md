# Issue ledger — doctor-command

Rows recorded on behalf of the reviewer (codex session 019f4b30-68f9-7222-9b64-17f52a333b4c; raws: doctor-command-req-review-v1-raw.txt).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DREQ-1 | D5 test-command failure taxonomy omits signal kill, TAP bailout, and non-zero/truncated TAP cases (r2 reopened: TAP-version/plan with zero results). | Broken test plumbing can be classified inconsistently or reported healthy. | STEP0·r1 | verified |
| DREQ-2 | D7 "unparseable flow-state" is not concrete against `parseFlowState`, which rarely errors. | Junk flow-state files can pass or fail inconsistently. | STEP0·r1 | verified |
| DREQ-3 | Missing `apriori/specs/` is not classified. | Half-initialized projects can be treated as normal empty stores. | STEP0·r1 | verified |
| DREQ-4 | D3 behavior when `apriori/runbook.md` is missing is ambiguous. | Output can contradict itself between D2 and D3. | STEP0·r1 | verified |
| DREQ-5 | A8's unparseable-flow-state criterion lacks a concrete test input. | Acceptance tests can assert weaker or divergent behavior. | STEP0·r1 | verified |
| ADV-D1 | advisory batch acknowledged (2 items: D4 missing-rules-file wording — fixed; D6 default-ID-pattern visibility — fixed) | low | STEP0·r1 | advisory-acked |
| DREQ-6 | Positional arguments are forbidden but not classified. | CLI behavior and tests can diverge on stray arguments. | STEP0·r2 | verified |
| ADV-D2 | advisory batch acknowledged (2 items: exit-2 wording now lists positional args; A11 reuse list gains parseTap) — both applied to req-final | low | STEP0·r3 | advisory-acked |
| DSPEC-1 | D2 per-gap findings conflict with the one-check-entry aggregate/JSON model. | CI-visible `findings` count and JSON shape can be implemented inconsistently. | STEP2·r1 | verified |
| DSPEC-2 | Node-below-floor behavior has no scenario. | The unsupported-runtime exit path can regress unbound. | STEP2·r1 | verified |
| DSPEC-3 | D5 can mark non-zero `1..0` TAP output as ok. | Broken test commands hidden as healthy plumbing. | STEP2·r1 | verified |
| DSPEC-4 | D7 archived walk follows symlinked dirs without containment. | Doctor can read outside the archive tree. | STEP2·r1 | verified |
| ADV-DSPEC-1 | advisory batch acknowledged (2 items: cli MODIFIED fidelity clean; DR-09 now states the archive basename pattern) | low | STEP2·r1 | advisory-acked |
| DSPEC-5 | Scenario range references (tasks.md T1, CL-10) not updated after adding DR-12. | Binding tasks and CLI spec point at a stale range. | STEP2·r2 | verified |
| DIMPL-1 | D2/D4 path-type checks can falsely pass malformed scaffold entries or throw instead of reporting findings. | Doctor can misdiagnose or crash on half-initialized projects it is meant to explain. | STEP5·r1 | verified |
| ADV-DIMPL-1 | advisory batch acknowledged (2 items: DR-11 fingerprint now includes mtime; DR-09 asserts the skip note) — both done | low | STEP5·r1 | advisory-acked |
