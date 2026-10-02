<!-- provenance: provider=codex model=gpt-6-astra session=01a0fd6c-8d20-79e2-a01a-a7ef11cfd856 date=2026-10-03 -->
# code-review — batch-recheck-fixes (round 2)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript (the final message, after `tokens used`), except one placeholder provenance line the reviewer printed at its top (`provider=openai model=unknown session=unknown`), omitted so it cannot be read as this document's provenance; it remains in code-review-v2-raw.txt.


Review body for `apriori/changes/batch-recheck-fixes/review/code-review-v2.md`, returned for verbatim landing under RUNBOOK §1 R2.

**BRC-R1: ADDRESSED.** The ordered-list counterexample now encounters the unconditional delimiter-run check at [lib/check.js:243](/root/terra/wt-fix2/lib/check.js:243). It produces an unsupported-header diagnostic at line 4 and exits before matching version entries. Paragraph interruption and list recognition no longer influence the result. The original counterexample appears in CK-12 at [test/check.test.js:317](/root/terra/wt-fix2/test/check.test.js:317), where the test requires exactly one unsupported-format diagnostic containing a line number.

**BRC-R2: ADDRESSED.** The list-continuation counterexample likewise fails at its first delimiter run, line 7. No content is stripped, and no container state can suppress the second version entry. Its original duplicate-header fixture appears at [test/check.test.js:318](/root/terra/wt-fix2/test/check.test.js:318) and must produce the unsupported-format refusal. The separate ordinary-duplicate assertion remains.

The implementation and revised behavior contract agree on the owner-authorized change: any qualifying delimiter run in the header causes refusal before entry recognition, regardless of indentation, container, or whether a valid entry also exists. `stripFencedBlocks` is removed, and CK-11 no longer calls the shared `stripFences`. Without a prohibited run, the header reaches the entry matcher unchanged; with one, it cannot pass. Thus neither reported fence mechanism can admit a fenced entry or conceal a duplicate.

CK-12 also checks backtick and tilde runs, longer and unclosed runs, quoted/list forms, unrelated inline runs, and indented runs. Each fixture requires one diagnostic with a line number; a separate fixture asserts the exact line number, `6`. Positive coverage retains inline single backticks and a valid header followed by a body fence. The existing consumer-mode test and CLI dispatch preserve CK-11’s self-mode restriction.

The check delta, its Notes, MIGRATING, CHANGELOG, and the flow-state disposition consistently disclose the withdrawal of header-fence tolerance. The owner’s authorization is explicit in this review request and recorded with the transcription disclosure.

**New substantive findings:** none. **Advisories:** none.

Review scope was the round-2 changes, their header-matching path, diagnostics, tests, contract, and migration explanation. Guide ownership changes were not re-reviewed. No test suite or build was run; conclusions rest on static inspection. The gate remains blocked on round 1’s unresolved verdict and the missing round-2 summary; this invocation skipped C1 because no test command was supplied. Credentials, human-note files, and raw transcripts were not read.

VERDICT: no spec-vs-code gaps
