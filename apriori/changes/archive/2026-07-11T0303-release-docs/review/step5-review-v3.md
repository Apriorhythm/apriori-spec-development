**Resolution Check**

**RD-1 reopened**

Description: The revised `SECURITY.md` correctly distinguishes per-command escape outcomes, but it still says every change-derived path that `doctor` reads is validated by realpath containment. Code does not validate every file it reads that way: `lib/doctor.js` checks archived change directory containment before reading it, but then reads `flow-state.md` inside that directory without a per-file `containsReal` check. For active in-flight changes, `activeChanges()` enumerates direct directories, but `doctor` reads `apriori/changes/<name>/flow-state.md` without a containment check, so a symlinked `flow-state.md` can point outside.

Risk: `SECURITY.md` still overclaims doctor’s containment guarantee.

Suggested fix: Either implement per-file containment checks before doctor reads change `flow-state.md`, or narrow the doc to say doctor containment-checks archived change directories and does not claim per-file symlink containment for `flow-state.md`.

**New Gaps**

No other inaccuracies found. RD-2 and RD-3 remain resolved; CHANGELOG and MIGRATING still match the checked code/spec surfaces.

**Advisories**

No new advisory items.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RD-1 | SECURITY.md still overstates doctor containment: doctor does not realpath-containment-check every change-derived `flow-state.md` file before reading it. | Over-claiming in a security document. | STEP5·r1 | open |

VERDICT: 1 issues open
