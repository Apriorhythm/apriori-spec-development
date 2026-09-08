<!-- apriori-base: sha256:606fc080d3f86c6d689983ad3323c42ca95df4fa7a4873371e03e4ba5d9a8721 -->

## MODIFIED Requirements

### Requirement: the delta parser consumes its whole input
`parseDeltaStrict` SHALL be a sequential, fully-consuming parser: every line (outside code fences, which are opaque) belongs to exactly one legal construct — file preamble (stamp/blank/free text without structure markers), a legal `## ADDED|MODIFIED|REMOVED|RENAMED Requirements` heading, section-preamble free text, a `### Requirement:` block (body runs to the next heading or EOF), a RENAMED `- Old -> New` line, or a `## Notes` section (opaque commentary: everything under it up to the next fence-outside h2 is ignored entirely — never merged, never a problem) — and anything else is a `problems[]` entry carrying its 1-based line number. The exhaustive problem set: unrecognized h2 headings (one problem per heading; its lines are never absorbed into any bucket), requirement/scenario markers before any section, a requirement block inside RENAMED, a scenario marker outside any requirement, duplicate requirement names, A NON-`Requirement` h3 INSIDE A REQUIREMENT BLOCK, and the stamp problems (which also gain line numbers). Both `verify --change` (exit 2) and `archive` (exit 1) inherit the failure.

#### Scenario: AM-28 a misspelled section heading is reported, never absorbed
- WHEN a delta contains `## ADDDED Requirements` (or any other unrecognized h2) followed by requirement blocks
- THEN parsing reports the heading text with its line number, those requirements appear in NO bucket, and archive/verify fail closed

#### Scenario: AM-29 structure outside its legal home is reported with line numbers
- WHEN a `### Requirement:` appears before any section or inside a RENAMED section, or a `#### Scenario:` appears in a section preamble outside any requirement
- THEN each is a problem carrying its 1-based line number; multiple distinct problems are all reported

#### Scenario: AM-30 free text and fences stay legal; the corpus stays clean
- WHEN a delta carries titles/notes in the file preamble or section preambles, prose (`#####` and deeper headings included) in requirement bodies, or fenced content containing heading-like lines
- THEN no problem is reported — and every archived delta in this repo's `apriori/changes/archive/*/specs/` parses with zero problems (the regression corpus). An `###` heading that is not `### Requirement:` inside a requirement body is the ONE construct this list no longer covers: it is a problem, see the scenario below

#### Scenario: AM-31 stamp problems carry line numbers
- WHEN a delta carries a malformed, duplicated, or misplaced apriori-base stamp
- THEN each stamp problem names its 1-based line number

#### Scenario: AM-71 a non-Requirement h3 inside a block is a problem, not silent body text
- WHEN a `###` heading that is not `### Requirement:` appears inside a requirement block — the shape an author reaches for when explaining WHY a block changed
- THEN it is a problem carrying its line number and the delta is refused; today it is absorbed as body text and written verbatim into the living store, which the MODIFIED-integrity report can surface on a MODIFIED operation but never on an ADDED one, so the ADDED path corrupts the store silently
- AND the same heading in the file preamble, in a section preamble, or in the skipped region after an unrecognized h2 keeps its existing behaviour; `####` and deeper headings inside a block stay body text

#### Scenario: AM-72 one problem per bad block, and the stamp rule is untouched
- WHEN a non-Requirement h3 is followed by more prose and then a legal `### Requirement:`
- THEN exactly ONE problem is reported for that heading, the discarded block reaches no bucket, and the following legal requirement opens normally
- AND WHEN a stamp-shaped line appears inside a discarded block — whether discarded by this rule or by the pre-existing illegal-requirement-inside-RENAMED rule — THEN it is still handled by the stamp rules, never absorbed as body text: discarding suppresses only the new h3 check, never the parser's line-handling order

#### Scenario: AM-73 `## Notes` is opaque, and being opaque has consequences
- WHEN a delta carries one or more `## Notes` sections — before the first operation section, between sections, or at end of file
- THEN their content is ignored entirely: requirement and scenario markers inside them create no operations, a stamp-shaped line inside them is neither adopted nor reported, and no problem is raised; the section ends at the next fence-outside h2, where any of the four legal operation headings resumes parsing and any other h2 reports its own problem as before
- AND a legal stamp intended for the delta must sit BEFORE `## Notes`, since a stamp after it is inside it and therefore ignored — leaving the delta unstamped and subject to the existing CAS default-deny
- AND a delta consisting only of `## Notes` still fails the existing zero-operation guard: commentary is not an operation
