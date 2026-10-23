<!-- provenance: provider=anthropic model=claude-opus-5-5 session=unknown date=2026-10-23 -->
# code-review v1: release-6-0-0

Independent review, round 1 (R2 heterogeneous: producer Claude Fable, reviewer Claude Opus 5.5).
Worktree `/root/terra/wt-rel`, branch `feature/release-6.0.0`.

## What was reviewed

- Range `v6-dev...HEAD` = `d1a447d8dab7` .. `be61dcba40c8` (one commit, 37 files, +602/−322).
- Read in order: `flow-state.md` (Reality Check), `specs/cli/spec.md` (ADDED, ID-01/ID-06),
  `specs/gate/spec.md` (RENAMED + 3 MODIFIED) against the store `apriori/specs/gate/spec.md`,
  then the full diff: `lib/{gate,readiness,doctor}.js`, `package.json`, `scripts/golden-path.mjs`,
  all touched tests, `test/fixtures/lineage-baseline-golden.json`, `RUNBOOK.md`, `CHANGELOG.md`,
  `MIGRATING.md`, README/README_cn, VISION/VISION_cn, docs/*.
- Environment: node v24.13.0, npm 11.9.0. Scratch work under `/tmp/claude-0/rev-rel/`.
  The worktree was left as found (`git status --short` empty at the end; see Advisory A-5 for
  one file-mode change I caused and reverted).

## What I ran and observed

**Delta base stamps.** `sha256sum apriori/specs/gate/spec.md apriori/specs/cli/spec.md` →
`d7768d0d…f434` and `cc84cc79…2ade`, equal to the two deltas' `apriori-base` stamps.

**MODIFIED blocks vs store (script `/tmp/claude-0/rev-rel/ext.py`).** For each delta block I took
the store block (under the old title for the renamed one), replaced `6.2`→`6.0`, and compared:

```
gate aggregates the mechanical exit conditions for one change identical-after-sub: True count6.2 in old: 3
C9 is the one substantive state predicate, and it reads the open items identical-after-sub: True count6.2 in old: 1
C2 and C4 are placeholders since 6.0 identical-after-sub: True count6.2 in old: 3
```

So only the `6.2` strings and the title changed. Confirmed again by simulating the merge in a
scratch copy (`archive --change release-6-0-0 --write` with a dummy review pair, in
`/tmp/claude-0/rev-rel/merge`): `diff` of HEAD's store vs the merged store shows exactly lines
10, 14, 38, 85 and 110–111 changing `6.2`→`6.0`; the cli store only gains the ADDED block. After
that merge, `check` → `RESULT: PASS`, store `verify` → `RESULT: GREEN — advisory scenario-ID
binding gaps only`.

**Full suite.** `node scripts/run-tests.mjs` → `tests 904 · pass 904 · fail 0`, exit 0 (14.5 s).

**check --self.**
```
! no baseline: 39 archived bundle(s) carry no manifest — archived before manifests were written, or the manifest is gone
RESULT: PASS
exit=0
```

**gate.**
```
○ C1 skipped — no test command (...)
– C2 retired in 6.0 — nothing is read
✓ C3 legal (review)
– C4 ledger retired in 6.0 — open items live in ## Open
– C5 no review document carries a verdict — nothing to attest
– C6 cli: no truth doc; gate: no truth doc
✓ C7 every mutation delta is stamped
✗ C8 BLOCKED — review-round-limit 8 (default); no completed independent review round — land `review/<family>-v1.md` with its VERDICT line and the `<family>-v1-raw.*` transcript beside it
✓ C9 no open items; risk: contract-mutation: gate/spec.md MODIFIED '...' (+2 more)
GATE: BLOCKED (1 item(s))   exit=1
```
Blocked only on C8, as expected.

**archive (dry run).**
```
--- cli/spec.md
merged (ADDED): the 6 line's release identity is 6.0.0
--- gate/spec.md
modified (MODIFIED): gate aggregates the mechanical exit conditions for one change, C9 is the one substantive state predicate, and it reads the open items, C2 and C4 are placeholders since 6.0
renamed (RENAMED): C2 and C4 are placeholders since 6.2 -> C2 and C4 are placeholders since 6.0
RESULT: NOT READY — nothing written
archive: R4 no completed independent review round — ...
exit=1
```
Nothing dropped; NOT READY only on the review.

**verify --change ... --json** (`--test-cmd "node scripts/run-tests.mjs --test-reporter=tap"`):
`result: GREEN`, `clean: true`, `errors: []`, `boundGreen` = 25 ids (GT-01..12, GT-18..21,
GT-39, GT-41, ID-01, ID-06, OI-01..04, OI-09), `boundRed/unbound/orphan/unidentified: []`,
`unattributedFailures.count: 0`, exit 0. `modifiedIntegrity` lists the old `6.2` lines as
`missingLines` for GT-02/GT-03/GT-09 and the C2/C4 body; this is expected (those are exactly the
strings being changed) and is information only.

**Packed artifact.** `npm pack` of the worktree → `apriori-cli-6.0.0.tgz`; from the extracted
`package/bin`: `--version` → `6.0.0`; the packed RUNBOOK header line is
`` > `runbook-version: 6.0` · upstream: … `` and `cmp` with the source RUNBOOK says identical. Fresh
project `init --tools claude --yes` → installed `apriori/runbook.md` byte-identical; `update` →
`everything already matches apriori-cli 6.0.0.`.

**Upgrade from the current v6-dev install** (`git archive v6-dev` → scratch CLI, reports
`6.2.0-rc.0`): a project initialised by it has `runbook-version: 6.2`; the packed 6.0.0 `update`
prints `✓ apriori/runbook.md (updated)`, `1 file(s) refreshed to apriori-cli 6.0.0.`, exit 0, and
the header becomes `6.0`; 6.0.0 `doctor` raises no D3. No version-ordering logic exists outside
CK-11 (`grep runbook-version lib/` → only `lib/check.js`), so 6.2 → 6.0 is not treated as a
downgrade.

**Runtime-string probes** (packed bin, scratch project with one ADDED delta):
- legacy `## Evidence` with a `done` row → `✓ C9 no open items; legacy ## Evidence section ignored (6.0: risks live in ## Open)`; C2/C4 lines say `retired in 6.0`.
- `tier: 1` added → `✗ C3 BLOCKED — flow-state: 5.x identity key(s) present (tier) — 6.0 carries 'phase' (and an optional inert 'mode'): delete them and set 'phase: ground|specify|build|review|done|abandoned' (see MIGRATING.md)`.
- `doctor` → `✗ D7 demo: 5.x identity key(s) present: tier — … → replace them with phase: ground | specify | build | review — see MIGRATING.md (mode: is optional and inert since 6.0)`.
- archive-force note is covered by AM-89/AM-121 (`… nothing left to force in 6.0`).

### Check (1): ID-01/ID-06 against the ADDED requirement

Every clause of both scenarios is asserted. ID-01: `pkg.version === '6.0.0'`, packed `--version`
equals it, packed header equals `majorMinor` (= `6.0`), packed = source = installed runbook byte
for byte, `update` up-to-date + `everything already matches apriori-cli 6.0.0`, packed
`check --self` has no CK-11. ID-06: version, header `6.0`, `h2[0]` = `## 6.0.0 — 2026-10-23`,
`h2[1]` = `## 5.0.0 — ` (which by itself rules out any h2 between them), MIGRATING opening regex,
no `(Unreleased)` in MIGRATING, no `\b6\.2\b` in comment-stripped `lib/*.js`/`bin/*.js`, and the
two gate literals.

Whether the comment-stripping scan misses something today: I audited every match of all three
strip regexes over `lib/` and `bin/` (`/tmp/claude-0/rev-rel/strip-audit.js`). Every `/* … */`
match is a real one-line comment (20 of them, all `catch { /* … */ }` style); no trailing-comment
strip lands inside a string. Independently, a raw `grep -nE '\b6\.2\b' lib bin` gives 38 hits, and
filtering out comment-leading lines leaves exactly three: `lib/managed.js:34`, `:35` and
`lib/status.js:274`, all trailing `// 6.2 …` comments after code. So on this tree no runtime string
names `6.2`, and the scan's PASS is correct. A string containing `//` is handled correctly too
(`'see // retired in 6.2'` is CAUGHT, because the closing quote stops the trailing-comment regex).
The scan does have blind spots for constructs that are absent today; I demonstrated them on
synthetic input (`/tmp/claude-0/rev-rel/strip-demo.js`). They are not a current gap, see
Advisory A-1.

The requirement body also says doctor D7's fix says `6.0`. The ID-06 THEN clause only demands
"no `6.2`" plus the gate literals, and the code does say `6.0` (probe above), but no test pins the
D7 text positively. See Advisory A-2.

### Check (2): CHANGELOG heading demotion

Readers of CHANGELOG in `lib/ bin/ scripts/ test/ .github/`: `identity.test.js` (ID-04, ID-06),
`protocol.test.js:518` (finds the `stability promise` line by content), `review-loop.test.js:797`
(content negative), `id-pattern.test.js:523` and `review-round-limit.test.js:543` (substring).
None depends on `## ` levels except ID-04/ID-06, which were updated. The demoted entries had no
`###`/`####` children (`awk` over v6-dev's CHANGELOG above `## 5.0.0` finds none), so the
`### X` → nested hierarchy is not flattened. ID-04 now slices `### 6.2 code layer` up to the next
`\n### `, and that subsection contains no inner `###`. MIGRATING headings keep their text apart
from `(Unreleased)`, so the readers that anchor on `## prototype-walk-guide` (PW-06) and
`## 6.2` (ID-03) still find their sections.

### Check (3): golden oracle repin is text-only

`/tmp/claude-0/rev-rel/golden.js`: raw occurrences of `(and, since 6.2, an optional inert 'mode')`
old = 70, new = 2 (both inside `_meta.repins[4].from/to`). The replacement appears 0 times in old
and 72 times in new (70 + `to` + the `what` text). With `_meta` removed, old-with-substitution
`===` new → `true`. `_meta.repins[0..3]` are unchanged and the top-level key order is unchanged.
So the repin changes text only.

### Check (4): stage-name leaks a 6.0.0 reader would see

Packed tarball contents (`bin lib templates guides RUNBOOK.md MIGRATING.md docs/operator.md`):
`templates/`, `docs/operator.md` and `RUNBOOK.md` have no `6.2`/`6.2.0`/`rc.0`/`Unreleased`.
`guides/prototype-walk.md` has only the section references `§6.1`/`§6.2`. `lib/` has `6.2` only in
comments. MIGRATING keeps its `6.2` history sections, as decided. In the repo outside
`apriori/`, `test/`, CHANGELOG and MIGRATING, the only `6.2` hits are `docs/legacy*.md:40` (the
section number "6.2 Path A") and code comments. I found no leak of the stage name. A separate
install-instruction problem in RUNBOOK §0 is RL-1.

### Check (5): RUNBOOK edits vs frozen P3

The diff hunks are at lines 1, 140, 168, 258 and 345. `### P3` starts at line 378. The RIB-10 hash
of the `### P3 … (?=### P4 )` slice is `97a85ca560d41c70` for both `git show v6-dev:RUNBOOK.md`
and HEAD, and a `diff` of the two P3 slices is empty.

### Check (6): golden-path seam

`/^npm i -g (apriori-cli\b|github:Apriorhythm\/apriori-spec-development)/` is applied per line of
block 0 only, anchored at line start, and accepts both install forms. It accepts nothing the old
`startsWith('npm i -g apriori-cli')` refused, apart from the repository form. The rewrite replaces
the whole matched line, which also drops the README's trailing `# 6.0.0 is not on npm yet` comment,
and that is harmless. GP-01's assertion uses the same alternation with `^…/m`. A real walk:
`node scripts/golden-path.mjs --packed /tmp/claude-0/rev-rel/pack/apriori-cli-6.0.0.tgz` →
`golden-path: OK (packed) — 4 blocks, exits [0, 1, 0, 0], final state green`.

### Doc spot-checks (non-critical; findings go to Advisories)

- README install line and Route B block: both use `npm i -g github:Apriorhythm/apriori-spec-development#v6-dev`. The repository matches `package.json` `repository.url`, and the walk above is green.
- `verify` promise ("a scenario with no bound test is reported, and `verify` refuses to go green until tests actually ran and nothing attributable fails"): checked against code and probes. A change with an unbound scenario plus an unrelated passing test → `RESULT: GREEN — advisory scenario-ID binding gaps only`, exit 0. Route B's red step is GAPS because `executedPoints === 0` (`lib/spec-runner.js:555`), and README now says "no test run", which is accurate. The troubleshooting line "(UNBOUND by itself is advisory and never fails a run)" is consistent with that.
- `archive --unreviewed`: present in `lib/archive-merge.js` USAGE and in readiness (`unreviewed: !!o.unreviewed`).
- docs/cli.md exit codes, probed with the packed bin: `init` with no `--tools` → 2, `--tools ,` → 2, `--tools claud` → 2, invalid `apriori/managed.json` → 1; `update` with invalid manifest → 1, uninitialised → 1. All match the new text.
- docs/cli.md `--json` sentences: the uncaught-exception path matches `bin/apriori.js` `JSON_FACES = {status, verify, gate, doctor}` + `jsonError`. `status --change nope --json` prints the full view with nulls/empties and `errors: [...]`, exit 2, as the doc now says. `openItems` carries `followUp` (`lib/readiness.js:347`).
- concepts §2.4 reviewer-input paragraph ("the contract, the diff, the `## Open` items, the boundaries still uncovered … the previous round's conclusions are not repackaged into it") agrees with RUNBOOK §4 lines 316–317: exactly four default inputs; a fresh-session later round gets only those and reviews the whole change.
- VISION P8: `P8 narrows to what binding cannot prove` is kept (PR-52 passes), and a present-day gloss is added.

## Issues

1. **RL-1 — RUNBOOK §0 still tells the reader to install from npm, which serves 5.0.0, not this release.**
   `RUNBOOK.md:31`: `npm i -g apriori-cli     # or run any command below via \`npx apriori-cli …\``.
   This change rests on the fact that npm never shipped 6.x. Its own CHANGELOG entry says
   "``npm i -g apriori-cli`` does not install this version yet — install from the repository", and
   for that reason it rewrote the same instruction in README, README_cn, docs/ci and docs/ci_cn.
   RUNBOOK is not a non-critical document. It is the shipped protocol, copied into every project by
   `init`/`update`, and this change edited it (header and stage markers), but §0's install
   instruction was left as is. Following it on a fresh machine in a 6.0 project installs a 5.0.0
   CLI that misreads the bundle. Shown: `git archive v5.0.0` → scratch CLI (`--version` 5.0.0)
   against a project initialised by the packed 6.0.0 → `update` exits 1 with
   `managed.json: '.claude/commands/apriori-discuss.md' is not a refresh target`, and
   `status --change feat` prints `step: ? (tier ?, track ?)` / `open ledger: 0`, which is a 5.x
   reading of a 6.0 bundle. This is a gap against the owner's request to re-check the docs and
   update everything that needs it, inside the one protocol file that ships.
   Fix, either: (a) give §0 the README's wording (repository install while npm serves 5.0.0;
   `npx apriori-cli` likewise runs 5.0.0). ID-01's byte-identity follows automatically, P3 is
   unaffected, and the runbook needs a further edit when 6.0.0 reaches npm. Or (b) if the
   runbook deliberately names the eventual npm install, record that as an `## Open` item with the
   owner's `evidence-accept`, so the window in which §0 installs 5.0.0 is an accepted, visible
   decision and not an oversight.

## Advisories

- **A-1 (ID-06 scan robustness).** `test/identity.test.js` ID-06 `strip` is regex-based, not a
  tokenizer. On synthetic input it misses a `6.2` in four shapes, none present today:
  (i) a string holding `/*` (e.g. a glob `'review/*.md'`) followed later by any `*/` (a regex like
  `/x*/`), where everything between is stripped; (ii) a template-literal line starting with `//`;
  (iii) a template-literal line containing ` // … 6.2` with no quote after it; (iv) only top-level
  `lib/*.js`/`bin/*.js` are scanned, so a future subdirectory or `.mjs`/`.cjs` is not. The current
  PASS is correct (audited above). For durability, scan string/template literals via a small
  tokenizer, or keep the strip and add a raw check that no quoted literal contains `6.2`.
- **A-2 (D7 text unpinned).** The requirement body names doctor D7's fix as saying `6.0`, but no
  test asserts `mode: is optional and inert since 6.0`; it is protected only by the absence-of-`6.2`
  scan. A one-line assertion in an existing doctor test would close this.
- **A-3 (moving install target).** README/README_cn/docs/ci* install `#v6-dev`, a branch. After the
  next commit to v6-dev that line no longer installs 6.0.0. Consider a commit or the `v6.0.0` tag
  once the owner cuts it. Doc, non-critical.
- **A-4 (README client row).** "verified for 6.0.0 (Claude Code 2.1.278, claude-opus-5)" reads as
  a verification of this exact release. The recorded evidence is on the line (5d3fc78 … c69174a,
  per the CHANGELOG entry). "verified on the 6 line" would be accurate. Doc, non-critical.
- **A-5 (pre-existing script hazard, not introduced here).** `scripts/golden-path.mjs --packed`
  with the tarball argument omitted does `path.resolve('')` → the cwd (the checkout), and
  `existsSync` passes. It then runs `npm i -g <checkout> --prefix <tmp>`, which chmods
  `bin/apriori.js` to 100755 in the worktree. I triggered this once (`git diff` showed
  `old mode 100644 / new mode 100755`, content unchanged) and restored it with `chmod 644`.
  `git ls-files -s bin/apriori.js` → `100644`, and `git status` is clean. Worth a guard
  (`fail` unless the argument ends in `.tgz`) in a later change.
- **A-6 (CHANGELOG count).** The release entry says "The ten tests … that pinned the old strings".
  The diff repins 13 test cases (AM-89, FF-07, FF-09, GT-02, GT-03, MD-05, OI-04, PR-50, AM-121,
  RY-01, RY-16, RY-17, RY-21) in 8 files, plus GP-01 for the install seam.
- **Process note.** C5/C8 need `review/code-review-v1-raw.*` beside this document. This file is the
  review's own transcript; the producer lands the raw per R2.

VERDICT: 1 issue open
