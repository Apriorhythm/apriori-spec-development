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

## apriori new

scaffold a change dir + flow-state skeleton

```text
usage: apriori new <change-name>   (bare kebab-case, e.g. add-playback)
```

Example: `apriori new add-playback`

Exit: 0 created · 1 name/exists error · 2 usage.

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
(--test-cmd may be omitted when apriori/process-config.md has a test-cmd row)
```

Example: `apriori verify --change add-playback --test-cmd "npm test"`

Exit: 0 GREEN · 1 gaps (unbound/red/orphan/duplicate) · 2 untrustworthy run (missing inputs, non-TAP output, crash, merge conflict, CAS mismatch).

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
usage: apriori gate --change <name> [--test-cmd "<cmd>"] [--cwd <dir>] [--json]
```

Example: `apriori gate --change add-playback --json`

Exit: 0 PASS · 1 BLOCKED · 2 untrustworthy evaluation.

## apriori check

structural consistency (scenario IDs bindable; `--self` adds the apriori repo's own handbook checks)

```text
usage: apriori check [--specs <dir>] [--self]
```

Example: `apriori check`

Exit: 0 PASS · 1 FAIL(n) · 2 missing store path.

## apriori update

refresh tool-owned files (runbook copy, command pointers) after a CLI upgrade — never touches yours

```text
usage: apriori update [--dry-run]
```

Example: `apriori update --dry-run`

Exit: 0 done · 1 uninitialized.

## 8. Configuration Reference

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
