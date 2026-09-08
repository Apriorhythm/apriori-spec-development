# P8 implementation review — win-bash (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/win-bash-impl-review-v1-raw.txt

**Implementation Review — win-bash v1**

The implementation matches the converged design on the main path: `resolveBash()` is exported and seamable, POSIX returns early before env/where/fs/log consultation, all script spawn sites use the resolved `BASH` without `shell:true`, logging is win32-only and once per resolver call, and the entry guard remains import-safe. CI’s Windows packed run will now log the resolved Git Bash path to stderr, which is consistent with GP-10.

**Issues**

**WBIMPL-1 — `usr\bin\git.exe` is falsely derived as a Git root**

Description: The resolver regex is:

```js
/^(.*?)\\(?:cmd|mingw64\\bin|mingw32\\bin|bin)\\git\.exe$/i
```

Because the final `bin\git.exe` alternative is generic, a hit like:

```text
C:\Weird\usr\bin\git.exe
```

matches and derives root `C:\Weird\usr`, producing `C:\Weird\usr\bin\bash.exe`. The requirement only allows the four explicit layouts: `cmd\git.exe`, `mingw64\bin\git.exe`, `mingw32\bin\git.exe`, and root-level `bin\git.exe`; unmatched shapes should derive nothing. This can select a sibling bash from an MSYS/Cygwin-like layout rather than Git-for-Windows.

Risk: On Windows machines where `where git` returns an unsupported `usr\bin\git.exe` ahead of Git for Windows, the runner can choose the wrong bash while still satisfying `existsFile`.

Suggested fix: Split derivation by explicit suffix, or make the `bin\git.exe` case reject roots ending in `\usr`, `\mingw64`, or `\mingw32`. Add a GP-08 negative test: `C:\Weird\usr\bin\git.exe` derives nothing and falls through to conventional candidates or the no-bash error.

**Advisories**

- The CLI failure path currently risks a doubled prefix because `resolveBash()` throws messages already starting with `golden-path:`, and `fail()` prepends `golden-path: ` again. The cure is still visible, so this is not a blocking gap, but cleaner output would throw unprefixed messages from `resolveBash()` or make `fail()` prefix-aware.
- The test file’s GP-04 helper still spawns bare `bash`, but that is test-only and outside the runner’s three production spawn sites.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| WBIMPL-1 | Resolver falsely derives `C:\...\usr\bin\git.exe` as root `C:\...\usr` via the generic `bin\git.exe` alternative. | Unsupported Git/MSYS layouts can select the wrong bash instead of deriving nothing. | STEP5·r1 | open |
| WBIMPL-ADV-1 | Resolver/fail prefix can double-print `golden-path:`; one test helper still uses bare bash outside production runner code. | Advisory output/test hygiene. | STEP5·r1 | open |

VERDICT: 1 issues open
