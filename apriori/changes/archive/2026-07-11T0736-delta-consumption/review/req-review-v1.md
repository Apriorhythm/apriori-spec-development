**Dimension Verdicts**

1. Target state B: **has major ambiguity** around D3/tail handling.
2. Edge and exception paths: **mostly covered**, but stamp-problem line numbering is missing.
3. Implied side effects: **no major issue**; verify/archive behavior is declared as inherited from existing parser failure handling.
4. Acceptance criteria testability: **partly blocked** by D3’s undefined “tail after last block” model.
5. Conflicts with state A: **no direct conflict found**. Current archived delta files use `# Delta ...` titles and legal `## ADDED|MODIFIED|REMOVED|RENAMED Requirements` sections; I did not find illegal `##` headings in the archived `spec.md` deltas.
6. Target lineage: **declared and plausible** as v3 / 3.3.1.

**Formal Issues**

**DC-1 — D3 leaves the tail grammar unresolved**

Description: D3 explicitly leaves the stricter-tail question open, and the legal-construct taxonomy does not define a parseable “tail after the last block” boundary. In the current delta format, a `### Requirement:` block has no closing delimiter; its body naturally runs until the next requirement heading, section heading, or EOF. That means “plain trailing prose after the last block” is not distinguishable from the last requirement body unless the requirement defines a new block-ending rule.

Risk: Implementers can make incompatible choices: one parser may treat post-requirement prose as legal requirement body, another as legal tail, another as junk. This undermines the “fully-consuming parser” goal and makes D3’s acceptance test arbitrary.

Suggested fix: Make a final decision in the requirement. My recommendation is the stricter rule: outside fences, after a legal `ADDED`/`MODIFIED`/`REMOVED` section starts, all nonblank content must be inside a `### Requirement:` block, and a requirement block consumes through the next requirement heading, legal section heading, illegal `##` heading, or EOF. Do not define a separate lenient tail unless the requirement also defines an explicit block boundary and tests it.

**DC-2 — Line-number requirement does not cover existing stamp hygiene problems**

Description: The goal says every `problems[]` entry gets a 1-based line number, and D7 requires line numbers on multiple distinct problems. But `parseStamp` currently contributes parser problems for malformed stamps, duplicate stamps, and stamps after the first legal section, and the requirement does not explicitly say those existing stamp problems must gain line numbers too.

Risk: An implementation can satisfy the new section/requirement parsing cases while leaving stamp-related `problems[]` entries without line numbers, violating the stated global contract and producing inconsistent diagnostics.

Suggested fix: Add an acceptance case or explicit rule: every problem emitted by `parseDeltaStrict`, including `parseStamp` hygiene problems, must include the offending 1-based line number. For duplicate stamps, specify whether the reported line is the duplicate line, all duplicate lines, or the first duplicate after the first valid stamp.

**Advisories**

- D5 is a useful regression guard. The requirement should say the corpus is the archived `apriori/changes/archive/*/specs/**/spec.md` delta files, not requirement docs, since requirement docs contain quote blocks and handling notes that are intentionally outside this parser’s scope.
- The “one problem per unrecognized heading” decision is reasonable, but the test should assert both halves: the bad heading produces exactly one heading problem, and any requirements under it are absent from all section buckets.
- The README/README_cn archive-row rider is unrelated to parser correctness but is declared and testable; keep it in tasks so it does not disappear during implementation.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DC-1 | D3 leaves the tail grammar unresolved because requirement blocks have no closing delimiter and “plain trailing prose after the last block” is not parseably defined. | Inconsistent implementations and untestable/fragile D3 acceptance behavior. | 1 | open |
| DC-2 | The global line-number contract does not explicitly include existing `parseStamp` hygiene problems. | Inconsistent diagnostics and partial compliance with the new `problems[]` contract. | 1 | open |
| ADV-1 | Regression-corpus scope, illegal-heading assertion strength, and unrelated README rider tracking should be tightened. | Advisory clarity and implementation hygiene. | 1 | open |

VERDICT: 2 issues open
