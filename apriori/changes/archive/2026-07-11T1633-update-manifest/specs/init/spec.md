<!-- apriori-base: sha256:d92c4f73af6dda00037a2dd18aa28eca48995c90462bed8e967eb63c3b9dc088 -->
# Delta — init (update-manifest)

## ADDED Requirements

### Requirement: init records what it creates in the managed manifest
`apriori init` SHALL maintain `apriori/managed.json` entries ONLY for files it actually creates in a run: a fresh init records the runbook and each command file it wrote; init for an additional tool merges into a valid existing manifest preserving entries it didn't touch; a command file that already existed on disk is skipped as today and gains NO entry (existing content is never blind-adopted). When init creates a file that is absent on disk — including a manifest-listed file the user deleted as the prescribed cure — the entry is written/replaced with the hash of the bytes just written, so the next update sees `up-to-date`, not `modified`. `init --dry-run` never writes or modifies the manifest (it reports would-be entries). A hygiene-invalid manifest (per the update module's rules) makes init exit nonzero before scaffolding or merging anything.

#### Scenario: IN-13 fresh init writes the manifest for exactly what it created
- WHEN `apriori init --tools <t>` scaffolds a new project
- THEN `apriori/managed.json` lists the runbook and the created command file(s) with hashes of the written bytes, and nothing else

#### Scenario: IN-14 add-tool init merges without adopting bystanders
- WHEN init runs for an additional tool in a project where another tool's command path already carries a user file
- THEN the new tool's created file gains an entry, existing entries are preserved, and the pre-existing user file gains no entry (a later update reports it `unmanaged`)

#### Scenario: IN-15 the delete-and-reinit cure closes cleanly
- WHEN a managed file was locally modified, deleted, and `apriori init --tools <t>` recreates it
- THEN the manifest entry is refreshed to the recreated bytes and the next update reports `up-to-date`

#### Scenario: IN-16 init dry-run leaves the manifest alone
- WHEN `apriori init --dry-run` runs fresh or for an additional tool
- THEN the manifest is not created or changed, while the report shows the would-be entries

#### Scenario: IN-17 a hygiene-invalid manifest blocks init
- WHEN `apriori/managed.json` exists but is invalid per the hygiene rules
- THEN init exits nonzero naming the defect and writes nothing
