# Technical Review — gate-command STEP2 r1

**Issues**

**GSPEC-1 — C4 rejected-reason validation regex accepts reasonless punctuation**

Description: `requirement/req-final.md` requires rejected ledger rows to carry a reason beyond `rejected`; bare rejected statuses block. The design says C4 should require “a word character beyond `rejected`”, but then specifies `/^rejected\b\s*\S/i`. That regex accepts `rejected:` or `rejected.` because `\S` can be punctuation, so a reasonless rejected row can pass.

Risk: Correctness failure in a release gate. A change with an unresolved/reasonless rejection could be reported clean, causing a bad promotion decision.

Suggested fix: Specify the validation against the suffix after the `rejected` word. For example: strip `/^rejected\b/i`, trim the remaining text, and require at least one word/alphanumeric character in that suffix. This should accept `rejected: duplicate`, but reject `rejected`, `rejected:`, and `rejected -`.

**Advisories**

The GT scenario ID range does not collide with existing store IDs, and the CLI MODIFIED block appears faithful to the current store block apart from the declared `gate` additions and CAS stamp.

Consider making the C5 raw-evidence rule explicitly say whether raw evidence symlinks are rejected by `lstat` before `realpath`; the requirement says “REGULAR file”, but the design mostly states the realpath containment condition.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| GSPEC-1 | C4 rejected-reason validation regex accepts `rejected:` / punctuation-only statuses as reasoned rejections. | Gate can falsely pass with a reasonless rejected ledger row. | P5 round 1 | open |
| ADV-GSPEC-1 | Advisory batch: ID/block fidelity checked clean; clarify C5 raw symlink handling if desired. | Low; precision/readability only. | P5 round 1 | advisory |

VERDICT: 1 issues open
