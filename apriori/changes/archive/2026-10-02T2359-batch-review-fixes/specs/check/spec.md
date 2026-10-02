<!-- apriori-base: sha256:fe2c7ccf213df75dd388eb71079c0bccbede754c700515625fdd13bec6ee275f -->
# Delta — check (batch-review-fixes)

## RENAMED Requirements

- CK-11 keeps the runbook version aligned with the CLI major -> CK-11 keeps the runbook version aligned with the CLI major.minor

## MODIFIED Requirements

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

### Requirement: CK-11 keeps the runbook version aligned with the CLI major.minor
`apriori check --self` SHALL assert that RUNBOOK.md — the canonical packaged runbook — carries exactly one header-blockquote entry of the form `` > `runbook-version: X.Y` `` whose major.minor (`X.Y`) equals `package.json`'s version major.minor (a pre-release tag is ignored). A missing entry, more than one, or a malformed value FAILs (self-mode only) naming the file and the failure reason; a major.minor mismatch FAILs naming the file, the runbook's X.Y and the package's. Occurrences of `runbook-version:` in body text or in a code fence are never matched — every CommonMark fence counts (backtick or tilde, closed only by the same character at least as long, an unclosed one running to the end), and a fence belongs to its container: one opened inside a blockquote closes only at that quote depth and ends with its blockquote, and inside a fence opened outside any quote a quoted line is content, never a closer. Consumer `apriori check` (no `--self`) never runs CK-11.

#### Scenario: CK-11 the runbook major.minor tracks the CLI major.minor
- WHEN `apriori check --self` runs where RUNBOOK.md declares `runbook-version: 4.0` and package.json is on 4.0.3, then 4.0.0-rc.0
- THEN CK-11 passes; flipping its header to `3.0` FAILs (self-mode) naming the file and both versions, and so does a minor drift to `4.1`; and a consumer `apriori check` without `--self` never raises CK-11

#### Scenario: CK-12 malformed, missing, duplicate, and body occurrences
- WHEN the runbook has no `runbook-version` blockquote entry, has two of them, carries a malformed value (`runbook-version: vier`), or mentions `runbook-version:` only in body text or inside a code fence — a backtick or tilde fence, a longer fence a shorter run inside does not close, a fence behind blockquote markers, a quoted `> ~~~` inside a top-level fence (content, not a closer), a deeper-quoted run inside a quoted fence, or an unclosed one
- THEN the missing/duplicate/malformed cases FAIL (self-mode) naming the file and the reason, while the body-text and code-fence occurrences are never matched (they alone do not satisfy or fail the check — a real header entry is still required), and a real entry after a closed fence of either kind — or after a quoted fence whose blockquote ended — still counts

### Requirement: the canonical verdict phrase table is closed and carries no retired lane
The canonical table SHALL carry exactly the phrases the live review loops use — the `no major issues` family, `no spec-vs-code gaps` and `gaps found` (P8 and the fast floor), plus the `<N> issues open` prose placeholder — and SHALL NOT carry the phrases retired with the hotfix lane and the explore track (`no findings`, `extraction accepted`, `extraction rejected`). The runbook (`RUNBOOK.md`, its only edition) SHALL contain every canonical phrase. A `VERDICT:` string appearing anywhere in the scanned docs that does not start with a table entry stays a failure, retired phrases included; recognition is the SAME whole-verdict rule as every other consumer — a closed set matched whole (case-folded, whitespace collapsed, terminal punctuation dropped), never a prefix, so a canonical phrase followed by a clause is not a table entry — with no trailer grammar of its own.

#### Scenario: CK-17 the retired lanes leave the table and the table stays closed
- WHEN the phrase table is checked against the runbook, and separately when a scanned doc carries `VERDICT: looks fine to me` or the retired `VERDICT: no findings`
- THEN the retired phrases are absent from the table while P8's and the fast floor's remain, the runbook checks clean, and both unregistered lines fail naming the file and line

## Notes

Batch review (10-02, c290842) check-self-1..3: CK-11 said "major" while the code and its test compare major.minor (minor drift fails); CK-17 said "prefix rule" while the shared classifier matches whole verdicts (RUNBOOK §1 R4: "never a prefix rule"); CK-08 skipped an existing but empty mirror because the guard tested truthiness. check-self-4: CK-11's fenced-occurrence exclusion read backtick fences only; it now reads every CommonMark fence. The shared `stripFences` (lib/text.js) is left backtick-only on purpose — it also feeds the delta parsers and the check/verify parity of CK-14 — and its alignment is follow-up `fence-tilde-readers`. Review round 1 (BRF-R3): the first fence reader stripped quote markers inside a top-level fence and so closed it on a quoted `> ~~~`; fences now carry their quote depth. The requirement is renamed so its title stops saying "major". Every scenario id is kept.
