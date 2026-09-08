**Resolution Check**

EG-1 is verified. The generic assignment pattern is removed, leaving only AWS AKIA, GitHub token, and PEM private-key header literal patterns. A scan of this repo’s current `apriori/review/` with those three patterns produced no hits.

EG-2 is verified. CK-10 scope is now declared as recursive under `apriori/review/`, regular files only, symlinks skipped with a warning, and absent directory skipped.

EG-3 is verified. The provenance header is now a literal one-line HTML comment with fixed field order, `unknown` sentinel, and ISO date.

**New Issues**

No new formal issues found.

**Advisories**

The prior retention wording advisory still applies: “review raws under archived changes” may be read as a different physical location than the repo’s global `apriori/review/` directory. Prefer “review raws for archived changes” when landing the runbook text. The remedy wording still says “rewrite history if already pushed”; consider pairing that with “rotate the secret” in SECURITY.md/RUNBOOK prose.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| EG-1 | Generic secret pattern lacks declared false-positive boundary rules and negative fixtures. | CK-10 may become noisy and block legitimate review transcripts. | STEP0·r1 | verified |
| EG-2 | CK-10 scan scope is ambiguous: raws-only vs all review files, direct vs recursive, regular files vs symlinks/dirs. | Implementations may miss intended files or scan unintended ones. | STEP0·r1 | verified |
| EG-3 | Provenance header convention lacks an exact literal format. | Producers may land incompatible headers, weakening provenance. | STEP0·r1 | verified |
| ADV-EG-1 | Advisory batch: retention wording should match global `apriori/review/` storage; secret-remediation wording should avoid implying history rewrite alone is sufficient; docs should preserve the “tripwire, not DLP” limit. | Documentation precision. | STEP0·r1 | advisory |

VERDICT: no major issues
