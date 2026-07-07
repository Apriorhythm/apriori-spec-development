### Requirement: apriori update refreshes tool-owned files after a CLI upgrade
`apriori update` SHALL refresh every tool-owned scaffolded file — the runbook copy (`apriori/runbook.md`) and per-tool command files that already exist — to the installed package's versions, SHALL never create new files or modify user-owned files, and SHALL report per-file what it did.

#### Scenario: UP-01 refreshes the runbook copy and existing command files
- WHEN `apriori update` runs in an initialized project whose `apriori/runbook.md` or existing per-tool command files differ from the installed package's copies
- THEN each differing file is rewritten to the packaged version and reported `updated`; identical files are reported `up-to-date`; exit 0

#### Scenario: UP-02 user-owned files are never touched
- WHEN `apriori update` runs
- THEN `apriori/process-config.md`, `specs/`, `changes/`, `review/`, `truth/`, and the tool rules files the init pointer was appended to (CLAUDE.md, AGENTS.md, …) are left byte-identical, and no new file is created (adding a tool is `apriori init`'s job)

#### Scenario: UP-03 uninitialized project errors
- WHEN `apriori update` runs where `apriori/runbook.md` does not exist
- THEN it errors with a message naming `apriori init` and exits non-zero

#### Scenario: UP-04 --dry-run previews without writing
- WHEN `apriori update --dry-run` runs with stale files present
- THEN it reports what would be refreshed and writes nothing
