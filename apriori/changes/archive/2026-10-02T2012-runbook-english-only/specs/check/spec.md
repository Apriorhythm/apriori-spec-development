<!-- apriori-base: sha256:0105f99b2256e6312b8a1ad16ef2456dc45bc4b99b50acf56cca8d07f084fa92 -->
# Delta — check (runbook-english-only)

## MODIFIED Requirements

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

### Requirement: self-mode guards the split documentation set
`apriori check --self` SHALL extend its EN/CN pair coverage to the docs/ pairs (concepts, legacy, ci, cli, troubleshooting — `_cn` suffix convention) and SHALL resolve links relative to the linking file, validating cross-file fragments. The runbook is not a pair: `RUNBOOK.md` is checked on its own (verdict phrases, the `< /dev/null` guidance, codex forms, links, CK-11), and a `RUNBOOK_cn.md` in the repository FAILs self-mode — the English runbook is the only rule source.

#### Scenario: CK-08 docs pairs are guarded, one-sided pairs fail
- WHEN `check --self` runs where a docs/ pair misaligns (heading count, level, or numeric prefix), or exactly ONE side of a pair exists
- THEN it FAILs naming the pair (or the missing mirror); WHEN both sides of a pair are absent THEN that pair is skipped and older checkouts pass as before

#### Scenario: CK-09 links resolve from the linking file and fragments are validated
- WHEN a checked file links `./y.md` or `./y.md#frag`
- THEN the target resolves relative to THAT file's directory (root files unchanged); a missing target file FAILs naming the linking file; and a fragment with no heading in the target slugifying (ghSlug) to it FAILs naming both — self-mode only

#### Scenario: CK-23 the runbook has no Chinese edition, and one that reappears fails
- WHEN `check --self` runs on a repository whose `RUNBOOK.md` stands alone, and again after a `RUNBOOK_cn.md` is added
- THEN the first run applies the runbook checks to `RUNBOOK.md` alone and reports no one-sided pair for it; the second FAILs naming `RUNBOOK_cn.md` as a Chinese runbook edition that must not exist; the remaining EN/CN pairs (README, VISION, docs/) are checked as before

### Requirement: CK-11 keeps the runbook version aligned with the CLI major
`apriori check --self` SHALL assert that RUNBOOK.md — the canonical packaged runbook — carries exactly one header-blockquote entry of the form `` > `runbook-version: X.Y` `` whose major (`X`) equals `package.json`'s version major. A missing entry, more than one, or a malformed value FAILs (self-mode only) naming the file and the failure reason; a major mismatch FAILs naming the file, the runbook major, and the package major. Occurrences of `runbook-version:` in body text or code fences are never matched. Consumer `apriori check` (no `--self`) never runs CK-11.

#### Scenario: CK-11 the runbook major tracks the CLI major
- WHEN `apriori check --self` runs where RUNBOOK.md declares `runbook-version: 4.0` and package.json is on a 4.x version
- THEN CK-11 passes; flipping its header to a `3.0` major FAILs (self-mode) naming the file, the runbook major, and the package major; and a consumer `apriori check` without `--self` never raises CK-11

#### Scenario: CK-12 malformed, missing, duplicate, and body occurrences
- WHEN the runbook has no `runbook-version` blockquote entry, has two of them, carries a malformed value (`runbook-version: vier`), or mentions `runbook-version:` only in body text or inside a code fence
- THEN the missing/duplicate/malformed cases FAIL (self-mode) naming the file and the reason, while the body-text and code-fence occurrences are never matched (they alone do not satisfy or fail the check — a real header entry is still required)

### Requirement: the canonical verdict phrase table is closed and carries no retired lane
The canonical table SHALL carry exactly the phrases the live review loops use — the `no major issues` family, `no spec-vs-code gaps` and `gaps found` (P8 and the fast floor), plus the `<N> issues open` prose placeholder — and SHALL NOT carry the phrases retired with the hotfix lane and the explore track (`no findings`, `extraction accepted`, `extraction rejected`). The runbook (`RUNBOOK.md`, its only edition) SHALL contain every canonical phrase. A `VERDICT:` string appearing anywhere in the scanned docs that does not start with a table entry stays a failure, retired phrases included; recognition is the SAME prefix rule as every other consumer, with no trailer grammar of its own.

#### Scenario: CK-17 the retired lanes leave the table and the table stays closed
- WHEN the phrase table is checked against the runbook, and separately when a scanned doc carries `VERDICT: looks fine to me` or the retired `VERDICT: no findings`
- THEN the retired phrases are absent from the table while P8's and the fast floor's remain, the runbook checks clean, and both unregistered lines fail naming the file and line

## Notes

Why: the Chinese runbook edition is retired (protocol, PR-63). The checks that compared the two runbook editions — the EN/CN codex-command token comparison, the runbook heading alignment, the phrase table, the `< /dev/null` guidance and CK-11 on the Chinese file — now run on `RUNBOOK.md` alone; nothing they enforced on the English text is dropped. A reappearing `RUNBOOK_cn.md` fails self-mode so the duplicate rule source cannot come back unnoticed. The other EN/CN pairs are untouched.
