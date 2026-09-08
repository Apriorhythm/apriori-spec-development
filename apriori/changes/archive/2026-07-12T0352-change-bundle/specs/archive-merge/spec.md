<!-- apriori-base: sha256:c6d1c0ddc5e837720e6645cd13bedf33466db633e10bb9b8f5ff450b7bdf0c9c -->
# Delta — archive-merge (change-bundle)

## REMOVED Requirements

### Requirement: archive stages the requirement history into the change before the move

## ADDED Requirements

### Requirement: the atomic move carries the whole bundle
`archiveChange` SHALL have no staging phase and no post-commit writes of any kind: with `--write` and an explicit `--changes-dir`, the change dir — which by the bundle layout already contains `requirement/`, `review/`, `gap-report.md`, and everything else the change owns — moves to `archive/<stamp>-<name>/` in the existing single atomic rename, carrying it all. The command reads and writes nothing under any legacy root; it is track-agnostic and never deletes `spike/` (executor protocol). Dry-run and the single-file form behave as before.

#### Scenario: AM-36 the bundle travels whole
- WHEN a bundle change carrying requirement/ (req versions + intent card), review/ (ledger, docs, raws), and gap-report.md archives with --write --changes-dir
- THEN the archived dir contains all of them byte-identically, nothing is left behind in the live changes dir, no staging or copy lines appear in the report, and the exit is 0

#### Scenario: AM-37 the command touches nothing outside the moved dir
- WHEN the same archive runs
- THEN no file outside `changes/<name>/` and the store files is read for staging or written — there is no requirement-staging code path at all

#### Scenario: AM-38 move failure keeps the bundle intact and rerunnable
- WHEN the dir move is made to fail (DI seam)
- THEN stores stay committed, the untouched bundle remains in flight with all its contents, the existing move-failure taxonomy reports the rerun cure, and a rerun completes the move with the bundle intact

#### Scenario: AM-39 non-move paths are unaffected
- WHEN a change runs dry-run, omits --changes-dir, or uses the single-file form
- THEN behavior is byte-identical to before — no move, no bundle handling
