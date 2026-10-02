<!-- provenance: provider=codex model=gpt-6-astra session=01a0fd8c-48c0-7db1-b374-c27506d163d1 date=2026-10-03 -->
# code-review — init-premanifest-adoption (round 2)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript (the final message, after `tokens used`), except one placeholder provenance line the reviewer printed at its top (`provider=openai model=unknown session=unknown`), omitted so it cannot be read as this document's provenance; it remains in code-review-v2-raw.txt.


Review body for `apriori/changes/init-premanifest-adoption/review/code-review-v2.md`. Reviewed read-only; the producer must save this body verbatim.

**ADDRESSED R1 — Newly created guide ownership**

[Init’s record function](/root/terra/wt-fu2/lib/init.js:138) now immediately records each created file, carrying `adoptPending` instead of suppressing the write. The guide is recorded immediately after installation. Update consequently processes it through the existing listed-guide rules; descriptor-location restrictions on adopting an *unlisted* guide no longer strand this newly created guide.

[IN-21](/root/terra/wt-fu2/test/init.test.js:372) now starts without a guide, requires its entry in the marked manifest, and requires update to report it `up-to-date`, without a platform-dependent omission. The immediate recording path also remains effective if a later init step throws.

**ADDRESSED R2 — Directory or symlink runbook**

[The marker predicate](/root/terra/wt-fu2/lib/init.js:133) uses `lstat`, requires a regular file, and checks realpath containment. A directory or leaf symlink cannot initiate migration marking. Regardless of that predicate, init records its newly created commands.

IN-21 exercises the directory case: no marker, newly created Codex command recorded, obstruction removed, init retried, and update reports the command `up-to-date`. Symlink exclusion is supported by the predicate’s static semantics; IN-21 does not separately exercise it.

**Whole-change assessment**

No new substantive finding.

- **Ordinary manifests retain their adoption boundary.** The reader normalizes absent or false `adoptPending` to false. Update enables runbook/command adoption only for a missing manifest or a true marker. IN-21 verifies that an unlisted command containing shipped bytes becomes `unmanaged` after the marker clears. The guide’s pre-existing adoption exception is unchanged.
- **Listed-file protection takes precedence.** [Update’s listed branch](/root/terra/wt-fu2/lib/update.js:68) returns before the adoption branch. Modified files keep their bytes and recorded hashes; missing files remain missing. IN-21 exercises a modified listed command during migration and manual recovery. Existing UP-08 checks byte and hash preservation through the shared listed-file branch.
- **Marker lifecycle matches the intended pass.** Both production manifest writers were examined. Init passes the marker through every record; update removes it at the final manifest write after candidate and pointer processing. Dry runs do not write. IN-21 injects an update failure before persistence, verifies marker retention, then verifies successful retry and removal. Clearing after a completed pass with protected or unproven files skipped is consistent with the stated rules.
- **Validation and recovery are appropriately bounded.** Non-boolean markers are rejected by the shared manifest reader before scaffolding or refreshing targets. MIGRATING’s manual-marker recovery preserves existing ownership hashes and warns about unconditional adoption of an unlisted runbook. Its older-CLI limitation is stated.
- **Scope remains cohesive.** The init/update deltas describe one migration mechanism, retaining the existing scenario IDs. FU-2’s source, revised approach, and closure evidence are traceable in the flow-state. No split is warranted.

**Advisories**

The earlier reporting advisory **still applies in narrower form**: [the manifest action remains conditional on `created.length`](/root/terra/wt-fu2/lib/init.js:204). A no-op init on a manifestless or already-marked project gives no adoption-pending reminder. Ownership is not lost: the absent manifest or existing marker still permits update’s pass. The flow-state’s statement that the advisory disappeared is therefore too strong.

IN-21’s delta and the flow-state also say every entry equals the current disk hash. That wording should exclude modified listed files, whose previous hashes must remain. The test correctly excludes the edited command from that equality assertion.

**Review limits**

Examined all changed code, tests, deltas, documentation, flow-state, relevant callers, and gate output. Current template/guide hashes belong to their generation tables; `git diff --check` passed. No builds, test-suite execution, filesystem fault injection, or concurrent-mutation experiments were performed. Reported suite and older-CLI results were not independently reproduced. Credentials, human notes, consultation transcripts, and raw review transcripts were not read.

VERDICT: no spec-vs-code gaps
