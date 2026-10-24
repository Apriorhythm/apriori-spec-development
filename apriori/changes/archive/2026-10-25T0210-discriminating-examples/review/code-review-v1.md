<!-- provenance: provider=anthropic model=claude-opus-5-5 session=unknown date=2026-10-25 — recorded on behalf of the reviewer (R2 transcription); the reviewer's full output follows verbatim -->

# code-review v1: discriminating-examples

Reviewer: independent session on a different tier (R2, non-Codex path). Read-only, round 1, default input.

## What I checked

- The diff `v6-dev...HEAD` (118f58b), read as the producing agent would read it. I read each new sentence next to the rules around it:
  - §4 Specify: split test, "Minimal means minimal", "Model by observable outcome, not by input example".
  - §4 Build & Test: "Do, in order", the `apriori verify` binding/GREEN semantics, "Run the tests the risks call for, not a matrix".
  - §4 Review & Deliver: disposition rule, "A later round is scoped to what changed".
  - P2: Specify bullets, `[Build & Test]`, `[Review-ready]`.
- P3 (RUNBOOK l.382 onward) is untouched. All diff hunks fall at l.304–376.
- The delta spec (PR-75), flow-state.md (`## Open` is empty), and the gate (`--json`). The gate shows C1 skipped (no test-cmd), C3/C7/C9 pass, and only C8 blocked, waiting for this review.
- `node --test test/discriminating-examples.test.js` passes (1/1). The full suite `test/*.test.js` passes 918/918. The pinned phrases "examples table may share ONE parametrized test" and "scope is judged per finding, never by volume" are still there, word for word.
- Handbook EN/CN l.359. EN "each chosen example asserted completely" and CN 「每个选定的例子都要断言完整的预期」 say the same thing.

## Substantive issues

- **DE-1 — The new examples clause contradicts the next bullet's definition of an example.**
  - *Description:* The new Specify sentence says a scenario's examples "cover the conditions in the sources that change the expected result", and each example names "its expected result". The very next bullet, "Model by observable outcome, not by input example", says inputs that produce the SAME observable outcome are examples of one Scenario, and a different outcome is a different Scenario. Read literally, a condition that changes the expected result belongs in a separate scenario, not in this scenario's table. The motivating cases make the clash concrete. Creator vs admin on a detail read is 403/404 vs 200. API vs settings page is a rejected request vs a hidden or disabled control. Those are different outcome categories.
  - *Risk:* An agent following the text either merges different-outcome cases into one examples table (against "Model by observable outcome", and against "Every user-visible output gets its own scenario"), or keeps them as separate scenarios and treats the new clause as not applying. The discriminating cases the change exists to force are exactly the ones that fall into this gap. The two rules lead to different specs, so this is not wording only (§4 Review & Deliver's test).
  - *Suggested fix:* One clause that reconciles the two. For example: "…conditions that change the expected result — within the scenario's outcome category as its examples, and a condition that changes the category as its own scenario with its own representatives — and the entry points…". Mirror it in P2.

- **DE-2 — "Entry points in the real code" sits next to "never names an internal function, handler, or payload field".**
  - *Description:* The same bullet now forbids naming handlers or payload fields as the contract, then asks each example to name "the entry point it applies to" taken from "the real code". The motivating cases (query parameter vs request body; API vs settings page vs detail editor) sit right at that line. Nothing tells the agent which side of it an entry point falls on.
  - *Risk:* Agents will name `SettingsController.update` or `req.body.name` in delta specs. That couples the contract to implementation, and the minimal-contract rule exists to prevent it. Or they will read the earlier prohibition as overriding the new duty, and the entry points get left out again.
  - *Suggested fix:* Say how an entry point is named: "named as a caller reaches it (a route, page, command or input channel), never as an internal handler". This is one phrase in §4 and in P2. The P2 version also drops "in the real code" and "in the sources" (see A-2), so align the two.

- **DE-3 — The same-rule check after a fix leaves no trace, so a one-entry-point fix can still be reported closed.**
  - *Description:* §4 Review & Deliver and P2 say to check the other entry points before reporting the finding closed. But the disposition `fixed` still only needs "its evidence", and nothing asks that evidence to show the sibling entry points were checked. In a resumed round, the reviewer judges ADDRESSED or NOT ADDRESSED against "the fix diff together with what it affects — its callers, shared state and tests". A sibling entry point the producer never touched is not in that diff and is usually not affected by it. Its omission only counts if the contract names it, which depends on DE-2 being followed.
  - *Risk:* This is the loophole the consensus was aimed at. "Fixed at the API" closes with API-only evidence, and the next round has nothing to check against, because the check left no record.
  - *Suggested fix:* No new field or ledger is needed. State that a `fixed` disposition's evidence names the other entry points of the same rule that were checked (or says there are none). That makes the check visible inside the existing disposition. One clause in §4 and in P2 `[Build & Test]`.

## Risk surfaces examined

- **Exhaustive-matrix reading:** not reopened. "never every combination by default" is consistent with "Run the tests the risks call for, not a matrix".
- **Shared parametrized test "covering" an example it never runs:** closed in both §4 and P2. "only when it actually executes and asserts that example's condition and entry point" is compatible with `verify`, which binds per scenario and treats UNBOUND as advisory. The new requirement is per example and sits below `verify`; no gate claims it.
- **New mechanisms:** none added (no gate, state-file field, ledger, document or stop). No evaluation-item ids in the RUNBOOK. P3 is frozen.
- **Self-added-promise discipline:** P2 still routes "a user-visible behavior no source settles" to the owner (see A-2).
- **Split test:** unaffected.
- **PR-75 test vs its scenario:** it asserts every THEN clause it names, at the right bullets. Negative checks are narrow (A-3).
- **EN/CN handbook l.359:** equivalent.

**Not examined:**

- How agents actually behave under the new text. Nothing was run, and review does not stand in for that.
- `docs/cli.md`.
- Other languages beyond EN/CN.

## Advisories

- A-1 The handbook updates one parametrized-test echo (l.359 EN/CN) but leaves two others unchanged: l.476 (EN) / l.476 (CN) and l.574 (EN) / l.570 (CN). flow-state's Reality Check names l.476 as the target, but the edit landed at l.359. This is the change's own "other entry points of the same rule" lesson, applied to its own docs. Docs only.
- A-2 P2's Specify clause drops "in the sources" and "in the real code". P2 is the prompt agents actually run, so dropping "in the sources" loosens the link to sources. That invites made-up conditions (self-added examples).
- A-3 PR-75's negative regexes catch only the literal words "Cartesian", "gate C\d", "a new field" and "coverage ledger". They would not catch a "matrix" or "every … × …" obligation added in other words. The P3-unchanged requirement has no assertion; I confirmed it from the diff.
- A-4 §4 puts the same-rule check only under review findings, while P2 also covers "a review or a test". Harmless, but the two scopes differ.
- A-5 "complete expected result" could be read as "snapshot every field". Once DE-1/DE-2 are fixed, "the expected result the example names" would pin it down. "by default" in "never every combination by default" does not say who may override it (presumably the sources or the owner).

VERDICT: 3 issues open
