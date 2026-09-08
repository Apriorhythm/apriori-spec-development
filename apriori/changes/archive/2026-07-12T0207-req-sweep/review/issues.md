# Issue ledger — req-sweep

Rows recorded on behalf of the reviewer (codex session 019f4b30-68f9-7222-9b64-17f52a333b4c; raws: req-sweep-*-raw.txt).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RS-1 | Sweep containment/symlink behavior unspecified (r2 reopened: matching-symlink skip+warn would strand history at exit 0). | Reads/writes outside the workspace; history silently left behind. | STEP0·r1 | verified |
| RS-2 | Sweep-failure exit 0 had no command recovery path. | Success reported while history unpreserved — discipline reintroduced. | STEP0·r1 | verified |
| RS-3 | Filename matcher ambiguous (req-vdraft, req-v1-notes near-misses). | Over/under-sweep. | STEP0·r1 | verified |
| RS-4 | Intent-card-only changes unbound by acceptance. | Explore-track history left behind with green tests. | STEP0·r1 | verified |
| RS-ADV-1 | Advisory: explicit --write in M1; stable report wording; PR-19 negative anchor for the old instruction. | Low. | STEP0·r1 | verified |
| RS-ADV-2 | advisory batch acknowledged (1 item: the report line's stale skipped-symlink warning wording removed — no warning class exists after the r2 symlink rule) | low | STEP0·r3 | advisory-acked |
| RSSPEC-1 | Design pointed escapeRe reuse at managed.js — non-exported AND a require cycle (managed→archive-merge). | Module-load breakage or rework. | STEP2·r1 | verified |
| RSSPEC-2 | Containment escapes specified but not scenario-bound. | Path-escape bug passes the scenario set. | STEP2·r1 | verified |
| RSSPEC-ADV-1 | Advisory: AM-38 injects by path/class not ordinal (AM-15/18 counters untouched); win32 guard ok with regular-path coverage. | Low. | STEP2·r1 | verified |
| RSIMPL-1 | Symlinks rejected but regular-file not REQUIRED — a matching directory travelled; a file at requirement/ crashed readdir instead of the taxonomy. | Wrong objects moved or crash instead of rerunnable failure. | STEP5·r1 | verified |
| RSIMPL-2 | Rename-failure diagnostics did not name the failed artifact. | Recovery message omits what to repair. | STEP5·r1 | verified |
