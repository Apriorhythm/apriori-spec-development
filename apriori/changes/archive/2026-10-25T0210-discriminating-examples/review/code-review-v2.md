<!-- provenance: provider=anthropic model=claude-opus-5-5 session=resumed-from-round-1 date=2026-10-25 — recorded on behalf of the reviewer (R2 transcription); the reviewer's full output follows verbatim -->

# code-review v2: discriminating-examples

Reviewer: the same session as round 1, resumed (R2, non-Codex path). Read-only. Round 2 is scoped to what changed (§4 Review & Deliver).

## Scope

- The fix diff is `118f58b..6484629`, which is the branch head. I judged it together with the text it affects:
  - P2 as an agent would read it on its own.
  - "Model by observable outcome, not by input example".
  - The minimal-contract prohibition on naming internal functions or handlers.
  - The disposition rule and the resumed-round scope.
  - `verify`'s per-scenario binding semantics.
- I also read the updated delta spec (PR-75), the PR-75 test, flow-state.md's new Reality Check lines and gates note, and the three concepts EN/CN echoes.
- I ran:
  - `node --test test/*.test.js`: 918/918 pass.
  - `apriori gate --change discriminating-examples --json`: C3, C5, C7 and C9 pass. C8 is blocked only on this round. C1 is skipped because no test-cmd is configured. I did not re-run the producer's projected `verify`. Review reads, it does not run.
- P3 (RUNBOOK l.382 onward) is untouched by the fix diff.

## Round-1 findings

- DE-1: ADDRESSED — In both §4 Specify and P2, the examples now cover conditions "within that scenario's outcome category", and "a condition that changes the category is its own scenario". This is now consistent with "Model by observable outcome", where inputs with the SAME outcome are examples and a different outcome is a new Scenario, and with "Every user-visible output gets its own scenario". An agent reading P2 alone gets the same rule.
- DE-2: ADDRESSED — "in the real code" is gone. An entry point is now "named as a caller reaches it (a route, a page, a command, an input channel), never as an internal handler", in §4 and in P2. That sits cleanly beside "a spec never names an internal function, handler, or payload field as if it were the contract". The motivating cases still fit: query parameter vs body are input channels, and API vs settings page vs detail editor are routes and pages.
- DE-3: ADDRESSED — §4's disposition rule now says a `fixed` disposition's evidence "names the other entry points of that rule it checked (or says there are none)". P2 `[Build & Test]` mirrors it ("let the fix's evidence name the entry points you checked"). This puts the record inside the existing `fixed` (with its evidence) disposition: no new field, ledger or document. In a resumed round, the reviewer judging ADDRESSED / NOT ADDRESSED can now see which sibling entry points were checked and dispute the list. A fix at one entry point with evidence for that one entry point alone no longer reads as closed.

## New substantive issues

None. Nothing in the fix diff violates the current contract (PR-75 as updated) or a safety constraint:
- The negative checks pass over every added fragment: no gate, field, ledger, matrix or Cartesian obligation, new document, or task-specific list.
- The two pinned phrases ("examples table may share ONE parametrized test", "scope is judged per finding, never by volume") survive.
- `verify` still binds per scenario. The per-example evidence requirement sits below it and no gate claims to check it, which is what the consensus asked for.

## Risk surfaces

**Examined:**
- Consistency of the §4 and P2 wording for all three clauses.
- Interaction with the outcome-category bullet and the handler prohibition.
- The disposition record vs the resumed-round scope.
- Whether the exhaustive-matrix reading comes back. It does not: "never every combination by default (the sources or the owner may ask for more)" reads as an override held by the sources and the owner, not as a new obligation.
- PR-75 test vs its updated THEN:
  - Every added clause is asserted at its bullet.
  - The concepts echoes are checked by equal counts in EN and CN (three each: EN l.359/476/574, CN l.359/476/570).
  - The negative regexes are widened, and the disposition anchor is moved to the new opening fragment.
- EN/CN echo equivalence.

**Not examined:**
- How agents actually behave under the new text. Nothing was run.
- `docs/cli.md`.
- Anything outside the fix diff and what it affects, beyond round 1's whole-change pass.

## Advisories

- A-6 P2's Specify bullet leaves out §4's "(the sources or the owner may ask for more)". An agent reading P2 alone sees "by default" without being told who may lift it. This is harmless, because P2 elsewhere routes behaviors no source settles to the owner.
- A-7 The outcome-category parenthetical attaches to *conditions* only. An entry point whose outcome category differs is still covered by "Every user-visible output gets its own scenario", but only implicitly; an example is a settings page that hides a control while the API returns 403. "(…a condition or an entry point that changes the category…)" would make it explicit.
- A-8 Small wording drift between bullets: Specify says "the expected result it stands for", and Build & Test says "the expected result it names". Also, the disposition sentence opens with "a review or a test", but a test failure found during Build has no disposition. P2's "before you report it closed" covers that case. Neither drift changes what an agent would do.

VERDICT: no spec-vs-code gaps
