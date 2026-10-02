<!-- provenance: provider=codex model=gpt-6-astra session=01a0fda1-9fd6-78f2-8cb7-2ecc5bd2b671 date=2026-10-03 -->
# code-review — fence-tilde-readers (round 2)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript (the final message, after `tokens used`), except one placeholder provenance line the reviewer printed at its top (`provider=openai model=unknown session=unknown`), omitted so it cannot be read as this document's provenance; it remains in code-review-v2-raw.txt.


Round 2 review for `apriori/changes/fence-tilde-readers/review/code-review-v2.md`. Read-only review body for producer transcription under RUNBOOK §1 R2.

- FTR-1: ADDRESSED — The original ghost-block defect is fixed. `parseRequirementsStrict` now discovers boundaries outside shared fence spans and slices the raw text, preserving fenced contents. Merge, MODIFIED-baseline capture, and single-file archive all use this reader. TX-03 now exercises the raw store, merge, render, and rerun. The original reproduction produces only requirement `A`, lists `TX-93` once, and reruns unchanged. The deliberate extension to backtick-fenced headings is documented. Two new boundary defects introduced by this fix are reported separately below.

- FTR-2: NOT ADDRESSED — The repeated closer search was removed, but the scanner still has superlinear paths, contrary to the new requirement that scanning remain near-linear on any input.

  In [lib/text.js:64](/root/terra/wt-fu1/lib/text.js:64), every iteration calls `s.indexOf('```', pos)`. When no backticks exist, this returns `-1` without disabling subsequent searches. For `"~~~info\n".repeat(n)`, every unmatched opener therefore searches the remaining suffix again: total searched length is quadratic. The closer cache does not prevent this.

  Additionally, [lib/text.js:53](/root/terra/wt-fu1/lib/text.js:53) filters the entire closer list for every distinct queried opener length. Put tagged openers of lengths `n+3` down to `4` before `n²` bare three-tilde lines. None of those long openers closes, so all `n` lengths scan the `n²` closer entries. Input size is O(n²), while filtering costs O(n³).

  **Risk:** externally supplied Markdown can still monopolize synchronous scanning. TX-02’s fixed-size timing checks do not establish scaling; its distinct-length case cycles through only 60 lengths.

  **Suggested fix:** retain the next backtick position or exhaustion result across iterations, and use a closer index that does not filter every closer for each distinct length. Verify scaling as both input size and distinct lengths grow.

The round-1 advisory is **settled**: the contract explicitly excludes the unchanged state reader and the golden-path script’s extraction from a known README.

New substantive findings:

- FTR-3: **Unfenced multiline headers can be truncated and split into additional requirements.** [requirementHeadings](/root/terra/wt-fu1/lib/archive-merge.js:42) chooses the next lexical boundary without accounting for how far the current heading match consumed.

  Reproduction, with no fences:

  ```text
  ### Requirement:
  ### Requirement: B
  body
  ```

  The historical regex consumes the second line as the first heading’s name, producing one complete block named `### Requirement: B`. The new reader still derives that name, but ends its block before the name-bearing line, returning only `"### Requirement:\n"`. It then returns a second block named `B`.

  **Risk:** this changes accepted historical store parsing outside the declared fenced-heading change. Requirement ownership and the old blocks supplied to integrity/drop checks change, and a returned block no longer contains its own parsed heading. The repository corpus assertion does not establish compatibility for this boundary.

  **Suggested fix:** preserve the historical heading match’s full extent and non-overlapping consumption when selecting subsequent boundaries. Do not use a boundary already consumed as part of the current heading.

- FTR-4: **Adding the first real requirement discards a store containing only a fenced example.** In [renderStore](/root/terra/wt-fu1/lib/archive-merge.js:284), no unfenced heading means `header = ''`.

  Reproduction: an existing store contains `# Store`, explanatory prose, and a closed tilde fence containing `### Requirement: Example`, with no live requirement. Apply a valid ADDED delta containing requirement `Real` and scenario `TX-99`. Parsing and merging report no problems or conflicts, but rendering returns only `Real`: the title, explanation, and complete example disappear.

  **Risk:** the newly supported interpretation correctly recognizes zero live requirements, then silently deletes existing document content when adding one. The MODIFIED-only integrity/drop guard cannot catch this ADDED-path loss. TX-03’s render test always starts with a live requirement, so it misses the case.

  **Suggested fix:** preserve the existing document as preamble when no live requirement boundary exists, and append new blocks with appropriate separation.

Examined: the round-2 code, contract, tests, migration notes and dispositions; requirement-boundary matching and raw slicing; render behavior; merge and baseline callers; integrity/drop-guard inputs; fingerprint construction; scanner complexity. Fingerprint hashing remains unchanged. The corpus guard meaningfully checks parsed block contents, but does not check rendered headers or prove compatibility outside that corpus.

Validation was static inspection with bounded, in-memory reproductions as corroboration. I did not modify files, run the full suite or corpus traversal, inspect credentials/human notes, or read raw review transcripts. The reported 887/887 results remain producer evidence.

Three substantive issues remain: FTR-2, FTR-3, and FTR-4. These are implementation defects; the shared-reader approach remains appropriate.

VERDICT: 3 issues open
