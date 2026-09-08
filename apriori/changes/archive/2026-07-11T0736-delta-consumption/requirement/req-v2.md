# Requirement — delta-consumption (v2)

change: delta-consumption
target lineage: **v3 branch**. Next patch/minor (expected **3.3.1**). Fail-closed tightening: previously-silently-mangled input now errors; well-formed deltas parse identically.

> v2 handling notes (P2): DC-1 → the "tail" category is DELETED — a requirement body legally runs to the next heading or EOF (the existing grammar, kept); the consumption obligation covers structure misplacement only (see the rewritten D3). DC-2 → stamp problems (malformed/duplicate/misplaced) explicitly gain 1-based line numbers too.

## Background — the problem (current state A, reproduced)

`parseDeltaStrict` splits on the four KNOWN section headings only. Anything else is invisible structure: a misspelled `## ADDDED Requirements` heading is not a split point, so the requirements under it are absorbed into the PRECEDING section's bucket with `problems=[]` — reproduced verbatim (a `WronglyClassified` requirement landed in ADDED silently). The parser has no obligation to consume its whole input: unknown h2 headings, requirements before any section, prose between blocks, and trailing junk all pass unreported. Both `verify --change` and `archive` inherit the blindness. (GPT-5.6 second review, defect #1 — called the top code fix.)

## Goal (target state B)

`parseDeltaStrict` becomes a **sequential, fully-consuming parser**: every line of the delta must belong to exactly one legal construct, and anything else is a `problems[]` entry with its 1-based line number.

**Legal constructs (exhaustive):**
1. **Preamble** — lines BEFORE the first legal section heading: the optional CAS stamp line, blank lines, and free text/headings of level h1 or h3+ that contain no `### Requirement:` and no `#### Scenario:` (titles like `# Delta — x (change)` stay legal). An `### Requirement:` or `#### Scenario:` in the preamble → problem "requirement/scenario before any section" with line number.
2. **Legal section heading** — exactly `## ADDED|MODIFIED|REMOVED|RENAMED Requirements` (the existing regex).
3. **Illegal h2 heading** — ANY other line matching `/^##\s/` (outside fences) → problem naming the heading text and line number ("unrecognized section heading"), and the lines under it are attributed to NOTHING (skipped until the next legal section heading, each contentful skipped line already covered by the one problem — no flood).
4. **Section body** — inside ADDED/MODIFIED/REMOVED: `### Requirement:` blocks (as today, duplicates still reported); inside RENAMED: `- Old -> New` lines, blanks, or free text WITHOUT `### Requirement:` (a requirement block inside RENAMED → problem with line number).
5. **Code fences** — content inside ``` fences is opaque (never parsed as structure), consistent with every other consumer.

**Consumption proof:** parsing ends with every line accounted for (construct or reported problem); there is no "leftover" category.

**Behavioral consequences (both surfaces, existing plumbing):** any `problems[]` entry already fails closed — `verify --change` exit 2, `archive` exit 1, nothing projected/written. No new wiring needed beyond the parser.

## Acceptance criteria (testable)

- D1. The review's exact repro: `## ADDDED Requirements` → problem naming `ADDDED` with its line number; `WronglyClassified` does NOT appear in any bucket; archive exits 1 / verify --change exits 2.
- D2. A requirement block before any section heading → problem with line number.
- D3. There is NO tail category: content after the last `### Requirement:` heading is that requirement's body by the existing grammar (runs to the next heading or EOF) — the consumption obligation is exhaustively: preamble structure markers (D2), unrecognized h2 headings (D1), requirement-in-RENAMED (D4), and the existing duplicate/stamp problems — nothing else is an error.
- D4. A `### Requirement:` inside a RENAMED section → problem with line number.
- D5. Every existing well-formed delta in this repo's archived changes parses with zero problems (regression corpus: run the parser over `apriori/changes/archive/*/specs/**/*.md` — all must stay clean).
- D6. Fenced content never produces structure problems.
- D7. ALL problems carry 1-based line numbers — including the EXISTING stamp problems (malformed digest, duplicate stamp, stamp after the first section), which today report without positions; multiple distinct problems all reported (not first-only).
- D8. All existing tests pass; suite + verify GREEN; the cheat-sheet wording rider lands (README/README_cn archive row gains "(up to the commit point)" — the one-line P0-5 item riding along, declared here).

## Out of scope

- TAP plan validation (P0-2, next change).
- Any change to the STORE parser (`parseRequirementsStrict` on store text keeps its semantics; only DELTA parsing gains the consumption obligation — store files legally carry prose headers).
- New delta syntax.

## Decisions proposed

- DD-1: one problem per unrecognized heading (lines under it covered by that problem) — a flood of per-line errors would bury the signal.
- DD-2: free text without structure markers stays legal in preamble/tail — deltas legitimately carry titles and notes; the obligation is that STRUCTURE is never silently re-homed.
