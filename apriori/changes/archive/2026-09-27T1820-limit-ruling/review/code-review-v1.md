<!-- provenance: provider=codex model=gpt-6-astra session=01a0e250-702e-7302-89cc-b47b6c252edb date=2026-09-27 -->
# code-review — limit-ruling (round 1)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript.

Review destination: `apriori/changes/limit-ruling/review/code-review-v1.md`. Not written because this session is read-only; RUNBOOK R2 provides for the producer to land this body verbatim, marked “recorded on behalf of the reviewer.”

Three substantive issues remain:

- **LR-01 — P1: Raising the limit discards existing re-review obligations.** In [lib/review.js](/root/terra/wt-d/lib/review.js:734), `R` is recomputed solely from the current limit. Consider limit 3, rulings at round 3, and a fresh-session round-4 ACCEPT marking every ruled ID ADDRESSED. A `rejected` ID absent from `## Open` correctly blocks under C8(e). If the owner now raises the limit to 6, without another review or `evidence-accept`, `R` becomes null and `rulingPath` never runs. The recorded rulings exempt round 4 from progress checking, and its ACCEPT clears the floor. C8/R4 therefore lose the obligation, while C9/R5 cannot hold an item absent from `## Open`. Raising the review budget has effectively accepted unresolved risk, contrary to S4. **Suggested fix:** preserve the established ruling/re-review obligations independently of the current limit; distinguish permission for further review from closure of residuals. GT-66’s added assertion checks only that progress findings disappear and does not protect this boundary.

- **LR-02 — P1: An arbitrary ruling note bypasses ordinary progress validation.** [lib/review.js:520](/root/terra/wt-d/lib/review.js:520) exempts any round whose preceding round has at least one parsed ruling. It does not establish that this was the automatic re-review or validate that ruling. With the default limit 8, rounds 1–2 REVISE and round 3 ACCEPT, a single timestamped `note: ruling spec-review round 2 — R-01: parked — x` suppresses the required round-3 progress record. Since no round reached the limit, `rulingPath` never rejects `parked`; C8 can pass without the required coverage, actions, or evidence checks. **Risk:** a producer-authored note bypasses an established non-forceable evidence requirement. **Suggested fix:** restrict the exemption to the identified automatic re-review backed by validated rulings, including when preserving that historical round after a limit increase.

- **LR-03 — P2: AM-136 proves an archive preview, not the contracted archive.** [test/limit-ruling.test.js:232](/root/terra/wt-d/test/limit-ruling.test.js:232) invokes `archive` without `--write`. [lib/archive-merge.js:1093](/root/terra/wt-d/lib/archive-merge.js:1093) explicitly returns success and prints the declaration from the dry-run branch. The test never establishes that the change was archived, although AM-136 requires that outcome. **Risk:** its green result does not support the claimed completed archive without `--force`. **Suggested fix:** exercise the actual write entry point and assert the archive destination, merged store, and complete ruling declaration. This is an evidence gap, not a claim that the write path currently fails.

Examined: ruling grammar and coverage, exact conclusion matching, pending/follow-up handling and duplicate-ID backstops, provenance-session comparison, round ordering and release branches, floor exclusion, shared gate/readiness consumers, archive declaration, configuration defaults, changed tests, and affected EN/CN documentation. The lazy readiness call uses the supplied flow text; I found no new initialization cycle or cached-state read. Session comparison reads review-document provenance, not `reviewer-session`; provenance remains a structural attestation rather than authenticated identity.

Both P3 blocks are unchanged against `v6-dev`. MODIFIED blocks retain all existing scenario IDs. Explicit `7` configuration remains honored.

Not examined: live reviewer/producer behavior, the optional external behavior report, actual archive execution, or unrelated security surfaces. No credentials, raw review transcripts, or other changes’ documents were read. Tests were not rerun or added. The requested gate reports empty Open items and an expected missing-summary block while this review is being produced.

Advisories: none. The approach does not require escalation or splitting, but the implementation and archive evidence need revision.

VERDICT: 3 issues open
