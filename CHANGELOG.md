# Changelog

All notable changes to `apriori-cli`. Versions follow semver; the stability promise from 3.0.0 holds: CLI surface & flags, `--json` shapes, the delta format, the flow-state schema and the `apriori/` layout only break in a major.

## Unreleased (3.3.0)

- **Strict argument parsing everywhere** — every subcommand answers `--help`/`-h` (exit 0, wins over any other validation); unknown flags and stray positionals exit 2 naming themselves. A typo can no longer make a gate command act on the wrong target while exiting green. Three declared behavior changes: `apriori new a b` errors on `b` (was silently ignored), `apriori stamp --foo` is an unknown flag (was treated as the file), multi-value flags (`verify --specs`) stop consuming at any `-`-prefixed token (was `--`-only).
- **README split** — the README is now a ~117-line first screen with a machine-verified executable Quickstart; deep content moved to `docs/{concepts,legacy,ci,cli,troubleshooting}` (EN/CN pairs). `check --self` guards the new pairs (a one-sided pair fails) and resolves links per-file with cross-file fragment validation.
- **Golden path in CI** — the CI job packs the tarball (`npm pack`) and `scripts/golden-path.mjs` installs it into an isolated prefix and walks the README Quickstart verbatim on ubuntu and windows, asserting the documented exit sequence and final state. The published package is now proven as installed, not just as checked out.
- CHANGELOG.md, MIGRATING.md, SECURITY.md (this change).

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
