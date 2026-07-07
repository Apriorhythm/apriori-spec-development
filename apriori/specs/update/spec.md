### Requirement: apriori update refreshes tool-owned files after a CLI upgrade
`apriori update` SHALL refresh every tool-owned scaffolded file — the runbook copy (`apriori/runbook.md`) and per-tool command files that already exist — to the installed package's versions, SHALL never modify user-owned files and never create new per-tool files (the only creation permitted is protocol-required scaffolding, UP-05), and SHALL report per-file what it did.

#### Scenario: UP-01 refreshes the runbook copy and existing command files
- WHEN `apriori update` runs in an initialized project whose `apriori/runbook.md` or existing per-tool command files differ from the installed package's copies
- THEN each differing file is rewritten to the packaged version and reported `updated`; identical files are reported `up-to-date`; exit 0

#### Scenario: UP-02 user-owned files are never touched
- WHEN `apriori update` runs
- THEN `apriori/process-config.md`, `specs/`, `changes/`, `review/`, `truth/`, and the tool rules files the init pointer was appended to (CLAUDE.md, AGENTS.md, …) are left byte-identical, and no new per-tool file is created (adding a tool is `apriori init`'s job); the only creation permitted is protocol-required scaffolding (UP-05)

#### Scenario: UP-03 uninitialized project errors
- WHEN `apriori update` runs where `apriori/runbook.md` does not exist
- THEN it errors with a message naming `apriori init` and exits non-zero

#### Scenario: UP-04 --dry-run previews without writing
- WHEN `apriori update --dry-run` runs with stale files present
- THEN it reports what would be refreshed and writes nothing

#### Scenario: UP-05 protocol-required scaffolding is re-established
- WHEN `apriori update` runs in a project initialized before the gitignored scratch dir existed (no `apriori/.gitignore`)
- THEN it creates `apriori/.gitignore` (containing `tmp/`) and `apriori/tmp/`, so the refreshed runbook's "gitignored `apriori/tmp/`" claim holds; an existing `.gitignore` is never modified
