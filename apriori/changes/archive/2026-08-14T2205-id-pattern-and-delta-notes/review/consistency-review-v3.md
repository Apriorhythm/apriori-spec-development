# STEP5 Consistency Review — Round 3

## Summary

IMPL-3 and IMPL-7 are verified.

The requested broader sweep found one remaining non-discriminating class: AM-47 and SR-54 still contain successful config-origin controls whose patterns are now subsumed by, or language-equivalent to, the widened default. Those assertions remain green if the config row is ignored. This is recorded as IMPL-8.

No production-code defect or security gap was found.

## Finding verification

### IMPL-3 — verified

CF-18 now exercises all four required consumers on the same freshly initialized project:

- check CK-04 exits successfully.
- doctor D6 has no finding.
- verify is GREEN with zero unidentified scenarios.
- gate C1 is `pass` and reports `0 unidentified`.

The gate fixture includes the necessary STEP5 flow state, completed task, terminal ledger, and an ADDED delta containing the widened-default shape `AC-BIS-99`. Gate resolves the untouched initialized config row, so this is the required fresh-init path.

### IMPL-7 — verified

GT-22 and GT-23 now use a genuinely discriminating fixture:

- The store ID is lowercase-led `xa-01`, which the built-in default deliberately rejects.
- The flag/config pattern `[A-Za-z]+-\d+` recognizes both `xa-01` and the delta’s uppercase `XB-01`.
- GT-22’s unconfigured control requires a positive count with `/[1-9]\d* unidentified/`, which cannot be satisfied by `0 unidentified`.
- Flagged in-flight and archived paths pass.
- GT-23 exercises the same distinguishing shape through the config row.

The tests would now fail if gate ignored the flag or config pattern.

## Open inconsistency

### IMPL-8 — Other successful config-origin controls are non-discriminating after the widening

- **Description:** Two existing scenario areas still use patterns whose relevant language is now covered by the built-in default:

  1. AM-47 uses `[A-Z]+-\d+[a-z]*` with `AC-08a` and `AC-09b`. This pattern is a subset of the widened default. The expected dropped-ID report is therefore unchanged if archive ignores the config row and uses the default.
  2. SR-54’s successful “real multi-segment pattern completes through the child” controls use `[A-Z]+(-[A-Z]+)*-\d+[a-z]*`. Apart from capturing versus non-capturing grouping, this has the same language as the new default. Both successful controls remain green if resolution incorrectly falls back to the in-process default matcher, so they do not prove successful config-origin child execution.

  The catastrophic and injected-failure tests still prove failure-path child behavior. The gap is specifically the successful config-origin path claimed by AM-47 and SR-54.

- **Risk:** med
- **Suggested fix:** For AM-47, use an ID shape rejected by the default, such as uppercase letter suffixes with a custom `[A-Z]+-\d+[A-Z]` row, and assert a no-row control produces a different integrity result. For SR-54, instrument the child seam on the successful config-origin case and assert that it receives both title and TAP batches, instead of relying on a pattern whose observable matches equal the default.

## P8 dimension review

### 1. Semantic faithfulness

All twelve scenarios added or amended by this change are now faithfully exercised:

| Scenario | Result |
|---|---|
| SR-08 | Faithful |
| SR-13 | Faithful |
| SR-50 | Faithful |
| SR-53 | Faithful collectively |
| CK-13 | Faithful |
| CF-12 | Faithful |
| CF-18 | Faithful |
| DR-19 | Faithful |
| DR-20 | Faithful |
| AM-71 | Faithful |
| AM-72 | Faithful |
| AM-73 | Faithful |

The remaining IMPL-8 gap concerns existing AM-47 and SR-54 successful config-origin assertions exposed by the widened default.

### 2. Required behavior missing from code

No required production behavior was found missing. IMPL-8 is a semantic test-strength gap: the current implementation does use the config-origin child, but the affected successful controls would not catch a regression to default-origin matching.

### 3. Continue, skip, and silently ignored branches

The archive parser ordering remains faithful:

- Legal operation sections are recognized before Notes.
- Notes is recognized before generic unrecognized h2 handling.
- Notes can terminate `SKIP_UNRECOGNIZED`.
- Notes content is swallowed before stamp handling.
- Stamp handling precedes Requirement recognition, bad-h3 detection, and body accumulation.
- `!blockDiscard` suppresses only the new repeated-h3 diagnostic.

No silently ignored branch is required to produce an additional user-visible diagnostic.

### 4. External input and security

No security inconsistency found.

Config-origin patterns retain child-process isolation and bounded failure messages. Notes opacity cannot bypass CAS because a hidden stamp remains unadopted and the mutation is denied by default.

### 5. Guarantee claims

- Universal old-binding compatibility: systematically tested.
- Real-store compatibility: tested over more than 300 IDs.
- Archive corpus zero-problem guarantee: dynamically tested.
- D5 independence from `DEFAULT_ID`: structurally and behaviorally tested.
- D6 finding count, order, sample count, truncation, source, and origin: tested.
- Template VALUE, DEFAULT, and comment synchronization: tested.
- Notes-only refusal and hidden-stamp CAS denial: tested through the real CLI.
- Four-consumer fresh-init agreement: now tested.

No remaining gap was found in the change’s explicit guarantee claims.

### 6. Updated and affected pre-existing tests

This remains the highest-risk dimension.

The six tests updated during implementation still follow the amended specification:

1. `test/config.test.js` CF-12 — faithful.
2. `test/id-pattern.test.js` SR-50 — faithful and discriminating through a narrower row.
3. `test/id-pattern.test.js` CK-13 — faithful and discriminating through a narrower row.
4. `test/id-pattern.test.js` DR-16 — faithful; config/default origin remains asserted.
5. `test/id-pattern.test.js` CF-12 — faithful, supplemented by independent three-location checks.
6. `test/spec-runner.test.js` SR-13 — faithful and stricter about complete suffix binding.

The widened-default sweep additionally found:

- GT-22 and GT-23: now repaired and discriminating.
- AM-47 successful custom-pattern case: still non-discriminating — IMPL-8.
- SR-54 successful config-origin controls: still non-discriminating — IMPL-8.
- SR-51 remains discriminating because its invalid config row proves flag shielding.
- DR-16 remains discriminating because its output explicitly names `config` versus `default`.
- Config-child failure tests remain discriminating through injected call counts or forced failures.
- No other loose assertion capable of accepting a zero unidentified/untagged/orphan count was found.

## Advisories

### ADV-1 — Two legacy test titles retain retired default wording

The legacy SR-08 title still prints the old regex, and SR-53 still says “binds unchanged.” Their behavior is correct, but renaming them would prevent obsolete claims from resurfacing during later maintenance.

### ADV-2 — CF-18’s standalone `parseTap` existence assertion adds no behavioral evidence

The real verify and gate executions provide the meaningful TAP-path coverage. The `assert.ok(parseTap)` line is redundant.

## Ledger delta

### Status updates

| ID | Previous status | New status | Review note |
|---|---|---|---|
| IMPL-3 | fixed (r2) | verified | CF-18 now exercises check, doctor, verify, and gate C1 on the fresh-init project |
| IMPL-7 | fixed (r2) | verified | Lowercase fixture and positive-count assertion restore flag/config discrimination |

### Row to append

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| IMPL-8 | AM-47 and SR-54 successful config-origin controls use patterns now subsumed by or language-equivalent to the widened default, so they remain green if the config row is ignored | med | STEP5·r3 | open |

VERDICT: 1 issues open
