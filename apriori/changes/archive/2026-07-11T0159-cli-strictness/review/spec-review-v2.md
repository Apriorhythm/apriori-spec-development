**Resolution Check**

SSPEC-1 is verified. CL-12 now requires otherwise-valid sentinel fixtures for `verify`, `gate`, and `doctor`, and the design test plan asserts exit 2 plus no `SENTINEL`.

SSPEC-2 is verified. CL-17 now binds `init` with no args: strict parsing must pass empty flags through, non-TTY keeps init’s own `--tools` usage exit 2, and TTY behavior relies on the existing IN-10 picker binding.

**Issues**

SSPEC-3 — Task list omits the newly added CL-17 scenario.

Description: The spec and design now include CL-17, but `tasks.md` still says “Failing tests: CL-11..16”. That excludes the new scenario added to close SSPEC-2.

Risk: Execution can follow the task list and leave CL-17 unbound, recreating the init interactivity regression risk that round 2 was meant to close.

Suggested fix: Update T1 to `CL-11..17` and explicitly include the CL-17 non-TTY pass-through test, with the existing IN-10 TTY picker binding noted as the interactive side.

**Advisories**

T3 still says “Migrate ten cli() functions”; the design correctly calls out `stampCli`, but the task wording remains slightly stale. Low risk, but aligning the task text would avoid implementation ambiguity.

State-A checks passed: the CLI delta still uses fresh CL-11..17 IDs, the CAS stamp matches the current store CLI spec, and the ADDED block does not collide with CL-01..10.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SSPEC-1 | CL-12 no-action guarantee not testable as designed for test-spawning commands. | Typoed flags could still run side-effecting test commands. | STEP2·r1 | verified |
| SSPEC-2 | init no-flag TTY interactivity required but not scenario-bound. | Parser migration could regress onboarding silently. | STEP2·r1 | verified |
| SSPEC-3 | `tasks.md` still lists failing tests as CL-11..16, omitting new CL-17. | Execution may leave the new init no-flag scenario unbound. | STEP2·r2 | open |
| ADV-SSPEC-2 | Advisory batch: task wording still says “ten cli() functions” although `stamp` is `stampCli`. | Low; wording cleanup. | STEP2·r2 | advisory |

VERDICT: 1 issues open
