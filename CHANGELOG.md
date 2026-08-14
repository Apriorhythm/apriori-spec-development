# Changelog

All notable changes to `apriori-cli`. Versions follow semver; the stability promise: CLI surface & flags, `--json` shapes, the delta format and the flow-state schema only break in a major.

## Unreleased · the default ID pattern recognises the IDs real projects write, and delta gains a legal home for commentary

**Behavior change — the built-in `id-pattern` default is wider.** It was `[A-Z]+-\d+`; it is now
`[A-Z]+(?:-[A-Z]+)*-\d+[a-z]*`, so multi-segment IDs (`AC-BIS-01`, `LIFE-DWS-01`) and
lowercase-suffixed ones (`AC-30f`) bind out of the box. In one real brownfield project 50 of 151
scenarios were permanently unbindable under the old default — verify reported GAPS, gate C1 blocked,
and every change carried a hand-written paragraph explaining that this was a tool limitation rather
than a defect. 4.1.0 made the pattern configurable but left the default alone, and the escape hatch
lives in `apriori/process-config.md` — a file the agent may never write — so the fix never actually
reached anyone: that project upgraded and its config file is still the untouched template.

Compatibility is a `leadId`-level property, and that is the level to check it at: for every title
the old pattern BOUND, the new one binds the byte-identical ID. (A raw `.match()` comparison would
differ — `AC-30f` used to yield `AC-30` — but that was never a binding, because `leadId` requires
the match to start at the title's first character and rejects a trailing word character.) This
repo's own store is unmoved: identical ID set, identical unidentified and duplicate counts.

**What you may newly see.** Scenarios that were UNIDENTIFIED can become UNBOUND (recognised, but no
test carries the ID) — that is the more honest message. **And test names using a lowercase-suffix
convention now bind differently**: a test called `XX-10b …`, written as "a second test for `XX-10`",
used to carry no ID at all (the trailing letter rejected the match); it now binds to the ID `XX-10b`,
and if no such scenario exists it is reported as an ORPHAN. This repo's own suite had exactly three
— the post-archive gate caught them — and they were renamed to the IDs they were always meant to
carry. If you use that convention, expect the same and rename likewise; it was never a real
binding. And if two previously-unidentified scenarios
now resolve to the same ID, they are reported as DUPLICATES: a defect that was always there, hidden
behind the narrower pattern. A project that wants the old behavior can pin it with an
`| id-pattern | [A-Z]+-\d+ |` row, which still outranks the default.

**`apriori doctor` stops sending you to the wrong repair.** D6 used to answer every unbindable
scenario with "add leading IDs" — advice that would have had that project rewrite fifty perfectly
good IDs. It now separates a title whose leading token is ID-shaped (a digit plus a `-` or `_`),
whose fix names the `id-pattern` row, from a title with no ID at all, which keeps the original
advice. Each class produces one finding naming only its own scenarios, with at most three samples.

**D5 no longer borrows the project's ID vocabulary.** Its TAP probe judges plumbing, not identity,
but it read `DEFAULT_ID` — so widening that constant could reclassify a healthy stream: a tagged
`# SKIP` contributes nothing to the parsed count, and `ok 1 - AC-30f pending # SKIP` moves from
untagged to tagged the moment `AC-30f` becomes recognisable, dropping the count to zero and
reporting `truncated or malformed`. D5 now keeps its own frozen classification regex.

**Delta files gain `## Notes`, and lose a silent hole.** A `## Notes` section is commentary the
merge ignores entirely — content, requirement and scenario markers, and stamp-shaped lines alike.
It exists because authors kept writing explanatory headings that the parser read as instructions:
one was refused loudly, and the worse one was not refused at all. A `###` heading that is not
`### Requirement:` inside a requirement block used to be absorbed as body text and written verbatim
into the living store; on a MODIFIED operation the integrity report surfaced it, on an ADDED one
nothing did. It is now a line-numbered problem pointing at `## Notes`. Two consequences worth
knowing: a stamp meant for the delta must sit BEFORE the Notes section, since the section is opaque;
and a Notes-only delta still fails the zero-operation guard, because commentary is not an operation.
Every archived delta in this repo (70 files) still parses with zero problems.

419 tests.

## Unreleased · gate degrades the check it cannot run — `INCOMPLETE`, exit code 3

**Exit-code semantics extended.** `apriori gate` gains a fourth outcome: `GATE: INCOMPLETE`
with **exit code 3**, and `checks[].status` gains `skipped`. If your CI treats any non-zero
exit as failure, an INCOMPLETE gate will now fail the job — that is the intended reading: a
gate that could not run its binding check has not passed. The `--json` key set is unchanged
(`{change, stage, checks, result, blocked, errors}` — still no `code` field); only the value
domains of `result` and `checks[].status` grew, and `blocked` still counts blocked checks
only, never skipped ones.

**Why.** A project whose `apriori/process-config.md` lacked a `test-cmd` row got exit 2 from
`apriori gate` before a single check ran — so C2 (tasks all checked) and C4 (ledger terminal)
never executed either, though neither needs a test command. In a real brownfield project that
meant the gate ran zero times across an entire change's life, while 45 unchecked tasks and
zero consistency reviews sailed through. Now a missing test command skips C1 alone: the other
six checks run and report real conclusions, and the aggregate says so. A *broken* test-command
source (conflicting or unreadable config, an empty or whitespace-only `--test-cmd`, a
non-string value through the API) stays exit 2 — broken is not absent. `--test-cmd` is now
judged by PRESENCE, matching `--id-pattern`: an empty flag is an error, never a config
fallback. A confirmed block still outranks a skip.

**`apriori doctor` stops calling that project healthy.** D5 reported `n/a` when no test
command was configured, and `n/a` is not a finding — so doctor printed `DOCTOR: HEALTHY` about
a project whose gate was dead. It is now a finding naming the consequence, with the
`process-config.md` fix. An explicit `--no-run` is still `n/a`: a deliberate skip is not a
defect, and that branch now sorts ahead of the missing-command one.

**Internals.** `lib/spec-runner.js` exports the change-projection builder plus a call-time
resolver and two test-only seams, so gate's skipped-C1 path provably shares verify's one
projection implementation rather than growing a second — a divergence there would have
silently un-blocked C7.

392 tests.

## Unreleased · the SR-64 byte-golden guard becomes platform-correct

The `--specs` byte goldens were captured on POSIX and compared byte-for-byte on every
platform, but spec file paths in the JSON come from a filesystem walk and are therefore
platform-native — as they were in state A too, which is what the guard compares against. On
Windows the run emitted `apriori\\specs\\m\\spec.md` against a golden holding
`apriori/specs/m/spec.md`, so SR-64 failed there and only there. The replay now folds the path
separator — and only the separator: a separator appears in the JSON text as two backslashes
while an escape like `\n` carries one, so folding pairs leaves escapes untouched, and the fold
itself is asserted in the test. No product behavior changes; the published 4.1.0 tarball ships
`bin/`, `lib/`, `templates/` and the two docs, so it is unaffected.

Found by CI the first time these commits reached `main` — the branch had never been through
the Windows matrix.

375 tests.

## 4.1.0 — 2026-08-14 · the brownfield P0 answers land: the change verdict judges the change, MODIFIED fidelity is mechanical, id-pattern is project config, and small records finally have a lane

Four changes, each run through the full loop with adversarial heterogeneous review, all
tracing to one brownfield deployment's feedback. Three of them harden what the tool already
claimed to do; the fourth adds the first new command since 4.0 — a lane for the records that
were too small to survive the formal process, with a verification floor built in so the light
path is not a hole.

**Upgrading from 4.0.x:** `npm i -g apriori-cli@latest`, then `apriori update` (refreshes
`apriori/runbook.md` to `runbook-version: 4.1`, which gains §2b the hotfix lane and §2c
verification scaling), then `apriori doctor`. Nothing else changes for existing projects — no
flag, no `--json` shape, and no gate check behaves differently. `apriori/process-config.md` is
user-owned and is never touched, so the new `verification-profile` row does **not** appear
automatically; an absent row means nothing escalates, which is the safe default. Add it by hand
to opt in:

    | verification-profile | ui | ui / backend / fullstack / docs / none | absent or `none` = nothing escalates |

375 tests.

### the hotfix lane, and verification strength that scales mechanically (change hotfix-lane)

Brownfield feedback P0-4 plus the verification-scaling half of the same problem: a conclusion too small for a change bundle went unwritten (a typo fix, a config correction, a two-hour "nothing is broken" investigation), and a "light path" without a declared verification floor would just have been a hole in the process. The two ship together on purpose — the lane defines the light path, the scaling rule defines the floor on it.

- **`apriori hotfix new|archive`** — the minimal write-back unit: `hotfix-state.md` (a fixed header block, `## Conclusion`, `## Bindings`), an optional spec delta, a direct archive. `hotfix archive` runs a **zero-write preflight** (field contract, grading, carrier exclusivity, CAS stamp, screenshot evidence, clean tree, review projection, scoped verdict) and prints grade, scope, digest, write set and a signoff token; `--approve <token>` writes in **three stages — stores → truth → bundle move**, each through a temp file and one atomic rename, and every failure names what committed and what did not.
- **Admission is graded mechanically by blast radius**, ordered-first: `(R3, n/a)` for REMOVED/RENAMED · a two-module union · a decision supersession or more than three decisions per module · a dual-end touch · any MODIFIED/ADDED block without a scenario; then a non-zero delta is `R3` **by default**, demoted to `(R2, whitelist)` only when every touched store block carries a human-granted `blast: low` marker; then `(R2, behavior)`, `(R1, n/a)`, `(R0, n/a)`. Fail-up is the rule — the defect account's GROUP BY and "latest"-criteria rewrites never reach the lane by construction. A delta may neither self-grant nor revoke the marker.
- **`| verification-profile | ui / backend / fullstack / docs / none |`** — a human-owned project declaration (same ownership semantics as `test-cmd`; absent, empty and `none` all mean nothing escalates). What is mandatory is the EXISTENCE of evidence; what scales with the tier is its COVERAGE: the screenshot observation record is required at the full tier and **advisory in the lane** (it prints a reminder and never blocks), while a record that IS present is validated identically at both tiers — full field set, repo-relative path under `apriori/tmp/`, ISO-UTC-seconds time, one `run` per bundle, `baseline` equal to repo HEAD, no marker impersonation, and `hash=` refused outright.
- **`verify` gains a scoped verdict** (`scope`): a named scenario set is judged and nothing else — out-of-scope orphans do not dirty it, an empty scope is clean by construction, and a scope member the store does not carry is a caller error rather than a silently satisfied one. The whole-store verdict is untouched.
- **The review surface is a grammar, not a convention**: one `=== VERDICT ===` zone per raw transcript, `VERDICT: <phrase> role=<inspection|p8> digest=<64 lowercase hex> [boundary=within|exceeds]`, role×phrase pairing closed, rounds named `round-<n>.md` + `round-<n>-raw.txt` with the highest `n` consumed and every pair complete. The projection is fixed by grade (R1 none · R0 only with decisions · R2 code one inspection · R2×docs inspection then p8), and the `boundary=` trailer is required exactly where the whitelist point-check stands in for a human signoff.
- **Two digest domains over one record encoding** (`<tag length>\n<tag>\n<bytes length>\n<bytes>`, both parts length-prefixed, UTF-8 byte ordering throughout): the review digest covers business entities only — `## Gates`, `approval.md` and `review/` are the exclusion domain and cannot move it — and the d1 signoff token binds that digest to the store and truth baselines in the fixed domain order `core → store → truth`.
- **Mapping m1 at the gate**: a hotfix bundle is refused with a pointer at `apriori hotfix archive`, and the seven checks are neither run nor reinterpreted — their logic is untouched. `status` lists and labels the lane; `--change` on a bundle reports it instead of erroring about the absent flow-state; `--json` carries `hotfix`. A directory holding both state files is an identity error at every consumption point.
- New truth docs: `truth/hotfix.md`, plus the previously missing `truth/new.md`, `truth/resolve.md` and `truth/config.md`. RUNBOOK §2b/§2c (bilingual), `runbook-version` 4.0 → 4.1.

375 tests (318 + 57: CF-13..17, HF-01..42, SR-69..72, GT-28/29, ST-10/11, CL-18, CK-17).

### MODIFIED replacement fidelity becomes a mechanical report (change modified-block-integrity)

Brownfield feedback P0-3: "MODIFIED replaces the whole block" fidelity was guarded only by LLM reviewer attention (a real deployment confirmed 11/13 preserved lines by manual subsequence comparison — the one ⚠ row in its defense table, "build it into the CLI").

- **A pure integrity engine** (`compareModifiedBlock`) compares every MODIFIED block against its store baseline at the projection's own snapshot (`buildProjection` returns `modifiedBlocks`; rename-then-modify baselines the complete pre-rename block; repaired reruns included): occurrence-level cardinality classification (retained / titleChanged / dropped / added / ambiguous), order-preserving greedy-subsequence line comparison (requirement prose and fenced content included), trim-equal fast path.
- **`verify --change` carries the report** — JSON `modifiedIntegrity` always present on GREEN/GAPS (absent on ERROR and on `--specs`, byte-golden proven); the human `— MODIFIED INTEGRITY —` section prints when a risk class is non-empty (`!`-prefixed, control chars sanitized, 120-unit field truncation). Old-block titles ride the existing single matcher batch; the verdict and exit codes never change — the report is informative by contract (a machine cannot tell an intended deletion from a slipped one; it puts the difference on the table for humans and the P8 review).
- **`archive --change` prints the same section** (high-level form; dry-run and pre-write) after every preflight guard; the id matcher is injected at the bin seam (archive-merge still never requires spec-runner); a broken id-pattern channel degrades to one bounded `warning: modified-integrity …` line and changes nothing else.
- The frozen live-specimen regression: the previous change's real nine-scenario MODIFIED rewrite reports exactly retained 9 / two lost THEN lines — hand-derived before implementation (the derivation itself corrected the spec author's wrong assumption, which is the point).

318 tests (306 + 12: AM-43..47, SR-65..68).

### the change verdict separates from store health (change verify-change-scope)

Brownfield feedback P0-2: with 8 parallel unarchived changes, `verify --change` drowned in historical UNBOUND (real replay: 107 scenarios, 61 unbound) while `--specs <delta>` false-orphaned every other change's tests (46) — "is THIS change done" took two commands plus a hand-written disclaimer per change.

- **`verify --change` is now change-scoped** — the verdict (exit 0/1) judges only this change's requirement blocks (provenance: the projection blocks its ADDED/MODIFIED/RENAMED produce; occurrence-level; rename-then-modify carries `operations: ["RENAMED","MODIFIED"]`; final-deprecated blocks excluded). Cross-boundary duplicate IDs and scoped unidentified scenarios still block.
- **Failure signals stay fail-closed** — only provably attributable failures are non-blocking: a red bound to an out-of-scope projection scenario, or a failing ID declared inside a sibling active change's CLEANLY-PARSED delta (strict parse; only ADDED/MODIFIED block bodies grant the exemption — malformed/REMOVED/symlinked sibling material grants nothing; the sibling scan joins the same single matcher batch). ID-less failures and unattributable failing orphans block, exactly as before.
- **The store report** — the same run prints a complete informative evaluation of the whole projection (bound-green count, bound-red, unbound, orphan, unidentified, unattributed, duplicates): historical gaps stay visible, they just stop drowning the verdict. `--change --json` adds `storeReport` + `changeScope` on GREEN/GAPS (absent on every ERROR class).
- **Explained non-zero exits can be GREEN (`--change` only)** — a test-process exit explained by parsed failures with a clean change verdict no longer forces a non-zero verify exit (a scoped amendment to the non-zero rule; unexplained non-zero stays ERROR 2). Zero-scope changes (removal-only and friends) are vacuous-GREEN with an explicit note; an all-empty projection stays ERROR.
- **gate C1 (in-flight) goes change-scoped** — detail `verify GREEN (in-flight, change-scoped)` with a six-count store summary suffix; parallel changes' gates go green independently. The archived stage still verifies the whole store.
- `--specs` runs are byte-identical to before (proven by golden captures); `am.buildProjection` additionally returns `deltaOps` (the per-suffix operation buckets from its own parse — single-snapshot provenance).

296 tests (284 + 12: SR-56..64, GT-26..27, plus byte-golden replay).

### id-pattern becomes project configuration (change gate-id-pattern)

Brownfield feedback P0-1: on a real store with letter-suffixed (`AC-08a`) and multi-segment (`AC-BIS-01`) IDs, `gate` C1 was permanently BLOCKED (no id-pattern channel) and `check` CK-04 false-failed — a forever-red gate carries no signal.

- **New process-config key `id-pattern`** (bare JS regex source) — one declaration, four consumers. Resolution: `--id-pattern` flag (verify + **gate, new flag**; judged by presence — an empty flag errors, never falls back) > config row > built-in `[A-Z]+-\d+`. `check` CK-04 and `doctor` D6 consume the row (no new flags); D6 names its pattern source (`config`/`default`).
- **One recognition contract** — `check` drops its private `^(…)\b` anchoring and recognizes through the same `leadId` semantics as verify/gate/doctor; the four consumers can no longer disagree on the same title.
- **Markdown cell escaping, all keys** — `parseConfig` cells now honor `\|` by backslash parity (odd escapes the pipe into the value, even separates); a regex matching a literal pipe is written `[\|]` in the cell (parses to `[|]`). Behavior change is additive: configs without backslash-pipe sequences parse identically. The template documents both layers.
- **Fail-closed errors naming their origin** — invalid patterns error at consumption before any spec read or test spawn: verify/gate exit 2 through their existing text/JSON shapes (`--change --json` keeps its `projection` field), check `RESULT: ERROR` exit 2, doctor D6 finding + skipped D5 probe (FINDINGS, exit 1). Messages are sanitized whole (control chars stripped, ≤200 chars; the engine message never re-leaks the source).
- **Config-origin matching is terminable** — a config row is repository input CI consumes automatically, so its actual matching runs in a SIGKILL-able child (`lib/id-match-child.js`, stdin data channel, 2s budget); every child failure class fails closed. A catastrophic-backtracking row cannot hang CI. The flag stays in-process (operator-trusted, documented).
- An unreadable `process-config.md` (e.g. a directory) is now a consumption-time problem for every key, never a thrown exception.

276 tests (254 + 22: CF-08..12, SR-50..55, GT-22..25, CK-13..16, DR-16..18).

## 4.0.7 — 2026-07-18 · drop the broken npm badge

Docs only — no CLI, flag, or behavior change; the published files are byte-identical to 4.0.6 apart from `README.md`.

- **The shields.io npm version badge is removed from both READMEs** — it rendered as a broken image on the npm package page; both READMEs now open directly on the language switcher.

254 tests.

## 4.0.6 — 2026-07-18 · the READMEs show the demos

Docs only — no CLI, flag, or behavior change; `bin/`, `lib/`, `templates/`, and the runbook files are byte-identical to 4.0.5.

- **Both READMEs now embed the demo GIFs** — the hero shows the CLI loop (`verify` GAPS → a scenario-bound test → GREEN → gate → archive), and Route A shows the full Claude Code onboarding (`npm i` → `apriori init` picks Claude Code → `/apriori` a tiny change → `/goal` drives spec → review → implement → verify → gate → archive, stopping only at the one human gate). The GIFs live in `docs/` and stay out of the npm tarball (the `files` allowlist covers `bin/`/`lib/`/`templates/`/runbooks only); npm resolves the relative image paths against the repository, so the package page renders them from `main`. `README_cn.md` embeds the Chinese-language run of the same flow.

254 tests.

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
