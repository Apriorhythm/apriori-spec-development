**Resolution Checks**

DSPEC-1 is verified. The spec/design now use one counting model: `checks` may contain multiple entries with the same D-id, and `findings` equals the number of finding-status entries.

DSPEC-2 is verified. DR-12 covers the Node-floor exit-2 path with an injectable version seam.

DSPEC-3 is verified. The D5 design now classifies unexplained non-zero exits before the `1..0` ok branch, so non-zero `1..0` is a finding.

DSPEC-4 is verified. DR-09/design now require archive-root realpath containment before reading archived candidates, with escaping symlink entries skipped as info.

**Issues**

**DSPEC-5 — Scenario range references were not updated after adding DR-12**

Description: DR-12 was added, but `tasks.md` still says T1 writes one test per `DR-01..11`, and CLI scenario CL-10 still references behavior per `DR-01..11`.

Risk: The executor can omit the new Node-floor scenario from the failing-test pass, causing binding/rework later. The CLI spec also understates the doctor scenario surface.

Suggested fix: Update T1 and CL-10 to reference `DR-01..12`.

**Advisories**

The D7 design now uses `containsReal`, but the module-layout dependency list still omits `./archive-merge`. Add `containsReal` to the consumed helper list for implementation clarity.

CLI MODIFIED block fidelity and CAS stamp remain clean.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DSPEC-1 | D2/JSON counting model now allows multiple entries per D-id and counts finding-status entries. | Previously CI-visible counts and JSON shape could diverge. | STEP2·r1 | verified |
| DSPEC-2 | DR-12 now covers Node-floor behavior with an injectable version seam. | Previously unsupported-runtime behavior could regress unbound. | STEP2·r1 | verified |
| DSPEC-3 | D5 now classifies unexplained non-zero exit before the `1..0` ok branch. | Previously broken test commands could be hidden as healthy plumbing. | STEP2·r1 | verified |
| DSPEC-4 | D7 now containment-checks archived candidates against the archive root before any read. | Previously doctor could read outside the archive tree. | STEP2·r1 | verified |
| DSPEC-5 | `tasks.md` and CL-10 still reference `DR-01..11` after DR-12 was added. | DR-12 can be omitted from the failing-test plan, causing binding/rework later. | STEP2·r2 | open |
| ADV-DSPEC-2 | Advisory batch: add `containsReal`/`archive-merge` to the design dependency list; CLI CAS/fidelity remains clean. | Low; implementation clarity. | STEP2·r2 | advisory |

VERDICT: 1 issues open
tokens used
973,656
**Resolution Checks**

DSPEC-1 is verified. The spec/design now use one counting model: `checks` may contain multiple entries with the same D-id, and `findings` equals the number of finding-status entries.

DSPEC-2 is verified. DR-12 covers the Node-floor exit-2 path with an injectable version seam.

DSPEC-3 is verified. The D5 design now classifies unexplained non-zero exits before the `1..0` ok branch, so non-zero `1..0` is a finding.

DSPEC-4 is verified. DR-09/design now require archive-root realpath containment before reading archived candidates, with escaping symlink entries skipped as info.

**Issues**

**DSPEC-5 — Scenario range references were not updated after adding DR-12**

Description: DR-12 was added, but `tasks.md` still says T1 writes one test per `DR-01..11`, and CLI scenario CL-10 still references behavior per `DR-01..11`.

Risk: The executor can omit the new Node-floor scenario from the failing-test pass, causing binding/rework later. The CLI spec also understates the doctor scenario surface.

Suggested fix: Update T1 and CL-10 to reference `DR-01..12`.

**Advisories**

The D7 design now uses `containsReal`, but the module-layout dependency list still omits `./archive-merge`. Add `containsReal` to the consumed helper list for implementation clarity.

CLI MODIFIED block fidelity and CAS stamp remain clean.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DSPEC-1 | D2/JSON counting model now allows multiple entries per D-id and counts finding-status entries. | Previously CI-visible counts and JSON shape could diverge. | STEP2·r1 | verified |
| DSPEC-2 | DR-12 now covers Node-floor behavior with an injectable version seam. | Previously unsupported-runtime behavior could regress unbound. | STEP2·r1 | verified |
| DSPEC-3 | D5 now classifies unexplained non-zero exit before the `1..0` ok branch. | Previously broken test commands could be hidden as healthy plumbing. | STEP2·r1 | verified |
| DSPEC-4 | D7 now containment-checks archived candidates against the archive root before any read. | Previously doctor could read outside the archive tree. | STEP2·r1 | verified |
| DSPEC-5 | `tasks.md` and CL-10 still reference `DR-01..11` after DR-12 was added. | DR-12 can be omitted from the failing-test plan, causing binding/rework later. | STEP2·r2 | open |
| ADV-DSPEC-2 | Advisory batch: add `containsReal`/`archive-merge` to the design dependency list; CLI CAS/fidelity remains clean. | Low; implementation clarity. | STEP2·r2 | advisory |

VERDICT: 1 issues open
