<!-- provenance: provider=codex model=gpt-6-astra session=01a0fd3f-14d0-7460-8c18-7a0bdbb927db date=2026-10-02 -->
# code-review — batch-review-fixes (round 3)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript (the final message, after `tokens used`), except one placeholder provenance line the reviewer printed at its top (`provider=openai model=unknown session=unknown`), omitted so it cannot be read as this document's provenance; it remains in code-review-v3-raw.txt.


Review body for `apriori/changes/batch-review-fixes/review/code-review-v3.md`.

**BRF-R4 — NOT ADDRESSED in full.** The original single-swap reproducer is closed, but the fallback retains the external-file overwrite vulnerability.

When `/proc/self/fd` is available, `openedInside` checks the opened descriptor’s location before reading or truncating. Both update call sites supply the project root. PW-02’s new regression correctly inserts the parent symlink after obstruction checking and asserts the skip diagnostic, unchanged external bytes, and no guide adoption.

However, [lib/managed.js:146](/root/terra/wt-fix/lib/managed.js:146) falls back to `realpathSync(abs)`. That checks the pathname’s **current target**, not the file already opened. A concrete interleaving remains:

1. With descriptor lookup unavailable, redirect `apriori/guides` outside before the read open. The external file contains a recognized earlier guide edition.
2. Restore the original directory before the fallback `realpathSync(abs)`. Containment passes for the restored internal pathname, while `readFileSync(fd)` reads the external file.
3. Repeat the redirect-and-restore around the write open and its fallback containment check.
4. The device/inode comparison passes: both descriptors refer to the same external file. `ftruncateSync(fd, 0)` then truncates it and the subsequent write overwrites it.

This retains BRF-R4’s substantive risk: adoption can overwrite an existing external file. Moving the pathname check after opening narrows the window but does not bind containment to the descriptor.

The fallback also runs on **any** `/proc/self/fd` readlink failure, including Linux environments where that lookup is unavailable; it is not confined to non-Linux platforms.

**Contract and evidence.** The updated requirement still promises that the opened file is inside the project and that update never writes through a path resolving outside it. The CHANGELOG likewise states that each opened descriptor is checked. MIGRATING acknowledges a residual window, but that disclosure does not fulfill the existing containment guarantee. The new test leaves the redirected parent in place, so both descriptor-based checking and the vulnerable pathname fallback reject it; it cannot distinguish them.

**Suggested fix:** use trustworthy descriptor-bound containment on supported platforms, and fail closed when it cannot be established rather than substituting an unrelated pathname check. Add a fallback-path regression that restores the internal pathname after each external open and asserts that the external file is neither adopted nor overwritten.

No separate new finding is raised; this is the remaining portion of BRF-R4. The approach remains viable without escalation.

**Scope and limits.** Reviewed `openedInside`, both guarded I/O helpers and their call sites, the new PW-02 regression, the updated requirement/scenario, MIGRATING, CHANGELOG, and the disposition/progress entries. Evidence is static control-flow analysis. I did not rerun the reported suite or race tests, modify files, or read credentials, human notes, or raw review transcripts.

**Advisories:** none.

VERDICT: 1 issues open
