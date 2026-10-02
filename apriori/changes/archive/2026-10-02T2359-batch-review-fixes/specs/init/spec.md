<!-- apriori-base: sha256:fac02666bc78da0e09b54c5fb9ebd61e378d66638e3a92bb6621474d6ed9cce2 -->
# Delta — init (batch-review-fixes)

## MODIFIED Requirements

### Requirement: init records what it creates in the managed manifest
`apriori init` SHALL maintain `apriori/managed.json` entries ONLY for files it actually creates in a run: a fresh init records the runbook, the prototype-walk guide and each command file it wrote; init for an additional tool merges into a valid existing manifest preserving entries it didn't touch; a command file that already existed on disk is skipped as today and gains NO entry (existing content is never blind-adopted). When init creates a file that is absent on disk — including a manifest-listed file the user deleted as the prescribed cure — the entry is written/replaced with the hash of the bytes just written, so the next update sees `up-to-date`, not `modified`. Each entry is written the moment its file is created, so a run that fails at a later step leaves everything it created recorded (init never adopts what it finds, so an unrecorded file of its own would otherwise stay `unmanaged` on every retry). `init --dry-run` never writes or modifies the manifest (it reports would-be entries). A hygiene-invalid manifest (per the update module's rules) makes init exit nonzero before scaffolding or merging anything.

#### Scenario: IN-13 fresh init writes the manifest for exactly what it created
- WHEN `apriori init --tools <t>` scaffolds a new project
- THEN `apriori/managed.json` lists the runbook, the prototype-walk guide and the created command file(s) with hashes of the written bytes, and nothing else; and when a fresh `--tools claude,cursor` run throws after Claude's command files were written (`.cursor` is a file), the manifest already lists the runbook, the guide and both Claude command files, and once the obstruction is gone `apriori update` reports those commands `up-to-date`, not `unmanaged`

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

### Requirement: init installs the prototype-walk guide as one managed file
The package SHALL ship `guides/prototype-walk.md` (listed in `package.json`'s `files`), and `apriori init` SHALL install it as `apriori/guides/prototype-walk.md` — one exact tool-owned file, never the directory around it — recording it in `apriori/managed.json` like the runbook — the moment it is created, as every file init creates is recorded. Init never overwrites: the guide is created exclusively, so whatever appears at the path after the checks (a file, a symlink) is never followed or overwritten — it is skipped with a reason and gains no entry; an existing file at that path is skipped and gains no entry; a path that is not a regular file, a non-directory at `apriori/guides`, or a path resolving outside the project is skipped with the reason; `--dry-run` writes nothing.

#### Scenario: PW-01 init installs the guide byte-for-byte and records it, and skips what is not its own
- WHEN `apriori init --tools claude` runs in a new project, in a project that already has a user file at `apriori/guides/prototype-walk.md`, in one where `apriori/guides` is a regular file, in one where `apriori/guides` is a symlink out of the project, in one where a symlink to a file outside the project appears at the guide's path right after `apriori/guides` is made, in one whose `CLAUDE.md` is a directory (init throws after the guide is created), and with `--dry-run`
- THEN the new project gets the guide byte-identical to the package's `guides/prototype-walk.md` with its manifest entry; the user file is untouched and gains no entry; the other two are skipped with a reason naming the path and nothing is written outside the project; the planted symlink is reported `changed during install (skipped — …)`, its target is untouched and no entry is made; the failing init still leaves the created guide recorded; the dry run reports the would-be creation and writes nothing; and `package.json`'s `files` lists `guides/`

## Notes

Batch review (10-02, c290842) guide-1: the first-install copy followed a symlink created between the checks and the copy; it is now an exclusive create (`wx`). Residual, stated in MIGRATING and the code: `apriori/guides` swapped for an outside symlink in that window can still receive a new file (never an overwrite). guide-2: the manifest is written as soon as the guide exists. Review round 1 (BRF-R2): recording only the guide early left a manifest behind that stranded command files created later in a run that then failed (update adopts commands only when no manifest exists); every created file is now recorded the moment it exists — IN-13 covers it. IN-13..IN-17 and PW-01 keep their ids.
