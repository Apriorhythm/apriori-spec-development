<!-- apriori-base: sha256:20c7849a4769bce4abed809eeb88b009032d170d95c330fb13c055134d566a45 -->
## ADDED Requirements

### Requirement: CK-11 keeps the runbook version aligned with the CLI major
`apriori check --self` SHALL assert that RUNBOOK.md — the canonical packaged runbook — carries exactly one header-blockquote entry of the form `` > `runbook-version: X.Y` `` whose major (`X`) equals `package.json`'s version major; RUNBOOK_cn.md, when present, SHALL likewise carry exactly one such entry whose major also equals the package major (each edition equals the package major, not merely each other). A missing entry, more than one, or a malformed value FAILs (self-mode only) naming the file and the failure reason; a major mismatch FAILs naming the file, the runbook major, and the package major. Occurrences of `runbook-version:` in body text or code fences are never matched. Consumer `apriori check` (no `--self`) never runs CK-11.

#### Scenario: CK-11 the runbook major tracks the CLI major
- WHEN `apriori check --self` runs where RUNBOOK.md and RUNBOOK_cn.md declare `runbook-version: 4.0` and package.json is on a 4.x version
- THEN CK-11 passes; flipping either edition's header to a `3.0` major FAILs (self-mode) naming the file, the runbook major, and the package major; and a consumer `apriori check` without `--self` never raises CK-11

#### Scenario: CK-12 malformed, missing, duplicate, and body occurrences
- WHEN a runbook edition has no `runbook-version` blockquote entry, has two of them, carries a malformed value (`runbook-version: vier`), or mentions `runbook-version:` only in body text or inside a code fence
- THEN the missing/duplicate/malformed cases FAIL (self-mode) naming the file and the reason, while the body-text and code-fence occurrences are never matched (they alone do not satisfy or fail the check — a real header entry is still required)
