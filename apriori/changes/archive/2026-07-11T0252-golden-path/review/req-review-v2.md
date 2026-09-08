**Resolution Check**

GPREQ-1 is verified. Packed mode now specifies `npm i -g <tgz> --prefix <isolated tmpdir>`, platform-specific bin-dir handling, PATH prepending, and a preflight that `apriori` resolves inside the prefix before any Quickstart block runs.

GPREQ-2 is verified. G3 now declares an exported text-taking seam, `extractBlocks(text)` / runnable-plan builder, so doctored README tests do not mutate the real README.

No new requirement issues found. The README Quickstart still has four shell blocks with final-command exits `[0, 1, 0, 0]`; CI and package state remain consistent with the target.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| GPREQ-1 | Packed-mode PATH isolation underspecified for Windows bash. | CI could silently test the wrong installation. | STEP0·r1 | verified |
| GPREQ-2 | Doctored README fixture test lacked an explicit seam. | Tests could mutate the real README or go unwritten. | STEP0·r1 | verified |

VERDICT: no major issues
