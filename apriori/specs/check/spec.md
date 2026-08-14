### Requirement: check ports the v2 doc checker to JS and adds ID coverage
`apriori check` SHALL reproduce every structural check of v2's `check_docs.py` in JS with equivalent behavior, and additionally enforce that every spec scenario carries a bindable ID.

#### Scenario: CK-01 anchor and file-link checks behave as v2
- WHEN a doc has a broken `](#anchor)` or `](./file)` link
- THEN check reports it and exits non-zero, matching the Python checker's verdict

#### Scenario: CK-02 EN/CN alignment checks behave as v2
- WHEN bilingual docs are present and their heading sequences or verdict phrases diverge
- THEN check reports the misalignment (same rules as the ported checker)

#### Scenario: CK-03 verdict-phrase-table and codex-command checks behave as v2
- WHEN a verdict-line drift variant or an EN/CN codex-command mismatch is introduced
- THEN check reports it (the v2.3 checkers 6-8, ported)

#### Scenario: CK-04 every spec scenario must carry an ID (new)
- WHEN a `#### Scenario:` heading in the spec store lacks a leading id-pattern match
- THEN check reports it as unbindable and exits non-zero (a scenario with no ID can never pass verify)

#### Scenario: CK-05 no OpenSpec adapter assertions remain
- WHEN check runs against v3 docs
- THEN it enforces the single plain-files interface (no `openspec/`-adapter dual-path assertions from v2)

### Requirement: check warns on a stale scaffolded runbook without failing
`apriori check` SHALL compare the project's scaffolded `apriori/runbook.md` (when present) against the installed package's `RUNBOOK.md` and warn on divergence, without turning the warning into a failure.

#### Scenario: CK-06 stale scaffolded runbook warns, never fails
- WHEN `apriori check` runs in a project whose `apriori/runbook.md` differs byte-wise from the installed package's runbook
- THEN it prints a warning naming `apriori update`, and RESULT stays PASS if nothing else failed; a missing `apriori/runbook.md` produces no warning

#### Scenario: CK-07 consumer mode is the default; self-checks require --self
- WHEN `apriori check` runs in a consumer project
- THEN only the spec-store checks (CK-04), runbook freshness (CK-06), and the review-evidence secret tripwire (CK-10) run — a consumer legitimately using OpenSpec or shipping its own README is never failed by apriori's handbook self-checks (EN/CN pairs, verdict phrases, codex forms, no-openspec), which run only under `--self`; and a missing spec-store path is an error (exit 2, naming `apriori init` when uninitialized), never a silent PASS

### Requirement: self-mode guards the split documentation set
`apriori check --self` SHALL extend its EN/CN pair coverage to the docs/ pairs (concepts, legacy, ci, cli, troubleshooting — `_cn` suffix convention) and SHALL resolve links relative to the linking file, validating cross-file fragments.

#### Scenario: CK-08 docs pairs are guarded, one-sided pairs fail
- WHEN `check --self` runs where a docs/ pair misaligns (heading count, level, or numeric prefix), or exactly ONE side of a pair exists
- THEN it FAILs naming the pair (or the missing mirror); WHEN both sides of a pair are absent THEN that pair is skipped and older checkouts pass as before

#### Scenario: CK-09 links resolve from the linking file and fragments are validated
- WHEN a checked file links `./y.md` or `./y.md#frag`
- THEN the target resolves relative to THAT file's directory (root files unchanged); a missing target file FAILs naming the linking file; and a fragment with no heading in the target slugifying (ghSlug) to it FAILs naming both — self-mode only

### Requirement: review evidence is guarded against committed secrets
`apriori check` (consumer mode) SHALL scan every `review/` directory under `apriori/changes/*/` and `apriori/changes/archive/*/` — recursive, regular files only, symlinked entries skipped with a warn line naming them, an absent dir skipped — for exactly three literal secret formats: AWS access keys (`AKIA[0-9A-Z]{16}`), GitHub tokens (`gh[pousr]_[A-Za-z0-9]{36,}`), and PEM private-key headers (`-----BEGIN [A-Z ]*PRIVATE KEY-----`). Root discovery is itself guarded: each discovered change dir and its `review/` must realpath-resolve inside the changes root; escaping or symlinked dirs are warn-skipped like symlinked files. A hit SHALL fail the check naming the file, line number, and pattern class — never echoing the matched value — with a remedy pointer (sanitize the raw; if already pushed, rewrite history per SECURITY.md).

#### Scenario: CK-10 committed secrets in review evidence fail the check
- WHEN a file under any bundle's `review/` (active or archived, any depth) contains an AWS key, a GitHub token, or a PEM private-key header
- THEN `check` FAILs naming the file, line and pattern class without echoing the secret, and the message points at the remedy; clean bundles pass; a symlinked entry or an escaping review/ dir is skipped with a warn naming it; a project with no bundles skips the check entirely

### Requirement: CK-11 keeps the runbook version aligned with the CLI major
`apriori check --self` SHALL assert that RUNBOOK.md — the canonical packaged runbook — carries exactly one header-blockquote entry of the form `` > `runbook-version: X.Y` `` whose major (`X`) equals `package.json`'s version major; RUNBOOK_cn.md, when present, SHALL likewise carry exactly one such entry whose major also equals the package major (each edition equals the package major, not merely each other). A missing entry, more than one, or a malformed value FAILs (self-mode only) naming the file and the failure reason; a major mismatch FAILs naming the file, the runbook major, and the package major. Occurrences of `runbook-version:` in body text or code fences are never matched. Consumer `apriori check` (no `--self`) never runs CK-11.

#### Scenario: CK-11 the runbook major tracks the CLI major
- WHEN `apriori check --self` runs where RUNBOOK.md and RUNBOOK_cn.md declare `runbook-version: 4.0` and package.json is on a 4.x version
- THEN CK-11 passes; flipping either edition's header to a `3.0` major FAILs (self-mode) naming the file, the runbook major, and the package major; and a consumer `apriori check` without `--self` never raises CK-11

#### Scenario: CK-12 malformed, missing, duplicate, and body occurrences
- WHEN a runbook edition has no `runbook-version` blockquote entry, has two of them, carries a malformed value (`runbook-version: vier`), or mentions `runbook-version:` only in body text or inside a code fence
- THEN the missing/duplicate/malformed cases FAIL (self-mode) naming the file and the reason, while the body-text and code-fence occurrences are never matched (they alone do not satisfy or fail the check — a real header entry is still required)

### Requirement: CK-04 recognizes IDs through the shared contract
`check`'s CK-04 SHALL resolve its id-pattern from the config `id-pattern` row (else `DEFAULT_ID`; check gains NO CLI flag — a CI gate consumes the project constant) and SHALL recognize scenario IDs through the same `leadId` semantics as verify — replacing its private `^(…)\b` anchoring — so the four consumers can never disagree on the same title. An invalid config row is `RESULT: ERROR`, exit 2, through check's existing error channel.

#### Scenario: CK-13 CK-04 honors the config id-pattern row
- WHEN the config carries a row NARROWER than the built-in default — `| id-pattern | [A-Z]+-\d+ |` — and the store contains scenarios `AC-08a` and `AC-BIS-01`
- THEN `apriori check` reports a CK-04 failure for both, because the row governs; WITHOUT the row the built-in default recognises them and CK-04 passes — the row is proven to take effect by making check STRICTER, which the default alone can no longer produce

#### Scenario: CK-14 check and verify judge identically at the edges
- WHEN the same title set (letter suffix, multi-segment, trailing `_`, adjacent alphanumeric, a pattern ending in a non-word char, a source carrying its own `^`, an alternation source) is judged by CK-04 and by verify's scenario collection under the same pattern
- THEN the identified/rejected split is identical — no title is bindable to one consumer and unbindable to the other

#### Scenario: CK-15 an invalid config id-pattern is a check ERROR
- WHEN the config `id-pattern` row does not compile and `apriori check` runs
- THEN check prints an error naming `process-config` and `RESULT: ERROR`, exit 2 — CK-04 never silently falls back to the default

#### Scenario: CK-16 a terminated config-pattern match is a check ERROR
- WHEN the config pattern is catastrophic against the store's own titles (both repository inputs) and `apriori check` runs
- THEN the child is killed within its budget and check prints a sanitized error naming `process-config` with `RESULT: ERROR`, exit 2 — CI cannot be hung by a config row

### Requirement: the phrase table admits the hotfix lane's verdict phrases
The canonical verdict phrase table SHALL carry the lane's two new passing phrases (`VERDICT: no findings` for the `inspection` role) and its new failing phrase (`VERDICT: gaps found` for the `p8` role) alongside the existing entries, and both runbooks SHALL contain every canonical phrase as before. A lane verdict line is recognized by the SAME prefix rule as every other: the mandatory `role=` / `digest=` trailers and the conditional `boundary=` trailer follow the phrase, so a real line still starts with a table entry and the existing consumers are unaffected. A `VERDICT:` string appearing anywhere in the scanned docs that does not start with a table entry stays a failure.

#### Scenario: CK-17 the lane's phrases are table entries and its trailers do not break recognition
- WHEN the runbooks carry the lane's phrase-table rows, and separately when a documented line reads `VERDICT: no findings role=inspection digest=<64 hex> boundary=within`
- THEN the phrase-table check passes and the trailered line is recognized as its table entry — while an unregistered phrase such as `VERDICT: looks fine to me` still fails, naming the file and line
