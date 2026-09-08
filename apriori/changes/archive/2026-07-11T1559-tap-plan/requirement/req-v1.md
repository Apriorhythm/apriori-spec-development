# Requirement — tap-plan (v1)

change: tap-plan
target lineage: **v3 branch**. Next patch/minor. Fail-closed tightening: previously-trusted truncated/garbled TAP runs now refuse to verify; conforming runs unchanged.

## Background — the problem (current state B, reproduced)

`parseTap` never reads the TAP plan line. `1..N` is used in exactly one place — `zeroTapParsed`, as proof the reporter IS TAP — and is never compared against what was actually parsed. Two mechanical repros (2026-07-11, this repo):

1. **Truncated stream → GREEN.** Spec with one scenario; test-cmd emits `TAP version 13`, `1..2`, `ok 1 - TP-01 a`, exit 0. The plan promises two test points, one arrived, the run verifies GREEN. Any truncation that cuts whole result lines (pipe kill, runner crash after partial flush, `head` in the pipeline) is invisible as long as the surviving lines cover the scenarios and the exit code is 0.
2. **Duplicate test-point numbers → GREEN.** `1..2` followed by `ok 1 - TP-01 a` and `ok 1 - TP-02 b` (test point 2 never ran; something ran twice as 1) verifies GREEN.

`infraErrors` catches a NONZERO exit with no parsed failure, but a truncated-yet-exit-0 stream sails through. (GPT-5.6 second review, defect #2.)

## Goal (target state B)

The TAP **plan** becomes a checked promise: when a plan is present, the number of parsed top-level test points must equal the plan total, and test-point numbers must not repeat within a single-plan stream. Violations are **infra errors** (run untrustworthy → verify RESULT: ERROR exit 2, gate C1 BLOCKED), not bindings.

**Mechanics (parser layer, `lib/spec-runner.js`):**
- `parseTap` additionally returns `plans` (each top-level `^1..N` with its N) and `points` (count of ALL top-level result lines `/^(ok|not ok)\b/` — including legal TAP points that today's binding regex skips: no number, no `- ` description, `# SKIP`/`# TODO` directives) and `dupNumbers` (top-level test-point numbers seen more than once, only meaningful for single-plan streams).
- Indented (subtest) lines stay invisible, as today — node's nested TAP keeps working, the top-level plan counts top-level points.
- New infra errors in `infraErrors`:
  - plan(s) present and `sum(plans) !== points` → "TAP plan declares N test point(s) but M were parsed — output truncated or garbled; refusing to trust this run".
  - exactly one plan and duplicate top-level test-point numbers → "duplicate TAP test-point number(s): …".
- Multiple plans (concatenated TAP streams, e.g. two runners piped together): totals are summed; the duplicate-number check is skipped (numbering legally restarts per stream).
- No plan at all: behavior unchanged (some minimal TAP emitters skip the plan; absence was never a promise). Declared as DD-1 for review.
- `1..0` (skip-all) with zero points is consistent; existing zero-TAP/zero-scenario handling unchanged.

**Consumers:** `verify`, `verify --change`, `gate` C1 inherit through `infraErrors` — no new wiring.

## Acceptance criteria (testable)

- E1. Repro 1 verbatim: plan `1..2`, one passing result, exit 0 → RESULT: ERROR (exit 2), message names 2 declared vs 1 parsed; nothing verifies GREEN.
- E2. Repro 2 verbatim: duplicate `ok 1` under one plan → RESULT: ERROR naming the duplicated number(s).
- E3. Two concatenated conforming streams (`1..1` + point, `1..1` + point, numbers both 1) → no error (sum rule, dup check skipped).
- E4. Unnumbered/undescribed top-level points count toward the plan total (plan `1..2`, `ok 1 - X-01 t`, bare `ok` → no plan error).
- E5. Plan-less TAP output behaves exactly as today.
- E6. Subtest-indented lines and their nested plans are ignored by both the point count and the plan collection (node --test nested TAP verifies as today).
- E7. `verify --change` and `gate --change` inherit the failure (one E2E each).
- E8. All existing tests pass; suite + verify + gate + check --self green.

## Out of scope

- Binding semantics (which lines produce results) — unchanged.
- TAP 14 subtest syntax beyond what node emits today.
- update.js manifest (P0-3, next change).

## Decisions proposed

- DD-1: absent plan stays legal (no promise made, none checked) — enforcement would break minimal emitters that never lied.
- DD-2: dup-number check limited to single-plan streams — restart-at-1 is the defining shape of concatenated TAP, and false positives there would train users to ignore the error.
