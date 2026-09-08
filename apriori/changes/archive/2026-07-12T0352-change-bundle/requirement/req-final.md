# Requirement — change-bundle (v3)

change: change-bundle
target lineage: **v3 branch**, major **4.0.0**. The bundle layout REPLACES the scattered per-change locations (single layout, no dual support); the Node floor rides along (18→22). Revisions vs v2 (P1 r2): CB-2 P5 raw aliases enumerated; CB-7 CK-10 traversal containment; CB-8 spike stays executor protocol (command never touches it); CB-9 trivial-tier n/a preserved. Vs v1 (P1 r1): CB-1 check/CK-10 in scope; CB-2 the legacy-stem migration table; CB-3 the atomic-flip invariant; CB-4 exact normalization classes; CB-5 the strip-scan negative; CB-6 release-state acceptance; CB-ADV-1 CI jobs + comment hygiene. Owner decisions (2026-07-12, verbatim): "可以,我决定做B"; "直接切 4.0.0 版本算了"; the 3.0 layout-promise wording does not appear in v4; no migration guide ships; Node floor included; no default-branch switch.

## Background — the problem (current state A)

Per-change artifacts are scattered across FIVE locations: `requirement/` and `spike/` pollute the consumer's project root (outside `apriori/` entirely); `apriori/review/`, `apriori/design/`, `apriori/explore/` are flat dirs where the `<change>-` filename prefix acts as a poor man's directory. Consequences: the P5 doc lives in `design/` while its raw lives in `review/` (split evidence); archival needed a dedicated staging phase (req-sweep) just to carry requirement history; both GPT-5.6 reviews flagged the global-path class. Owner verdict: evidence belongs to its change ("review 感觉单独出来不好,放在具体所属的 changes 文件夹里面比较好,design也是,另外 explore 的文件夹感觉也不太对").

## Goal (target state B)

**The bundle — the ONLY layout:**
```
apriori/changes/<name>/
├── flow-state.md
├── requirement/            # req-v{N}.md · req-final.md · intent-card.md — PLAIN names (the dir is the identity)
├── gap-report.md           # was apriori/explore/<name>-gap-report.md
├── proposal.md · design.md · tasks.md
├── specs/<module>/spec.md
├── review/                 # issues.md · req-review-v{N}.md · spec-review-v{N}.md · step5-review-v{N}.md
│                           #   · extraction-review-v{N}.md · <stem>-raw.* (C5 stem rule unchanged)
└── spike/                  # explore track; deleted/quarantined at archive as before
```
The P5 spec evaluation moves INTO `review/` beside its raw. Top-level `requirement/`, `spike/`, `apriori/review/`, `apriori/design/`, `apriori/explore/` cease to exist as concepts — no protocol text instructs writes there, no CLI code reads them.

**CLI changes (single-path, no layout detection anywhere):**
- `gate` C4: ledger at `<changeDir>/review/issues.md`. C5: evidence scan over `<changeDir>/review/` only (docs and raws together; the stem→`<stem>-raw.*` rule unchanged). Works identically at both stages because the evidence travels with the dir.
- `status`: ledger lookup at the bundle path.
- `archive --change`: the req-sweep staging phase (3.5) is DELETED — the bundle is inside the moved dir by construction; the atomic move carries everything.
- `apriori new`: scaffolds `flow-state.md` plus empty `requirement/` and `review/` dirs; the next-action line names `apriori/changes/<name>/requirement/req-v1.md`.
- `init`: stops pre-creating `apriori/review/` (nothing requires an empty dir).
- `check` (CB-1): CK-10's secret tripwire re-roots — it scans every `review/` dir under `apriori/changes/*/` AND `apriori/changes/archive/*/` (recursive, regular-files-only, symlink warn-skip, absent-dir skip — semantics unchanged, roots new). Root discovery is itself guarded (CB-7): each discovered change dir and its `review/` must realpath-resolve inside the changes root; escaping/symlinked dirs are warn-skipped exactly like symlinked files today, and the acceptance set covers an escaping bundle `review/`. Acceptance covers a secret planted in a bundle raw.
- `verify --change` / `doctor`: untouched (they read specs/deltas/flow-state, which never moved).
- **Node floor**: `engines.node >= 22`; CI matrix drops 18/20 (keep 22 + 24 across both OSes); `scripts/run-tests.mjs` stays as is.

**Docs (both editions + concepts):** the runbook artifact table rewritten to bundle paths; every path mention (P0, P1-P12 prompts, STEP0/1/6, goal recipes, the artifact-root comment) updated; STEP6 carries NO preservation/staging text (the move carries the bundle — full stop); concepts mirrors incl. its §7.0 ledger-path mentions. The 3.0 stability-promise sentence is REWRITTEN wherever it appears (CHANGELOG header, any README/docs echo): the v4 promise covers CLI surface & flags, `--json` shapes, the delta format, and the flow-state schema — the layout clause is dropped (owner decision).

**The atomic-flip invariant (CB-3):** the CLI/test flip to bundle-only paths, the doc rewrite, AND this repo's artifact migration land as ONE task boundary (one commit): after it, `gate --change change-bundle`, `status`, `check --self`, and the corpus checks run green on bundle paths; before it, nothing has flipped. No intermediate state exists in history.

**Migration table (CB-2/CB-4 — exact, per legacy class; collisions abort the script for hand resolution, no overwrites):**
| legacy | bundle target |
|---|---|
| `apriori/review/<name>-issues.md` | `review/issues.md` |
| `apriori/review/<name>-req-review-vN(.md/-raw.*)` | `review/req-review-vN(.md/-raw.*)` |
| `apriori/design/<name>-review-vN.md` | `review/spec-review-vN.md` |
| its raw aliases: `apriori/review/<name>-review-vN-raw.*` OR `<name>-step2-review-vN-raw.*` (CB-2; both present → abort) | `review/spec-review-vN-raw.*` |
| `apriori/review/<name>-{impl,p8,step5}-review-vN(.md/-raw.*)` | `review/step5-review-vN(.md/-raw.*)` |
| `apriori/review/<name>-extraction-review-vN(…)` | `review/extraction-review-vN(…)` |
| any other `apriori/review|design/<name>-X` (e.g. `kb-check-raw.txt`) | `review/X` (prefix stripped, basename kept) |
| `apriori/explore/<name>-gap-report.md` | `gap-report.md` (bundle root) |
| archived `requirement/<name>-req-vN.md` · `requirement-req-vN.md` (hand-copies) | `requirement/req-vN.md` |
| same for `-req-final` / `-intent-card` | `requirement/req-final.md` / `requirement/intent-card.md` |
| anomalies (e.g. `README-req-v1-lost.md`) | `requirement/<basename unchanged>` — historical oddities keep their names |
Post-migration uniqueness check per bundle: duplicate targets abort (none expected; the script verifies).

**Self-migration (this repo, part of the change — the script is a session artifact, NOT shipped):**
- All archived changes' evidence moves from `apriori/review|design/` into `archive/<stamp>-<name>/review/` with the `<name>-` prefix stripped from basenames; existing archived `requirement/` subdirs' files and old hand-copied `requirement-req-*.md` normalize to plain names inside `requirement/`; any `apriori/explore/<name>-gap-report.md` moves to the bundle root as `gap-report.md`.
- **change-bundle migrates ITSELF mid-flight**: born on the old layout, its own requirement docs and review evidence move into its bundle during implementation, and it finishes + archives on the new layout — the live proof.
- After migration the legacy dirs are EMPTY and removed; `apriori/.gitignore`'s repo-level ignore rules (this repo's own) adjust if needed.

## Acceptance criteria (testable)

- O1. A bundle change passes the full loop: gate C4/C5 read `<dir>/review/` (ledger, docs, raws) at BOTH stages; missing-ledger and missing-raw failure modes report the bundle paths — and C4's trivial-tier rule is PRESERVED (CB-9): absent `<dir>/review/issues.md` → n/a on `tier: trivial`, blocked naming that exact path otherwise.
- O2. `archive --change --write --changes-dir` carries the entire bundle in the atomic move (requirement/, review/, gap-report.md — whatever is present) with no staging lines and no post-commit writes; the AM-36..39 staging tests are REWRITTEN to bundle-travel semantics (their intent — history travels — preserved). `spike/` disposition stays EXECUTOR protocol (CB-8): the runbook keeps 'delete or quarantine spike/ BEFORE running the archive action' — the command is track-agnostic, never deletes anything, and the no-post-commit-writes claim holds untouched.
- O3. `apriori new x` creates flow-state + `requirement/` + `review/`, and its next-action names `apriori/changes/x/requirement/req-v1.md`; no legacy-path literal is emitted.
- O4. `status` reports ledger items from the bundle path.
- O5 (CB-5, strip-scan — mechanically airtight): in RUNBOOK.md/RUNBOOK_cn.md/docs/concepts{,_cn}.md, after stripping every bundle form (`changes/<change>/…`, `changes/<name>/…`, and concrete `changes/x/…` examples), ZERO occurrences remain of `apriori/review/`, `apriori/design/`, `apriori/explore/`, `requirement/`, `spike/` — the five legacy roots vanish as standalone paths while every legitimate mention (inside bundle paths) survives the strip.
- O6. `init` no longer creates `apriori/review/`; `engines.node` is `>=22`; EVERY `setup-node` in CI (test matrix, golden-path, python-example jobs) runs 22 or 24 — none below (CB-ADV-1).
- O7. This repo's tree post-migration: `apriori/review`, `apriori/design`, `apriori/explore`, top-level `requirement/` no longer exist; every archived change is a complete bundle; GT-15-class corpus checks read bundle paths; suite + verify --change + gate + check --self green; post-archive gate PASS on this change itself.
- O8. The v4 stability sentence appears without the layout clause wherever the promise is stated.
- O9 (CB-6). `package.json.version` is exactly `4.0.0` at release; the CHANGELOG 4.0.0 entry states the bundle layout change and the Node >=22 floor; the atomic-flip commit precedes (or is) the release commit — no 3.x version ever ships bundle-only code.
- O10 (CB-1). A secret literal planted in a bundle raw (active or archived) trips CK-10 exactly as it did in the flat layout; init/update code comments no longer describe legacy `review/` ownership (CB-ADV-1).

## Out of scope

- Dual-layout support, layout detection, migration tooling/guides (owner: none needed).
- specs/ and truth/ (cross-change stores stay top-level by design).
- The delta format, flow-state schema, managed.json scope, --json shapes (unchanged).
- Default-branch switch (owner: no).

## Decisions proposed

- DD-1: plain filenames inside the bundle — the directory carries the identity; prefixes were a flat-dir workaround.
- DD-2: the P5 doc lives in `review/` — evidence and its raw belong together; `design/` ends as a concept.
- DD-3: single layout with a one-time self-migration — no detection code, no compat debt; the major version IS the disclosure.
- DD-4: `new` scaffolds the two empty dirs — cheap guidance; no behavior depends on their existence.
- DD-5: Node floor rides the major (semver economics: majors are expensive; the floor bump is one line + CI simplification).
