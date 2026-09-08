**Resolution Check**

RD-2 is verified. `SECURITY.md` now separates strictly read-only commands (`check`, `status`, `doctor --no-run`) from commands that write nothing themselves but execute the configured test command (`verify`, `gate`, `doctor` without `--no-run`). That matches `lib/spec-runner.js`, `lib/gate.js`, and `lib/doctor.js`.

RD-3 is verified. `CHANGELOG.md` now says the CI job runs `npm pack` and `scripts/golden-path.mjs --packed <tgz>` installs the provided tarball, matching `.github/workflows/ci.yml` and `scripts/golden-path.mjs`.

RD-1 is reopened. The containment claim is correctly scoped away from single-file `archive --store/--delta` and `stamp`, but it still overstates doctor’s escape behavior: `SECURITY.md` says escaping change-derived paths “exit 2.” In `lib/doctor.js`, an archived symlink escaping `archive/` is reported as a skipped D7 note via `notes.push(...)`, not an exit-2 error. Active in-flight symlink dirs are also skipped by `activeChanges()` rather than surfaced as exit 2.

Risk: The security doc still promises fail-closed exit behavior that doctor does not implement.

Suggested fix: Split the sentence by command: `verify --change`, `archive --change`, and `gate` treat containment escapes as errors; `doctor` does not read escaping archived change dirs and reports a skip/note instead.

**New Gaps**

No additional inaccuracies found. MIGRATING.md remains consistent with `lib/args.js` and CL-11..17.

**Advisories**

No new advisory items.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RD-1 | SECURITY.md still overstates containment escape behavior for doctor: escaping archived change dirs are skipped/noted, not exit 2. | Over-claiming in a security document. | STEP5·r1 | open |
| RD-2 | SECURITY.md read-only claim contradicted the test-command scope note. | Internal inconsistency in a security document. | STEP5·r1 | verified |
| RD-3 | CHANGELOG assigned npm pack to the script instead of the CI job. | Minor factual drift. | STEP5·r1 | verified |

VERDICT: 1 issues open
