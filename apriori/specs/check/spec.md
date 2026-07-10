### Requirement: check ports the v2 doc checker to JS and adds ID coverage
`apriori check` SHALL reproduce every structural check of v2's `check_docs.py` in JS with equivalent behavior, and additionally enforce that every spec scenario carries a bindable ID.

#### Scenario: CK-01 anchor and file-link checks behave as v2
- WHEN a doc has a broken `](#anchor)` or `](./file)` link
- THEN check reports it and exits non-zero, matching the Python checker's verdict

#### Scenario: CK-02 EN/CN alignment checks behave as v2
- WHEN bilingual docs are present and their heading sequences or verdict phrases diverge
- THEN check reports the misalignment (same rules as the ported checker)

#### Scenario: CK-03 verdict-phrase-table and codex-command checks behave as v2
- WHEN a verdict-line drift variant or an EN/CN codex-command mismatch is introduced
- THEN check reports it (the v2.3 checkers 6-8, ported)

#### Scenario: CK-04 every spec scenario must carry an ID (new)
- WHEN a `#### Scenario:` heading in the spec store lacks a leading id-pattern match
- THEN check reports it as unbindable and exits non-zero (a scenario with no ID can never pass verify)

#### Scenario: CK-05 no OpenSpec adapter assertions remain
- WHEN check runs against v3 docs
- THEN it enforces the single plain-files interface (no `openspec/`-adapter dual-path assertions from v2)

### Requirement: check warns on a stale scaffolded runbook without failing
`apriori check` SHALL compare the project's scaffolded `apriori/runbook.md` (when present) against the installed package's `RUNBOOK.md` and warn on divergence, without turning the warning into a failure.

#### Scenario: CK-06 stale scaffolded runbook warns, never fails
- WHEN `apriori check` runs in a project whose `apriori/runbook.md` differs byte-wise from the installed package's runbook
- THEN it prints a warning naming `apriori update`, and RESULT stays PASS if nothing else failed; a missing `apriori/runbook.md` produces no warning

#### Scenario: CK-07 consumer mode is the default; self-checks require --self
- WHEN `apriori check` runs in a consumer project
- THEN only the spec-store checks (CK-04) and runbook freshness (CK-06) run — a consumer legitimately using OpenSpec or shipping its own README is never failed by apriori's handbook self-checks (EN/CN pairs, verdict phrases, codex forms, no-openspec), which run only under `--self`; and a missing spec-store path is an error (exit 2, naming `apriori init` when uninitialized), never a silent PASS
