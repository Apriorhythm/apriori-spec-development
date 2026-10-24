<!-- provenance: provider=anthropic model=claude-opus-5-5 session=resumed-from-round-1 date=2026-10-24 — recorded on behalf of the reviewer (R2 transcription); the reviewer's full output follows verbatim -->

# code-review v2: runtime-evidence-not-reviewable

Reviewer: the same independent P3 session as round 1, resumed (R2 non-Codex path). Read-only.

## Scope

This round covers only what changed: `git diff 07c17e1..HEAD`, which is the single commit 620cd34. I checked those edits against what they touch:

- an agent that reads P2 alone;
- R1 case 2 and the `## Open` blocking rule in §3 (l.352);
- whether the EN and CN editions of concepts and VISION say the same thing;
- PR-10's pinned phrases;
- whether the updated PR-74 delta spec matches its test.

The landed `review/code-review-v1.md` and the dispositions in flow-state are bookkeeping. I read them only to map the fixes back to the findings.

Commands I re-ran:
- `node --test test/runtime-evidence.test.js test/protocol.test.js`: 29/29 pass, including PR-10 and PR-74.
- `npm test`: 917/917 pass.
- `apriori check`: PASS.
- `apriori gate --change … --json`: C3, C5, C7 and C9 pass. C8 is blocked only because round 1 ended in revise, which is the expected state mid-review.
- `git grep` for the old project-type list (`no deploy surface; solo` / `没有部署面;单人;库;文档`) in RUNBOOK, docs and VISION: no live hits.

## Round-1 findings

- RE-1: ADDRESSED. The P2 `[Build & Test]` clause now puts the run first. It answers the root cause in place: "there is no test runner here" is not "it cannot be run", and a dev server plus a headless browser count. It allows the `## Open` branch only for "a run that genuinely cannot be made", and that item must name what was tried.
  - An agent reading only P2 can no longer pick `## Open` for a run it could make. So a change that has its evidence, or can get it, gets no new owner stop. That matches the contract and R1 case 2.
  - What remains is a run that truly cannot be made. That is an ordinary pending item under the existing §3 rule, not a new stop.
  - P2 still has no gate, field or UNBOUND wording, and the test now asserts that with a negative check on the P2 line.
  - PR-74's P2 assertion now fails if the condition or the "no test runner" counter is removed, so the test asserts what the scenario says.
  - The §4 bullet is unchanged apart from the A-6 sentence, and PR-10's phrases still pass.

## New substantive issues

None. Nothing in the fix diff breaks the current contract (the revised PR-74) or a safety constraint:

- The concepts EN and CN edits say the same thing as each other and as the RUNBOOK. Both condition the `## Open` branch, keep the no-final-report-only rule, call that item the owner's ("所有者" in CN), drop the project-type exemption list, and still say the review never closes a runtime gap.
- VISION EN and CN both drop the retired paraphrase and carry "the review reads, it does not run" / "评审只读,不运行".
- The spec and the CHANGELOG were widened to name VISION and the no-runtime-behavior sentence, and both describe exactly what was done. Neither adds a mechanism.

## Risk surfaces examined

- Producer reading P2 alone, in both directions: forced to `## Open` when it could run, or skipping the run. Both are closed.
- R1 case 2 and the `## Open` blocking rule. No new stop.
- Review-ready and the review input boundary. Unchanged.
- Final-report-only loophole. Closed in §4, P2 and both concepts editions.
- EN/CN parity in concepts and VISION.
- PR-10's phrases.
- Remnants of the old rule and the old exemption list in live documents.
- Whether PR-74's assertions match its scenario.

## Not examined

- Whether the text actually changes producer behavior. That needs an evaluation run, which a read-only review cannot settle.
- Files outside the fix diff, except where the fix diff points to them.
- The consensus document.

## Advisories

- A-1 The VISION EN and CN rows say "is run and recorded, or it is an `## Open` item" without the "genuinely cannot be made" condition. VISION is a one-line summary that points to RUNBOOK §4, where the condition is spelled out, so an agent following the RUNBOOK is unaffected. Adding "only when it cannot be run" would keep the summary from reading as a free choice.
- A-2 The concepts example of "a change with no runtime behavior of its own (a pure library function, a document)" is a little loose. A library function does run; it needs no separate manual run because its unit tests execute it, and the next bullet says unit tests always apply. Something like "(a document, or code whose behavior its tests already execute)" would avoid the misreading that library code needs no evidence.
- A-3 PR-74 checks that the project-type exemption list is gone from concepts.md, but not from concepts_cn.md. The CN text is clean today, as my grep confirmed; this is a coverage gap only.

VERDICT: no spec-vs-code gaps
