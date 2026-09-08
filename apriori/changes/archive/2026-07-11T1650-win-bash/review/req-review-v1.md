# P1 requirement review — win-bash (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/win-bash-req-review-v1-raw.txt

**Requirement Review — win-bash v1**

**Dimension Verdicts**

1. Target state B: Clear at the goal level, but the Windows resolver contract needs tighter path/layout details.
2. Edge/exception coverage: Incomplete for Git-for-Windows layouts, `where git` parsing, and test seam injection.
3. Side effects: No undeclared state changes; this is CI/script behavior only.
4. Acceptance criteria: G1-G6 are mostly testable, but G3 lacks enough seam detail to implement consistently.
5. State-A conflicts: The current script does spawn bare `bash` at three sites: one `walk.sh` run and two final-state `bash -c` calls through `assertCmd`.
6. Lineage: Declared and consistent with the repo; target module is the golden-path runner/spec.

**Formal Issues**

**WB-1 — Git-for-Windows root derivation is wrong/incomplete for common layouts**

Description: The requirement maps `<root>\cmd\git.exe`, `<root>\mingw64\bin\git.exe`, and `<root>\bin\git.exe` to `<root>\bin\bash.exe`. For a hit like `C:\Program Files\Git\mingw64\bin\git.exe`, `<root>` must be `C:\Program Files\Git`, not `C:\Program Files\Git\mingw64`, otherwise the derived bash path becomes `C:\Program Files\Git\mingw64\bin\bash.exe`. The prompt also calls out `usr\bin\bash.exe`; the requirement does not say whether it is a fallback candidate. Some Git-for-Windows installs commonly expose `usr\bin\bash.exe` and/or `bin\bash.exe`, so a single derived target is fragile.

Risk: Resolution can fail on valid Git-for-Windows installs or derive the wrong path, causing Windows CI/user repros to fail despite Git Bash being installed.

Suggested fix: Define layout mapping explicitly:
- `...\Git\cmd\git.exe` → probe `...\Git\bin\bash.exe`, then `...\Git\usr\bin\bash.exe` if intended.
- `...\Git\mingw64\bin\git.exe` → root is two levels up from `mingw64\bin`; probe root-level bash candidates.
- `...\Git\bin\git.exe` → root is one level up; probe root-level bash candidates.
Then add G3 cases for each derived root and any chosen `usr\bin\bash.exe` fallback.

**WB-2 — `where git` parsing rules are underspecified**

Description: The requirement says “every hit of `where git`” but does not define parsing of stdout. On Windows, output may have CRLF, multiple hits, paths with spaces, blank lines, and possible shell noise/errors depending on how it is invoked. It also does not say whether nonzero `where git` is just “no hits” or a hard failure.

Risk: Implementations may parse `where git` differently, mishandle `Program Files` paths, or fail hard on a normal no-git condition instead of continuing to conventional paths.

Suggested fix: Specify `where git` invocation and parsing: run without shell if practical, split stdout on `\r?\n`, trim only line terminators/outer whitespace, ignore blank lines, preserve spaces inside paths, consider only existing files, and treat nonzero/no-output as no derived candidates, not a hard error. First valid derived bash wins.

**WB-3 — G3’s injection seam is not precise enough for an ESM script**

Description: G3 says unit-testable with an injected `whereGit()` seam and fake directory layout, but the requirement only names `resolveBash()` and does not specify its signature or exports. Since `golden-path.mjs` is ESM and tests currently import named exports, implementers need to know whether `resolveBash` is exported and how platform/env/fs/spawn seams are injected.

Risk: The implementation may hard-code `process.platform`, `process.env`, `fs.existsSync`, and `spawnSync`, making Windows branches hard to test on non-Windows hosts or causing brittle test hacks.

Suggested fix: Declare `export function resolveBash(opts = {})`, with injectable `platform`, `env`, `whereGit`, and `existsFile`/`fs` seam. Default behavior uses real `process.platform`, `process.env`, `spawnSync('where', ['git'])`, and `fs.existsSync/statSync`. Tests import it via ESM and pass fake seams.

**WB-4 — CI requirement may not exercise the new Windows resolution path**

Description: G6 says existing golden-path CI jobs stay green. The current Windows workflow runs under `shell: bash`, and the current requirement notes that GitHub’s windows runner already exposes Git Bash first. That can pass even if `resolveBash` incorrectly falls back to bare `bash` or never exercises the no-WSL-shim hardening.

Risk: The main defect can remain untested in CI while the existing job stays green.

Suggested fix: Add an explicit test/CI assertion that on a simulated `win32` platform, all spawn sites receive the absolute resolved bash path, and that a fake PATH where WSL/System32 `bash` would win is never consulted. G5’s “logged once” should assert the resolved absolute path in the Windows unit path.

**Advisories**

- `APRIORI_GIT_BASH` is a reasonable variable name. Specify whether relative values are allowed; recommended: resolve to absolute and require an existing file, or require absolute to reduce ambiguity.
- Spawning an absolute path with `spawnSync(resolvedBash, args, { shell: false })` should survive spaces in `Program Files`; mention `shell:false` or “do not shell-quote the executable path” in design.
- Conventional paths should be built from env vars only when those vars are present, and each candidate should be de-duplicated before probing/logging.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| WB-1 | Git-for-Windows root derivation is wrong/incomplete for `mingw64\bin` and does not decide `usr\bin\bash.exe`. | Valid Git Bash installs may not resolve, or the wrong path may be derived. | P1·r1 | open |
| WB-2 | `where git` parsing and nonzero behavior are underspecified. | Paths with spaces, CRLF, multiple hits, or no-git cases can be implemented inconsistently. | P1·r1 | open |
| WB-3 | G3’s injection seam is not precise enough for an ESM script. | Windows resolution can become hard to test or require brittle test hacks. | P1·r1 | open |
| WB-4 | Existing Windows CI may not exercise the new resolver hardening. | The WSL-shim bug can survive while CI remains green. | P1·r1 | open |
| WB-ADV-1 | Clarify env-var absolute/relative handling, shell-free spawning with spaces, and candidate de-duplication. | Advisory precision. | P1·r1 | open |

VERDICT: 4 issues open
