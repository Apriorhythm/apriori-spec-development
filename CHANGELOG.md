# Changelog

All notable changes to `apriori-cli`. Versions follow semver; the stability promise: CLI surface & flags, `--json` shapes, the delta format and the flow-state schema only break in a major.

## 3.4.1 — 2026-07-12 · requirement paths carry their change

- **`requirement/<change>-req-v{N}.md` / `<change>-req-final.md` / `<change>-intent-card.md`** — requirement-stage paths gain the change prefix in both runbook editions, the concepts handbook, and `apriori new`'s scaffolded next-action, closing the global-path collision where parallel (or successive) changes overwrote each other's requirement history (dogfooded twice; ported from V1.4's stopgap). The root relocation (Change Bundle) remains scheduled for 4.0.
- **STEP6 preservation clause** — after the archive move and before the closeout commit, the change's requirement docs (all versions, plus the intent card if any) are copied into `apriori/changes/archive/<stamp>-<change>/requirement/`; the requirement history travels with its change.
- Already-archived changes keep their old file names (nothing parses requirement filenames). 2 new scenarios (PR-19, NW-05); 199 tests.

## 3.4.0 — 2026-07-12 · the second-review hardening release

Every item traces to the second external GPT-5.6 review (7 changes, each through the full V3 loop with adversarial codex reviews) plus one defect dogfooding found on ourselves.

- **The delta parser consumes its whole input** — `parseDeltaStrict` is a sequential line walker: misspelled section headings (`## ADDDED`), requirements/scenarios outside their legal home, and stray/duplicate/malformed CAS stamps are line-numbered problems instead of being silently re-homed into the wrong bucket; fences stay opaque; CRLF parses identically; well-formed deltas parse byte-identically (corpus-verified against every archived delta).
- **The TAP plan is a checked promise** — exactly one top-level plan allowed; plan-vs-parsed-points mismatch (truncated output) and duplicate test-point numbers are infra errors: `verify` exits 2, `gate` reports ERROR. Plan-less, skip-all (`1..0 # SKIP`), and node's nested TAP are unchanged.
- **`update` refreshes only what it can prove it owns** — `init` records what it creates in `apriori/managed.json` (exact-byte sha256); `update` refreshes manifest-listed, unmodified files only; modified/unmanaged/missing files are reported and left byte-identical. Pre-manifest projects are adopted on template-generation proof; manifest hygiene and realpath containment fail closed before any read.
- **The golden path resolves an explicit Git Bash on Windows** — `APRIORI_GIT_BASH` override, `where git` root derivation across the four Git-for-Windows layouts, conventional-install probes, a named cure when absent; the System32 WSL shim is never a candidate.
- **External side effects are a hard authorization rule** (runbook §1, both editions) — any operation mutating state outside the local repo/workspace needs the principal's explicit authorization (one-shot, or a named class/scope/expiry standing grant); gate consolidation never covers them; untrusted data may drive internal transitions but never authorizes crossing the boundary.
- **The issue ledger speaks a terminal-state vocabulary** — `verified` / `rejected-verified` (reviewer concurred, original reason preserved) / `waived` (human-only; gate C4 machine-checks the `gates:` entry by exact row ID) / `advisory-acked`. Unknown statuses block everywhere; archived changes must be all-terminal; STEP6 now requires a post-archive gate run in the gate-④ packet.
- **CAS enforcement is graded** — unstamped MODIFIED/REMOVED/RENAMED deltas warn on every surface (`projection.unstampedMutations` in `--json`) and the new **gate C7** denies them by default, with visible waivers (`--no-cas` / a `| cas | optional |` config row). MODIFIED gains the trim-equality `unchanged` signature, so a stamped delta that already committed re-runs cleanly instead of dead-ending on its own stamp. Stamps become mandatory in 4.0.
- 21 new scenarios (AM-28..35, SR-26..32, GT-13..16, PR-17..18, UP-06..11, IN-13..17, GP-06..10); 197 tests.

Declared behavior changes (all fail-closed tightenings or additive): malformed delta structure now errors (was silently mis-bucketed); TAP plan mismatches now error (was GREEN-able); `update` now skips modified/unmanaged files (was clobbering); unknown ledger statuses now block gate C4; gate gains C7 (unstamped mutation deltas block by default — stamp them or waive visibly).

## 3.3.0 — 2026-07-11 · the productization release

- **Strict argument parsing everywhere** — every subcommand answers `--help`/`-h` (exit 0, wins over any other validation); unknown flags and stray positionals exit 2 naming themselves. A typo can no longer make a gate command act on the wrong target while exiting green. Three declared behavior changes: `apriori new a b` errors on `b` (was silently ignored), `apriori stamp --foo` is an unknown flag (was treated as the file), multi-value flags (`verify --specs`) stop consuming at any `-`-prefixed token (was `--`-only).
- **README split** — the README is now a ~117-line first screen with a machine-verified executable Quickstart; deep content moved to `docs/{concepts,legacy,ci,cli,troubleshooting}` (EN/CN pairs). `check --self` guards the new pairs (a one-sided pair fails) and resolves links per-file with cross-file fragment validation.
- **Golden path in CI** — the CI job packs the tarball (`npm pack`) and `scripts/golden-path.mjs` installs it into an isolated prefix and walks the README Quickstart verbatim on ubuntu and windows, asserting the documented exit sequence and final state. The published package is now proven as installed, not just as checked out.
- CHANGELOG.md, MIGRATING.md, SECURITY.md — the security fact-check drove a real hardening (doctor per-file flow-state containment).
- `examples/python-pytest/` — the any-language TAP pattern, verified in CI (ubuntu+windows, py3.12).
- CK-10 review-evidence secret tripwire (three airtight literal patterns) + provenance header convention + retention clause.
- `validation/` — the four labs' primary materials with an honest evidence-grade README (single-operator, no external replication yet).

## 3.2.0 — 2026-07-11 · the gate & doctor release

- **`apriori gate --change <name>`** — six mechanical checks, one exit code (0 PASS / 1 BLOCKED / 2 untrustworthy): stage-aware binding verify (projected in-flight, plain archived), tasks all checked, flow-state legality, ledger (open rows and reasonless rejections block), the verdict-evidence backstop (every VERDICT-bearing review doc needs its `S-raw.*` archive — the anti-simulated-review rule, now mechanical), git-based KB freshness that degrades to n/a rather than fabricating blocks. PASS covers the mechanical face only — human gates remain human, and the output says so.
- **`apriori doctor`** — seven onboarding checks with fix hints: Node floor, init scaffold (type-honest: files impersonating dirs are findings, never crashes), runbook freshness, tool pointers, a TAP plumbing probe with a complete failure taxonomy (test failures are explicitly NOT findings), store health, and a changes overview that surfaces pending gate-④ archived changes as information.
- 26 new scenarios (GT-01..12, DR-01..12, CL-09..10); 142 tests.

## 3.1.0 — 2026-07-10 · the projection release

- **`apriori verify --change <name>`** — verify against the in-memory projected (post-merge) store; the mid-change STEP5 gate. Fixes the verification-target misalignment: store-only scans miss new scenarios, dual-dir scans miscount MODIFIED/REMOVED/RENAMED.
- **`apriori archive --change <name>`** — whole-change discovery, per-module dry-run by default, four-phase failure-atomic `--write` (preflight/stage/commit/move).
- **CAS base stamps + `apriori stamp <store-file>`** — opt-in divergence detection; a diverged store refuses to project or merge (the §4.11 serialize rule, mechanical).
- **Deprecated blocks excluded from ALL verify forms** — post-REMOVED stores no longer demand tests for removed behavior forever; lingering tests turn ORPHAN. (See MIGRATING.md.)
- Realpath containment on every participating path (incl. symlinked specs/, subdirs, the archive destination); strict delta hygiene (duplicate requirement names, malformed stamps, zero-op files — all fail closed).
- 26 new scenarios (SR-16..25, AM-13..27, CL-08); 116 tests.

## 3.0.1 — 2026-07-10 · fail-closed

- `verify` never GREEN on broken/vacuous runs: exit taxonomy 0/1/2; missing targets, zero scenarios, spawn/signal/bailout, zero-TAP output, and non-zero exits unexplained by TAP all refuse to pass. SKIP/TODO count as nothing; duplicate scenario IDs force GAPS; fenced scenarios are documentation; `XX-01b` never binds to `XX-01`.
- `check` split into consumer mode (default) vs `--self` (the apriori repo's own handbook checks) — consumers are never failed by our self-checks.
- `archive`: change-name validation + path-containment guard; transactional temp→move→rename commit; content-bearing zero-op deltas error instead of silently merging nothing.
- Cross-platform test fixtures (`node -e`, no printf/echo). Credit: external review by GPT-5.6.

## 3.0.0 — 2026-07-10 · first stable release

- Seven commands: `init` (6-tool scaffolding) / `new` / `status` / `verify` / `archive` / `check` / `update`, with `--json` and `--version`.
- Executable specs: scenario IDs bind to TAP test runs; `apriori verify` GREEN is a deterministic STEP5 gate.
- Native delta-spec archive merge (ADDED/MODIFIED/REMOVED/RENAMED, idempotent reruns, conflict stop).
- The full protocol: Brainstorm stance (two entry doors) → STEP0–6 state machine → heterogeneous adversarial review (issue ledger, verdict discipline) → living spec store + knowledge base with source-commit stamps; guarantee-claim discipline.
- Validation: three brainstorm-phase comparisons and three full builds vs OpenSpec & Superpowers, one legacy-project run; 15 alpha iterations. Single-operator validation — see the tag message for honest limits.
