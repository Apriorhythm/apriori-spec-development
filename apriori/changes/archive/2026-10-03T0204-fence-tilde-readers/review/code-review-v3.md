<!-- provenance: provider=codex model=gpt-6-astra session=01a0fda1-9fd6-78f2-8cb7-2ecc5bd2b671 date=2026-10-03 -->
# code-review — fence-tilde-readers (round 3)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript (the final message, after `tokens used`), except one placeholder provenance line the reviewer printed at its top (`provider=openai model=unknown session=unknown`), omitted so it cannot be read as this document's provenance; it remains in code-review-v3-raw.txt.


Round 3 review for `apriori/changes/fence-tilde-readers/review/code-review-v3.md`. Read-only review body for producer transcription under RUNBOOK §1 R2.

- FTR-2: ADDRESSED — [fenceSpans](/root/terra/wt-fu1/lib/text.js:37) now retains the next backtick position, including an exhausted search. Advancing through tilde openers no longer searches the same suffix repeatedly. The max segment tree replaces per-length filtering: preprocessing is linear in input size, and each closer query uses logarithmic search and tree traversal. This removes both superlinear mechanisms identified in round 2. TX-02 now includes the large unmatched-opener input, distinct long openers preceding many short closers, and an unmatched backtick preceding tilde openers. Static complexity supports the fix independently of timing results.

- FTR-3: ADDRESSED — [requirementHeadings](/root/terra/wt-fu1/lib/archive-merge.js:35) now consumes the complete historical heading match before searching for the block’s ending boundary, then resumes from that boundary. The original reproduction, `"### Requirement:\n### Requirement: B\nbody\n"`, again produces one complete block named `### Requirement: B`. TX-02 compares the historical regex against multiline names, nameless trailing headings, adjacent requirements, and CRLF. Bounded in-memory comparisons, including duplicate-name handling, corroborated the static reading.

- FTR-4: ADDRESSED — [renderStore](/root/terra/wt-fu1/lib/archive-merge.js:294) now retains a nonempty document with no live requirement as preamble, normalizing its trailing whitespace to a blank line. The original closed-example reproduction and the prose-only case retain their content, append the first requirement, and rerun unchanged. TX-03 asserts those results and the empty-store case. The prose-only correction is declared in the contract, CHANGELOG, and MIGRATING. A separate interaction introduced by preserving preambles remains below.

One new substantive finding:

- FTR-5: **A preserved unmatched opener can hide the newly added requirement while archive reports success.**

  Existing store:

  ```text
  # Store

  ~~~
  ```

  ADDED delta:

  ```text
  ## ADDED Requirements

  ### Requirement: Real
  Body.

  ~~~
  example
  ~~~

  #### Scenario: TX-99 real
  - t
  ```

  The existing store has no live requirement. Its unmatched tilde opener is ordinary text under the declared span grammar. After `renderStore` preserves that preamble and appends `Real`, the preamble’s opener pairs with the first tilde line inside the new block. The resulting closed span contains—and hides—the `Real` heading.

  The product’s pure entry helpers produce this evidence chain:

  - `parseDeltaStrict`: no problems.
  - `merge`: no conflicts; reports `Real` added.
  - `parseRequirementsStrict(rendered)`: no requirements.
  - `collectChangePairs`: no scoped requirements; `TX-99 real` is classified outside the change.
  - `structuralPreflight`: no refusals or debt.
  - Repeating the merge reports `Real` added again.

  **Risk:** a valid ADDED operation can be reported successful while its requirement disappears from structural discovery and its scenario escapes change-scoped validation. Reruns duplicate the addition. This is introduced by retaining previously discarded preamble text. The single-file archive path proceeds from this structural preflight directly to writing the rendered store; an ADDED-only operation receives no MODIFIED drop check.

  **Suggested fix:** validate the composed projection against the operations and scenario scope it must preserve. When retained preamble syntax consumes an inserted requirement, refuse before writing with a diagnostic identifying the boundary interaction. Cover unmatched preamble markers followed by fenced content in the first added requirement, including rerun behavior.

Examined: the round-3 scanner, boundary walker, rendering changes, updated assertions and contract, migration notes, dispositions, and review-progress entry; their effects on projection, scenario scope, integrity inputs, and archive preflight. Fingerprint construction is unchanged. No further substantive issue was found in the reviewed changes.

Validation used static inspection and bounded in-memory reproductions. I did not modify files, run the full suite or corpus traversal, inspect credentials/human notes, or read raw review transcripts. Producer-reported suite and timing results remain producer evidence.

No new advisories. The approach remains appropriate; FTR-5 is a composition and preflight defect.

VERDICT: 1 issues open
