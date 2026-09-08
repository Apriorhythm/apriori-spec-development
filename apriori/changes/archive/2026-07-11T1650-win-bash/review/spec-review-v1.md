# P5 design review — win-bash (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/win-bash-review-v1-raw.txt

**Coverage Map**

- G1: covered by GP-06.
- G2: covered by GP-07.
- G3: covered by GP-08.
- G4: covered by GP-09.
- G5: covered by GP-10.
- G6: covered by tasks T3 and the unchanged golden-path CI expectation.

Scenario range is clean: existing GP-01..05, new GP-06..10. The delta CAS stamp matches `apriori/specs/golden/spec.md`. Tasks reference GP-06..10 correctly.

**Issues**

**WBSPEC-1 — Proposed ESM entry guard is less safe than the current guard**

Description: The design says to guard main with `import.meta.url === pathToFileURL(process.argv[1]).href`. That calls `pathToFileURL(process.argv[1])` without first checking that `process.argv[1]` exists. The current script already has a safer guard shape: `if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(...)`. On Windows, raw href equality can also be brittle around drive-letter casing and path normalization.

Risk: Dynamic import from a test or nonstandard Node invocation can throw before tests reach `resolveBash`, or the CLI entry can fail to run when path URL normalization differs.

Suggestion: Keep the current guard style, or use a guarded standard equivalent:
`if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));`
No change is needed for CommonJS dynamic import safety; the current structure already avoids top-level `main()` execution on import.

**WBSPEC-2 — `resolveBash` error handling is underspecified at the main boundary**

Description: The design says override/no-bash cases should throw in `resolveBash` for testability and “let callers fail()”. But it does not explicitly state that `main()` must catch resolver errors and pass `e.message` to `fail()`. Without that, `node scripts/golden-path.mjs --local` can emit an uncaught stack trace instead of the requirement’s named cure.

Risk: The user-facing failure path may be noisy and less actionable, and tests may only exercise the exported seam rather than the CLI path.

Suggestion: Specify `main()` wraps `resolveBash()` in `try/catch` and calls `fail(e.message)`. Add a test or design note for the CLI-style failure path if feasible.

**Advisories**

- The derivation regex correctly handles the listed four layouts, including `mingw64\bin` two-level stripping. It intentionally does not derive from `usr\bin\git.exe`, which matches the v2 requirement.
- Dedupe by lower-cased path preserves first-hit order if implemented with “check set, then push original path”; keep that detail in tests.
- Logging only on win32 is correct for POSIX byte-identical output, but GP-10 should assert no log on non-win32 as part of GP-06 or the logging test.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| WBSPEC-1 | Proposed `import.meta.url === pathToFileURL(process.argv[1]).href` entry guard is unsafe when `process.argv[1]` is absent and brittle on Windows URL normalization. | Dynamic imports or direct CLI entry can break despite the current guard already being safe. | STEP2·r1 | open |
| WBSPEC-2 | `resolveBash` throws for testability, but `main()` catch/fail behavior is not specified. | User-facing no-bash failures may become uncaught stack traces instead of named cure messages. | STEP2·r1 | open |
| WBSPEC-ADV-1 | Add explicit assertions for dedupe preserving original first-hit order and no POSIX log line. | Advisory test precision. | STEP2·r1 | open |

VERDICT: 2 issues open
