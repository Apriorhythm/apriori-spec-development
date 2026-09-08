**Dimension Verdicts**

1. Target state B clear and unambiguous: issues open.
2. Edge cases and exception paths covered: issues open, mainly false-positive boundary coverage.
3. Implied but undeclared side effects: no major issue; CK-10 is read-only and the docs-only clauses are declared.
4. Acceptance criteria testable as if/then: issues open; E1 does not fully test the stated precision promise.
5. Conflicts with current state A: no major conflict found. CK-10 in consumer mode fits `check`’s existing shape if the absent-review-dir skip is explicit.
6. Target lineage declared and matches repo reality: no major issue; v3 branch / next 3.3.0 is consistent.

**Formal Issues**

**EG-1 — Generic secret pattern lacks false-positive boundary rules**

Description: The requirement says precision over recall and “near-zero false-positive rates,” but the generic assignment pattern is broad: `(api[_-]?key|secret|token)\s*[:=]\s*['"][A-Za-z0-9/+_-]{16,}`. It can match plausible benign review content such as code/config examples, dummy placeholders, or discussion snippets. E1 only requires “does not fire on this repo’s real `apriori/review/`,” which is a useful corpus check but not enough to define the intended boundary.

Risk: CK-10 can become noisy, blocking legitimate reviews and training users to ignore the tripwire.

Suggested fix: Add explicit negative fixtures for the false-positive classes the implementation must not flag: CAS `sha256:<64hex>`, commit hashes, “tokens used,” dummy/example values, and code/config examples. Either narrow or drop the generic assignment pattern, or explicitly state that such dummy assignments are intended findings.

**EG-2 — CK-10 scan scope is ambiguous**

Description: Background frames the problem as raw transcripts at `apriori/review/*-raw.*`, but target B says scan `apriori/review/*`. It is unclear whether CK-10 must scan only raw transcripts, all direct files including ledgers/review docs, recursive descendants, symlinks, directories, or only regular files. The absent-dir skip is proposed, but file-type and traversal behavior are not declared.

Risk: Implementations can diverge materially: one may miss secrets in non-raw review artifacts, another may scan too broadly and false-positive or read unintended symlink targets.

Suggested fix: Define the exact surface, e.g. “direct regular files under `apriori/review/`, including raws, review docs, and ledgers; skip directories and symlinks; absent `apriori/review/` is pass.” If raws only are intended, say that instead and update E1.

**EG-3 — Provenance header convention lacks an exact format**

Description: The requirement asks for a 4-line comment header with `provider / model / session-id / date`, but does not specify the literal lines, comment syntax, date format, ordering, or how unknown fields are represented. Since no checker enforces it, the runbook wording is the only contract producers will follow.

Risk: Producers land incompatible “headers” that are hard to grep or compare later, defeating the provenance goal.

Suggested fix: Specify the exact header template, for example four lines beginning with a stable prefix and ISO date format, plus “omit the header or use `unknown` when facts are not known.”

**Advisories**

- The retention clause says “review raws under archived changes,” but raws currently live in the global `apriori/review/` directory, not under each archived change directory. Reword to “raws for archived changes” or “raws under `apriori/review/` that correspond to archived changes.”
- E2’s “rewrite history if already pushed” remedy is operationally sensitive. Consider wording it as “rotate the secret immediately; coordinate history rewrite according to the repository’s policy” to avoid implying history rewrite alone remediates exposure.
- SECURITY.md already warns that raws may contain whatever reviewers saw. The new SECURITY/RUNBOOK wording should avoid making CK-10 sound like complete secret prevention; the requirement’s “tripwire, not DLP” limit should be carried into docs.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| EG-1 | Generic secret pattern lacks declared false-positive boundary rules and negative fixtures. | CK-10 may become noisy and block legitimate review transcripts. | STEP0·r1 | open |
| EG-2 | CK-10 scan scope is ambiguous: raws-only vs all review files, direct vs recursive, regular files vs symlinks/dirs. | Implementations may miss intended files or scan unintended ones. | STEP0·r1 | open |
| EG-3 | Provenance header convention lacks an exact literal format. | Producers may land incompatible headers, weakening provenance. | STEP0·r1 | open |
| ADV-EG-1 | Advisory batch: retention wording should match global `apriori/review/` storage; secret-remediation wording should avoid implying history rewrite alone is sufficient; docs should preserve the “tripwire, not DLP” limit. | Documentation precision. | STEP0·r1 | advisory |

VERDICT: 3 issues open
