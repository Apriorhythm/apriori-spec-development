**Issues**

**RD-1 — SECURITY.md overstates archive path containment**

Description: `SECURITY.md` claims: “Every user-influenced path that `verify --change`, `archive`, `gate` and `doctor` read or move is validated by realpath containment.” Current code does this for the high-level `archive --change` path family, but not for the single-file archive surface. `lib/archive-merge.js` accepts `--store <f>` and `--delta <f>`, then directly checks/reads/writes those paths with `fs.existsSync(a.store)`, `fs.readFileSync(a.store)`, `fs.readFileSync(a.delta)`, `fs.writeFileSync(tmp, ...)`, and `fs.renameSync(tmp, a.store)`.

Risk: Security posture overclaims protection for a still-supported CLI surface that can read/write caller-supplied paths outside the project tree.

Suggested fix: Scope the claim to `archive --change` / projected-change paths, or explicitly document that the legacy single-file `archive --store/--delta` form trusts its explicit file arguments.

**RD-2 — SECURITY.md read-only claim contradicts test-command execution**

Description: `SECURITY.md` claims: “`verify`, `gate`, `doctor` (with `--no-run`), `check` and `status` are read-only.” `doctor --no-run`, `check`, and `status` fit that claim, but `verify` runs the configured test command via `runTestCommand()`, and `gate` calls `verify()` through `checkBinding()`. The same file later says `verify`/`gate`/`doctor` execute the project’s own configured test command with user privileges, so the posture section is internally inconsistent.

Risk: Users may treat `verify` or `gate` as filesystem-read-only even though the configured test command can write, delete, or mutate state.

Suggested fix: Replace the claim with: the CLI core does not intentionally write during `verify`/`gate`, but those commands execute the configured test command and inherit its side effects; `doctor` is read-only only with `--no-run`.

**RD-3 — CHANGELOG.md assigns tarball packing to the wrong component**

Description: `CHANGELOG.md` says: “`scripts/golden-path.mjs` packs the tarball, installs it into an isolated prefix...” Current CI performs the packing with `TGZ=$(npm pack --silent)` and then calls `node scripts/golden-path.mjs --packed "$TGZ"`. The script requires an existing tarball path and fails if it does not exist.

Risk: The release note misstates the operational contract for reproducing the packed golden path.

Suggested fix: Reword to: “CI packs the tarball with `npm pack --silent`; `scripts/golden-path.mjs --packed <tgz>` installs that tarball into an isolated prefix...”

**Advisories**

MIGRATING.md’s strict-args table matches `lib/args.js` and the living CLI spec CL-11..17. The v3.0.0..v3.2.0 changelog entries otherwise match the tag messages and current repo history at the level of detail stated.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RD-1 | SECURITY.md overstates realpath containment for `archive`; the single-file `--store/--delta` surface reads and writes explicit paths without containment. | Users may rely on a protection not provided on a supported archive surface. | STEP5·r1 | open |
| RD-2 | SECURITY.md calls `verify` and `gate` read-only even though both can execute the configured test command. | Users may run commands as if side-effect-free when project test commands can mutate state. | STEP5·r1 | open |
| RD-3 | CHANGELOG.md says `scripts/golden-path.mjs` packs the tarball; CI actually packs it and passes the `.tgz` to the script. | Reproduction instructions and release facts are misleading. | STEP5·r1 | open |

VERDICT: 3 issues open
