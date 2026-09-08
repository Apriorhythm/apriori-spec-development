# P5 design review — win-bash (round 2)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/win-bash-review-v2-raw.txt

**Round-1 Confirmations**

WBSPEC-1: **verified**. The design now keeps the existing `path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)` guard unchanged and explicitly drops the href-equality idea.

WBSPEC-2: **verified**. The design now specifies that `main()` catches `resolveBash()` errors and routes `e.message` through the existing `fail()` path, so user-facing failures are named messages rather than stack traces.

WBSPEC-ADV-1: **verified**. The test plan now names both the first-hit-order dedupe assertion and the non-win32 no-log assertion.

**New Issues**

None.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| WBSPEC-1 | Design proposed an href-equality entry guard although the script already had a safer path.resolve/fileURLToPath guard. | Dynamic import or CLI entry could break unnecessarily. | STEP2·r1 | verified |
| WBSPEC-2 | `main()` handling of `resolveBash()` throws was unspecified. | No-bash failures could become stack traces instead of named cure messages. | STEP2·r1 | verified |
| WBSPEC-ADV-1 | Dedupe first-hit-order and POSIX no-log assertions needed to be named in the test plan. | Advisory test precision. | STEP2·r1 | verified |

VERDICT: no major issues, ready to proceed to execution
