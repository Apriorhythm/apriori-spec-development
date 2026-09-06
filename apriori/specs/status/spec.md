### Requirement: status reports where a change is
`apriori status` SHALL read a change's flow-state and report its phase, its Reality Check, its open items and its next actions — never the issue ledger, which 6.2 retired — with no args, it lists the active (non-archived) changes.

#### Scenario: ST-01 --change reports phase, next actions, and the open items — never the ledger
- WHEN `apriori status --change <name>` runs against a change with a flow-state file and a ledger
- THEN it prints the phase, the next actions and every `## Open` item with its `[pending]` / `[accepted]` marker, the legacy `## Evidence` row as ignored, and each C9 refusal as a `BLOCKED:` line — and nothing from the unread ledger

#### Scenario: ST-02 no args lists the active changes
- WHEN `apriori status` runs with no `--change`
- THEN it lists every directory under `apriori/changes/` except `archive/`, each with its phase and open-item count

#### Scenario: ST-04 --json emits a machine-consumable report
- WHEN `apriori status --json` (or `--change <name> --json`) runs
- THEN it prints valid JSON — per change: change/phase/mode/effectiveMode (equal to mode since 6.2)/risk/lineage/reality/openIssues (raw lines)/openItems (`{id, text, accepted, acceptedAt}`)/next/delivery/evidence (legacy rows only)/lastGate/hasFlowState/openLedger (always empty)/escalations — with no prose mixed in, so an agent can parse instead of scraping text

### Requirement: status resolves archived changes with path protection
`apriori status --change <name>` SHALL resolve the change like the gate does — the shared resolver validates the bare-kebab name, prefers the active bundle, falls back to the newest archived stamp-dir, and enforces realpath containment — and report `stage: in-flight|archived` alongside the existing fields, reading the flow-state and ledger from the resolved bundle. After resolution the read surface is file-guarded through the structured defect contract (`fileReadDefect` → `{kind, path}`): `flow-state.md` must resolve defect-free (any kind — missing, symlink, not-file, bad-ancestor, escape — exits 2 naming the kind and path); the `review/` root is guarded with the same rule gate uses (a symlinked, escaping or non-directory `review/` exits 2), while `review/issues.md` itself is never opened (6.2). The parsed flow-state's `change:` must equal the queried name, else exit 2 (identity check). An invalid name, a nonexistent change, or an escaping path exits 2. `--json` gains `stage` and `path`. The no-args listing keeps its active-only shape while reusing the same file guards internally. The resolver and the process-config CAS lookup live in a shared module — no gate↔status require cycle.

#### Scenario: ST-05 an archived change is visible with its stage
- WHEN `status --change <name>` names a change that lives only under `apriori/changes/archive/<stamp>-<name>/`
- THEN it reports `stage: archived` with the phase, next actions, and open items read from the archived bundle — never "no flow-state file found"

#### Scenario: ST-06 bad names and missing changes fail closed
- WHEN `--change` gets an illegal name (uppercase, path separators, `..`) or a name matching no active or archived change
- THEN status exits 2 with a named error — never a silent empty report

#### Scenario: ST-07 the read surface is containment-guarded
- WHEN the resolved bundle's `flow-state.md` is missing, is a symlink, or realpath-escapes the bundle — and separately when a present `review/issues.md` is a symlink
- THEN status exits 2 naming the flow-state; the symlinked ledger changes nothing, because it is never read

#### Scenario: ST-08 the JSON contract carries stage and path
- WHEN `status --change <name> --json` runs against an active and an archived change
- THEN the JSON gains `stage` (`in-flight`/`archived`) and `path` (the resolved bundle dir, repo-relative) alongside the existing fields, whose shapes stay unchanged

#### Scenario: ST-09 identity and ancestors are checked, absence stays benign
- WHEN an archived bundle's flow-state declares `change: other` under a `…-demo` stamp dir (and an ACTIVE bundle `changes/demo/` declares the same mismatch); and a second bundle's `review/` is a dangling symlink; and a third simply has no `review/`
- THEN `status --change demo` exits 2 naming the identity mismatch at BOTH stages; the second exits 2 naming the unsafe review root; the third reports as before

### Requirement: status diagnoses a bundle left behind by the retired hotfix lane
6.0 removed the hotfix lane. `status` SHALL still SEE a `hotfix-state.md` so a leftover bundle is diagnosed rather than read as a change with a missing flow-state: it is listed, its row says the bundle must be migrated, and `--change` on it resolves and reports the migration instead of erroring. The JSON contract keeps its `hotfix` boolean, which now reports exactly what it always detected — whether the bundle carries that file. Residue beside a readable `flow-state.md` is just residue: the change is reported as the change it is, review loop included.

#### Scenario: ST-10 a leftover lane bundle is listed and told how to migrate
- WHEN `status` lists active changes and one of them is residue of the RETIRED hotfix lane, holding `hotfix-state.md` and no flow-state
- THEN that row reads as a leftover bundle to migrate, `--change` on it reports the migration rather than erroring, and neither names the retired lane as a live option

#### Scenario: ST-11 the JSON contract still parses with a leftover bundle present
- WHEN `--json` reports a bundle left behind by the RETIRED lane alongside a formal change
- THEN the residue flag (named `hotfix` for the retired lane it detects) is true for the first and false for the second, and the document parses

### Requirement: the one state carries the Reality Check, the open items and the escalation
The flow-state SHALL be the ONLY progress source a change keeps. A section heading MAY carry a trailing `# …` annotation — the form the state template prints and `apriori new` scaffolds — and SHALL be recognised with or without it; a heading read as absent turns the claims under it into silence. `status` SHALL read from it: the `phase`; the `## Reality Check` section, whose entries are exactly `observed` / `decision` / `assumption` (anything else is reported as unreadable, never silently dropped); the `## Open` items, each `[pending]` or `[accepted]`; the legacy `## Evidence` rows, as ignored; and the `## Next` actions, of which the state carries at most three. The findings SHALL be derived on the SAME input gate's C9 receives — the delta scan, and the STAGE — so the three surfaces cannot disagree; on an ARCHIVED bundle the findings are RECORDED rather than blocking and its deltas are not re-scanned, because a frozen record is reported, never re-judged. `status --change <name> --escalation` SHALL print every reason a human is being waited on — the state's own `escalation:` line, each escalating review family, and every C9 refusal (a pending item above all) — and exit 3 when there is one, 0 when there is none; frozen history SHALL never be one of them. That exit code is the whole hard-stop mechanism: no supervision system, no second file, no hook shipped by this repository.

#### Scenario: ST-12 the Reality Check is read back, and an unverified assumption is surfaced
- WHEN a flow-state carries `## Reality Check` entries of each kind plus one entry that names no kind
- THEN `status` reports the three counts, names every `assumption` on its own line, and reports the kind-less entry as unreadable rather than dropping it

#### Scenario: ST-13 the state's next actions are capped at three
- WHEN a flow-state's `## Next` section lists more than three actions
- THEN `status` prints the first three and says how many were listed — the cap is reported, never silently applied

#### Scenario: ST-14 --escalation is the hard stop
- WHEN `status --change <name> --escalation` runs against a change with nothing outstanding, then against one whose state declares an escalation, whose review family escalated, or whose `## Open` carries a pending item — and then one whose only item is accepted
- THEN the first prints `ESCALATION: none` and exits 0, each of the next three prints the reason and exits 3, and the accepted item is not a stop

#### Scenario: RY-30 an annotated heading is a heading, and the claim under it does not vanish
- WHEN a state writes `## Open` / `## Reality Check` in the annotated form the template prints (`## Open                  # substantive unresolved items …`), at any heading level
- THEN the items under it are read exactly as under a bare heading — they print in `status`, they block at C9 and at archive — while a heading that merely starts with the title (`## Openness`) is still not that section
