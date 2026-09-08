# Requirement — update-manifest (v2)

change: update-manifest
target lineage: **v3 branch**. Next patch/minor. Fail-closed tightening: `apriori update` stops overwriting files it cannot prove it owns; unmodified tool-owned files keep refreshing exactly as today.

Revisions vs v1 (P1 r1): UM-1 manifest hygiene fails closed; UM-2 entry containment + allowed-path set; UM-3 init --dry-run never touches the manifest; UM-4 init records ONLY what it creates; UM-5 init-recreate refreshes the entry hash; UM-ADV-1 CRLF consequence explicit, F6 reworded, full ancestor hashes inlined.

## Background — the problem (current state A, code-verified)

`lib/update.js` `run()` refreshes any file that merely EXISTS at a TOOLS command path: `if (fs.existsSync(p)) actions.push({file: rel, action: refresh(p, ...)})`. Existence is the only test — there is no record of what init actually created. Two failure modes:

1. **Foreign file clobbered.** The user (or another tool) owns a file at a command path init never touched — e.g. their own `.claude/commands/apriori.md` written before ever selecting the claude tool. `update` silently replaces it with `templates/command.md`.
2. **Customization reverted.** A command file init DID create, later customized by the user, is silently reset to the pristine template on every `update`.

The closing line `update` prints — "user-owned files … are never touched" — is false for both. (GPT-5.6 second review, defect #5.)

## Goal (target state B)

`init` records what it creates; `update` refreshes only what the manifest proves is tool-owned AND unmodified. Everything else is reported and left byte-identical.

**Manifest** — `apriori/managed.json`, written by init and maintained by update:
```json
{ "version": 1, "files": { "apriori/runbook.md": "sha256:<64hex>", ".claude/commands/apriori.md": "sha256:<64hex>" } }
```
Hashes are over the exact bytes the tool last wrote (same `sha256:<hex>` vocabulary as CAS stamps; NOT line-ending-normalized — we hash what we wrote; consequence declared under Platform note). Scope: the refresh targets only (runbook + per-tool command files). `process-config.md`, rules-file pointers, specs/, `.gitignore` stay outside — update never rewrites them anyway.

**Manifest hygiene (UM-1/UM-2, fail closed):** when `apriori/managed.json` exists but is unreadable, unparseable JSON, missing a `files` object, carries a malformed hash value, or has `version !== 1`, BOTH `update` (including `--dry-run`) and `init` on that project exit nonzero naming the manifest and the defect BEFORE touching any managed target or merging anything. Every `files` key must be a normalized relative path — never absolute, never containing a `..` segment — and must belong to the allowed refresh-target set (`apriori/runbook.md` or one of the current `TOOLS[*].command` paths); any other key is a hygiene error, same fail-closed exit. Before any write, the resolved target must pass realpath containment under the project root (a symlinked escape is a hygiene error, not a write).

**update semantics (per candidate file):**
- listed in manifest + current hash == manifest hash → refresh from the package source as today (`updated`/`up-to-date`); after a real write, store the new hash.
- listed + current hash ≠ manifest hash → **`modified` — skipped**, warning naming the file: locally modified since the tool last wrote it — left untouched (delete it and rerun `apriori init --tools <t>` to hand it back).
- exists on disk but NOT listed → **`unmanaged` — skipped** with the same cure hint. Never written.
- listed but missing on disk → **`missing` — skipped** (recreating is init's job; see init rules for how the cure closes).
- `--dry-run` reports all of the above and writes nothing — including the manifest.

**init manifest rules (UM-3/UM-4/UM-5):**
- init records a manifest entry ONLY for a file it actually CREATES in that run (fresh runbook, fresh command files). A command file that already exists on disk is skipped by init today and gains NO entry and NO hash change — existing content is never blind-adopted (that would launder foreign files into managed ownership).
- When init creates a file that is absent on disk — including one the manifest lists whose disk file was deleted (the prescribed `modified`/`unmanaged` cure) — it writes/replaces that entry with the hash of the bytes it just wrote, closing the cure loop with a fresh hash.
- init on an existing project merges into a valid existing manifest (preserving entries it didn't touch); a hygiene-invalid manifest blocks init per the hygiene rule.
- `init --dry-run` never writes or modifies the manifest; it reports the entries it would create/merge.

**Migration (no manifest on disk — every pre-manifest project):** update ADOPTS what it can prove:
- `apriori/runbook.md`: adopted unconditionally and refreshed as today — it is the init precondition, declared tool-owned since 1.0.
- each existing command file: adopted iff its current content hash equals the CURRENT package template or a KNOWN ANCESTOR (the package embeds the sha256 of every template generation ever shipped — today exactly two: current `sha256:4ada03a2b8a9d6b86fd610e0f4363c31dcea2ba2460d6e96e1231004e4a9c8a0`, pre-front-door `sha256:1dfa5eece0f3c109aae765aa52ffb89f59c0f0f3b494f9430148ac6baeeab046`). Match → adopt + refresh. No match → `unmanaged` skip (fail closed: content we never wrote is not ours to replace).
- The adoption pass writes the manifest (unless `--dry-run`).

**Output:** the per-file action column gains `modified`/`unmanaged`/`missing`; the closing "never touched" line becomes literally true.

**Platform note (declared consequence):** hashes are over exact bytes, so a checkout/tool that rewrites line endings after init (e.g. git autocrlf) makes the file `modified` — update SKIPS it rather than normalizing. Protecting bytes we can't account for beats guessing; the warning names the file.

## Acceptance criteria (testable)

- F1. Repro 1: a foreign file at an unselected tool's command path (no manifest entry) survives `update` byte-identical; the report says `unmanaged` with the cure hint.
- F2. A manifest-listed, unmodified command file whose package template has changed → refreshed; the manifest hash is updated to the new content.
- F3. A manifest-listed file with local edits → `modified` skip, byte-identical afterward; `--dry-run` gives the same report and writes nothing (manifest included).
- F4. Pre-manifest project: a command file byte-equal to the current template → adopted, `up-to-date`; byte-equal to the known-ancestor template → adopted + `updated`; arbitrary content → `unmanaged` skip. In all three, the manifest exists afterward (except under `--dry-run`).
- F5. `init` records only what it creates: fresh init covers the runbook + created command files; add-tool init merges preserving other entries; a command file that already existed on disk gains no entry (and a later `update` reports it `unmanaged`).
- F6. Pre-manifest runbook refreshes as today; once a manifest lists it, a locally-modified runbook is protected (`modified` skip) like any managed file.
- F7. `update` exit code stays 0 for skip-only runs (skips are reports, not failures); output names every skip.
- F8. Manifest hygiene fails closed: invalid JSON / missing `files` / bad hash value / `version: 2` / an absolute or `..` or non-refresh-target key → update AND init exit nonzero naming the defect, no managed target touched, `--dry-run` identical.
- F9. Deleting a modified managed file and rerunning `init --tools <t>` recreates it AND refreshes its manifest hash; the next `update` reports `up-to-date`, not `modified`.
- F10. `init --dry-run` (fresh and add-tool) leaves the manifest absent/unchanged while reporting would-be entries.
- F11. A live-template guard test: hashing `templates/command.md` on disk must yield a member of the embedded generation list (forgetting to append on a template change fails CI).
- F12. All existing tests pass; suite + verify + gate + check --self green.

## Out of scope

- Rules-file pointer blocks (append-only at init, never refreshed — unchanged).
- `--force` overwrite flag (not offered this minor; the cure is delete + re-init).
- Windows Git Bash resolution (P0-4, next change).

## Decisions proposed

- DD-1: manifest lives at `apriori/managed.json` (inside the apriori dir, next to runbook.md; trackable by git; NOT dot-prefixed so it is visible and greppable).
- DD-2: byte-exact hashing with the CRLF consequence declared rather than normalized-away — protecting unaccountable bytes beats guessing.
- DD-3: known-generation hashes are a hardcoded array in lib/update.js, appended whenever templates/command.md changes — enforced by F11's live-template membership test.
