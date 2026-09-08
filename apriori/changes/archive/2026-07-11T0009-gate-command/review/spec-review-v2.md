**Resolution Checks**

GSPEC-1 is resolved. The amended C4 design now strips the leading `rejected`, trims the suffix, and requires at least one word character in the remaining text. GT-03 now covers the intended boundary: `rejected: duplicate` passes, while `rejected`, `rejected:`, and `rejected -` block.

The C5 advisory is also resolved. The design and GT-05 now state that raw evidence must be regular by `lstat` first; symlinked raws are not evidence.

**New Issues**

No new formal issues found in the amended text. The read-only design remains explicit, the GT and CL scenario IDs do not collide with the store specs, and the CLI MODIFIED block remains faithful apart from the declared `gate` additions.

**Advisories**

No new advisories.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| GSPEC-1 | C4 rejected-reason validation now requires a word character after stripping the leading `rejected`; punctuation-only statuses block. | Previously could falsely pass with a reasonless rejected ledger row. | STEP2·r1 | verified |
| ADV-GSPEC-1 | Advisory batch resolved: C5 raw evidence now requires lstat-regular files; symlinked raws do not count. | Low; precision/readability only. | STEP2·r1 | advisory-verified |

VERDICT: no major issues, ready to proceed to execution
tokens used
748,041
**Resolution Checks**

GSPEC-1 is resolved. The amended C4 design now strips the leading `rejected`, trims the suffix, and requires at least one word character in the remaining text. GT-03 now covers the intended boundary: `rejected: duplicate` passes, while `rejected`, `rejected:`, and `rejected -` block.

The C5 advisory is also resolved. The design and GT-05 now state that raw evidence must be regular by `lstat` first; symlinked raws are not evidence.

**New Issues**

No new formal issues found in the amended text. The read-only design remains explicit, the GT and CL scenario IDs do not collide with the store specs, and the CLI MODIFIED block remains faithful apart from the declared `gate` additions.

**Advisories**

No new advisories.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| GSPEC-1 | C4 rejected-reason validation now requires a word character after stripping the leading `rejected`; punctuation-only statuses block. | Previously could falsely pass with a reasonless rejected ledger row. | STEP2·r1 | verified |
| ADV-GSPEC-1 | Advisory batch resolved: C5 raw evidence now requires lstat-regular files; symlinked raws do not count. | Low; precision/readability only. | STEP2·r1 | advisory-verified |

VERDICT: no major issues, ready to proceed to execution
