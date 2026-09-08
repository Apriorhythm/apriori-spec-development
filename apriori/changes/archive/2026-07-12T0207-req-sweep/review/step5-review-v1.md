# P8 consistency review — req-sweep (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: req-sweep-impl-review-v1-raw.txt

# P8 Consistency Review — req-sweep v1

## Issues

### RSIMPL-1 — The regular-file contract is not fully implemented

Description: The spec/design require each matching candidate to be a regular file by `lstat`. The implementation only rejects matching symlinks. A matching directory or other non-regular entry named like `c-req-v1.md` will be treated as a candidate and moved into `changes/c/requirement/`. Also, if `<cwd>/requirement` exists but is not a directory, `fs.readdirSync(reqDir)` can throw outside the staging taxonomy.

Risk: Requirement history staging can move the wrong filesystem object, or crash instead of producing the specified rerunnable `stores committed but requirement staging failed ... — rerun to complete` result.

Suggested fix: `lstat` the source `requirement` path and fail via `stageFail` if it is not a directory. For every matching basename, require `st.isFile()`; symlinks and other non-regular entries should fail before the move with the same cure-oriented taxonomy. Add AM-38 subcases for matching directory/non-regular entry and file-at-`requirement`.

### RSIMPL-2 — Rename-failure diagnostics do not reliably name the failed file

Description: AM-38/M5 require staging failures to name the file and rerun cure. In the implemented rename loop, `catch (e) { return stageFail(e.message); }` does not add the basename/source path. The landed DI test throws `injected staging failure`, so the current green path proves the taxonomy but not the “names the file” requirement.

Risk: A real or injected rename failure can leave the operator with a generic rerun message and no precise artifact to fix, weakening the recovery contract.

Suggested fix: Catch per file and wrap the error as `${n}: ${e.message}` or `${src}: ${e.message}`. Strengthen AM-38 to assert the failing requirement filename appears in the message.

## Advisory

AM-38 names source `requirement/` escaping `cwd`, but the landed test does not exercise that branch. The implementation appears to enforce it with `containsReal(cwd, reqDir)`, so this is not a current code gap; adding the subcase would make the scenario binding complete.

## Checks Passed

Dry-run returns before phase 3.5, so it does not stage. The pre-existing temp guard still runs before writes. Staging sits after store commit and before `archiveChangeDir`, as designed. A move-failure rerun is coherent because already staged files are no longer in live `requirement/` and the change dir remains in flight. The runbook EN/CN STEP6 rewrite is semantically aligned, and PR-19/PR-20 target the new automatic-carry wording plus absence of the old manual copy instruction.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RSIMPL-1 | The implementation rejects matching symlinks but does not require every matching candidate to be a regular file, and non-directory `requirement/` can escape the staging taxonomy. | Wrong filesystem objects can be moved, or archive can crash instead of returning the specified rerunnable failure. | STEP5 r1 | open |
| RSIMPL-2 | Rename-failure diagnostics do not reliably name the failed requirement file. | The recovery message can omit the exact artifact needing repair. | STEP5 r1 | open |

VERDICT: 2 issues open