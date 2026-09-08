# Issue ledger — cli-strictness

Rows recorded on behalf of the reviewer (codex session 019f4b30-68f9-7222-9b64-17f52a333b4c; raws: cli-strictness-req-review-v1-raw.txt).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| SREQ-1 | Known flag surface is not declared per subcommand (r2 reopened: init row listed a non-existent --dry-run). | Implementations can disagree on what "known" means per command. | STEP0·r1 | verified |
| SREQ-2 | `multi` consumption conflicts with the "unknown -x" rule (r2 reopened: one stale sentence kept the old `--`-only wording). | `-x` silently consumed as a spec target instead of rejected. | STEP0·r1 | verified |
| SREQ-3 | Empty `multi` values are not classified. | `--specs` with no values is ambiguous. | STEP0·r1 | verified |
| SREQ-4 | Repeated known flags are not specified. | Accumulate vs last-wins can diverge from today's behavior. | STEP0·r1 | verified |
| SREQ-5 | Acceptance criteria miss the parser edge cases the helper introduces. | Helper edges ship untested. | STEP0·r1 | verified |
| SREQ-6 | Current-state claims about `new` and `stamp` are inaccurate. | "Unchanged" claims would hide two real behavior changes. | STEP0·r1 | verified |
| SSPEC-1 | CL-12 no-action guarantee not testable as designed for test-spawning commands. | Typoed flags could still run side-effecting test commands. | STEP2·r1 | verified |
| SSPEC-2 | init no-flag TTY interactivity required but not scenario-bound. | Parser migration could regress onboarding silently. | STEP2·r1 | verified |
| ADV-SSPEC-1 | advisory batch acknowledged (2 items: stampCli migration wording — design now explicit; CL-11 exercises both help aliases — design updated) | low | STEP2·r1 | advisory-acked |
| SSPEC-3 | tasks.md omitted the new CL-17 (stale range — same class as doctor-command's DSPEC-5). | CL-17 could ship unbound. | STEP2·r2 | verified |
| SIMPL-1 | --help did not win over earlier parse errors (left-to-right scan). | `verify --nope --help` errored instead of printing usage. | STEP5·r1 | verified |
| SIMPL-2 | `value` flags rejected dash-prefixed values, contradicting the req's "exactly the next token" rule. | Legitimate dash-leading values unusable. | STEP5·r1 | verified |
