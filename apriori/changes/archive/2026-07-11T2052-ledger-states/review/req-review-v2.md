# P1 requirement review — ledger-states (round 2)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/ledger-states-req-review-v2-raw.txt

# ledger-states requirement review v2

## Resolution review

### LS-1 — Verified

**Description:** v2 now requires `waived` rows to have both a reason and machine-checked `gates:` evidence in the change flow-state: the entry must contain the row ID and `waiv`, case-insensitively. This applies in both stages, and I3 explicitly covers the with-reason-but-no-gates-evidence blocking case.

**Risk:** Resolved. A producer-written `waived` row alone no longer passes C4.

**Suggested fix:** None.

### LS-2 — Verified

**Description:** v2 makes the post-archive `apriori gate --change <name>` run a STEP6 protocol requirement, with the result entering the gate④ packet. PR-18 is assigned to bind this along with the P0 vocabulary.

**Risk:** Resolved. The archived-stage C4 rule is no longer optional or latent.

**Suggested fix:** None.

### LS-3 — Verified

**Description:** v2 introduces a legal-status parser for both stages, with case-insensitive leading-token matching and unknown statuses blocking everywhere. I1 now covers in-flight unknown statuses as well as archived unknowns.

**Risk:** Resolved. Typos and invented statuses are no longer silently accepted.

**Suggested fix:** None.

### LS-4 — Verified

**Description:** v2 defines `rejected-verified` as preserving the original rejection reason plus a reviewer-concurrence evidence reference in the status cell. The machine floor remains word-character reason checking, with the full form left to P8/human review.

**Risk:** Resolved. The audit trail requirement is now declared.

**Suggested fix:** None.

### LS-5 — Verified

**Description:** v2 replaces the hand-scan with a standing corpus test over archived ledgers, with packaged-environment skip behavior and the UMIMPL-1 migration required so the corpus is green from day one.

**Risk:** Resolved. Migration completeness is now mechanically checkable.

**Suggested fix:** None.

## New issue review

No new formal issues found.

## Advisories

LS-ADV-1 is resolved. `reopened` is explicitly an event that returns the old ID to `open`; `advisory-acked` is terminal while cross-referencing the reviewer-only advisory discipline; and cure message exactness is intentionally left to design/content testing.

One minor design note for the next stage: the legal-status parser should define token boundaries carefully so hyphenated legal states like `rejected-verified` and `advisory-acked` are matched before shorter prefixes. The v2 acceptance criteria are strong enough to catch this, so this is not a requirement issue.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| LS-1 | `waived` passed C4 on the row alone; v2 now requires gates evidence containing row ID + `waiv`. | Formal issues waived without the human. | STEP0 r1 | verified |
| LS-2 | Archived-stage C4 was not tied to a required post-archive gate run; v2 adds the STEP6 post-archive gate requirement. | The terminal-only rule may never execute. | STEP0 r1 | verified |
| LS-3 | Unknown-status handling was unspecified in-flight; v2 makes unknown statuses block in both stages and declares case-insensitive matching. | Typos/invented states pass. | STEP0 r1 | verified |
| LS-4 | `rejected-verified` reason provenance was undefined; v2 preserves the original rationale plus reviewer concurrence evidence. | Audit trail loses the original rationale. | STEP0 r1 | verified |
| LS-5 | Migration lacked a deterministic all-archived-ledgers scan; v2 adds a standing archived-ledger corpus test. | Hidden non-terminal rows survive. | STEP0 r1 | verified |
| LS-ADV-1 | Advisory batch: `advisory-acked`, reopen-as-event, and cure-message content testing are now sufficiently specified. | Low. | STEP0 r1 | verified |

VERDICT: no major issues, ready to proceed
tokens used
2,934,071
# ledger-states requirement review v2

## Resolution review

### LS-1 — Verified

**Description:** v2 now requires `waived` rows to have both a reason and machine-checked `gates:` evidence in the change flow-state: the entry must contain the row ID and `waiv`, case-insensitively. This applies in both stages, and I3 explicitly covers the with-reason-but-no-gates-evidence blocking case.

**Risk:** Resolved. A producer-written `waived` row alone no longer passes C4.

**Suggested fix:** None.

### LS-2 — Verified

**Description:** v2 makes the post-archive `apriori gate --change <name>` run a STEP6 protocol requirement, with the result entering the gate④ packet. PR-18 is assigned to bind this along with the P0 vocabulary.

**Risk:** Resolved. The archived-stage C4 rule is no longer optional or latent.

**Suggested fix:** None.

### LS-3 — Verified

**Description:** v2 introduces a legal-status parser for both stages, with case-insensitive leading-token matching and unknown statuses blocking everywhere. I1 now covers in-flight unknown statuses as well as archived unknowns.

**Risk:** Resolved. Typos and invented statuses are no longer silently accepted.

**Suggested fix:** None.

### LS-4 — Verified

**Description:** v2 defines `rejected-verified` as preserving the original rejection reason plus a reviewer-concurrence evidence reference in the status cell. The machine floor remains word-character reason checking, with the full form left to P8/human review.

**Risk:** Resolved. The audit trail requirement is now declared.

**Suggested fix:** None.

### LS-5 — Verified

**Description:** v2 replaces the hand-scan with a standing corpus test over archived ledgers, with packaged-environment skip behavior and the UMIMPL-1 migration required so the corpus is green from day one.

**Risk:** Resolved. Migration completeness is now mechanically checkable.

**Suggested fix:** None.

## New issue review

No new formal issues found.

## Advisories

LS-ADV-1 is resolved. `reopened` is explicitly an event that returns the old ID to `open`; `advisory-acked` is terminal while cross-referencing the reviewer-only advisory discipline; and cure message exactness is intentionally left to design/content testing.

One minor design note for the next stage: the legal-status parser should define token boundaries carefully so hyphenated legal states like `rejected-verified` and `advisory-acked` are matched before shorter prefixes. The v2 acceptance criteria are strong enough to catch this, so this is not a requirement issue.

## Ledger delta

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| LS-1 | `waived` passed C4 on the row alone; v2 now requires gates evidence containing row ID + `waiv`. | Formal issues waived without the human. | STEP0 r1 | verified |
| LS-2 | Archived-stage C4 was not tied to a required post-archive gate run; v2 adds the STEP6 post-archive gate requirement. | The terminal-only rule may never execute. | STEP0 r1 | verified |
| LS-3 | Unknown-status handling was unspecified in-flight; v2 makes unknown statuses block in both stages and declares case-insensitive matching. | Typos/invented states pass. | STEP0 r1 | verified |
| LS-4 | `rejected-verified` reason provenance was undefined; v2 preserves the original rationale plus reviewer concurrence evidence. | Audit trail loses the original rationale. | STEP0 r1 | verified |
| LS-5 | Migration lacked a deterministic all-archived-ledgers scan; v2 adds a standing archived-ledger corpus test. | Hidden non-terminal rows survive. | STEP0 r1 | verified |
| LS-ADV-1 | Advisory batch: `advisory-acked`, reopen-as-event, and cure-message content testing are now sufficiently specified. | Low. | STEP0 r1 | verified |

VERDICT: no major issues, ready to proceed
