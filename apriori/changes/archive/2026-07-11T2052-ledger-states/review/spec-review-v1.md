# P5 design review — ledger-states (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/ledger-states-review-v1-raw.txt

# ledger-states STEP2 design review v1

## Issues

### LSSPEC-1 — PR-18 STEP6 block extractor targets a heading that does not exist

**Description:** The design says PR-18 will use `sectionBlock` on `^### STEP6 /m` for the EN STEP6 section. Current `RUNBOOK.md` does not have that heading; the STEP6 producer prompt is headed `### P9 — STEP6 archive (producer)`. The CN mirror likewise uses the P9/STEP6 heading form, not a bare `### STEP6`.

**Risk:** PR-18 either cannot bind the post-archive gate requirement or gets implemented against the wrong text. That leaves LS-2’s core fix unproven.

**Suggested fix:** Specify the actual headings: EN `^### P9 — STEP6 archive` and CN `^### P9 —— STEP6` / `归档`, or define a helper that finds the `STEP6 archive` prompt by content. Keep the assertion scoped to that block.

### LSSPEC-2 — Waiver evidence is designed as block-wide text, not a single `gates:` entry

**Description:** Req-final says the flow-state entry must contain the row ID and `waiv`. GT-14 also says “a matching flow-state gates: entry.” The design instead extracts the whole `gates:` block and requires the block to contain the row ID and `/waiv/i` anywhere. That can pass with the row ID in one gate entry and unrelated “waived” text in another entry.

**Risk:** A waiver can be mechanically accepted without one human gate entry actually recording that specific row’s waiver. This weakens the self-waive fix.

**Suggested fix:** Reuse or mirror `parseFlowState`’s gate-line model and require at least one individual gate entry line to contain both the row ID and `/waiv/i`. If multiline gate entries are intended, define their boundary precisely and still require both tokens in the same entry.

## Coverage notes

GT-13/14/15 cover I1/I2/I3/I6’s ledger-state behaviors at the gate layer, and PR-18 covers I4/I5 protocol/docs binding once the STEP6 heading is corrected. Existing archived GT-06/07 fixtures use `LEDGER_OK` with `verified`, so the new archived terminal rule should not break them.

The classifier alternation order is directionally correct. In JavaScript, `rejected-verified` before `rejected` avoids the shorter match, and `\b` at the end of `rejected-verified` / `advisory-acked` works when followed by a space/end because the final character is a word character.

Archive name derivation is acceptable if implemented as stripping the fixed stamp prefix `YYYY-MM-DDThhmm-`; names containing digits or hyphens remain unambiguous after that prefix.

## Advisories

- In GT-15, make the corpus assertion check the reason floor as well as `legal && terminal`, so reasonless `rejected-verified` / `waived` cannot pass the corpus helper by accident.
- Define the `gates:` block boundary with an explicit regex even after switching to same-entry matching. A top-level flow-state key should mean an unindented `key:` line, not an indented gate bullet containing a timestamp or colon.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| LSSPEC-1 | PR-18 STEP6 block extractor targets `^### STEP6`, but the actual runbook heading is `### P9 — STEP6 archive (producer)` with a CN mirror. | The post-archive gate requirement can remain unbound or be tested against the wrong text. | STEP2 r1 | open |
| LSSPEC-2 | Waiver evidence is checked across the whole `gates:` block instead of requiring one gate entry to contain both the row ID and `waiv`. | A waiver can pass mechanically without a single human entry recording that specific waived row. | STEP2 r1 | open |
| LSSPEC-ADV-1 | Advisory batch: GT-15 should include reason-floor checks; define the `gates:` block boundary regex explicitly. | Low. | STEP2 r1 | open |

VERDICT: 2 issues open
