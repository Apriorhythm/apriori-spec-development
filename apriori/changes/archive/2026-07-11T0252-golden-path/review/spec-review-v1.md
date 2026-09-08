**Issues**

GPSPEC-1 — Per-block exit capture is designed in a way that can abort before later blocks run.

Description: The design says to assemble one bash script with `__BLOCK_N_EXIT=$?` sentinels after each block’s last line. Block 2 is expected to exit 1. If the script uses normal CI-style strict bash (`set -e`, `bash -e`, or an inherited strict prologue), the script will stop at block 2 before emitting the sentinel or running blocks 3/4. The spec requires per-block exits `[0,1,0,0]` and continued execution after the expected red verify.

Risk: The runner can fail or become fragile exactly on the designed red step, especially under GitHub Actions/bash differences.

Suggested fix: Specify the execution contract: do not use `set -e` around Quickstart blocks, or wrap each block/last command so expected failures are captured and execution continues. Add a test proving block 2 exit 1 is captured and block 3 still runs.

GPSPEC-2 — Packed-mode CI does not unambiguously select the tarball filename.

Description: The design’s CI step calls `node scripts/golden-path.mjs --packed ./apriori-cli-*.tgz`. Shell globbing is not a stable interface if more than one package tarball exists in the workspace, and it differs in failure behavior when no file matches. The requirement’s G4 depends on proving the exact packed file set.

Risk: CI can pass the wrong tarball, pass multiple argv entries, or fail differently across shells/OSes.

Suggested fix: Use `npm pack --json` and parse the emitted filename into a single path, or delete old `*.tgz` files before packing and assert exactly one match.

**Advisories**

GP-05’s layered binding is legitimate: a plan-construction test plus the CI packed run matches the verification-matrix idea that slow/environmental proof lives in CI while unit tests bind the deterministic plan.

The design uses `command -v apriori | grep <prefix>` for the inside-prefix check. Consider making the actual script use a Node-side resolved path comparison or `grep -F`/normalized paths to avoid regex/path separator surprises on Windows bash. The spec is clear enough; this is implementation hardening.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| GPSPEC-1 | Per-block exit capture does not specify how expected failures avoid aborting later blocks. | The runner may stop at the expected red verify instead of completing the Quickstart. | STEP2·r1 | open |
| GPSPEC-2 | Packed-mode CI uses an ambiguous tarball glob. | CI may test the wrong tarball or behave differently across shells. | STEP2·r1 | open |
| ADV-GPSPEC-1 | Advisory batch: GP-05 layered binding is acceptable; harden prefix preflight path matching. | Low. | STEP2·r1 | advisory |

VERDICT: 2 issues open
