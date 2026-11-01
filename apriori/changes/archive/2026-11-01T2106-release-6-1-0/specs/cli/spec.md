<!-- apriori-base: sha256:6818031d5541d4aabfc3da3ed12303c310c84f28ffda7a2f91b6a9de7642e411 -->

# Delta — cli (release-6-1-0)

## RENAMED Requirements
- the 6 line's release identity is 6.0.0 -> the package's release identity is the current release

## MODIFIED Requirements

### Requirement: the package's release identity is the current release
The package SHALL identify itself as release `6.1.0` everywhere a reader meets a version: `package.json` and `apriori --version` say `6.1.0`; the packaged runbook's header says `runbook-version: 6.1` (CK-11 compares major.minor, and a project's copy follows through `apriori update`); the CHANGELOG's first second-level heading is the `6.1.0` release, the next is `6.0.0` and the one after it `5.0.0`; every entry written since 6.0.0 is a subsection of `6.1.0` (no `## Unreleased` heading above `5.0.0` and no `### Unreleased since` heading remains), and the `6.1.0` section states its evidence as it stands, including that the stored-value result is not a general guarantee of zero data loss; MIGRATING's opening names 6.0.0 as the first release of the 6 line and 6.1.0 as a minor release with nothing to migrate from 6.0.0, and no section is labelled `(Unreleased)`; and no runtime message names the retired working stage `6.2`.

#### Scenario: ID-01 in the packed directory, --version, the runbook header, the installed copy and update's target agree
- WHEN the package is packed with `npm pack` and, from the packed `bin`, `--version`, `init --tools claude --yes` in a fresh project, `update` there and `check --self` in the packed tree are run
- THEN `--version` prints `6.1.0`, the packed runbook header is `6.1` and byte-identical to the source runbook and to the project's installed copy, `update` reports the runbook up-to-date and `everything already matches apriori-cli 6.1.0`, and CK-11 raises nothing

#### Scenario: ID-06 6.1.0 is the release identity everywhere a reader meets it
- WHEN `package.json`, the `RUNBOOK.md` header, the `CHANGELOG.md` second-level and third-level headings, the `MIGRATING.md` opening and every `lib/` and `bin/` source with its comments stripped are read
- THEN the version is `6.1.0` and the header `6.1`; the CHANGELOG's `## ` headings run `6.1.0 — 2026-11-01`, `6.0.0 — 2026-10-23`, `5.0.0`, with no `## Unreleased` before `5.0.0` and no `### Unreleased since` anywhere; the `6.1.0` section carries the subsections `gates-note-command`, `runtime-evidence-not-reviewable`, `discriminating-examples`, `ground-writeback-trace`, `writeback-fate-default`, `source-conflict-entry-points`, `preserve-source-outcomes` and `release-6-1-0`, and says the stored-value result is not a general guarantee of zero data loss; MIGRATING says 6.0.0 is the first release of the 6 line and 6.1.0 is a minor release with nothing to migrate from 6.0.0, and carries no `(Unreleased)`; and no source string contains `6.2`, while `lib/gate.js` carries `retired in 6.0 — nothing is read` and `ledger retired in 6.0 — open items live in ## Open`

#### Scenario: ID-07 every install line a reader meets installs the published package
- WHEN README.md, README_cn.md, RUNBOOK.md, docs/ci.md, docs/ci_cn.md, MIGRATING.md, every file under docs/, guides/ and templates/ are read
- THEN README's Quickstart block and its install sentence, RUNBOOK §0 and both CI pages carry `npm i -g apriori-cli` (the CI pages as `apriori-cli@6`), and none of the files contains `github:Apriorhythm/apriori-spec-development` or `#v6-dev`

## Notes

The owner decided on 2026-11-01 to release the v6-dev line as 6.1.0 after the R1101 evaluation phase (Claude × Astra consensus: no further runbook-wording changes this phase; the release note states the evidence as it stands). 6.1.0 is a minor release: six of the seven changes since 6.0.0 change only runbook rules and `gates-note-command` adds a command and an additive `status --json` field, so the 3.0.0 stability promise holds without a major.
