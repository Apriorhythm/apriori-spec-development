**Issues**

**DIMPL-1 — D2/D4 path-type checks can falsely pass malformed scaffold entries or crash instead of reporting findings**

Description: DR-03 requires scaffold gaps for `apriori/specs/`, `.gitignore`, and `tmp/` to be reported as D2 findings; DR-05 requires missing/broken rules and command files to be D4 findings. The implementation mostly checks `existsSync` and then reads paths directly:

- [lib/doctor.js](/mnt/d/Workbench/misc/apriori-spec-development/lib/doctor.js:70) treats `apriori/specs` as present even if it is a file, not a directory.
- [lib/doctor.js](/mnt/d/Workbench/misc/apriori-spec-development/lib/doctor.js:74) treats `apriori/tmp` as present even if it is a file, not a directory.
- [lib/doctor.js](/mnt/d/Workbench/misc/apriori-spec-development/lib/doctor.js:73) reads `.gitignore` without checking it is a regular file; a directory or unreadable entry throws and exits through the generic CLI error path instead of producing a D2 finding.
- [lib/doctor.js](/mnt/d/Workbench/misc/apriori-spec-development/lib/doctor.js:96) similarly reads detected rules files without checking they are regular files; command paths are only existence-checked at [lib/doctor.js](/mnt/d/Workbench/misc/apriori-spec-development/lib/doctor.js:100).

Risk: `doctor` can report a malformed scaffold as healthy, or crash with exit 1 instead of returning the specified diagnostic finding. This is a spec-vs-code gap in the onboarding command’s core purpose.

Suggested fix: Validate expected path types before reading. Require directories for `apriori/`, `apriori/specs/`, `apriori/tmp/`, and tool marker dirs where relevant; require regular readable files for `runbook.md`, `.gitignore`, rules files, and command files. Convert wrong type/unreadable cases into D2/D4 findings, not generic throws. Add DR-03/DR-05 cases for file-vs-dir swaps.

**Advisories**

DR-11’s read-only test fingerprints only file path and size, not content or mtime. Static inspection shows `doctor` itself performs no writes outside D5, so this is a test-strength advisory only.

DR-09’s symlink escape test verifies the escaped flow-state is not read, but does not assert that the skip info note is surfaced. The implementation does add the note.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DIMPL-1 | D2/D4 path-type checks can falsely pass malformed scaffold entries or throw instead of reporting findings. | Doctor can misdiagnose or crash on half-initialized projects it is meant to explain. | STEP5·r1 | open |
| ADV-DIMPL-1 | Advisory batch: strengthen DR-11 fingerprint beyond path+size; assert DR-09 escaped-archive skip note. | Low; test robustness only. | STEP5·r1 | advisory |

VERDICT: 1 issues open
