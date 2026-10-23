<!-- provenance: provider=anthropic model=claude-opus-5-5 session=unknown date=2026-10-23 -->

# code-review v2: delivery-material-check

This round is scoped to what changed (RUNBOOK §4): the open finding DM-1 and the fix diff `git diff bbb06b0..b66041a` (HEAD = b66041a on `feature/delivery-material-check`), plus the impact chain of adopting A-3 and A-4. Dispositions were read from `flow-state.md` (Reality Check, round-1 lines).

## Round-1 finding

- **DM-1: ADDRESSED.** PR-72's test now checks the negative in both editions.
  - English: `assert.doesNotMatch(p, /unattended|gate|stage/)`. This widens the old `checklist stage` to any "stage".
  - Chinese: `assert.doesNotMatch(c, /无人值守|门禁|gate|阶段|检查清单|清单阶段/)`. Bare 清单 is avoided, so the existing 已有清单 does not trip it.
  - Both patterns pass on today's text, so neither paragraph contains any of those words.
  - **The new checks would catch a bad edit.** I appended sample sentences in memory only (no file touched). On the Chinese paragraph, the regex catches 门禁, 阶段, 无人值守 and 检查清单 when appended. On the English paragraph, it catches "review stage", "unattended" and "gate" when appended.
  - The test now checks what PR-72's THEN requires for each edition: the positive sentence and no stage, checklist, gate or unattended-run demand.

## New substantive issues

None.

**Impact chain checked:**

- **A-3 (English sentence reordered).** `docs/operator.md` changes only that one sentence. The new wording, "Before a delivered operating material is handed over, it is checked against its recipient's actual entry point — the prerequisite state, the inputs and the observable result each step needs — and its key references are checked against the applicable version; what was not verified is stated.", still says everything PR-72 requires and adds nothing. PR-72's positive regex was updated to match it. `operator_cn.md` is untouched in this round, and the Chinese sentence is still the consensus wording.
- **A-4 (spec closing sentence).** It now reads "No gate, machine check, checklist stage or unattended-run demand is added." This only rewords the same four exclusions.
- **Spec still merges cleanly.**
  - The delta's `apriori-base` stamp still equals the store's sha256 (`7ea0bcbd…c6ed`).
  - Scenario PR-69 is still byte-identical to the base (I compared the two with `cmp`).
  - The archive dry-run shows one `modified (MODIFIED)` block and no DROPPED. It is NOT READY only because of R4: round 1 is still the latest verdict (revise), which is expected until this round lands.
- **Tests.** I ran `node scripts/run-tests.mjs`: 898 tests, 898 pass, 0 fail, including PR-67, PR-69 and PR-72 and the frozen-P3/RUNBOOK hash guards.
- **Scope.** Across `v6-dev...b66041a` the change still touches only the two operator paragraphs, the delta spec, `flow-state.md`, the test file, the CHANGELOG, plus `review/code-review-v1.md` (landed as written). RUNBOOK, P3, `lib/`, `bin/` and the templates are untouched.

## Risk surfaces examined

- DM-1's fix: both editions are covered, the patterns pass on the current text, and they catch sample violations.
- A-3's effect on the English text, on PR-72's regex and on the contract.
- A-4's effect on the requirement body.
- The base stamp, PR-69 byte-identity, and the archive dry-run's MODIFIED-only result with no DROPPED.
- A full suite run.
- The file scope of the whole change.

## Risk surfaces not examined

- Anything outside the round-2 delta beyond the checks listed above; it was settled in round 1 and has not changed.
- Gate check C1 is still skipped because no `test-cmd` is configured; I ran the suite directly instead.
- Gate check C8 and archive rule R4 need a transcript file beside each review (`code-review-v1-raw.*`, and next `code-review-v2-raw.*`). That is the producer's step.
- How the Markdown renders.

## Advisories

- **A-6: "Stage" with a capital S slips through.** The English negative `/stage/` is case-sensitive, so an appended "A Stage is added." is not caught. `/unattended|gate|stage/i` would close it.
- **A-7: `flow-state.md` overstates what A-3 changed in the spec.** The A-3 disposition says the spec was synced ("PR-72 正则与规格同步"). In fact the spec's SHALL sentence still reads "before it is handed over, a delivered operating material…", and only A-4 touched the spec. In the spec's paraphrase the pronoun is not ambiguous, so the contract is fine. Only the record is slightly inaccurate.
- **A-1, A-2 and A-5 stand as dispositioned.** A-1 keeps the consensus Chinese text, which is defensible. A-2 and A-5 are unchanged and were never findings.

VERDICT: no spec-vs-code gaps
