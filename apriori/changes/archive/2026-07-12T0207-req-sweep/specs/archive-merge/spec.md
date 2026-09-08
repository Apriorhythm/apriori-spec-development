<!-- apriori-base: sha256:5fe60d4a6c34080a42b2d1b4c0aa71b4ce3333fc741f8650f8d9c16b0a51ee70 -->
# Delta — archive-merge (req-sweep)

## ADDED Requirements

### Requirement: archive stages the requirement history into the change before the move
With `--write` and an explicit `--changes-dir`, `archiveChange` SHALL, AFTER the stores commit and BEFORE the change-dir move, rename every file in `<cwd>/requirement/` whose basename exactly matches one of three anchored patterns for the change — `^<change>-req-v[0-9]+\.md$`, `^<change>-req-final\.md$`, `^<change>-intent-card\.md$` (change name regex-escaped) — into `changes/<name>/requirement/` (created on demand, basenames preserved), so the existing atomic move carries the requirement history; no post-move writes exist. Fail-closed: the source dir must realpath-resolve inside cwd and the destination must pass containment under the changes dir before any read or rename; a MATCHING candidate that is a symlink (lstat) fails the run before the move, naming the symlink and the cure — symlinks are never followed, non-matching entries are ignored. Any staging failure aborts before the move with exit 1 and the existing rerunnable taxonomy (`stores committed but requirement staging failed … — rerun to complete`); a rerun completes staging and the move (stores re-verify as applied, staged files no-op). Zero matches → silent no-op; dry-run and the single-file form never stage. The report carries `staged: <n> requirement file(s) → changes/<name>/requirement/` when n > 0.

#### Scenario: AM-36 the requirement history travels inside the atomic move
- WHEN a change with `<change>-req-v1.md`, `-req-v2.md`, `-req-final.md`, and `-intent-card.md` in requirement/ archives with --write --changes-dir
- THEN all four end inside the archived dir's requirement/, the live requirement/ no longer has them, the report carries the staged-line, and the exit is 0

#### Scenario: AM-37 attribution is exact and near-misses never match
- WHEN changes `a` and `a-b` both own requirement files and `a` archives, with `a-req-vdraft.md` and `a-req-v1-notes.md` also present
- THEN only `a`'s three-pattern matches are staged; `a-b-*` and both near-misses stay untouched — and an intent-card-only change stages just the card with exit 0

#### Scenario: AM-38 staging failures stop before the move and reruns complete
- WHEN a staging rename is made to fail (DI seam), or a MATCHING candidate is a symlink, or the staging destination `changes/<name>/requirement` resolves outside the change tree (a planted symlink), or the source `requirement/` dir itself escapes cwd
- THEN archive exits 1 BEFORE the move (stores committed, change dir still in flight, nothing read or written outside the workspace) naming the offender and the cure, and a rerun after the cure completes staging plus the move to the AM-36 end state

#### Scenario: AM-39 non-staging paths are unaffected
- WHEN a change has zero matching requirement files, or runs dry-run, or omits --changes-dir, or uses the single-file form
- THEN no staging happens, no staged-line appears, and behavior is byte-identical to before
