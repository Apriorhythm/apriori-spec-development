<!-- provenance: provider=anthropic model=claude-opus-5-5 session=unknown date=2026-10-24 — recorded on behalf of the reviewer (R2 transcription); the reviewer's full output follows verbatim -->

# code-review v1: runtime-evidence-not-reviewable

Reviewer: independent P3 session (R2 non-Codex path, separate Claude tier). Read-only. Base `v6-dev@d627acb`, head `07c17e1`.

## What I checked

- The full diff `v6-dev...HEAD`: RUNBOOK §4 Build & Test bullet (l.313), the P2 `[Build & Test]` line (l.377), docs/concepts.md and docs/concepts_cn.md (l.362), CHANGELOG, the delta spec (PR-74), flow-state.md, and test/runtime-evidence.test.js.
- How an agent would read the new sentences next to the surrounding rules:
  - R1 case 2 (l.75) and its three owner exits.
  - `## Open` semantics: §3 l.352 ("exactly one thing blocks: a pending item") and the re-review closure path at l.128.
  - Review-ready (l.319): a pending item does not stop review-ready.
  - The Build & Test Exit, the P3 input boundary (l.320) and the self-added-promise discipline.
- Leftovers of the retired rule: `git grep` over every tracked file outside archives, for the EN sentence and the CN `仪器` wording.
- I ran `node --test test/runtime-evidence.test.js test/protocol.test.js`: 29/29 pass, and PR-10 still holds.
- I ran `apriori verify --change … --test-cmd` on those two files: GREEN. The UNBOUND count is just the narrow test command.
- I ran `apriori gate --change runtime-evidence-not-reviewable --json`: BLOCKED only on C8 (no review landed yet, as expected); C3, C7 and C9 pass.

Against the consensus constraints:
- (1) Satisfied by the §4 bullet.
- (2) Satisfied by "Review reads; it does not run … never closes a runtime gap".
- (3) Satisfied: the bullet names migration, job and real-service call.
- (4) Satisfied in the text: no gate, field, UI-specific check or UNBOUND change appears. R1 case 2 is cited as the existing stop, not a new one.

The §4 bullet itself closes the final-report loophole: it requires "genuinely cannot be made", "what was tried", and "never only a sentence in the final report". The EN and CN concepts editions say the same thing as each other.

## Substantive issues

- **RE-1 — P2 offers run-or-Open as a free choice; the condition and the root-cause clause stay in §4 only.**
  *Description.* P2 says a runtime behavior no test executes "is run once in the environment at hand and recorded as an `observed:` line …, or it is an `## Open` item with a stable id". Read as P2 is written, the two branches have equal standing. The condition that makes `## Open` the fallback lives only in the §4 bullet: "When the run genuinely cannot be made, … what was tried". The same goes for the clause that answers the recorded root cause: "there is no test runner here" is not "it cannot be run". The contract requires P2 to "carry the same clause to the producer". P2 is the text the producer actually has in front of it. Rule 4 (l.46) tells the agent not to preload §4 and to read a section only when something points there, so a producer working from P2 alone may never see the condition.
  *Risk.* There are two failure modes, one in each direction:
  - A producer that could run the page, migration or job writes an `## Open` item instead. That item is pending, so it blocks C9/R5 until the owner answers it (R1 case 2). This is exactly the owner stop the contract forbids: "a change that has its runtime evidence, or can obtain it, stops nowhere new".
  - The observed failure ("no test runner" taken to mean "can't run") gets no direct counter at the point where the producer acts. The fix then rests on the producer choosing the right branch unaided.

  PR-74's P2 assertion only matches the order `run … observed: … ## Open`. It passes on this unconditioned wording, so the test asserts less than its scenario ("P2 carries the same clause").
  *Suggested fix.* Condition the branch in P2, for example: "… is run once in the environment at hand ("no test runner" is not "cannot be run") and recorded as an `observed:` line (done / expected / happened / where the evidence lives); only a run that genuinely cannot be made is an `## Open` item with a stable id naming what was tried; the review does not stand in for that run." Then pin `genuinely cannot` and `no test runner` in the PR-74 P2 assertion.

## Risk surfaces examined

- Contradiction with R1. None: case 2 already covers an unresolvable evidence item, and the bullet cites it rather than adding a stop.
- Contradiction with the `## Open` blocking rule. None in §4. RE-1 covers P2.
- Contradiction with the review-ready rule. None: a pending runtime item still does not stop review-ready.
- Contradiction with the review input boundary. None: `observed:` lines sit in flow-state, which is in the reviewer's default input.
- Final-report loophole. Closed in §4. P2 is under RE-1.
- New gate, field or UI-specific check. None in the text or the CLI; no lib/ files changed.
- EN/CN parity of the concepts edits. They match.
- Surviving copies of the old rule. Its literal sentence is gone everywhere; see A-1 for a paraphrase.
- PR-10's pinned phrases. They survive.
- Whether the PR-74 test is faithful to its scenario. Partly: see RE-1, A-3 and A-4.

## Not examined

- Whether the new text actually changes producer behavior. That needs an evaluation run, which a read-only review cannot settle.
- The R1024 consensus document itself, which is outside my default input.
- The full test suite (`npm test`). I ran only the two relevant files.

## Advisories

- A-1 VISION.md l.32 and VISION_cn.md l.32 still state the retired rule as a paraphrase. EN: "where none exists, the independent review is the instrument (RUNBOOK §4 Build & Test; concepts §1.5)". CN: "没有仪器的地方,独立评审就是仪器". Both cite the section this change rewrote. The paraphrase lacks the word "there", so PR-74's literal check passes, and the flow-state echo scan ("operator.md 无回声") missed these files. Suggested rewrite: "executable instruments first; a runtime behavior no instrument executes is run and recorded, or it is an `## Open` item — the review reads, it does not run". Add VISION.md and VISION_cn.md to PR-74's doc list.
- A-2 Both concepts editions use the same unconditioned "… or it is an `## Open` item for the owner" as P2 (RE-1). Their parenthetical "(a static property, a type, a guard; no deploy surface; solo; library; docs)" mixes properties settled by reading with the old project-type exemption list, the same list that sat in the retired sentence. A reader can take "library" or "no deploy surface" to mean "review settles the runtime there", which partly brings back the per-project-type reading that the RUNBOOK now rules out. Suggestion: drop the project-type items, or say they need no run because they have no runtime behavior, not because review replaces the run.
- A-3 PR-74 checks the concepts editions only for "review reads" and "never closes"; it does not check the `observed:` / `## Open` / final-report parts the scenario says "agree". It also checks docs/operator.md but not docs/operator_cn.md. My grep found no remnant in operator_cn.md, so this is a coverage gap only.
- A-4 The "no gate, field or UNBOUND" negative assertion covers the §4 bullet only, not the P2 line.
- A-5 concepts_cn uses "业主" for owner in the new text but "所有者" in the next bullet. It also uses a full-width "，" in "评审只读，不运行" amid half-width punctuation. These are terminology and style only.
- A-6 The evidence path `apriori/tmp/` is gitignored, so screenshots do not survive into the archived bundle; only the `observed:` line does. That is acceptable, since the review does not close runtime gaps, but saying "the observed: line is the durable record" would avoid a later reviewer asking for the file.

VERDICT: gaps found
