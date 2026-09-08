**Issues**

**DSPEC-1 — D2 per-gap findings conflict with the designed JSON/check-count model**

Description: The spec says D2 reports “one finding per gap” for missing `runbook.md`, `specs/`, `.gitignore tmp/`, and `tmp/`. The design then says there is “ONE check entry per D-id” and also says “findings = checks with status finding,” while claiming D2 gaps are counted individually. Those cannot all be true with the contracted JSON shape.

Risk: Implementations and tests can disagree on `findings`, text count, and whether JSON contains one D2 entry or multiple finding entries. This affects CI consumers of `--json`.

Suggested fix: Declare one model. Either allow multiple check entries with `id: "D2"` and `findings` equals finding entries, or keep one D2 entry and add a separate per-gap count/list field. Align DR-03, design aggregate, and JSON contract.

**DSPEC-2 — Node-below-floor behavior is spec’d but has no scenario**

Description: D1 below Node 18 is an exit-2 class in req-final and design, but DR-01..11 contain no scenario that requires testing that branch. Mechanical binding can go green without asserting the Node-floor behavior.

Risk: The unsupported-runtime exit path can be unimplemented or regress without `verify --change` catching it.

Suggested fix: Add a DR scenario for Node floor, likely using an injectable version/classifier helper so the test does not require actually running old Node.

**DSPEC-3 — D5 can mark non-zero `1..0` TAP output as ok**

Description: The design classifies “TAP version/plan present but zero parsed results: plan `1..0` → ok” before “non-zero exit with parsed failCount 0 → finding.” That means a command emitting `1..0` and exiting non-zero can be reported ok, despite req-final also saying non-zero exits unexplained by TAP failures are findings.

Risk: Broken or truncated test commands can be hidden as healthy plumbing.

Suggested fix: State that `1..0` is ok only when the process exits 0, or run the non-zero-unexplained classification before the `1..0` ok branch.

**DSPEC-4 — D7 archived-change walk follows symlinked directories without containment**

Description: The design says archived entries are “directories only, stat through symlinks,” but does not require realpath containment under `apriori/changes/archive/` before reading `flow-state.md`. A symlinked archive entry can point outside the archive root.

Risk: Security/correctness issue: doctor can read files outside the intended project/archive tree while producing archived-change info.

Suggested fix: Either reject/ignore symlinked archived dirs by `lstat`, or import/use `containsReal(archiveRoot, candidate)` before reading. Add a DR-09 test for a symlinked archived entry escaping `archive/`.

**Advisories**

The CLI MODIFIED block matches the current store CLI block apart from adding `doctor`, and its CAS stamp matches the current store. DR-01..11 and CL-10 do not collide with existing store scenario IDs.

D7 archived-change scan would be clearer if it stated the archive basename pattern, but the containment issue above is the formal blocker.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DSPEC-1 | D2 per-gap findings conflict with the one-check-entry aggregate/JSON model. | CI-visible `findings` count and JSON shape can be implemented inconsistently. | STEP2·r1 | open |
| DSPEC-2 | Node-below-floor exit-2 behavior has no scenario. | Unsupported-runtime branch can be unimplemented while binding stays green. | STEP2·r1 | open |
| DSPEC-3 | D5 design can mark non-zero `1..0` TAP output as ok. | Broken test plumbing can be hidden as healthy. | STEP2·r1 | open |
| DSPEC-4 | D7 archived walk follows symlinked dirs without realpath containment. | Doctor can read outside the intended archive/project tree. | STEP2·r1 | open |
| ADV-DSPEC-1 | Advisory batch: CLI block fidelity/CAS and scenario ID ranges checked clean; clarify archive basename pattern if desired. | Low; precision only. | STEP2·r1 | advisory |

VERDICT: 4 issues open
tokens used
952,546
**Issues**

**DSPEC-1 — D2 per-gap findings conflict with the designed JSON/check-count model**

Description: The spec says D2 reports “one finding per gap” for missing `runbook.md`, `specs/`, `.gitignore tmp/`, and `tmp/`. The design then says there is “ONE check entry per D-id” and also says “findings = checks with status finding,” while claiming D2 gaps are counted individually. Those cannot all be true with the contracted JSON shape.

Risk: Implementations and tests can disagree on `findings`, text count, and whether JSON contains one D2 entry or multiple finding entries. This affects CI consumers of `--json`.

Suggested fix: Declare one model. Either allow multiple check entries with `id: "D2"` and `findings` equals finding entries, or keep one D2 entry and add a separate per-gap count/list field. Align DR-03, design aggregate, and JSON contract.

**DSPEC-2 — Node-below-floor behavior is spec’d but has no scenario**

Description: D1 below Node 18 is an exit-2 class in req-final and design, but DR-01..11 contain no scenario that requires testing that branch. Mechanical binding can go green without asserting the Node-floor behavior.

Risk: The unsupported-runtime exit path can be unimplemented or regress without `verify --change` catching it.

Suggested fix: Add a DR scenario for Node floor, likely using an injectable version/classifier helper so the test does not require actually running old Node.

**DSPEC-3 — D5 can mark non-zero `1..0` TAP output as ok**

Description: The design classifies “TAP version/plan present but zero parsed results: plan `1..0` → ok” before “non-zero exit with parsed failCount 0 → finding.” That means a command emitting `1..0` and exiting non-zero can be reported ok, despite req-final also saying non-zero exits unexplained by TAP failures are findings.

Risk: Broken or truncated test commands can be hidden as healthy plumbing.

Suggested fix: State that `1..0` is ok only when the process exits 0, or run the non-zero-unexplained classification before the `1..0` ok branch.

**DSPEC-4 — D7 archived-change walk follows symlinked directories without containment**

Description: The design says archived entries are “directories only, stat through symlinks,” but does not require realpath containment under `apriori/changes/archive/` before reading `flow-state.md`. A symlinked archive entry can point outside the archive root.

Risk: Security/correctness issue: doctor can read files outside the intended project/archive tree while producing archived-change info.

Suggested fix: Either reject/ignore symlinked archived dirs by `lstat`, or import/use `containsReal(archiveRoot, candidate)` before reading. Add a DR-09 test for a symlinked archived entry escaping `archive/`.

**Advisories**

The CLI MODIFIED block matches the current store CLI block apart from adding `doctor`, and its CAS stamp matches the current store. DR-01..11 and CL-10 do not collide with existing store scenario IDs.

D7 archived-change scan would be clearer if it stated the archive basename pattern, but the containment issue above is the formal blocker.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DSPEC-1 | D2 per-gap findings conflict with the one-check-entry aggregate/JSON model. | CI-visible `findings` count and JSON shape can be implemented inconsistently. | STEP2·r1 | open |
| DSPEC-2 | Node-below-floor exit-2 behavior has no scenario. | Unsupported-runtime branch can be unimplemented while binding stays green. | STEP2·r1 | open |
| DSPEC-3 | D5 design can mark non-zero `1..0` TAP output as ok. | Broken test plumbing can be hidden as healthy. | STEP2·r1 | open |
| DSPEC-4 | D7 archived walk follows symlinked dirs without realpath containment. | Doctor can read outside the intended archive/project tree. | STEP2·r1 | open |
| ADV-DSPEC-1 | Advisory batch: CLI block fidelity/CAS and scenario ID ranges checked clean; clarify archive basename pattern if desired. | Low; precision only. | STEP2·r1 | advisory |

VERDICT: 4 issues open
