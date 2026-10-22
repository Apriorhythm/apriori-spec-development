<!-- provenance: provider=anthropic model=claude-fable-5-1 session=unknown date=2026-10-23 -->

# code-review · check-recipe-revision · round 1

Input: the delta spec `specs/protocol/spec.md`, the diff `v6-dev...HEAD` (c57f54a on c69174a), `flow-state.md` (`## Open` empty), and the consensus `S16-CONSENSUS.md` §二/§三. `gate --json` gives C3, C7 and C9 pass, C1 skipped (no test command configured), and C8 blocked only because this is round 1. `archive` dry-run shows 3 ADDED and 2 MODIFIED, nothing dropped. I ran `node scripts/run-tests.mjs`: 897/897 pass.

## Newly found substantive issues

- **CR-1 — The Chinese-edition assertions are weaker than the PR-67 and PR-69 scenarios they carry.**
  - Description: the PR-67 scenario says "each" operator edition carries the P3-reach statement, the §2 "help, not a validated threshold" disclaimer, the commit and comparison base with the whole diff, and the "a version it cannot pin is a gap" clause. The test asserts all of these only on `docs/operator.md`. For `operator_cn.md` it asserts only the trigger, the effective-contract sentence, the three dimensions and verification, the landing sentences, the fix route, and the identity of the recipe block.
  - Description (continued): PR-69 has the same gap. The scenario names derivation from sources/contracts/checklist, the page-or-API-response expectations, the kit and guard, one-shot authorization, and record-then-classify. The Chinese side asserts only the heading, the run-before-handover sentence, and the API-versus-browser sentence.
  - Description (continued): there is also no Chinese negative assertion for the stale trigger ("拆成几个 change"-only, "最后一个 change 归档后"). The English side has `doesNotMatch`.
  - Risk: an edit that drops or reverts the Chinese risk-surface disclaimer, the commit/base input, or the P3-reach correction passes the suite. Those are the points the consensus stressed (§二 S1 items 1, 2 and 5). Today the Chinese text is faithful (checked by hand), so the risk is silent drift, not a present defect.
  - Suggested fix: add Chinese regexes for the P3-reach sentence, the "不是经过验证的…阈值" disclaimer, "每个仓被核对的提交和比较基线…整个需求的 diff", and "钉不住版本时作为缺口报告". Add Chinese regexes for the PR-69 kit/guard and derivation clauses. Add a `doesNotMatch` for the stale triggers in `cpara`.

- **CR-2 — The "effective contracts" input is ambiguous about which store and in what order the deltas apply.**
  - Description: `operator.md:43`, `operator_cn.md:43` and recipe step 1 (the identical block, so the same wording in both editions) say "the spec store with every applicable delta of the requirement's changes applied, archived or not". An archived change's delta is already merged into the store. Read literally, that means re-applying it: an ADDED would collide with its own ID, and a MODIFIED would be a no-op.
  - Description (continued): the text never says whether "the store" means the store as of the comparison base, the store at the checked commit, or the current store. It never says in what order several changes' deltas touching the same requirement are applied.
  - Risk: the consensus (§二 S1.2) rejects handing the reviewer pieces "to guess"; this wording still leaves a guess at the core input. A stale store (for example, one newer than the checked version) or a wrong order yields a wrong "effective contract", and the reviewer then judges the code against it.
  - Suggested fix: pin one definition in the explanation, the recipe block (kept identical in both editions) and the PR-67 scenario. For example: "the store as of the comparison base, with the requirement's changes' deltas applied in merge order, those already archived included". The test's `effective contracts at that version` regexes then move with it. The `(a version you cannot pin is a gap)` clause can stay.

## Risk surfaces

Examined:
- Stale wording elsewhere: grep of README, README_cn, MIGRATING, RUNBOOK, docs, guides and templates for "last change archived", "split", "acceptance walk" and "archived contracts" found no surviving stale text. The CHANGELOG hits are historical entries.
- Operator editions: all five ```text blocks in `operator.md` and `operator_cn.md` are byte-identical. The Chinese explanation and script paragraph carry every element of the English ones.
- Guide §9: the new exception (a requirement-level check, before test, whether or not the changes are archived) does not contradict §5 or the in-place-continuation rule. It is stated as the one exception, and §5's pointer already names the requirement directory. Carried rows are explicitly given no authority, per S1.
- RUNBOOK §4 sentence: true of `lib/archive-merge.js`. The `FILE_PREAMBLE` text and everything under `IN_NOTES` are skipped, and requirement body lines are kept (`:109-190`). PR-70 also parses a delta and asserts both facts. The sentence lies outside P3 and adds no label, field or checker.
- P3 frozen: the RUNBOOK diff is one line in §4, and the `RIB-10` hash test in `source-intake.test.js` passes.
- Guide hash: the `GUIDE_GENERATIONS` entry `b17597d3…` equals the `sha256sum` of the shipped `guides/prototype-walk.md`, and `PW-02`/`UP-09`/`UP-11` pass.
- §2 risk-surface list quoted in the operator matches RUNBOOK §2.
- Scope: no CLI, gate, machine check, tier rule or merge-semantics change was added. The script paragraph says no gate, and PR-69 asserts that. The S3 trial sentences are not written into any apriori document.
- Tests: PR-67/68 negative assertions (stale trigger, "after the last change is archived") are present for the English side and the guide. PR-70 binds the sentence to a real parse.

Not examined:
- I did not run the recipe end to end or exercise the in-flight-fix route on a real requirement.
- I did not mutation-test the suite. CR-1 is by reading the assertions.
- I did not examine `archive --write` or the post-archive store (read-only).

## Advisories

- `docs/concepts.md` and `concepts_cn.md`: the heading "Match the model tier to the review point", the code comment "reviewer: fresh context + a different tier", and the "review sideways or down" caution still sit beside the corrected cell. The caution reads as an unevidenced tier rule. S3 limited the correction to the table cell, so I leave this to the owner.
- The delta `## Notes` says the whole-requirement review produced "three P0 on a single-change requirement the split-only trigger excluded" and that the dimensions "are where those P0 sat". That attribution appears only in the first-round position (`S16-R1.md`). The signed consensus §一 declines attribution, and Notes are dropped at merge, so it has no effect. Softening it would match §一.
- Every recent change adds a `CHANGELOG.md` entry; this branch has none yet. Add one before the squash.
- A fix routed into an in-flight change that already converged its P3 needs a new review round there. This is pre-existing flow, and "fixed and reviewed there as usual" covers it.

VERDICT: 2 issues open
