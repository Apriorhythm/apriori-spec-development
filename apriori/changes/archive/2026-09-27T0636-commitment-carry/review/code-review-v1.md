<!-- provenance: provider=codex model=gpt-6-astra session=01a0dfd9-241b-7a73-ac57-7942d22e3a1d date=2026-09-27 -->
# code-review — commitment-carry (round 1)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript.

Review body for `apriori/changes/commitment-carry/review/code-review-v1.md`. Read-only permissions prevent saving it; RUNBOOK R2 permits the producer to land this body verbatim, marked “recorded on behalf of the reviewer.”

**CC-01 — The documented carry template overlaps the non-blocking follow-up grammar.**

`RUNBOOK.md:297` and its CN counterpart prescribe `- <ID>: <text> — carried by <change>` without constraining `<text>`. But `lib/readiness.js:234` allows arbitrary trailing text in a follow-up, including the carry pointer:

```text
- DEP-1: follow-up → receiver — required acceptance fix — carried by receiver
```

The anchored regex classifies this as a follow-up. A read-only call to `checkEvidenceStatus` confirmed `status: pass`, `0 pending`, without owner acceptance. Ordinary carry text blocks, and two separate entries with the same ID block as duplicates; neither protects this single-line overlap.

**Risk:** appending the prescribed pointer to an existing registration does not restore blocking when the item becomes a delivery dependency. The delta’s unconditional assertion that the carried form is an ordinary pending item, and flow-state’s assertion that it cannot match `FOLLOW_UP_RE`, are too broad. PR-57 tests only ordinary prose before the pointer.

**Suggested fix:** preserve C9/R5 and the existing grammar. Explicitly require the pending representation to remove the follow-up registration prefix while retaining the ID and substantive ask; clarify that appending a carry pointer alone does not change classification. Cover this overlap in the producer’s verification.

**Surfaces examined**

- Committed diff and uncommitted tracked edits; delta contract and empty `## Open`.
- EN/CN Split first, P2, receiving-end rules, and §5.
- Necessary-fix criterion: it remains specific and preserves owner authority over commitment changes.
- MODIFIED requirement: both existing scenarios, PR-42 and PR-44, remain.
- P3 remains unchanged; no C9/R5 implementation changes.
- CLI and concepts references: no stale observed-line-only receiving instruction found.
- Shared readiness classification and gate/archive/status callers.
- Gate output: C9 passes; C8 awaits this review summary; C1 was skipped without a test command. These are not additional findings.

**Not examined:** credentials, human-note files, raw review transcripts, other changes’ documents, or optional Layer-2 report. I did not independently rerun the reported 848 tests, compile, add tests, or execute archive writes. The read-only shell’s initial heredoc failure was a sandbox artifact.

**Advisories:** none. The approach remains within scope; this finding does not require a split or a new mechanism.

VERDICT: gaps found
