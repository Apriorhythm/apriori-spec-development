**Issues**

**GPIMPL-1 reopened**

Description: GP-04 now exercises an exit-drift precondition by running the assembled walk with a stub `apriori` and observing `__BLOCK_2_EXIT=0`, but it still does not assert the scenario’s required failure behavior: “the runner ... fails naming the block index and expected/actual.” The test stops at `assert.notStrictEqual(Number(m[1]), 1)` and comments that the runner comparison “would name” the mismatch, rather than invoking or asserting that comparison.

Risk: A regression could remove or weaken the failure/reporting path while this test remains green, so GP-04 is still not semantically bound to the declared visible behavior.

Suggested fix: Add an exported comparison/assertion seam, or run the runner path with injectable README/env, and assert the actual failure message includes block 2 plus expected `1` and actual `0`.

**Advisories**

No new advisory items.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| GPIMPL-1 | GP-04's bound test now observes exit drift but still does not assert the runner failure message required by the scenario. | The core failure/reporting behavior can regress while the bound test remains green. | STEP5·r1 | open |

VERDICT: 1 issues open
