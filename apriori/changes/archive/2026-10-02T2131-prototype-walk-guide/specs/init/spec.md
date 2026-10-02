<!-- apriori-base: sha256:a6742268969b0cf39bf42670c526a630b7f43f23034e649ec19db1447a3a7f3f -->
# Delta — init (prototype-walk-guide)

## MODIFIED Requirements

### Requirement: init records what it creates in the managed manifest
`apriori init` SHALL maintain `apriori/managed.json` entries ONLY for files it actually creates in a run: a fresh init records the runbook, the prototype-walk guide and each command file it wrote; init for an additional tool merges into a valid existing manifest preserving entries it didn't touch; a command file that already existed on disk is skipped as today and gains NO entry (existing content is never blind-adopted). When init creates a file that is absent on disk — including a manifest-listed file the user deleted as the prescribed cure — the entry is written/replaced with the hash of the bytes just written, so the next update sees `up-to-date`, not `modified`. `init --dry-run` never writes or modifies the manifest (it reports would-be entries). A hygiene-invalid manifest (per the update module's rules) makes init exit nonzero before scaffolding or merging anything.

#### Scenario: IN-13 fresh init writes the manifest for exactly what it created
- WHEN `apriori init --tools <t>` scaffolds a new project
- THEN `apriori/managed.json` lists the runbook, the prototype-walk guide and the created command file(s) with hashes of the written bytes, and nothing else

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

## ADDED Requirements

### Requirement: init installs the prototype-walk guide as one managed file
The package SHALL ship `guides/prototype-walk.md` (listed in `package.json`'s `files`), and `apriori init` SHALL install it as `apriori/guides/prototype-walk.md` — one exact tool-owned file, never the directory around it — recording it in `apriori/managed.json` like the runbook. Init never overwrites: an existing file at that path is skipped and gains no entry; a path that is not a regular file, a non-directory at `apriori/guides`, or a path resolving outside the project is skipped with the reason; `--dry-run` writes nothing.

#### Scenario: PW-01 init installs the guide byte-for-byte and records it, and skips what is not its own
- WHEN `apriori init --tools claude` runs in a new project, in a project that already has a user file at `apriori/guides/prototype-walk.md`, in one where `apriori/guides` is a regular file, in one where `apriori/guides` is a symlink out of the project, and with `--dry-run`
- THEN the new project gets the guide byte-identical to the package's `guides/prototype-walk.md` with its manifest entry; the user file is untouched and gains no entry; the other two are skipped with a reason naming the path and nothing is written outside the project; the dry run reports the would-be creation and writes nothing; and `package.json`'s `files` lists `guides/`

## Notes

Why: the owner decided on 2026-10-02 that the prototype-walk specification used on a real requirement enters apriori as a separate guide the runbook references, not as more runbook text, and that the runbook is not split now (Claude × Astra plan C-b, R59-CONSENSUS §四). It is also the first, deliberately small, test of the reference pattern — whether an agent reads a referenced file when the runbook tells it to — before any split is considered.
