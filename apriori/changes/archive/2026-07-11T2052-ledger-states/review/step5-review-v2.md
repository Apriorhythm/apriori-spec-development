# P8 consistency review — ledger-states (round 2)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/ledger-states-impl-review-v2-raw.txt

# ledger-states STEP5 consistency review v2

## Resolution review

### LSIMPL-1 — Verified

**Description:** PR-18 now binds the plain producer-set rejected state distinctly in both editions with `/open → rejected(?!-)/`. This closes the prior loophole where `\brejected\b` could match inside `rejected-verified`.

**Risk:** Resolved. A future edit cannot drop the plain `open → rejected` producer transition while keeping PR-18 green via `rejected-verified`.

**Suggested fix:** None.

### LSIMPL-ADV-1 — Verified

**Description:** The CN sample table now includes the waived example row mirroring EN’s `SPEC-3` waived row.

**Risk:** Resolved.

**Suggested fix:** None.

## New issue review

No new spec-vs-code gaps found.

The negative lookahead anchor is scoped to the P0 block and targets the explicit transition text, so it binds the intended clause rather than a generic occurrence.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| LSIMPL-1 | PR-18's plain rejected-status anchors could be satisfied by `rejected-verified`; both editions now assert `open → rejected(?!-)`. | A future edit drops the plain producer-set state while PR-18 stays green. | STEP5 r1 | verified |
| LSIMPL-ADV-1 | Advisory: CN gained the waived example row for parity; markdown-decorated status cells remain illegal by design. | Low. | STEP5 r1 | verified |

VERDICT: no major issues, ready to proceed
tokens used
3,029,045
# ledger-states STEP5 consistency review v2

## Resolution review

### LSIMPL-1 — Verified

**Description:** PR-18 now binds the plain producer-set rejected state distinctly in both editions with `/open → rejected(?!-)/`. This closes the prior loophole where `\brejected\b` could match inside `rejected-verified`.

**Risk:** Resolved. A future edit cannot drop the plain `open → rejected` producer transition while keeping PR-18 green via `rejected-verified`.

**Suggested fix:** None.

### LSIMPL-ADV-1 — Verified

**Description:** The CN sample table now includes the waived example row mirroring EN’s `SPEC-3` waived row.

**Risk:** Resolved.

**Suggested fix:** None.

## New issue review

No new spec-vs-code gaps found.

The negative lookahead anchor is scoped to the P0 block and targets the explicit transition text, so it binds the intended clause rather than a generic occurrence.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| LSIMPL-1 | PR-18's plain rejected-status anchors could be satisfied by `rejected-verified`; both editions now assert `open → rejected(?!-)`. | A future edit drops the plain producer-set state while PR-18 stays green. | STEP5 r1 | verified |
| LSIMPL-ADV-1 | Advisory: CN gained the waived example row for parity; markdown-decorated status cells remain illegal by design. | Low. | STEP5 r1 | verified |

VERDICT: no major issues, ready to proceed
