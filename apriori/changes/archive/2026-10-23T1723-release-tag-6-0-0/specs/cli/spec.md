<!-- apriori-base: sha256:2c3beae98e32225f0627436f8dc3b269684dbfe5a692008979140fa887acb042 -->

# Delta — cli (release-tag-6-0-0)

## MODIFIED Requirements

### Requirement: the 6 line's release identity is 6.0.0
The package SHALL identify itself as release `6.0.0` everywhere a reader meets a version: `package.json` and `apriori --version` say `6.0.0`; the packaged runbook's header says `runbook-version: 6.0` (CK-11 compares major.minor, and a project's copy follows through `apriori update`); the CHANGELOG's first second-level heading is the `6.0.0` release and every entry of the line down to `5.0.0` is a subsection of it (no `## Unreleased` heading remains above `5.0.0`); MIGRATING's opening names 6.0.0 as the first release of the 6 line and no section is labelled `(Unreleased)`; and no runtime message in `lib/` or `bin/` names the retired working stage `6.2` — the gate `C2`/`C4` placeholder details, doctor D7's fix, and readiness's legacy notes say `6.0`. The working-stage names (`6.0 slice N`, `6.2`) remain only in history text: CHANGELOG subsections, MIGRATING sections, specs' prose and code comments. Every install line a reader meets — README (both editions, the Quickstart block included), RUNBOOK §0 and docs/ci (both editions) — installs the published package (`npm i -g apriori-cli`, the CI page pinning the major as `apriori-cli@6`); no `github:Apriorhythm/apriori-spec-development` or `#v6-dev` install form remains in those files, in MIGRATING, guides or templates. Decided by the owner on 2026-10-23: 6.0.0 is tagged `v6.0.0`, `release/v6` and `main` are fast-forwarded to it and the package is published to npm; those steps are the owner's release acts, run after this change archives.

#### Scenario: ID-01 in the packed directory, --version, the runbook header, the installed copy and update's target agree
- WHEN the package is packed with `npm pack` and, from the packed `bin`, `--version`, `init --tools claude --yes` in a fresh project, `update` there and `check --self` in the packed tree are run
- THEN `--version` prints `6.0.0`, the packed runbook header is `6.0` and byte-identical to the source runbook and to the project's installed copy, `update` reports the runbook up-to-date and `everything already matches apriori-cli 6.0.0`, and CK-11 raises nothing

#### Scenario: ID-06 6.0.0 is the release identity everywhere a reader meets it
- WHEN `package.json`, the `RUNBOOK.md` header, the `CHANGELOG.md` second-level headings, the `MIGRATING.md` opening and every `lib/` and `bin/` source with its comments stripped are read
- THEN the version is `6.0.0` and the header `6.0`; the CHANGELOG's first `## ` heading is `6.0.0 — 2026-10-23` and the next one is `5.0.0`, with no `## Unreleased` between them; MIGRATING says 6.0.0 is the first release of the 6 line and carries no `(Unreleased)`; and no source string contains `6.2`, while `lib/gate.js` carries `retired in 6.0 — nothing is read` and `ledger retired in 6.0 — open items live in ## Open`

#### Scenario: ID-07 every install line a reader meets installs the published package
- WHEN README.md, README_cn.md, RUNBOOK.md, docs/ci.md, docs/ci_cn.md, MIGRATING.md, every file under docs/, guides/ and templates/ are read
- THEN README's Quickstart block and its install sentence, RUNBOOK §0 and both CI pages carry `npm i -g apriori-cli` (the CI pages as `apriori-cli@6`), and none of the files contains `github:Apriorhythm/apriori-spec-development` or `#v6-dev`

## Notes

Follow-up FU-A3 of release-6-0-0 closes here: the repository install form that bridged the gap before the npm publish is gone, replaced by the published package rather than re-pointed at the tag, because the owner decided on 2026-10-23 to tag, promote and publish in one go. ID-01 and ID-06 are unchanged; ID-07 is new (identity.test.js). No code, template or runtime behavior changes.
