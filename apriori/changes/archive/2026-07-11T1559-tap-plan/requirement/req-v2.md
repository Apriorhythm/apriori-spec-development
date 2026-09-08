# Requirement — tap-plan (v2)

change: tap-plan
target lineage: **v3 branch**. Next patch/minor. Fail-closed tightening: previously-trusted truncated/garbled TAP runs now refuse to verify; conforming single-stream runs unchanged.

Revisions vs v1 (P1 r1): TP-1 → multiple plans now FAIL CLOSED (the sum rule is dropped — it was maskable); TP-2 → point matcher pinned to TAP result-token syntax; TP-ADV-1 → skip-all directive, numeric dup comparison, doctor scope declared.

## Background — the problem (current state A, reproduced)

`parseTap` never reads the TAP plan line. `1..N` is used in exactly one place — `zeroTapParsed`, as proof the reporter IS TAP — and is never compared against what was actually parsed. Two mechanical repros (2026-07-11, this repo):

1. **Truncated stream → GREEN.** Spec with one scenario; test-cmd emits `TAP version 13`, `1..2`, `ok 1 - TP-01 a`, exit 0. The plan promises two test points, one arrived, the run verifies GREEN. Any truncation that cuts whole result lines (pipe kill, runner crash after partial flush, `head` in the pipeline) is invisible as long as the surviving lines cover the scenarios and the exit code is 0.
2. **Duplicate test-point numbers → GREEN.** `1..2` followed by `ok 1 - TP-01 a` and `ok 1 - TP-02 b` (test point 2 never ran; something ran twice as 1) verifies GREEN.

`infraErrors` catches a NONZERO exit with no parsed failure, but a truncated-yet-exit-0 stream sails through. (GPT-5.6 second review, defect #2.)

## Goal (target state B)

The TAP **plan** becomes a checked promise: exactly one plan may be present; when it is, the number of parsed top-level test points must equal the plan total, and top-level test-point numbers must not repeat. Violations are **infra errors** (run untrustworthy → verify RESULT: ERROR exit 2, gate C1 BLOCKED), not bindings.

**Mechanics (parser layer, `lib/spec-runner.js`):**
- `parseTap` additionally collects:
  - `plans`: every top-level plan line `/^1\.\.(\d+)\s*(#.*)?$/` (a `# SKIP`/`# TODO` directive after the count is legal; N still parses — `1..0 # SKIP no backend` is a zero plan).
  - `points`: count of ALL top-level TAP result tokens `/^(?:ok|not ok)(?:\s|$)/` — including legal points today's binding regex skips (no number, no `- ` description, `# SKIP`/`# TODO` directives). `ok:`-prefixed diagnostic-like lines are NOT result tokens and never count. Indented (subtest/YAML) lines stay invisible, as today — node's nested TAP keeps working; the top-level plan counts top-level points.
  - `dupNumbers`: top-level test-point numbers (compared NUMERICALLY — `ok 01` duplicates `ok 1`) seen more than once. Unnumbered points are legal TAP and exempt.
- New infra errors in `infraErrors`:
  - more than one top-level plan → "multiple TAP plans in one run — cannot attribute test points to plans; run one TAP stream per verify (split the test command)". FAIL CLOSED: the v1 sum rule was maskable (one stream's truncation offset by another's extra points) and is dropped.
  - exactly one plan and `plan !== points` → "TAP plan declares N test point(s) but M were parsed — output truncated or garbled; refusing to trust this run".
  - exactly one plan and `dupNumbers` non-empty → "duplicate TAP test-point number(s): ...".
- No plan at all: behavior unchanged (some minimal TAP emitters skip the plan; absence was never a promise). DD-1.
- Plan position (leading or trailing) is irrelevant — only count and uniqueness are checked.

**Consumers:** `verify`, `verify --change`, `gate` C1 inherit through `infraErrors` — no new wiring. `doctor`'s TAP probe (`classifyProbe`) is NOT in scope: it diagnoses reporter shape, not run trustworthiness; the exclusion is intentional and stays visible in the design (TP-ADV-1).

## Acceptance criteria (testable)

- E1. Repro 1 verbatim: plan `1..2`, one passing result, exit 0 → RESULT: ERROR (exit 2), message names 2 declared vs 1 parsed; nothing verifies GREEN.
- E2. Repro 2 verbatim: duplicate `ok 1` under one plan → RESULT: ERROR naming the duplicated number; `ok 01` + `ok 1` also duplicates (numeric comparison).
- E3. Two concatenated TAP streams (two plans, any shape) → RESULT: ERROR naming multiple plans, even when totals happen to add up (the TP-1 masking fixture verbatim: `1..2`, one point, `1..1`, two points).
- E4. Unnumbered/undescribed top-level points count toward the plan total (plan `1..2`, `ok 1 - X-01 t`, bare `ok` → no plan error); `ok: something` diagnostic lines do NOT count (plan `1..1`, `ok 1 - X-01 t`, `ok: note` → no plan error).
- E5. Plan-less TAP output behaves exactly as today (no new error).
- E6. Subtest-indented lines and their nested plans are ignored by the point count, the plan collection, and the dup check (node --test nested TAP verifies as today; the repo's own suite stays green through the full gate chain).
- E7. `1..0 # SKIP reason` with zero points → consistent (no plan error; existing zero-scenario/zero-TAP handling unchanged).
- E8. `verify --change` and `gate --change` inherit the failure (one E2E each).
- E9. All existing tests pass; suite + verify + gate + check --self green.

## Out of scope

- Binding semantics (which lines produce results) — unchanged.
- `doctor` probe classification (diagnostic, not trust-gating) — intentional exclusion.
- TAP 14 subtest syntax beyond what node emits today.
- update.js manifest (P0-3, next change).

## Decisions proposed

- DD-1: absent plan stays legal (no promise made, none checked) — enforcement would break minimal emitters that never lied.
- DD-2 (replaces v1's): multiple plans fail closed rather than sum or segment-match — segment attribution is ambiguous across leading-vs-trailing-plan emitters, and a rule that guesses is a rule that can be gamed; the error tells the user to split the command.
