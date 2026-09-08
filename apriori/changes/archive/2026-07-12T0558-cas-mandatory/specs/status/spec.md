<!-- apriori-base: sha256:e07d83e3835cb5b2d0b08c644cab7bcfffd423cb4aaa06683bd33a083c7129f7 -->
## ADDED Requirements

### Requirement: status resolves archived changes with path protection
`apriori status --change <name>` SHALL resolve the change like the gate does — the shared resolver validates the bare-kebab name, prefers the active bundle, falls back to the newest archived stamp-dir, and enforces realpath containment — and report `stage: in-flight|archived` alongside the existing fields, reading the flow-state and ledger from the resolved bundle. After resolution the read surface is file-guarded: `flow-state.md` must exist, lstat as a regular file, and realpath-contain within the bundle, else exit 2 with a named error (a resolved change without a flow-state is a broken state, also exit 2); a present `review/issues.md` must equally be regular and contained else exit 2, while an absent ledger still reads as 0 open rows. An invalid name, a nonexistent change, or an escaping path exits 2. `--json` gains `stage` and `path`. The no-args listing keeps its active-only shape while reusing the same file guards internally. The resolver and the process-config CAS lookup live in a shared module — no gate↔status require cycle.

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
