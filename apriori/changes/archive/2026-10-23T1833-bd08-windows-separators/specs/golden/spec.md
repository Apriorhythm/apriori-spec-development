<!-- apriori-base: sha256:89a309f52535f28801b0dfe586e24e2c28cde2030202f2984065b0241a2313cd -->

# Delta — golden (bd08-windows-separators)

## MODIFIED Requirements

### Requirement: the suite is portable to the Windows CI matrix
The test suite SHALL pass on the CI workflow's Windows runners as it does on Linux, without weakening what it asserts about the code: a test that runs `npm` SHALL do so through one seam (`test/helpers/npm.js`: `npm.cmd` through a shell on `win32`, bare `npm` elsewhere); a test that compares recorded text containing repository paths SHALL compare them in a separator-neutral form (the corpus normalizer renders the path under `<ROOT>` with `/` whatever the host printed, a filter on a relative path reads it with `/`, and an assertion on a `path.relative` result or on a message that embeds a host path compares in `/` form or accepts either separator — BD-08, found by the first Windows CI run that got past CL-21, where the runners can create symlinks and so ran the case a host without the privilege had skipped); and a test that creates a symlink SHALL not fail for want of the privilege: it probes first (`canSymlink()` in nineteen files, AM-140 and GT-57 newly among them; an inline try/catch probe in six older files) or, in two older tests (UP-10 in update.test.js, the prototype-walk guide tests), skips the symlink case on `win32` outright — either way only the symlink case is skipped and every other assertion keeps running; the probe form is preferred for new tests because it keeps the case alive on a Windows host that can link. A test whose premise cannot arise on a platform (CL-21: blocking stdio pipes on Windows) SHALL be skipped there with its reason, never silently passed.

#### Scenario: WN-01 the suite is portable to the Windows CI matrix: npm goes through one seam, recorded paths read with /, symlink fixtures are guarded
- WHEN every `test/*.test.js` source is scanned, the corpus normalizer is given a Windows-style path under the repository root, and the npm seam is read
- THEN no test spawns `npm` by its bare name, the seam names `npm.cmd` under `win32` with a shell, the normalizer yields `<ROOT>/apriori/specs/x/spec.md` for the backslash form and the forward-slash form alike, and the two tests that lacked a probe (AM-140, GT-57) consult `canSymlink()`

## Notes

PR #1 CI run on 59fb177: both Windows jobs 907 tests, 904 pass, 1 fail (BD-08), 2 skipped — the runners hold the symlink privilege, so they ran the symlink-loop case the producer's Windows host had skipped. BD-08 compared `path.relative` output with `'kv/spec.md'` (Windows: `kv\\spec.md`) and matched the walk-root message with `kv\/out`; both are now separator-neutral. `mdFilesUnder` itself returns absolute paths and is unchanged; nothing in `bin/` or `lib/` changes.
