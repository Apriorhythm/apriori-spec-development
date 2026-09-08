# Requirement — req-sweep (v1)

change: req-sweep
target lineage: **v3 branch**. Patch (3.4.2): `archive --change` itself sweeps the change's requirement-stage files into the archived dir — the STEP6 preservation clause stops being executor discipline and becomes command behavior. Additive only; no frozen surface moves.

## Background — the problem (current state A)

3.4.1's STEP6 preservation clause is protocol TEXT: the executor (the agent) must remember to copy `requirement/<change>-req-*.md` into the archived change dir before the closeout commit. Owner verdict (2026-07-12, verbatim): the whole flow must be AI- or command-executed — "归档这种事情,在 OpenSpec 里面都是 opsx:archive 执行的,我们总不能退回手工". A remember-to-do-it step is the weakest form even with an AI executor. The 3.4.1 prefix is exactly what makes automation safe: `requirement/<change>-*.md` is machine-attributable to its change with zero ambiguity (the pre-3.4.1 global names were not).

## Goal (target state B)

**`archiveChange` phase 4 (the move phase, `changesDirExplicit` only):** after the change dir moves, the command MOVES every file matching `requirement/<change>-req-*.md` plus `requirement/<change>-intent-card.md` from the artifact root's `requirement/` dir into `<archived-dir>/requirement/` (dir created on demand, basenames preserved). Move, not copy — archival clears the live dir; the requirement history has exactly one home. Rules:
- Matching is EXACT-prefix on the change name (`<change>-req-v*.md`, `<change>-req-final.md`, `<change>-intent-card.md`) — never a loose prefix that could swallow another change's files (change `a` must not sweep `a-b`'s files; the fixed suffixes prevent it).
- Zero matches → silent no-op (trivial-tier changes may have no formal req docs). Missing `requirement/` dir → no-op.
- The sweep happens AFTER the store commits and the dir move succeed; a sweep failure (e.g. a locked file) is reported per file but NEVER fails the archive (exit stays 0; the report names what was left behind and where it belongs) — the stores and the move are already durable, and a copyable leftover is strictly better than a failed archive.
- The single-file form (`--store/--delta`) has no change dir and does not sweep. Without `--changes-dir` (no move), no sweep — same gating as the move itself.
- Where is `requirement/`? Resolved against cwd (`<cwd>/requirement/`), matching how the runbook's artifact-root convention places it beside `apriori/` (same resolution the change dir uses). `artifact-root` overrides are out of scope (the CLI has never parsed that flow-state field; the sweep uses cwd like every other archive path).
- Sweep results appear in the report (`swept: <n> requirement file(s) → <dest>` or per-file leftover warnings).

**Runbook STEP6 (both editions):** the preservation clause is REWRITTEN — the archive action performs the sweep automatically; the executor's only residual duty is to include the swept files in the closeout commit. PR-19's STEP6 anchors updated accordingly (destination stays; "before the closeout commit" timing language becomes the automatic-sweep statement).

## Acceptance criteria (testable)

- M1. A change with `requirement/<change>-req-v1.md`, `-req-v2.md`, `-req-final.md`, `-intent-card.md` archives with `--changes-dir`: all four land in `<archived>/requirement/`, the live `requirement/` no longer has them, exit 0, report names the sweep.
- M2. Exact attribution: with changes `a` and `a-b` both having req files, archiving `a` sweeps only `a-req-*`/`a-intent-card.md` — `a-b-*` untouched.
- M3. Zero req files → archive behaves exactly as today (no sweep line, exit 0). No `--changes-dir` → no sweep. Single-file form → no sweep.
- M4. Injected sweep failure (DI ops seam): archive still exits 0, stores committed, dir moved, and the report names the left-behind file and its intended destination.
- M5. Runbook STEP6 EN/CN states the automatic sweep (PR-19 anchors updated and green); the executor-copy instruction is gone.
- M6. All existing tests pass; suite + verify --change + gate + check --self green; post-archive gate PASS; THIS change's own archive demonstrates the sweep (its req docs arrive automatically).

## Out of scope

- Change Bundle (4.0 candidate — this change removes its last standing rationale; agenda cleanup is the owner's call).
- Sweeping review/design/raw evidence (they are change-prefixed too but live in apriori/review|design/ which gate C5 consumes in place — moving them would break C5's archived-stage checks).
- `artifact-root` flow-state overrides (never parsed by the CLI; unchanged).

## Decisions proposed

- DD-1: MOVE not copy — one home for history, live dir stays clean; the executor's closeout commit picks up both sides of the move atomically in git terms.
- DD-2: sweep failure never fails the archive — durability of stores/move outranks tidiness; the report keeps the human/agent informed.
- DD-3: fixed-suffix exact matching (`-req-v*`, `-req-final`, `-intent-card`) — immune to the `a` vs `a-b` prefix trap by construction.
