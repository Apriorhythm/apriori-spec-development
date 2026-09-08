# P1 requirement review — update-manifest (round 2)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/update-manifest-req-review-v2-raw.txt

**Round-1 Confirmations**

UM-1: **verified**. Manifest hygiene now fails closed for unreadable, unparseable, schema-invalid, bad-hash, and unsupported-version manifests, for both `update` and `init`, including dry-run.

UM-2: **verified**. Manifest keys are constrained to normalized relative allowed refresh targets, and writes require realpath containment under the project root.

UM-3: **verified**. `init --dry-run` now explicitly leaves the manifest absent/unchanged and reports would-be entries.

UM-4: **verified**. Init records only files it actually creates; skipped existing command files are not blind-adopted.

UM-5: **verified**. The delete-and-rerun-init flow now refreshes the manifest hash when init recreates an absent managed file.

UM-ADV-1: **verified**. CRLF/autocrlf consequences, F6 wording, and full known-generation hashes are explicit.

**New Issues**

None.

**Dimension Verdicts**

1. Target state B: **clear**.
2. Edge/exception coverage: **covered** for manifest corruption, unsupported versions, path hygiene, dry-run, migration, local edits, missing files, and CRLF consequences.
3. Side effects: **declared**; manifest creation/update and no-write dry-runs are explicit.
4. Acceptance criteria: **testable**; F1-F12 are expressible as concrete if/then cases.
5. State-A conflicts: **none found**; current code matches the problem statement.
6. Lineage: **declared and plausible** for v3 next patch/minor.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| UM-1 | Corrupt/schema-invalid/unsupported-version `managed.json` behavior was undefined. | Fail-open overwrite despite untrusted manifest, or unhelpful crash. | P1·r1 | verified |
| UM-2 | Manifest path containment/allowed-path validation was unspecified. | Corrupt manifest entries could write outside the project. | P1·r1 | verified |
| UM-3 | `init --dry-run` manifest behavior was undeclared. | Dry-run could mutate the manifest or diverge from tests. | P1·r1 | verified |
| UM-4 | Init merge could blindly adopt skipped existing files into the manifest. | Laundering user-owned files into managed ownership, causing future clobber. | P1·r1 | verified |
| UM-5 | Missing-file hand-back via init was not specified. | The prescribed cure could leave a false `modified` state. | P1·r1 | verified |
| UM-ADV-1 | CRLF consequence, F6 wording, and full ancestor hashes needed to be explicit. | Advisory precision. | P1·r1 | verified |

VERDICT: no major issues, ready to proceed
