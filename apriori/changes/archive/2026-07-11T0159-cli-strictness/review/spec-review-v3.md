**Resolution Check**

SSPEC-3 is verified. `tasks.md` now names `CL-11..17`, explicitly calls out the CL-17 non-TTY pass-through test, and T3 now covers all ten subcommand entry points including `stampCli`.

No new STEP2 issues found. The amended task list now matches the spec/design scenario surface, the CLI delta still uses fresh CL-11..17 IDs, and the CAS stamp remains current against the store CLI spec.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SSPEC-3 | `tasks.md` omitted the new CL-17 scenario. | CL-17 could ship unbound. | STEP2·r2 | verified |

VERDICT: no major issues, ready to proceed to execution
