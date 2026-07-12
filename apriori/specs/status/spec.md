### Requirement: status reports where a change is
`apriori status` SHALL read a change's flow-state and issue ledger and report its current step, next action, and open ledger items — with no args, it lists the active (non-archived) changes.

#### Scenario: ST-01 --change reports step, next-action, and open-ledger count
- WHEN `apriori status --change <name>` runs against a change with a flow-state file and a ledger
- THEN it prints the current step, next-action, and the count (and IDs) of ledger rows whose status is `open`

#### Scenario: ST-02 no args lists the active changes
- WHEN `apriori status` runs with no `--change`
- THEN it lists every directory under `apriori/changes/` except `archive/`, each with its step and open count

#### Scenario: ST-03 open-ledger detection ignores non-open rows
- WHEN the ledger has rows with statuses like `open`, `fixed`, `verified`, `advisory-acked`
- THEN only the `open` rows are counted as open

#### Scenario: ST-04 --json emits a machine-consumable report
- WHEN `apriori status --json` (or `--change <name> --json`) runs
- THEN it prints valid JSON — per change: change/step/tier/track/lineage/nextAction/lastGate/hasFlowState/openLedger (IDs) — with no prose mixed in, so an agent can parse instead of scraping text

### Requirement: status resolves archived changes with path protection
`apriori status --change <name>` SHALL resolve the change like the gate does — the shared resolver validates the bare-kebab name, prefers the active bundle, falls back to the newest archived stamp-dir, and enforces realpath containment — and report `stage: in-flight|archived` alongside the existing fields, reading the flow-state and ledger from the resolved bundle. After resolution the read surface is file-guarded through the structured defect contract (`fileReadDefect` → `{kind, path}`): `flow-state.md` must resolve defect-free (any kind — missing, symlink, not-file, bad-ancestor, escape — exits 2 naming the kind and path); `review/issues.md` reads as 0 open rows ONLY on kind `missing` — every other kind (a dangling or symlinked `review/` ancestor included) exits 2. The parsed flow-state's `change:` must equal the queried name, else exit 2 (identity check). An invalid name, a nonexistent change, or an escaping path exits 2. `--json` gains `stage` and `path`. The no-args listing keeps its active-only shape while reusing the same file guards internally. The resolver and the process-config CAS lookup live in a shared module — no gate↔status require cycle.

#### Scenario: ST-05 an archived change is visible with its stage
- WHEN `status --change <name>` names a change that lives only under `apriori/changes/archive/<stamp>-<name>/`
- THEN it reports `stage: archived` with the step, next-action, and open-ledger count read from the archived bundle — never "no flow-state file found"

#### Scenario: ST-06 bad names and missing changes fail closed
- WHEN `--change` gets an illegal name (uppercase, path separators, `..`) or a name matching no active or archived change
- THEN status exits 2 with a named error — never a silent empty report

#### Scenario: ST-07 the read surface is containment-guarded
- WHEN the resolved bundle's `flow-state.md` is missing, is a symlink, or realpath-escapes the bundle — or a present `review/issues.md` is a symlink or escapes
- THEN status exits 2 naming the offending file; an absent `review/issues.md` still reports 0 open rows

#### Scenario: ST-08 the JSON contract carries stage and path
- WHEN `status --change <name> --json` runs against an active and an archived change
- THEN the JSON gains `stage` (`in-flight`/`archived`) and `path` (the resolved bundle dir, repo-relative) alongside the existing fields, whose shapes stay unchanged

#### Scenario: ST-09 identity and ancestors are checked, absence stays benign
- WHEN an archived bundle's flow-state declares `change: other` under a `…-demo` stamp dir (and an ACTIVE bundle `changes/demo/` declares the same mismatch); and a second bundle's `review/` is a dangling symlink; and a third simply has no `review/issues.md`
- THEN `status --change demo` exits 2 naming the identity mismatch at BOTH stages; the second exits 2 naming the bad ancestor (never "0 open"); the third reports 0 open rows as before
