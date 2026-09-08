# P5 design review — update-manifest (round 2)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/update-manifest-review-v2-raw.txt

**Round-1 Confirmations**

UMSPEC-1: **verified**. The design now requires realpath containment before any read, hash, or write of manifest-listed and candidate targets. Escaping symlinks are hygiene errors rather than `modified`/`up-to-date`.

UMSPEC-ADV-1: **verified**. The design now states that a pre-manifest adoption pass writes `managed.json` even when every adopted file is byte-identical, `writeManifest` ensures `apriori/` exists, and the UP-01 fixture audit note is explicit.

**New Issues**

None.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| UMSPEC-1 | Design required containment only before writes; manifest-listed symlinks could be read/hashed outside the project and classified `modified`/`up-to-date` instead of hygiene-invalid. | Security boundary weakened; fail-closed rule violated on reads. | STEP2·r1 | verified |
| UMSPEC-ADV-1 | Adoption needed to count as a manifest-write trigger even when byte-identical; `writeManifest` and UP-01 fixture notes needed precision. | Advisory implementation precision. | STEP2·r1 | verified |

VERDICT: no major issues, ready to proceed to execution
