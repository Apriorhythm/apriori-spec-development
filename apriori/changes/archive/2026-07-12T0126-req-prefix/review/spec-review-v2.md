# P5 design review — req-prefix (round 2)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: req-prefix-review-v2-raw.txt

# P5 Design Review — req-prefix v2

## Resolution Check

### RPSPEC-1 — verified

NW-05 now requires the generated flow-state to contain none of the three forbidden literals:
- `requirement/req-v`
- `requirement/req-final.md`
- `requirement/intent-card.md`

The design also expands PR-19’s negative check to read `lib/new.js` source and apply the same three-literal check, which covers L1’s `lib/` scope. This closes the prior binding gap.

### RPSPEC-ADV-1 — verified

The current replacement counts are recorded in the design, and P8’s EN/CN STEP6 preservation-sentence parity duty is noted. No further action needed at design-review level.

## New Issues

No new issues found. The scenario ranges remain clean, the STEP6 insertion point remains viable in both editions, and the design does not contradict the grandfathering boundary.

## Ledger Delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RPSPEC-1 | NW-05 only asserted absence of `requirement/req-v`, while L1/L4 require the scaffold/lib side to avoid all three forbidden literals: `requirement/req-v`, `requirement/req-final.md`, and `requirement/intent-card.md`. | A stale final-path or intent-card path could remain in `lib/new.js` or scaffold output while the binding tests passed. | STEP2 r1 | verified |
| RPSPEC-ADV-1 | Advisory batch: preserve current per-file replacement counts in implementation notes/tests; P8 should review EN/CN preservation-clause parity. | Low | STEP2 r1 | verified |

VERDICT: no major issues, ready to proceed to execution