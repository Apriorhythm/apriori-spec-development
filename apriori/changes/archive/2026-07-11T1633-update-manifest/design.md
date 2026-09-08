# Design — update-manifest

New shared helper `lib/managed.js` (zero-dep; init and update both require it):
- `MANIFEST_REL = 'apriori/managed.json'`; `TEMPLATE_GENERATIONS = ['sha256:4ada03a2…a9c8a0', 'sha256:1dfa5eec…eab046']` (full 64-hex literals; DD-3 membership test lives in the test suite hashing the live template).
- `hashBytes(buf)` → `sha256:<64hex>` over exact bytes (fs.readFileSync without encoding; no normalization).
- `allowedTargets()` → Set of `apriori/runbook.md` + every `TOOLS[k].command` (require('./init').TOOLS — init already exports it; managed.js requiring init is acyclic because init will require managed lazily inside functions if needed, or managed takes TOOLS as a parameter — pick the parameter form to keep the graph clean: `allowedTargets(tools)`).
- `readManifest(root, tools)` → `{ files: {rel: hash} } | null` (null = absent). Throws `Error('managed.json: <defect>')` on: unreadable-but-present, JSON.parse failure, `version !== 1`, `files` not a plain object, any value not `/^sha256:[0-9a-f]{64}$/`, any key that `path.isAbsolute`, contains a `..` segment (split on `/`), backslashes normalized first, or is not in `allowedTargets(tools)`. All hygiene checks run on read — BOTH consumers get fail-closed for free.
- `writeManifest(root, files)` → writes `{ version: 1, files }` (sorted keys, 2-space JSON + trailing newline).
- Realpath containment runs BEFORE ANY READ OR HASH of a manifest-listed or candidate target, not just before writes (UMSPEC-1): an existing file is resolved through symlinks and its realpath must sit under the project root before it is hashed — an escaping path is a hygiene error (fail closed), never classified modified/up-to-date; a not-yet-existing target validates its nearest existing parent via the existing `containsReal` semantics before creation. `containsReal` is reused from archive-merge (already exported).

`lib/update.js` rewrite of `run(root, opts)`:
1. `let manifest; try { manifest = readManifest(root, TOOLS) } catch → rethrow` (cli catches → prints message → exit 1, same path as the existing no-runbook error).
2. Runbook: if manifest lists it → managed semantics (hash-compare → refresh|`modified` skip). If manifest is null → adopt: refresh as today, record hash of what's now on disk (post-refresh bytes). If manifest exists but runbook unlisted → treat as unmanaged? NO — the runbook is the init precondition and every manifest-writing path records it; an unlisted runbook under a valid manifest means someone hand-edited the manifest: treat as `unmanaged` skip (consistent, fail-closed).
3. Command files loop (every TOOLS path that exists on disk): manifest present → managed/modified/unmanaged semantics per spec; manifest null → adoption by `TEMPLATE_GENERATIONS` membership (match current → `up-to-date` + adopt; match ancestor → refresh + adopt; else `unmanaged`).
4. `missing`: manifest lists a path with no file on disk → action row `missing`, no write.
5. Writes: reads AND writes guarded by containment (see managed.js rule). Manifest written once at the end iff !dryRun AND (an adoption pass ran — even when every adopted file was byte-identical `up-to-date`, so the FIRST update on a pre-manifest project always materializes managed.json — or any managed refresh changed a hash); a pure skip run on an existing valid manifest rewrites nothing. `writeManifest` ensures `apriori/` exists before writing.
6. Action vocabulary: `updated | up-to-date | modified (skipped) | unmanaged (skipped) | missing (skipped) | created` (gitignore row unchanged). Exit stays 0 for skips; the closing line keeps its promise text.
7. `--dry-run`: same report; `refresh(…, dryRun)` already no-ops; manifest write skipped.

`lib/init.js`:
- `writeCommand` already returns `created|exists`-style signals via `act` — extend the run to collect `(rel, bytes)` for every file it CREATES (runbook copy included; check the current copy path — init copies RUNBOOK.md → apriori/runbook.md on fresh init).
- After scaffolding (not dryRun): `readManifest` (hygiene errors → abort BEFORE scaffolding — so actually read the manifest FIRST, at the top of init's run, before any write; IN-17), merge `{created entries}` over existing `files`, `writeManifest`.
- dry-run: report would-be entries in the summary, touch nothing (IN-16).

Tests: UP-06..11 + IN-13..17 in test/update.test.js / test/init.test.js (fixture projects in tmpdirs; opts.runbookSrc/commandSrc seams already exist for injecting fake sources; generation-membership test hashes templates/command.md and asserts membership of TEMPLATE_GENERATIONS). Existing UP-01..05 / IN-01..12 must stay green — note UP-old tests that relied on existence-only refresh may need fixtures updated to carry manifests (their INTENT is preserved: tool-owned refresh still works). Known case: UP-01's existing-command-files-refresh fixture must gain a manifest or a known-generation pre-manifest setup.
Rider: none (README unchanged — update's own output is the surface).
