<!-- apriori-base: sha256:c00732f78c0e68b1f227014d657b3d1ba924e0749f0f941027d8015baa2eaf79 -->
# Delta — check (batch-recheck-fixes)

## MODIFIED Requirements

### Requirement: CK-11 keeps the runbook version aligned with the CLI major.minor
`apriori check --self` SHALL assert that RUNBOOK.md — the canonical packaged runbook — carries exactly one header-blockquote entry of the form `` > `runbook-version: X.Y` `` whose major.minor (`X.Y`) equals `package.json`'s version major.minor (a pre-release tag is ignored). The header region (from the top to the first line starting `## `) is read literally, never as CommonMark: a run of three or more backticks or three or more tildes anywhere in it — whatever its indentation, container or purpose, with or without a real entry beside it — FAILs as an unsupported header format naming the line, and nothing in that header is read as an entry; the runbook header carries no code fence. Otherwise a missing entry, more than one, or a malformed value FAILs (self-mode only) naming the file and the failure reason, and a major.minor mismatch FAILs naming the file, the runbook's X.Y and the package's. A mention of `runbook-version:` in body text (not entry-shaped) or anywhere after the first h2 is never matched, and the body region is not subject to the fence rule. Consumer `apriori check` (no `--self`) never runs CK-11.

#### Scenario: CK-11 the runbook major.minor tracks the CLI major.minor
- WHEN `apriori check --self` runs where RUNBOOK.md declares `runbook-version: 4.0` and package.json is on 4.0.3, then 4.0.0-rc.0
- THEN CK-11 passes; flipping its header to `3.0` FAILs (self-mode) naming the file and both versions, and so does a minor drift to `4.1`; and a consumer `apriori check` without `--self` never raises CK-11

#### Scenario: CK-12 malformed, missing, duplicate, body occurrences, and a fence in the header
- WHEN the runbook has no `runbook-version` blockquote entry, has two of them, carries a malformed value (`runbook-version: vier`), or mentions `runbook-version:` only in body text; and, separately, when its header region holds a run of three or more backticks or tildes — a fenced entry alone (backtick, tilde, longer, quoted, unclosed), a real entry after a list item's fence, an ordered-list line after a paragraph, a list continuation fence between two entries, an unrelated inline run beside a real entry, a four-space-indented run — or a fence only after the first h2
- THEN the missing/duplicate/malformed cases FAIL (self-mode) naming the file and the reason, and the body-text mention is never matched; every header run FAILs once as an unsupported header format naming its line, with or without a real entry; single backticks (inline code) are ordinary text; and a fence after the first h2 does not concern CK-11

## Notes

Owner decision 2026-10-03 (recorded in this change's `gates:`), on Astra's advice (lab round R59-R11): CK-11 reads the runbook header literally and refuses any fence-like run in it, instead of parsing CommonMark. The line-based fence reader added for check-self-4 kept missing container edges four rounds running — quoted fences (BRF-R3), list items (check-self-R1, from the requirement-level re-check), an ordered list that cannot interrupt a paragraph (BRC-R1) and a fence on a list continuation line (BRC-R2), each a false PASS or a hidden duplicate. CK-12's earlier promise that a fenced occurrence in the header "alone does not fail the check" is withdrawn by that decision: a fence in the header now fails, whatever it holds. The body region and consumer mode are unchanged, and the shared `stripFences` is not touched (FU-1 of batch-review-fixes stays open). CK-11 and CK-12 keep their ids; CK-12 is retitled under its id.
