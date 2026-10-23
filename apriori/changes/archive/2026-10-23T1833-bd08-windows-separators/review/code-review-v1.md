<!-- provenance: provider=anthropic model=claude-opus-5-5 session=unknown date=2026-10-23 -->
# code-review v1: bd08-windows-separators

## Scope

`feature/bd08-win` @ 48369ec, one commit on `v6-dev`@59fb177 (`git diff v6-dev...HEAD`): `test/boundaries.test.js`
(two BD-08 assertions), `CHANGELOG.md` (one subsection inside 6.0.0), the golden delta, and the flow-state. Read too:
`lib/archive-merge.js` (`mdFilesUnder`, `discoverDeltas`, `buildProjection`), `lib/risk.js` (`scanDeltas`),
`lib/manifest.js` (`listBundle`), `test/helpers/can-symlink.js`, and the store block in `apriori/specs/golden/spec.md`.

## What was run and observed (Linux, worktree clean before and after)

- `node --test test/boundaries.test.js`: 10 tests, 10 pass, 0 skipped. BD-08 ran, because Linux can create symlinks.
- `node scripts/run-tests.mjs`: 907 tests, 907 pass, 0 fail, 0 skipped.
- `apriori check --self`: `RESULT: PASS`. The only note is the known "39 archived bundle(s) carry no manifest" baseline.
- `apriori gate --change bd08-windows-separators`: `GATE: BLOCKED (1 item(s))`, and the one item is C8 (no completed
  independent review round). C3 legal (review), C7 stamped, and C9 shows no open items, with risk
  `contract-mutation: golden/spec.md MODIFIED 'the suite is portable to the Windows CI matrix'`. C1 skipped
  (no test-cmd row).
- `apriori archive --change bd08-windows-separators` (dry run): `--- golden/spec.md` / `modified (MODIFIED): the suite is
  portable to the Windows CI matrix`, with no DROPPED SCENARIOS section. `RESULT: NOT READY — nothing written`, and the
  only reason is R4 (this review not yet landed).
- `apriori verify --change bd08-windows-separators --test-cmd "node scripts/run-tests.mjs --test-reporter=tap" --json`:
  exit 0, `result: GREEN`, `clean: true`, errors [], `boundGreen: [WN-01 pass 1]`, and boundRed/unbound/orphan/
  unidentified/duplicates for the change are all empty. Projection modules = `[golden/spec.md]`, with no conflicts and no
  unstamped mutations. Store report: boundGreen 501, unbound `IN-03, SR-69..SR-72`. **BD-08 is in the store report's
  `orphan` list (298 orphans)**: no spec in the store, and not this delta, carries a scenario with id BD-08. The delta
  names BD-08 only in prose. So BD-08 has no binding anywhere. That was already true before this change, and the change
  does not alter it (see advisory A1).

### Delta vs store
The delta's base stamp `sha256:89a309f5…` equals the current `sha256sum apriori/specs/golden/spec.md`. Splitting both
copies of the requirement block on `; ` and diffing them shows exactly one changed clause, the separator-neutral
parenthetical. It was `(… with `/` whatever the host printed, and a filter on a relative path reads it with `/`)` and is
now `(… whatever the host printed, a filter on a relative path reads it with `/`, and an assertion on a `path.relative`
result or on a message that embeds a host path compares in `/` form or accepts either separator — BD-08, …)`. The npm
seam clause, the symlink-guard clause (nineteen/six/two counts unchanged), the CL-21 sentence and scenario WN-01 are
byte-identical. The only other difference is a trailing blank line from the extraction.

### (1) The two test edits
- `files.map((f) => path.relative(specs, f).split(path.sep).join('/'))` vs `['kv/spec.md']`. On POSIX `path.sep` is `/`,
  so split/join leaves the string as it was. The expected set is unchanged, so a duplicate, a missing file or an entered
  loop still fails. On Windows `path.relative` returns `kv\spec.md` (checked with `path.win32`, which gives `kv/spec.md`
  after the normalisation). The loop itself already ended on Windows: the CI failure's actual value was the single
  `kv\spec.md`.
- `/escapes the walk root: .*kv[\\/]out/`. The message is
  ``symlinked directory escapes the walk root: ${p} -> ${real}`` with `p = path.join(d, e.name)`, so it carries the
  host's separator (`…\specs\kv\out -> …\apriori-bd-out-…` on Windows). I checked the old and new regexes against
  sample messages. On a POSIX message, old matches and new matches. On a Windows message, old fails and new matches. A
  different directory (`kw/out`, `kv\in`) fails both, and so does a non-separator (`kv-out`). So the regex still rejects
  a message that names another directory. The only new acceptance is `kv\out` on POSIX, which would mean a directory
  entry literally named `kv\out` and can't happen here. The `-> ${real}` tail cannot supply `kv?out` either: the
  target is `apriori-bd-out-*` under `os.tmpdir()`.

### (2) `mdFilesUnder` consumers
`mdFilesUnder` returns `path.join`-built absolute paths, sorted. Every consumer derives its own key in `/` form:
- `discoverDeltas`: `suffix: path.relative(specsDir, abs).split(path.sep).join('/')`
- `buildProjection` store listing: `texts.set(path.relative(storeRoot, abs).split(path.sep).join('/'), …)`, and
  targets go back through `path.join(storeRoot, ...suffix.split('/'))`
- `risk.scanDeltas`: `path.relative(specsDir, abs).split(path.sep).join('/')`
In all three, the absolute path is used only for `containsFuturePath`, reads and messages. `lib/manifest.js` does not
call `mdFilesUnder`: `listBundle` builds `${rel}/${e.name}` keys itself. No other `lib/`, `bin/` or `scripts/`
caller exists (the only other hit is BD-08). So no consumer keys on the separator form, which agrees with "test only,
`mdFilesUnder` unchanged". The one host-dependent detail is the order of `out.sort()` (A2).

### (4) Sweep for same-shape assertions
- `path.relative(...)` in tests without `/` normalisation appears in seven places
  (artifact-root-retirement:120, archive-single-file-scope:59, delivery-retirement:128, fence-tilde-readers:64/76,
  lineage-retirement:142). Every one is an assertion message, a CLI argument, or a compare against `[]`. None compares
  with a `/` literal.
- Regex literals with `\/` in `assert.match/doesNotMatch/throws/.test`: I triaged about 100 lines. Nearly all match
  `/`-literal strings that lib builds itself (`review/${n}`, `GUIDE_REL = 'apriori/guides/prototype-walk.md'`,
  the managed.js `'…sits at apriori/guides'`, `/`-form suffixes) or docs text. The ones inside symlink cases are
  AM-140 (archive-unreviewed:206/214), legacy-ledger-migration:163–164, BD-06, and the other `canSymlink()`-guarded
  tests. They all ran on the Windows runners (which can link) and passed: the run had exactly one failure, BD-08, and
  a passing test passed every one of its assertions. The two kinds of case skipped outright on `win32` are UP-10's
  tail (`/escapes the project root/`, no path in the regex) and prototype-walk-guide `SYMLINKS` blocks (343/350/367/
  403/411, all matching `/`-literal constants from lib/managed.js). They would hold even if they ran.
- So the only reachable code that never ran on a Windows host is the rest of BD-08 after line 201. The CI failure
  stopped the test there, which hid line 209. Lines 202–215 contain no separator-bound regex (`/escapes the walk root/`
  only, plus status codes and the `unreadable-delta` signal), so I find no further issue of this shape. Whether they
  hold on Windows is proven only by the next CI run (A3).

### (5) Golden clause and CHANGELOG
The golden clause is accurate: one assertion normalises to `/`, the other accepts either separator, which matches
"compares in `/` form or accepts either separator". The provenance (first Windows CI run past CL-21, runners hold the
symlink privilege) matches the flow-state's observed line and the task's CI facts. The CHANGELOG subsection sits at the
top of the 6.0.0 section, above `windows-ci-portability`, and says "Test only; `mdFilesUnder` is unchanged", which is
true. "Both read either separator now" is a fair summary: the first is normalised, the second accepts both.

## Issues

None.

## Advisories

- A1: BD-08 is an orphan test id. verify lists it under `storeReport.orphan`, and no store scenario names it. The new
  golden clause cites BD-08 in prose, but nothing binds the clause: WN-01 checks the npm seam, the normalizer and
  `canSymlink()` adoption, not "no `path.relative` compared with a `/` literal". A future regression of this shape is
  caught only by a Windows runner that can link. This was the case before the change too. A source scan in WN-01 or a
  later change could cover it. It does not block this change.
- A2: `mdFilesUnder`'s `out.sort()` sorts host-separator absolute paths. Because `\` (0x5C) sorts after digits and
  upper-case letters while `/` (0x2F) sorts before them, sibling directories such as `kv/` vs `kv2/` or `kvA/` come out
  in a different order on Windows. Everything is keyed by `/` suffix, so correctness is unaffected. Only the order of
  `modules` and of the report lines can differ. This predates the change, and the change rightly leaves lib alone.
- A3: Lines 202–215 of BD-08 (verify/archive with the loop present, `unlinkSync` of a directory symlink, the escape
  surfaced through verify `--json` / archive stderr / `risk.scanDeltas`) have never run on Windows. They look
  separator-neutral, but the next PR #1 CI run is their first execution there, which is already the Next step in
  the flow-state.
- A4 (out of scope): `manifest.listBundle` records `'link:' + fs.readlinkSync(p)`, which keeps the host's separator in
  the link target. A bundle carrying a relative symlink would hash differently on Windows and POSIX. No test reaches
  this on Windows, and this change does not touch it.

VERDICT: no spec-vs-code gaps
