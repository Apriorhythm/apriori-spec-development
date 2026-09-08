**Issues**

**GIMPL-1 — Archived change resolution validates against the wrong root and does not require archived candidates to be directories**

Description: GT-07 and the requirement require archived changes to be resolved from directories under `apriori/changes/archive/`, with realpath containment inside that archive root. In [lib/gate.js](/mnt/d/Workbench/misc/apriori-spec-development/lib/gate.js:29), archived candidates are collected by basename only, and [lib/gate.js](/mnt/d/Workbench/misc/apriori-spec-development/lib/gate.js:35) checks `containsReal(changesDir, dir)` instead of `containsReal(archRoot, dir)`.

Risk: A matching archive entry that is a symlink to another path inside `apriori/changes/` but outside `archive/` can be accepted as an archived change. A matching non-directory can also be selected as the newest candidate and turn a valid archived change into an exit-2 failure. This violates the path/symlink containment guarantee and can make gate read the wrong change artifacts.

Suggested fix: Resolve archived candidates with dirents/stat, require the selected candidate to be a directory after following symlinks, and containment-check against `archRoot`, not `changesDir`. Add GT-07 coverage for an archived symlink escaping `archive/` but still inside `changes/`, plus a matching non-directory basename.

**Advisories**

The test bindings are mostly faithful, but a few scenario claims are only partially exercised:

- GT-05 tests symlinked verdict docs, but not symlinked raw evidence. The code does use `lstat` first for raws, so this is a test-strength advisory only.
- GT-11 does not exercise every named JSON exit-2 class; unreadable/missing flow-state and verify-untrustworthy JSON are not asserted there. The code path appears to emit pure JSON for those classes.
- GT-12’s fingerprint detects create/delete and size/mtime changes, but not same-size content rewrites with restored mtime. Static inspection shows `gate` itself performs no writes, so this is not a spec-vs-code gap.
- README and README_cn each contain the `apriori gate --change <name>` cheat-sheet row twice.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| GIMPL-1 | Archived resolution checks containment against `apriori/changes` instead of `apriori/changes/archive`, and selects archive candidates by matching basename without requiring a contained directory. | Gate can accept an archived symlink outside the archive root or select a non-directory candidate, violating GT-07 path semantics. | STEP5·r1 | open |
| ADV-GIMPL-1 | Advisory batch: strengthen GT-05 raw-symlink, GT-11 JSON exit-2, and GT-12 fingerprint assertions; remove duplicated README/README_cn gate rows. | Low; test/doc hygiene, with implementation otherwise matching those behaviors. | STEP5·r1 | advisory |

VERDICT: 1 issues open
tokens used
800,846
**Issues**

**GIMPL-1 — Archived change resolution validates against the wrong root and does not require archived candidates to be directories**

Description: GT-07 and the requirement require archived changes to be resolved from directories under `apriori/changes/archive/`, with realpath containment inside that archive root. In [lib/gate.js](/mnt/d/Workbench/misc/apriori-spec-development/lib/gate.js:29), archived candidates are collected by basename only, and [lib/gate.js](/mnt/d/Workbench/misc/apriori-spec-development/lib/gate.js:35) checks `containsReal(changesDir, dir)` instead of `containsReal(archRoot, dir)`.

Risk: A matching archive entry that is a symlink to another path inside `apriori/changes/` but outside `archive/` can be accepted as an archived change. A matching non-directory can also be selected as the newest candidate and turn a valid archived change into an exit-2 failure. This violates the path/symlink containment guarantee and can make gate read the wrong change artifacts.

Suggested fix: Resolve archived candidates with dirents/stat, require the selected candidate to be a directory after following symlinks, and containment-check against `archRoot`, not `changesDir`. Add GT-07 coverage for an archived symlink escaping `archive/` but still inside `changes/`, plus a matching non-directory basename.

**Advisories**

The test bindings are mostly faithful, but a few scenario claims are only partially exercised:

- GT-05 tests symlinked verdict docs, but not symlinked raw evidence. The code does use `lstat` first for raws, so this is a test-strength advisory only.
- GT-11 does not exercise every named JSON exit-2 class; unreadable/missing flow-state and verify-untrustworthy JSON are not asserted there. The code path appears to emit pure JSON for those classes.
- GT-12’s fingerprint detects create/delete and size/mtime changes, but not same-size content rewrites with restored mtime. Static inspection shows `gate` itself performs no writes, so this is not a spec-vs-code gap.
- README and README_cn each contain the `apriori gate --change <name>` cheat-sheet row twice.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| GIMPL-1 | Archived resolution checks containment against `apriori/changes` instead of `apriori/changes/archive`, and selects archive candidates by matching basename without requiring a contained directory. | Gate can accept an archived symlink outside the archive root or select a non-directory candidate, violating GT-07 path semantics. | STEP5·r1 | open |
| ADV-GIMPL-1 | Advisory batch: strengthen GT-05 raw-symlink, GT-11 JSON exit-2, and GT-12 fingerprint assertions; remove duplicated README/README_cn gate rows. | Low; test/doc hygiene, with implementation otherwise matching those behaviors. | STEP5·r1 | advisory |

VERDICT: 1 issues open
