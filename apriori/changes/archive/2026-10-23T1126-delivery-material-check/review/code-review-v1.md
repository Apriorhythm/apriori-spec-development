<!-- provenance: provider=anthropic model=claude-opus-5-5 session=unknown date=2026-10-23 -->

# code-review v1: delivery-material-check

Reviewed: `git diff v6-dev...HEAD` on `feature/delivery-material-check` (bbb06b0 on top of v6-dev@8acee75). Inputs: the delta spec `apriori/changes/delivery-material-check/specs/protocol/spec.md`, `flow-state.md` (its `## Open` section is empty), `apriori gate --change delivery-material-check --json`, and the requirement R1023-CONSENSUS §二 direction 1 and §三 ①, which the owner approved with 「都同意」 on 2026-10-23.

## What was checked

- **Delta spec against the store.** The delta's `apriori-base` stamp `sha256:7ea0bcbd…c6ed` matches `apriori/specs/protocol/spec.md`. I compared the modified requirement block with the base line by line:
  - The requirement body changes in only two places. It adds one SHALL sentence, the PR-72 content. It extends the closing "No gate and no machine check are added" with "no checklist stage and no unattended-run demand".
  - Scenario PR-69 is byte-identical to the base.
  - PR-72 is new and its id is unique in the store.
- **Archive dry-run.** `node bin/apriori.js archive --change delivery-material-check` reports one `modified (MODIFIED)` block and no DROPPED. It is NOT READY only because of R4: no review round has landed yet. That is expected at this point.
- **Docs.** Each operator edition gains exactly one sentence at the end of the owner acceptance or integration script paragraph. Nothing else in either file changed.
  - The Chinese sentence is the consensus wording character for character, using the file's half-width punctuation.
  - The English sentence says what PR-72 requires: the timing (before hand-over), the recipient's actual entry point, the prerequisite state, inputs and observable result each step needs, key references against the applicable version, and a statement of what was not verified.
  - Neither sentence adds a stage, checklist, gate, unattended-run demand, review step or CLI change.
- **Scope.** The diff touches exactly six files: the two operator paragraphs, the delta spec, `flow-state.md`, one test file and a CHANGELOG entry. RUNBOOK and P3 are untouched, and so is everything under `lib/`, `bin/` and the templates.
- **Tests.** I ran `node scripts/run-tests.mjs`: 898 pass, 0 fail. That includes the frozen-P3/RUNBOOK hash tests and PR-67, PR-69 and PR-72.

## New substantive issues

- **DM-1: PR-72's test checks only half of the scenario's negative clause.**
  - **What is wrong:** PR-72's THEN says each edition carries the sentence and that "the paragraph adds no stage, checklist, gate or unattended-run demand". The test checks the positive sentence in both editions, but checks the negative only for English, with `/unattended|gate|checklist stage/`. There is no negative assertion at all on the Chinese paragraph `c`. The English pattern also never checks "stage" on its own.
  - **Why it matters:** the test carries PR-72's id but checks less than the scenario requires. Someone could edit the Chinese paragraph to say 无人值守, 门禁 or 新增阶段 (or add a stage to the English paragraph using any other wording) and PR-72 would still pass. The scenario's one guard against the change growing back into a stage or gate would then be enforced for only one edition.
  - **Suggested fix:** in the same test, add a negative assertion on `c`, for example `assert.doesNotMatch(c, /无人值守|门禁|gate|阶段|检查清单/)`. Check first that today's Chinese paragraph contains none of these words; it uses 已有清单, so match 检查清单 or 清单阶段 rather than bare 清单. Widen the English pattern to cover a stage, for example `/unattended|gate|stage/`. This is a test-only change. No approach change is needed.

No other substantive issue found.

- **Q1, established behavior and safety constraints:** no runtime, CLI, input, permission or secret surface is touched. Established behavior PR-69 is kept byte-for-byte in the contract, and its test still passes unchanged.
- **Q2, semantic faithfulness:** apart from DM-1, the test asserts each edition's sentence verbatim within the paragraph that sits between the recipe block and the prototype-walk heading. `## Open` is empty and gate check C9 reports no open items, so no named open boundary needs a ruling.
- **Q3, scope:** the change does not go beyond the requirement, adds no mechanism of its own, and can be proved done with one repeatable chain: the archive dry-run plus the PR-72 test plus the diff. No SPLIT.

## Risk surfaces examined

- How the delta merges: stamp, MODIFIED block, PR-69 byte-identity, no DROPPED.
- Whether the contract matches each edition's text, and whether the two editions agree with each other.
- Faithfulness to R1023 §二 direction 1 and §三 ①: one sentence, no stage, checklist, gate or unattended-run demand, P3 unchanged, no CLI change.
- Test coverage and strength for PR-72, plus a full suite run including the P3/RUNBOOK hash guards.
- File scope of the diff and the CHANGELOG wording.

## Risk surfaces not examined

- The evidence lines that the Notes and `flow-state.md` cite from `work/r1023/00-owner干预分析.md` and the session timelines (5.9 L11218 and the others). They are basis only, outside the contract. Reading them is ruled out (no raw sessions) and not needed for the verdict.
- How the Markdown renders.
- Gate check C1, which was skipped because no `test-cmd` is configured. The binding check therefore did not run through the gate; I ran the suite directly instead.
- Gate check C8 and archive rule R4 need the `code-review-v1-raw.*` transcript beside this file. That is the producer's step.

## Advisories

- **A-1 (wording, docs non-critical): the Chinese sentence gives the timing only implicitly.** The new Chinese sentence carries "before hand-over" only through 已承诺交付 and through its place after the paragraph's earlier 交付之前 sentence. PR-72 says "each edition says that before hand-over…". The Chinese is the owner-approved consensus text, so keeping it is defensible. If you want the contract and the text to line up word for word, note in the requirement body that the Chinese wording is the consensus text, or prefix it with 交付之前.
- **A-2: the two editions differ slightly in wording.** English "a delivered operating material" leaves out 已承诺 ("committed to"). English "each step needs" stands for 必要的 ("necessary"). The meaning is close enough and this is not a finding.
- **A-3: "it" is momentarily ambiguous in English.** The sentence begins "Before it is handed over, a delivered operating material…" and comes right after a sentence about the script. The pronoun refers forward to the material, but a reader may first take it as the script. "Before a delivered operating material is handed over, it is checked…" would read more cleanly.
- **A-4: awkward closing sentence in the spec.** "No gate and no machine check are added, no checklist stage and no unattended-run demand." could be "No gate, machine check, checklist stage or unattended-run demand is added."
- **A-5: CHANGELOG examples.** The entry lists examples ("a script, an API flow, a test manual") that the docs sentence does not use. That is harmless; the CHANGELOG is descriptive.

VERDICT: gaps found
