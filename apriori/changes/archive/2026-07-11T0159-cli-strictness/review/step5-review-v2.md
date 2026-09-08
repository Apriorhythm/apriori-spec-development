**Resolution Check**

SIMPL-1 is verified. `parseStrict` now pre-scans alias-resolved argv for `--help`/`-h` before any validation, so help wins over earlier unknown flags, missing values, and arity errors.

SIMPL-2 is verified. `value` flags now only error when the next token is absent; dash-prefixed values are consumed verbatim, while dash-stopping remains limited to `multi`.

No new spec-vs-code gaps found in the amended parser behavior. The added unit cases cover both fixes, and the migrated subcommand surfaces still match CL-11..17, including gate/doctor JSON parse-error handling.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SIMPL-1 | `--help`/`-h` did not win over earlier parse errors. | Help behavior depended on argument order, violating CL-11/S6. | STEP5·r1 | verified |
| SIMPL-2 | `value` flags rejected dash-prefixed values instead of consuming the next token verbatim. | Undeclared success-path behavior change for known flags. | STEP5·r1 | verified |

VERDICT: no spec-vs-code gaps
