<!-- apriori-base: sha256:9e0a7a315265a7a8062dc538003dac9bf217070621087a946475f2c6a90dc156 -->
# Delta — spec-runner (tap-plan)

## ADDED Requirements

### Requirement: the TAP plan is a checked promise
When the test command's output carries exactly one top-level TAP plan line (`/^1\.\.(\d+)\s*(#.*)?$/` — a trailing `# SKIP`/`# TODO` directive is legal and `N` still parses), the run SHALL be trusted only if the plan total equals the count of top-level TAP result tokens (`/^(?:ok|not ok)(?:\s|$)/` — unnumbered and undescribed points count; `ok:`-prefixed diagnostic-like lines and indented subtest/YAML lines never count) and no top-level test-point number repeats (compared numerically, so `01` duplicates `1`; unnumbered points are exempt). More than one top-level plan SHALL itself be an infra error naming the cure (one TAP stream per verify). Absent plans keep today's behavior — no promise made, none checked. Violations are infra errors (verify exits 2 / RESULT: ERROR; gate exits 2 / ERROR reporting the verify plan error — an untrustworthy run outranks a C1 binding block), never bindings; `verify`, `verify --change`, and `gate` inherit through `infraErrors` with no new wiring, and `doctor`'s probe classification is intentionally out of scope.

#### Scenario: SR-26 a truncated plan refuses to verify
- WHEN the test command emits a plan `1..2`, a single passing result, and exit 0
- THEN verify reports RESULT: ERROR (exit 2) naming 2 declared vs 1 parsed, and nothing verifies GREEN

#### Scenario: SR-27 duplicate test-point numbers are untrustworthy
- WHEN one plan is present and two top-level results carry the same number (including `ok 01` vs `ok 1`)
- THEN verify reports RESULT: ERROR naming the duplicated number(s)

#### Scenario: SR-28 multiple plans fail closed even when totals mask
- WHEN the output carries two top-level plans whose declared totals happen to equal the parsed points (`1..2`, one point, `1..1`, two points)
- THEN verify reports RESULT: ERROR naming multiple plans and advising one TAP stream per verify

#### Scenario: SR-29 the point count speaks TAP, not prefixes
- WHEN a plan `1..2` is followed by a numbered described result and a bare `ok`, with an `ok: note` diagnostic line nearby
- THEN the bare point counts toward the plan, the `ok:` line does not, and no plan error is raised

#### Scenario: SR-30 plan-less, skip-all, and nested TAP stay legal
- WHEN output has no plan at all, or a `1..0 # SKIP reason` plan with zero points, or node-style nested TAP whose indented subtest lines carry their own plans and results
- THEN no plan infra error is raised and verification behaves exactly as before

#### Scenario: SR-31 projected verify and gate inherit the plan check
- WHEN a change's projected verify (or `gate --change`) runs against a test command whose TAP plan does not match its results
- THEN `verify --change` exits 2 (RESULT: ERROR) and gate exits 2 reporting the verify plan error (an untrustworthy run is gate ERROR, like every other infra failure — not a mere BLOCKED)
