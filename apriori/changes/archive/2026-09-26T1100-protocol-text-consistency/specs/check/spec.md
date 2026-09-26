<!-- apriori-base: sha256:1a9bb2cdf65cb8db19ecc99f7f3c5d5fa37df81d9dd4102a5436da3cfc493f07 -->
# Delta — check (protocol-text-consistency)

## MODIFIED Requirements

### Requirement: check ports the v2 doc checker to JS and adds ID coverage
`apriori check` SHALL carry, in JS, the structural checks that v2's `check_docs.py` once ran (anchors, file links, EN/CN heading alignment, the verdict-phrase table imported from `lib/review.js`, the codex command forms), and additionally enforce that every spec scenario carries a bindable ID. The Python script itself is retired: it has no caller, its phrase table drifted from the runbook, and its README KB-section check lost its target when that section moved to the handbook — `apriori check` is the only checker, and no repository file invokes `check_docs.py`.

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

#### Scenario: CK-18 the v2 script is gone and nothing calls it
- WHEN the repository is scanned for `scripts/check_docs.py` and for references to `check_docs.py` outside the CHANGELOG
- THEN the file is absent, `package.json`, the CI workflow and the docs reference only `apriori check`, and `apriori check --self` passes on the repository itself

## Notes

Why: scripts/check_docs.py has no caller, fails on retired vocabulary and is superseded by lib/check.js (a superset whose verdict vocabulary is imported from lib/review.js). Keeping a second checker with its own phrase table is the drift check.js exists to prevent; the script is removed and the requirement says what check carries, not what it reproduces.
