<!-- apriori-base: sha256:57772b70d03a15a5443f9770d9035874d9e03d0d5493c0e696fb211e7697d887 -->
# Delta — update (prototype-walk-guide)

## MODIFIED Requirements

### Requirement: apriori update refreshes tool-owned files after a CLI upgrade
`apriori update` SHALL refresh every tool-owned scaffolded file — the runbook copy (`apriori/runbook.md`) and per-tool command files that already exist — to the installed package's versions, SHALL never modify user-owned files and never create new per-tool files (the only creations permitted are protocol-required scaffolding, UP-05, and the prototype-walk guide's first install, PW-02), and SHALL report per-file what it did.

#### Scenario: UP-01 refreshes the runbook copy and existing command files
- WHEN `apriori update` runs in an initialized project whose `apriori/runbook.md` or existing per-tool command files differ from the installed package's copies
- THEN each differing file is rewritten to the packaged version and reported `updated`; identical files are reported `up-to-date`; exit 0

#### Scenario: UP-02 user-owned files are never touched
- WHEN `apriori update` runs
- THEN `apriori/process-config.md`, `specs/`, `changes/`, `review/`, `truth/`, and the tool rules files the init pointer was appended to (CLAUDE.md, AGENTS.md, …) are left byte-identical, and no new per-tool file is created (adding a tool is `apriori init`'s job); the only creations permitted are protocol-required scaffolding (UP-05) and the prototype-walk guide's first install (PW-02)

#### Scenario: UP-03 uninitialized project errors
- WHEN `apriori update` runs where `apriori/runbook.md` does not exist
- THEN it errors with a message naming `apriori init` and exits non-zero

#### Scenario: UP-04 --dry-run previews without writing
- WHEN `apriori update --dry-run` runs with stale files present
- THEN it reports what would be refreshed and writes nothing

#### Scenario: UP-05 protocol-required scaffolding is re-established
- WHEN `apriori update` runs in a project initialized before the gitignored scratch dir existed (no `apriori/.gitignore`)
- THEN it creates `apriori/.gitignore` (containing `tmp/`) and `apriori/tmp/`, so the refreshed runbook's "gitignored `apriori/tmp/`" claim holds; an existing `.gitignore` is never modified

## ADDED Requirements

### Requirement: update installs the prototype-walk guide once and then manages it like the runbook
`apriori update` SHALL treat `apriori/guides/prototype-walk.md` by its manifest state: never installed (not listed, not present) → install it and record it, reported `created (first install)` and counted as a refresh in the summary; listed and unmodified → refreshed to the package's guide (`updated` / `up-to-date`) and re-hashed; listed and locally modified → reported `modified` and left alone; listed but missing → reported missing and left to `apriori init` (the existing cure); present but not listed → reported `unmanaged` and left alone (never adopted). It never writes through a path that is not a regular file or that resolves outside the project, and `--dry-run` reports without writing. A CLI from before this change refuses a manifest that lists the guide (`not a refresh target`) — downgrading is not supported, and MIGRATING says so.

#### Scenario: PW-02 the guide is installed once, then refreshed, protected or left alone by its manifest state
- WHEN `apriori update` runs on a project an older CLI initialized (no guide, no entry), runs again, runs after the package's guide changed, runs after the user edited the guide, runs after the user deleted the listed guide, runs where an unlisted user file sits at the guide's path, and runs with `--dry-run` on a project without the guide
- THEN the first run creates the guide byte-identical to the package's, records it and reports `created (first install)` with the summary counting it; the second reports `up-to-date`; the changed package guide is `updated` and re-hashed; the edited guide is reported `modified` and keeps its bytes and its entry; the deleted one is reported missing and not recreated; the unlisted file is reported `unmanaged` and untouched; the dry run reports the creation and writes neither the guide nor the manifest

## Notes

Why: the owner decided on 2026-10-02 that the prototype-walk specification used on a real requirement enters apriori as a separate guide the runbook references, not as more runbook text, and that the runbook is not split now (Claude × Astra plan C-b, R59-CONSENSUS §四). It is also the first, deliberately small, test of the reference pattern — whether an agent reads a referenced file when the runbook tells it to — before any split is considered.
