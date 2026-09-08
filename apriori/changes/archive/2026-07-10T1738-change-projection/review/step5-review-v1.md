# STEP5 P8 Consistency Review — change-projection

## Inconsistencies

### IMPL-1 — Symlinked delta paths can be silently ignored or accepted outside the change tree

Description: AM-22 requires realpath containment for “a delta file” followed through symlinks, and says an escaping path exits 2. The implementation’s `mdFilesUnder()` only descends `Dirent.isDirectory()` and only includes `Dirent.isFile()` `.md` entries. A symlinked `.md` file is usually neither, so it is silently ignored instead of rejected. A symlinked `specs/` directory is worse: `discoverDeltas()` validates files against `containsReal(specsDir, abs)`, so if `specs/` itself points outside the change tree, files inside that outside target can pass because the symlink target becomes the containment root.

Risk: This violates the AM-22 security contract. A malicious or accidental symlink can hide a delta from discovery or allow spec input outside `<changes-dir>/<name>/specs/`, while the command appears to behave normally.

Suggested fix: Validate the realpath of `<changesDir>/<name>/specs` as inside the real change dir, and validate each discovered delta file’s realpath against the real change/spec root intended by the spec. Teach discovery to handle `Dirent.isSymbolicLink()` explicitly: follow it, include symlinked `.md` files only if their real target is contained, and reject escaping symlinks with exit 2.

### IMPL-2 — Some malformed base-stamp lines silently disable CAS

Description: AM-23 requires malformed base stamps to be hygiene errors. `parseStamp()` only sees lines matching `^<!--\s*apriori-base:\s*(\S+)\s*-->\s*$`. A line such as `<!-- apriori-base sha256:<digest> -->` or other malformed `apriori-base` comment does not match, so the delta is treated as unstamped and no CAS check runs.

Risk: A delta author can believe CAS protection is present while the tool silently opts out, allowing a diverged store to merge or project. This undermines the serialize-rule tooling.

Suggested fix: Treat any line/comment containing `apriori-base` that does not match the exact valid stamp syntax as a malformed stamp problem. Add AM-23 coverage for a structurally malformed stamp line, not only a malformed digest.

## Advisories

ADV-4 batch: The new scenario tests are generally meaningful and assert behavior, not just IDs. AM-22’s test should add a direct move-destination symlink case, even though the implementation appears to guard it. README/README_cn cheat-sheet rows say `archive --change` “commits failure-atomically” without the “up to the commit point” scope; RUNBOOK/RUNBOOK_cn are accurate, but the cheat-sheet wording is easy to overread. `apriori stamp` drops arguments starting with `--`, so `apriori stamp --flag file` is accepted as one positional file; tighten if the exact-argument contract is meant literally.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| IMPL-1 | Symlinked delta paths can be silently ignored or accepted outside the change tree. | AM-22 path-containment security can be bypassed or made invisible for delta inputs. | STEP5·r1 | open |
| IMPL-2 | Structurally malformed `apriori-base` comments can be treated as absent stamps. | CAS can silently opt out when the author intended divergence protection. | STEP5·r1 | open |
| ADV-4 | Advisory batch: add AM-22 move-destination symlink test; scope README cheat-sheet failure-atomic wording; tighten `stamp` flag-like argument handling if desired. | Low. | STEP5·r1 | advisory |

VERDICT: 2 issues open
