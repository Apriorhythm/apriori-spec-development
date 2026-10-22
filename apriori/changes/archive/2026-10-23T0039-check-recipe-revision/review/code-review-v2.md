<!-- provenance: provider=anthropic model=claude-fable-5-1 session=unknown date=2026-10-23 -->

# code-review · check-recipe-revision · round 2

Scope: CR-1 and CR-2, the fix diff `git diff c57f54a..6d7abc0` and its impact chain, and the producer's dispositions in `flow-state.md`. The owner's 2026-10-23 instruction applies from this round. Findings that concern only README, VISION or `docs/*` (including the Chinese editions) are advisory. RUNBOOK.md, `guides/`, `lib/`, tests and the delta specs remain the critical surfaces.

I ran `node scripts/run-tests.mjs`: 897/897 pass. `gate --json` shows C3, C5, C7 and C9 pass. C1 is skipped, because no test command is configured. C8 is blocked, because this review has not yet landed.

## Disposition of open findings

- **CR-1: ADDRESSED.**
  - Round 1 found the Chinese-edition assertions weaker than the PR-67 and PR-69 scenarios. Round 2 checked the fix as follows.
  - `test/requirement-check-recipe.test.js` now asserts these Chinese clauses for PR-67:
    - the P3-reach sentence;
    - the "not a validated threshold" disclaimer;
    - the commit, comparison base and whole-diff input;
    - the effective-contract definition, with the "version that cannot be pinned is a gap" clause.
  - For PR-69 it asserts these Chinese clauses:
    - derivation from sources, contracts and checklist, with expectations visible on the page or in the API response;
    - the kit, guard, one-shot authorization and record-then-classify.
  - It adds `doesNotMatch(cpara, /…拆成了几个 change、交付之前|…最后一个 change 归档之后|所有者验收剧本/)` against the stale triggers and the old walk name.
  - The PR-67 scenario text now says "in both editions" and PR-69 says "each edition", so scenario and assertions agree.
  - The English side gained the missing "for each repository, the commit checked and its comparison base, with the whole requirement's diff" assertion. The Chinese explanation text matches each new regex. The recipe-block identity assertion is retained and passes.
  - Dropping the Chinese disclaimer now fails the suite. The flow-state records this mutation check, and it follows from the regexes.

- **CR-2: ADDRESSED.**
  - Round 1 found the "effective contracts" input ambiguous about which store, and in what order deltas apply. The fix gives one definition: "the spec store as of the comparison base with the deltas of the requirement's changes applied in the order they merge, archived ones included, replacements and removals resolved".
  - The same wording appears in all of these places:
    - the English explanation;
    - the Chinese explanation;
    - the shared recipe block, step 1, identical in both editions;
    - the PR-67 requirement text and scenario;
    - the test regexes.
  - Re-applying already-merged deltas is no longer a literal reading. The base is the pre-change store, and the requirement's deltas, archived or not, go on top. The base is named and the order is named.
  - "A version you cannot pin is a gap you report" is kept.

## Newly found substantive issues

None.

Impact chain checked:
- `guides/prototype-walk.md` and `RUNBOOK.md` are untouched by the fix commits (`git diff --stat` is empty for `RUNBOOK.md`, `guides/` and `lib/`). The P3 hash test and the `GUIDE_GENERATIONS` entry `b17597d3…`, equal to the shipped guide's sha256, therefore stand. `PW-02`, `UP-09` and `UP-11` pass.
- The delta `## Notes` attribution is softened. It no longer claims that the three added dimensions are "where those P0 sat". It says the dimensions name kinds of issue the findings included, and that no QA-outcome attribution is drawn. Notes are dropped at merge in any case.
- `CHANGELOG.md` has a new entry whose three bullets match the change's scope and add no promise beyond the consensus.
- No gate, machine check, tier rule or P3 edit has appeared. The owner's docs-are-non-critical instruction was recorded in `gates:` as a note and changes no code or contract.

## Risk surfaces

Examined:
- The fix diff end to end, including spec, docs, tests and CHANGELOG.
- The Chinese-versus-English parity of the explanation and the script paragraph.
- The recipe block identity.
- The P3 freeze and the guide hash.
- Scenario-to-assertion fidelity for PR-67 and PR-69.
- Consistency of the new contract definition across all five places that state it.
- The full test suite and the gate.

Not examined:
- I did not run the recipe on a real requirement.
- I did not mutation-run the suite. The CR-1 and CR-2 judgments rest on reading the regexes against the texts.
- I did not examine `archive --write` or the post-archive store (read-only).

## Advisories

- The wording "in the order they merge" for deltas that are not yet archived means the order they would merge. It is workable, because an agent can read the order from the changes' sequence. Saying "or would merge" would remove the doubt. It is in the operator docs and the recipe block, so low priority.
- The concepts "review sideways or down" caution and the "match the model tier" heading are left to the owner, as already recorded. The change also leaves docs-only wording to lag, per the owner's instruction.

VERDICT: no spec-vs-code gaps
