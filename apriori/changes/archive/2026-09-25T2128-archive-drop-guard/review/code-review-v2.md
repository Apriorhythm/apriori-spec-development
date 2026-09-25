<!-- provenance: provider=codex model=gpt-6-astra session=01a0d8b4-a8b1-71e0-b030-78ae80d44ab4 date=2026-09-25 -->
# code-review — archive-drop-guard (round 2)

- ADG-01 — resolved: [lib/archive-merge.js:782](/root/terra/asd-v62-code/lib/archive-merge.js:782) JSON-encodes the manifest fields and hashes the resulting manifest without newline normalization. Distinct CR/LF path locators remain distinct; content digests retain their intended normalization. AM-127 covers the original collision.

- ADG-02 — resolved: [lib/archive-merge.js:390](/root/terra/asd-v62-code/lib/archive-merge.js:390) captures `storeExists` from the projection snapshot, and manifest generation uses that flag. Existing empty stores contribute their content digest; only absent stores contribute `new`.

- ADG-03 — not resolved: **P2, contradictory AM-47 contract remains.** [spec.md:27](/root/terra/asd-v62-code/apriori/changes/archive-drop-guard/specs/archive-merge/spec.md:27) now correctly explains the preflight/integrity distinction, but still explicitly claims that a missing factory produces “warning + skip,” that archive-merge “never requires spec-runner,” and that an uncompilable pattern produces a `warning: modified-integrity` line. The implementation supplies a default factory, lazily requires spec-runner ([lib/archive-merge.js:538](/root/terra/asd-v62-code/lib/archive-merge.js:538)), and refuses invalid patterns during structural preflight. Existing AM-47 tests assert this implemented behavior. **Fix:** replace those stale clauses, rather than appending an exception: document default factory resolution, preflight failure, and the separate integrity-stage warning/refusal behavior.

- ADV-05 — The “last matching decision wins” test has only one matching decision ([test/archive-drop-guard.test.js:92](/root/terra/asd-v62-code/test/archive-drop-guard.test.js:92)). It verifies fingerprint selection and full entry output, but would also pass an implementation selecting the first matching entry. Use two matching entries with different reasons, followed by a nonmatching entry, and assert the second matching entry is printed.

- ADV-06 — The revised single-file diagnostic and bilingual documentation address ADV-02/04. The added R5 refusal and temp-artifact checks improve coverage. No new substantive implementation gap was found in the revised manifest, snapshot handling, or refusal ordering.

Static review only under RUNBOOK R2; the reported 822 passing tests were not independently rerun.

VERDICT: 1 issues open