<!-- apriori-base: sha256:26044a018a6ac64984ed9970aaa5c5d379d5eaeacec50cfc057393b21af65399 -->
# Delta — golden (win-bash)

## ADDED Requirements

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
