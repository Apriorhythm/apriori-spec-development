# P8 implementation review — update-manifest (round 2)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/update-manifest-impl-review-v2-raw.txt

**Round-1 Outcomes**

UMIMPL-1: **rejected — refuted with evidence**. I re-read `lib/update.js`: the TOOLS loop calls `consider()` for every command rel without an existence pre-check, so deleted manifest-listed command files do reach the `missing` branch. UP-10b now makes this durable by deleting `.claude/commands/apriori.md` and asserting the `missing` row.

UMIMPL-2: **verified**. `readManifest()` now rejects any key containing `\` as a non-canonical key, preserving the forward-slash manifest contract. UP-10 includes the backslash-key hygiene case.

UMIMPL-ADV-1: **verified**. UP-10b adds the escaping-symlink test and proves it throws before classifying or hashing. The byte-vs-UTF-8 refresh point is reasonably declined: a local byte change hash-mismatches and becomes `modified` before refresh can run.

**New Issues**

None.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| UMIMPL-1 | Claim: manifest-listed missing command files were never considered, so update omitted the required `missing` action row. | Claimed missing files would be unreported. | STEP5·r1 | rejected — refuted with reproduction evidence |
| UMIMPL-2 | Backslash manifest keys passed hygiene but were returned uncanonicalized. | Hand-edited/Windows-shaped manifests behaved inconsistently. | STEP5·r1 | verified |
| UMIMPL-ADV-1 | Add direct symlink-containment test; byte-vs-UTF-8 refresh alignment questioned. | Advisory hardening. | STEP5·r1 | verified |

VERDICT: no major issues, ready to proceed
tokens used
2,500,889
**Round-1 Outcomes**

UMIMPL-1: **rejected — refuted with evidence**. I re-read `lib/update.js`: the TOOLS loop calls `consider()` for every command rel without an existence pre-check, so deleted manifest-listed command files do reach the `missing` branch. UP-10b now makes this durable by deleting `.claude/commands/apriori.md` and asserting the `missing` row.

UMIMPL-2: **verified**. `readManifest()` now rejects any key containing `\` as a non-canonical key, preserving the forward-slash manifest contract. UP-10 includes the backslash-key hygiene case.

UMIMPL-ADV-1: **verified**. UP-10b adds the escaping-symlink test and proves it throws before classifying or hashing. The byte-vs-UTF-8 refresh point is reasonably declined: a local byte change hash-mismatches and becomes `modified` before refresh can run.

**New Issues**

None.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| UMIMPL-1 | Claim: manifest-listed missing command files were never considered, so update omitted the required `missing` action row. | Claimed missing files would be unreported. | STEP5·r1 | rejected — refuted with reproduction evidence |
| UMIMPL-2 | Backslash manifest keys passed hygiene but were returned uncanonicalized. | Hand-edited/Windows-shaped manifests behaved inconsistently. | STEP5·r1 | verified |
| UMIMPL-ADV-1 | Add direct symlink-containment test; byte-vs-UTF-8 refresh alignment questioned. | Advisory hardening. | STEP5·r1 | verified |

VERDICT: no major issues, ready to proceed
