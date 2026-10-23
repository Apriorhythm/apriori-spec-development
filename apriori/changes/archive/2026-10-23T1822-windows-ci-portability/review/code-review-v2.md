<!-- provenance: provider=anthropic model=claude-opus-5-5 session=unknown date=2026-10-23 -->
# code-review v2: windows-ci-portability

## Scope

Round 2. `git diff c19741f...ef945d7` on `feature/windows-ci` at **ef945d7**, read in full: the golden delta
(requirement sentence + Notes), `test/helpers/npm.js` (A1), `test/helpers/verdict-corpus.js` (A4 header),
`test/cli-json-pipe-flush.test.js` (A7 timeouts), CHANGELOG (A5 + timeout sentence), flow-state (round-1 record and
dispositions). Context re-read: every `symlinkSync(` site in `test/*.test.js` (all 27 files), `test/windows-portability.test.js`
(WN-01), UP-10 in `test/update.test.js`, the `SYMLINKS` blocks in `test/prototype-walk-guide.test.js`, the npm
call sites in `test/identity.test.js` / `test/operator-move.test.js`.
Linux host, Node 24.13.0. Scratch copy via `git archive ef945d7` under `/tmp/claude-0/rev-win2/`; nothing in the
worktree was modified except this file (`git status --short` empty before writing it).

## What I ran and observed

- **Diff scope.** `git diff --stat c19741f...ef945d7`: CHANGELOG.md, flow-state.md, review/code-review-v1.md (new),
  specs/golden/spec.md, test/cli-json-pipe-flush.test.js, test/helpers/npm.js, test/helpers/verdict-corpus.js — exactly
  the listed files plus the round-1 review. `git diff 7e459a6...ef945d7 -- bin lib test/fixtures` is empty (0 lines).
- **Symlink census** (`grep -l 'symlinkSync(' test/*.test.js` = 27 files), each guard read at its call sites:

  | form | files | count |
  |---|---|---|
  | `canSymlink()` from `test/helpers/can-symlink.js` (as `if (canSymlink())`, a conditional case list, or a test-level `skip:`) | accept-r1-contracts, accept-r2, archive-manifest, archive-readiness, archive-single-file-scope, **archive-unreviewed (AM-140)**, boundaries, change-scope, fast-floor, id-pattern, json-contracts, legacy-ledger-migration, predicate-unification, readiness, readiness-archive-layer, review-loop, **review-round-limit (GT-57)**, single-file-deprecation, slice5-adversarial | 19 |
  | inline try/catch probe (local `can` / `canSymlink` var or IIFE, no helper import) | archive-change, check, doctor, gate, resolve, status | **6** |
  | `win32` platform skip | update (UP-10: `if (process.platform === 'win32') return;` after the missing-file assertions), prototype-walk-guide (`SYMLINKS = process.platform !== 'win32'`, five `if (SYMLINKS)` blocks) | **2** |

  19 + 6 + 2 = 27; no unguarded `symlinkSync` remains (the two that look bare — predicate-unification:56 inside
  `bundle('symlink')`, single-file-deprecation:75 inside `mappedWorkspace` — are reached only from `canSymlink()`-guarded
  code / the `skip:`-guarded SFD-05). The "six" and "two" in the requirement are exact; UP-10 and the PW blocks skip
  only the symlink part, all non-symlink assertions before/around them run on Windows.
- **Requirement vs WN-01.** The requirement's normative content — a symlink-creating test SHALL not fail for want of
  the privilege, by a probe or (two older tests) a `win32` skip; the probe form preferred — is true of the suite above.
  WN-01 (c) still pins only AM-140/GT-57, and the scenario's THEN says exactly that ("the two tests that lacked a probe
  (AM-140, GT-57) consult `canSymlink()`"); the rest of the sentence rests on the suite itself, which the census backs.
  "Preferred for new tests" is guidance, not a SHALL, and nothing claims it is enforced.
- **npm seam (A1).** POSIX: `shellArgs` returns the same array object (`sa(a) === a` → true) and `shell: WIN` is
  false, so args reach `spawnSync`/`execFileSync` unchanged — inert. Shell path, simulated on Linux (scratch copy with
  `WIN = true`, `NPM = 'npm'`, i.e. `/bin/sh` instead of `cmd.exe`): `npmSync(['pack','--silent','--pack-destination',
  '<dir with space>'])` → status 0, tarball lands in the spaced dir; the same with `shellArgs` removed → status 254,
  dir empty. On Windows Node builds `cmd.exe /d /s /c "npm.cmd pack --pack-destination "C:\…\a b\x""`; `/s` strips
  only the outer pair, `npm.cmd` forwards `%*` verbatim to `node npm-cli.js`, and the MSVCRT argv parser removes the
  quotes — so a plain path with spaces survives. Limits of the one-liner (none reachable by what the tests pass —
  `pack`, `--silent`, `--json`, `--dry-run`, `--pack-destination`, an `os.tmpdir()`/`mkdtemp` path): an argument
  containing `"` breaks the quoting; an argument ending in `\` would turn the closing `"` into `\"` under CRT rules
  (`os.tmpdir()` and `mkdtemp` results have no trailing separator); `%NAME%` still expands inside quotes; an argument
  with cmd metacharacters (`& | < > ^`) but no whitespace is not quoted. The helper comment ("the tests pass nothing
  else") is accurate. DEP0190 still prints on the shell path (A2 of round 1, recorded as not changed).
- **Timeouts (A7).** `timeout` is a documented `node:test` `TestOptions` field; `{ skip: WIN32_BLOCKING_PIPES, timeout:
  60000 }` is a valid combination. `node --test test/cli-json-pipe-flush.test.js`: 4 tests, 4 pass, 0 skipped.
  With `process.platform` spoofed to `win32` in the test process: CL-21 reported `﹣ … # stdio pipes are blocking on
  Windows: …` (skipped with its reason; the other three fail under the spoof only because the spoof breaks their
  child paths — irrelevant). Enforcement: CL-22 copied with `timeout: 20` → `'test timed out after 20ms'`, so a hang
  becomes a failure.
- **Suite.** `node scripts/run-tests.mjs`: 907 tests, 907 pass, 0 fail, 0 skipped (WN-01 among them).
- **CLI.** `check --self`: RESULT PASS. `gate --change windows-ci-portability`: BLOCKED (1 item) — C8 only
  (code-review round 1, 1 open); C3 legal, C5 ok, C7 stamped, C9 no open items. `archive --change windows-ci-portability`
  (dry run): `cli/spec.md` modified (MODIFIED) "the CLI exits only after its output has drained", `golden/spec.md`
  merged (ADDED) "the suite is portable to the Windows CI matrix", nothing else listed, NOT READY only on R4, nothing
  written. `verify --change windows-ci-portability --test-cmd "node scripts/run-tests.mjs --test-reporter=tap" --json`:
  exit 0, `result: GREEN`, `clean: true`, boundGreen CL-19, CL-20, CL-21, CL-22, WN-01 (each pass 1), boundRed /
  unbound / orphan / unidentified (change scope) empty, unattributedFailures 0, projection modules cli/spec.md +
  golden/spec.md, no conflicts, no unstamped mutations.
- **Header comment (A4).** verdict-corpus.js now says the root is normalized to `<ROOT>` "(and the path under it read
  with '/')" before "NOTHING else is normalized" — matches `makeNorm`.
- **CHANGELOG (A5).** `### windows-ci-portability …` at line 33, inside `## 6.0.0 — 2026-10-23` (line 3), before
  `## 5.0.0` (line 1082). It now says the eight were found on a Windows host once the CL-21 hang that stopped PR #1's
  run was skipped (matches the flow-state's 905/873/8/24 record), adds the GT-57 line-222 separator assertion, and
  states the 60 s timeout on CL-21/CL-22 (true, above). "No pinned expectation, `bin/` or `lib/` change" holds.
- **Flow-state.** The round-1 record and the dispositions (WP-1 by wording; A1/A4/A5/A7 applied; A2/A3/A6/A8 recorded;
  A9 by existing practice) match what the diff does. The source line's census was corrected to the three forms.

WP-1: ADDRESSED — the requirement now names all three guard forms, the six-file and two-test counts are exact, the
"only the symlink case is skipped" clause holds for UP-10 and the PW blocks, and WN-01's scenario claims only the
AM-140/GT-57 pin it checks.

No new issues.

## Advisories

- **A1 (enumeration reads as a partition).** The parenthetical "`canSymlink()` in AM-140 and GT-57; an inline try/catch
  probe in six older files … two older tests" is true but lists only 2 of the 19 `canSymlink()` files, so a reader of
  the store can take it as a 2 + 6 + 2 census of a 27-file convention, and as if `canSymlink()` were new here (the Notes
  rightly call it "the repository's existing canSymlink convention"). A cheap wording fix before archive:
  "`canSymlink()` (the shared probe — 19 files, AM-140 and GT-57 newly among them)". Not false, so not blocking.
- **A2 (test-level skips).** 22 tests in 13 of the `canSymlink()` files guard with a test-level `skip:` — the whole test
  is the symlink case. "Every other assertion keeps running" is right for those whose premise is the link; one or two
  (e.g. SFD-05's single-file leg, which is the comparison baseline for the linked leg) carry a non-link assertion that is
  skipped with them. Harmless; mention only if the sentence is reworded anyway.
- **A3 (npm quoting limits).** As above: `"` inside an argument, a trailing `\`, `%VAR%`, and unquoted metacharacters
  without whitespace are outside the one-liner. Nothing the tests pass reaches them; if the seam ever takes
  user-supplied arguments, switch to `process.execPath` + npm's `npm-cli.js` (no shell, no DEP0190).
- **A4 (Windows re-run of ef945d7 not recorded).** The flow-state's last Windows-host run is of a38c241 + the line-222
  fix; the A1 quoting change is reasoned and simulated under `/bin/sh` here, not run under `cmd.exe`. On runner temp
  paths (no spaces) the quoting branch is not taken, so CI on PR #1 exercises only the unchanged path; the spaced path
  is verified on Windows only when someone runs it there.
- **A5 (stale WN-01 header, out of this diff).** `test/windows-portability.test.js` lines 2–6 still say PR #1's CI run
  "failed in four ways …"; per the corrected Notes/CHANGELOG that run never got past the CL-21 hang and the four
  categories came from the Windows-host run. Comment only.
- **A6 (history detail).** The CHANGELOG and Notes list the GT-57 line-222 assertion alongside the original eight
  failures "found … once CL-21 was skipped"; the flow-state shows it surfaced on the second Windows-host run (after the
  symlink guard let the test reach line 222). Still eight tests; the timing is slightly conflated. Non-blocking.

VERDICT: no spec-vs-code gaps
