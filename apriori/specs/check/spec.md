### Requirement: check ports the v2 doc checker to JS and adds ID coverage
`apriori check` SHALL carry, in JS, the structural checks that v2's `check_docs.py` once ran (anchors, file links, EN/CN heading alignment, the verdict-phrase table imported from `lib/review.js`, the codex command forms), and additionally enforce that every spec scenario carries a bindable ID. The Python script itself is retired: it has no caller, its phrase table drifted from the runbook, and its README KB-section check lost its target when that section moved to the handbook — `apriori check` is the only checker, and no repository file invokes `check_docs.py`.

#### Scenario: CK-01 anchor and file-link checks behave as v2
- WHEN a doc has a broken `](#anchor)` or `](./file)` link
- THEN check reports it and exits non-zero, matching the Python checker's verdict

#### Scenario: CK-02 EN/CN alignment checks behave as v2
- WHEN bilingual docs are present and their heading sequences or verdict phrases diverge
- THEN check reports the misalignment (same rules as the ported checker)

#### Scenario: CK-03 verdict-phrase-table and codex-command checks behave as v2
- WHEN a verdict-line drift variant or a codex resume command outside the known-good forms is introduced
- THEN check reports it (the v2.3 checkers 6-8, ported; the EN/CN codex-command comparison is retired with the Chinese runbook edition)

#### Scenario: CK-04 every spec scenario must carry an ID (new)
- WHEN a `#### Scenario:` heading in the spec store lacks a leading id-pattern match
- THEN check reports it as unbindable and exits non-zero (a scenario with no ID can never pass verify)

#### Scenario: CK-05 no OpenSpec adapter assertions remain
- WHEN check runs against v3 docs
- THEN it enforces the single plain-files interface (no `openspec/`-adapter dual-path assertions from v2)

#### Scenario: CK-18 the v2 script is gone and nothing calls it
- WHEN the repository is scanned for `scripts/check_docs.py` and for references to `check_docs.py` outside the CHANGELOG
- THEN the file is absent, `package.json`, the CI workflow and the docs reference only `apriori check`, and `apriori check --self` passes on the repository itself

### Requirement: check warns on a stale scaffolded runbook without failing
`apriori check` SHALL compare the project's scaffolded `apriori/runbook.md` (when present) against the installed package's `RUNBOOK.md` and warn on divergence, without turning the warning into a failure.

#### Scenario: CK-06 stale scaffolded runbook warns, never fails
- WHEN `apriori check` runs in a project whose `apriori/runbook.md` differs byte-wise from the installed package's runbook
- THEN it prints a warning naming `apriori update`, and RESULT stays PASS if nothing else failed; a missing `apriori/runbook.md` produces no warning

#### Scenario: CK-07 consumer mode is the default; self-checks require --self
- WHEN `apriori check` runs in a consumer project
- THEN only the spec-store checks (CK-04), runbook freshness (CK-06), and the review-evidence secret tripwire (CK-10) run — a consumer legitimately using OpenSpec or shipping its own README is never failed by apriori's handbook self-checks (EN/CN pairs, verdict phrases, codex forms, no-openspec), which run only under `--self`; and a missing spec-store path is an error (exit 2, naming `apriori init` when uninitialized), never a silent PASS

### Requirement: self-mode guards the split documentation set
`apriori check --self` SHALL extend its EN/CN pair coverage to the docs/ pairs (concepts, legacy, ci, cli, troubleshooting — `_cn` suffix convention) and SHALL resolve links relative to the linking file, validating cross-file fragments. A side of a pair that exists is present even when it is empty: an empty mirror is aligned like any other, never skipped. The runbook is not a pair: `RUNBOOK.md` is checked on its own (verdict phrases, the `< /dev/null` guidance, codex forms, links, CK-11), and a `RUNBOOK_cn.md` in the repository FAILs self-mode — the English runbook is the only rule source.

#### Scenario: CK-08 docs pairs are guarded, one-sided pairs fail
- WHEN `check --self` runs where a docs/ pair misaligns (heading count, level, or numeric prefix), or exactly ONE side of a pair exists
- THEN it FAILs naming the pair (or the missing mirror) — an existing but empty mirror included, its heading count compared like any other; WHEN both sides of a pair are absent THEN that pair is skipped and older checkouts pass as before

#### Scenario: CK-09 links resolve from the linking file and fragments are validated
- WHEN a checked file links `./y.md` or `./y.md#frag`
- THEN the target resolves relative to THAT file's directory (root files unchanged); a missing target file FAILs naming the linking file; and a fragment with no heading in the target slugifying (ghSlug) to it FAILs naming both — self-mode only

#### Scenario: CK-23 the runbook has no Chinese edition, and one that reappears fails
- WHEN `check --self` runs on a repository whose `RUNBOOK.md` stands alone, and again after a `RUNBOOK_cn.md` is added
- THEN the first run applies the runbook checks to `RUNBOOK.md` alone and reports no one-sided pair for it; the second FAILs naming `RUNBOOK_cn.md` as a Chinese runbook edition that must not exist; the remaining EN/CN pairs (README, VISION, docs/) are checked as before

### Requirement: review evidence is guarded against committed secrets
`apriori check` (consumer mode) SHALL scan every `review/` directory under `apriori/changes/*/` and `apriori/changes/archive/*/` — recursive, regular files only, symlinked entries skipped with a warn line naming them, an absent dir skipped — for exactly three literal secret formats: AWS access keys (`AKIA[0-9A-Z]{16}`), GitHub tokens (`gh[pousr]_[A-Za-z0-9]{36,}`), and PEM private-key headers (`-----BEGIN [A-Z ]*PRIVATE KEY-----`). Root discovery is itself guarded: each discovered change dir and its `review/` must realpath-resolve inside the changes root; escaping or symlinked dirs are warn-skipped like symlinked files. A hit SHALL fail the check naming the file, line number, and pattern class — never echoing the matched value — with a remedy pointer (sanitize the raw; if already pushed, rewrite history per SECURITY.md).

#### Scenario: CK-10 committed secrets in review evidence fail the check
- WHEN a file under any bundle's `review/` (active or archived, any depth) contains an AWS key, a GitHub token, or a PEM private-key header
- THEN `check` FAILs naming the file, line and pattern class without echoing the secret, and the message points at the remedy; clean bundles pass; a symlinked entry or an escaping review/ dir is skipped with a warn naming it; a project with no bundles skips the check entirely

### Requirement: CK-11 keeps the runbook version aligned with the CLI major.minor
`apriori check --self` SHALL assert that RUNBOOK.md — the canonical packaged runbook — carries exactly one header-blockquote entry of the form `` > `runbook-version: X.Y` `` whose major.minor (`X.Y`) equals `package.json`'s version major.minor (a pre-release tag is ignored). A missing entry, more than one, or a malformed value FAILs (self-mode only) naming the file and the failure reason; a major.minor mismatch FAILs naming the file, the runbook's X.Y and the package's. Occurrences of `runbook-version:` in body text or in a code fence are never matched — every CommonMark fence counts (backtick or tilde, closed only by the same character at least as long, an unclosed one running to the end), and a fence belongs to its container: one opened inside a blockquote closes only at that quote depth and ends with its blockquote, and inside a fence opened outside any quote a quoted line is content, never a closer. Consumer `apriori check` (no `--self`) never runs CK-11.

#### Scenario: CK-11 the runbook major.minor tracks the CLI major.minor
- WHEN `apriori check --self` runs where RUNBOOK.md declares `runbook-version: 4.0` and package.json is on 4.0.3, then 4.0.0-rc.0
- THEN CK-11 passes; flipping its header to `3.0` FAILs (self-mode) naming the file and both versions, and so does a minor drift to `4.1`; and a consumer `apriori check` without `--self` never raises CK-11

#### Scenario: CK-12 malformed, missing, duplicate, and body occurrences
- WHEN the runbook has no `runbook-version` blockquote entry, has two of them, carries a malformed value (`runbook-version: vier`), or mentions `runbook-version:` only in body text or inside a code fence — a backtick or tilde fence, a longer fence a shorter run inside does not close, a fence behind blockquote markers, a quoted `> ~~~` inside a top-level fence (content, not a closer), a deeper-quoted run inside a quoted fence, or an unclosed one
- THEN the missing/duplicate/malformed cases FAIL (self-mode) naming the file and the reason, while the body-text and code-fence occurrences are never matched (they alone do not satisfy or fail the check — a real header entry is still required), and a real entry after a closed fence of either kind — or after a quoted fence whose blockquote ended — still counts

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

### Requirement: the canonical verdict phrase table is closed and carries no retired lane
The canonical table SHALL carry exactly the phrases the live review loops use — the `no major issues` family, `no spec-vs-code gaps` and `gaps found` (P8 and the fast floor), plus the `<N> issues open` prose placeholder — and SHALL NOT carry the phrases retired with the hotfix lane and the explore track (`no findings`, `extraction accepted`, `extraction rejected`). The runbook (`RUNBOOK.md`, its only edition) SHALL contain every canonical phrase. A `VERDICT:` string appearing anywhere in the scanned docs that does not start with a table entry stays a failure, retired phrases included; recognition is the SAME whole-verdict rule as every other consumer — a closed set matched whole (case-folded, whitespace collapsed, terminal punctuation dropped), never a prefix, so a canonical phrase followed by a clause is not a table entry — with no trailer grammar of its own.

#### Scenario: CK-17 the retired lanes leave the table and the table stays closed
- WHEN the phrase table is checked against the runbook, and separately when a scanned doc carries `VERDICT: looks fine to me` or the retired `VERDICT: no findings`
- THEN the retired phrases are absent from the table while P8's and the fast floor's remain, the runbook checks clean, and both unregistered lines fail naming the file and line

### Requirement: check reports archive drift and never fails on it
In both modes `apriori check` SHALL look at every directory under `apriori/changes/archive/` (an absent archive root is nothing to report). For a bundle that carries a readable `archive-manifest.json` it SHALL recompute the same listing and report, as a `!` note that does not affect the exit code, `archive drift: <dir> +<added> −<removed> ~<modified>` followed by one indented line per differing path; an unchanged bundle prints nothing. Bundles without a manifest are counted and reported in ONE summary note (`no baseline: N archived bundle(s) carry no manifest — archived before manifests were written, or the manifest is gone`), never one line per bundle; a manifest that exists but cannot be parsed is reported as unreadable, also as a note; an entry under `archive/` that is a symbolic link is named as not compared. Membership is judged on own properties, so a file named `constructor` or `__proto__` is inventoried and its removal reported like any other. The check compares content hashes, so a changed mtime with identical bytes is not drift. Drift is a report of a changed snapshot, not a verdict that the change was wrong, and check never repairs, rewrites or deletes a manifest.

#### Scenario: CK-19 drift is reported per bundle and does not change the exit code
- WHEN an archived bundle with a manifest is left unchanged, and then a file is added, one removed and one modified
- THEN the unchanged bundle produces no line, the changed one produces `! archive drift: <dir> +1 −1 ~1` with the three paths beneath, and `RESULT: PASS` with exit 0 in both cases when nothing else fails; an unrelated failing check still fails as before

#### Scenario: CK-20 bundles without a baseline are summarised once, and a broken manifest is named
- WHEN the archive root holds three bundles without a manifest and one whose manifest is not valid JSON
- THEN check prints exactly one `no baseline` note naming the count 3, one `archive manifest unreadable` note naming the fourth bundle, and the exit code is unaffected

#### Scenario: CK-21 identical content is not drift
- WHEN every file of an archived bundle is rewritten with identical bytes (new mtimes) and a file listed as `link:` still points at the same target
- THEN check prints no drift line for it

#### Scenario: CK-22 prototype-named files diff like any other, and a symlinked archive entry is named
- WHEN an archived bundle's manifest lists root files named `__proto__` and `constructor`, one of which is then removed, and separately a symbolic link is placed directly under `archive/`
- THEN the removal is reported under `archive drift` and the link is reported as not compared, with the exit code unaffected
