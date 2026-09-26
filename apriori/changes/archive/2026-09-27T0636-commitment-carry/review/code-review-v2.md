<!-- provenance: provider=codex model=gpt-6-astra session=01a0dfd9-241b-7a73-ac57-7942d22e3a1d date=2026-09-27 -->
# code-review — commitment-carry (round 2)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript.

Review body for `apriori/changes/commitment-carry/review/code-review-v2.md`; read-only permissions prevent saving it. Under RUNBOOK R2, the producer can land this body verbatim, marked “recorded on behalf of the reviewer.”

**CC-01 — ADDRESSED.** Both runbook editions now require removing the follow-up prefix when converting a registration into a dependency, and explicitly explain why merely appending a carry pointer remains non-blocking. The delta and PR-57 reflect this distinction. The test retains the blocking ordinary-carry case and adds the mixed-form non-blocking case, matching the unchanged parser. This resolves the documentation gap without introducing grammar or changing C9/R5.

**New substantive findings:** none.

**Examined:** refreshed `git diff v6-dev...HEAD` and uncommitted diff; EN/CN parity; affected contract and test assertions; corrected flow-state; follow-up classification; preservation of receiving-end ID and exit-evidence obligations, necessary-fix criteria, owner authority, R1 stops, and frozen P3. No unrelated implementation changes appeared.

Gate reports C9 passing. C8 remains blocked by round 1’s verdict and the missing round 2 summary; C1 was skipped because no test command was supplied. These are not new product findings.

**Not examined:** credentials, human-note files, raw review transcripts, other changes’ documents, or optional Layer-2 evidence. I did not rerun the producer-reported full suite, verify, or self-check, and performed no writes.

**Advisories:** none.

VERDICT: no spec-vs-code gaps
