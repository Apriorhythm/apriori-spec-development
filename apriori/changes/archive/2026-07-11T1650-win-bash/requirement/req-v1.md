# Requirement — win-bash (v1)

change: win-bash
target lineage: **v3 branch**. Next patch/minor. CI-infrastructure hardening: the golden-path walker resolves the RIGHT bash on native Windows or fails with a named cure; POSIX platforms unchanged.

## Background — the problem (current state A, code-verified)

`scripts/golden-path.mjs` spawns `spawnSync('bash', …)` three ways (the walk itself, and per-assert `bash -c`). On native Windows, PATH resolution finds `C:\Windows\System32\bash.exe` — the WSL shim — before Git Bash whenever WSL is installed (System32 precedes Git's bin in the default PATH). The WSL bash executes in a Linux world: the Windows-side npm prefix, the `binDir` PATH prepend, and every `C:`-rooted cwd are meaningless there, so the walk fails in confusing ways (or, worse, "works" against a Linux-side node). Today's CI happens to pass because the GitHub windows-2022 runner exposes Git Bash first — the defect bites real user machines with WSL enabled, exactly where the golden path is meant to be reproduced. (GPT-5.6 second review, Windows-bash claim; batch item P0-4.)

## Goal (target state B)

On `win32`, the walker resolves an EXPLICIT Git Bash executable and never spawns bare `bash`; when none can be found it fails immediately with a message naming the cure. Non-Windows platforms keep spawning `bash` exactly as today.

**Resolution order (first hit wins; each candidate must exist as a file):**
1. `APRIORI_GIT_BASH` env var (explicit override; if set but nonexistent → hard fail naming the var — an explicit override is never silently ignored).
2. Derivation from the installed git: every hit of `where git` mapped to its Git-for-Windows root (`<root>\cmd\git.exe` or `<root>\mingw64\bin\git.exe` or `<root>\bin\git.exe` → `<root>\bin\bash.exe`).
3. Conventional installs: `%ProgramFiles%\Git\bin\bash.exe`, `%ProgramFiles(x86)%\Git\bin\bash.exe`, `%LocalAppData%\Programs\Git\bin\bash.exe`.
4. Nothing found → exit nonzero: "golden-path: no Git Bash found on this Windows machine — install Git for Windows or set APRIORI_GIT_BASH to its bin\\bash.exe" (never falls back to bare `bash`, never touches the WSL shim).

**Mechanics:** one function `resolveBash()` in golden-path.mjs returning the spawn target: `'bash'` on non-win32; the resolved absolute path on win32. All three spawn sites use it. The resolution result is logged once (`golden-path: bash = <path>`) so CI logs show which bash ran.

## Acceptance criteria (testable)

- G1. Non-win32: `resolveBash()` returns `'bash'`; behavior byte-identical to today (the existing golden-path CI jobs stay green).
- G2. win32 with `APRIORI_GIT_BASH` set to an existing file → that exact path; set to a missing path → hard fail naming the variable.
- G3. win32 resolution derives Git Bash from `where git` hits across the three layout shapes (cmd/, mingw64\bin\, bin\) — unit-testable with an injected `whereGit()` seam and a fake directory layout.
- G4. win32 with no override, no git, no conventional install → nonzero exit with the install/set-var cure; bare `bash` is never spawned.
- G5. The resolved bash is logged once per run.
- G6. All existing tests pass; suite + golden-path --local green on this (WSL) machine and in CI (ubuntu + windows).

## Out of scope

- The CLI itself (lib/) — `apriori` spawns test commands via the user's shell settings, not bash; unchanged.
- WSL as a SUPPORTED walk environment (running the walker INSIDE WSL is the linux path and already works).
- P1 items (authz-boundary next).

## Decisions proposed

- DD-1: resolution lives in golden-path.mjs (single consumer today) rather than lib/ — promoting it to lib/ waits until a second consumer exists.
- DD-2: `where git` derivation before conventional paths — respecting the machine's actual git first beats guessing install dirs.
