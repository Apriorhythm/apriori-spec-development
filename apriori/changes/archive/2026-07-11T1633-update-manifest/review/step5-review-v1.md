# P8 implementation review — update-manifest (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/update-manifest-impl-review-v1-raw.txt

**Implementation Review — update-manifest v1**

The implementation broadly matches the converged design: `managed.json` hygiene is centralized, init reads the manifest before scaffold writes, init records only files created in the current run, dry-run guards manifest writes, update protects modified/unmanaged files, and the known-template generation guard is present.

I found two spec-vs-code gaps.

**Issues**

**UMIMPL-1 — Manifest-listed missing command files are silently omitted**

Description: `consider()` has the correct `missing` branch, but `update.run()` only calls `consider()` for command paths that currently exist on disk. A manifest-listed command file that was deleted is never considered, so no `missing` action row is emitted.

Risk: Violates the contract that listed-but-missing files are reported as `missing` and that output names every skip. Users following the delete-and-reinit cure lose the diagnostic that init is now required.

Suggested fix: Track considered rels, then after the TOOLS loop iterate manifest-listed command entries not seen and emit `missing` for absent files. Add a test: init a command tool, delete its command file, run update, assert the action row is `missing`.

**UMIMPL-2 — Backslash manifest keys pass hygiene but are not canonicalized**

Description: `readManifest()` validates keys after `rel.replace(/\\/g, '/')`, but returns the original `doc.files` keys. A manifest entry like `.claude\\commands\\apriori.md` can pass the allowed-target check, but update later looks for `.claude/commands/apriori.md`, so the file is treated as unlisted/unmanaged. Init can also preserve the backslash key while adding a normalized key later.

Risk: Manifest hygiene is inconsistent with the normalized-key contract, and behavior diverges by hand-edited or Windows-shaped manifests.

Suggested fix: Either reject any key where `rel !== norm`, or canonicalize returned manifest keys to `norm` before consumers use them. Add an F8-style test for backslash keys.

**Advisories**

- UP-10 covers syntactic path hygiene but not symlink containment. Add a test where a manifest-listed command path is a symlink escaping the project and assert update fails before hashing.
- `refresh()` still compares/writes UTF-8 strings while manifest hashes are byte-based. Markdown inputs make this low risk, but byte-based read/write would align more directly with the manifest contract.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| UMIMPL-1 | Manifest-listed missing command files are never considered, so update omits the required `missing` action row. | Missing managed files are not reported; the prescribed init cure is not surfaced. | STEP5·r1 | open |
| UMIMPL-2 | Backslash manifest keys pass hygiene but are returned uncanonicalized, so consumers treat them as different paths. | Normalized-key contract is violated and manifest behavior becomes inconsistent. | STEP5·r1 | open |
| UMIMPL-ADV-1 | Add direct symlink-containment and byte-based refresh alignment tests. | Advisory test/implementation hardening. | STEP5·r1 | open |

VERDICT: 2 issues open
