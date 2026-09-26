<!-- provenance: provider=codex model=gpt-6-astra session=01a0dfd4-b546-7dd3-b46b-894836b94626 date=2026-09-27 -->
# code-review — source-intake (round 1)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript.

Independent review for `source-intake`, intended for `apriori/changes/source-intake/review/code-review-v1.md`. Returned for verbatim transcription under RUNBOOK R2 because the filesystem is read-only.

No newly found substantive issues.

Examined:

- EN/CN additions carry equivalent obligations. P2 explicitly reserves unresolved user-visible behavior for the owner through `## Open`; `decision: producer` does not override that restriction.
- Ground distinguishes source material from approved decisions, denies implicit authorization, and prevents automatic chaining of external next steps.
- Discuss first and P6 preserve both approvals. The discuss template honestly provides a section pointer; its length is 2,599 characters.
- The new Work example remains subordinate to discussion priority and the unchanged final exhaustiveness clause.
- Both P3 blocks are byte-identical to `v6-dev`. Every existing runbook paragraph survives unchanged or expanded.
- The MODIFIED requirement retains PR-01–PR-16, changing only PR-07/09/14. Template goldens match, and both generation hashes are registered.
- Reviewed scenario assertions, routing mutation coverage, and template delivery through init/update.

Evidence limits and advisories:

- Read the optional behavior report, but did not independently reproduce its real-client runs. Its misattributed producer decision and differing edge-case judgments limit claims of reliable model compliance; they do not establish a contradiction in the shipped rules.
- Did not rerun the reported 846 tests, self-check, or verification. Did not examine credentials, human notes, raw review transcripts, or unrelated runtime security surfaces.
- `gate --json` reports C8 blocked awaiting this review document; C1 skipped without a configured test command. C3/C7/C9 pass, with no open items. This review does not itself establish archive readiness.

The change fits one coherent requirement and evidence chain; no split is needed.

VERDICT: no spec-vs-code gaps
