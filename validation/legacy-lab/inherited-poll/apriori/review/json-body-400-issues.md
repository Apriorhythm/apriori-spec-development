# Issue ledger — json-body-400

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RB-ADV-r1 | advisory batch acknowledged (2 items: RB-01 test lacks vote-endpoint bare-number and invalid-JSON variants — shared code path, completeness note only) — 见 json-body-400-consistency-raw.txt | — | STEP5·r1 | advisory-acked |

> Trivial-tier change: one heterogeneous consistency review (codex gpt-5.5, session
> 019f451e-a96d-7001-b405-a13f218f3275, read-only sandbox), raw output in
> json-body-400-consistency-raw.txt. Zero formal findings. VERDICT: no spec-vs-code gaps.
> Reviewer's own test-run failures (missing playwright, EROFS /tmp) are read-only-sandbox artifacts
> per R2, self-identified as such; real environment: npm test 42/42, e2e 3/3, apriori verify GREEN
> (store + RB-01 delta).
