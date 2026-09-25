<!-- provenance: provider=codex model=gpt-6-astra session=01a0d8b4-a8b1-71e0-b030-78ae80d44ab4 date=2026-09-25 -->
# code-review — archive-drop-guard (round 3)

- ADG-03 — resolved: [spec.md:25](/root/terra/asd-v62-code/apriori/changes/archive-drop-guard/specs/archive-merge/spec.md:25) now matches the implementation: omitted factories resolve lazily, structural matcher failures refuse before integrity reporting, and integrity-stage failures warn and refuse when an old MODIFIED block contains scenarios. The contradictory clauses are removed.

- ADV-05 — resolved: [test/archive-drop-guard.test.js:90](/root/terra/asd-v62-code/test/archive-drop-guard.test.js:90) now distinguishes first-match, last-match and last-entry behavior using two matching decisions followed by a nonmatching decision.

- ADV-07 — Nonblocking: the comment at [lib/archive-merge.js:730](/root/terra/asd-v62-code/lib/archive-merge.js:730) still claims the module never requires spec-runner and integrity failure leaves archive outcomes unchanged. Update it to match the corrected contract.

No new substantive gaps found. Static review under RUNBOOK R2; the reported test results were not independently rerun.

VERDICT: no spec-vs-code gaps