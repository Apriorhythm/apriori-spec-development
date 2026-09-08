# Requirement — change-projection (v2)

change: change-projection
target lineage: **v3 branch** (independent lineage; never merge to main or v2). Ships as apriori-cli **3.1.0** (minor, backward compatible; `package.json` version bumps to 3.1.0 at release).

> v2 handling notes (P2): REQ-1 accepted → §CAS now fixes syntax, algorithm, sentinel, and a new `apriori stamp` subcommand. REQ-2 accepted → §Deprecated-block rule decides Q2 for ALL verify forms. REQ-3 accepted → §Transaction defines the four-phase algorithm and scopes the guarantee wording per §4.8 discipline. REQ-4 accepted → §Rerun surface. REQ-5 accepted → §Validation. REQ-6 accepted → §CLI contract tables. REQ-7 accepted → §Delta hygiene guards, incl. a new duplicate-requirement-name conflict in BOTH delta and store texts. ADV-1 batch acknowledged; wording fixed throughout (requirement names not "IDs"; exact `apriori/changes/archive/` path; V1 scoped to unique projected IDs).

## Background — the problem (current state A)

STEP5's deterministic gate (`apriori verify`) can only scan **on-disk spec targets**. During STEP5 the change's delta specs are not yet merged into the living store, so today an agent must choose between two wrong targets:

1. Scan only `apriori/specs/` (the living store) → the change's new scenarios are invisible; new tests show as ORPHAN.
2. Scan both `apriori/specs/` and `apriori/changes/<name>/specs/` → correct only for pure-ADDED deltas. A **MODIFIED** block appears in both dirs → duplicate scenario IDs → GAPS; a **REMOVED** requirement still demands its store scenarios; a **RENAMED** requirement demands both old and new IDs.

Separately, `apriori archive` is a single-file primitive (`--store <file> --delta <file>`): a multi-module change needs one invocation per module, with no cross-module dry-run and no atomicity across modules. And a delta records nothing about the store state it was authored against, so a store that changed since branching merges silently (§4.11's serialize rule has no tooling).

## Goal (target state B)

Three consumer surfaces of the **same `merge()` pure function** (exported by `lib/archive-merge.js`):

1. **Projected verify** — `apriori verify --change <name>`: construct the candidate post-merge store ("projection") by applying the change's delta specs to the living store **in memory** (never writing to the living store's location), and bind scenarios against that projection. Verify and archive share one merge semantics: what verify proved is exactly what archive will produce.
2. **High-level archive** — `apriori archive --change <name>`: auto-discover every delta spec under the change dir, map each to its store target, dry-run the whole set by default, and on `--write` commit with the transaction semantics of §Transaction.
3. **CAS base stamp** — a delta may declare the store state it was authored against; both projected verify and archive detect a store that has since diverged and refuse instead of merging/projecting silently.

## Mapping convention (shared by 1 and 2)

`apriori/changes/<name>/specs/<suffix>` ↔ `apriori/specs/<suffix>` — the path suffix after `specs/` is the key; only `.md` files participate. The mapping is injective by construction (one delta file per suffix). A suffix with no store counterpart targets a **new** store file (legal: first spec of a new module).

## CAS base stamp — concrete definition (REQ-1)

- **Syntax:** exactly one line `<!-- apriori-base: sha256:<64 lowercase hex> -->` or `<!-- apriori-base: new -->`, appearing **before the first `## <OP> Requirements` section** of a delta file. More than one stamp line in a file, or a stamp after the first section heading, or a malformed digest → the file is malformed (§Delta hygiene).
- **Fingerprint:** SHA-256 (Node stdlib `crypto` — zero-dep constraint holds) over the target store file's contents with line endings normalized before hashing (`\r\n` → `\n`, lone `\r` → `\n`); digest rendered as 64 lowercase hex chars. `new` = the store file does not exist.
- **Check points:** `verify --change`, `archive --change`, and single-file `archive --store/--delta` all check the stamp when present. Absent stamp = no check (opt-in; pre-3.1 deltas unaffected).
- **Mismatch behavior:** the command names the module (store path), expected vs actual fingerprint, and refuses — `verify --change` exits 2 (no trustworthy projection), `archive` exits 1 (a conflict per its existing taxonomy: nothing written, human serializes per §4.11). A `new` stamp matches only while the store file still does not exist.
- **Stamp production:** new subcommand `apriori stamp <store-file>` prints the complete stamp line for the file's CURRENT content (absent file → `<!-- apriori-base: new -->`); exit 0; no argument → usage, exit 2. The runbook's delta-authoring instructions reference it (delta authors never hand-compute digests).

## Deprecated-block rule (REQ-2 — decides former Q2, one rule for ALL verify forms)

A requirement block whose heading line carries the `_deprecated (superseded by …)_` marker is a **deprecated block**.

- **Verify (all forms, including plain `--specs` runs):** scenarios inside deprecated blocks are **excluded from collection** — not demanded, not listed as scenarios. A test still tagged with such a scenario's ID counts as **ORPHAN** (fail-closed: forces deletion of tests for removed behavior). This is a declared behavior change to plain verify: today deprecated scenarios are demanded forever, which would poison every post-REMOVED store — v2 fixes that inconsistency at the root.
- **Projection:** applying a REMOVED delta produces the deprecated marker in the projected text, so projected verify excludes those scenarios by the same rule — V3 becomes a corollary, not a special case.

## Transaction semantics for `archive --change --write` (REQ-3)

Four phases; the guarantee is **failure-atomicity up to the commit point** — crash-durability (fsync) is explicitly NOT claimed (§4.8: wording scoped to what tests exercise).

1. **Preflight (no writes):** discover delta files, validate change name + containment (§Validation), parse every delta (§Delta hygiene per-file guards), CAS-check every stamped file, run every module's `merge()` in memory. ANY failure → report ALL failures across all modules, write nothing; exit 2 for usage/validation/CAS-on-verify-style infra, exit 1 for merge conflicts/CAS mismatch/malformed deltas (archive taxonomy).
2. **Stage:** write every result to `<store>.tmp-archive`. Any staging failure → delete all tmp files, stores untouched, exit 1.
3. **Commit:** rename each tmp → store in sorted path order (each rename atomic per file). A mid-commit failure stops the sequence and reports exactly which modules committed, which did not, and which tmp files remain (for manual completion); exit 1. No rollback of already-committed renames is attempted (a rollback that half-fails is worse than an honest report).
4. **Move (only when `--changes-dir` was explicitly passed):** after ALL stores committed, move the change dir to `<changes-dir>/archive/<stamp>-<name>/`. Move failure → stores stay committed, exit 1 with message; a rerun completes via §Rerun surface.

The single-file form (`--store` + `--delta`) keeps its 3.0.1 ordering and behavior unchanged.

## Rerun surface (REQ-4)

- After a fully successful archive (stores committed + dir moved): the in-flight dir is gone → `archive --change <name>` rerun exits 2 "not found under <path>" — it never searches `apriori/changes/archive/` and never silently no-ops.
- Rerun with the in-flight dir still present (dry-run repeats; post-commit move failure; archive without move): per-operation idempotency —
  - ADDED with identical content → no-op (existing).
  - RENAMED source-gone + target-present → no-op (existing).
  - MODIFIED → re-applies (same delta ⇒ same store bytes; reported as modified) (existing).
  - **NEW:** REMOVED whose target is gone but whose deprecated form `<name>  _deprecated (superseded by <THIS change>)_` exists in the store → no-op "already deprecated". Deprecated by a DIFFERENT change → conflict (real §4.11 collision). This extends `merge()`'s rerun signatures; without it, phase-4 move-failure reruns of REMOVED-bearing deltas would always conflict.

## Validation (REQ-5)

Both new surfaces validate BEFORE any read, write, or move: the change name must match bare kebab-case (`CHANGE_NAME_RE`), and every resolved path (change dir, each delta file, each mapped store target) must resolve strictly inside its root (change dir inside the changes dir; store targets inside `apriori/specs/`). Any violation → exit 2, nothing written or projected.

## CLI contract (REQ-6)

**`apriori verify` with `--change <name>`**

| Aspect | Contract |
|---|---|
| Allowed flags | `--test-cmd`, `--id-pattern`, `--cwd`, `--json` |
| Rejected | `--specs` together with `--change` → exit 2 ("the projection defines the spec set") |
| Roots | store `<cwd>/apriori/specs`, change `<cwd>/apriori/changes/<name>` (resolution as `apriori status`; `--cwd` moves both) |
| `--json` | adds a `projection` field: `{ change, modules: [store-relative suffixes], conflicts: [] }`; non-`--change` runs keep the 3.0.1 shape byte-identical |
| Exit | 0 projection GREEN · 1 gaps · 2 untrustworthy (incl. merge conflicts, CAS mismatch, malformed delta, zero delta files, nonexistent change, validation failure) |

**`apriori archive` with `--change <name>`**

| Aspect | Contract |
|---|---|
| Allowed flags | `--write`, `--changes-dir <dir>` |
| Rejected | `--store` or `--delta` together with `--change` → exit 2 |
| Discovery root | `<changes-dir>/<name>/specs/` where `--changes-dir` defaults to `apriori/changes` (the flag sets BOTH discovery root and move root — one knob) |
| Store root | `apriori/specs/`, relative to process cwd |
| Move | on `--write` and only when `--changes-dir` was EXPLICITLY passed (unchanged gate-④ sequencing; default invocation writes stores only) |
| Exit | 0 merged (incl. all-no-op rerun) · 1 conflicts / CAS mismatch / malformed or zero-op delta / stage- or commit- or move-failure · 2 usage / invalid or escaping name / change dir not found |
| Single-file form | `--store`+`--delta` unchanged (3.0.1 behavior, plus the CAS check when a stamp is present) |

**`apriori stamp <store-file>`** — new subcommand; see §CAS. Appears in `apriori --help` usage text.

## Delta hygiene guards (REQ-7)

Per delta file, checked in preflight for BOTH projected verify and high-level archive:

- Empty or whitespace-only `.md` file under `<change>/specs/` → error naming the file (junk is never silently skipped).
- Content-bearing file parsing to zero operations → error naming the file (inherits the 3.0.1 zero-op guard, now per file across the set).
- Malformed or duplicated base-stamp line (§CAS) → error naming the file.
- Duplicate `### Requirement:` names within one delta file — same section or across sections (e.g. ADDED and MODIFIED both carrying `Foo`) → conflict naming the requirement.
- **NEW (corruption guard):** duplicate requirement names detected in the STORE text during any `merge()` → conflict (today `parseRequirements`' Map silently keeps the last block).
- Non-`.md` files under `specs/` are ignored (consistent with existing directory scanning).
- Zero delta files discovered → `verify --change` exit 2; `archive --change` exit 2 — both naming the searched path.

Any guard firing anywhere → the whole run refuses (no partial projection, nothing written).

## Acceptance criteria (testable)

**Projected verify**
- V1. If a change contains an ADDED-only delta for module M with unique projected scenario IDs, then `verify --change <name>` reports the new scenarios alongside all existing store scenarios with no duplicate-ID error (real duplicate IDs in the projection remain GAPS).
- V2. If a delta MODIFIES requirement R (changing its scenario set), verification demands exactly the delta's version of R's scenarios; dropped scenarios are not demanded.
- V3. If a delta REMOVES requirement R, R's scenarios are excluded per §Deprecated-block rule; a lingering test tagged with a removed scenario's ID is reported ORPHAN.
- V4. If a delta RENAMES requirement Old→New, verification demands exactly the projected (post-rename) picture.
- V5. If any module's merge reports a conflict, `verify --change` exits 2 naming every conflict — never verifies a partial or wrong projection.
- V6. A nonexistent change name, invalid/escaping name, zero delta files, or any §Delta hygiene failure → exit 2 with a message naming the offending path/file.
- V7. Without `--change`, `verify` output and exit behavior are byte-identical to 3.0.1 — including on stores containing deprecated blocks ONLY where no deprecated blocks exist; where they exist, the §Deprecated-block rule applies (the one declared behavior change).
- V8. Exit taxonomy preserved: 0 GREEN · 1 gaps · 2 untrustworthy.

**Deprecated-block rule**
- D1. A store (or projection) containing a deprecated block: its scenarios are neither demanded nor listed; tests tagged with them are ORPHAN; all other blocks unaffected.

**High-level archive**
- A1. `archive --change <name>` (dry-run default) discovers all delta files, prints per-module merged/modified/deprecated/renamed/no-op requirement names and a result line, and writes nothing.
- A2. `archive --change <name> --write` follows §Transaction: any preflight/stage failure → no store file changed; commit phase is per-file atomic renames with an exact per-module report on mid-commit failure.
- A3. Zero delta files → exit 2 naming the searched path.
- A4. Move semantics per §Transaction phase 4: only with explicit `--changes-dir`, only after all stores committed, to `<changes-dir>/archive/<stamp>-<name>/`.
- A5. The single-file form keeps 3.0.1 behavior unchanged (plus CAS when stamped).
- A6. Rerun behavior exactly per §Rerun surface, including the new REMOVED rerun signature.

**CAS**
- C1. Stamp syntax/position/uniqueness per §CAS; violations are per-file hygiene errors.
- C2. Stamped file + diverged store → refusal naming module, expected and actual fingerprints; `verify --change` exit 2, `archive` exit 1, nothing written/projected.
- C3. Absent stamp → behavior identical to pre-3.1 (opt-in).
- C4. `new` stamp matches only a still-absent store file; once the store exists, it is a mismatch.
- C5. `apriori stamp <store-file>` prints the exact line that will match the file's current content; absent file → the `new` form; output usable verbatim at the top of a delta.

**Cross-cutting**
- X1. All new behavior covered by spec scenarios with stable IDs + bound TAP tests; the change's own delta specs verified via `verify --change change-projection` (dogfood) before archiving.
- X2. No new dependencies (Node stdlib only; `crypto` is stdlib).
- X3. Existing tests keep passing unmodified except where a spec is deliberately extended — any such modification is listed in the delta.

## Out of scope (won't do in this change)

- `apriori doctor`, `apriori gate --change` (roadmap items 4-5).
- `--help`/unknown-flag strictness across subcommands (roadmap item 6) — the new forms reject only the combinations listed in §CLI contract.
- Change Bundle layout, non-reusable change IDs, approval digests, executable state machine (roadmap 13-15).
- Any behavior change to `check`, `init`, `new`, `status`, `update`.
- Auto-writing base stamps into deltas at authoring time (`apriori stamp` prints; the author pastes).
- Crash-durability (fsync) guarantees for archive writes — explicitly not claimed, per §4.8 guarantee-claim discipline.

## Open questions

None — Q1 (projection mechanics: in-memory vs temp files) remains an implementation choice for STEP2's design doc; the observable behavior is fully constrained above.
