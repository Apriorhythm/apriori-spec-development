# Requirement — update-manifest (v1)

change: update-manifest
target lineage: **v3 branch**. Next patch/minor. Fail-closed tightening: `apriori update` stops overwriting files it cannot prove it owns; unmodified tool-owned files keep refreshing exactly as today.

## Background — the problem (current state A, code-verified)

`lib/update.js` `run()` refreshes any file that merely EXISTS at a TOOLS command path: `if (fs.existsSync(p)) actions.push({file: rel, action: refresh(p, ...)})`. Existence is the only test — there is no record of what init actually created. Two failure modes:

1. **Foreign file clobbered.** The user (or another tool) owns a file at a command path init never touched — e.g. their own `.claude/commands/apriori.md` written before ever selecting the claude tool, or a hand-rolled `.codex/prompts/apriori.md`. `update` silently replaces it with `templates/command.md`.
2. **Customization reverted.** A command file init DID create, later customized by the user (team-specific instructions appended), is silently reset to the pristine template on every `update`.

The closing line `update` prints — "user-owned files … are never touched" — is false for both. (GPT-5.6 second review, defect #5.)

## Goal (target state B)

`init` records what it creates; `update` refreshes only what the manifest proves is tool-owned AND unmodified. Everything else is reported and left byte-identical.

**Manifest** — `apriori/managed.json`, written by init and maintained by update:
```json
{ "version": 1, "files": { "apriori/runbook.md": "sha256:<64hex>", ".claude/commands/apriori.md": "sha256:<64hex>" } }
```
Hashes are over the exact bytes the tool last wrote (same `sha256:<hex>` vocabulary as CAS stamps; LF/CRLF NOT normalized — we hash what we wrote). Scope: the refresh targets only (runbook + per-tool command files). `process-config.md`, rules-file pointers, specs/, `.gitignore` stay outside — update never rewrites them anyway.

**update semantics (per candidate file):**
- listed in manifest + current hash == manifest hash → refresh from the package source as today (`updated`/`up-to-date`); after a real write, store the new hash.
- listed + current hash ≠ manifest hash → **`modified` — skipped**, warning naming the file: locally modified since the tool last wrote it — left untouched (delete it and rerun `apriori init --tools <t>` to hand it back).
- exists on disk but NOT listed → **`unmanaged` — skipped** with the same cure hint. Never written.
- listed but missing on disk → **`missing` — skipped** (recreating is init's job, as today).
- `--dry-run` reports all of the above and writes nothing — including the manifest.

**Migration (no manifest on disk — every pre-manifest project):** update ADOPTS what it can prove:
- `apriori/runbook.md`: adopted unconditionally and refreshed as today — it is the init precondition and has been declared tool-owned since 1.0; its refresh is `update`'s reason to exist.
- each existing command file: adopted iff its current content hash equals the CURRENT package template or a KNOWN ANCESTOR hash (the package embeds the sha256 of every template generation it has ever shipped — today: `4ada03a2…` current, `1dfa5eec…` pre-front-door). Match → adopt + refresh. No match → `unmanaged` skip (fail closed: content we never wrote is not ours to replace).
- The adoption pass writes the manifest (unless `--dry-run`).
- `init` on an existing project (adding a tool) merges into an existing manifest rather than replacing it.

**Output:** the per-file action column gains `modified`/`unmanaged`/`missing`; the closing "never touched" line becomes literally true.

## Acceptance criteria (testable)

- F1. Repro 1: a foreign file at an unselected tool's command path (no manifest entry) survives `update` byte-identical; the report says `unmanaged` with the cure hint.
- F2. A manifest-listed, unmodified command file whose package template has changed → refreshed; the manifest hash is updated to the new content.
- F3. A manifest-listed file with local edits → `modified` skip, byte-identical afterward; `--dry-run` gives the same report and writes nothing (manifest included).
- F4. Pre-manifest project: a command file byte-equal to the current template → adopted, `up-to-date`; byte-equal to the known-ancestor template → adopted + `updated`; arbitrary content → `unmanaged` skip. In all three, the manifest exists afterward (except under `--dry-run`).
- F5. `init` writes the manifest covering the runbook and every command file it created; `init` for an additional tool merges, preserving existing entries.
- F6. The runbook refreshes exactly as today in every scenario (manifest present, absent, stale hash — a locally-modified runbook IS skipped as `modified`, since the manifest can now prove modification).
- F7. `update` exit code stays 0 for skip-only runs (skips are reports, not failures); output names every skip.
- F8. All existing tests pass; suite + verify + gate + check --self green.

## Out of scope

- Rules-file pointer blocks (append-only at init, never refreshed — unchanged).
- `--force` overwrite flag (not offered this minor; the cure is delete + re-init).
- Windows Git Bash resolution (P0-4, next change).

## Decisions proposed

- DD-1: manifest lives at `apriori/managed.json` (inside the apriori dir, next to runbook.md; trackable by git; NOT dot-prefixed so it is visible and greppable).
- DD-2: a locally-modified runbook is skipped like any modified file once a manifest exists — protecting user edits beats forcing the upgrade; the skip warning tells them what happened. (Pre-manifest adoption still refreshes it unconditionally: no proof of modification exists, and historical behavior wins once.)
- DD-3: known-ancestor hashes are a hardcoded array in lib/update.js, appended whenever templates/command.md changes — enforced by a test that hashes the live template and asserts membership (so forgetting the append fails CI).
