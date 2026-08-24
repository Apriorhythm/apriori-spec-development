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

## apriori status

where each change is: phase, Reality Check, evidence rows, open issues, next actions, the derived review round and any escalation

```text
usage: apriori status [--change <name>] [--json] [--escalation]
```

Example: `apriori status --change add-playback --json`

Exit: 0 on success paths (status reports, never gates) — except `--escalation`, which exits **3** when a human is being waited on.

**The one state, read back.** `--change` reports what the flow-state carries: `phase`; `reality` — the `## Reality Check` split into `observed` / `decision` / `assumption` plus any entry naming no kind (reported as unreadable, never dropped); `evidence` — the `## Evidence` rows and the blockers they imply; `openIssues` — the `## Open` entries; `next` — the `## Next` actions, of which the state carries at most three (a longer list prints the first three and says how many there were); and `delivery`. Every unverified `assumption` gets its own line: it is the one Reality Check kind that still owes something.

**`--escalation` is the hard stop.** It prints every reason a human is being waited on — the state's own `escalation:` line, each escalating review family, and each blocked evidence row — and exits **3** when there is one, **0** when there is none (`ESCALATION: none`). An ARCHIVED bundle never raises one: its evidence findings are printed as `recorded, not re-judged`, and its deltas are not re-scanned — a frozen record is reported, never turned into a debt somebody is asked to pay. That exit code is the whole mechanism: wire it into a Stop hook or a CI step if you want one. This repository ships no hook of its own.

**Review rounds and escalation.** `--change` adds two derived fields — nothing here is read off a hand-written `round:`. `review.families` carries one entry **per review family** (`spec-review`, `code-review`, …): `{family, round, verdict, issuesOpen, stopped, escalating}`. Rounds are counted inside a family and never summed across families, so three families at 2 + 2 + 1 rounds is exactly that, not "round 5". `verdict` comes from the family's highest ordinal — a `0 issues open` / `0 issues found` count is an accept — `issuesOpen` is the number when the verdict used a counted form and `null` otherwise, and `stopped` is true while gate's C8 blocks that family. `review.problems` lists evidence that refuses to be read as a round and blocks: a verdict outside the vocabulary, one document declaring two different outcomes, a duplicated family/round claim, a summary whose verdict was removed while its transcript remains, a round-named transcript with no summary, an ordinal gap. `review.advisories` lists what is merely worth mentioning and never blocks: a document whose body was pasted twice with the same verdict both times, and a transcript that was never a review round (`kb-check-raw.txt`). `review.defect` is set instead when the `review/` directory itself is a symlink, escapes the bundle or is not a directory — status names it and refuses to read through it, exactly as gate does. `escalation` is `null` until a family escalates — either a reviewer returned `VERDICT: escalate` at any round, or the family reached its round 5 — and then an array of `{family, round, verdict, reason, acknowledged, decision}`; an owner decision in `gates:` flips `acknowledged`, and a malformed document elsewhere never removes the entry. There is no per-round trend of newly-found issues: the evidence carries an open count, not a delta. A bundle with no readable flow-state gets `null` for both fields. Runbook §1 R4 is the rule these fields report.

## apriori verify

bind every spec scenario ID to a passing TAP test — the Build & Test gate; `--change` verifies against the projected (post-merge) store, the mid-change form

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
usage: apriori archive --store <f> --delta <f> --change <name> [--write] [--no-cas]
   or: apriori archive --change <name> [--write] [--changes-dir <dir>] [--no-cas] [--force]
```

Example: `apriori archive --change add-playback --write --changes-dir apriori/changes`

**Readiness.** The high-level form refuses a change that is not finished, in dry-run and `--write` alike, and prints `RESULT: NOT READY — nothing written` (exit 1): **R1** the flow-state must be structurally sound, pass the same legality checks `gate`'s C3 runs, and say `phase: review`; **R3** a ledger the change chose to keep must carry no `open` row; **R4** every review family's loop must have converged or carry its recorded reframe (the same derivation gate's C8 reads — see below); **R5** the one substantive state predicate, the same code and the same two inputs (the delta scan and the effective mode) `gate` runs at C9 — no `blocked` row without the owner's recorded acceptance, no unanswered `contract-mutation`, no unreadable delta, no open issue or standing assumption, and standard's one substantive row. R5 is never forceable: `--force` overrides progress, and missing reality is not progress. **There is no R2** — 6.0 asks for no task list, so no archive is ever stopped by one, and a `tasks.md` a 5.x bundle still carries is reported by `gate`'s C2 as a diagnostic. R1 reports its first hit alone; the later rules report together. A genuinely absent ledger is `n/a` in either mode — but an *unreadable* one never is: only a true `ENOENT` takes the absent branch, and every other error code (EACCES, EIO, ELOOP …) is a structural refusal. Readiness is evaluated after every other preflight guard, so existing diagnoses and exit codes are unchanged, and it is one look rather than a lock — nothing is re-read between the check and the commit.

**The archive declaration.** It is also a BACKSTOP: a run whose own declaration would read `implementation: INCOMPLETE` is refused (`RESULT: NOT READY — nothing written`) even if readiness let it through, so a successful archive can never declare the work unfinished. A ready run prints three states and nothing else — whether the implementation is complete (open issues and unverified assumptions counted), whether the critical evidence is complete (blocked rows counted, owner-accepted risks named), and whether the change is released or still pending external acceptance (`delivery:`). An archived bundle is FROZEN: a defect found later becomes a short outcome note or a new change, never an edit to the archive.

**`--force`** belongs to the high-level form and overrides **progress only**: ledger rows still reading `open`, and an escalation the owner already answered. It never overrides R1 (`abandoned` above all), a structural defect, a stalled round-2 loop, an unmet review floor, or an R5 evidence refusal — critical evidence that was never run is not progress. It takes effect only when the bundle's flow-state already carries an anchored record:

```text
  - <YYYY-MM-DDTHH:MM> owner: archive-force ledger — <the human's reason, verbatim>
```

That is the SAME canonical owner entry the §6 evidence exit and the loop's `reframe` decision use, and it is read by one parser: a real timestamp, the actor spelled exactly `owner`, the lowercase verb opening the payload, the target matched whole, an em dash, and a reason. `producer:`, `note:`, `agent:` and a `gate⑤ (owner):` prefix authorise nothing, in any of the three grammars; `ledger` is the only class, `ledger2` is not it, and `do not archive-force ledger — …` opens with prose rather than the verb. Revocation appends `archive-force-revoke ledger — <reason>` (`gates:` is an append-only log) and the last decision wins. The authorisation is **standing** for the bundle's lifetime, not per-run. Every overridden blocker is printed with the record's raw first line.

**Single-file form.** `--store/--delta` is one-module surgery on a store file. It does not accept `--changes-dir` (and therefore never moves a change dir) or `--force`, and it refuses any `--delta` that resolves inside `apriori/changes` — judged by both the lexical spelling and the realpath, at path-segment boundaries. A change bundle is archived whole, by name.

Exit: 0 merged/no-op · 1 conflict/CAS/malformed/not-ready/out-of-scope delta/stage-commit-move failure · 2 usage/not-found/containment.

## apriori stamp

print the CAS base-stamp line for a store file — paste it atop a delta; verify/archive then refuse if the store diverged

```text
usage: apriori stamp <store-file>
```

Example: `apriori stamp apriori/specs/kv/spec.md`

Exit: 0 printed (absent file → the `new` form) · 2 usage/directory/unreadable.

## apriori gate

aggregate the mechanical gate checks for one change into one exit code (binding verify, flow-state, ledger, verdict evidence, KB freshness, review-loop convergence, critical evidence); PASS ≠ a human decision

```text
usage: apriori gate --change <name> [--test-cmd "<cmd>"] [--id-pattern <re>] [--cwd <dir>] [--json] [--no-cas] [--review-ready]
```

Example: `apriori gate --change add-playback --json`

Exit: 0 PASS · 1 BLOCKED · 2 untrustworthy evaluation · 3 INCOMPLETE.

**C2 and C4 no longer demand a document.** C2 (the task list) can only ever report `–`: 6.0 requires no `tasks.md`, so an absent one is normal and a 5.x one is read as a diagnostic — unchecked boxes are named, never blocking. C4 (the ledger) is `–` when there is none, in either mode; when a change keeps one, exactly one finding blocks — a row still reading `open`. An unknown status token, a reasonless rejection, an unrecorded `waived`, and an archive-stage `fixed` that never reached `verified` are printed as bookkeeping notes beside the verdict.

**C9 — the one substantive evidence predicate.** One check, one question: does this change's own state still owe something real? It reads three things.

*The `## Evidence` rows* (`- <risk>: done | blocked | owner-accepted | n/a — <detail>`). A `blocked` row blocks: critical evidence that was never run is the one gap no extra review and no extra document can fill. An unreadable row or an unknown status token blocks, because a check that could not be made must never read as "no risk found". **No rows at all blocks too** — silence is not an answer. An `owner-accepted` row blocks unless the owner's own decision is on record in the append-only `gates:` log, in a CLOSED grammar: `- <YYYY-MM-DDTHH:MM> owner: evidence-accept <exact-row-id> — <reason>` (revoke by APPENDING `evidence-accept-revoke <id> — <reason>`; `gates:` is append-only, so the last decision wins). Every part of that line is load-bearing — a real timestamp, the actor spelled exactly `owner`, the lowercase keyword OPENING the payload, the row id whole and case-sensitive, the em dash, and a reason carrying a letter or digit in any script. `producer:`, `note:`, a `gate⑤ (owner):` prefix, an undated line, a missing dash or reason, a superstring id (`data-schema-2` for `data-schema`) and generic accept prose (`owner: data-schema evidence accepted — …`) authorize **nothing**: a producer may not grant itself the owner's exit.

*What the CLI already PROVED about the delta.* A delta that mutates a published requirement (`## MODIFIED` / `## REMOVED` / `## RENAMED`) makes a row named exactly `contract-mutation` owe an answer — `done`, or an acceptance the owner really recorded. `n/a` contradicts a proven fact and is refused. A delta the scanner could not read (`specs/` that does not resolve, resolves outside the bundle, or a delta file that escapes or cannot be read) is **fail-closed**: no evidence row and no owner acceptance cures it, because a scan that could not rule the risk out may never read as "no risk found".

*The state's own claims.* An `## Open` item, a Reality Check `assumption` still standing, or a Reality Check line naming no kind — each is the producer saying, in its own words, that the work is unfinished, and each is read verbatim. `## Next` carrying more than three actions is reported by `status` and never blocks.

A `standard` change additionally owes at least one substantive row that is **not** `producer-diff` — reading your own diff is hygiene, not evidence about the product. A `fast` change with no machine risk may answer with C1 plus `producer-diff` alone. Acceptance settles one risk; it never changes the change's mode. An ARCHIVED bundle is reported, never re-judged.

**`--review-ready`** re-faces the SAME evaluation as an admission answer and writes nothing — no receipt file, no state field, no cached verdict; the next run recomputes it. THREE items, each a fact this run measured: the real test/binding result (C1), the evidence rows (C9), and the producer's own diff check — the reserved `producer-diff` evidence row, which must be SETTLED (`done`, or an owner acceptance really recorded). `n/a` does not clear it: it says there was no diff to read. A fourth item once reported whether "the reviewer's default context is available", derived from whether C1 had run — it measured nothing about a reviewer and could not fail on its own, so it is gone, along with the closing line that promised what the reviewer gets. What the run already holds is printed instead: the delta specs it projected, and C1's own binding counts. Exit 0 when every item holds, 1 when any does not — and an unready change goes back to Build & Test rather than into a review round. A skipped C1 never reads as ready: the reviewer must not be the first to run the suite.

With no test command anywhere (no `--test-cmd`, no `test-cmd` config row) C1 is reported `skipped` and the other checks still run — the aggregate is `GATE: INCOMPLETE` with exit code 3. A BROKEN test-command source (conflicting or unreadable config, an empty `--test-cmd`) stays exit 2: broken is not absent. A confirmed block outranks a skip, so exit 1 still wins over exit 3.

**C8 — the review loop, per family.** Rounds are derived from the review evidence (the same scan C5 uses) and counted inside each family, never summed across families. The derivation runs in two phases: verdict MEANING is read leniently from a closed vocabulary (accept/revise phrasings plus `N issues open` / `N issues found`, `0` being an accept — but never by prefix, so an accept phrase with a contradicting tail is refused rather than misread), while evidence COMPLETENESS is judged strictly. C8 is `n/a` before the first complete round anywhere; it blocks when a family is still `revise` after ITS round 2 with no `reframe <family> round <n> <split|tests|redo> — <reason>` entry in `gates:`, when a family escalates — a reviewer's `VERDICT: escalate` at any round, or ITS round 5 — until the owner answers with `reframe <family> round <n> <split|tests|redo|accept-risk> — <reason>`, and on any evidence **problem** — an unreadable verdict, one document declaring two different outcomes, two documents claiming the same family and round, a summary whose verdict was deleted while its transcript remains, a round-named transcript with no summary, or a gap in a family's 1..N ordinals. Problems are fail-closed and no reframe waives them: the cure is fixing the evidence, not deciding about it. **Advisories never block** — a body pasted twice with the same verdict, or a transcript that was never a review round. An acknowledged escalation passes and still prints its ESCALATION line. An unreadable `review/` leaves C8 `n/a`: C4 and C5 already block on it.

`apriori archive` consults the same loop through readiness rule **R4**, so a stopped loop or an evidence problem refuses the archive with nothing written and nothing moved, while advisories pass. A stalled round-2 loop is not forceable; the round-5 stop-loss needs both the owner's recorded `reframe` decision and an explicit `--force`.

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

`| id-pattern | <bare JS regex source> |` in `apriori/process-config.md` declares the project's scenario-ID shape once, for every consumer. Resolution order: the `--id-pattern` flag (verify and gate only; judged by presence — an empty flag is an error, never a fallback) > the config row > the built-in default `[A-Z]+(?:-[A-Z]+)*-\d+[a-z]*` — which already recognises multi-segment (`AC-BIS-01`) and lowercase-suffixed (`AC-30f`) IDs, so most projects never need the row at all. `check` (CK-04) and `doctor` (D6) consume the row with no flag. All four consumers recognize IDs through the same contract: the match starts at the title's first character, a following letter/digit/underscore rejects it, no `\b` is appended, the source compiles as written.

Pipe escaping has two layers — never conflate them: inside a table cell every pipe belonging to the value is written `\|` (so an alternation cell `(AC\|BR)-\d+` parses to the regex source `(AC|BR)-\d+`, where the bare `|` is alternation); a regex that must MATCH a literal pipe character uses a character class, written `[\|]` in the cell and parsing to `[|]`. This escape rule applies to every config key uniformly.

Errors are consumption-time and fail closed, naming their origin (`--id-pattern` or `process-config`): verify and gate exit 2 through their existing text/JSON error shapes, check prints `RESULT: ERROR` (exit 2), doctor reports a D6 finding and skips the D5 probe (result FINDINGS, exit 1) — never a silent fallback to the default. A config-sourced pattern is repository input that CI consumes automatically, so its matching runs inside a terminable child process (killed on budget — a catastrophic-backtracking row cannot hang CI); the flag is operator-interactive input and runs in-process.

### 8.1 Spec-authoring rules

These are the spec-quality rules the Specify and Build & Test phases enforce. In V3 they live in your **project rules file** (§8.2) — there is no separate tool config. Below is a general baseline — add or remove per project:

```yaml
# Spec-authoring rules — fold these into your project rules file (§8.2)
context: |
  Language: English
  All artifacts must be written in English.

rules:
  specify:
    - Only write the behavior contract (delta specs under the change's specs/); do not modify any source files
    - Stop when done and wait for review, then Build & Test
    - Every "user-visible output" must have its own scenario; if one requirement has multiple visible side-effects (e.g. "filtering" and "showing the filtered-out results"), write them as two separate scenarios, never merged into one sentence
    - Give every scenario a stable ID (e.g. KV-03); downstream tests must reference these IDs (`apriori verify` binds them, `apriori check` rejects an ID-less scenario)
    - |
      For any spec involving "external shared state" (Redis, DB fields, global singletons, etc.),
      you MUST additionally describe behavior at these three moments:
      1. Initialization (how it's written at run/session/request start)
      2. Update at runtime
      3. Cleanup/invalidation (how it's handled on run end, timeout, reset)
      Missing any one of these moments means the spec is incomplete.
  build:
    - The contract's scenarios are the work — there is no task list to follow
    - Stop when `apriori verify` is GREEN, every ## Evidence row is filled in, and `apriori gate --review-ready` exits 0
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
