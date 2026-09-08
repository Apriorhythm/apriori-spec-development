# P1 requirement review — update-manifest (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/update-manifest-req-review-v1-raw.txt

**Requirement Review — update-manifest v1**

**Dimension Verdicts**

1. Target state B: Mostly clear, but manifest trust/error semantics are under-specified.
2. Edge/exception coverage: Missing important failure paths: corrupt/unknown manifest, path containment, and init dry-run behavior.
3. Side effects: Manifest creation/update is declared, but init’s existing overwrite behavior needs a sharper manifest rule.
4. Acceptance criteria: F1-F8 cover the core ownership cases, but not enough boundary/error cases.
5. State-A conflicts: The current code matches the problem statement. Template hashes are plausible: current `4ada03a2...`, pre-front-door `1dfa5eec...`.
6. Lineage: Declared and consistent with the repo.

**Formal Issues**

**UM-1 — Corrupt or unsupported `apriori/managed.json` behavior is undefined**

Description: The requirement defines the manifest shape but does not say what `update` or `init` should do when `apriori/managed.json` exists but is invalid JSON, has no `files`, has malformed hash values, or has an unsupported `version`.

Risk: Implementers may fail open and fall back to pre-manifest adoption, overwriting user files despite the presence of an untrusted ownership record. Or they may crash with an unhelpful stack trace.

Suggested fix: Add a fail-closed rule and acceptance case: if `managed.json` exists but is unreadable, invalid, unsupported-version, or schema-invalid, `update` exits nonzero before touching any managed target; `--dry-run` reports the same; `init --tools` also refuses to merge until the manifest is fixed.

**UM-2 — Manifest path containment is unspecified**

Description: The manifest maps relative paths to hashes, but the requirement does not constrain entries to safe in-project refresh targets. A malicious or corrupted manifest could list `../outside.md`, an absolute path, or a symlinked path escaping the project.

Risk: `update` could read/hash or overwrite files outside the project, which is a correctness and security issue.

Suggested fix: Specify that manifest entries must be normalized relative paths, never absolute, never containing `..`, and must be one of the declared refresh target paths: `apriori/runbook.md` or current `TOOLS[*].command` paths. Any other entry is a manifest hygiene error that fails closed before writing. If symlinks are possible, require realpath containment before any read/write.

**UM-3 — `init --dry-run` manifest behavior is not declared**

Description: F5 says `init` writes the manifest covering created files and merges for added tools, while update semantics say `--dry-run` writes nothing. But init also supports dry-run behavior through preview/scaffold, and the requirement does not say whether init dry-run should report manifest actions, omit them, or leave manifest untouched.

Risk: Tests and implementation can diverge on whether dry-run init mutates or previews `apriori/managed.json`.

Suggested fix: Add an explicit rule: init dry-run never writes or modifies the manifest, but reports what manifest entries would be created/merged if useful. Add an acceptance case covering fresh init dry-run and add-tool dry-run.

**UM-4 — `init` merge semantics can erase a modified-file hash without an explicit rule**

Description: State A `init` skips existing command files and only creates missing ones. The requirement says init on an existing project merges into the manifest, but does not state what happens when the file exists and differs from an existing manifest hash, or exists without a manifest entry. If init blindly records the current hash for a skipped file, it can reclassify a modified or foreign file as managed, allowing future update to overwrite it.

Risk: The manifest can become a laundering mechanism for user-owned or modified files, recreating the clobber bug through `init --tools`.

Suggested fix: Define init manifest writes only for files it actually creates in that run, plus newly created runbook on fresh init. For skipped existing command files, do not add or change a manifest entry; report unmanaged/skipped if needed. If init overwrites or recreates a missing managed file in a future design, then and only then update that hash.

**UM-5 — Missing managed file hand-back flow is contradictory**

Description: Update says a listed-but-missing file is `missing` and recreating is init’s job. But F5/init merge semantics do not define what happens when a manifest-listed command file is missing and the user reruns `apriori init --tools <t>`. Current `init` would create the missing file; the requirement does not say whether the manifest hash must then be updated from `missing` to the new content.

Risk: A user following the prescribed cure can end with a recreated file but a stale manifest hash, causing the next update to classify it as `modified`.

Suggested fix: Add a rule: when init creates a file that is absent on disk, it writes/replaces that file’s manifest entry with the hash of the bytes it just wrote. This is distinct from skipped existing files, whose manifest entries must not be adopted blindly.

**Advisories**

- CRLF exact-byte hashing is declared. That is acceptable, but the Windows consequence should be explicit: if a checkout rewrites bytes after init/update, update will report `modified` and skip rather than normalize.
- F6’s “runbook refreshes exactly as today in every scenario” conflicts slightly with the same sentence’s modified-runbook skip under a manifest. Consider rewording to “pre-manifest runbook refreshes as today; manifest-listed modified runbook is protected.”
- DD-3’s hardcoded ancestor list is reasonable; include the full hashes in the final requirement or tests, not only abbreviated prefixes.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| UM-1 | Corrupt, schema-invalid, unreadable, or unsupported-version `apriori/managed.json` behavior is undefined. | Implementer may fail open and overwrite files despite an untrusted manifest. | P1·r1 | open |
| UM-2 | Manifest path containment and allowed-path validation are unspecified. | Malicious/corrupt manifest entries could read or overwrite files outside the project. | P1·r1 | open |
| UM-3 | `init --dry-run` manifest behavior is not declared. | Dry-run tests and implementation may disagree or mutate unexpectedly. | P1·r1 | open |
| UM-4 | `init` merge semantics can blindly adopt skipped existing or modified files into the manifest. | User-owned/modified files can be laundered into managed ownership and later clobbered. | P1·r1 | open |
| UM-5 | Missing managed file hand-back through `init` is not specified. | User follows the cure but manifest remains stale, causing false `modified` later. | P1·r1 | open |
| UM-ADV-1 | CRLF consequence, F6 wording, and full ancestor hashes should be made explicit. | Advisory precision. | P1·r1 | open |

VERDICT: 5 issues open
