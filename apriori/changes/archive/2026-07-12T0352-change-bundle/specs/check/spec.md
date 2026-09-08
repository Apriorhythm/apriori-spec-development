<!-- apriori-base: sha256:9639e04af21e4b87c5ec7368da8afcd6dc2096bc8c4bd24d34b6e476a4434495 -->
# Delta — check (change-bundle)

## MODIFIED Requirements

### Requirement: review evidence is guarded against committed secrets
`apriori check` (consumer mode) SHALL scan every `review/` directory under `apriori/changes/*/` and `apriori/changes/archive/*/` — recursive, regular files only, symlinked entries skipped with a warn line naming them, an absent dir skipped — for exactly three literal secret formats: AWS access keys (`AKIA[0-9A-Z]{16}`), GitHub tokens (`gh[pousr]_[A-Za-z0-9]{36,}`), and PEM private-key headers (`-----BEGIN [A-Z ]*PRIVATE KEY-----`). Root discovery is itself guarded: each discovered change dir and its `review/` must realpath-resolve inside the changes root; escaping or symlinked dirs are warn-skipped like symlinked files. A hit SHALL fail the check naming the file, line number, and pattern class — never echoing the matched value — with a remedy pointer (sanitize the raw; if already pushed, rewrite history per SECURITY.md).

#### Scenario: CK-10 committed secrets in review evidence fail the check
- WHEN a file under any bundle's `review/` (active or archived, any depth) contains an AWS key, a GitHub token, or a PEM private-key header
- THEN `check` FAILs naming the file, line and pattern class without echoing the secret, and the message points at the remedy; clean bundles pass; a symlinked entry or an escaping review/ dir is skipped with a warn naming it; a project with no bundles skips the check entirely
