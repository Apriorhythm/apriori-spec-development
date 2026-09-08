# Design — doctor-command

## Module layout

New `lib/doctor.js` (leaf; nothing requires it); consumes `./init` (TOOLS, detectTools), `./check` (checkRunbookFreshness), `./spec-runner` (collectScenarios, parseTap, zeroTapParsed, runTestCommand, configTestCmd, DEFAULT_ID), `./status` (activeChanges, parseFlowState). `bin/apriori.js` adds the `doctor` case + USAGE line.

## Core function

`runDoctor({ cwd, testCmd, noRun })` → `{ code, result: 'HEALTHY'|'FINDINGS'|'UNUSABLE', findings, checks: [{id, status: 'ok'|'finding'|'n/a', detail, fix?}], errors }`; `cli(argv)` parses flags (positional arg anywhere → usage exit 2 BEFORE running), prints text or JSON, returns code. Check order D1→D7; the two exit-2 aborts (D1 floor, D2 apriori/ missing) push their own check entry first, then return with whatever ran (A2).

- **D1:** major = `parseInt(opts.nodeVersion || process.versions.node)` (injectable — DR-12's test seam) ≥ 18 → ok; else finding entry + UNUSABLE abort.
- **D2:** `apriori/` missing → finding entry + UNUSABLE abort naming `apriori init`. Else one sub-finding each: runbook.md, specs/ dir, .gitignore containing `/^tmp\/$/m`, tmp/ dir. process-config absent → part of the n/a detail.
- **D3:** runbook absent → n/a ("see D2"); else `checkRunbookFreshness(cwd)` → [] = ok, warn string = finding (fix `apriori update`).
- **D4:** `detectTools(cwd)`; none → n/a. Per tool: rules file exists AND contains `apriori/runbook.md` (init's own dedupe key); command-level: command file exists. Findings name tool + file, fix `apriori init`.
- **D5:** resolve testCmd (opts → configTestCmd); none → n/a hint; noRun → n/a "probe skipped". Else `runTestCommand(cmd, cwd)` then classify IN ORDER: exec.error → finding · exec.signal → finding · `Bail out!` (parseTap bailout) → finding · `!out.trim()` → finding "produced no output" · zeroTapParsed(...) → finding naming --test-reporter=tap · non-zero exit with parsed failCount 0 → finding "exit N unexplained by TAP" (classified BEFORE any ok branch — a non-zero `1..0` run is caught here, DSPEC-3) · TAP version/plan present but zero parsed results: plan `1..0` (exit 0) → ok "empty suite"; else → finding "truncated or malformed" · else ok with `${pass}p/${fail}f` info. (This ladder mirrors verify's infraErrors semantics via the same primitives — no reimplementation.)
- **D6:** specs dir missing → n/a "see D2"; `collectScenarios([specsDir], DEFAULT_ID_re)`: zero files/scenarios → n/a "empty store"; unidentified → finding listing (detail names DEFAULT_ID); duplicates → finding listing.
- **D7:** `activeChanges(cwd)`; per change: flow-state exists+readable, parseFlowState().change non-empty, === dir → info; else finding (failed clause named). Archived: dirs under changes/archive matching the stamp basename pattern, directories only (stat through symlinks), AND `containsReal(archRoot, dir)` before ANY read — an escaping symlinked entry becomes an info note and is never read (DSPEC-4); contained ones whose flow-state parses with current-step ∉ {DONE, ABANDONED} → appended to D7's detail as info. D7 status: finding if any clause failed, else ok (n/a when zero active changes and zero archived notes — "no changes yet").

Aggregate: `checks` may carry MULTIPLE entries with the same D-id (D2 emits one entry per gap; D4 one per broken tool); `findings` = count of finding-status entries — one model everywhere (spec DR-03, JSON contract, text output), per DSPEC-1.

## Tests (test/doctor.test.js)

mkProject fixture builder; healthy fixture = full scaffold (runbook byte-copy from package RUNBOOK.md for D3 ✓) + CLAUDE.md with pointer + .claude/commands/apriori.md + config with test-cmd row. In-process `runDoctor` for classifications; spawn BIN for DR-02/DR-10/DR-11 exit codes + JSON purity. D5 signal case: unit-level via the exported `classifyProbe(run)` helper on a synthetic `{exec:{signal:'SIGKILL'},out:''}` (Windows-safe, per gap-report R3); all other D5 cases through the real command path with `node -e` fixtures.

## Docs

README/README_cn cheat-sheet row. RUNBOOK §0 install block: one clause naming `apriori doctor` as the onboarding probe (EN+CN).

## Dogfood

`apriori doctor` on this repo: expect FINDINGS — this repo intentionally has no apriori/runbook.md copy (it IS the source repo, uninitialized as a consumer)… actually `apriori/` exists (specs/changes/review/truth) but no runbook.md → D2 finding. That is an honest diagnosis of the dogfooding repo's unusual shape; record the output in the gate-④ packet rather than forcing a HEALTHY.
