# Review — change-projection req-v2

## Round-1 Verification

REQ-1: verified. CAS syntax, hash algorithm, `new` sentinel, mismatch behavior, and stamp production are now concrete.

REQ-2: verified. v2 declares one deprecated-block rule for all verify forms and explicitly accepts the plain-verify behavior change.

REQ-3: verified. v2 replaces the overbroad all-or-none claim with scoped transaction phases and an explicit mid-commit failure report.

REQ-4: verified. v2 defines the rerun surface and preserves/extends operation-level idempotency.

REQ-5: reopened. The validation rule still does not define symlink/realpath handling, so containment can be satisfied textually while reads come from outside the allowed roots.

REQ-6: verified. The new CLI forms now have contract tables for allowed/rejected flags, roots, movement, and exit taxonomy.

REQ-7: verified. v2 covers empty, zero-op, malformed stamp, duplicate delta requirement names, duplicate store requirement names, ignored non-md files, and zero discovery.

## Dimension Results

1. Target state B clear and unambiguous: issues open — REQ-8, REQ-9.
2. Edge cases and exception paths covered: issues open — REQ-5, REQ-8.
3. Implied but undeclared state changes or side effects: issues open — REQ-5, REQ-8.
4. Acceptance criteria testable as if/then: issue open — REQ-9.
5. Conflicts with current state A: no major issues beyond declared behavior changes.
6. Target lineage declared and matches repo reality: no major issues.

## Issues By Dimension

### 1. Target State B Clarity

**REQ-9 — `verify --change --json` failure shape is underspecified.**  
Description: The CLI table says `--json` adds `projection: { change, modules, conflicts: [] }`, but does not define the JSON shape when projection fails before verification: merge conflicts, CAS mismatch, malformed deltas, invalid names, nonexistent changes, or zero delta files. Existing `verify --json` is a pure JSON machine contract, so “naming” failures needs a structured location.  
Risk: Implementations can put failures in `errors`, `projection.conflicts`, stderr, or omit `projection` entirely while still matching parts of the prose. Tests and consumers will not have a stable contract.  
Suggested fix: Define exact `--json` output for success, gaps, and every projection error class. For example: stdout remains pure JSON; `result: "ERROR"`; `errors[]` carries validation/CAS/hygiene messages; `projection.conflicts[]` carries merge conflicts; `projection.modules[]` is present only for modules that were discoverable.

### 2. Edge Cases And Exception Paths

**REQ-5 — Path containment still omits symlink semantics.**  
Description: v2 requires every “resolved path” to be inside its root, but does not state whether symlinked change dirs, delta files, spec dirs, or existing store files are followed, rejected, or checked via `realpath`. A path like `apriori/changes/c/specs/m/spec.md` can be textually inside the change root while being a symlink to content outside it.  
Risk: This is a correctness/security gap: projected verify or archive can read outside the change root or store root, and CAS can fingerprint unintended content.  
Suggested fix: Add an explicit rule: either reject symlinks under participating roots, or use `realpath` containment for every existing path and parent-directory realpath containment for not-yet-existing store targets. State the exit code and message.

**REQ-8 — Fixed temp path ownership is not defined.**  
Description: Transaction phase 2 writes each staged result to `<store>.tmp-archive` and deletes “all tmp files” on staging failure. The requirement does not define behavior when a temp file already exists before the run, including residue intentionally left after a previous mid-commit failure.  
Risk: A run can overwrite or delete a file it did not create, or destroy the manual-completion artifact that phase 3 told the user to inspect. This is an undeclared side effect.  
Suggested fix: Require preflight to fail if any target temp path already exists, or use a unique per-run temp directory/name and delete only temp files created by the current run.

## Advisories

ADV-2 batch: tighten a few non-blocking details. Define `apriori stamp` behavior for directories, unreadable files, and extra arguments. Replace V7’s awkward “including on stores containing deprecated blocks ONLY where no deprecated blocks exist” with a simpler compatibility sentence. Consider spelling out the deprecated marker match as a regex so implementations agree on spacing and marker text.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | CAS base-stamp syntax, fingerprint algorithm, absent-store sentinel, and stamp CLI are unspecified. | CAS behavior is unimplementable/test-incompatible across implementations. | STEP0·r1 | verified |
| REQ-2 | REMOVED projection conflicts with current merge output and scenario scanning. | Projected verify can prove a different scenario set than archive/plain verify will enforce. | STEP0·r1 | verified |
| REQ-3 | Multi-module “all or none” archive lacks transaction and rollback semantics. | Partial store writes or moved change dirs can occur on I/O failure. | STEP0·r1 | verified |
| REQ-4 | Already-archived rerun behavior conflicts with discovery path and existing idempotency rules. | Implementations may silently no-op, search archives, or widen current idempotency. | STEP0·r1 | verified |
| REQ-5 | Path validation still lacks symlink/realpath containment semantics. | New `--change` surfaces can read or fingerprint outside intended roots through symlinks. | STEP0·r1 | open |
| REQ-6 | CLI grammar and option interactions for new surfaces are incomplete. | Backward compatibility and tests depend on unspecified parser behavior. | STEP0·r1 | verified |
| REQ-7 | Multi-module malformed/empty/duplicate delta handling is unspecified. | Bad deltas can be silently ignored or collapsed. | STEP0·r1 | verified |
| REQ-8 | Transaction staging uses fixed temp paths without defining ownership or pre-existing-temp behavior. | Archive can overwrite/delete stale or user-owned temp files and undermine manual recovery. | STEP0·r2 | open |
| REQ-9 | `verify --change --json` failure output shape is underspecified. | Machine consumers and tests cannot rely on a stable projection-error contract. | STEP0·r2 | open |
| ADV-2 | Advisory batch: stamp path edge behavior, V7 wording, deprecated marker regex. | Low implementation risk, improves precision. | STEP0·r2 | advisory |

VERDICT: 3 issues open
