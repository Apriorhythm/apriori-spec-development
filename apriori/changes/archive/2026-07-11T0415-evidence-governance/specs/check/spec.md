<!-- apriori-base: sha256:b20466d7602959c1ac604169f8c2dd584ee5e84eec8999d2180fd2d4dad25faa -->
# Delta — check (evidence-governance)

## ADDED Requirements

### Requirement: review evidence is guarded against committed secrets
`apriori check` (consumer mode) SHALL scan `apriori/review/` — recursive, regular files only, symlinked entries skipped with a warn line naming them, the directory absent → the check skips — for exactly three literal secret formats: AWS access keys (`AKIA[0-9A-Z]{16}`), GitHub tokens (`gh[pousr]_[A-Za-z0-9]{36,}`), and PEM private-key headers (`-----BEGIN [A-Z ]*PRIVATE KEY-----`). A hit SHALL fail the check naming the file, line number, and pattern class — never echoing the matched value — with a remedy pointer (sanitize the raw; if already pushed, rewrite history per SECURITY.md).

#### Scenario: CK-10 committed secrets in review evidence fail the check
- WHEN a file under `apriori/review/` (any depth) contains an AWS key, a GitHub token, or a PEM private-key header
- THEN `check` FAILs naming the file, line and pattern class without echoing the secret, and the message points at the remedy; a clean review dir passes; a symlinked entry is skipped with a warn naming it; an absent review dir skips the check entirely

## MODIFIED Requirements

### Requirement: check warns on a stale scaffolded runbook without failing
`apriori check` SHALL compare the project's scaffolded `apriori/runbook.md` (when present) against the installed package's `RUNBOOK.md` and warn on divergence, without turning the warning into a failure.

#### Scenario: CK-06 stale scaffolded runbook warns, never fails
- WHEN `apriori check` runs in a project whose `apriori/runbook.md` differs byte-wise from the installed package's runbook
- THEN it prints a warning naming `apriori update`, and RESULT stays PASS if nothing else failed; a missing `apriori/runbook.md` produces no warning

#### Scenario: CK-07 consumer mode is the default; self-checks require --self
- WHEN `apriori check` runs in a consumer project
- THEN only the spec-store checks (CK-04), runbook freshness (CK-06), and the review-evidence secret tripwire (CK-10) run — a consumer legitimately using OpenSpec or shipping its own README is never failed by apriori's handbook self-checks (EN/CN pairs, verdict phrases, codex forms, no-openspec), which run only under `--self`; and a missing spec-store path is an error (exit 2, naming `apriori init` when uninitialized), never a silent PASS
