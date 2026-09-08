# P5 design review — update-manifest (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/update-manifest-review-v1-raw.txt

**Coverage Map**

- F1: covered by UP-06.
- F2: covered by UP-07.
- F3: covered by UP-08.
- F4: covered by UP-09.
- F5: covered by IN-13 and IN-14.
- F6: covered by UP-08 and UP-09.
- F7: covered by the update requirement prose and UP-06/UP-08/UP-09 skip cases.
- F8: covered by UP-10 and IN-17.
- F9: covered by IN-15.
- F10: covered by IN-16.
- F11: covered by UP-11.
- F12: covered by tasks T4.

Scenario ranges are clean: existing update scenarios end at UP-05 and new ones are UP-06..11; existing init scenarios end at IN-12 and new ones are IN-13..17. CAS stamps match the current store files. Tasks reference the correct ranges.

**Issues**

**UMSPEC-1 — Containment is only specified before writes, not before managed reads/hashes**

Description: The requirement says symlink escape targets are hygiene errors, and update must refresh only safe in-project targets. The design says realpath containment is checked “on write,” but managed semantics require reading/hashing existing manifest-listed files before deciding whether to write, skip as modified, or report up-to-date. A manifest-listed path can be syntactically allowed, e.g. `.claude/commands/apriori.md`, while the actual file is a symlink escaping the project.

Risk: `update` may read/hash outside-project content before the containment guard runs, and may classify it as modified/up-to-date instead of hygiene-invalid. That weakens the security boundary and violates the fail-closed manifest hygiene rule.

Suggestion: Specify containment before any read or write of a manifest-listed target or candidate refresh target. For existing files, follow symlinks and require the resolved file to be inside the project root before hashing. For not-yet-existing files created by init/update, validate the nearest existing parent with the existing `containsReal` behavior before writing.

**Advisories**

- The design says “manifest written once at the end iff any adoption/refresh happened.” In the pre-manifest path, runbook adoption should count as adoption even when the runbook is already byte-identical and reports `up-to-date`, so the first update still writes `managed.json`.
- `writeManifest` should ensure `apriori/` exists before writing, although current init/update preconditions normally make that true.
- The T1 audit instruction for existing UP/IN tests is sufficient; keep it explicit because UP-01’s old “existing command files refresh” fixture will now need a manifest or a pre-manifest known-generation setup.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| UMSPEC-1 | Design only requires realpath containment before writes, not before reads/hashes of manifest-listed or candidate targets. | Symlinked allowed paths can cause update to read/hash outside-project content and avoid the required hygiene error. | STEP2·r1 | open |
| UMSPEC-ADV-1 | Pre-manifest runbook adoption must count as a manifest-write trigger even when byte-identical; minor writeManifest/test-audit notes. | Advisory implementation precision. | STEP2·r1 | open |

VERDICT: 1 issues open
