**Issues**

SSPEC-1 — CL-12 no-action guarantee is not testable as designed for test-spawning commands.

Description: CL-12 requires unknown flags to fail before any action, including no test command execution. The design says CL-12 runs in a bare temp directory, which can make `verify`, `gate`, and `doctor` stop before they would execute a test command anyway. That would not catch an implementation that ignores the unknown flag and only fails later because the fixture is incomplete.

Risk: A typoed flag could still allow configured test commands or gate/doctor probes to run in a real project, violating the strictness guarantee and creating side effects.

Suggested fix: For `verify`, `gate`, and `doctor`, add CL-12 fixtures that are otherwise valid and include a test command that writes a sentinel. Invoke each with an unknown flag plus valid required inputs, then assert exit 2, stderr names the unknown flag, and the sentinel was not created.

SSPEC-2 — `init` interactive no-flag behavior is required but not scenario-bound.

Description: Requirement S7 says `init` with no flags in a TTY still enters the existing interactive tool picker. CL-11..16 cover help, unknown flags, arity, missing values, repeats, aliases, and multi-value stopping, but none binds the no-flag interactive path. The design says init interactivity is unchanged, but does not attach it to a scenario or test plan.

Risk: The strict parser migration could accidentally turn `init` with no flags into usage/error behavior or otherwise skip the existing prompt without a failing scenario.

Suggested fix: Add or extend a CLI scenario to assert that `apriori init` with no args in a TTY-like fixture still reaches the existing interactive picker, while non-TTY behavior remains unchanged.

**Advisories**

The design says to migrate “ten `cli()` functions,” but `stamp` is exposed as `stampCli`, not a `cli()` export. The spec and tests do include `stamp`, so this is wording-level, but the implementation task should explicitly name `stampCli`.

CL-11 should make clear that both `--help` and `-h` are exercised for every subcommand, since the requirement covers both spellings.

State-A checks passed: the CLI delta uses fresh CL-11..16 IDs, the ADDED block does not collide with existing CL-01..10, and the CAS stamp matches the current store CLI spec.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SSPEC-1 | CL-12 no-action guarantee is not testable as designed for commands that can execute test commands. | Unknown flags may still allow side-effecting test commands to run. | P5 round 1 | open |
| SSPEC-2 | `init` no-flag TTY interactive behavior is required but not covered by a scenario/test plan. | Parser migration can regress onboarding interactivity without detection. | P5 round 1 | open |
| ADV-SSPEC-1 | Advisory batch: clarify `stampCli` migration wording and ensure CL-11 exercises both help aliases. | Low; reduces implementation ambiguity. | P5 round 1 | advisory |

VERDICT: 2 issues open
