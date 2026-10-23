<!-- provenance: provider=anthropic model=claude-opus-5-5 session=unknown date=2026-10-23 -->
# code-review v2: release-tag-6-0-0

## Scope

`git diff 9be80e6...6733d87` on `feature/release-tag-6.0.0` (HEAD = 6733d87). The files are the new delta
`apriori/changes/release-tag-6-0-0/specs/cli/spec.md`, test ID-07 at the end of `test/identity.test.js`,
`docs/ci.md`, `docs/ci_cn.md`, the change's `flow-state.md`, and `review/code-review-v1.md` (round 1's own file).
I read them against round 1's RT-1/RT-2 and the store requirement "the 6 line's release identity is 6.0.0"
(`apriori/specs/cli/spec.md:94`). I changed nothing in the worktree except this file
(`git status --short` was empty before I wrote it). Scratch work ran in `/tmp/claude-0/rev-tag2/`
(a `git archive HEAD` copy).

## What I ran and what came back

1. **The delta replaces the store block verbatim apart from the intended edits.** The delta's
   `apriori-base: sha256:2c3beae9…` equals `sha256sum apriori/specs/cli/spec.md`. I diffed the store
   requirement block against the delta block. The ID-01 and ID-06 scenario titles, WHEN and THEN lines are
   byte-identical. The body is unchanged up to "…specs' prose and code comments.". After that it **loses**
   "Decided by the owner on 2026-10-23; nothing is published to npm and no release tag is cut by this
   requirement." and **gains** the install-line sentence ("Every install line a reader meets — README (both
   editions, the Quickstart block included), RUNBOOK §0 and docs/ci (both editions) — installs the published
   package (`npm i -g apriori-cli`, the CI page pinning the major as `apriori-cli@6`); no
   `github:Apriorhythm/apriori-spec-development` or `#v6-dev` install form remains …") plus the owner's
   release-acts sentence. The only other addition is scenario ID-07. This also settles round 1's A-7.
2. **Archive dry run.** `node bin/apriori.js archive --change release-tag-6-0-0` →
   `modified (MODIFIED): the 6 line's release identity is 6.0.0` / `RESULT: NOT READY — nothing written`,
   exit 1. The only reason given is `R4 the independent review has not resolved (code-review round 1, 2 open)`.
   To see the actual merge, I recorded a scratch owner line in the scratch copy and ran
   `archive --unreviewed --write` there → `RESULT: MERGED — 1 module store(s) rewritten`. The rewritten
   `cli/spec.md` differs from the original only in the body line (line 95) and the four added ID-07 lines.
   It still has 4 requirements, and its scenarios went from 23 to 24. Nothing was dropped.
3. **verify.** `node bin/apriori.js verify --change release-tag-6-0-0 --test-cmd "node scripts/run-tests.mjs --test-reporter=tap" --json`
   → exit 0, `"result": "GREEN"`, `boundGreen` = ID-01, ID-06, ID-07 (each pass 1 / fail 0 / skip 0), with
   `boundRed`, `unbound`, `orphan`, `unidentified` and `duplicates` all empty and 0 unattributed failures.
   `modifiedIntegrity`: retained ID-01 and ID-06, `titleChanged: []`, `dropped: []`, `added: [ID-07]`. Its one
   `missingLines` entry is the old body line, which is the intended replacement. The store-wide report
   lists 5 unbound IDs (IN-03, SR-69–72). They predate this change: `git diff 143ce0d HEAD -- apriori/specs`
   is empty.
4. **ID-07 enforces the scenario.** I mutated the scratch copy one change at a time and restored each file
   after its run (`node --test --test-name-pattern ID-07 test/identity.test.js`). The baseline is ✔. Each of
   these turned it ✖, with the expected assertion:
   - `#v6-dev` appended to docs/ci_cn.md (`branch pin`);
   - the repository form appended to docs/ci_cn.md (`repository install form`);
   - README:73 (Route B Quickstart) set to the repository form, and separately to `npm i -g apriori-cli@5` (`README Quickstart block`);
   - README:31 changed to `npx apriori-cli` (`README install line`);
   - README_cn:73 deleted, and README_cn:31 changed;
   - RUNBOOK §0 line 31 changed to a `github:` install (`RUNBOOK §0`);
   - docs/ci.md unpinned, and docs/ci_cn.md unpinned (`… pins the major`);
   - the forbidden strings added to guides/prototype-walk.md, templates/command.md, MIGRATING.md and docs/cli.md.

   Two mutations stayed ✔: the `npx apriori-cli@6` prefix changed back to `npx apriori-cli`, and an extra
   unpinned `- run: npm i -g apriori-cli` added to docs/ci.md. The scenario's THEN does not cover either case
   (see A-2). The non-`.md` files under docs/ are three GIFs, so "every file under docs/, guides/ and
   templates/" and the test's `.md` filter cover the same text. None of the three directories has subdirectories.
5. **Full suite.** `node scripts/run-tests.mjs` → `ℹ tests 905 · pass 905 · fail 0`, exit 0. That is 904 + ID-07.
6. **check --self.** `node bin/apriori.js check --self` → `! no baseline: 39 archived bundle(s) carry no manifest …` /
   `RESULT: PASS`, exit 0.
7. **gate.** `node bin/apriori.js gate --change release-tag-6-0-0` → `GATE: BLOCKED (1 item(s))`, exit 1. The checks:
   - C1 skipped (no test command);
   - C3, C5, C7 and C9 ✓ (C9 notes the contract-mutation risk);
   - C2, C4 and C6 informational;
   - `✗ C8 BLOCKED — code-review round 1 (revise, 2 open)`.

   With `--test-cmd "node scripts/run-tests.mjs --test-reporter=tap"`, C1 becomes `✓ C1 verify GREEN (in-flight,
   change-scoped)` and C8 is still the only block. **Blocked only on C8, as expected.**
8. **The CI page, end to end (both editions, read in full).** The order is: an install step
   `- run: npm i -g apriori-cli@6`, with the Node ≥ 22 note and the reason for pinning the major (matching
   `engines.node: ">=22"`); then `apriori check`, `apriori verify …` and `apriori gate … --json`, all through
   the package's only bin (`bin: {apriori}`); then the exit-code table. `npx apriori-cli@6 <cmd>` resolves to
   that same single bin. The EN and CN editions match sentence for sentence. One side effect is good: until
   6.0.0 is on npm, `@6` matches no version and fails loudly. It does not silently install 5.0.0, which the
   bare form would.
9. **Nothing else moved.** `git diff --name-only 9be80e6 6733d87` lists exactly the six files in scope.

## RT-1: ADDRESSED

The bundle now carries a MODIFIED delta that merges cleanly (runs 1–2). verify is GREEN with all three
scenarios bound (run 3), gate reaches every check and blocks only on C8 (run 7), and the archive dry run
fails only on R4. Round 1's A-3 (nothing pinned the npm form) is closed by ID-07 (run 4).

## RT-2: ADDRESSED

The new `decision: RT-2` line covers the failed or delayed publish case completely:
- `npm whoami --registry https://registry.npmjs.org` runs before anything, which removes the most likely failure up front.
- After the archive and the merge back to v6-dev, the tag, `release/v6` and `main` are created **locally only**.
- `npm publish --registry https://registry.npmjs.org` follows, which also covers round 1's A-2.
- v6-dev, `release/v6`, `main` and the tag are pushed to both remotes only after the publish succeeds and npmjs `latest` reads 6.0.0.
- On failure or delay nothing is pushed. The owner either retries later, or opens a new change that brings
  the five install lines and the CHANGELOG paragraph back to fact, deletes and re-cuts the local tag, and
  re-fast-forwards `release/v6` and `main` before pushing.

Nothing that makes a false claim becomes public in any of these branches. The tarball does not ship
CHANGELOG.md, and the README it ships only reaches anyone through a publish that succeeded. A-3 below
covers what the reverting change would also have to touch; the apriori gate would force that anyway.

## Advisories

- **A-1 (CHANGELOG subsection now misstates the change; fix before the tag is cut).** CHANGELOG.md:33-38, the
  "release-tag-6-0-0" subsection, still says "No code, template or test changes". Round 2 added ID-07 to
  `test/identity.test.js` and MODIFIED a cli spec requirement. It also says docs/ci installs with
  `npm i -g apriori-cli`, but the CI pages now pin `apriori-cli@6`. This commit is what gets tagged `v6.0.0`.
  Correcting it after the tag means a commit beyond the tag, or a re-tag. A one-line edit now is the cheap
  path, e.g. "…the CI page pins `apriori-cli@6`; one test (ID-07) and a MODIFIED cli requirement pin the
  install lines; no code or template changes." The flow-state line `decision: approach — 只改文档 … 不动代码、模板、测试、规格`
  is superseded by the later RT-1 decision line. As a log that is fine.
- **A-2 (ID-07 leaves two CI-page variants open).** ID-07 does not check the `npx apriori-cli@6` prefix, and it
  does not forbid a second, unpinned `npm i -g apriori-cli` in the CI pages. Both mutations passed (run 4).
  The scenario's THEN only requires the install step to carry `@6`, so the test matches the scenario. Extend
  both only if the pin is meant to be a contract.
- **A-3 (what a reverting change would also touch).** If the publish fails and the owner takes the
  "new change" branch of RT-2, that change must also MODIFY this requirement's body and ID-07. Otherwise
  ID-07 goes red against the restored repository form, because it forbids `github:Apriorhythm/…`. The change
  must also rewrite the CHANGELOG release-tag subsection (lines 33-38, "the repository form … is gone"), not
  only the "Release steps" paragraph. ID-06 pins the heading `6.0.0 — 2026-10-23`, so a publish retried
  on a later day keeps that date unless a change edits ID-06. Reading the date as the tag date is defensible.
- **A-4 (wording nit).** ID-07's THEN says "README's Quickstart block and §Install line", but the README has no
  Install section. Line 31 is the install sentence in Quickstart Route A, and line 73 is the Route B block. The
  test labels them `README install line` and `README Quickstart block`, which is clear enough.

VERDICT: no spec-vs-code gaps
