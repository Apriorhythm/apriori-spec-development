<!-- provenance: provider=codex model=gpt-6-astra session=01a0d8ce-a062-7073-b070-8100b2404a58 date=2026-09-26 -->
# code-review — scope-disposition (round 3)

- SDP-02 — resolved: the readiness delta now MODIFIES “the acceptance exit is closed…” with an explicit registered-follow-up exception. Independent comparison confirms that all scenarios under that requirement are retained verbatim. `docs/cli_cn.md:159` now states the same nonblocking exception as the English edition.

- SDP-11 — resolved: `lib/readiness.js:323` obtains the current change name once through `flow.parseFlowState`, outside the item loop; the raw-text regex is gone. Independent in-memory probes confirm that fenced and commented examples neither permit self-targeting follow-ups nor block legitimate destinations. Multiline HTML comments, inline comments, scalar comments and an empty preceding `change:` scalar all preserve the canonical interpretation.

- ADV-08 — The round-3 progress record satisfies the inspected R4 requirements: correct family and round, all four populated fields, coverage of every opening ID from round 2, and five evidence references resolving to regular files inside the project. Its actions describe the verified corrections; `approach:` explains retaining the approach without becoming another findings ledger.

- ADV-09 — Optional regression-test improvement: the HTML-comment fixture in `test/scope-disposition.test.js:77` places `change:` on the same line as `<!--`. Add a multiline comment with `change:` at column zero to preserve the original counterexample against the former anchored regex. The current implementation passes that independent probe.

No new substantive findings. Reviewed the revised implementation, contract exception, retained scenarios, regression coverage and progress record. Both P3 hashes remain unchanged, and `git diff --check` passes. No files were changed. The reported 827-test suite, archive integration runs and external layer-2 scenarios were not independently rerun.

VERDICT: no spec-vs-code gaps