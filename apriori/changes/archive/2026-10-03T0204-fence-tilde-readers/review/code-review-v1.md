<!-- provenance: provider=codex model=gpt-6-astra session=01a0fda1-9fd6-78f2-8cb7-2ecc5bd2b671 date=2026-10-03 -->
# code-review — fence-tilde-readers (round 1)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript (the final message, after `tokens used`), except one placeholder provenance line the reviewer printed at its top (`provider=openai model=unknown session=unknown`), omitted so it cannot be read as this document's provenance; it remains in code-review-v1-raw.txt.


Review of `fence-tilde-readers`, intended for `apriori/changes/fence-tilde-readers/review/code-review-v1.md`. Read-only session: this body requires producer transcription under RUNBOOK §1 R2.

Two substantive issues remain:

- **FTR-1 — Archive still treats fenced requirement headings as real store boundaries.** [TX-03](/root/terra/wt-fu1/test/fence-tilde-readers.test.js:100) manually strips fences before calling `parseRequirementsStrict`, claiming every caller does so. However, [merge](/root/terra/wt-fu1/lib/archive-merge.js:205), [MODIFIED-baseline capture](/root/terra/wt-fu1/lib/archive-merge.js:368), and the single-file archive path pass raw store text.

  The test’s own store contains requirement `A`, a tilde-fenced requirement `Ghost`, and live scenario `TX-93` after the fence. The raw parser splits that into `A` and `Ghost`, truncating `A` before its fence closes. Applying a MODIFIED replacement of the complete `A` that changes only `Prose.` to `Updated prose.` retains the old `Ghost` tail beside the replacement. The rendered projection exposes scenario titles `TX-93`, `TX-92`, `TX-93`, instead of only `TX-93`.

  **Risk:** valid updates produce incorrect projections and spurious preflight refusals; the integrity engine receives incomplete old blocks. The promised opaque store reading is not implemented through the archive entry paths. TX-03’s direct comparison of complete blocks misses this defect.

  **Suggested fix:** make store block-boundary discovery fence-aware while preserving raw block contents, and use those complete blocks for merging and integrity baselines. Verify a prose-only replacement and an idempotent rerun through the real archive/projection path. Simply stripping stored bodies would lose content.

- **FTR-2 — Unmatched tilde openers cause quadratic scanning.** In [fenceSpans](/root/terra/wt-fu1/lib/text.js:51), each unmatched opener searches every remaining line for a closer, then advances only one line and repeats.

  For the input `"~~~info\n".repeat(n)`, every line opens a candidate fence and none closes one. The implementation performs `n(n−1)/2` closing checks: 8,000 lines—64 KB—require approximately 32 million checks. This follows directly from the loop bounds, independently of sandbox timing.

  **Risk:** modest external Markdown can consume excessive synchronous CPU across check, verify, gate, and archive. The MODIFIED engine invokes the scanner repeatedly, multiplying the cost.

  **Suggested fix:** avoid rescanning suffixes for each failed opener while preserving the declared unmatched-opener behavior. Include bounded performance evidence for repeated unmatched openers.

Examined: the complete tracked diff and untracked contract/test; shared scanner precedence, longer runs, unmatched markers, CRLF and mid-line backtick endings; config, discovery, delta, store, integrity, review and C6 call paths; raw-offset mapping; fingerprint construction; MIGRATING and CHANGELOG. With no line-start tilde opener, successive non-overlapping three-backtick searches preserve the historical regex’s match boundaries. Fingerprint hashing itself is unchanged.

Not independently established: the reported 887-test results or repository-wide Markdown equivalence. I did not run the full suite, compile, add tests, write files, read credentials/human notes, or inspect raw review transcripts. Findings rest on static code paths; an in-memory reproduction corroborated FTR-1. Gate reported C1 skipped and C8 blocked pending completed review evidence; neither is counted as a product defect.

Advisory: `scripts/golden-path.mjs` retains its own backtick-only reader for Quickstart shell extraction. Clarify whether documentation’s “every structural reader” excludes that developer script and the explicitly unchanged state reader.

The shared-helper approach remains appropriate; these are implementation and evidence gaps.

VERDICT: 2 issues open
