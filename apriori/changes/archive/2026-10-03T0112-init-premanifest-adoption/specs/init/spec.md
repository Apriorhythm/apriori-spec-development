<!-- apriori-base: sha256:e95525f263fc9156b626f4ca4610be9decfd27d132f6f0749a84b38d287f2407 -->
# Delta — init (init-premanifest-adoption)

## MODIFIED Requirements

### Requirement: init records what it creates in the managed manifest
`apriori init` SHALL maintain `apriori/managed.json` entries ONLY for files it actually creates in a run: a fresh init records the runbook, the prototype-walk guide and each command file it wrote; init for an additional tool merges into a valid existing manifest preserving entries it didn't touch; a command file that already existed on disk is skipped as today and gains NO entry (existing content is never blind-adopted). When init creates a file that is absent on disk — including a manifest-listed file the user deleted as the prescribed cure — the entry is written/replaced with the hash of the bytes just written, so the next update sees `up-to-date`, not `modified`. Each entry is written the moment its file is created, so a run that fails at a later step leaves everything it created recorded (init never adopts what it finds, so an unrecorded file of its own would otherwise stay `unmanaged` on every retry). `init --dry-run` never writes or modifies the manifest (it reports would-be entries). A hygiene-invalid manifest (per the update module's rules) makes init exit nonzero before scaffolding or merging anything. A project with no manifest whose runbook predates the run as a regular file inside the project (initialized before `managed.json` existed, or its manifest deleted) is mid-migration: init records what it creates exactly as above and marks the manifest `"adoptPending": true` so that `apriori update`'s adoption on proof, which a manifest of only this run's files would otherwise end, still runs once (reported as `created (adoption pending — …)` / `merged (adoption pending — …)`); a later init keeps the mark; a runbook path that is a directory or a symlink sets none. Init itself still adopts nothing it finds.

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

#### Scenario: IN-21 init on a project without a manifest marks it mid-migration; update adopts, then clears the mark
- WHEN a project an older CLI initialized (no `managed.json`, an older runbook, no guide) runs `apriori init --tools claude,codex` with `--dry-run`, then for real, then init again; then (with one listed codex command edited) `apriori update --dry-run`, an update that throws midway, and an update that completes; then an unlisted command with shipped bytes appears; separately when the runbook path is a directory during init and is repaired before retrying, when a partial manifest an older init wrote is marked by hand, and when the mark is not a boolean
- THEN the dry init reports `created (adoption pending — …)` and writes nothing; the real init records codex's commands and the guide at once and marks the manifest; the later init keeps the mark; the dry update writes nothing; the throwing update keeps the mark (the runbook it already refreshed stays unrecorded); the completed update adopts the runbook and Claude's commands, reports the edited listed command `modified`, clears the mark, and records every entry it adopted or refreshed as the hash on disk (the edited listed command keeps its earlier hash); afterwards the unlisted shipped-bytes command is `unmanaged`; the directory-runbook project gets no mark, records what init created, and after the repair update reports those commands `up-to-date`; the hand-marked partial manifest adopts the runbook and Claude's commands while its edited listed entry stays `modified`; a non-boolean mark is refused naming `adoptPending`; and a fresh project and an ordinary add-tool init carry no mark

## Notes

Follow-up FU-2 of batch-review-fixes (registered there, measured on c290842): init on a manifest-less project wrote a manifest of only what that run created, and update — which adopts on proof only while no manifest exists — then reported the older runbook and command files `unmanaged`. The registered proposal (init writes no manifest in that case) was tried first; review round 1 found it left init's own new files unrecorded (the guide on platforms that cannot locate a descriptor; commands when the runbook path was a directory). On Astra's advice (lab round R59-R12) the change keeps init's immediate records and carries the owed adoption pass as an explicit mark instead; IN-14 (init adopts nothing it finds) and UP-06 (an ordinary manifest never adopts an unlisted file) are untouched. IN-13..IN-17 keep their ids; IN-21 is new.
