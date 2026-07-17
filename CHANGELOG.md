# Changelog

All notable changes to `apriori-cli`. Versions follow semver; the stability promise: CLI surface & flags, `--json` shapes, the delta format and the flow-state schema only break in a major.

## 4.0.5 — 2026-07-17 · v4 becomes the trunk

Repository/release plumbing only — no CLI, flag, or behavior change; the published files are byte-identical to 4.0.4.

- **The v4 line is promoted to `main`** — `main` now carries the product (the old V1 `main` is preserved on the `v1` branch). CI triggers moved from `[v4]` to `[main]`, and `package.json`'s `homepage` now points at the repository root (`#readme`, following the default branch) instead of `tree/v4`. Development continues on `main`; the `v4` branch is retired.

254 tests.

## 4.0.4 — 2026-07-16 · the Quickstart leads with the agent

Docs only — no CLI, flag, or behavior change.

- **README Quickstart restructured into two routes** — Route A is how you'll actually use it: drive an agent in Claude Code (`apriori init`'s interactive tool picker, then `/apriori` with no argument to brainstorm, or `/apriori <change>` to run the loop to the next human gate), never hand-writing a spec or state file. Route B keeps the deterministic run-it-by-hand walk (install → red → green → gate → archive) — the same 4-block sequence the golden-path check executes against this file, now labeled as the non-interactive / CI form of Route A's menu. Applied to both `README.md` and `README_cn.md`; the golden-path extractor scopes to Route B's runnable blocks, so the executable-Quickstart guarantee is unchanged.

254 tests.

## 4.0.3 — 2026-07-12 · the gate's KB check stops lying, the runbook version stops drifting

Both fixes trace to the 4.0.2 dogfooding experiments — two independent sub-agents (Opus, Sonnet) each ran a full change on a real project (quick-poll, mini-kv) — and echo GPT-5.6's earlier P2 note. Each change went through the full loop with adversarial codex review.

- **C6 binds through a truth index, not a filename guess** — gate's KB-freshness check was silently skipping whole classes of real project three ways: the truth doc's filename differed from the store basename (`poll.md` vs `quick-poll`), the `source-commit` sat in a non-bare form, or the code lived outside `lib/`. Now a truth doc may declare `store-module:` and `source-files:` in its header region (defaulting to the basename and `lib/<module>.js`); a covered module with a valid stamp is ALWAYS mechanically checked, never a silent skip; two docs claiming one module conflict-block; a non-canonical `source-commit` yields a format-pointing note instead of a vague "no source-commit"; and an explicit `source-files` is a complete promise — any missing, malformed, symlinked, escaping, or non-file token blocks (a declared directory is valid). Field-less truth docs — this repo's own — keep the byte-identical pre-change verdict, verified by the repo's own gate checking the `gate` module through the new index.
- **CK-11 keeps the runbook version aligned with the CLI major** — the runbook header declared `runbook-version: 3.0` while shipping with the 4.x CLI and being refreshed by `update`. `apriori check --self` now asserts RUNBOOK.md (canonical, required) and RUNBOOK_cn.md (optional) each carry exactly one header-region `runbook-version` blockquote entry whose major equals `package.json`'s — failing on missing, duplicate, malformed, or mismatch, never matching body-text or fenced occurrences — and both headers are corrected to `4.0`.

254 tests.

## 4.0.2 — 2026-07-12 · the judge's input boundaries harden

Every item answers the GPT-5.6 fourth review (each defect reproduced first; three changes through the full loop with adversarial codex reviews). The theme: the three places a verdict-maker touched raw input — TAP, markdown config, the filesystem — now treat it as protocol, structure, and trust chain.

- **TAP is a version-aware protocol** — a line lexer replaces the regex pile: closed version matrix (12/13/14/absent accepted; anything else, `banana` included, is an infra ERROR), `\#` escapes never open a directive (the reviewer's TAP-14 false-green dies), `bail out!` matches any casing at any indent, lone-CR streams cannot hide failures, mid-stream plans and out-of-plan numbers are untrustworthy, unterminated top-level YAML fails closed, `pragma` lines are the only ignored construct, dashless descriptions bind and `# SKIPPED:` skips. **stdout/stderr split (behavior change)**: TAP parses from stdout only; stderr becomes a reported diagnostics channel (report group + constant `--json` `stderr` field); TAP misrouted to stderr — bail-outs included — gets a `2>&1` remedy. Doctor's D5 probe speaks the same lexer.
- **process-config parses as structure** — the fenced-example waiver bypass dies: fenced/commented rows grant nothing (inline comments are spans), conflicting or illegal values fail closed at consumption (archive denies, gate C7 blocks, verify/doctor refuse a conflicted `test-cmd`), same-value duplicates stay benign, `--no-cas` stays supreme and is now discoverable (usage texts + a template `cas` row).
- **Resolution validates its trust chain** — the four gate-PASS bypasses die: symlinked/non-directory `changes/` or `archive/` roots are structural errors, a broken active entry never falls back to the archive, the reserved name `archive` and date-prefixed names are rejected on every by-name surface (one `validateChangeName`, kind-classified), pseudo-stamps like `9999-99-99T9999` and `2026-02-31` neither sort nor resolve (Gregorian round-trip), `status` checks flow-state identity, and file reads speak structured defect kinds (a dangling `review/` ancestor is a defect, not an empty ledger).
- `MIGRATING.md` now ships in the npm package and the D8/update pointers carry a stable URL; stale spec/doc sentences (AM-25, the gate waiver line, doctor's check list, MIGRATING's old CAS table) say what the code does. 247 tests.

## 4.0.1 — 2026-07-12 · the false-green dies and CAS keeps its word

Both fixes trace to the GPT-5.6 external review of 4.0.0 (each reproduced before work started; two changes through the full loop with adversarial codex reviews).

- **Unattributed test failures block GREEN** — any top-level non-SKIP/TODO `not ok`, whatever its shape (numbered-without-ID, bare, number-only, dash-less), is an *unattributed failure*: verdict GAPS (exit 1) even when the test command exits 0, a new report group (first 20 lines, 120-char cap) and `--json` `unattributedFailures {count, lines}` in every outcome class. Infra ERRORs keep precedence; `exec.status !== 0` never exits 0; nested-subtest indentation, directives, and `not ok:`-style prefixes stay exempt; gate C1 names the class. This kills the reviewer-reproduced teardown false-green.
- **`archive` denies unstamped mutation deltas by default** — the promise "mandatory in 4.0" is now code on both archive forms: preflight error naming the file and the cure, nothing written or moved; the two visible waivers are `--no-cas` and a `| cas | optional |` config row (the flag wins, the output names the source). `verify --change` stays warn-only; ADDED-only deltas stay exempt.
- **`status` sees archived changes** — the shared resolver (new `lib/resolve.js`) plus file-level containment guards: `stage`/`path` in output and JSON, bad names / missing changes / escaping paths exit 2.
- **`doctor` D8 + `update` warnings** name the five legacy 3.x roots with a pointer at MIGRATING.md's new 4.0 section (manual mapping table; a full migrate command stays out until external users need it).
- `package.json` homepage now points at the v4 tree. 218 tests.

## 4.0.0 — 2026-07-12 · the change bundle

Everything a change produces lives in ONE directory: `apriori/changes/<name>/` — `flow-state.md`, the `requirement/` history (plain names: `req-v{N}.md`, `req-final.md`, `intent-card.md`), `gap-report.md`, `proposal.md`, `design.md`, `tasks.md`, the `specs/` deltas, the `review/` evidence (ledger `issues.md`, review docs, raws), and `spike/` on the explore track. The five scattered per-change roots (`requirement/`, `spike/`, `apriori/review/`, `apriori/design/`, `apriori/explore/`) cease to exist.

- **The archive move carries the whole bundle** — `apriori archive` moves the change dir in one atomic rename with everything already inside; the 3.4.x staging phase is deleted. Explore-track `spike/` is deleted or quarantined by the executor *before* the archive action (the command never touches it).
- **Gates read the bundle** — C4's ledger lives at `<dir>/review/issues.md`, C5 scans `<dir>/review/*.md` with the same stem→`<stem>-raw.*` evidence rule; both work identically in-flight and archived because the evidence travels with the dir. The `review/` entry itself is containment-checked (symlink/non-dir/escape blocks with a named defect).
- **`check` CK-10 re-rooted** — the secret tripwire sweeps every bundle's `review/` under `apriori/changes/` and `apriori/changes/archive/`, containment-guarded, symlinked entries warn-skipped by name.
- **Review-doc names drop their prefixes** — P5 evaluations are `spec-review-v{N}.md`, STEP5 consistency reviews are `step5-review-v{N}.md`, requirement reviews stay `req-review-v{N}.md`, all inside the bundle's `review/`.
- **`new` scaffolds the bundle skeleton** (`specs/`, `requirement/`, `review/`); `init` no longer creates a shared `apriori/review/`.
- **Node floor: ≥ 22** — `engines`, doctor's D1 check, and CI (22/24) move together.
- Both runbook editions and the concepts handbook are rewritten to bundle paths throughout; a corpus-level strip-scan test (PR-21) keeps the legacy roots from creeping back.

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
