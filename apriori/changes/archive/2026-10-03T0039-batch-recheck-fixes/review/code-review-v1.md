<!-- provenance: provider=codex model=gpt-6-astra session=01a0fd6c-8d20-79e2-a01a-a7ef11cfd856 date=2026-10-03 -->
# code-review — batch-recheck-fixes (round 1)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript (the final message, after `tokens used`), except one placeholder provenance line the reviewer printed at its top (`provider=openai model=unknown session=unknown`), omitted so it cannot be read as this document's provenance; it remains in code-review-v1-raw.txt.


Intended path: `apriori/changes/batch-recheck-fixes/review/code-review-v1.md`. Returned for verbatim landing by the producer under RUNBOOK §1 R2; this sandbox cannot write files.

Two substantive issues remain. Both follow from static traces through `checkRunbookVersion`; neither depends on sandbox test results.

**BRC-R1 — Ordered-list recognition introduces a false PASS.**

At [lib/check.js:283](/root/terra/wt-fix2/lib/check.js:283), any numeric marker is accepted without checking whether it can start a list. Consider this header with package version `6.2`:

```markdown
# R

paragraph
2. ~~~
   ~~~
> `runbook-version: 6.2`
```

An ordered list starting at `2` cannot interrupt the paragraph. Consequently, the three-space-indented `~~~` opens a top-level fence, and the version entry is fenced content. [CommonMark §5.2](https://spec.commonmark.org/0.31.2/#list-items) specifies this interruption restriction.

The new reader instead opens a list fence at `2. ~~~`, closes it on the following line, and counts the fenced version entry. CK-11 incorrectly passes without a real header entry. The reader in `9020f02` correctly suppresses this entry.

Suggested fix: recognize list starts in their block context, including paragraph-interruption rules. Add a CK-12 assertion that this example reports a missing entry, alongside a valid ordered-list case.

**BRC-R2 — List continuation fences still hide real entries and duplicates.**

At [lib/check.js:286](/root/terra/wt-fix2/lib/check.js:286), a fence receives a list base only when its own line contains a list marker. A fence beginning later within the item incorrectly receives base zero:

```markdown
# R

> `runbook-version: 6.2`

- example

  ~~~
  sample
     ~~~

> `runbook-version: 6.2`
```

The opener has two leading spaces; the closer has five. Within this list item, the closer has three extra spaces and validly closes the fence. List content indentation and fence closing rules make both version entries real header entries. [CommonMark §5.2](https://spec.commonmark.org/0.31.2/#list-items), [§4.5](https://spec.commonmark.org/0.31.2/#fenced-code-blocks).

The implementation assigns `base: 0`, rejects the closer because `5 > 3`, and suppresses the second entry. CK-11 incorrectly passes a duplicate header. Removing the first entry produces a false missing-entry failure.

This is a remaining variant of check-self-R1’s failure surface, rather than a newly introduced regression. The added tests cover fences immediately following markers, so they do not establish the broader container guarantee.

Suggested fix: retain active list-container indentation across continuation lines and use it for fence opening, closing, and container termination. Cover both the duplicate and single-entry outcomes above.

**Risk surfaces examined.**

- Traced top-level, quoted, immediate-list, nested-list, ordered-list, indentation, tab, blank-line, and container-exit handling against the header matcher and shared fence stripper. This was not exhaustive CommonMark conformance verification.
- Traced current-edition and earlier-edition guide adoption, listed-guide updates, descriptor fallback, manifest recording, and dry-run decisions. The new `seen.located` gate covers both guide adoption outcomes. Unlocated listed reads alone do not update ownership; rewrites retain descriptor checks.
- Inspected PW-02 and UP-09 expectations. Available-descriptor branches still require successful adoption or rewriting and corresponding manifest changes. Unavailable-descriptor branches assert refusal and retained state. Windows skips surround symlink-dependent cases; ordinary refusal and hard-link checks remain active.
- Compared the MODIFIED blocks with their base requirements and inspected MIGRATING, both CLI references, and CHANGELOG. No additional substantive gap found there.
- `gate --change batch-recheck-fixes --json` reports no open items and blocks on the missing review summary. C1 was skipped because this invocation supplied no test command.

I did not rerun the reported 883-test suites, execute native Windows/macOS validation, or re-audit unrelated command/runbook ownership mechanisms. The documented first-install parent-directory race was not resolved by this change. Credentials, human-note files, and raw review transcripts were not read.

**Advisories:** none. These findings concern implementation correctness within the existing scope; they do not establish a need to split or escalate the approach.

VERDICT: 2 issues open
