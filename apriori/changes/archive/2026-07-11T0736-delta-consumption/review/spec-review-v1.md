**Issues**

**DCSPEC-1 — Misplaced stamp handling is spec'd but not designed**

Description: AM-31 requires malformed, duplicated, and misplaced `apriori-base` stamps to carry line numbers. The design says “stamp lines recognized in FILE_PREAMBLE,” which misses a valid-looking stamp after the first legal section. In the proposed walker, that late stamp could be treated as section-preamble text or requirement-body text instead of a hygiene problem.

Risk: AM-31 and req D7 can pass only partially; a stamp after the first section may silently survive, weakening the existing CAS hygiene guard.

Suggestion: Make stamp-attempt detection a line-walker rule that runs outside fences in every state. It should record line numbers for malformed attempts, duplicates, and any stamp attempt after the first legal section heading, while still treating fenced stamp-looking text as opaque.

**DCSPEC-2 — Requirement block accumulation is underspecified against old parser semantics**

Description: The design says requirement “body lines accumulate until next heading.” That is too broad for the existing grammar. Current `REQ_RE` consumes a requirement body until the next `### Requirement:` or end of that section; scenario headings (`#### Scenario:`) are part of the body, and arbitrary body prose must be preserved. The new walker also has to flush on legal/illegal `##` section headings so bad sections are not absorbed.

Risk: A naive implementation may stop at `#### Scenario:`, drop scenarios from buckets, include section-preamble text in a block, or produce non-byte-equivalent blocks for well-formed input. That would break “well-formed deltas parse identically.”

Suggestion: Specify exact flush rules and serialization: a block starts on `### Requirement:`, includes all following lines including `#### Scenario:` and other body prose, and ends only at the next `### Requirement:`, legal `## ... Requirements`, illegal `## ` heading, or EOF. The stored block should match old `parseRequirementsStrict` output normalization: trailing whitespace trimmed at block end, then one final `\n`.

**DCSPEC-3 — CRLF and fence delimiter rules are not concrete enough**

Description: The design shows regexes like `^## ADDED|... Requirements$` over line-walked input but does not say whether lines are normalized or stripped of a trailing `\r`. Current parsing accepts CRLF inputs because the existing regexes tolerate trailing whitespace. The fence rule also says “toggle on ``` lines” without defining whether only fence delimiter lines count, or whether inline backticks can accidentally toggle opacity.

Risk: Windows-authored well-formed deltas could fail strict parsing, and inline code containing triple backticks could hide or expose structure incorrectly.

Suggestion: State that matching is performed on logical lines with a single terminal `\r` removed, or after whole-text EOL normalization for parsing. Define fence delimiters exactly, for example `^\s*````, and add tests proving inline triple backticks do not toggle fence state while fenced heading-like lines remain opaque.

**Advisories**

- AM-28..31 cover D1-D7 well. D8’s README/README_cn rider is only in design/tasks, not a scenario; that is acceptable as a ride-along, but keep it visible in tasks.
- AM-30 says the corpus is under `apriori/changes/archive/*/specs/`; the design’s `apriori/changes/archive/*/specs/**/*.md` is the precise form and should be the one used in tests.
- The CAS stamp on the delta spec matches the current `apriori/specs/archive-merge/spec.md`, and AM-28..31 do not collide with existing AM-01..27.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DCSPEC-1 | Misplaced stamp handling is spec'd by AM-31/D7 but the design only recognizes stamps in `FILE_PREAMBLE`. | Late stamps can silently survive instead of failing CAS hygiene. | STEP2·r1 | open |
| DCSPEC-2 | Requirement block accumulation and output normalization are underspecified against the old regex parser. | Well-formed deltas may parse differently or lose scenario/body content. | STEP2·r1 | open |
| DCSPEC-3 | CRLF handling and fence delimiter matching are not concrete enough for the line walker. | Windows-authored deltas or inline triple-backtick prose can be misparsed. | STEP2·r1 | open |
| DCSPEC-ADV-1 | README rider coverage and corpus glob precision should stay explicit in tasks/tests. | Advisory traceability risk. | STEP2·r1 | open |

VERDICT: 3 issues open
