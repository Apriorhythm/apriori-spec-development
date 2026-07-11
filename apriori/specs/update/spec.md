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

### Requirement: update refreshes only manifest-proven tool-owned files
`apriori update` SHALL consult `apriori/managed.json` (`{ "version": 1, "files": { "<relative path>": "sha256:<64hex>" } }`, hashes over the exact bytes the tool last wrote, never line-ending-normalized) and refresh a candidate file only when the manifest lists it AND its current content hash equals the recorded hash; after a real write the entry is updated to the new content's hash. A listed file with a differing hash is `modified` — skipped with a warning naming the file and the cure (delete it and rerun `apriori init --tools <t>`). An existing file with no entry is `unmanaged` — skipped, never written. A listed file absent on disk is `missing` — skipped (recreating is init's job). Skip-only runs still exit 0 and name every skip. When no manifest exists (pre-manifest project), update adopts what it can prove: the runbook unconditionally (refreshed as today), and each command file only if its content hash equals the current template or a known shipped generation (the package embeds every generation's sha256; a membership test over the live `templates/command.md` keeps the list honest); unproven content is `unmanaged`. The adoption pass writes the manifest. A manifest that exists but is unreadable, unparseable, missing `files`, hash-malformed, `version !== 1`, or carrying a key that is absolute, contains `..`, or is outside the allowed refresh-target set (`apriori/runbook.md`, `TOOLS[*].command`) SHALL make update exit nonzero naming the defect before touching any target; every write additionally requires realpath containment under the project root. `--dry-run` produces the identical report and writes nothing — the manifest included.

#### Scenario: UP-06 a foreign file at a tool path survives update
- WHEN a file exists at an unselected tool's command path with no manifest entry
- THEN update leaves it byte-identical, reports `unmanaged` with the cure hint, and exits 0

#### Scenario: UP-07 an unmodified managed file refreshes and re-hashes
- WHEN a manifest-listed command file matches its recorded hash but the package template has changed
- THEN update rewrites it from the template and the manifest entry becomes the new content's hash

#### Scenario: UP-08 a locally modified managed file is protected
- WHEN a manifest-listed file (the runbook included) differs from its recorded hash
- THEN update reports `modified` with the cure hint and leaves the file byte-identical, and `--dry-run` gives the same report while writing nothing at all

#### Scenario: UP-09 pre-manifest projects are adopted only on proof
- WHEN no manifest exists and command files variously match the current template, match a known shipped generation, or carry arbitrary content
- THEN the matching files are adopted (up-to-date / refreshed respectively), the arbitrary one is `unmanaged` and untouched, the runbook refreshes as before, and the manifest is written (except under `--dry-run`)

#### Scenario: UP-10 manifest hygiene fails closed
- WHEN `apriori/managed.json` is invalid JSON, lacks `files`, carries a malformed hash or `version: 2`, or lists an absolute, `..`-containing, or non-refresh-target path
- THEN update exits nonzero naming the manifest defect and no managed target is touched, identically under `--dry-run`

#### Scenario: UP-11 the shipped-generation list stays honest
- WHEN the live `templates/command.md` is hashed
- THEN the digest is a member of the package's embedded generation list (changing the template without appending fails the suite)
