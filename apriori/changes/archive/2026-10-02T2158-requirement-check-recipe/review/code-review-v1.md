<!-- provenance: provider=codex model=gpt-6-astra session=01a0fcdd-0acb-78c1-9595-dfa2d191569c date=2026-10-02 -->
# code-review — requirement-check-recipe (round 1)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript, except one placeholder provenance line the reviewer printed at its top (`provider=openai model=unknown session=unknown`), omitted so it cannot be read as this document's provenance; it remains in code-review-v1-raw.txt.


Review body for `apriori/changes/requirement-check-recipe/review/code-review-v1.md`. Read-only session: the producer must land this verbatim, recorded on behalf of the reviewer.

No newly found substantive issues. Reviewed HEAD `e22e8d80d0955db242255ea3af4295116f2a547b` plus the working-tree changes; `v6-dev...HEAD` is empty.

Examined:

- **Completion and independence:** the recipe requires the independent reviewer’s reconciliation, prohibits marking unchecked rows reconciled, and requires separate re-check closure. Ordinary unfinished work remains work to continue within delegation; hand-back is explicitly distinct from delivery.
- **P3 separation:** requirement-check inputs are listed separately. Fix changes register the report in Ground, retain finding IDs and undergo their own P3. The explicit exclusion of earlier conclusions from P3 defaults agrees with Ground’s existing input boundary.
- **Artifact placement:** reports and re-checks stay outside archives and change review directories. This avoids the actual review-family scanner in `lib/review.js`. Guide §5/§9 preserve frozen predecessors, inherited IDs and evidence references, and establish one current checklist that fix changes reference without copying.
- **Disposition and acceptance:** necessary fixes, follow-ups and owner calls agree with RUNBOOK §4. The optional acceptance walk includes visible expectations, preparation, side-effect authorization and recording before classification.
- **Consistency and test pins:** EN/CN recipe blocks are identical and their explanations agree. PW-05 retains its archive-freeze, successor, single-progress-source and anti-false-green assertions; PR-68 additionally requires the new placement exception. OPM-03/04 retain their existing recipe protections. PR-66 retains the goal-line stop and applicable 25-turn checks. CHANGELOG accurately describes the change without claiming demonstrated runtime effectiveness.

Validation: the six selected documentation tests—OPM-03/04, PR-66/67/68 and PW-05—passed with test isolation disabled; `git diff --check` passed. Static inspection is the basis of this verdict.

The requested gate reports C8 blocked pending this review’s summary; C1 is skipped without a test command. Neither is a newly discovered product defect. `## Open` is empty.

Not examined: live `/goal` execution, an actual requirement-check/fix/re-check run, browser acceptance or external side effects. No behavior run was performed, consistent with the planned zero. The reported 883-test suite, self-check and verification were not independently rerun. Credentials, human-note files and raw review transcripts were not read.

Advisories: none.

VERDICT: no spec-vs-code gaps
