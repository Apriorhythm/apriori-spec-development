# Gap report — doctor-command (STEP1 / P3)

Inputs: requirement/req-final.md · truth/{init,update,check,spec-runner,status}.md (init/update/check captured this change, "KB-CHECK: 5 corrections needed" → applied) · repo at fb3ed60. Facts only.

## Current state A

- Every ingredient exists and is exported: `TOOLS`/`detectTools` (init), `checkRunbookFreshness` (check), `collectScenarios`/`parseTap`/`zeroTapParsed`/`runTestCommand`/`configTestCmd` (spec-runner), `activeChanges`/`parseFlowState` (status). Nothing aggregates them into a diagnosis; nothing checks the Node floor anywhere.
- KB-corrected facts that shape D-checks: update repairs `.gitignore` only when the FILE is missing (a missing tmp/ dir alone is unrepaired — D2 must catch it); `checkRunbookFreshness` returns [] when the copy is absent (why D3 needs its own `–` rule); `parseFlowState` never throws (why D7's validity rule is existence + non-empty `change` + dir match).
- POINTER constant in init.js is not exported — D4 needs only the substring `apriori/runbook.md` (the same dedupe key init itself uses).

## Gaps

| # | Gap | Where |
|---|---|---|
| G1 | New module `lib/doctor.js`: seven checks, text/JSON reporters, exit mapping, positional-arg guard | new file |
| G2 | `doctor` dispatch + USAGE line | bin/apriori.js |
| G3 | Spec: new store module `apriori/specs/doctor/spec.md` (DR-01..) + cli MODIFIED (subcommand list + CL-10) | change specs |
| G4 | Tests: fixture projects per outcome class; D5 needs one fixture per TAP-edge classification | test/doctor.test.js |
| G5 | Docs: README/README_cn cheat-sheet row; RUNBOOK §0 install note can mention doctor as the onboarding probe (EN/CN, one clause) | docs |

## Risks (folded into STEP2)

- R1: D5's classifications must reuse verify's exact primitives (`runTestCommand` → `parseTap` → `zeroTapParsed`) — reimplementing any of them would drift from SR-10/11/14 semantics.
- R2: D1's exit-2 aborts before other checks — but A2 requires `checks` to list whatever ran; order the checks D1→D2→… and abort AFTER pushing the failing check.
- R3: Windows: no signal-kill fixture on Windows runners (SIGKILL via taskkill is flaky) — the D5 signal case tests the CLASSIFIER function directly on a synthetic run object (unit-level), keeping the scenario bound without a real kill; spawn/zero-TAP/exit-7 cases run the real command path cross-platform (`node -e`).
- R4: D7 reads archived dirs' flow-states — reuse gate's archived-dir regex discipline (directories only, stat through symlinks).

No blockers. Proceed to STEP2.
