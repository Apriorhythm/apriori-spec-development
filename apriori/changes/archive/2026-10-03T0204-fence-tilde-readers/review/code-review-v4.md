<!-- provenance: provider=codex model=gpt-6-astra session=01a0fda1-9fd6-78f2-8cb7-2ecc5bd2b671 date=2026-10-03 -->
# code-review — fence-tilde-readers (round 4)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript (the final message, after `tokens used`), except one placeholder provenance line the reviewer printed at its top (`provider=openai model=unknown session=unknown`), omitted so it cannot be read as this document's provenance; it remains in code-review-v4-raw.txt.


Round 4 review for `apriori/changes/fence-tilde-readers/review/code-review-v4.md`. Read-only review body for producer transcription under RUNBOOK §1 R2.

- FTR-5: ADDRESSED — [renderReadback](/root/terra/wt-fu1/lib/archive-merge.js:298) compares the rendered store’s parsed block values against the merged blocks, in order, checking both content and count. The original unmatched-preamble reproduction now fails with a diagnostic naming `Real`.

  Both archive forms enforce the check before writing:
  - [buildProjection](/root/terra/wt-fu1/lib/archive-merge.js:475) records a conflict and retains the original module text when readback fails. High-level archive includes that conflict in its preflight refusal, before manifest creation or store staging. `verify --change` also rejects the conflicted projection.
  - The [single-file form](/root/terra/wt-fu1/lib/archive-merge.js:1372) renders once, checks that string, and returns exit 1 with `FAILED PREFLIGHT — nothing written` on failure. Subsequent structural checks and the write use the same validated string.

  TX-03 now asserts the pure rejection, single-file CLI refusal with byte-identical stored content, and high-level projection conflict with unchanged module text. These assertions cover the original failure through its actual consumers.

No new substantive findings.

Compatibility inspection found no unintended refusal in the requested cases. Comparing block values rather than map keys accommodates REMOVED operations, whose deprecated heading changes while the merge retains the original key. Rename results, ordinary reruns, and CRLF content undergo the same block normalization on both sides. Stamp-mismatch repair skips rendering and excludes repaired modules from write jobs, so that branch is not an unchecked rendering path.

Bounded in-memory checks corroborated this reading: ADDED, MODIFIED, REMOVED, and RENAMED operations under LF and CRLF, their reruns, and empty, prose-only, and closed-example preambles passed readback. All 15 current repository stores also rendered and read back successfully.

Examined: the new helper and both call sites; projection-conflict propagation; high-level staging and single-file writes; repaired reruns; deprecated and renamed blocks; CRLF handling; updated tests, contract, migration notes, disposition, and review-progress entry. Fingerprint construction and integrity/drop-guard inputs are unchanged.

I did not modify files, rerun the full suite or writable CLI tests, inspect credentials/human notes, or read raw review transcripts. Static inspection is the review basis; the bounded checks are corroboration. Producer-reported full-suite results remain producer evidence.

No new advisories.

VERDICT: no spec-vs-code gaps
