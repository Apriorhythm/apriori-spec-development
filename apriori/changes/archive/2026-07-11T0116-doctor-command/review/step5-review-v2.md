**Resolution Checks**

DIMPL-1 is reopened. The new `isDir` / `isFile` / `readIfFile` probes fix the `specs/`, `tmp/`, `.gitignore`, rules-file, and command-file wrong-type paths, but `runbook.md` is still only type-checked in D2. D3 then uses `fs.existsSync` and calls `checkRunbookFreshness(cwd)` when `apriori/runbook.md` exists, even if it is a directory or otherwise not a regular readable file. That can still throw instead of reporting the D2 finding cleanly.

ADV-DIMPL-1 is verified. DR-11’s fingerprint now includes `mtimeMs`, and DR-09 asserts the escaped archive skip note.

**Issues**

**DIMPL-1 — Runbook wrong-type path can still crash D3 after D2 flags it**

Description: [lib/doctor.js](/mnt/d/Workbench/misc/apriori-spec-development/lib/doctor.js:84) correctly emits a D2 finding when `apriori/runbook.md` exists but is not a regular file. But [lib/doctor.js](/mnt/d/Workbench/misc/apriori-spec-development/lib/doctor.js:92) checks only `existsSync`, then calls `checkRunbookFreshness(cwd)`, whose implementation reads `apriori/runbook.md`. If `runbook.md` is a directory, doctor can throw instead of continuing with D3 `n/a` or a finding.

Risk: A malformed scaffold can still produce a generic crash/exit-1 path instead of the specified diagnostic output.

Suggested fix: Reuse the same regular-file probe for D3. If `runbook.md` is not a regular readable file, D3 should be `n/a` with “see D2; freshness not checkable.” Add a DR-03/DR-04 test where `apriori/runbook.md` is a directory.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DIMPL-1 | Runbook wrong-type path can still crash D3 after D2 flags it. | Malformed scaffold can still produce generic failure instead of doctor diagnostics. | STEP5·r1 | open |
| ADV-DIMPL-1 | Advisory batch resolved: DR-11 fingerprint includes mtime; DR-09 asserts escaped-archive skip note. | Low; test robustness only. | STEP5·r1 | advisory-verified |

VERDICT: 1 issues open
tokens used
1,036,021
**Resolution Checks**

DIMPL-1 is reopened. The new `isDir` / `isFile` / `readIfFile` probes fix the `specs/`, `tmp/`, `.gitignore`, rules-file, and command-file wrong-type paths, but `runbook.md` is still only type-checked in D2. D3 then uses `fs.existsSync` and calls `checkRunbookFreshness(cwd)` when `apriori/runbook.md` exists, even if it is a directory or otherwise not a regular readable file. That can still throw instead of reporting the D2 finding cleanly.

ADV-DIMPL-1 is verified. DR-11’s fingerprint now includes `mtimeMs`, and DR-09 asserts the escaped archive skip note.

**Issues**

**DIMPL-1 — Runbook wrong-type path can still crash D3 after D2 flags it**

Description: [lib/doctor.js](/mnt/d/Workbench/misc/apriori-spec-development/lib/doctor.js:84) correctly emits a D2 finding when `apriori/runbook.md` exists but is not a regular file. But [lib/doctor.js](/mnt/d/Workbench/misc/apriori-spec-development/lib/doctor.js:92) checks only `existsSync`, then calls `checkRunbookFreshness(cwd)`, whose implementation reads `apriori/runbook.md`. If `runbook.md` is a directory, doctor can throw instead of continuing with D3 `n/a` or a finding.

Risk: A malformed scaffold can still produce a generic crash/exit-1 path instead of the specified diagnostic output.

Suggested fix: Reuse the same regular-file probe for D3. If `runbook.md` is not a regular readable file, D3 should be `n/a` with “see D2; freshness not checkable.” Add a DR-03/DR-04 test where `apriori/runbook.md` is a directory.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DIMPL-1 | Runbook wrong-type path can still crash D3 after D2 flags it. | Malformed scaffold can still produce generic failure instead of doctor diagnostics. | STEP5·r1 | open |
| ADV-DIMPL-1 | Advisory batch resolved: DR-11 fingerprint includes mtime; DR-09 asserts escaped-archive skip note. | Low; test robustness only. | STEP5·r1 | advisory-verified |

VERDICT: 1 issues open
