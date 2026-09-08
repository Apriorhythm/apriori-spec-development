# Design — tap-plan

All in `lib/spec-runner.js`; no new files, no signature breaks.

**parseTap** (additive return fields — existing callers destructure what they need):
- New per-line pre-pass over `out.split('\n')` with one trailing `\r` stripped per line (consistent with fingerprint/delta handling); the existing TAP_RE binding pass is untouched.
- `plans: number[]` — every line matching `PLAN_LINE_RE = /^1\.\.(\d+)\s*(?:#.*)?$/` (top-level only: the `^` is per split line, no indent tolerated; the optional trailing comment covers `# SKIP`/`# TODO` directives; N parsed via Number()).
- `points: number` — count of lines matching `POINT_LINE_RE = /^(?:ok|not ok)(?:\s|$)/` (top-level result tokens; `ok:` fails the `(?:\s|$)` guard; indented subtest/YAML lines fail `^`).
- `dupNumbers: number[]` — for point lines that carry a COMPLETE numeric point token (`/^(?:ok|not ok)\s+(\d+)(?:\s|$)/` — the trailing boundary keeps `ok 1abc` unnumbered rather than misread as number 1; TPSPEC-2), Number() them, collect values seen more than once (Set-based, each dup reported once, sorted). Unnumbered points contribute nothing.
- Return `{ results, untagged, untaggedFails, bailout, plans, points, dupNumbers }`.

**infraErrors** (three new guards, after the existing noTap guard so the "not TAP at all" cure keeps precedence). `infraErrors` is an EXPORTED helper with existing direct callers passing run objects that predate the new fields — it reads them defensively (`const plans = run.plans || [], points = run.points || 0, dupNumbers = run.dupNumbers || []`), so legacy run shapes stay valid and only verify-created runs (which carry the real fields) can trip the new guards (TPSPEC-1):
- `plans.length > 1` → `multiple TAP plans in one run (${plans.join(', ')} …)` — cannot attribute test points to plans; run one TAP stream per verify (split the test command).
- `plans.length === 1 && plans[0] !== points` → `TAP plan declares ${plan} test point(s) but ${points} were parsed — output truncated or garbled; refusing to trust this run`.
- `plans.length === 1 && dupNumbers.length` → `duplicate TAP test-point number(s): ${dupNumbers.join(', ')}`.
- No plan (`plans.length === 0`): nothing new (DD-1).

**verify plumbing**: the `run` object passed to `infraErrors` gains `plans/points/dupNumbers` from parseTap's return at the existing call site (verify and verifyChange share it). gate C1 and `--json` inherit via the existing infra array — no new wiring; `doctor` does not call `infraErrors` and stays out of scope by construction.

**Tests** (`test/spec-runner.test.js` or the existing verify test home): SR-26..31 — unit-level parseTap assertions (plans/points/dupNumbers on crafted strings incl. CRLF) + E2E fixtures with a fake TAP-emitting test-cmd (repro scripts from req-final verbatim: E1 truncation, E2 dup incl. `01`, E3 masking fixture, E4 bare-`ok` + `ok:` line, E5 plan-less, E7 `1..0 # SKIP`, E6 nested via the repo's own suite, E8 verify --change + gate). Existing tests must stay green (E9).

**Self-test note**: the repo's own gates run through run-tests.mjs → single node --test stream → one trailing plan whose count matches — SR-30/E6 is proven by the gate chain itself staying green.
