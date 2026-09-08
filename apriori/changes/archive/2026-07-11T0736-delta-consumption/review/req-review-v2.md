**Round-1 Confirmations**

DC-1: **reopened**. The main D3 text now deletes the tail category, but DD-2 still says “free text without structure markers stays legal in preamble/tail.” That keeps the same tail ambiguity alive for an implementer.

DC-2: **verified**. D7 now explicitly says all problems carry 1-based line numbers, including malformed digest, duplicate stamp, and stamp-after-section cases.

**Dimension Verdicts**

1. Target state B: **still ambiguous** because the deleted tail category remains referenced in DD-2, and non-structural prose outside requirement blocks is not assigned a legal construct.
2. Edge and exception paths: **partly covered**, but prose outside blocks needs a declared classification.
3. Implied side effects: **no major issue**; parser-only change and inherited verify/archive failure behavior remain declared.
4. Acceptance criteria testability: **partly blocked** by the unresolved legal status of non-structural prose outside requirement blocks.
5. Conflicts with state A: **no direct conflict found**. The archived delta corpus under `apriori/changes/archive/*/specs/**/*.md` uses legal section headings; I found no illegal `##` headings in those files.
6. Target lineage: **declared and plausible**.

**Formal Issues**

**DC-1 — Tail category is deleted in D3 but still legal in DD-2**

Description: D3 says “There is NO tail category,” and requirement bodies run to the next heading or EOF. But DD-2 still says “free text without structure markers stays legal in preamble/tail.” That is contradictory: one part tells the implementer not to model tail; another preserves tail as a legal area.

Risk: The implementation may reintroduce a tail bucket or tail-specific leniency, recreating the ambiguity round 1 asked to remove.

Suggested fix: Delete “/tail” from DD-2. If the intended rule is “free text is legal only in preamble and inside requirement bodies,” say that directly.

**DC-3 — Non-structural prose outside requirement blocks is not classified**

Description: The goal says every line belongs to exactly one legal construct or a problem. The legal constructs define preamble text, legal section headings, illegal h2 headings, requirement blocks, RENAMED lines/free text, and fences. But for ADDED/MODIFIED/REMOVED sections, text before the first `### Requirement:` block is not assigned to any construct. D3 also says the exhaustive error set is only preamble structure markers, unrecognized h2 headings, requirement-in-RENAMED, duplicate problems, and stamp problems, so that prose is apparently not an error either.

Risk: A sequential parser cannot prove full consumption consistently. Different implementations may silently ignore, attach, or reject prose before the first requirement in a legal section.

Suggested fix: Add an explicit rule. Recommended: in ADDED/MODIFIED/REMOVED, nonblank non-fence content before the first `### Requirement:` is a problem with line number. Alternatively, declare it legal section-note text and add an acceptance test for it.

**Advisories**

- D5’s corpus scope is now precise and matches the actual archived delta location.
- D8’s README/README_cn rider is unrelated to delta parsing but is declared, so it can remain as a tracked ride-along task.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DC-1 | Tail category is deleted in D3 but still referenced as legal in DD-2. | Implementer may preserve ambiguous tail handling. | STEP0·r1 | open |
| DC-2 | Stamp hygiene problems lacked explicit line-number coverage. | Inconsistent diagnostics. | STEP0·r1 | verified |
| DC-3 | Non-structural prose before the first requirement in ADDED/MODIFIED/REMOVED is neither a legal construct nor an error. | Full-consumption parser behavior remains inconsistent and under-testable. | STEP0·r2 | open |
| ADV-2 | D8’s README rider is unrelated but declared and trackable. | Advisory scope hygiene. | STEP0·r2 | open |

VERDICT: 2 issues open
