# Design — gate-command

## Module layout

New `lib/gate.js`; consumes `./status` (parseFlowState, parseLedger), `./spec-runner` (verify, configTestCmd), `./archive-merge` (CHANGE_NAME_RE, containsReal). No module requires gate (leaf). `bin/apriori.js` adds the `gate` case + USAGE line.

## Core function

`runGate({ cwd, change, testCmd })` → `{ code, stage, checks: [{id, status: 'pass'|'blocked'|'n/a', detail}], result, blocked, errors }` — pure return; `cli(argv)` maps flags, prints text or JSON, returns `code`. Everything below happens inside runGate:

1. **Validate:** change present + CHANGE_NAME_RE, else `{code:2, stage:null, result:'ERROR'}`.
2. **Resolve stage:** in-flight dir `<cwd>/apriori/changes/<name>` (with `containsReal(<cwd>/apriori/changes, dir)`); else archived: `readdirSync(<cwd>/apriori/changes/archive)` filtered by `^\d{4}-\d{2}-\d{2}T\d{4}-<name>$`, sorted, last (containment likewise). Neither → code 2 naming both.
3. **Flow-state:** read `<dir>/flow-state.md`; unreadable → code 2. `parseFlowState` → C3 rules (required keys, placeholders `<`/`>`, exact enums, change==--change). tier drives C2/C4 applicability.
4. **C1:** testCmd = opts.testCmd || configTestCmd(cwd); missing → code 2 (usage). In-flight: `verify({change, cwd, testCmd})`; archived: `verify({specs:[<cwd>/apriori/specs], cwd, testCmd})`. Consume the run OBJECT: `run.errors.length` → code 2, errors surfaced; else clean → pass (detail GREEN), else blocked with counts (red/unbound/orphan/unidentified/duplicates).
5. **C2:** `<dir>/tasks.md`; absent → tier==trivial ? n/a : blocked; else count `/^\s*-\s\[\s\]/m` matches (checked = `[xX]`).
6. **C4:** ledger `<cwd>/apriori/review/<name>-issues.md`; absent → trivial ? n/a : blocked; rows via parseLedger; block on `/^open\b/i`; block on `/^rejected\b/i` rows failing the reason rule: strip the leading `/^rejected\b/i`, trim the remainder, and require at least one WORD character (`/\w/`) in it — `rejected: duplicate` passes; `rejected`, `rejected:`, `rejected -` all block (punctuation alone is not a reason).
7. **C5:** doc set = glob `apriori/review/<name>-*.md` + `apriori/design/<name>-review-v*.md`, minus `<name>-issues.md`, minus stems ending `-raw`; lstat: symlink → blocked; regular file with `/^VERDICT:/m` → require ≥1 raw at `apriori/review/<stem>-raw.*` that is a REGULAR file by lstat FIRST (symlinked raws don't count as evidence), and whose realpath sits inside apriori/review. 
8. **C6:** modules = first segments of `.md` suffixes under `<dir>/specs/`; per module the precondition ladder (truth doc, source-commit line, lib/<m>.js, git spawn) → n/a reasons; `spawnSync('git', ['-C', cwd, 'log', '--oneline', `${c}..HEAD`, '--', `lib/${m}.js`])`; status 0 + empty → pass; status 0 + output → blocked (count); non-zero → n/a with first stderr line.
9. **Aggregate:** any blocked → result BLOCKED, code 1; else PASS, code 0. Checks that returned n/a don't affect either. Text output: one line per check, final `GATE: PASS — mechanical checks only; human gates remain human` / `GATE: BLOCKED (n item(s))`.

JSON: exactly the req-final shape; in text mode errors go to stderr.

## Read-only discipline

gate performs zero writes: no temp files (verify's projection is in-memory), no mkdir. Test asserts a full before/after tree fingerprint (path+size+mtime) is unchanged, C1's test command being a `node -e` echo (side-effect-free).

## Tests (test/gate.test.js)

Fixture builder mkProject as in archive-change.test.js; tapCmd helper. In-process `runGate` for most checks (fast, inspectable); spawn BIN for CL-09 and exit codes/usage/JSON purity. Git-dependent GT-10: build a throwaway git repo in the fixture (git init + commits); skip-guard ONLY the git-unavailable branch — the n/a branches (no truth doc / no lib file) need no git at all and always run.

## Docs

README/README_cn cheat-sheet row for `gate`. RUNBOOK §1 enforcement-layers: the "verdict-evidence check" clause can now name `apriori gate --change` as the deterministic implementation (EN+CN, one clause each). No prompt changes.

## Dogfood

Before archiving: `apriori gate --change gate-command` must print `GATE: PASS` against this very change (its own review docs satisfy C5's stem rule — the STEP2 raws of THIS change are named `gate-command-review-v{N}-raw.*` accordingly; C6 reports n/a for modules gate/cli, which have no truth docs — honest degradation).
