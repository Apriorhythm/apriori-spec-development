# Requirement — cas-enforcement (v1)

change: cas-enforcement
target lineage: **v3 branch**. Next patch/minor. Graded tightening of CAS base-stamp enforcement: warnings this minor, gate default-deny, an explicit escape, and the rerun dead-end fixed; hard mandatory stamps wait for 4.0.

## Background — the problem (current state A, code-verified + dogfooded)

1. **Opt-in CAS.** `<!-- apriori-base: … -->` stamps are optional: an UNSTAMPED delta merges with zero divergence detection (truth/archive-merge.md pitfall, declared). A MODIFIED/REMOVED/RENAMED delta authored against a stale store silently rewrites blocks that changed underneath it — exactly the §4.11 concurrent-edit hazard CAS was built for, still open for anyone who forgets `apriori stamp`. (GPT-5.6 second review: CAS optionality claim.)
2. **The rerun dead-end (dogfooded 2026-07-11, delta-consumption self-archive).** A STAMPED delta that already COMMITTED (stores rewritten) cannot re-run to complete the move phase: the store now differs from the recorded base → preflight `casMismatches` → exit 1. The only cure was a manual `mv`. The idempotent-rerun feature (3.0.1) and CAS (3.1) contradict each other on this path.

## Goal (target state B)

**Graded enforcement:**
- **WARN (both surfaces, always on):** during projection/preflight, each delta that carries MUTATION ops (MODIFIED/REMOVED/RENAMED — ADDED-only deltas exempt: they conflict rather than clobber) and has NO stamp emits one warning naming the file and the cure: `unstamped mutation delta <file> — divergence undetectable; run: apriori stamp <store-file> (stamps become mandatory in 4.0)`. `verify --change` prints it to stderr (still GREEN-able); `archive` prints it in the report. Machine surface: `buildProjection` returns the new `unstampedMutations[]`; verify `--json` carries it.
- **Gate default-deny:** a new C7 check: any `unstampedMutations` in the change's projection → BLOCKED naming each file and the stamp cure. Escape: `--no-cas` flag on `gate` (recorded in the gate output line so the packet shows the waiver was used: `C7 waived (--no-cas)`), or a `cas: optional` row in `process-config.md` (project-level, human-held). CI (which runs gate) therefore denies by default.
- **Rerun repair (archive):** when preflight finds a stamp mismatch BUT applying the delta to the CURRENT store is a COMPLETE no-op (every op reports `unchanged` — the already-merged rerun signature), the mismatch downgrades to a note (`stamp mismatch but the delta is already fully applied — rerun accepted`) and archive proceeds (including the move phase). A mismatch with ANY real pending op still fails exactly as today. This closes the dogfooded move-only dead-end without weakening divergence protection: divergence + real changes = still fatal.

**Out of the confusion matrix (unchanged):** stamped+matching → merge; stamped+mismatch+real-ops → fail; unstamped ADDED-only → quiet; `new` sentinel semantics untouched.

## Acceptance criteria (testable)

- J1. An unstamped MODIFIED delta: `verify --change` warns on stderr (run still classifiable GREEN), `archive` warns in its report, `--json` carries `unstampedMutations` — and the merge itself still happens (WARN grade, not deny).
- J2. An unstamped ADDED-only delta: no warning anywhere (exempt class).
- J3. `gate --change`: unstamped mutation delta → C7 BLOCKED naming the file; with `--no-cas` → C7 explicitly reports the waiver and does not block; with `cas: optional` in process-config → same, naming the config source.
- J4. Rerun repair: a stamped delta whose commit already applied (all ops `unchanged`) re-runs `archive --write --changes-dir` to completion — stores byte-identical, change dir MOVED, exit 0, the downgrade note printed; the same stamped delta with one real pending op still exits 1 with the mismatch.
- J5. The gate spec/truth docs record C7; the runbook's §4.11/serial-rule text mentions the graded enforcement and the 4.0 trajectory (one sentence per edition).
- J6. All existing tests pass (AM-24/25 stamp semantics unchanged for the non-rerun paths); suite + verify + gate + check --self green; post-archive gate PASS.

## Out of scope

- Hard-mandatory stamps (4.0: floor bump + default-deny everywhere).
- Stamping tooling changes (`apriori stamp` already exists).
- The `new` sentinel and fingerprint algorithm.
- Multi-delta transactional stamping order.

## Decisions proposed

- DD-1: ADDED-only deltas exempt from the warning — an ADDED colliding with an existing name already conflicts (or no-ops on rerun); it cannot silently clobber content.
- DD-2: the rerun repair keys on ALL-ops-unchanged, not on "move phase pending" — it is the semantic signature of "already applied", robust to any interruption point, and never fires when real work is pending.
- DD-3: `--no-cas` waives C7 only (never the preflight mismatch failure) and surfaces in the gate output — a waiver that hides itself is not a waiver.
- DD-4: config spelling `cas: optional` (a process-config row, human-held like caps) — the project-level twin of the per-run flag.
