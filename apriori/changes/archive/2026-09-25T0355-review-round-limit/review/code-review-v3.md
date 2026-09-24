<!-- provenance: provider=codex model=gpt-6-astra session=01a0d4dd-dd62-7ad2-84de-db0156a42beb date=2026-09-25 -->
# code-review — review-round-limit (round 3)

- RRL-03 — resolved: `lib/config.js` rejects blank/hyphen rows even alongside numbered rows. CF-33 covers both orders; other keys retain their previous blank-cell behavior.
- RRL-07 — resolved: the remaining fixed round-2/round-5 instructions are removed from both runbooks and CLI editions. Specify exits and status descriptions now reference the configured limit.
- RRL-08 — not resolved: the runbooks are corrected, but `docs/cli.md:171` still says continuation “needs the owner to raise the row”; `docs/cli_cn.md:171` says the same. `docs/operator.md:37` and `docs/operator_cn.md:37` likewise require raising the limit to continue. GT-52, revised R4, and the implementation permit a fresh reframe for each further revising round without raising the limit. **Fix:** update all four passages to describe that alternative, preserve the accept/escalate distinctions, and extend the documentation assertions to these passages.
- RRL-10 — resolved: diagnostic construction reserves the mandatory key and range before truncating the body. Long/multiple-conflict tests assert the complete suffix and length bound.
- RRL-20 — resolved: owner entries and progress records now share `stampInRange`; the delta specifies those exact range checks. Invalid timestamp components no longer satisfy a progress record.
- RRL-21 — resolved: text and JSON expose the effective limit and progress diagnostics, with CLI-level coverage in ST-40. Both CLI editions consistently document `review.limit` and `review.progress`.

- ADV-03 — advisory, resolved: documentation tests now cover broader retired-stop wording and positively assert the Specify/status rules. The remaining continuation-language mismatch is tracked under RRL-08.

The round-3 progress record at `apriori/changes/review-round-limit/flow-state.md:32` satisfies the structural contract: valid timestamp/actor, matching family and round, all four nonempty parts, coverage of every opening ID in round 2, existing project-local regular evidence files, and an approach reason. Its claim that RRL-08 is fully corrected remains substantively incomplete as noted above.

VERDICT: 1 issues open