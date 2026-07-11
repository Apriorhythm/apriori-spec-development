# Migrating

The 3.0.0 stability promise: CLI surface & flags, `--json` shapes, the delta format, the flow-state schema and the `apriori/` layout only break in a major. Everything below is either additive or a declared fail-closed tightening.

## 3.3.x → 3.4.0

Nothing on a documented success path changes. Five error-path behaviors are new — all fail-closed tightenings; each names its cure when it fires:

| situation | before | now |
|---|---|---|
| delta with a misspelled section heading / misplaced structure / stray stamp | content silently landed in the wrong bucket or vanished | line-numbered problem; `verify --change` exit 2, `archive` exit 1 |
| test output whose TAP plan doesn't match the parsed results (or duplicate test numbers, or two plans) | could verify GREEN | infra error: verify exit 2, gate ERROR |
| `apriori update` on a file it didn't create, or one you edited | overwritten with the template | reported (`unmanaged` / `modified`) and left byte-identical — delete + `apriori init --tools <t>` to hand a file back |
| ledger row with a status outside the vocabulary; archived change with non-terminal rows | gate C4 passed | C4 blocks naming the row (vocabulary: `open / fixed / rejected+reason / verified / rejected-verified / waived / advisory-acked`) |
| unstamped MODIFIED/REMOVED/RENAMED delta at the gate | passed silently | **C7 blocks by default** — run `apriori stamp <store-file>`, or waive visibly (`gate --no-cas`, or a `| cas | optional |` process-config row). verify/archive only warn this minor; stamps become mandatory in 4.0 |

Additive: `apriori/managed.json` (written by init/update — track it in git), `projection.unstampedMutations` + `projection.notes` in `verify --change --json`, gate C7 in output/`--json`, the runbook's external-side-effect authorization rule and ledger vocabulary sections (both editions), a post-archive `gate` run required at STEP6, and a stamped delta that already fully committed now re-runs cleanly (the CAS rerun repair).

## 3.2.x → 3.3.0

**Strict argument parsing.** Nothing on a documented success path changes. Three error-path behaviors are new, all fail-closed:

| you typed | before | now |
|---|---|---|
| `apriori <sub> --typo-flag` | silently ignored (verify could fall back to the config and verify the WRONG spec set, green) | exit 2 naming the flag |
| `apriori new a b` | `b` silently ignored | exit 2 naming `b` |
| `apriori stamp --foo` | `--foo` treated as the store-file positional | exit 2, unknown flag |
| `apriori verify --specs a -x ...` | `-x` consumed as a spec path | exit 2 naming `-x` |

If a script of yours relied on silent-ignore, the exit-2 message names exactly what to remove. Every subcommand now answers `--help`.

**README/docs layout.** The handbook moved: concepts/workflow/example → `docs/concepts.md`, legacy guidance → `docs/legacy.md`, CI snippets → `docs/ci.md`, CLI reference + configuration → `docs/cli.md`, troubleshooting → `docs/troubleshooting.md` (all with `_cn` mirrors). Old deep links into README sections should point at the docs files.

## 3.0.x → 3.1.0

**Deprecated blocks stop being demanded (the one behavior change).** Before 3.1, a requirement archived via `## REMOVED Requirements` kept demanding its scenarios' tests forever (the deprecated block still carried `#### Scenario:` headings). From 3.1, every `verify` form excludes deprecated blocks; a test still tagged with a removed scenario's ID reports as ORPHAN. **Action:** delete tests for removed scenarios — ORPHAN is the reminder, not a bug.

**New, all opt-in / additive:** `verify --change` (use it as the mid-change STEP5 gate — the runbook was updated accordingly), `archive --change`, CAS base stamps (`apriori stamp`; unstamped deltas behave exactly as before), stricter delta hygiene (deltas that were silently collapsing — duplicate requirement names, malformed stamps — now error; they were corrupt input all along).

## 2.x / 1.x → 3.x

The 1.x/2.x lines used the OpenSpec adapter and live on their own branches (`main`, `v2`) — there is no in-place migration; 3.x is a reimplementation of the same artifact interface as a zero-dependency CLI. Start fresh with `apriori init` and copy your spec content into `apriori/specs/` (the Requirement/Scenario format is unchanged).
