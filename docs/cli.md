# CLI Reference

Every subcommand answers `--help` (exit 0); unknown flags and stray arguments exit 2 — nothing is silently ignored. The synopses below are the exact strings `--help` prints.

## apriori init

scaffold apriori/ + per-tool runbook pointers (interactive multiselect without --tools)

```text
usage: apriori init [--tools <a,b,...>] [--test-cmd "<cmd>"] [--language <lang>] [--yes]
```

Example: `apriori init --tools claude,cursor --test-cmd "npm test" --yes`

Exit: 0 done/aborted-by-you · 1 empty selection · 2 non-interactive without --tools.

## apriori doctor

diagnose the project↔apriori seam: Node floor, scaffold, runbook freshness, tool pointers, TAP plumbing probe (`--no-run` skips), store health, changes overview — findings name their fixer

```text
usage: apriori doctor [--test-cmd "<cmd>"] [--no-run] [--cwd <dir>] [--json]
```

Example: `apriori doctor`

Exit: 0 HEALTHY · 1 findings · 2 unusable (uninitialized / old Node).

D6 scans the store with the `id-pattern` row (no flag; detail names the source, `config` or `default`). An invalid or terminated row is a D6 finding and the D5 probe is skipped — the test command never runs under a broken id-pattern (§8.0).

## apriori new

scaffold a change dir + flow-state skeleton

```text
usage: apriori new <change-name>   (bare kebab-case, e.g. add-playback)
```

Example: `apriori new add-playback`

Exit: 0 created · 1 name/exists error · 2 usage.

## apriori hotfix

the minimal write-back lane: a conclusion, an optional spec delta with its bindings, and a direct archive — for records too small to deserve a formal change

```text
usage: apriori hotfix new <name>
       apriori hotfix archive <name> [--approve <token>] [--test-cmd "<cmd>"] [--cwd <dir>]
```

`hotfix new` scaffolds `apriori/changes/<name>/hotfix-state.md` — a header block, a `## Conclusion` you must replace, and a `## Bindings` section. A bundle is a formal change **or** a hotfix, never both: a directory holding `flow-state.md` and `hotfix-state.md` at once is refused everywhere it is consumed.

`hotfix archive` runs a zero-write preflight and prints what it found: the grade, the verification scope, the review digest, the write set and an approval token. Nothing is written until you re-run with `--approve <token>`; if the bundle or any store/truth baseline moved in between, the token no longer matches and the archive is refused.

Admission is decided **mechanically by blast radius** — you do not argue for it:

| grade | what it is | review the lane demands |
|---|---|---|
| `(R0, n/a)` | no code changed; the conclusion is the whole record | a point-check only when decisions are attached |
| `(R1, n/a)` | a single-module trivial fix, no spec change | none |
| `(R2, behavior)` | a spec-preserving behavior fix | one `inspection` round |
| `(R2, whitelist)` | a spec change confined to blocks a human marked `blast: low` | one `inspection` round carrying `boundary=` |
| `(R3, n/a)` | everything else | **refused** — open a formal change |

`R3` is not a warning. A REMOVED/RENAMED block, a bundle spanning two modules, a dual-end (frontend *and* backend) touch, a decision supersession, a MODIFIED/ADDED block with no scenario, or any delta block the store has not whitelisted all grade `R3` and are rejected with a pointer at the formal process. Fail-up is deliberate: what cannot be told apart mechanically grades to the stricter side.

Example: `apriori hotfix new summary-wording` → fill in → `apriori hotfix archive summary-wording` → `apriori hotfix archive summary-wording --approve <token>`

Exit: 0 preflight clean / archived · 1 refused (grade, contract, review, verdict or token) · 2 usage or an unreadable bundle.

## apriori status

where each change is: step, next action, open ledger items

```text
usage: apriori status [--change <name>] [--json]
```

Example: `apriori status --change add-playback --json`

Exit: always 0 on success paths (status reports, never gates).

## apriori verify

bind every spec scenario ID to a passing TAP test — the STEP5 gate; `--change` verifies against the projected (post-merge) store, the mid-change form

```text
usage: apriori verify --specs <dir...> --test-cmd "<cmd>" [--id-pattern <re>] [--cwd <dir>] [--json]
   or: apriori verify --change <name> --test-cmd "<cmd>" [--id-pattern <re>] [--cwd <dir>] [--json]
(--test-cmd may be omitted when apriori/process-config.md has a test-cmd row;
 --id-pattern may be omitted when apriori/process-config.md has an id-pattern row)
```

Example: `apriori verify --change add-playback --test-cmd "npm test"`

Exit: 0 GREEN · 1 gaps · 2 untrustworthy run (missing inputs, non-TAP output, crash, merge conflict, CAS mismatch).

`--change` runs are **change-scoped**: the verdict (exit 0/1) judges only this change's requirement blocks (their scenarios bound green, no scoped duplicate/unidentified, no unprovable failure signal — an ID-less failure or a failing ID that no sibling active change declares still blocks, fail-closed); a red bound to an out-of-scope scenario, or one attributed to a sibling change's cleanly-parsed delta (only its ADDED/MODIFIED block scenarios grant the exemption), never blocks. The same run prints an informative **store report** (whole projection, six classes) so parallel changes go green independently while historical gaps stay visible. `--change --json` adds `storeReport`, `changeScope` and `modifiedIntegrity` on GREEN/GAPS (absent on every ERROR); `--specs` output is byte-identical to before. `modifiedIntegrity` reports every MODIFIED block's replacement fidelity (retained/titleChanged/dropped/added/ambiguous scenarios plus lost lines, requirement prose included) — informative only, never a verdict change; the human `— MODIFIED INTEGRITY —` section prints when a risk class is non-empty.

## apriori archive

merge a change's delta specs into the living store; `--change` discovers the whole change, dry-runs by default, commits failure-atomically on `--write`

```text
usage: apriori archive --store <f> --delta <f> --change <name> [--write] [--changes-dir <dir>]
   or: apriori archive --change <name> [--write] [--changes-dir <dir>]
```

Example: `apriori archive --change add-playback --write --changes-dir apriori/changes`

Exit: 0 merged/no-op · 1 conflict/CAS/malformed/stage-commit-move failure · 2 usage/not-found/containment.

## apriori stamp

print the CAS base-stamp line for a store file — paste it atop a delta; verify/archive then refuse if the store diverged

```text
usage: apriori stamp <store-file>
```

Example: `apriori stamp apriori/specs/kv/spec.md`

Exit: 0 printed (absent file → the `new` form) · 2 usage/directory/unreadable.

## apriori gate

aggregate the mechanical gate checks for one change into one exit code (binding verify, tasks, flow-state, ledger, verdict↔raw evidence, KB freshness); PASS ≠ human gates

```text
usage: apriori gate --change <name> [--test-cmd "<cmd>"] [--id-pattern <re>] [--cwd <dir>] [--json] [--no-cas]
```

Example: `apriori gate --change add-playback --json`

Exit: 0 PASS · 1 BLOCKED · 2 untrustworthy evaluation · 3 INCOMPLETE.

With no test command anywhere (no `--test-cmd`, no `test-cmd` config row) C1 is reported `skipped` and the other six checks still run — the aggregate is `GATE: INCOMPLETE` with exit code 3. A BROKEN test-command source (conflicting or unreadable config, an empty `--test-cmd`) stays exit 2: broken is not absent. A confirmed block outranks a skip, so exit 1 still wins over exit 3.

In-flight C1 consumes the change-scoped verdict (detail `verify GREEN (in-flight, change-scoped)` with a six-count store summary suffix) — parallel changes' gates go green independently; the archived stage still verifies the whole store.

## apriori check

structural consistency (scenario IDs bindable; `--self` adds the apriori repo's own handbook checks)

```text
usage: apriori check [--specs <dir>] [--self]
```

Example: `apriori check`

Exit: 0 PASS · 1 FAIL(n) · 2 missing store path or invalid/terminated `id-pattern` config (`RESULT: ERROR`).

CK-04 recognizes scenario IDs with the project's `id-pattern` row (no flag — a CI gate consumes the project constant; see §8.0), through the same recognition contract as verify.

## apriori update

refresh tool-owned files (runbook copy, command pointers) after a CLI upgrade — never touches yours

```text
usage: apriori update [--dry-run]
```

Example: `apriori update --dry-run`

Exit: 0 done · 1 uninitialized.

## 8. Configuration Reference

### 8.0 process-config keys: id-pattern

`| id-pattern | <bare JS regex source> |` in `apriori/process-config.md` declares the project's scenario-ID shape once, for every consumer. Resolution order: the `--id-pattern` flag (verify and gate only; judged by presence — an empty flag is an error, never a fallback) > the config row > the built-in default `[A-Z]+-\d+`. `check` (CK-04) and `doctor` (D6) consume the row with no flag. All four consumers recognize IDs through the same contract: the match starts at the title's first character, a following letter/digit/underscore rejects it, no `\b` is appended, the source compiles as written.

Pipe escaping has two layers — never conflate them: inside a table cell every pipe belonging to the value is written `\|` (so an alternation cell `(AC\|BR)-\d+` parses to the regex source `(AC|BR)-\d+`, where the bare `|` is alternation); a regex that must MATCH a literal pipe character uses a character class, written `[\|]` in the cell and parsing to `[|]`. This escape rule applies to every config key uniformly.

Errors are consumption-time and fail closed, naming their origin (`--id-pattern` or `process-config`): verify and gate exit 2 through their existing text/JSON error shapes, check prints `RESULT: ERROR` (exit 2), doctor reports a D6 finding and skips the D5 probe (result FINDINGS, exit 1) — never a silent fallback to the default. A config-sourced pattern is repository input that CI consumes automatically, so its matching runs inside a terminable child process (killed on budget — a catastrophic-backtracking row cannot hang CI); the flag is operator-interactive input and runs in-process.

### 8.0b process-config keys: verification-profile

`| verification-profile | ui / backend / fullstack / docs / none |` declares once, for the whole project, what kind of thing this repository is — and therefore what evidence its verification asks for. The row is **human-owned**: agents read it, never write it, exactly like `test-cmd`.

An absent row, an empty cell and the literal `none` all mean the same thing: nothing escalates. Under `ui` or `fullstack` a bundle that touched frontend files is asked for a screenshot observation record (`evidence/screenshots.md`); under `backend` or `docs` it is not. The obligation is **tier-parameterized**: at the full tier (formal changes) the record is required, and in the hotfix lane a missing record prints an advisory and never blocks. Whatever the tier, a record that IS present is validated in full — providing one buys no leniency.

A record line reads `- path=<repo-relative, under apriori/tmp/> obs=<one line> time=<ISO UTC seconds> baseline=<repo HEAD> run=<id>`. A backend-only bundle waives with `ui: not-applicable — <reason>`; a waiver without a reason is not a waiver.

### 8.1 Spec-authoring rules

These are the spec-quality rules the propose action (STEP2) and apply action (STEP5) enforce. In V3 they live in your **project rules file** (§8.2) — there is no separate tool config. Below is a general baseline — add or remove per project:

```yaml
# Spec-authoring rules — fold these into your project rules file (§8.2)
context: |
  Language: English
  All artifacts must be written in English.

rules:
  proposal:
    - Only create artifacts (proposal.md/design.md/specs/tasks.md); do not modify any source files
    - Stop when done and wait for review, then the apply step (STEP5)
    - Every "user-visible output" must have its own scenario; if one requirement has multiple visible side-effects (e.g. "filtering" and "showing the filtered-out results"), write them as two separate scenarios, never merged into one sentence
    - Give every scenario a stable ID (e.g. KV-03); downstream tests must reference these IDs (`apriori verify` binds them, `apriori check` rejects an ID-less scenario)
    - |
      For any spec involving "external shared state" (Redis, DB fields, global singletons, etc.),
      you MUST additionally describe behavior at these three moments:
      1. Initialization (how it's written at run/session/request start)
      2. Update at runtime
      3. Cleanup/invalidation (how it's handled on run end, timeout, reset)
      Missing any one of these moments means the spec is incomplete.
  tasks:
    - Each task's granularity is at most one file or one feature point
    - All tasks must be listed individually, never merged
  apply:
    - Execute strictly in the order of tasks.md
    - Mark each task [x] immediately on completion before continuing
    - Stop when all done, `apriori verify` is GREEN, and the change is ready for archive (STEP6)
    - For any continue / silent-ignore / skip branch in the code, re-check the spec to confirm whether that branch must be user-visible; if the spec requires it, produce the corresponding record — don't satisfy only the "exclude the main path" while dropping the "display side"
    - Name every test after the scenario ID it covers (e.g. `test('KV-03 …')`); a spec scenario with no matching test fails `apriori verify`
    - Every key branch or function entry in the code must log; the log format is `[UUID]-description,XXX:[{}],YYY:[{}]` (this format is an example — swap in your own team's logging convention from the rules file, §8.2)
```

### 8.2 Project Rules File (CLAUDE.md and Per-Tool Equivalents)

The rules file is the Agent's "always-on global convention." Each tool puts it in a different place, but **the content is the same**:

| Tool | Rules file location |
|---|---|
| Claude Code | `CLAUDE.md` (project root) |
| Cursor | `.cursor/rules/*.mdc` |
| Windsurf | `.windsurf/rules` (or workflow files) |
| Copilot | `.github/copilot-instructions.md` |
| Codex | `AGENTS.md` |

> Whichever tools you use, also add one line to each rules file referencing your project's copy of the runbook (`apriori/runbook.md`, install steps in [RUNBOOK.md](../RUNBOOK.md) §0) — that line is what makes every session load the protocol automatically.

> **Land the same convention in all the tools your team uses**, so behavior is consistent across tools. The content of the rules file is **highly stack-specific** and should be written by you for your own project. Below is a **language-agnostic skeleton template** — fill in your team's real conventions (the example entries are placeholders, please replace).

````markdown
# Basics

* Reply in English throughout, including your reasoning
* Ask first when unsure; don't guess

# Project Architecture

## Directory / Module Structure

* `<dir-A>`: <responsibility>
* `<dir-B>`: <responsibility>
* … (list the key directories and their responsibilities, so the Agent knows "where code goes")

## Module Dependencies and Conventions

* <how modules reference each other; build/publish caveats>
* <operations to do in lockstep when changing across modules>

# Coding Conventions

* Naming: <naming convention>
* Library choices: <preferred standard/util libraries and their common methods, e.g. emptiness checks, time handling, random numbers>
* Layering constraints: <e.g. DB access only in the data-access layer, not the business layer>
* Dependency injection / resource management: <team preference>
* Other team habits: <list, one by one, the conventions people keep having to remind each other of>

# Logging Convention

A unified format, for global search and pinpointing:

```text
[UUID]-description,XXX:[{}],YYY:[{}]
```

* `UUID` is a genuinely-generated unique string used as a code tag, guaranteeing global uniqueness in the code
* Wrap the UUID and the printed object in `[]` for easy copying
* Print objects via JSON serialization; print non-objects directly
* For large collections, extract the key IDs first to avoid log explosions
* Log at key branches and function entries; no method may be entirely without logs

# Testing Convention

* Test file location: <convention>
* Base class / framework: <convention>
* Mock strategy: <what to mock (e.g. external remote calls), what to avoid mocking (e.g. local data access — operate for real where possible)>
* Test numbering / naming: <convention, e.g. numbering ranges for success vs failure scenarios>
* Coverage requirement: <scenario coverage is the hard bar — every spec scenario ↔ at least one test carrying its ID; treat line/branch coverage as a signal to investigate (e.g. anything below 85%), never a target to chase — a model told to hit a number will pad with assertion-free tests>
* Test method-body template: <give an empty-shell example to unify the style>
````

> Tip: deposit, one by one, the conventions your team keeps having to remind each other of into the rules file — grow it from observed needs, never front-load an encyclopedia and never auto-generate it (auto-generated instruction files measurably *hurt*: ≈−2% success, +23% cost, versus ≈+4% for human-written ones). Aim for single-digit kilobytes, and prune ruthlessly with the official test: *"would removing this line cause the agent to make mistakes? If not, cut it"* — bloated files cause instructions to be ignored. Six content categories consistently earn their keep: build/test commands, code-style rules that differ from defaults, project structure, testing instructions, git conventions, and boundaries. **The more specific and executable the rules, the more stable the Agent's output.**

---
