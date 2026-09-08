**Issues**

GPIMPL-1 — GP-04’s bound test covers block-count drift but not exit-code drift.

Description: GP-04 requires doctored README text that changes either the block count or a block’s exit behavior to fail loudly with block index and expected/actual. The test only removes a block and checks `README drift: 3 shell block...`. It does not exercise the required “block exit diverges from `[0,1,0,0]`” path.

Risk: A regression in sentinel parsing or expected/actual comparison could ship while GP-04 remains green.

Suggested fix: Add a doctored-text test that changes block 2’s final command to exit 0, runs through the same exported plan/assertion seam, and asserts the failure names block 2 plus expected 1/actual 0.

**Advisories**

The runner intentionally avoids `set -e` and checks only each block’s last command, per the requirement. That can mask a failing intermediate command if later commands still reach the expected final exit. This is not a spec gap, but a future hardening option would be to wrap intermediate commands or add optional trace output for non-zero intermediates.

GP-03’s shared-walk binding is acceptable: the local walk must complete before the OK line is printed, and the implementation does perform `verify`, `check`, `doctor --no-run`, and archive-dir assertions with the same PATH resolver. GP-05’s layered binding is also acceptable: deterministic plan checks are unit-bound and the real packed proof runs in CI/local smoke.

Verified: `ci.yml` preserves the existing `test` job byte-for-byte and only adds `golden-path`; packed mode uses `TGZ=$(npm pack --silent)`; the runner strips `NODE_TEST_CONTEXT`/`NODE_OPTIONS`, which is correct for making nested `node --test` behave like a fresh user invocation.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| GPIMPL-1 | GP-04 test misses the exit-divergence branch. | Sentinel/expected-exit regressions could remain undetected. | STEP5·r1 | open |
| ADV-GPIMPL-1 | Advisory batch: consider future hardening for non-zero intermediate commands in Quickstart blocks. | Low; current behavior matches the stated last-command contract. | STEP5·r1 | advisory |

VERDICT: 1 issues open
