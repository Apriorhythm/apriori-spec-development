<!-- provenance: provider=anthropic model=claude-opus-5-5 session=unknown date=2026-10-23 -->
# code-review v2: release-6-0-0

Independent review, round 2 (R2 heterogeneous: producer Claude Fable, reviewer Claude Opus 5.5).
Worktree `/root/terra/wt-rel`, branch `feature/release-6.0.0`, HEAD `23458eb`, `git status --short`
empty before and after this review apart from this file.

## Scope

Per the review-round-scope rule, this round covers what changed since round 1:
`git diff be61dcb...23458eb`, 7 files, +249/−5:

```
 CHANGELOG.md                                       |   4 +-
 README.md                                          |   2 +-
 README_cn.md                                       |   2 +-
 RUNBOOK.md                                         |   2 +-
 apriori/changes/release-6-0-0/flow-state.md        |   3 +
 .../changes/release-6-0-0/review/code-review-v1.md | 240 +++++++++++++++++++++
 test/mode.test.js                                  |   1 +
```

The producer's dispositions read are the last `observed:`/`decision:` pair of the flow-state
Reality Check and the 16:32 `gates:` note. Environment: node v24.13.0. Scratch work under
`/tmp/claude-0/rev-rel2/`.

## What I ran and observed

**Full suite.** `node scripts/run-tests.mjs` → `ℹ tests 904 · pass 904 · fail 0`, exit 0
(14.5 s). The run includes `✔ RIB-10 P3 模板逐字未动`.

**check --self.**
```
! no baseline: 39 archived bundle(s) carry no manifest — archived before manifests were written, or the manifest is gone

RESULT: PASS
exit=0
```
`lib/check.js` covers the three runbook guards named in the brief: CK-03 phrase table (line 86),
the `< /dev/null` guidance (line 139; `grep -c "< /dev/null" RUNBOOK.md` → 1), and CK-11's
header (line 3 of RUNBOOK is still `` > `runbook-version: 6.0` ``).

**gate (before this document landed).**
```
○ C1 skipped — no test command (...)
– C2 retired in 6.0 — nothing is read
✓ C3 legal (review)
– C4 ledger retired in 6.0 — open items live in ## Open
✓ C5 1 review doc(s), every verdict has raw evidence
– C6 cli: no truth doc; gate: no truth doc
✓ C7 every mutation delta is stamped
✗ C8 BLOCKED — code-review round 1 (revise, 1 open); review-round-limit 8 (default); the independent review has not resolved (code-review round 1, 1 open) — ...
✓ C9 no open items; risk: contract-mutation: gate/spec.md MODIFIED '...' (+2 more)

GATE: BLOCKED (1 item(s))
exit=1
```
Blocked only on C8, as expected.

**RUNBOOK diff and frozen P3.** `diff` of `git show be61dcb:RUNBOOK.md` against
`git show 23458eb:RUNBOOK.md` is exactly one line:
```
31c31
< npm i -g apriori-cli     # or run any command below via `npx apriori-cli …`
---
> npm i -g github:Apriorhythm/apriori-spec-development#v6-dev   # 6.0.0 is not on npm yet (npm still serves 5.0.0); once published: npm i -g apriori-cli
```
The worktree RUNBOOK is byte-identical to `23458eb`'s. `### P3` is at line 378 and `### P4` at
397. The RIB-10 slice hash (`/### P3 [\s\S]*?(?=### P4 )/`, sha256, first 16 hex) is
`97a85ca560d41c70` for both `be61dcb` and `23458eb`, equal to `FROZEN['RUNBOOK.md']` in
`test/source-intake.test.js:38`.

**Packed CLI into a fresh project.** `npm pack /root/terra/wt-rel` → `apriori-cli-6.0.0.tgz`. The
extracted `package/bin/apriori.js --version` → `6.0.0`. `cmp package/RUNBOOK.md RUNBOOK.md` →
identical. In a fresh `git init` directory, `init --tools claude --yes` → the installed
`apriori/runbook.md` is byte-identical to the source RUNBOOK. Its line 3 is
`` > `runbook-version: 6.0` · upstream: … `` and its line 31 is the new
`npm i -g github:Apriorhythm/apriori-spec-development#v6-dev   # 6.0.0 is not on npm yet …` line.
`update` → `everything already matches apriori-cli 6.0.0.` and `check` → `RESULT: PASS`.
`bin/apriori.js` is still mode 644 / index `100644` afterwards.

**The `github:` spec resolves.** `npm pack 'github:Apriorhythm/apriori-spec-development#v6-dev' --dry-run`
→ `name: apriori-cli`, `version: 6.2.0-rc.0`, `total files: 31`, exit 0. `git ls-remote origin
refs/heads/v6-dev` → `d1a447d8dab7…`, i.e. the remote branch is still the pre-change base. So the
spec resolves to this package, and it will serve 6.0.0 once this change is squashed, ff-merged
into v6-dev and pushed, which is the lineage decision in the Reality Check. The runbook only
reaches users through that same merge, so a 6.0.0 runbook never points at a branch still on
6.2.0-rc.0. The A-3 drift after later v6-dev commits still applies (see below).

**MD-12 really pins D7's fix (mutation test).** In a `git archive 23458eb` copy
(`/tmp/claude-0/rev-rel2/mut`) the D7 `fix` string in `lib/doctor.js:253` was changed from
`(mode: is optional and inert since 6.0)` to `… since 6.2)`:
- the new MD-12 → `✖ MD-12 …` with `AssertionError: the fix names the release, not a working stage
  (release-6-0-0)`, `actual: '… (mode: is optional and inert since 6.2)'`,
  `expected: /mode: is optional and inert since 6\.0\)/`;
- `be61dcb`'s MD-12 against the same mutant → `✔ MD-12` (pass 1). So the new line is what kills it;
- `test/identity.test.js` against the mutant → `✖ ID-06`, so the absence scan catches it as well.
  MD-12 now also catches a wrong release that is not `6.2` (e.g. `7.0`), which ID-06 would not.
The assertion reads `finding.fix` of the D7 finding the test already located, and the `\)`
anchor rules out `6.0x`. A-2 is closed.

**Nothing else moved.** The non-review hunks are exactly the ones listed in the 16:32 gates note:
RUNBOOK §0 one line, MD-12 one assertion, README/README_cn one cell each ("verified on the 6
line" / "6 线上已实测"), and CHANGELOG two phrases (the added "RUNBOOK §0 installs from the
repository until 6.0.0 is on npm." and "The tests (13 cases in 8 files)", which matches the count
I gave in A-6). The flow-state gains the round-1 observation, the dispositions and the gates
note. `code-review-v1.md` is the round-1 document. It has the same provenance header, the same
findings and `VERDICT: 1 issue open`, and I saw no producer edits in it. No `lib/`, `bin/`,
`templates/`, spec-delta or other test file changed.

**Remaining install instructions.** `grep -rnE "npx apriori-cli|npm (i|install) -g apriori-cli"`
over the repo's `*.md` (excluding archives): the only live hits are RUNBOOK:31 (the "once
published" note), CHANGELOG:23 (the explicit "does not install this version yet"), CHANGELOG:1234
(4.0.x history), docs/ci*.md:5 (the "runs 5.0.0 today" warning), and frozen `validation/*` lab
snapshots. README/README_cn/docs/ci all use the same `github:` line as RUNBOOK §0. RUNBOOK:431's
`$(npm root -g)/apriori-cli/docs/operator.md` stays correct under a `github:` install, because the
package name is still `apriori-cli`.

**gate (with this document in place).** Without `--test-cmd`: C5 `2 review doc(s), every verdict
has raw evidence`, `✓ C8 code-review round 2 (accept); review-round-limit 8 (default)`, then
`GATE: INCOMPLETE — C1 did not run; PASS was not reached` (exit 3), only because C1 has no test
command. With `--test-cmd "node scripts/run-tests.mjs --test-reporter=tap"`:
`✓ C1 verify GREEN (in-flight, change-scoped); store: 0 red, 5 unbound, 298 orphan, 0 unidentified, 0 unattributed, 0 duplicate(s) outstanding`
and `GATE: PASS — mechanical checks only; human gates remain human`.

## RL-1

RL-1: ADDRESSED — RUNBOOK §0 now installs from the repository and says that npm still serves
5.0.0. The `npx apriori-cli …` alternative, which would also have run 5.0.0, is gone. The spec
resolves to `apriori-cli`. The line is carried byte-for-byte into the packed tarball and into a
project initialised by it. check --self passes and P3's frozen hash is unchanged.

## Dispositions of the advisories not acted on

- **A-1 (ID-06 strip robustness), not changed:** reasonable. Round 1's audit showed today's PASS
  is correct, and the four blind shapes are absent from `lib/`/`bin/`. With A-2 done, D7's text
  no longer relies on the scan alone.
- **A-3 (`#v6-dev` is a moving target), not changed until a tag exists:** reasonable. The owner
  forbade a tag in this delivery (lineage decision), so a branch is the only thing to point at, and
  RUNBOOK §0 now has the same exposure as README/docs/ci. The plan to switch all four to
  `#v6.0.0` when the tag is cut is sound. See A-7 about where that plan is recorded.
- **A-5 (golden-path `--packed` with no argument), out of scope:** reasonable. It existed before
  this change and the release does not depend on it.

## Issues

None new. No new substantive (correctness, security or stated-requirement) finding.

## Advisories

- **A-7 (follow-ups claimed but not registered).** The decision line says A-3 and A-5 are
  「登记为后续」 (registered as follow-ups), but `## Open` is empty. RUNBOOK §4 (line 318) defines
  a registered follow-up as `- <ID>: follow-up → <new-change-name> — <text>` in `## Open`. As
  advisories they need no registration, so nothing blocks. But once this bundle is archived, the
  "switch `#v6-dev` to `#v6.0.0` in README/README_cn/docs/ci/docs/ci_cn/RUNBOOK §0 when the tag is
  cut" step survives only as prose in a frozen decision line. Either add the two
  `follow-up →` lines or reword the decision so it does not claim a registration.
- **A-8 (stale `## Next`).** `## Next` still reads "Opus 子 agent 评审（round 1）→ …". Update it to
  the post-round-2 resume point before archive.
- **A-9 (cosmetic).** The CHANGELOG sentence added to the release entry makes that line about 150
  columns wide, against the file's ~100-column wrap. Doc, non-critical.
- **Correction to round 1's process note.** C5 also accepts a verdict document with self-contained
  provenance (`lib/gate.js:49`, "without a raw archive or self-contained provenance"). Gate shows
  `✓ C5 … every verdict has raw evidence` with only `code-review-v1.md` present, so no separate
  `-raw.*` file is required for these documents.

VERDICT: no spec-vs-code gaps
