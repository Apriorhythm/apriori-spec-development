# P8 implementation review — win-bash (round 2)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/win-bash-impl-review-v2-raw.txt

**Round-1 Confirmations**

WBIMPL-1: **verified**. The resolver now rejects roots ending in `\usr`, `\mingw64`, or `\mingw32` after the generic `bin\git.exe` match. GP-08 now includes the sharp negative: `C:\Weird\usr\bin\git.exe` plus an existing `C:\Weird\usr\bin\bash.exe` still throws the no-Git-Bash cure instead of selecting that sibling bash.

WBIMPL-ADV-1: **verified**. `resolveBash()` now throws unprefixed messages and `fail()` adds `golden-path:` exactly once. The remaining bare `bash` spawn is in the GP-04 test helper, not one of the production runner spawn sites.

**New Issues**

None.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| WBIMPL-1 | The generic `bin\git.exe` alternative derived MSYS/Cygwin-like `usr\bin\git.exe` as a root, allowing a sibling bash to be selected. | Wrong bash chosen on unsupported layouts despite `existsFile` passing. | STEP5·r1 | verified |
| WBIMPL-ADV-1 | `resolveBash` throw messages were double-prefixed through `fail()`; test-helper bare bash noted as test-only. | Advisory output hygiene. | STEP5·r1 | verified |

VERDICT: no major issues, ready to proceed
tokens used
2,544,326
**Round-1 Confirmations**

WBIMPL-1: **verified**. The resolver now rejects roots ending in `\usr`, `\mingw64`, or `\mingw32` after the generic `bin\git.exe` match. GP-08 now includes the sharp negative: `C:\Weird\usr\bin\git.exe` plus an existing `C:\Weird\usr\bin\bash.exe` still throws the no-Git-Bash cure instead of selecting that sibling bash.

WBIMPL-ADV-1: **verified**. `resolveBash()` now throws unprefixed messages and `fail()` adds `golden-path:` exactly once. The remaining bare `bash` spawn is in the GP-04 test helper, not one of the production runner spawn sites.

**New Issues**

None.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| WBIMPL-1 | The generic `bin\git.exe` alternative derived MSYS/Cygwin-like `usr\bin\git.exe` as a root, allowing a sibling bash to be selected. | Wrong bash chosen on unsupported layouts despite `existsFile` passing. | STEP5·r1 | verified |
| WBIMPL-ADV-1 | `resolveBash` throw messages were double-prefixed through `fail()`; test-helper bare bash noted as test-only. | Advisory output hygiene. | STEP5·r1 | verified |

VERDICT: no major issues, ready to proceed
