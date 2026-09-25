<!-- provenance: provider=codex model=gpt-6-astra session=01a0d88f-ee83-78e2-9b28-db075538470c date=2026-09-25 -->
# code-review — discuss-save-inference (round 2)

- DSI-01 — resolved: `templates/discuss.md:21` restores “Nothing the discussion did not raise”; the human-statement restriction remains specific to decisions. `test/discuss.test.js:182` pins the restored boundary, preserving permission to save discussed assumptions and sourced observations.

- DSI-02 — resolved: `templates/discuss.md:22` explicitly prohibits promoting assumptions, advice or inference into either decisions or facts. DS-14 and DS-16 assert both destinations at `test/discuss.test.js:183` and `test/discuss.test.js:262`.

- DSI-03 — resolved: `test/discuss.test.js:289` now requires the complete Chinese timing clause, including approval already held. Removing that qualification would fail the assertion.

No new substantive findings. The shortened save-only bullet retains the four-kind reference, stop requirement, prohibition on starting Ground, and reuse of existing state. The binding §4 instructions still specify `## Reality Check` placement. The silence rule remains limited to unanswered questions, and settled-conclusion timing remains consistent with DS-13.

- ADV-01 — The shell remains a faithful thin pointer: 2,550 characters, identical golden, matching newest discuss digest, disjoint generation tables, and unchanged command-digest registration. No additional static regression identified for DS-01..15, DS-06 or UP-11.
- ADV-02 — Real-client compliance remains outside this static review. The planned reruns of slots 001/006/007 remain relevant; passing textual assertions does not establish behavioral acceptance.

Reviewed the current diff, delta, flow-state, shell, bilingual runbook changes, assertions and generation consistency. Tests were not rerun. No repository writes, credential reads or human-note reads were performed.

VERDICT: no spec-vs-code gaps