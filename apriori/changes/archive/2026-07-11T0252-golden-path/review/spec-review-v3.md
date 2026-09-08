**Resolution Check**

GPSPEC-3 is verified. The design now defines one `binDir`/PATH resolver for both the Quickstart walk and final-state assertions, removes bash-function aliasing, uses a local shim for `--local`, and requires a hijack test proving a bogus global `apriori` is not selected.

GPSPEC-4 is verified. The design now normalizes paths in bash with `cd && pwd` and prefix-matches `command -v apriori` against that normalized bin dir, avoiding a `cygpath` dependency while addressing Git-bash path forms.

No new STEP2 issues found. The remaining GP-05 layered binding remains acceptable: deterministic plan construction is unit-bound, and the real packed tarball proof runs in CI plus local packed smoke.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| GPSPEC-3 | Final assertions did not reuse the walk’s `apriori` resolution. | Could assert with the wrong CLI or depend on a global install. | STEP2·r2 | verified |
| GPSPEC-4 | Windows bash PATH form was underspecified. | Packed job could fail or prove the wrong path form. | STEP2·r2 | verified |

VERDICT: no major issues, ready to proceed to execution
