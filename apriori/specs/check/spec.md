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

### Requirement: self-mode guards the split documentation set
`apriori check --self` SHALL extend its EN/CN pair coverage to the docs/ pairs (concepts, legacy, ci, cli, troubleshooting — `_cn` suffix convention) and SHALL resolve links relative to the linking file, validating cross-file fragments.

#### Scenario: CK-08 docs pairs are guarded, one-sided pairs fail
- WHEN `check --self` runs where a docs/ pair misaligns (heading count, level, or numeric prefix), or exactly ONE side of a pair exists
- THEN it FAILs naming the pair (or the missing mirror); WHEN both sides of a pair are absent THEN that pair is skipped and older checkouts pass as before

#### Scenario: CK-09 links resolve from the linking file and fragments are validated
- WHEN a checked file links `./y.md` or `./y.md#frag`
- THEN the target resolves relative to THAT file's directory (root files unchanged); a missing target file FAILs naming the linking file; and a fragment with no heading in the target slugifying (ghSlug) to it FAILs naming both — self-mode only
