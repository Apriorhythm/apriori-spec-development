# Requirement — win-bash (v2)

change: win-bash
target lineage: **v3 branch**. Next patch/minor. CI-infrastructure hardening: the golden-path walker resolves the RIGHT bash on native Windows or fails with a named cure; POSIX platforms unchanged.

Revisions vs v1 (P1 r1): WB-1 explicit per-layout root derivation + usr\bin fallback; WB-2 exact `where git` invocation/parsing rules; WB-3 ESM seam signature; WB-4 the hardening itself is unit-asserted (not left to a lucky runner); WB-ADV-1 absolute-only env var, shell-free spawn, dedupe.

## Background — the problem (current state A, code-verified)

`scripts/golden-path.mjs` spawns bare `bash` at three sites (the `walk.sh` run and two final-state `bash -c` asserts via `assertCmd`). On native Windows, PATH resolution finds `C:\Windows\System32\bash.exe` — the WSL shim — before Git Bash whenever WSL is installed. The WSL bash executes in a Linux world: the Windows-side npm prefix, the `binDir` PATH prepend, and every `C:`-rooted cwd are meaningless there, so the walk fails in confusing ways. Today's CI passes only because the GitHub windows-2022 runner exposes Git Bash first — the defect bites real user machines with WSL enabled. (GPT-5.6 second review; batch item P0-4.)

## Goal (target state B)

On `win32`, the walker resolves an EXPLICIT Git Bash executable and never spawns bare `bash`; when none can be found it fails immediately with a message naming the cure. Non-Windows platforms keep spawning `bash` exactly as today.

**Resolver contract — `export function resolveBash(opts = {})` in golden-path.mjs** (WB-3: injectable seams with real defaults — `platform` = process.platform, `env` = process.env, `whereGit` = () => spawnSync('where', ['git'], {shell: false, encoding: 'utf8'}), `existsFile` = fs-based is-a-file probe; tests import the named export and pass fakes):
- non-win32 → returns `'bash'` (never probes anything).
- win32, `env.APRIORI_GIT_BASH` set → the value must be an ABSOLUTE path to an existing file → returned verbatim; relative or nonexistent → hard fail naming the variable (an explicit override is never silently ignored or reinterpreted).
- win32 otherwise, candidates assembled in order and DEDUPLICATED, first existing file wins:
  1. From `whereGit()` (WB-2: nonzero exit, spawn error, or empty stdout = ZERO derived candidates, never a hard error; stdout split on `/\r?\n/`, lines trimmed of outer whitespace only, blanks dropped, interior spaces preserved). Each hit derives its Git-for-Windows install root (WB-1): strip a trailing `\cmd\git.exe` | `\mingw64\bin\git.exe` | `\mingw32\bin\git.exe` | `\bin\git.exe` (case-insensitive) — a hit matching none of these shapes derives nothing. Each root contributes TWO candidates: `<root>\bin\bash.exe`, then `<root>\usr\bin\bash.exe`.
  2. Conventional installs (each only when its env var is present): `%ProgramFiles%\Git\bin\bash.exe`, `%ProgramFiles(x86)%\Git\bin\bash.exe`, `%LocalAppData%\Programs\Git\bin\bash.exe` — plus the same three with `\usr\bin\bash.exe`.
  3. Nothing found → throw: "golden-path: no Git Bash found on this Windows machine — install Git for Windows or set APRIORI_GIT_BASH to its bin\\bash.exe". Bare `bash` is NEVER the win32 answer; `C:\Windows\System32\bash.exe` is never a candidate.
- The resolved target is logged once per run (`golden-path: bash = <path>`).

**Spawn sites:** all three use the single resolved value, spawned WITHOUT `shell: true` (WB-ADV-1: an absolute path with spaces — `C:\Program Files\Git\...` — survives spawnSync argv-style; shell-quoting is what breaks it).

## Acceptance criteria (testable; the win32 branch is proven by seams on any host — WB-4)

- G1. Non-win32: `resolveBash()` === 'bash'; walker behavior byte-identical; existing golden-path CI jobs stay green.
- G2. Simulated win32 + `APRIORI_GIT_BASH` absolute-and-existing → that exact value; relative → hard fail naming the var; absolute-but-missing → hard fail naming the var.
- G3. Simulated win32: `whereGit` faked to each layout shape (cmd\, mingw64\bin\, mingw32\bin\, bin\) with a fake `existsFile` → the derived `<root>\bin\bash.exe` (and `<root>\usr\bin\bash.exe` when bin\ is absent) is returned; multi-hit/CRLF/space-containing/blank-line stdout parses per the contract; nonzero `where` falls through to conventional paths.
- G4. Simulated win32, no override, `whereGit` empty, no conventional file → throws the install/set-var cure; the returned value is never 'bash' on win32 in ANY case (asserted across all G2/G3 fixtures).
- G5. The resolved bash is logged once (asserted on the win32 unit path).
- G6. All existing tests pass; suite + golden-path --local green here and in CI (ubuntu + windows).

## Out of scope

- The CLI itself (lib/) — unchanged.
- Running the walker INSIDE WSL (that is the linux path; already works).
- P1 items (authz-boundary next).

## Decisions proposed

- DD-1: resolution lives in golden-path.mjs (single consumer today); promoting to lib/ waits for a second consumer.
- DD-2: `where git` derivation before conventional paths — respecting the machine's actual git beats guessing install dirs.
- DD-3: APRIORI_GIT_BASH must be absolute — a relative override is ambiguous about its base and is rejected loudly rather than resolved quietly.
