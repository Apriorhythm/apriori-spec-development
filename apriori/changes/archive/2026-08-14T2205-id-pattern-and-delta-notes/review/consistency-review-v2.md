# STEP5 Consistency Review — Round 2

## Summary

Five findings are verified. IMPL-3 is reopened because CF-18 still omits gate C1. One new gap, IMPL-7, was found: the widened default makes the existing GT-22 and GT-23 fixtures non-discriminating, allowing both tests to pass without proving their scenarios.

The production implementation itself remains faithful: the default pattern, D5 decoupling, D6 diagnostics, template values, and archive parser ordering all match the delta.

## Round-1 finding verification

### IMPL-1 — verified

The SR-08 compatibility oracle now performs a meaningful systematic sweep:

- More than 500 combinations of prefix length, digit count, trailing context, and near-miss construction.
- More than 50 cases actually enter the guarded old-pattern-bound branch.
- More than 300 real store IDs are checked against the new matcher.
- The raw-regex counterexamples remain present, preserving the correct `leadId`-level oracle.

This adequately protects the byte-identical compatibility guarantee.

### IMPL-2 — verified

CF-12 now checks all three required template locations separately:

- `parseConfig`’s effective VALUE.
- The row’s DEFAULT cell.
- The adjacent built-in-default comment.

The no-stale sweep remains. The actual template contains the widened pattern in exactly those three places.

### IMPL-3 — reopened

The config-origin child portion is fixed: `makeIdMatcher(resolved).batch(...)` is exercised for both title and TAP-description inputs, and the real verify command subsequently exercises the complete pipeline.

However, CF-18 requires four consumers to agree on the fresh-init project:

- check CK-04
- doctor D6
- verify
- gate C1

The new test runs only the first three. It even comments that “the four consumers agree,” but contains no gate invocation or C1 assertion.

- **Risk:** high
- **Suggested fix:** Add a minimal active-change bundle to the same freshly initialized project, run `gate` with the matching TAP command, and assert C1 passes with no positive unidentified count for the three specified ID shapes.

### IMPL-4 — verified

`lib/doctor.js` no longer imports or mentions `DEFAULT_ID`. It declares its own unexported `D5_TAP_ID`, and `classifyProbe` reads that constant exclusively.

The test now checks the whole module rather than a source slice, confirms the private frozen constant exists, confirms it is not exported, and retains the runtime tagged-skip regression case.

### IMPL-5 — verified

DR-20 now pins:

- Exactly three samples.
- The first three titles in store order.
- A maximum of 40 characters per rendered sample.
- The effective pattern source.
- The config origin and one-finding-per-class behavior from the companion test.

The implementation uses `slice(0, 3)` followed by `slice(0, 40)`, matching those assertions.

### IMPL-6 — verified

AM-73 now has command-level coverage for both consequences:

- A Notes-only delta is refused with the existing zero-operation diagnostic.
- A mutation whose only stamp is inside Notes takes CAS default-deny, leaves the store byte-identical, and does not move the bundle.
- Moving the stamp before Notes changes the result to a base-mismatch path, proving the stamp was consumed.

The parser-level tests continue to cover stamp adoption and opacity directly.

## Open inconsistencies

### IMPL-3 — CF-18 still omits gate C1

- **Description:** The amended test covers only three of the four consumers explicitly required by CF-18.
- **Risk:** high
- **Suggested fix:** Exercise gate C1 on the same fresh-init project and assert agreement for all three widened-default shapes.

### IMPL-7 — GT-22 and GT-23 no longer prove gate pattern precedence

- **Description:** The existing gate tests use `XA-01b` with `[A-Z]+-\d+[a-z]*` as the supposedly special flag/config behavior. The widened default now recognizes `XA-01b` itself. Consequently:

  - GT-22’s flagged C1 result can pass without consuming the flag.
  - Its bare-run assertion merely searches for `/unidentified/`; the normal store summary contains `0 unidentified`, so this assertion passes while proving the opposite of its comment.
  - GT-23 can pass without consuming its config row because its configured pattern no longer produces behavior different from the default.

- **Risk:** med
- **Suggested fix:** Use a pattern and scenario shape the default rejects, preferably in the change-scoped delta so C1’s verdict depends on it. Assert the unflagged/unconfigured control is blocked with a positive unidentified count, while the flag/config cases pass. Do not use a bare `/unidentified/` match that also accepts `0 unidentified`.

## P8 dimension review

### 1. Semantic faithfulness by amended scenario

| Scenario | Result |
|---|---|
| SR-08 | Faithful |
| SR-13 | Faithful |
| SR-50 | Faithful |
| SR-53 | Faithful collectively |
| CK-13 | Faithful |
| CF-12 | Faithful |
| CF-18 | Incomplete — IMPL-3 |
| DR-19 | Faithful |
| DR-20 | Faithful |
| AM-71 | Faithful |
| AM-72 | Faithful |
| AM-73 | Faithful |

### 2. Required behavior missing from code

No production-code omission was found. The remaining CF-18 problem is missing semantic test coverage for gate C1, not evidence that gate currently disagrees.

### 3. Continue, skip, and silent branches

The archive parser order remains correct:

- Legal operation h2 before Notes.
- Notes before generic unrecognized h2.
- `SKIP_UNRECOGNIZED` before Notes-content swallowing.
- `IN_NOTES` swallowing before stamp recognition.
- Stamp recognition before Requirement recognition, the new h3 check, and body accumulation.
- New h3 detection guarded by `!blockDiscard`.

No silently ignored path is required to become user-visible beyond the implemented diagnostics.

### 4. External input and security

No security gap found.

Repository-sourced patterns retain the terminable config-origin child path. Diagnostics remain bounded. A stamp hidden inside Notes cannot authorize a mutation because it is ignored and the existing CAS default-deny path fires.

### 5. Guarantee claims

- **Every previously bound title keeps its byte-identical ID:** now meaningfully tested.
- **Archived corpus parses with zero problems:** dynamically asserted over the available archive corpus.
- **D5 never consumes `DEFAULT_ID`:** structurally and behaviorally asserted.
- **One D6 finding per class:** asserted.
- **Exactly three/store-order/40-character samples:** asserted.
- **Template’s three occurrences agree:** asserted independently.
- **Notes-only zero-operation refusal:** asserted end to end.
- **Stamp inside Notes causes CAS default-deny:** asserted end to end.
- **Four consumers agree after fresh init:** only three are asserted — IMPL-3.

### 6. Six updated pre-existing tests

This remains the highest-risk category because an expectation change can conceal a regression.

1. **`test/config.test.js` — CF-12:** Faithful. It follows the new template default while retaining parsing, table-structure, and pipe-escaping checks. The new dedicated CF-12 test supplies the independent three-location assertions.
2. **`test/id-pattern.test.js` — SR-50:** Faithful. The narrower row makes resolution observably stricter; the expectation was not loosened to accept both outcomes.
3. **`test/id-pattern.test.js` — CK-13:** Faithful. Default success and narrower-config failure are both asserted.
4. **`test/id-pattern.test.js` — DR-16:** Faithful. The default now recognizes `AC-08a`, while the diagnostic still reports the default origin.
5. **`test/id-pattern.test.js` — CF-12:** Faithful. The expected parsed value follows the amended template, with exact occurrence coverage supplied by the dedicated test.
6. **`test/spec-runner.test.js` — SR-13:** Faithful and stronger. It asserts complete suffix binding and preserves rejection of digit and underscore continuations.

None of these six was merely loosened to make a red result green.

Separately, the unchanged GT-22 and GT-23 tests became non-discriminating under the widened default; that is IMPL-7.

## Advisories

### ADV-1 — Stale legacy test titles remain

The legacy SR-08 title still prints the old default, and SR-53 still says “binds unchanged.” Their assertions are compatible with the amended spec, so this is not a spec-versus-code gap, but renaming them would avoid reviving retired claims.

### ADV-2 — CF-18 imports `parseTap` only to assert that the function exists

The real verify invocation supplies the meaningful TAP-path coverage. The standalone `assert.ok(parseTap)` does not add behavioral evidence and can be removed or replaced with an actual parser assertion.

## Ledger delta

### Status updates

| ID | Previous status | New status | Review note |
|---|---|---|---|
| IMPL-1 | fixed (r1) | verified | Systematic compatibility sweep and real-store coverage are sufficient |
| IMPL-2 | fixed (r1) | verified | VALUE, DEFAULT, comment, and stale-pattern checks are present |
| IMPL-3 | fixed (r1) | open | Reopened: CF-18 still omits gate C1 |
| IMPL-4 | fixed (r1) | verified | D5 dependency is structurally isolated and runtime-tested |
| IMPL-5 | fixed (r1) | verified | Sample count, order, cap, source, and class behavior are pinned |
| IMPL-6 | fixed (r1) | verified | Zero-op and CAS consequences are exercised through the real CLI |

### Row to append

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| IMPL-7 | GT-22 and GT-23 use a pattern now equivalent to the default for their fixture, so they no longer prove gate flag/config precedence; GT-22’s `/unidentified/` assertion also accepts `0 unidentified` | med | STEP5·r2 | open |

VERDICT: 2 issues open
