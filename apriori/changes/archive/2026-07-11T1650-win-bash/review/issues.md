# Issue ledger — win-bash

Rows recorded on behalf of the reviewer (codex session 019f4b30-68f9-7222-9b64-17f52a333b4c; raws: win-bash-*-raw.txt).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| WB-1 | Root derivation wrong for mingw64\bin layout; usr\bin\bash.exe undecided. | Valid installs unresolvable or wrong path derived. | STEP0·r1 | verified |
| WB-2 | `where git` parsing/nonzero behavior underspecified. | Spaces/CRLF/multi-hit/no-git inconsistencies. | STEP0·r1 | verified |
| WB-3 | ESM injection seam for resolveBash not precise. | Windows branches untestable off-Windows. | STEP0·r1 | verified |
| WB-4 | Windows CI may not exercise the resolver hardening. | The WSL-shim bug survives green CI. | STEP0·r1 | verified |
| WB-ADV-1 | Env-var absolute rule, shell-free spawn with spaces, candidate dedupe. | Advisory precision. | STEP0·r1 | verified |
| WBSPEC-1 | Design proposed an href-equality entry guard although the script already has a safe path.resolve/fileURLToPath guard. | Dynamic import or CLI entry could break for nothing. | STEP2·r1 | verified |
| WBSPEC-2 | main()-boundary handling of resolveBash throws unspecified (stack trace instead of named cure). | Noisy, unactionable user failure. | STEP2·r1 | verified |
| WBSPEC-ADV-1 | Advisory: dedupe first-hit-order assertion + posix no-log assertion named in the test plan. | Test precision. | STEP2·r1 | verified |
| WBIMPL-1 | The generic bin\git.exe alternative derived MSYS/Cygwin-like usr\bin\git.exe as a root — a sibling bash could be selected. | Wrong bash chosen on unsupported layouts despite existsFile passing. | STEP5·r1 | verified |
| WBIMPL-ADV-1 | Advisory: resolveBash throws were double-prefixed through fail(); now unprefixed (fail adds it). Test-helper bare bash noted as test-only. | Output hygiene. | STEP5·r1 | verified |
