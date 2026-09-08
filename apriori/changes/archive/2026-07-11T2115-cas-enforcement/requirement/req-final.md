# Requirement — cas-enforcement (v2)

change: cas-enforcement
target lineage: **v3 branch**. Next patch/minor. Graded tightening of CAS base-stamp enforcement: warnings this minor, gate default-deny, an explicit escape, and the rerun dead-end fixed; hard mandatory stamps wait for 4.0.

Revisions vs v1 (P1 r1): CE-1 MODIFIED gains an already-applied `unchanged` signature; CE-2 the config escape is a real table row; CE-3 BOTH archive forms warn; CE-4 the JSON contract is exact; CE-5 the mixed partial-commit matrix is specified; CE-ADV-1 the exemption is described as clobber-focused, C7 stays its own check, --no-cas never touches verify/archive failures.

## Background — the problem (current state A, code-verified + dogfooded)

1. **Opt-in CAS.** Stamps are optional: an UNSTAMPED delta merges with zero divergence detection. A MODIFIED/REMOVED/RENAMED delta authored against a stale store silently rewrites blocks that changed underneath it. (GPT-5.6 second review.)
2. **The rerun dead-end (dogfooded 2026-07-11).** A STAMPED delta that already COMMITTED cannot re-run to complete the move phase: store ≠ recorded base → preflight fails; manual `mv` was the only cure. Root cause deepened by review: `merge()`'s MODIFIED op NEVER reports `unchanged` — even a byte-identical re-application reports `modified` — so no rerun signature exists for the most common mutation.

## Goal (target state B)

**merge() semantic extension (CE-1):** a MODIFIED op whose delta block trim-equals the current store block reports `unchanged` (the already-applied signature ADDED/REMOVED/RENAMED reruns have) instead of `modified`. Visible only on re-application; first applications behave identically.

**WARN grade (all mutation surfaces, always on):** a delta carrying MUTATION ops (MODIFIED/REMOVED/RENAMED) with NO stamp warns once, naming the file and the cure (`unstamped mutation delta <file> — divergence undetectable; run: apriori stamp <store-file> (stamps become mandatory in 4.0)`). Surfaces: `verify --change` (stderr; the run can still be GREEN), high-level `archive --change` (report), AND the single-file `archive --store --delta` form (CE-3) — one-module surgery is not a loophole. The exemption for ADDED-only deltas is CLOBBER-focused (they conflict or no-op, never silently overwrite) — documented as such, not as a general concurrency guarantee (CE-ADV-1).

**Machine contract (CE-4):** `buildProjection` returns `unstampedMutations: string[]` — the delta files' store-suffix-relative paths (the same `suffix` vocabulary `texts`/`perModule` use), `[]` when none. verify `--json` carries it at `json.projection.unstampedMutations` on `--change` runs only (the `projection` object is already absent otherwise).

**Gate default-deny (C7):** a NEW check (not folded into C6 — CAS is delta/store trust, not KB freshness): `unstampedMutations` non-empty → `C7 BLOCKED` naming each suffix and the stamp cure. Escapes, precedence flag > config:
- `gate --no-cas` → `C7 waived (--no-cas)` in the output — a visible waiver, never a silent skip.
- process-config table row `| cas | optional |` (leading token of the value cell, case-insensitive; absent row or any other value = required/default-deny) → `C7 waived (process-config cas: optional)`.
- Neither escape ever affects verify/archive behavior: stamped-mismatch failures and the WARN grade are untouched by both (CE-ADV-1/DD-3).

**Rerun repair (archive preflight, per-file — CE-5):** classification per stamped delta file:
- stamp matches → merge as today (real ops apply; this is the not-yet-committed half of a resumed partial commit).
- stamp MISMATCHES + every op reports `unchanged` → downgrade to a note (`<file>: stamp mismatch but the delta is already fully applied — rerun accepted`), file contributes no writes; the run proceeds (move included).
- stamp MISMATCHES + ANY real pending op → `casMismatches` error as today; the WHOLE preflight fails (exit 1, nothing written or moved) — divergence with real work pending is never repaired.
The mixed case (file A mismatched-but-applied + file B matching-with-real-ops) therefore completes: A noted, B merged, move happens — the resumed-partial-commit path. Diagnostics keep the two classes apart (notes vs errors).

## Acceptance criteria (testable)

- K1. Unstamped MODIFIED delta: `verify --change` warns on stderr and stays GREEN-able; `archive --change` warns in the report and still merges; `--json` carries `projection.unstampedMutations: ['<suffix>']`; the single-file archive form warns too.
- K2. Unstamped ADDED-only delta: no warning on any surface; `unstampedMutations: []`.
- K3. `gate --change` with an unstamped mutation delta: C7 BLOCKED naming the suffix; `--no-cas` → `C7 waived (--no-cas)`, not blocked; `| cas | optional |` row → waived naming the config; the flag also wins when config says required.
- K4. Rerun repair: (a) a stamped, fully-committed change re-runs `archive --write --changes-dir` to completion — stores byte-identical, dir moved, exit 0, downgrade note printed; (b) the same but one real pending op → exit 1, nothing written/moved, mismatch error; (c) mixed: applied-mismatched file + matching-with-real-ops file → completes, A noted, B merged; (d) an already-applied MODIFIED-only stamped delta (the CE-1 case) reruns clean.
- K5. Gate spec/truth record C7; the runbook's serial-rule/§4.11 vicinity mentions graded enforcement + the 4.0 trajectory (one sentence per edition); truth/archive-merge.md's opt-in pitfall paragraph updated to the graded reality.
- K6. All existing tests pass (AM-24 divergence-with-real-ops unchanged; AM-25 unstamped behavior gains only warnings); suite + verify + gate + check --self green; post-archive gate PASS.

## Out of scope

- Hard-mandatory stamps (4.0).
- Stamping tooling; the `new` sentinel; fingerprint algorithm; multi-delta transactional stamping order.

## Decisions proposed

- DD-1: ADDED-only exemption, clobber-focused and documented as such.
- DD-2: per-file all-ops-unchanged is the rerun signature; divergence with pending work never repairs.
- DD-3: `--no-cas` waives C7 only, visibly; never verify/archive semantics.
- DD-4: config escape is the table row `| cas | optional |`, read like the existing test-cmd row; flag > config.
- DD-5 (new, CE-1): MODIFIED trim-equality reports `unchanged` — the idempotence vocabulary all other ops already speak.
