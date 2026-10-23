<!-- provenance: provider=anthropic model=claude-opus-5-5 session=unknown date=2026-10-23 -->
# code-review v1: windows-ci-portability

## Scope

`git diff v6-dev...HEAD` on `feature/windows-ci` at **c19741f** (v6-dev@7e459a6 + a38c241 + c19741f), read in full:
flow-state.md; the two deltas (golden ADDED "the suite is portable to the Windows CI matrix" + WN-01; cli MODIFIED
"the CLI exits only after its output has drained" + CL-22); `test/helpers/npm.js` (new), `test/identity.test.js`,
`test/operator-move.test.js`, `test/helpers/verdict-corpus.js`, `test/fence-tilde-readers.test.js`,
`test/archive-unreviewed.test.js`, `test/review-round-limit.test.js` (incl. the c19741f line 222 change),
`test/windows-portability.test.js`, `test/cli-json-pipe-flush.test.js`, CHANGELOG. Context read: `bin/apriori.js`
`exitWhenDrained`, `lib/review.js` `evidenceFileInside`, `test/helpers/can-symlink.js`, `.github/workflows/ci.yml`,
LNG-07 in `test/lineage-retirement.test.js`, every `symlinkSync` site under `test/`.
Linux host, Node 24.13.0, npm 11.9.0. Scratch copies via `git archive` under `/tmp/claude-0/rev-win/`; nothing
in the worktree was modified except this file.

## What I ran and observed

- **Store vs delta.** Both delta base stamps equal the current store sha256 (cli `b3c55463…`, golden `8eddf479…`).
  The MODIFIED block's requirement text and CL-19/CL-20/CL-21 are byte-identical to the store (diff of store
  lines 79–92 vs the delta block up to CL-22: identical); only CL-22 is appended.
- **No product / pin change.** `git diff v6-dev...HEAD -- bin lib test/fixtures` is empty.
- **Suite.** `node scripts/run-tests.mjs` at c19741f: 907 tests, 907 pass, 0 fail, 0 skipped. ID-01, ID-02, OPM-01,
  OPM-07, LNG-07, TX-02, AM-140, GT-57, CL-19..CL-22, WN-01 all pass.
- **Assertions executed** (preload wrapping `node:assert` methods, per test via `--test-name-pattern`, base =
  `git archive v6-dev`, head = `git archive HEAD`):

  | test | v6-dev | head (Linux) | head, simulated no-symlink host | v6-dev, simulated no-symlink host |
  |---|---|---|---|---|
  | AM-140 | 51 | 51 | 42, pass | 28, **fail** (EPERM) |
  | GT-57 | 16 | 16 (also at c19741f) | 12, pass | 6, **fail** (EPERM) |
  | TX-02 | 170 | 172 | — | — |
  | LNG-07 | 202 | 202 | — | — |

  On a host that can link, every assertion still runs (identical counts). On a host that cannot (simulated by
  stubbing `canSymlink()` → false and `fs.symlinkSync` → EPERM), exactly the symlink cases drop (AM-140: the
  `linked` case's 3 + the `rawLink` loop's 2×3; GT-57: the escaping-symlink case's 3 + the symlink-inside case's 1) and
  every other assertion runs; v6-dev under the same simulation fails, which is the Windows failure reproduced.
  TX-02 selects 156 stores/deltas at head (154 at v6-dev; the +2 are this change's own deltas, hence the +2
  `deepStrictEqual`), well above 100.
- **Normalizer.** LNG-07 compares against the untouched golden fixture and passes with the same 202 assertions,
  so the added fold changes no Linux record of the current corpus. `makeNorm` is used only by `judgeCorpus`
  (LNG-07) and WN-01.
- **GT-57 line 222 (c19741f).** `evidenceFileInside(cases[0].evidence.replace('/ext.txt',''), 'ext.txt')` →
  `evidenceFileInside(outside, 'ext.txt')`. `cases[0].evidence` is `path.join(outside, 'ext.txt')`, so on POSIX the
  old argument *was* `outside`; same assertion, same semantics, now separator-neutral. `test/review-round-limit.test.js`
  19/19 on Linux; the coordinator reports 19/19 on the Windows host.
- **WN-01 mutation tests** (scratch copies; WN-01 run alone):

  | mutation | WN-01 |
  |---|---|
  | none | pass |
  | new test file with `spawnSync('npm', …)` | **fail** (offenders) |
  | new test file with `cp.execFileSync("npm", …)` | **fail** |
  | new test file with `const N='npm'; cp.spawnSync(N, …)` | pass (not caught — see A3) |
  | normalizer fold line deleted | **fail** (backslash form not folded) |
  | seam `shell: WIN` → `shell: false` | **fail** |
  | seam `NPM = 'npm'` (no `npm.cmd`) | **fail** |
  | `canSymlink()` removed from GT-57 | **fail** |
  | `if (canSymlink())` guard removed from AM-140 | **fail** |

  WN-01 is not tautological: (b) is behavioural (it calls the real normalizer on a backslash and a slash form),
  (a) and (c) are source-text pins that catch the regressions they name.
- **CL-22.** Passes on Linux. Repeated under mutations of `bin/apriori.js`: (i) `stream.on('error', () => {})`
  removed — CL-22 pass 10/10 (CL-21 also 10/10, see A6); (ii) drain logic reverted to an immediate `process.exit`
  — CL-20 fails 5/5, CL-22 passes 5/5. So on Linux CL-22 discriminates neither mutation; by its scenario it only
  pins "exit code 0 with an early-closed stdout reader on every platform", and that is what it asserts (exit code
  only). Deadlock: stderr is consumed from the start and stdout is destroyed after one chunk, so the child can only
  block on stdout, whose reader is gone (writes fail with EPIPE / ERROR_NO_DATA rather than block); `close` waits
  only on handles that are read or destroyed. I see no way for it to hang on either platform.
- **npm seam.** `spawnSync('echo', ['a b','c'], {shell:true})` prints `a b c` — args are concatenated unquoted, and
  Node 24 emits `[DEP0190] DeprecationWarning: Passing args to a child process with shell option true …` once per
  process. Simulating the Windows branch on Linux (`shell: WIN || true`, keeping WN-01's pin) and running CI's
  `npm run verify` command (`verify --specs apriori/specs --test-cmd "node scripts/run-tests.mjs --test-reporter=tap"`):
  the warning appears as a TAP comment (`# (node:…) [DEP0190] …`), verify stays **GREEN**, exec status 0,
  0 unattributed failures. `npm.cmd` + `shell: true` is the form Node's own docs prescribe since the
  CVE-2024-27980 fix (18.20.2 / 20.12.2 / 21.7.3: a `.cmd`/`.bat` without `shell` throws `EINVAL`); it applies
  identically to Node 22 and 24. That it actually resolves on Windows is established only by the producer's
  Windows run (Node 24.14: ID-01/ID-02/OPM-01/OPM-07 pass); Node 22 on Windows is unverified until CI.
- **CLI.** `check --self`: RESULT PASS. `gate --change windows-ci-portability`: BLOCKED on C8 only (C3 legal,
  C7 stamped, C9 no open items). `archive --change windows-ci-portability` (dry run): cli MODIFIED "the CLI exits
  only after its output has drained", golden ADDED "the suite is portable to the Windows CI matrix", nothing else
  listed, NOT READY only on R4 (review round), nothing written. `verify --change windows-ci-portability --test-cmd
  "node scripts/run-tests.mjs --test-reporter=tap" --json`: GREEN; boundGreen CL-19, CL-20, CL-21, CL-22, WN-01;
  boundRed/unbound (change scope) empty; projection modules cli/spec.md + golden/spec.md, no conflicts.
- **CHANGELOG.** The subsection is `### windows-ci-portability …` at line 33, inside `## 6.0.0 — 2026-10-23`
  (line 3), above the cl21 subsection, before `## 5.0.0`.

## Issues

- **WP-1** (golden requirement overclaims the symlink convention). The ADDED requirement says "a test that creates
  a symlink SHALL probe first (`canSymlink()`, or an inline try/catch probe in the older tests) and skip only the
  symlink case on a host that cannot create one". Two existing tests do neither: `test/update.test.js` UP-10
  (`if (process.platform === 'win32') return;` before its escaping-symlink case) and
  `test/prototype-walk-guide.test.js` (`const SYMLINKS = process.platform !== 'win32'`). They skip by platform, so
  they skip on every Windows host, including a runner that can link — not "probe first", not "only on a host that
  cannot create one". (Inline try/catch probes are in gate, check, archive-change, resolve, doctor and status — six
  files, not the four the flow-state says.) WN-01 checks only AM-140/GT-57, so nothing enforces the sentence and it
  is false of the suite it enters the store with. Fix either side: name the third form honestly in the requirement
  (e.g. "… or an inline try/catch probe, or — UP-10 and the PW tests — a `win32` skip"), or turn those two guards
  into `canSymlink()` probes. Either fix is test/spec-side and changes no assertion on Linux.

## Advisories

- **A1 (npm seam, spaces).** `shell: true` concatenates args unquoted (shown above). The tests pass only
  `--pack-destination <os.tmpdir()/…>`, which has no spaces on GitHub runners (`C:\Users\RUNNER~1\AppData\Local\Temp`)
  and the helper's comment says so; a Windows developer whose profile path contains a space would see
  ID-01/ID-02/OPM-07 fail loudly (wrong destination / no tarball found), never pass falsely. Acceptable for this
  change; a one-line quote on win32 (`args.map((a) => /[\s"&^|<>]/.test(a) ? `"${a}"` : a)`) or invoking
  `process.execPath` with npm's `npm-cli.js` would remove the caveat and the Node 24 DEP0190 warning.
- **A2 (DEP0190 noise).** On Node 24 / Windows each process that uses the seam prints a DEP0190 deprecation
  warning; harmless to `node --test` and to `npm run verify` (simulated: GREEN), but expect it in the CI log.
- **A3 (WN-01 (a) is a source-text pin).** It catches `spawn*/exec*('npm'|"npm"|`npm`` but not a bare `npm` reached
  through a variable, and its seam checks are regexes on the helper's text. The behavioural proof of the seam is the
  Windows run. Fine as a tripwire; the scenario claims no more.
- **A4 (stale header comment).** `test/helpers/verdict-corpus.js`'s header still says the root is normalized to
  `<ROOT>` and "NOTHING else is normalized"; the separator fold under `<ROOT>` is now a second normalization. Worth a
  clause so a future re-pin reader knows. (On Linux the fold can only touch a literal backslash inside a
  `<ROOT>…` token; the current corpus has none — LNG-07 identical.)
- **A5 (history text after c19741f).** The CHANGELOG subsection and the golden delta's Notes describe GT-57 only as
  "creating symlinks on a host without the privilege"; c19741f shows GT-57 also had a separator-bound line
  (`.replace('/ext.txt', '')` on a `path.join` result). Both texts also say the eight were "found by the first Windows
  CI run (PR #1)", while the flow-state records that run hung on CL-21 and the eight came from the Windows-host run
  after CL-21 was skipped (the Notes do say "reproduced on a Windows host"). Suggest one clause each; history text,
  non-blocking.
- **A6 (out of scope, prior change).** On this Linux host (Node 24.13) neither CL-21 nor CL-22 fails when
  `stream.on('error', () => {})` is removed from `exitWhenDrained` (10/10 pass). CL-22 is not meant to discriminate
  it on Linux, but CL-21 was; worth a look in a later change (the EPIPE may not be firing while the exit still
  waits, or Node may be absorbing it).
- **A7 (CL-22 timeout).** CL-22 cannot deadlock by construction, but the suite has already been hung once by a pipe
  test on Windows; a `{ timeout: 60_000 }` option on CL-22 (and CL-21) would turn any future hang into a failure
  instead of a stuck job.
- **A8 (CI residual).** The steps after npm in ID-01 and OPM-07 (`tar -xzf <C:\…> -C <C:\…>`) passed on the
  producer's Windows host; on a GitHub runner the `tar` on PATH must be Windows' bsdtar, not Git's GNU tar (which
  reads `C:` as a remote host). PR #1's Windows matrix is the judge.
- **A9 (process).** C8 / R4 also need the `code-review-v1-raw.*` transcript beside this summary; that is the
  coordinator's to land.

VERDICT: 1 issue open
