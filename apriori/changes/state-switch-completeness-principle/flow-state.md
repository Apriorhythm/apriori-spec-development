change: state-switch-completeness-principle
mode: standard                            # docs-only addition to normative process text; no defect/local-fix shape, so not fast
lineage: branch v6-subtractive-r03 (current branch, HEAD 75fa068); no merge taboo declared for this line
phase: review                             # ground | specify | build | review | done | abandoned
reviewer-session: n/a                     # the reviewer's resumable session id, the moment round 1 prints it
delivery: pending-external-acceptance     # or: released — what archive reports as the third state
escalation: none                          # anything a human must decide; `apriori status --escalation` exits 3
artifact-root: .                          # optional; root for process artifacts (runbook §3) — default project root

## Reality Check         # observed / decision / assumption — one line each, as you find them
- observed: branch `v6-subtractive-r03`, HEAD `75fa068b0d8a18e85a305bb3f6b5ef1aad29044c` ("feat(v6): subtract review overhead and support native multi-TAP"), `package.json` version `5.0.0`. Working tree carried this change's round-1 sentence (RUNBOOK.md:344 / RUNBOOK_cn.md:342, ACCEPTed in `review/code-review-v1.md`) uncommitted at the start of round 2.
- observed: RUNBOOK.md:344 (P2 Build & Test) and RUNBOOK_cn.md:342 remain the sole normative locations carrying this rule — `grep -rln "highest common container|最高共同容器" .` (excluding `.git`, `node_modules`) matches only these two files, before and after round 2.
- observed: real-world validation (`/root/terra/asd-actual-lab/reports/actual-budget-state-switch-v6-validation.md`, Actual Budget tag-rename R04) — round-1's wording caught the Producer/Reviewer identifying stale handlers and navigation side effects, but the hidden quality probe still failed: the old `selected-tags-select-button` stayed live in the DOM after the new rename flow took over, because the rule asked about conflicting *behavior* but never made the old entry point's own fate (hidden/disabled/migrated/kept-with-proof) an explicit thing the producer must state.
- decision: round 2 replaces round 1's two sentences with one shorter sentence, in place at the same location — no new paragraph, phase, gate, template, or document. The replacement folds "name the old entry's fate" and "prove takeover + exit + post-exit correctness in one container test" into a single acceptance question, per the validation report's §7/§8 recommendation.
- decision: this stays a docs-only prose edit to an already-open P2 Build & Test sentence — no new testable CLI behavior — so round 2 continues without a delta-spec bundle, same as round 1.

## Evidence              # one row per §6 risk this change actually hits
- doc-consistency: done — ran the full suite (`node scripts/run-tests.mjs`, 611/611 pass), including EN/CN RUNBOOK consistency checks (test/lane-removal.test.js LN-07/08/09, test/protocol.test.js, test/lean-closeout.test.js) and `apriori check` (RESULT: PASS) — confirms round 2's sentence did not desync RUNBOOK.md from RUNBOOK_cn.md or break any phase/round assertion.
- producer-diff: done — read the complete diff from HEAD (RUNBOOK.md, RUNBOOK_cn.md only, one line each); no code paths, no CLI surface, no schema touched; known P0/P1 zero. Re-ran the overfitting sweep (`grep -niE "actual budget|selected-tags|managetags|R03|oracle" RUNBOOK.md RUNBOOK_cn.md`) — no matches, the new wording stays domain-neutral.

## Open                  # substantive issues nobody has closed yet — one line each
- `apriori gate --change state-switch-completeness-principle --review-ready` still exits 2 ("no delta spec files (*.md) found under .../specs") — same pre-existing tool limitation round 1's reviewer accepted (docs-only prose change, no module owns "the runbook's own text"; RUNBOOK.md's own carve-out says `apriori check` stands in for this). Not caused by round 2's edit. Substituted evidence: `apriori check` → RESULT: PASS, full suite → 611/611 pass.

## Next                  # at most three concrete actions; the first is the resume point
- run round 2 of the independent review (P3) over the new one-sentence wording and land its verdict under `review/`
- on a clean verdict, run `apriori archive --change state-switch-completeness-principle`

gates:
  - 2026-08-29T02:12 note: change scaffolded by `apriori new`
  - 2026-08-29 note: round 1 ACCEPTed and archived-pending; round 2 opened to compress the rule into a shorter "old entry's fate" acceptance question per Actual Budget R04 validation findings
