<!-- apriori-base: sha256:cc84cc799ace8cfc63ac3a952ec02cdc2c14fcdc1e6527eccf82023335472ade -->

# Delta — cli (release-6-0-0)

## ADDED Requirements

### Requirement: the 6 line's release identity is 6.0.0
The package SHALL identify itself as release `6.0.0` everywhere a reader meets a version: `package.json` and `apriori --version` say `6.0.0`; the packaged runbook's header says `runbook-version: 6.0` (CK-11 compares major.minor, and a project's copy follows through `apriori update`); the CHANGELOG's first second-level heading is the `6.0.0` release and every entry of the line down to `5.0.0` is a subsection of it (no `## Unreleased` heading remains above `5.0.0`); MIGRATING's opening names 6.0.0 as the first release of the 6 line and no section is labelled `(Unreleased)`; and no runtime message in `lib/` or `bin/` names the retired working stage `6.2` — the gate `C2`/`C4` placeholder details, doctor D7's fix, and readiness's legacy notes say `6.0`. The working-stage names (`6.0 slice N`, `6.2`) remain only in history text: CHANGELOG subsections, MIGRATING sections, specs' prose and code comments. Decided by the owner on 2026-10-23; nothing is published to npm and no release tag is cut by this requirement.

#### Scenario: ID-01 in the packed directory, --version, the runbook header, the installed copy and update's target agree
- WHEN the package is packed with `npm pack` and, from the packed `bin`, `--version`, `init --tools claude --yes` in a fresh project, `update` there and `check --self` in the packed tree are run
- THEN `--version` prints `6.0.0`, the packed runbook header is `6.0` and byte-identical to the source runbook and to the project's installed copy, `update` reports the runbook up-to-date and `everything already matches apriori-cli 6.0.0`, and CK-11 raises nothing

#### Scenario: ID-06 6.0.0 is the release identity everywhere a reader meets it
- WHEN `package.json`, the `RUNBOOK.md` header, the `CHANGELOG.md` second-level headings, the `MIGRATING.md` opening and every `lib/` and `bin/` source with its comments stripped are read
- THEN the version is `6.0.0` and the header `6.0`; the CHANGELOG's first `## ` heading is `6.0.0 — 2026-10-23` and the next one is `5.0.0`, with no `## Unreleased` between them; MIGRATING says 6.0.0 is the first release of the 6 line and carries no `(Unreleased)`; and no source string contains `6.2`, while `lib/gate.js` carries `retired in 6.0 — nothing is read` and `ledger retired in 6.0 — open items live in ## Open`

## Notes

The owner declared the current v6-dev code the formal 6.0.0 on 2026-10-23: npm never shipped a 6.x, the names 6.0 slice / 6.1 / 6.2 were development stages that were never released, so the first release of the line is 6.0.0, not 6.2.0. ID-01 existed (identity.test.js) and is bound here; ID-06 is new. Publishing to npm, the `v6.0.0` tag and fast-forwarding `release/v6` are separate owner decisions and not part of this change.
