# STEP5 Consistency Review — Round 5

## Summary

IMPL-8 is verified. The final targeted sweep found no remaining test whose distinguishing custom-pattern behavior has been subsumed by the widened default, and no loose count assertion that can pass on zero while claiming a positive condition.

The previously recurring non-discriminating-control class is now exhausted. No spec-versus-code gaps remain.

## IMPL-8 verification

### SR-54 instrumented same-store control — verified

The successful config-origin control now proves execution path rather than inferring it from regex behavior:

- The installed child seam is invoked at least twice, covering title and TAP-description matching.
- The child receives `PATTERN`, the configured source string. This is textually distinct from `DEFAULT_ID` even though their regex languages are equivalent.
- The child computes results with `leadId`, preserving the production recognition contract.
- The matcher returns no failure.
- The adversarial title remains the sole unidentified scenario.
- The seam is restored in `finally`, preventing cross-test contamination.

If the config row were ignored, default-origin matching would run in-process and the child invocation assertion would fail. The control is therefore discriminating.

### Previously repaired IMPL-8 paths

The other two repaired paths remain sound:

- SR-54’s primary benign control uses lowercase IDs and has a no-row reverse assertion.
- AM-47 uses `titleChanged`, which requires old and new headings to pair through their recognized ID; the no-row control produces dropped/added behavior instead.

IMPL-8 can be closed as verified.

## Targeted non-discriminating-control sweep

The complete `test/` sweep covered literal config rows, flag patterns, shared pattern constants, default comparisons, and assertions involving unidentified, untagged, orphan, and duplicate counts.

### Patterns equivalent to or subsumed by the default

- **SR-51:** Still discriminating because an invalid config row proves the flag shields config consumption.
- **SR-52:** Tests flag presence and validation errors; language difference is irrelevant.
- **SR-54 primary success:** Uses lowercase-only shapes rejected by the default and a reverse control.
- **SR-54 same-store success:** Directly instruments child calls and asserts the configured source.
- **DR-16:** Explicitly distinguishes `config` and `default` origins in D6 detail.
- **AM-47:** Uses lowercase IDs and the pattern-dependent `titleChanged` signal.
- **SR-50 and CK-13:** Use a narrower row to make results stricter than the default.
- **GT-22 and GT-23:** Use lowercase-led IDs rejected by the default.
- **Child failure and call-count tests:** Observe the injected child seam directly, so they do not depend on regex-language differences.
- **Skipped-C1 gate coverage:** Explicitly asserts that a valid config is compiled but never matched; zero child calls are the intended result.

No remaining success control relies solely on a custom pattern that now behaves identically to the default.

### Loose count assertions

The earlier bare `/unidentified/` problem is gone. Positive-count checks now require an actual nonzero count or inspect array lengths directly. Assertions for `0 unidentified` are used only where zero is the required outcome.

No equivalent loose assertion was found for untagged, orphan, or duplicate counts.

**Conclusion:** this recurring class is exhausted.

## P8 dimension review

### 1. Semantic faithfulness

| Scenario | Result |
|---|---|
| SR-08 | Faithful |
| SR-13 | Faithful |
| SR-50 | Faithful |
| SR-53 | Faithful |
| CK-13 | Faithful |
| CF-12 | Faithful |
| CF-18 | Faithful across all four consumers |
| DR-19 | Faithful |
| DR-20 | Faithful |
| AM-71 | Faithful |
| AM-72 | Faithful |
| AM-73 | Faithful |

Existing scenarios affected by the widened default, including GT-22, GT-23, SR-54, DR-16, and AM-47, now retain discriminating tests.

### 2. Required behavior missing from code

No required behavior was found missing.

The implementation matches the frozen requirement for:

- The widened shared default.
- D5 vocabulary decoupling.
- D6 diagnostic partitioning.
- Template synchronization and fresh-init behavior.
- Notes opacity and parser recovery.
- Non-Requirement h3 rejection and discard behavior.

### 3. Continue, skip, and silently ignored branches

The archive parser retains the required ordering:

1. Fence handling.
2. Legal operation section.
3. Notes section.
4. Generic unrecognized h2.
5. Skipped-region continuation.
6. Notes-content opacity.
7. Stamp handling.
8. Requirement handling.
9. Guarded invalid-h3 handling.
10. Requirement-body accumulation.

No ignored path requires additional user-visible reporting.

### 4. External input and security

No security gap found.

Config-origin regex matching remains isolated in the bounded child process. Failure messages and D6 samples are bounded. Notes cannot smuggle a usable CAS stamp because stamps inside Notes remain ignored and mutations are denied by default.

### 5. Guarantee claims

All material guarantees have adversarial coverage:

- Systematic byte-identical compatibility for old bindings.
- Real-store compatibility.
- Complete suffix binding and trailing-character rejection.
- Archive corpus parsing with zero problems.
- D5 independence from `DEFAULT_ID`.
- D6’s exact class count, store order, sample cap, source, and origin.
- Three synchronized template occurrences.
- Fresh-init agreement across check, doctor, verify, and gate.
- Notes-only zero-operation refusal.
- Hidden-stamp CAS default-deny and unchanged filesystem state.
- Single-problem discard recovery and unchanged stamp priority.

### 6. Updated pre-existing tests

The six updated tests follow the amended specification and were not loosened merely to obtain green results:

1. `test/config.test.js` CF-12 — faithful.
2. `test/id-pattern.test.js` SR-50 — faithful and stricter-row discriminating.
3. `test/id-pattern.test.js` CK-13 — faithful and stricter-row discriminating.
4. `test/id-pattern.test.js` DR-16 — faithful with explicit origin reporting.
5. `test/id-pattern.test.js` CF-12 — faithful, supplemented by independent template-location checks.
6. `test/spec-runner.test.js` SR-13 — faithful and strengthened.

The additional affected legacy tests have also been repaired and rechecked.

## Advisories

No new advisories.

## Ledger delta

### Status update

| ID | Previous status | New status | Review note |
|---|---|---|---|
| IMPL-8 | fixed (r4) | verified | The remaining SR-54 success control directly observes both config-origin child batches and the configured source; the final test-tree sweep found no other non-discriminating control |

No new ledger rows.

VERDICT: no spec-vs-code gaps
