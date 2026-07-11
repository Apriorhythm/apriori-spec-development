<p align="center">
  <a href="https://www.npmjs.com/package/apriori-cli"><img alt="npm" src="https://img.shields.io/npm/v/apriori-cli"></a>
</p>

<p align="center">
  Languages:
  <a href="./README.md">English</a> ·
  <a href="./README_cn.md">中文</a>
</p>

# A Practical Handbook for Spec-Driven Development

## What is this & how to use it

**apriori** is a spec-driven workflow for AI coding, plus a zero-dependency CLI (`apriori-cli`) that makes your specs **executable**: every scenario is bound to a test, so "spec'd but never built" is caught by a command, not by eyeballing a diff. You drive an AI agent through a state machine — refine the spec, adversarial review by a *different* model, implement, archive — stopping at the human gates that matter.

Humans start with the Quickstart below; AI agents read the self-contained [RUNBOOK.md](./RUNBOOK.md) instead and never need this handbook. apriori answers in **whatever language you write in** (pin it with `apriori init --language 中文` if you prefer).

## Quickstart

Ten minutes, from an empty directory to a spec-bound green. Requires Node ≥ 22 and a POSIX shell.

```shell
npm i -g apriori-cli
mkdir hello-apriori && cd hello-apriori
apriori init --tools claude --test-cmd "node --test --test-reporter=tap" --yes
apriori doctor --no-run
```

`init` scaffolds `apriori/` and a runbook pointer for your AI tool; `doctor` confirms the seam is healthy (expect `DOCTOR: HEALTHY`; exit 0).

```shell
apriori new hello
cat > apriori/changes/hello/flow-state.md <<'EOF'
change: hello
tier: trivial
track: harden
track-rationale: quickstart demo
lineage: main
current-step: STEP5
round: 0
next-action: verify, then archive
gates:
  - 2026-01-01T00:00 note: quickstart demo
EOF
mkdir -p apriori/changes/hello/specs/hello
cat > apriori/changes/hello/specs/hello/spec.md <<'EOF'
## ADDED Requirements

### Requirement: greeting
The module SHALL greet by name.

#### Scenario: HL-01 greets by name
- WHEN greet('World') is called
- THEN it returns 'Hello, World'
EOF
apriori verify --change hello
```

Every change carries a tiny state file (`flow-state.md` — the tier sizes the workflow; an agent normally maintains it for you) and its delta specs. `verify --change` binds scenarios against the **projected** store (the store as it will look after this change merges). One scenario, zero tests → `RESULT: GAPS`, exit 1. Fail-closed is the point. Now make it green:

```shell
mkdir -p test
cat > hello.js <<'EOF'
module.exports = { greet: (name) => `Hello, ${name}` };
EOF
cat > test/hello.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert');
const { greet } = require('../hello');
test('HL-01 greets by name', () => assert.strictEqual(greet('World'), 'Hello, World'));
EOF
apriori verify --change hello
```

The test name carries the scenario ID — that is the whole binding contract. Expect `RESULT: GREEN — spec is the test suite`, exit 0.

```shell
apriori gate --change hello --json
apriori archive --change hello --write --changes-dir apriori/changes
apriori verify --specs apriori/specs
apriori check
```

`gate` aggregates the mechanical checks into one exit code (its PASS never replaces a human gate). `archive --change` merges the delta into the living store `apriori/specs/` and files the change away; plain `verify` now proves the merged store, and `check` is your CI guard. That's the loop: **spec → red → green → gate → archive**.

From here, work WITH an agent instead of by hand: idea still fuzzy → run */apriori* with no arguments (brainstorm first, nothing written until you approve); change already clear → *"Follow the apriori runbook for change `<name>`"* and answer at each human gate.

## Where everything else lives

| doc | what's in it |
|---|---|
| [docs/concepts.md](./docs/concepts.md) | why it works this way: core concepts, the AI toolbox, the full STEP0–STEP6 workflow, the mini-kv worked example, the prompt library |
| [docs/legacy.md](./docs/legacy.md) | existing codebases: the knowledge-base loop, doctor-first onboarding |
| [docs/ci.md](./docs/ci.md) | ready-to-paste CI snippets for `check` / `verify` / `gate`, exit-code table |
| [docs/cli.md](./docs/cli.md) | all ten subcommands: exact synopses, flags, exit codes, configuration reference |
| [docs/troubleshooting.md](./docs/troubleshooting.md) | every doctor finding and the classic traps, each with its fix |
| [RUNBOOK.md](./RUNBOOK.md) | the agent-facing executable protocol (canonical where they disagree) |

### Command Cheat Sheet

| `apriori` command | When | Purpose |
|---|---|---|
| `apriori init` | once per project | scaffold `apriori/` + per-tool pointers |
| `apriori doctor` | onboarding / anytime | diagnose the project↔apriori seam; findings name their fixer |
| `apriori new <name>` | change kickoff | scaffold `apriori/changes/<name>/` + a flow-state skeleton |
| `apriori status` | anytime | where each change is: step, next action, open ledger items (`--json`) |
| `apriori verify` | STEP5 exit gate | bind every scenario ID to a passing test; `--change <name>` = the projected, mid-change form |
| `apriori stamp <store-file>` | delta authoring | print the CAS base-stamp line — verify/archive refuse if the store diverged since |
| `apriori gate --change <name>` | STEP5/6, CI | one exit code over the mechanical checks (PASS ≠ human gates) |
| `apriori archive` | STEP6 | merge delta specs into the living store; `--change <name>` = whole-change, failure-atomic (up to the commit point) |
| `apriori check` | CI / pre-commit | structural consistency (scenario IDs bindable) |
| `apriori update` | after a CLI upgrade | refresh the runbook copy + command pointers (never your files) |

## Acknowledgments

The artifact interface this workflow is built on — delta specs (`ADDED` / `MODIFIED` / `REMOVED`), Requirement/Scenario blocks with stable IDs, the archive-merge semantics, and the multi-tool `init` scaffolding pattern — is directly inspired by **[OpenSpec](https://github.com/Fission-AI/OpenSpec/)**, which the V1 and V2 lines used directly. V3 reimplements that interface natively as the zero-dependency `apriori` CLI rather than depending on it — but the shape of the interface is OpenSpec's, and the debt is gladly acknowledged.
