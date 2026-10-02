<!-- provenance: provider=codex model=gpt-6-astra session=01a0fd8c-48c0-7db1-b374-c27506d163d1 date=2026-10-03 -->
# code-review — init-premanifest-adoption (round 1)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript (the final message, after `tokens used`), except one placeholder provenance line the reviewer printed at its top (`provider=openai model=unknown session=unknown`), omitted so it cannot be read as this document's provenance; it remains in code-review-v1-raw.txt.


Intended landing: `apriori/changes/init-premanifest-adoption/review/code-review-v1.md`. Read-only sandbox: this review was not saved; the producer must land it verbatim, recorded on behalf of the reviewer.

**Two substantive issues**

1. **R1 — Deferral leaves a newly installed guide unrecorded on platforms without descriptor location.**

   [lib/init.js:135](/root/terra/wt-fu2/lib/init.js:135) suppresses every manifest entry during deferral, including a guide this run creates. With an existing regular runbook, no manifest, and no guide, init therefore installs the guide without recording ownership. Where `/proc/self/fd` cannot locate the subsequent read, [lib/update.js:123](/root/terra/wt-fu2/lib/update.js:123) refuses adoption—even for the current edition—and writes a manifest excluding the guide. Repeating init skips that existing file; repeating update still refuses adoption. Manual deletion/recreation is needed.

   This newly affects a successful init, against the existing [guide ownership requirement](/root/terra/wt-fu2/apriori/specs/init/spec.md:83). The safety restriction itself should remain.

   IN-21 does not establish recovery here: its fixture already contains the guide before the deferred run, and [its expected manifest conditionally excludes it](/root/terra/wt-fu2/test/init.test.js:401). Passing with `/proc` hidden therefore does not prove that everything newly created remains recoverable.

   **Suggested fix:** provide a creation/ownership path that preserves the guide’s ownership without weakening descriptor checks or IN-14. Cover a deferred run starting without a guide, including a later init failure, under unavailable descriptor location. Reconcile the unchanged guide requirement and unconditional “these files included” reporting.

2. **R2 — A non-adoptable runbook path triggers deferral and can strand newly created commands.**

   [lib/init.js:135](/root/terra/wt-fu2/lib/init.js:135) uses `existsSync`, which also accepts a directory or an escaping symlink. Static reproduction on a directory-supporting filesystem:

   - Start without a manifest, with a directory at `apriori/runbook.md`.
   - Run init for Claude: it skips the directory, creates command files, suppresses their records, and directs the user to update.
   - Update fails while reading the runbook, before writing a manifest.
   - Remove the directory and rerun init: it creates the runbook and a manifest, but skips the existing commands. Update now reports those commands `unmanaged`.

   Before this change, the first init recorded its newly created commands, preserving them through that repair. An escaping runbook symlink similarly prevents update’s promised recovery through its containment check.

   **Suggested fix:** establish that the pre-existing runbook is eligible for update before suppressing ownership records; reject obstructed/non-adoptable paths before creating files. Verify that repairing the obstruction and retrying cannot strand commands.

**Surfaces examined**

Reviewed the complete tracked diff, delta, flow-state, gate JSON, init’s CLI/preview/scaffold paths, manifest hygiene, update adoption and persistence, guide safety, relevant existing tests, and the explicitly named archived FU-2 registration.

Fresh projects and existing manifests retain their prior recording paths. Update scans commands for all supported tools, including unselected tools; both current command templates and the current guide match their generation tables. MIGRATING’s partial-manifest cure correctly warns that runbook adoption overwrites custom content; unmatched custom commands remain untouched. The report-symbol change affects display only.

FU-2’s source and closure evidence are traceable. Its original runbook/command failure is addressed for the normal regular-file case, but the findings above prevent accepting the broader recovery claim. No split or approach escalation is warranted.

**Limits and advisories**

No builds, test execution, failure injection, or implementation changes were performed. Reported 884/884 results were assessed through test assertions, not independently reproduced. Credentials, human-note files, and raw review transcripts were not read. Concurrent filesystem mutation was not independently exercised.

Advisory: deferral is reported only when `created.length > 0`; an otherwise complete manifestless project gets no deferred/update instruction, despite the new documentation’s unconditional wording.

VERDICT: 2 issues open
