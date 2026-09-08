# Issue ledger — update-manifest

Rows recorded on behalf of the reviewer (codex session 019f4b30-68f9-7222-9b64-17f52a333b4c; raws: update-manifest-*-raw.txt).

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| UM-1 | Corrupt/schema-invalid/unsupported-version managed.json behavior undefined. | Fail-open overwrite despite untrusted manifest, or unhelpful crash. | STEP0·r1 | verified |
| UM-2 | Manifest path containment/allowed-path validation unspecified. | Corrupt manifest entries could write outside the project. | STEP0·r1 | verified |
| UM-3 | init --dry-run manifest behavior undeclared. | Dry-run could mutate the manifest or diverge from tests. | STEP0·r1 | verified |
| UM-4 | init merge could blindly adopt skipped existing files into the manifest. | Laundering user-owned files into managed ownership → future clobber. | STEP0·r1 | verified |
| UM-5 | Missing-file hand-back via init not specified (stale hash after recreate). | The prescribed cure leaves a false 'modified' state. | STEP0·r1 | verified |
| UM-ADV-1 | CRLF consequence, F6 wording, full ancestor hashes. | Advisory precision. | STEP0·r1 | verified |
| UMSPEC-1 | Design required containment only before writes; manifest-listed symlinks could be read/hashed outside the project and classified modified/up-to-date instead of hygiene-invalid. | Security boundary weakened; fail-closed rule violated on reads. | STEP2·r1 | verified |
| UMSPEC-ADV-1 | Advisory: adoption counts as manifest-write trigger even when byte-identical; writeManifest ensures apriori/ exists; UP-01 fixture note kept explicit. | Implementation precision. | STEP2·r1 | verified |
| UMIMPL-1 | Claim: manifest-listed missing command files never considered (no `missing` row). REFUTED by direct run — the TOOLS loop calls consider() unconditionally and the missing row is emitted; regression made durable in UP-10b. | (claimed) missing files unreported. | STEP5·r1 | rejected-verified — the missing-row claim refuted with reproduction evidence: the TOOLS loop has no existence pre-check and the missing row IS emitted (UP-10b); reviewer concurred (impl-review-v2) |
| UMIMPL-2 | Backslash manifest keys passed hygiene (validated on the normalized form) but were returned uncanonicalized — consumers would treat them as unlisted. | Hand-edited/Windows-shaped manifests behave inconsistently. | STEP5·r1 | verified |
| UMIMPL-ADV-1 | Advisory: direct symlink-escape containment test added (UP-10b); byte-vs-utf8 refresh alignment declined — an invalid-utf8 local edit already hash-mismatches into a `modified` skip before refresh can run. | Test hardening. | STEP5·r1 | verified |
