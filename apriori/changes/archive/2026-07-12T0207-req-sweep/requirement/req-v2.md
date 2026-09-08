# Requirement — req-sweep (v2)

change: req-sweep
target lineage: **v3 branch**. Patch (3.4.2): `archive --change` itself carries the change's requirement-stage files into the archive — the STEP6 preservation clause becomes command behavior. Additive only; no frozen surface moves.

Revisions vs v1 (P1 r1), r2 amended in place (RS-1: matching symlinks now fail-before-move, DD-4 rewritten): RS-2 drove a REDESIGN — requirement files are STAGED INTO the change dir BEFORE the move, so the existing atomic rename carries them (the post-move sweep and its unrecoverable-failure window are gone); RS-1 containment/symlink rules specified fail-closed; RS-3 exact basename regexes; RS-4 intent-card-only acceptance; RS-ADV-1 explicit --write, stable report wording, PR-19 negative anchor.

## Background — the problem (current state A)

3.4.1's STEP6 preservation clause is executor TEXT: the agent must remember to copy `requirement/<change>-req-*.md` into the archived dir. Owner verdict (verbatim, 2026-07-12): the flow must be AI- or command-executed — "归档这种事情,在 OpenSpec 里面都是 opsx:archive 执行的,我们总不能退回手工". The 3.4.1 prefix makes automation safe: the files are machine-attributable with zero ambiguity.

## Goal (target state B)

**`archiveChange` phase 4 gains a STAGING step (changesDirExplicit + --write only), ordered BEFORE the dir move:**
1. (existing) stores committed — phase 3 unchanged.
2. **NEW — requirement staging:** every file in `<cwd>/requirement/` whose basename matches one of EXACTLY three anchored patterns (change name regex-escaped; RS-3) — `^<change>-req-v[0-9]+\.md$` · `^<change>-req-final\.md$` · `^<change>-intent-card\.md$` — is renamed into `changes/<name>/requirement/<same basename>` (dir created on demand). Near-misses (`<change>-req-vdraft.md`, `<change>-req-v1-notes.md`, `a-b-req-v1.md` when archiving `a`) never match by construction.
3. (existing) the atomic dir move to `archive/<stamp>-<name>/` — now carrying `requirement/` inside it. No post-move writes exist at all.

**Fail-closed rules (RS-1):** before ANY staging read or rename: the source `requirement/` dir, if present, must realpath-resolve inside cwd; each candidate must be a REGULAR file by lstat — a MATCHING candidate that is a symlink FAILS the run before the move (M5 taxonomy: stores committed, dir in flight, message names the symlink and the cure: replace with a regular file or remove, then rerun); symlinks are never followed, and non-matching entries are simply ignored (RS-1 r2); the staging destination `changes/<name>/requirement/` must pass `containsReal` under the changes dir (the change dir itself already did). Escapes are reported and the run STOPS before the move (see failure rule) — never a write outside the workspace.

**Failure rule (RS-2, replaces v1's DD-2):** a staging failure (rename error, containment stop) aborts BEFORE the move: exit 1, `stores committed but requirement staging failed: <file> — rerun to complete` (the existing move-failure taxonomy). The rerun WORKS by construction: stores re-verify as already-applied (the 3.4.0 rerun-repair signatures), already-staged files are no longer in `requirement/` (no-op), the failed file retries, then the move runs. No success-with-leftovers state exists.

**Reruns and edge cases:** zero matches → silent no-op (M3); a change whose ONLY artifact is the intent card stages just it (RS-4/M4); dry-run and the single-file form never stage; a rerun after a MOVE failure finds the files already inside the change dir — staging no-ops and the move retries.

**Report (stable wording, RS-ADV-1):** `staged: <n> requirement file(s) → changes/<name>/requirement/` on success (absent when n=0). No warning class exists: matching symlinks fail the run, non-matching entries are ignored (RS-ADV-2).

**Runbook STEP6 (both editions):** the preservation clause is REWRITTEN — the archive action stages and carries the requirement history automatically; the executor's residual duty is only the closeout commit. PR-19 updated: asserts the automatic-sweep statement AND the ABSENCE of the old executor-copy instruction ("copy every"/"拷入" phrasing gone).

## Acceptance criteria (testable)

- M1. `apriori archive --change <name> --write --changes-dir apriori/changes` with `<change>-req-v1.md`, `-req-v2.md`, `-req-final.md`, `-intent-card.md` present: all four end inside `<archived>/requirement/`, the live `requirement/` no longer has them, exit 0, report carries the stable staged-line.
- M2. Exact attribution: with changes `a` and `a-b` both owning files, archiving `a` stages only `a`'s three-pattern matches; `a-b-*` and near-misses (`a-req-vdraft.md`, `a-req-v1-notes.md`) untouched.
- M3. Zero matches → no staged-line, exit 0, behavior byte-identical to today; dry-run / no `--changes-dir` / single-file form never stage.
- M4. Intent-card-only change: the card alone is staged and travels; exit 0 with the staged-line.
- M5. Injected staging failure (DI ops seam): exit 1 BEFORE the move (change dir still in flight, stores committed); the message names the file and the rerun cure; a rerun completes staging + move (end state = M1).
- M6. A MATCHING symlink in `requirement/` → exit 1 before the move naming the symlink and the cure (never followed, nothing written); a rerun after replacing it with a regular file completes; escaping destination → the same stop-before-move taxonomy.
- M7. Runbook STEP6 EN/CN states the automatic carry; the executor-copy instruction is absent (PR-19 asserts both directions).
- M8. All existing tests pass; suite + verify --change + gate + check --self green; post-archive gate PASS; this change's own archive demonstrates the staging.

## Out of scope

- Change Bundle (this change removes its last standing rationale; agenda cleanup is the owner's call).
- Sweeping review/design/raw evidence (gate C5 consumes them in place at the archived stage).
- `artifact-root` overrides (the CLI has never parsed that field; staging resolves `requirement/` against cwd like every other archive path).

## Decisions proposed

- DD-1: MOVE (rename) not copy — one home for history; the closeout commit picks up both sides.
- DD-2 (redesigned): stage-before-move — failures land in the existing rerunnable taxonomy; no post-move writes, no success-with-leftovers.
- DD-3: three anchored basename regexes — immune to prefix traps and near-misses by construction.
- DD-4 (r2, per RS-1): a MATCHING symlink hard-fails before the move — a matching name IS the attributed requirement artifact, and skipping it would silently strand the history (the exact discipline-class this change removes); the rerunnable pre-move failure keeps the archive unhostaged in the way that matters. Non-matching symlinks are ignored; nothing is ever followed.
