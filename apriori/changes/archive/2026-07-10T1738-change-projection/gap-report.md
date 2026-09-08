# Gap report — change-projection (STEP1 / P3)

Inputs: requirement/req-final.md · apriori/truth/{spec-runner,archive-merge}.md (KB-checked, 9 corrections applied) · repo at commit 30fa38e. Facts only; no code written.

## Current state A (verified facts)

- Baseline: 84/84 tests green; `npm run verify` GREEN; store has ZERO deprecated blocks and ZERO base stamps (`grep _deprecated / apriori-base` → 0) — so the V7 declared behavior change and CAS opt-in start from a clean slate in this repo and all known consumers.
- `lib/spec-runner.js`: `collectScenarios` reads the FILESYSTEM (specTargets → mdFiles → readFileSync). There is no text-input path. `cli` parses `--specs/--test-cmd/--id-pattern/--cwd/--json`; unknown flags silently ignored. `verifyJson` has no `projection` field. Exit taxonomy 0/1/2 implemented via `infraErrors` + `verdict.clean`.
- `lib/archive-merge.js`: single-file CLI (`--store`/`--delta`); `merge()` pure over (storeText, delta, change); `parseRequirements` Map collapses duplicate names silently; deprecation rewrites the heading line so the block's parse KEY changes afterward (REMOVED rerun → conflict today); transactional ordering covers move failure but the final `renameSync(tmp, store)` is unguarded after the move; `archiveChangeDir` has name+containment guards (string-prefix based, NOT realpath).
- `lib/status.js`: resolves change dirs as `<cwd>/apriori/changes/<name>` — the resolution convention `verify --change` will mirror.
- `bin/apriori.js`: switch dispatch; adding a `stamp` case + USAGE line is the only bin change needed.
- Node stdlib `crypto` available (zero-dep constraint holds); `fs.realpathSync` available on all supported platforms (Node 18/20/22, ubuntu+windows in CI).

## Target state B

req-final.md (v3): projected verify, high-level archive with 4-phase transaction, CAS stamps, deprecated-block rule for all verify forms, realpath containment, delta hygiene guards, JSON projection contract, `apriori stamp` subcommand.

## Gaps (what must change, by file)

| # | Gap | Where |
|---|---|---|
| G1 | No text-input scenario collection — projection needs `collectScenarios` (or a sibling) to accept in-memory texts keyed by store-relative suffix | lib/spec-runner.js |
| G2 | No deprecated-block exclusion in scenario collection (rule applies to ALL verify forms) | lib/spec-runner.js |
| G3 | No `--change` in verify cli: discovery, mapping, merge-based projection, mutual exclusion with `--specs`, JSON `projection` field, new exit-2 classes | lib/spec-runner.js |
| G4 | `merge()` lacks: duplicate-name detection (delta AND store), REMOVED "already deprecated by THIS change" rerun signature | lib/archive-merge.js |
| G5 | No delta-set primitives: discovery under `<change>/specs/`, suffix mapping, per-file hygiene guards (empty/zero-op/malformed-stamp/dup-name), CAS stamp parse+check | lib/archive-merge.js (new pure helpers — shared by verify via require) |
| G6 | No multi-module transaction: preflight/stage(temp-ownership guard)/commit/move phases | lib/archive-merge.js cli |
| G7 | Existing containment guards are string-prefix, not realpath; new surfaces need realpath containment incl. not-yet-existing targets | lib/archive-merge.js (+ shared use from verify) |
| G8 | No `stamp` subcommand; no sha256 fingerprint helper (CRLF normalization) | lib/archive-merge.js or a small shared helper + bin/apriori.js |
| G9 | Single-file archive must gain the CAS check when a stamp is present — its ONLY behavior change | lib/archive-merge.js cli |
| G10 | Spec deltas + tests for all of the above; runbook §4 archive-algorithm & delta-authoring text must mention `--change`, stamps, deprecated rule (EN+CN) | apriori/changes/change-projection/specs/, test/, RUNBOOK*.md |

## Risks

- R1 (design): where the shared pure helpers live — verify must not duplicate archive's parsing. `spec-runner` already lives beside `archive-merge`; a `require('./archive-merge')` from spec-runner is zero-dep and cycle-free (archive-merge does not require spec-runner). STEP2 decides final shape.
- R2 (consistency): `check` (CK-04) still counts scenario IDs inside deprecated blocks while verify will skip them — a check-vs-verify disagreement on post-REMOVED stores. Out of scope by req (no check behavior change); flag to STEP2 as a documented known-divergence or a one-line follow-up candidate.
- R3 (compat): V7 byte-identical claim must be protected by tests — the deprecated-rule change touches the shared collection path. Existing 84 tests are the guard; SR tests must add a no-deprecated-blocks regression case.
- R4 (platform): CRLF — store files checked out with autocrlf would hash differently without normalization; req fixes normalization before hashing. Windows CI (node 18/20/22) must run the stamp/CAS tests.
- R5 (semantics): projected text is produced via `renderStore`, which drops inter-block prose (KB pitfall). For verify this is harmless (only scenario headings matter), but the projection therefore is not byte-identical to a future archived store when inter-block prose exists. Known, documented; repo stores carry no inter-block prose.
- R6 (scale): the change adds ~15-20 scenarios across SR/AM/CL — ID ranges free at SR-16+, AM-13+, CL-08+; ST untouched.

## Conclusion

No blockers found; all gaps map cleanly onto req-final's sections. Proceed to STEP2 (P4 propose). Gate ② is covered by the recorded consolidation (flow-state `gates:`) — this report will be re-presented in the gate-④ packet.
