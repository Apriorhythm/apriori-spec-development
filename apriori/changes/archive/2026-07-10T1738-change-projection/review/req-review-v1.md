# Review — change-projection req-v1

## Dimension Results

1. Target state B clear and unambiguous: issues open — REQ-1, REQ-4, REQ-6.
2. Edge cases and exception paths covered: issues open — REQ-3, REQ-5, REQ-7.
3. Implied but undeclared state changes or side effects: issues open — REQ-3, REQ-4, REQ-6.
4. Acceptance criteria testable as if/then: issues open — REQ-1, REQ-2, REQ-6, REQ-7.
5. Conflicts with current state A: issues open — REQ-2, REQ-3, REQ-4.
6. Target lineage declared and matches repo reality: no major issues. The repo is on branch `v3`, current package version is `3.0.1`, and the requirement targets `apriori-cli 3.1.0` on the v3 lineage.

## Issues By Dimension

### 1. Target State B Clarity

**REQ-1 — CAS base-stamp target is not specified enough to implement.**  
Description: C1 defers base-stamp syntax/location to STEP2, and Q3 defers fingerprint algorithm/normalization. C5 also says the CLI offers a way to produce the stamp, but the command shape is not declared.  
Risk: Two implementations can both satisfy the prose while producing incompatible stamps or mismatch behavior. C2/C4 cannot be tested without knowing the exact syntax, algorithm, normalization, and absent-store sentinel.  
Suggested fix: Declare the concrete stamp syntax/location, fingerprint algorithm, byte normalization rule, absent-store representation, and CLI invocation/output format for stamp generation.

**REQ-4 — “Already-archived change” rerun behavior is contradictory.**  
Description: A6 says rerunning an already-archived change remains a no-op across all modules, but high-level discovery reads `apriori/changes/<name>/specs/`; after a `--changes-dir` move, that in-flight dir is gone and A3 would imply exit 2. Current state A also says idempotency only covers identical ADDED and already-done RENAMED; MODIFIED reruns are re-applied and REMOVED reruns can conflict.  
Risk: An implementer may search archived dirs, silently no-op missing changes, or broaden idempotency beyond the current contract.  
Suggested fix: Define the rerun surface explicitly: in-flight dir still present, archived dir already moved, or both. State exact per-operation idempotency for ADDED/MODIFIED/REMOVED/RENAMED in multi-module mode.

**REQ-6 — New CLI grammar and option interactions are incomplete.**  
Description: The requirement introduces `verify --change <name>` and a new high-level `archive --change <name>`, but does not fully define interactions with existing flags: `--specs`, `--cwd`, `--test-cmd`, `--id-pattern`, `--json`, `--store`, `--delta`, and `--changes-dir`. It is also unclear whether `--changes-dir` changes the discovery root, only controls the move, or both.  
Risk: Backward compatibility and test behavior depend on parser choices that are not specified.  
Suggested fix: Add a CLI contract table for each new form: accepted flags, rejected combinations, defaults, root paths, output mode, and exit taxonomy.

### 2. Edge Cases And Exception Paths

**REQ-3 — Multi-module transaction semantics are too broad for the stated failure model.**  
Description: A2 requires all stores committed or no store file changed on any conflict or I/O failure. Current state A only provides limited single-file staging and explicitly notes an unguarded final store rename after the change-dir move. Multi-file commit/rollback behavior, temp files, backups, move order, and crash durability are not specified.  
Risk: A partial archive can occur if one store rename succeeds and a later module fails, or if rollback itself fails. The requirement promises stronger behavior than the current primitive supports without defining the mechanism or limits.  
Suggested fix: Define the transaction boundary and algorithm: preflight all merges/CAS checks before writing, stage all outputs, commit order, rollback/backups, temp cleanup, change-dir move timing, and whether crash durability is excluded.

**REQ-5 — Path validation for new `--change` surfaces is undeclared.**  
Description: Existing archive validates `CHANGE_NAME_RE` and has a resolved-path containment guard. The new `verify --change` and high-level `archive --change` read and write paths derived from `<name>`, but the requirement only covers nonexistent names, not invalid or escaping names.  
Risk: This is a correctness and security issue: path traversal or ambiguous names could read/project/write outside the intended change tree.  
Suggested fix: Require the existing bare-kebab-case validation and resolved containment checks for both new surfaces, before any read/write/move. Invalid names should exit 2 and write nothing.

**REQ-7 — Malformed, empty, or duplicate delta content is not covered for multi-module mode.**  
Description: A3 covers zero delta files, but not a discovered delta file that is whitespace-only, content-bearing but parses to zero operations, has duplicate requirement headings that current parsing silently collapses, or multiple discovered files that map ambiguously to one store target.  
Risk: Multi-module archive or projection can silently ignore intended changes, lose duplicate blocks, or report a clean dry-run for a malformed delta.  
Suggested fix: State that high-level archive and projected verify inherit AM-08’s content-bearing zero-op guard per file, define whitespace-only delta behavior, and make duplicate requirement names / duplicate target suffixes explicit conflicts.

### 3. Implied But Undeclared State Changes Or Side Effects

No additional formal issues beyond REQ-3, REQ-4, and REQ-6.

### 4. Acceptance Criteria Testability

**REQ-2 — REMOVED projection is internally inconsistent with current merge and verify semantics.**  
Description: V3 says REMOVED scenarios are not demanded by `verify --change`, while the shared `merge()` currently deprecates the block in place and preserves its scenarios. Current `collectScenarios()` scans all `#### Scenario:` headings and does not ignore deprecated requirements. Q2 leaves the related behavior open.  
Risk: “Verify and archive share one merge semantics” is not testable as written: the archive output still contains scenarios that plain verify will demand, while projected verify is expected not to demand them.  
Suggested fix: Decide the rule now. For example, define that projected verify uses merge metadata to exclude REMOVED blocks from scenario collection, and separately state whether plain verify after archive still demands deprecated scenarios.

### 5. Conflicts With Current State A

Covered by REQ-2, REQ-3, and REQ-4.

### 6. Target Lineage

No formal issue. The requirement declares v3 branch and `apriori-cli 3.1.0`; the repo is currently v3 and `package.json` is `3.0.1`, so the lineage target matches repo reality.

## Advisories

Advisory batch: tighten wording that is probably intended but not blocking. A1 says “IDs” for merged/modified/deprecated/renamed/no-op items; current archive reports Requirement names/IDs, so use one term consistently. V1’s “no duplicate-ID error” should say “assuming the projected scenario IDs are unique” so real duplicate scenario IDs remain gaps. A4 says `changes/archive/...`; use the exact default path `apriori/changes/archive/...` when referring to the default layout. X3’s “existing 84 tests” matches the current test count by `test(` entries; remember CL-06 means `package.json` version must change to `3.1.0`.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-1 | CAS base-stamp syntax, fingerprint algorithm, absent-store sentinel, and stamp CLI are unspecified. | CAS behavior is unimplementable/test-incompatible across implementations. | 1 | open |
| REQ-2 | REMOVED projection conflicts with current merge output and scenario scanning. | Projected verify can prove a different scenario set than archive/plain verify will enforce. | 1 | open |
| REQ-3 | Multi-module “all or none” archive lacks transaction and rollback semantics. | Partial store writes or moved change dirs can occur on I/O failure. | 1 | open |
| REQ-4 | Already-archived rerun behavior conflicts with discovery path and existing idempotency rules. | Implementations may silently no-op, search archives, or widen current idempotency. | 1 | open |
| REQ-5 | New `--change` path validation and containment checks are undeclared. | Path traversal or unintended reads/writes are possible. | 1 | open |
| REQ-6 | CLI grammar and option interactions for new surfaces are incomplete. | Backward compatibility and tests depend on unspecified parser behavior. | 1 | open |
| REQ-7 | Multi-module malformed/empty/duplicate delta handling is unspecified. | Bad deltas can be silently ignored or collapsed. | 1 | open |
| ADV-1 | Wording cleanup: archive item terminology, V1 duplicate-ID scope, exact archive path, and version reminder. | Minor ambiguity for readers, low implementation risk. | 1 | advisory |

VERDICT: 7 issues open
