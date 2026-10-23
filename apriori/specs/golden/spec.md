### Requirement: the golden path proves the packaged CLI end-to-end
`scripts/golden-path.mjs` SHALL extract the README Quickstart's shell blocks in document order and run them as one bash script in a fresh temp directory, with `apriori` resolving to the local checkout bin (`--local`) or to a tarball installed into an isolated prefix (`--packed <tgz>`, PATH prepended with the platform bin dir and a preflight asserting `apriori` resolves inside the prefix); it SHALL assert each block's last command against the documented exit sequence `[0, 1, 0, 0]` and the final state (store verify 0, check 0, doctor --no-run 0, archived demo change present), failing loudly with the block index and expected/actual on any mismatch. The CI workflow SHALL run the packed mode on ubuntu and windows.

#### Scenario: GP-01 the extractor is a pure text seam
- WHEN `extractBlocks(readmeText)` runs on the real README (and on doctored variants in tests)
- THEN it returns the Quickstart's ```shell blocks in document order (four today), never reading or writing the filesystem itself

#### Scenario: GP-02 a --local run walks the whole Quickstart
- WHEN `node scripts/golden-path.mjs --local` runs in a fresh temp dir
- THEN every block executes in sequence with the checkout bin aliased over `npm i -g`, per-block last exits match `[0, 1, 0, 0]`, and the run finishes exit 0

#### Scenario: GP-03 final state is asserted, not assumed
- WHEN the blocks complete
- THEN the runner re-asserts: `verify --specs apriori/specs` exits 0, `check` exits 0, `doctor --no-run` exits 0, and `apriori/changes/archive/` contains the archived demo change — any miss fails the run naming the assertion

#### Scenario: GP-04 drift between README and contract fails loudly
- WHEN a doctored README text changes the block count or makes a block's exit diverge from the expected sequence
- THEN the runner (fed through the text seam) fails naming the block index and expected/actual — the README cannot silently drift from the contract

#### Scenario: GP-05 packed mode proves the published file set
- WHEN `--packed <tgz>` installs the tarball into an isolated prefix (platform bin dir on PATH, resolve-inside-prefix preflight)
- THEN the same walk succeeds using ONLY the packaged files — a package.json `files:` gap surfaces here; the runner aborts if `apriori` resolves outside the prefix

### Requirement: the walker resolves an explicit Git Bash on Windows
`scripts/golden-path.mjs` SHALL expose `resolveBash(opts = {})` (injectable `platform`/`env`/`whereGit`/`existsFile` seams with real defaults) and use its single result, spawned without a shell, at every bash spawn site. On non-win32 it returns `'bash'` and probes nothing. On win32 it returns an absolute Git Bash path — bare `bash` is never the answer and the System32 WSL shim is never a candidate: `APRIORI_GIT_BASH` when set must be an absolute path to an existing file (relative or missing → hard fail naming the variable); otherwise candidates are derived from `where git` hits (spawned `{shell: false}`; nonzero/error/empty = zero candidates; stdout split on `/\r?\n/`, outer-trimmed, blanks dropped, interior spaces preserved; a hit stripping a trailing `cmd\git.exe` | `mingw64\bin\git.exe` | `mingw32\bin\git.exe` | `bin\git.exe`, case-insensitive, yields its install root; unmatched shapes derive nothing) as `<root>\bin\bash.exe` then `<root>\usr\bin\bash.exe`, then the conventional `%ProgramFiles%`/`%ProgramFiles(x86)%`/`%LocalAppData%\Programs` Git locations (bin and usr\bin variants, env-var-present only), deduplicated, first existing file wins; nothing found → a thrown error naming the cure (install Git for Windows or set APRIORI_GIT_BASH). The resolved target is logged once per run.

#### Scenario: GP-06 posix stays bare bash
- WHEN resolveBash runs with a non-win32 platform seam
- THEN it returns 'bash' without consulting the env, where, or the filesystem

#### Scenario: GP-07 the explicit override is honored or fails loudly
- WHEN APRIORI_GIT_BASH is an absolute path to an existing file, a relative path, or an absolute path to nothing (win32 seams)
- THEN the first returns that exact value and the other two fail naming the variable

#### Scenario: GP-08 every Git-for-Windows layout derives its root
- WHEN where-git reports hits shaped cmd\git.exe, mingw64\bin\git.exe, mingw32\bin\git.exe, or bin\git.exe — including multi-hit CRLF output with spaces in paths and blank lines
- THEN each derives `<root>\bin\bash.exe` (falling back to `<root>\usr\bin\bash.exe` when bin is absent) and the first existing candidate wins

#### Scenario: GP-09 no Git Bash means a named cure, never the shim
- WHEN win32 seams provide no override, no where-git hits, and no conventional install
- THEN resolveBash throws the install/set-APRIORI_GIT_BASH message — and across every win32 fixture the result is never bare 'bash'

#### Scenario: GP-10 the resolved bash is visible
- WHEN the walker resolves its bash
- THEN the choice is logged exactly once per run

### Requirement: the suite is portable to the Windows CI matrix
The test suite SHALL pass on the CI workflow's Windows runners as it does on Linux, without weakening what it asserts about the code: a test that runs `npm` SHALL do so through one seam (`test/helpers/npm.js`: `npm.cmd` through a shell on `win32`, bare `npm` elsewhere); a test that compares recorded text containing repository paths SHALL compare them in a separator-neutral form (the corpus normalizer renders the path under `<ROOT>` with `/` whatever the host printed, a filter on a relative path reads it with `/`, and an assertion on a `path.relative` result or on a message that embeds a host path compares in `/` form or accepts either separator — BD-08, found by the first Windows CI run that got past CL-21, where the runners can create symlinks and so ran the case a host without the privilege had skipped); and a test that creates a symlink SHALL not fail for want of the privilege: it probes first (`canSymlink()` in nineteen files, AM-140 and GT-57 newly among them; an inline try/catch probe in six older files) or, in two older tests (UP-10 in update.test.js, the prototype-walk guide tests), skips the symlink case on `win32` outright — either way only the symlink case is skipped and every other assertion keeps running; the probe form is preferred for new tests because it keeps the case alive on a Windows host that can link. A test whose premise cannot arise on a platform (CL-21: blocking stdio pipes on Windows) SHALL be skipped there with its reason, never silently passed.

#### Scenario: WN-01 the suite is portable to the Windows CI matrix: npm goes through one seam, recorded paths read with /, symlink fixtures are guarded
- WHEN every `test/*.test.js` source is scanned, the corpus normalizer is given a Windows-style path under the repository root, and the npm seam is read
- THEN no test spawns `npm` by its bare name, the seam names `npm.cmd` under `win32` with a shell, the normalizer yields `<ROOT>/apriori/specs/x/spec.md` for the backslash form and the forward-slash form alike, and the two tests that lacked a probe (AM-140, GT-57) consult `canSymlink()`
