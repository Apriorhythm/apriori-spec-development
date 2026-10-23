<!-- apriori-base: sha256:8eddf4798435d55f30c3e0d50b52ecb32f8bcb03719192e8537bfffb63e778e8 -->

# Delta — golden (windows-ci-portability)

## ADDED Requirements

### Requirement: the suite is portable to the Windows CI matrix
The test suite SHALL pass on the CI workflow's Windows runners as it does on Linux, without weakening what it asserts about the code: a test that runs `npm` SHALL do so through one seam (`test/helpers/npm.js`: `npm.cmd` through a shell on `win32`, bare `npm` elsewhere); a test that compares recorded text containing repository paths SHALL compare them in a separator-neutral form (the corpus normalizer renders the path under `<ROOT>` with `/` whatever the host printed, and a filter on a relative path reads it with `/`); and a test that creates a symlink SHALL not fail for want of the privilege: it probes first (`canSymlink()` in nineteen files, AM-140 and GT-57 newly among them; an inline try/catch probe in six older files) or, in two older tests (UP-10 in update.test.js, the prototype-walk guide tests), skips the symlink case on `win32` outright — either way only the symlink case is skipped and every other assertion keeps running; the probe form is preferred for new tests because it keeps the case alive on a Windows host that can link. A test whose premise cannot arise on a platform (CL-21: blocking stdio pipes on Windows) SHALL be skipped there with its reason, never silently passed.

#### Scenario: WN-01 the suite is portable to the Windows CI matrix: npm goes through one seam, recorded paths read with /, symlink fixtures are guarded
- WHEN every `test/*.test.js` source is scanned, the corpus normalizer is given a Windows-style path under the repository root, and the npm seam is read
- THEN no test spawns `npm` by its bare name, the seam names `npm.cmd` under `win32` with a shell, the normalizer yields `<ROOT>/apriori/specs/x/spec.md` for the backslash form and the forward-slash form alike, and the two tests that lacked a probe (AM-140, GT-57) consult `canSymlink()`

## Notes

Found on a Windows host (Node 24.14) once CL-21 was skipped there — the 6 line's first Windows CI run (PR #1, 2026-10-23) never got past the CL-21 hang: ID-01, ID-02, OPM-01, OPM-07 (npm ENOENT), LNG-07 (backslash paths in the pinned verdict text), TX-02 (a separator-bound filter found 0 stores), AM-140 and GT-57 (EPERM creating symlinks on a host without the privilege; GitHub's runners may hold it, the guard follows the repository's existing canSymlink convention either way), and — surfacing on the second host run, once the eight passed — GT-57's own assertion at line 222, which stripped `/ext.txt` from a `path.join` result. Nothing in `bin/` or `lib/` changes; no pinned expectation changes.
