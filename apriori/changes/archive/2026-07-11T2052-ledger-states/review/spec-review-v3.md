# P5 design review — ledger-states (round 3)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/ledger-states-review-v3-raw.txt

# ledger-states STEP2 design review v3

## Resolution review

### LSSPEC-3 — Verified

**Description:** The design now requires waiver evidence to match the row ID as an exact token using an escaped-ID regex with non-ID boundaries: `(^|[^A-Za-z0-9-])<escaped ID>([^A-Za-z0-9-]|$)`. It also adds the GT-14 subcase where `LS-1` must not pass from a gate entry waiving `LS-10`.

**Risk:** Resolved. Prefix-collision IDs can no longer satisfy the wrong waiver row.

**Suggested fix:** None.

## New issue review

No new formal issues found.

## Advisories

No new advisories.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| LSSPEC-3 | Waiver ID matching was substring-based; revised design now uses escaped exact-token matching and adds the LS-1 vs LS-10 blocking subcase. | Wrong human entry satisfies a different row. | STEP2 r2 | verified |

VERDICT: no major issues, ready to proceed to execution
tokens used
2,963,471
# ledger-states STEP2 design review v3

## Resolution review

### LSSPEC-3 — Verified

**Description:** The design now requires waiver evidence to match the row ID as an exact token using an escaped-ID regex with non-ID boundaries: `(^|[^A-Za-z0-9-])<escaped ID>([^A-Za-z0-9-]|$)`. It also adds the GT-14 subcase where `LS-1` must not pass from a gate entry waiving `LS-10`.

**Risk:** Resolved. Prefix-collision IDs can no longer satisfy the wrong waiver row.

**Suggested fix:** None.

## New issue review

No new formal issues found.

## Advisories

No new advisories.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| LSSPEC-3 | Waiver ID matching was substring-based; revised design now uses escaped exact-token matching and adds the LS-1 vs LS-10 blocking subcase. | Wrong human entry satisfies a different row. | STEP2 r2 | verified |

VERDICT: no major issues, ready to proceed to execution
