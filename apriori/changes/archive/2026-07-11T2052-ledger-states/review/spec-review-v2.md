# P5 design review — ledger-states (round 2)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/ledger-states-review-v2-raw.txt

# ledger-states STEP2 design review v2

## Resolution review

### LSSPEC-1 — Rejected, reviewer concurs with refutation

**Description:** I re-checked the runbook headings. The design’s PR-18 STEP6 target exists exactly where claimed: `RUNBOOK.md` has `### STEP6 — archive + KB writeback`, and `RUNBOOK_cn.md` has `### STEP6 —— 归档 + 知识库回写`. My round-1 finding looked at the §5 P9 prompt and missed the §4 state-machine heading.

**Risk:** Refuted. PR-18 can bind the intended STEP6 section.

**Suggested fix:** None.

### LSSPEC-2 — Verified

**Description:** The design now requires same-entry waiver evidence. It extracts the `gates:` block, bounds it at the next unindented top-level key, splits entries on `- ` with continuation lines attached, and requires one entry to contain both the row ID and `/waiv/i`.

**Risk:** Resolved. An ID in one gate entry and waiver text in another no longer passes.

**Suggested fix:** None.

### LSSPEC-ADV-1 — Verified

**Description:** The design now adds the reason floor to the GT-15 corpus assertion and defines the `gates:` block/entry boundary regexes explicitly.

**Risk:** Resolved.

**Suggested fix:** None.

## New issues

### LSSPEC-3 — Waiver evidence does not define an exact row-ID token match

**Description:** The revised same-entry rule still says the gate entry must “contain” the row ID verbatim. If implemented as a substring check, a waiver for `LS-10` also contains `LS-1`, so a `waived` row for `LS-1` could pass on the wrong human entry. This is plausible for this project’s ID style because IDs commonly share prefixes once they reach 10+.

**Risk:** The machine evidence floor for human waivers can accept the wrong row ID, weakening the self-waive fix.

**Suggested fix:** Specify an exact escaped-ID token match with non-ID boundaries, not raw substring containment. For example, require `(^|[^A-Za-z0-9-])<escaped ID>([^A-Za-z0-9-]|$)` inside the same gate entry, or define an equivalent parsed token rule. Add a GT-14 subcase: row `LS-1` with a gates entry waiving `LS-10` must block.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| LSSPEC-1 | Claim: PR-18's `^### STEP6` heading does not exist. Refuted by actual headings in both runbooks. | Claimed PR-18 unbound. | STEP2 r1 | rejected — reviewer concurs with grep evidence |
| LSSPEC-2 | Waiver evidence was block-wide; revised design now requires one gates entry to contain both row ID and `waiv`. | Self-waive fix weakened. | STEP2 r1 | verified |
| LSSPEC-ADV-1 | Advisory: GT-15 gains the reason floor; gates block/entry boundaries are explicit regexes. | Low. | STEP2 r1 | verified |
| LSSPEC-3 | Waiver evidence lacks exact row-ID token matching; substring matching can confuse IDs such as `LS-1` and `LS-10`. | Wrong human waiver entry can satisfy a different row. | STEP2 r2 | open |

VERDICT: 1 issues open
tokens used
2,958,892
# ledger-states STEP2 design review v2

## Resolution review

### LSSPEC-1 — Rejected, reviewer concurs with refutation

**Description:** I re-checked the runbook headings. The design’s PR-18 STEP6 target exists exactly where claimed: `RUNBOOK.md` has `### STEP6 — archive + KB writeback`, and `RUNBOOK_cn.md` has `### STEP6 —— 归档 + 知识库回写`. My round-1 finding looked at the §5 P9 prompt and missed the §4 state-machine heading.

**Risk:** Refuted. PR-18 can bind the intended STEP6 section.

**Suggested fix:** None.

### LSSPEC-2 — Verified

**Description:** The design now requires same-entry waiver evidence. It extracts the `gates:` block, bounds it at the next unindented top-level key, splits entries on `- ` with continuation lines attached, and requires one entry to contain both the row ID and `/waiv/i`.

**Risk:** Resolved. An ID in one gate entry and waiver text in another no longer passes.

**Suggested fix:** None.

### LSSPEC-ADV-1 — Verified

**Description:** The design now adds the reason floor to the GT-15 corpus assertion and defines the `gates:` block/entry boundary regexes explicitly.

**Risk:** Resolved.

**Suggested fix:** None.

## New issues

### LSSPEC-3 — Waiver evidence does not define an exact row-ID token match

**Description:** The revised same-entry rule still says the gate entry must “contain” the row ID verbatim. If implemented as a substring check, a waiver for `LS-10` also contains `LS-1`, so a `waived` row for `LS-1` could pass on the wrong human entry. This is plausible for this project’s ID style because IDs commonly share prefixes once they reach 10+.

**Risk:** The machine evidence floor for human waivers can accept the wrong row ID, weakening the self-waive fix.

**Suggested fix:** Specify an exact escaped-ID token match with non-ID boundaries, not raw substring containment. For example, require `(^|[^A-Za-z0-9-])<escaped ID>([^A-Za-z0-9-]|$)` inside the same gate entry, or define an equivalent parsed token rule. Add a GT-14 subcase: row `LS-1` with a gates entry waiving `LS-10` must block.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| LSSPEC-1 | Claim: PR-18's `^### STEP6` heading does not exist. Refuted by actual headings in both runbooks. | Claimed PR-18 unbound. | STEP2 r1 | rejected — reviewer concurs with grep evidence |
| LSSPEC-2 | Waiver evidence was block-wide; revised design now requires one gates entry to contain both row ID and `waiv`. | Self-waive fix weakened. | STEP2 r1 | verified |
| LSSPEC-ADV-1 | Advisory: GT-15 gains the reason floor; gates block/entry boundaries are explicit regexes. | Low. | STEP2 r1 | verified |
| LSSPEC-3 | Waiver evidence lacks exact row-ID token matching; substring matching can confuse IDs such as `LS-1` and `LS-10`. | Wrong human waiver entry can satisfy a different row. | STEP2 r2 | open |

VERDICT: 1 issues open
