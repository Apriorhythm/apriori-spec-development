# Human Operator Appendix

> Moved verbatim from `RUNBOOK.md` (formerly its §6); the § references below (§1, §4, §5) point into `RUNBOOK.md`.

> Everything in this section is **run by the human**. The agent must never execute or simulate `/goal` (R3). Architecture and caveats: `docs/concepts.md` §4.7 (automating the loop with `/goal`) in the apriori-cli repository.
> **Two loops, two bounds.** *Review rounds* are governed per family by the derived loop (§1 R4 / `gate` C8) against the owner's `review-round-limit` row of `process-config.md` (default 8; at the limit the agent rules on each open finding and one re-review follows); *the implement-and-test loop* is bounded by a fixed worst-case **25 turns**, written into its recipe text below — `process-config.md` holds no number for it.

**Specify loop (run only when the owner asks for an early judgment on a specific approach, or the requirement is still substantially uncertain — the default is to skip straight to Build & Test):**
```text
/goal "Goal: apriori/changes/<change>/specs/ holds the behavior contract and the latest review verdict line is 'VERDICT: no major issues, ready to proceed to execution' — OR you stopped at a human stop (§1 R1: the reviewer escalates, a round would go past the one re-review, an item is the owner's) and your last message names it, what is still open and the decision the owner must make; that outcome hands the change back and is never a pass. No round number here — §1 R4's derived loop governs: below the owner's review-round-limit (process-config.md, default 8) keep revising, logging the review-progress note in gates: before round 3 and every later round; at the limit do not stop — write one `note: ruling …` line per open finding and run the one re-review (§1 R4); stop and report when the reviewer escalates, when a round would go past that one re-review, or when an item is the owner's.
Each round:
1. Revise the delta specs per the latest review — never touch source code — and update the state's ## Open section.
2. Re-run the heterogeneous reviewer with the P3 prompt (round 1: codex exec, note the printed session id; later rounds: codex exec resume -c sandbox_mode=\"read-only\" <session-id>), producing apriori/changes/<change>/review/spec-review-v{N}.md.
3. Surface the reviewer's verdict line here.
Stop on 'VERDICT: no major issues, ready to proceed to execution', on 'VERDICT: escalate', or when §1 R4 stops the loop."
```

**Build & Test loop:**
```text
/goal "Goal — ALL must hold: `npm test` exits 0 (naming a test with its scenario ID is a suggestion, never mandatory); lint/static analysis green (where configured); (UI projects only) the Playwright E2E suite passes and screenshot diffs are within threshold; every ## Open item in the flow-state carries a stable id (`- <ID>: <text>`) and says what is still unverified; AND `apriori gate --change <change> --review-ready --test-cmd \"npm test\"` exits 0 — OR you stopped at the 25-turn bound or at a human stop (§1 R1) and your last message names it, the conditions still unmet and the decision the owner must make; that outcome hands the change back and is never a pass. Safety bound: 25 turns.
Turn 1: derive a failing test that proves every scenario's behavior with real evidence (one parametrized test may cover a scenario's whole examples table; naming it with the scenario ID is a suggestion, never mandatory), and SHOW the failing run. Each later turn: implement the next scenario, then run `npm test` (and the Playwright run for UI projects) and SHOW the output so the result is in the transcript. When the code is complete, update ## Open and run the review-ready check.
Stop when every condition holds. If turn 25 ends with any condition still unmet, STOP anyway and report the failing evidence — which conditions failed, plus the last test output. Reaching the bound is a stopped loop for the human to judge, NEVER a pass."
```
> There is no docs-only substitute: a change with no executable test evidence has no C1 evidence; a documentation project that wants the workflow must provide a real TAP-emitting check (`apriori check` emits no TAP and cannot stand in). A project with no UI drops the Playwright clause.

**Review & Deliver:**
```text
/goal "Goal: IF this change owes a KB update (§4 Review & Deliver: an existing truth doc for the touched module, or an explicit decision to persist one), apriori/truth/<module>.md already reflects this change's new/changed facts with a refreshed source-commit stamp — a precondition of review-ready, never a step after archive; THEN an independent review by a DIFFERENT model (the P3 prompt) reports 'VERDICT: no spec-vs-code gaps'; THEN the change is archived (`apriori archive` merges the delta specs into the living store apriori/specs/ and never touches apriori/truth/) — OR you stopped at a human stop (§1 R1: an escalate verdict, a round past the one re-review, a pending item only the owner can settle) and your last message names it, what is still open and the decision the owner must make; that outcome hands the change back and is never a delivery.
If a KB update is owed, land it first and list exactly which files/sections changed. Then run the review-ready check; if it does not exit 0, go back to Build & Test — that is not a review round. Then run the consistency reviewer (codex exec / fresh claude) and paste its verdict. Then run the archive action.
At the review-round limit, rule on each open finding and run the one re-review (§1 R4) instead of stopping. Stop when all of it holds, or immediately if the verdict is 'VERDICT: escalate' or a round would go past that one re-review."
```

**Build → Review → Archive, one goal (the recommended way to run a change end to end):**
```text
/goal "Goal — this change is archived: `apriori archive --change <change> --write` has succeeded (it merges the delta specs into apriori/specs/; an archive is not a release) — OR you stopped at one of the human stops listed below (§1 R1) or at the Build & Test stage's 25-turn bound, and your last message names it, what is still open (at the bound: the conditions still unmet and the failing evidence) and the decision the owner must make; that outcome hands the change back and is never a pass or a delivery.
Work in stages, and when a stage fails go back to that stage:
1. Build & Test — derive a failing test that proves every scenario's behavior with real evidence and SHOW the failing run; then implement scenario by scenario, running `npm test` (and the Playwright run for UI projects) and SHOWING the output; update ## Open; `apriori gate --change <change> --review-ready --test-cmd \"npm test\"` must exit 0 (a failure here is Build & Test work, not a review round). Safety bound for this stage: 25 turns.
2. Review — if a KB update is owed, land it first. Run the independent reviewer with the P3 prompt (round 1: codex exec, note the printed session id; later rounds: codex exec resume -c sandbox_mode=\"read-only\" <session-id>, the message scoped as §4 Review & Deliver says) and land each round as apriori/changes/<change>/review/code-review-v{N}.md; on REVISE fix per the Fix Packet and review again. At the review-round limit do not stop: write one `note: ruling …` line per open finding and run the one re-review, exactly as §1 R4 says.
3. Archive — `apriori gate --change <change> --test-cmd \"npm test\"`, then `apriori archive --change <change> --write`. The final report lists every ruling (§1 R4).
Stop and report only at §1 R1's stops: an escalation (a `VERDICT: escalate`, or a round past the one re-review), a pending ## Open item only the owner can settle, an external side effect without its authorization, or abandonment. Reaching the Build & Test bound is a stopped loop for the human to judge, NEVER a pass."
```

**Prototype walk (optional, before the contract):** when a requirement comes with a runnable UI prototype, the agent offers a walk once — when it registers the requirement's sources — and you can also ask for one yourself: *"Walk the prototype `<path>` against `<PRD>` per `apriori/guides/prototype-walk.md`, scope `<pages>`."* The agent explores the prototype systematically and leaves a checklist — columns, fields, option values with their keys, states, exact texts, the prototype's own defects — that the contract and a later independent check work from. It needs a local server and a browser-automation tool (Playwright or an equivalent) on the machine; without them it reports what it could not exercise. The checklist is source material: it authorizes nothing, and where the requirement does not settle whether to reproduce a prototype defect, that is your call.

**What you personally decide (there are five, and no others):**

1. **An escalation** — a `VERDICT: escalate`, or a family that went past its one automatic re-review without your release (§1 R4). `apriori status --change <name> --escalation` prints it and exits 3. Answer with `reframe <family> round <n> <split|tests|redo|accept-risk> — <reason>` in `gates:`. Escalate the bar, never quietly lower it.
2. **An `## Open` item that cannot be resolved** (critical evidence blocked) — make the evidence cheaper, split the change, or accept the risk in `gates:` (`evidence-accept <ID>`). Accepting it settles that one item, and nothing else.
3. **A review family past its one automatic re-review** — at your `review-round-limit` (`process-config.md`, 8 when unset) the agent does not stop: it rules on each open finding and one re-review follows; what that re-review leaves unresolved comes to you as a pending `## Open` item (item 2). A round past the re-review needs your `reframe <family> round <n> <split|tests|redo|accept-risk> — <reason>` in `gates:`; that family's loop reopens for that round, nothing else does. A later `revise` past the re-review stops again — raise `review-round-limit` in `process-config.md` if the family should run on without asking you each round; an `accept` there proceeds on its own. A `revise` below the limit never stops for you — the agent logs `review-progress` from round 3 on and continues. The rulings are listed in the final report and the archive declaration; they do not guarantee the approach is right.
4. **Every external side effect** (§1) — one-shot, named, recorded verbatim. No blanket ever covers one.
5. **Abandonment** — your word alone.

Everything else the CLI decides mechanically, or nobody needs to: `apriori gate --change <name>` is the machine face, and `apriori status --change <name> --escalation` (exit 3) is the only hard stop this repository ships.
