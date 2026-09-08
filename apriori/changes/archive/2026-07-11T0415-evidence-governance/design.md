# Design — evidence-governance

check.js: `checkReviewSecrets(root)` — walk apriori/review/ (dirent-based; symlink → warn entry, dir → recurse, any regular file → per-line SUBSTRING scan with the three patterns (never line-anchored — secrets embedded in command output/JSON/prose must hit)); returns {fails, warns}. Wire into consumer-mode cli after CK-04, before self block. Finding text: `<file>:<line>: <class> detected in review evidence — sanitize the raw (see SECURITY.md; rewrite history if pushed)`.

RUNBOOK EN/CN: R2 gains the provenance sentence with the literal header `<!-- provenance: provider=<name> model=<id> session=<id> date=<YYYY-MM-DD> -->` (unknown fields = `unknown`); §4 artifact-interface gains the retention bullet.

Tests: check.test.js CK-10 — three fixture classes (one nested), clean pass, symlink warn-skip (capability-guarded), absent-dir skip, secret value NOT echoed in output.
