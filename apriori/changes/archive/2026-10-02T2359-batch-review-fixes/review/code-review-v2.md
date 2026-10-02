<!-- provenance: provider=codex model=gpt-6-astra session=01a0fd3f-14d0-7460-8c18-7a0bdbb927db date=2026-10-02 -->
# code-review — batch-review-fixes (round 2)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript (the final message, after `tokens used`), except one placeholder provenance line the reviewer printed at its top (`provider=openai model=unknown session=unknown`), omitted so it cannot be read as this document's provenance; it remains in code-review-v2-raw.txt.


Review body for `apriori/changes/batch-review-fixes/review/code-review-v2.md`.

The three round-one findings are addressed in their reported failure scenarios. One additional safety issue remains in the revised guide-adoption path.

- **BRF-R1 — ADDRESSED.** `readPlain` reads through a no-follow descriptor; `writePlain` opens without truncation, rejects a different device/inode, and only then truncates and writes. Both adoption and listed-guide refresh use this path. PW-02’s two `swapAtWrite` cases inject the original leaf-symlink substitution and assert the skip diagnostic, unchanged external victim, and unchanged guide manifest entry. `CHANGED` also matches the summary’s blocked pattern. This closes the original substitution-after-read scenario, subject to the separate parent-directory finding below.

- **BRF-R2 — ADDRESSED.** `record()` now persists the accumulated created-file entries immediately after creating the runbook, guide, and each command file. Existing manifest entries are retained; dry-run returns before hashing or writing; the final step only reports. IN-13 reproduces the `.cursor` obstruction after Claude’s commands are created, checks all four managed entries against their file hashes, then verifies update reports both commands `up-to-date`. The newly MODIFIED manifest requirement preserves IN-13 through IN-17.

- **BRF-R3 — ADDRESSED.** The fence state now carries its opening quote depth. A deeper-quoted delimiter cannot close it, and leaving its quote container ends it. CK-12 directly covers the original top-level-fence reproducer, a deeper-quoted delimiter, and a real version entry following an ended blockquote. The revised contract describes these distinctions.

**New finding: BRF-R4 — P2 — a parent-directory swap before the guide read can overwrite an existing external file.**

The containment/obstruction check at [lib/update.js:89](/root/terra/wt-fix/lib/update.js:89) remains separate from `readPlain` at line 103. `O_NOFOLLOW` protects the final filename, not symlinked parent components.

Concrete interleaving:

1. An unlisted guide passes `guideObstruction` inside the project.
2. Before `readPlain`, another process replaces `apriori/guides` with a symlink to an external directory.
3. That directory already contains a regular `prototype-walk.md` whose bytes match an earlier recognized shipped guide.
4. `readPlain` follows the parent symlink and reads that external regular file. Its bytes qualify for adoption.
5. `writePlain` follows the same parent symlink. Its device/inode comparison succeeds because both opens reached the same external file. [lib/managed.js:159](/root/terra/wt-fix/lib/managed.js:159) then truncates and overwrites it.

This violates the update contract’s prohibition on writes outside the project. It also exceeds the stated residual in [MIGRATING.md:9](/root/terra/wt-fix/MIGRATING.md:9): the outcome is an **existing-file overwrite**, not merely creation of a new external file. The comment that the installation residual also applies to `writePlain` is therefore insufficient.

**Suggested fix:** bind containment and parent validation to the identity actually opened for the ownership read and subsequent write; reject redirection before adopting or truncating. Add a regression that swaps the parent after obstruction checking but before `readPlain`, with an existing external victim containing a recognized earlier edition, and asserts unchanged victim bytes and no adoption. Current PW-02 injections replace only the final filename at the write open, so they cannot detect this case.

**FU-2 — appropriately retained as a separate follow-up.** I inspected c290842’s source: successful init already wrote a manifest containing only files created during that invocation, while update already limited runbook/command adoption to `manifest === null`. Thus adding a file through init in a pre-manifest project already removed adoption eligibility for its pre-existing files. IN-14 explicitly excludes adopting bystanders. This is distinct from BRF-R2’s newly created command files, which are now recorded and covered by regression assertions. FU-2 is not necessary to close that finding; its eventual solution must reconcile migration behavior with immediate ownership recording. FU-1 remains unchanged and separate.

**Review scope and limits.** Examined the revised helpers, guide branches and summary, init recording, fence handling, corresponding assertions and deltas, shipping-document updates, and the c290842 paths relevant to FU-2. Findings rely on static control flow and filesystem API semantics. I did not rerun the reported suite or mutation checks, execute filesystem races, modify files, or read credentials, human notes, or raw review transcripts.

**Advisories:** none. The remaining issue is an implementation safety gap, not grounds to reject the overall approach.

VERDICT: 1 issues open
