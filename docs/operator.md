# Human Operator Appendix

> Moved verbatim from `RUNBOOK.md` (formerly its §6); the § references below (§1, §4, §5) point into `RUNBOOK.md`.

> Everything in this section is **run by the human**. The agent must never execute or simulate `/goal` (R3). Architecture and caveats: `docs/concepts.md` §4.7 (automating the loop with `/goal`) in the apriori-cli repository.
> **Two loops, two bounds.** *Review rounds* are governed per family by the derived loop (§1 R4 / `gate` C8); *the implement-and-test loop* is bounded by a fixed worst-case **25 turns**, written into its recipe text below. `process-config.md` configures neither.

**Specify loop (run only when the owner asks for an early judgment on a specific approach, or the requirement is still substantially uncertain — the default is to skip straight to Build & Test):**
```text
/goal "Goal: apriori/changes/<change>/specs/ holds the behavior contract and the latest review verdict line is 'VERDICT: no major issues, ready to proceed to execution'. No round cap — §1 R4's derived loop governs: still revising after round 2, stop and report instead of opening round 3.
Each round:
1. Revise the delta specs per the latest review — never touch source code — and update the state's ## Open section.
2. Re-run the heterogeneous reviewer with the P3 prompt (round 1: codex exec, note the printed session id; later rounds: codex exec resume -c sandbox_mode=\"read-only\" <session-id>), producing apriori/changes/<change>/review/spec-review-v{N}.md.
3. Surface the reviewer's verdict line here.
Stop on 'VERDICT: no major issues, ready to proceed to execution', on 'VERDICT: escalate', or when §1 R4 stops the loop."
```

**Build & Test loop:**
```text
/goal "Goal — ALL must hold: `npm test` exits 0 (naming a test with its scenario ID is a suggestion, never mandatory); lint/static analysis green (where configured); (UI projects only) the Playwright E2E suite passes and screenshot diffs are within threshold; every ## Open item in the flow-state carries a stable id (`- <ID>: <text>`) and says what is still unverified; AND `apriori gate --change <change> --review-ready --test-cmd \"npm test\"` exits 0. Safety bound: 25 turns.
Turn 1: derive a failing test that proves every scenario's behavior with real evidence (one parametrized test may cover a scenario's whole examples table; naming it with the scenario ID is a suggestion, never mandatory), and SHOW the failing run. Each later turn: implement the next scenario, then run `npm test` (and the Playwright run for UI projects) and SHOW the output so the result is in the transcript. When the code is complete, update ## Open and run the review-ready check.
Stop when every condition holds. If turn 25 ends with any condition still unmet, STOP anyway and report the failing evidence — which conditions failed, plus the last test output. Reaching the bound is a stopped loop for the human to judge, NEVER a pass."
```
> There is no docs-only substitute: a change with no executable test evidence has no C1 evidence; a documentation project that wants the workflow must provide a real TAP-emitting check (`apriori check` emits no TAP and cannot stand in). A project with no UI drops the Playwright clause.

**Review & Deliver:**
```text
/goal "Goal: IF this change owes a KB update (§4 Review & Deliver: an existing truth doc for the touched module, or an explicit decision to persist one), apriori/truth/<module>.md already reflects this change's new/changed facts with a refreshed source-commit stamp — a precondition of review-ready, never a step after archive; THEN an independent review by a DIFFERENT model (the P3 prompt) reports 'VERDICT: no spec-vs-code gaps'; THEN the change is archived (`apriori archive` merges the delta specs into the living store apriori/specs/ and never touches apriori/truth/).
If a KB update is owed, land it first and list exactly which files/sections changed. Then run the review-ready check; if it does not exit 0, go back to Build & Test — that is not a review round. Then run the consistency reviewer (codex exec / fresh claude) and paste its verdict. Then run the archive action.
Stop when all of it holds, or immediately if the verdict is 'VERDICT: escalate'."
```

**What you personally decide (there are five, and no others):**

1. **An escalation** — a `VERDICT: escalate`, or a family at round 5. `apriori status --change <name> --escalation` prints it and exits 3. Answer with `reframe <family> round <n> <split|tests|redo|accept-risk> — <reason>` in `gates:`. Escalate the bar, never quietly lower it.
2. **An `## Open` item that cannot be resolved** (critical evidence blocked) — make the evidence cheaper, split the change, or accept the risk in `gates:` (`evidence-accept <ID>`). Accepting it settles that one item, and nothing else.
3. **A review family stalled after its round 2** — answer with `reframe <family> round <n> <split|tests|redo> — <reason>` in `gates:`; that family's loop reopens, nothing else does.
4. **Every external side effect** (§1) — one-shot, named, recorded verbatim. No blanket ever covers one.
5. **Abandonment** — your word alone.

Everything else the CLI decides mechanically, or nobody needs to: `apriori gate --change <name>` is the machine face, and `apriori status --change <name> --escalation` (exit 3) is the only hard stop this repository ships.
