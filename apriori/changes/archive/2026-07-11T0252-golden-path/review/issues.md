# Issue ledger — golden-path

Rows recorded on behalf of the reviewer (codex session 019f4b30-68f9-7222-9b64-17f52a333b4c; raws: golden-path-req-review-v1-raw.txt).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| GPREQ-1 | Packed-mode PATH isolation underspecified for Windows bash (npm global layout differs). | CI could silently test the wrong installation. | STEP0·r1 | verified |
| GPREQ-2 | The doctored-README fixture test lacks an explicit seam. | Tests could mutate the real README or go unwritten. | STEP0·r1 | verified |
| GPSPEC-1 | Per-block exit capture could abort before later blocks run. | The walk dies at the documented red step. | STEP2·r1 | verified |
| GPSPEC-2 | Packed-mode CI tarball selection ambiguous (glob). | Stale tarballs could be installed. | STEP2·r1 | verified |
| GPSPEC-3 | Final assertions didn't reuse the walk's apriori resolution. | Could assert with the wrong CLI / depend on a global install. | STEP2·r2 | verified |
| GPSPEC-4 | Windows bash PATH form underspecified. | Packed job could fail or prove the wrong path form. | STEP2·r2 | verified |
| GPIMPL-1 | GP-04's bound test covered block-count drift but not exit-code drift (r2 reopened: message assertion missing). | The failure/reporting path could regress green. | STEP5·r1 | verified |
