# P1 requirement review — win-bash (round 2)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/win-bash-req-review-v2-raw.txt

**Round-1 Confirmations**

WB-1: **verified**. The requirement now defines each supported Git-for-Windows layout explicitly, including `mingw64`, `mingw32`, `cmd`, and `bin`, with root stripping and both `bin\bash.exe` and `usr\bin\bash.exe` candidates.

WB-2: **verified**. `where git` invocation and parsing are now concrete: `spawnSync('where', ['git'], { shell: false })`, CRLF splitting, outer trimming, blank dropping, interior-space preservation, and nonzero/spawn-error/empty as zero candidates.

WB-3: **verified**. `resolveBash(opts = {})` is now an exported ESM seam with injectable `platform`, `env`, `whereGit`, and `existsFile`.

WB-4: **verified**. The Windows branch is now tested through simulated `win32` seams on any host, and the contract explicitly asserts win32 never returns bare `bash`.

WB-ADV-1: **verified**. The env var is absolute-only, spawn sites are shell-free, and candidates are deduplicated.

**New Issues**

None.

**Dimension Verdicts**

1. Target state B: **clear**.
2. Edge/exception coverage: **covered** for layout variants, `where` output shape, no-git fallback, explicit override failures, WSL shim avoidance, and spaces in paths.
3. Side effects: **none undeclared**; this is script resolution/logging behavior only.
4. Acceptance criteria: **testable**; G1-G6 can be implemented with the exported seam and existing golden-path runs.
5. State-A conflicts: **none**; the three current bare `bash` spawn sites are accurately described.
6. Lineage: **declared and plausible**.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| WB-1 | Git-for-Windows root derivation was wrong/incomplete for `mingw64\bin` and `usr\bin\bash.exe` was undecided. | Valid installs could be unresolvable or derive the wrong path. | P1·r1 | verified |
| WB-2 | `where git` parsing and nonzero behavior were underspecified. | Spaces, CRLF, multiple hits, and no-git cases could diverge. | P1·r1 | verified |
| WB-3 | ESM injection seam for `resolveBash` was not precise. | Windows branches could be untestable off-Windows. | P1·r1 | verified |
| WB-4 | Windows CI might not exercise resolver hardening. | WSL-shim bug could survive green CI. | P1·r1 | verified |
| WB-ADV-1 | Env-var absolute rule, shell-free spawn with spaces, and candidate dedupe needed precision. | Advisory precision. | P1·r1 | verified |

VERDICT: no major issues, ready to proceed
tokens used
2,518,183
**Round-1 Confirmations**

