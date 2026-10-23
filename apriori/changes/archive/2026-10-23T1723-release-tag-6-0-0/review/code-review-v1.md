<!-- provenance: provider=anthropic model=claude-opus-5-5 session=unknown date=2026-10-23 -->
# code-review v1: release-tag-6-0-0

## Scope

`git diff v6-dev...HEAD` on `feature/release-tag-6.0.0` @ 9be80e6 (one commit on v6-dev @ 143ce0d):
README.md, README_cn.md, RUNBOOK.md §0, docs/ci.md, docs/ci_cn.md, CHANGELOG.md, and
`apriori/changes/release-tag-6-0-0/flow-state.md`. Read against the flow-state (owner cuts `v6.0.0`,
fast-forwards `release/v6` and `main`, publishes `apriori-cli@6.0.0`, pushes only after all of that
succeeds) and FU-A3 in `apriori/changes/archive/2026-10-23T1638-release-6-0-0/flow-state.md`.
Nothing in the worktree was changed apart from this file. Scratch work ran in `/tmp/claude-0/rev-tag/`
(a `git archive HEAD` copy and a packed tarball).

## What I ran and what came back

1. **Leftover wording.** `grep -rn -iE '#v6-dev|not on npm|还没发到 npm|still serves 5\.0\.0|github:Apriorhythm|npm 上仍是|未发 npm|仍是 5\.0\.0'`
   over the tree, excluding `apriori/changes/archive/`. The only hits outside the change's own flow-state are:
   - CHANGELOG.md:36-37, the new release-tag-6-0-0 subsection, which says the repository form is gone (correct);
   - CHANGELOG.md:52, 58, 75, in the release-6-0-0 history subsection, which records what that change did (allowed);
   - scripts/golden-path.mjs:93-94 and test/golden-path.test.js:18: the seam regex still accepts both forms
     (a code comment that no reader sees; see A-3).
   A second grep over README*, RUNBOOK, MIGRATING, VISION*, SECURITY, docs/*.md, guides/, templates/ for
   `from the repository|从仓库|unreleased|未发布|v6-dev|until 6.0.0|publish|npm (i|install)|github:` found
   only `npm i -g apriori-cli` (README×2 lines 31/73, RUNBOOK:31, docs/ci(_cn):5/8), MIGRATING:3
   ("npm never shipped a 6.x before it", which stays true) and unrelated uses of "published requirement".
   **Check (1) holds.**
2. **EN/CN parity.** README:31 / README_cn:31 ("Install once (`npm i -g apriori-cli`), then …" /
   "先装一次(`npm i -g apriori-cli`),然后 …"), README:73 / README_cn:73 (same bare line), docs/ci:5-9 /
   docs/ci_cn:5-9 ("Install it in a step before the ones below …, or prefix each command with
   `npx apriori-cli`" / "先在下面这些步骤之前装一次…,或者给每条命令加 `npx apriori-cli` 前缀", same YAML).
   RUNBOOK has no CN edition. **Check (2) holds.**
3. **docs/ci end to end.** I read both files in full: an install step `- run: npm i -g apriori-cli`, then
   `apriori check`, `apriori verify --specs … --test-cmd …` and `apriori gate --change … --json`, all calling
   the `apriori` bin, which is the package's only `bin` entry (package.json `"bin": {"apriori": …}`). The
   `npx apriori-cli <cmd>` alternative resolves because npm exec runs a package's only bin entry. The old
   text explained why `npx apriori-cli` ran 5.0.0. Once 6.0.0 is `latest` that explanation is moot, so
   removing it is right. **Check (3) holds** (two advisories, A-4 and A-5).
4. **Tests.** `node scripts/run-tests.mjs` → `ℹ tests 904 · pass 904 · fail 0`, exit 0. Among them:
   `✔ GP-01`, `✔ GP-04`, `✔ GP-05`, `✔ CK-11` (both cases), `✔ ID-01`, `✔ ID-06`, `✔ RIB-10 P3 模板逐字未动`.
   I also ran the real Quickstart walk against the packed tarball, in the scratch copy with
   `TMPDIR=/tmp/claude-0/rev-tag node scripts/golden-path.mjs --packed …/apriori-cli-6.0.0.tgz` →
   `golden-path: OK (packed) — 4 blocks, exits [0, 1, 0, 0], final state green`. **Check (4) holds.**
5. **check --self.** `node bin/apriori.js check --self` → `! no baseline: 39 archived bundle(s) carry no
   manifest …` / `RESULT: PASS`, exit 0. RUNBOOK.md:3 is `> \`runbook-version: 6.0\``. `check --self`
   prints nothing per CK-11 when it passes, so I showed that CK-11 reads this header in the scratch copy:
   changing it to `6.1` gives `✗ CK-11 RUNBOOK.md: runbook-version 6.1 != package 6.0 (major.minor must
   match)` / `RESULT: FAIL (1)`. With the header restored it gives `RESULT: PASS`. **Check (5) holds.**
6. **Frozen P3 prompt.** RIB-10 passes. `git diff v6-dev...HEAD --stat -- templates lib bin test scripts
   apriori/specs` is empty. **Check (6) holds.**
7. **gate / archive.** **Fails, see RT-1.**
   - `node bin/apriori.js gate --change release-tag-6-0-0` →
     `gate: verify: no delta spec files (*.md) found under …/release-tag-6-0-0/specs`, **exit 2**.
     `--json` gives `"result": "ERROR", "checks": [], "blocked": 0`. It is not BLOCKED on C8: no check runs at all.
     It is the same with `--test-cmd "node scripts/run-tests.mjs --test-reporter=tap"` and with `--review-ready`.
   - `node bin/apriori.js archive --change release-tag-6-0-0` (dry run) →
     `archive: no delta spec files (*.md) found under …/specs`, **exit 2**. In the scratch copy
     `--unreviewed` and `--force` (dry run) give the same exit 2. The refusal is
     `lib/archive-merge.js:391`, before any option is consulted.
8. **CHANGELOG "Release steps".** Read against the flow-state ordering. Judgement below (RT-2, A-1).
9. **Pack.** `npm pack --dry-run` → `apriori-cli@6.0.0`, `total files: 31`. The files are LICENSE,
   MIGRATING.md, README.md, RUNBOOK.md, bin/apriori.js, docs/operator.md, guides/prototype-walk.md, 20 lib/*.js,
   package.json and 3 templates. A real `npm pack --pack-destination /tmp/claude-0/rev-tag/pack` from the
   scratch copy, extracted, has `package/README.md:31 Install once (\`npm i -g apriori-cli\`) …` and
   `:73 npm i -g apriori-cli`. It is byte-identical (`cmp`) to the worktree README.md, and RUNBOOK.md is too.
   The registry check was read-only: `npm view apriori-cli --registry https://registry.npmjs.org` gives
   `latest: '5.0.0'`, and `apriori-cli@6.0.0` gives E404, which is expected before the publish. `release/v6`,
   `main`, `origin/main` and `origin/release/v6` are all ancestors of HEAD (`git merge-base
   --is-ancestor`), so the fast-forwards are possible. `main` describes as `v5.0.0`. **Check (9) holds.**

## Issues

### RT-1: a docs-only bundle cannot pass gate or archive, so the planned `gate → archive --write` stops at exit 2

- **Where:** `apriori/changes/release-tag-6-0-0/specs/` is empty. The refusal comes from
  lib/archive-merge.js:391, which gate's verify also uses. The plan is in flow-state.md:9 ("不动代码、模板、测试、规格")
  and flow-state.md:15 ("→ gate → archive --write").
- **What:** with no `*.md` delta, `gate` returns `ERROR` / exit 2 with `checks: []`, never reaching C1–C9.
  `archive` refuses the same way, whether dry run, `--force` or `--unreviewed`. The tool has no docs-only path.
  MIGRATING.md:112 and RUNBOOK.md:311 say the docs-only exception was removed. Every archived bundle since
  2026-07-11 carries at least one delta; the only two without one are `2026-07-11T0303-release-docs` and
  `…T0308-python-example`. So the change cannot reach C8 or the archive as planned, and the brief's
  expectation "BLOCKED only on C8" does not hold today.
- **How shown:** see run 7 above. These are the actual outputs in the worktree, and in a scratch copy for the option variants.
- **Fix (suggested):** add a small MODIFIED delta that turns what this change asserts into something a
  test checks, then bind it. The natural place is `apriori/specs/cli/spec.md` "the 6 line's release identity is 6.0.0"
  (line 95). Today it ends "nothing is published to npm and no release tag is cut by this requirement".
  After this change it would state that the install lines a reader meets (README×2 Quickstart and
  first install, RUNBOOK §0, docs/ci×2) are `npm i -g apriori-cli` and that no `#v6-dev` / `github:` install
  form remains. Add a scenario (or extend ID-06) that reads those five files. This also closes the gap
  in A-3: nothing pins the README to the npm form, because GP-01's regex accepts both forms. If the owner
  prefers not to add a delta, the flow-state has to say so and name the closeout that replaces
  gate/archive. None exists in the CLI.

### RT-2: the failure fallback recorded in the flow-state covers only the CHANGELOG paragraph, not the tag, the branches or the five install lines

- **Where:** flow-state.md:6 says "任一步失败则先改文档再推", and flow-state.md:10 says "npm 发布若因未登录/OTP
  受阻，CHANGELOG「Release steps」段须在推送前改回事实". The text is in CHANGELOG.md:22-25 and :33-38,
  README.md:31,73, README_cn.md:31,73, RUNBOOK.md:31, docs/ci.md:5-8 and docs/ci_cn.md:5-8.
- **What:** the owner's order is tag → `release/v6` → `main` → `npm publish`. npm is last, so if it fails,
  `v6.0.0`, `release/v6` and `main` already point (locally) at the commit that says the package is
  published. If npm publish were delayed, these statements would be false:
  - CHANGELOG:23-24, "the package is published to npm as `apriori-cli@6.0.0`, so `npm i -g apriori-cli`
    installs this version";
  - CHANGELOG:22, the date "(2026-10-23)", if the publish slips to another day;
  - CHANGELOG:36-37, "the repository form … that bridged the gap before the publish is gone";
  - all five install lines. Until the publish they install 5.0.0. The release-6-0-0 review (RL-1)
    showed that 5.0.0 misreads a 6.0 project and `update` exits 1. This is worse than a wrong CHANGELOG sentence.
  The rule "nothing is pushed until every step succeeds" keeps all of this local, which is why the
  pre-written past-tense paragraph is **acceptable as written** (see A-1). But the recorded fallback only
  repairs the CHANGELOG paragraph and says nothing about re-cutting a tag that already sits on the
  claiming commit.
- **How shown:** I read the ordering in flow-state.md:6 against the claims listed above. `npm config get registry` →
  `https://registry.npmmirror.com`, and the flow-state itself notes that npmjs has no login on this machine.
  The publish step is the one most likely to fail.
- **Fix (suggested):** make the flow-state fallback one complete line. If `npm publish` does not succeed,
  either push nothing and retry later, or (if the owner wants the tag/branches public without npm)
  restore the repository install form in all five places, rewrite the CHANGELOG paragraph and subsection
  as fact, then delete the local `v6.0.0` tag, re-cut it on the corrected commit and re-fast-forward
  `release/v6`/`main` before any push. Running `npm whoami --registry https://registry.npmjs.org` before
  the tag is cut takes the most likely failure out of the sequence.

## Advisories

- **A-1 (Release steps wording, acceptable).** Writing the record in the past tense before the steps run is
  acceptable here, for three reasons. The commit is the content that gets tagged and published, and a
  paragraph written afterwards would have to be a second commit after the tag. Nothing is pushed until the
  steps succeed. And the tarball does not ship CHANGELOG.md (`files` excludes it), so a failed publish
  cannot spread the sentence through npm. The wording matches the owner's order
  ("打 tag … release/v6 … main … 发布 npm"). "No GitHub release page is written" is a decision this record
  adds; the owner's quoted instruction neither asks for a release page nor forbids one, so that is fine,
  but say it is the owner's decision if it was one.
- **A-2 (publish registry).** This machine's npm registry is npmmirror. A bare `npm publish` sends the
  package there, not to npmjs. `package.json` has no `publishConfig`. Use
  `npm publish --registry https://registry.npmjs.org` (and log in against the same registry), or add
  `"publishConfig": {"registry": "https://registry.npmjs.org"}` in a later change. After the publish, run
  `npm view apriori-cli dist-tags --registry https://registry.npmjs.org` and check that `latest` is `6.0.0`.
  The plain publish sets `latest`, which is what the install lines assume.
- **A-3 (seam no longer pins the npm form).** scripts/golden-path.mjs:93-94 (comment "while a release is not
  on npm") and test/golden-path.test.js:18 still accept the `github:` form. That does no harm, but nothing
  would catch the repository form coming back. RT-1's delta is the place to pin it. The comment can be
  updated whenever the file is next touched.
- **A-4 (CI install is unpinned).** `npm i -g apriori-cli` in docs/ci tracks `latest`, so a future 7.0.0 would
  reach CI pipelines without anyone choosing it. The removed `#v6-dev` form at least tracked the 6 line.
  Consider `npm i -g apriori-cli@6` (and `npx apriori-cli@6`) in the CI page, in both editions, now or at
  the next docs pass. The docs are non-critical, so this is advisory only.
- **A-5 (Node version in CI).** `engines.node` is `>=22`. Many CI images default to an older Node, and
  `npm i -g` only warns (EBADENGINE). One line in docs/ci saying a Node 22 setup step is needed would
  prevent a confusing first failure. This predates the change.
- **A-6 (history subsection reads stale on a top-down read).** CHANGELOG.md:52/58/75 (release-6-0-0) still
  say "installs from the repository until 6.0.0 is on npm" and "says npm still serves 5.0.0". That is allowed
  as history, and the new subsection directly above says it is superseded. No change needed.
- **A-7 (living spec sentence).** apriori/specs/cli/spec.md:95 ends "nothing is published to npm and no
  release tag is cut by this requirement". It is literally still true, but after the release it reads as
  a statement about the world. If RT-1 is fixed with a delta on this requirement, rephrase it there.

VERDICT: 2 issues open
