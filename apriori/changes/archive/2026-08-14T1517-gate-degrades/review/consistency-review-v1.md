# consistency-review-v1 — gate-degrades

## 1. Semantic faithfulness

Scenario audit:

| Scenario | Result |
|---|---|
| GT-30 | Covered. The direct test checks C1 and C2–C7; the supplemental CLI test checks the INCOMPLETE line. |
| GT-31 | Covered, including BLOCKED precedence and blocked-only counting. |
| GT-32 | Covered. The implementation also names each non-string type correctly. |
| GT-33 | Partial — see IMPL-4. |
| GT-34 | Covered jointly by GT-34, SR-73, and SR-74. |
| GT-35 | Covered, including arbitrary builder errors and empty-errors/no-texts synthesis. |
| GT-36 | Covered, including the independent matcher-child zero-call seam. |
| GT-37 | Covered. Hotfix refusal precedes flow-state diagnosis. |
| GT-38 | Covered, including archived ledger behavior and projection-builder zero calls. |
| GT-11 | Partial — see IMPL-5. |
| DR-07 | Conflicts with the implementation and established behavior — see IMPL-1. |
| SR-73 | Partial — see IMPL-3. |
| SR-74 | Covered with the test-runner seam. |
| SR-75 | Material guarantee untested — see IMPL-2. |

### IMPL-2

- Description: SR-75 promises that configured `verify` behavior, output, and exit codes are byte-identical to their pre-seam form. Its test only checks resolver identity, installs and clears the projection override, and then calls the missing-test-command gate path. It never runs configured `verify`, never observes the test-runner default/clear path, and never compares output or exit status with a state-A golden. Task T18 likewise claims an explicit configured-gate regression assertion, but no such byte-level assertion was added.
- Risk: med. A seam implementation could alter the common configured path while all current change tests remain green.
- Suggested fix: capture state-A goldens for configured `verify --change` and configured gate behavior, including direct result/check details and CLI stdout/stderr/status or JSON. Assert both the default state and the post-override-clear state match those goldens byte-for-byte. Exercise `_setTestRunner` installation and clearing as well as the projection seam.

### IMPL-3

- Description: SR-73 requires full projection-object and errors-array equivalence across all six fixtures. The first five fixtures compare both values, but the no-delta-files fixture compares only `errors`; `cap2[0].projection` and `cap2[1].projection` are never compared. This leaves one explicit “full object across six fixtures” guarantee weaker than its scenario and task T14.
- Risk: low. The current paths share the builder, but a future failure-path wrapper or mutation could make the no-delta projections diverge without failing the scenario test.
- Suggested fix: add `assert.deepStrictEqual(cap2[0].projection, cap2[1].projection)` for the sixth fixture, alongside the existing errors assertion.

### IMPL-4

- Description: GT-33’s bound test covers conflicting rows and an empty value, but omits its “`process-config.md` exists but is unreadable” branch. Existing CF-11 coverage reaches gate with an explicit test command and therefore exercises id-pattern consumption, not §3.1 T4’s no-flag test-command-source classification. Task T4 is marked complete despite this missing fixture.
- Risk: low. The current code correctly returns ERROR/2, but the specific boundary between T4 and T7 is not protected against regression.
- Suggested fix: add a GT-33 fixture where `apriori/process-config.md` is deterministically unreadable as a file, such as a directory, invoke gate without `testCmd`, and assert ERROR/2 rather than C1 `skipped`.

### IMPL-5

- Description: Modified GT-11 says the six-key JSON set is exact in every outcome class. The new test asserts the exact key set only for INCOMPLETE. The pre-existing GT-11 test exercises PASS, BLOCKED, and several ERROR paths, but merely checks selected fields and array types. In particular, it does not protect the separate strict-parser `jsonError` serializer from adding or omitting a key.
- Risk: low. The implementation currently emits the correct shape, but the scenario’s exact cross-class guarantee is not what the bound tests prove.
- Suggested fix: apply the same sorted six-key assertion and absence-of-`code` assertion to PASS, BLOCKED, INCOMPLETE, resolved ERROR, and strict-parser/usage ERROR fixtures.

## 2. Required behavior versus implementation

### IMPL-1

- Description: DR-07 says an unreadable `test-cmd` config remains a D5 config finding. That is not what the implementation does. `runDoctor` resolves id-pattern first; an unreadable `process-config.md` makes `idPatternBroken` true, so the first D5 branch returns `n/a` with “invalid id-pattern config.” The existing CF-11 consumer-matrix test explicitly asserts that result. Only a conflicting `test-cmd` row reaches the later D5 config-finding branch.
- Risk: med. Merging the delta as written creates a direct living-spec/code contradiction and may cause a later implementation to reorder established doctor behavior unnecessarily.
- Suggested fix: align DR-07 with the frozen requirement and state A: retain “conflicting `test-cmd` row → D5 config finding,” but describe an unreadable whole config as D6’s id-pattern/config finding with D5 `n/a`. Alternatively, if D5 must also report a finding, revise the frozen decision and branch-order design and update the existing CF-11 test deliberately.

No other required code behavior was found missing. The shared projection path, aggregate ordering, archived short-circuit, synthetic M4 error, and doctor’s missing-command/no-run branches match their intended contracts.

## 3. Continue, skip, and user-visible branches

### IMPL-6

- Description: Both troubleshooting documents make a false categorical claim: without a test command, gate returns INCOMPLETE/3 “for every change.” GT-31 and the implementation establish that any C2–C7 block instead produces BLOCKED/1; earlier failures can also produce ERROR/2.
- Risk: med. Operators may misdiagnose a blocked or untrustworthy gate, and automation guidance no longer matches the documented total order.
- Suggested fix: change the English and Chinese text to say that C1 is skipped and gate returns INCOMPLETE/3 only when every other applicable check passes; BLOCKED/1 and ERROR/2 retain precedence.

Apart from that documentation error, skipped and early-return branches are visible: C1 carries fact and cure text, projection failures carry errors, hotfix and flow-state failures are distinguished, and doctor’s explicit `--no-run` reports its reason.

## 4. External input, permissions, and security

No new security gap found.

- Empty, whitespace-only, and non-string direct test-command inputs are rejected before `spawnSync`.
- Config read failures fail closed.
- Config-origin id-pattern matching is not invoked on the skipped-C1 path.
- Projection validation and containment remain delegated to the shared builder.
- New diagnostics do not echo command contents, arbitrary objects, secrets, or file contents.
- The seams are test-only module state; every new override use is reset in `finally`.

## 5. Guarantee claims

The three distinct zero-call guarantees use the correct independent seams:

- GT-36: `_setChildRunner` proves the matcher child is spawned zero times.
- GT-38: `_setProjectionBuilder` proves archived degradation builds no projection.
- SR-74: `_setTestRunner` proves no test process is started.

GT-31 proves that `blocked` counts blocked statuses only. SR-73’s require-before-override and later wrapper swap prove call-time reference resolution rather than module-load capture.

The remaining guarantee gaps are IMPL-2, IMPL-3, and IMPL-5.

## 6. Requirement matrix walk

### §3.1 test-command classification

| Row | Implementation result |
|---|---|
| T1 | Correct: a non-whitespace flag string is returned unchanged and follows configured C1 behavior. |
| T2 | Correct: an explicitly present empty string returns ERROR/2 before config fallback. |
| T3 | Correct: whitespace-only strings are rejected by `trim()` and return ERROR/2. |
| T4 | Correct in code: `configTestCmd` propagates non-absence read problems as ERROR/2. Test coverage is incomplete per IMPL-4. |
| T5 | Correct: conflicting `test-cmd` rows return ERROR/2. |
| T6 | Correct: a legal config value follows normal binding behavior. |
| T7 | Correct: missing file, missing row, and parser-normalized empty/whitespace rows produce the absent classification and skipped C1. |
| Direct non-string API row | Correct: number, array, object, and boolean inputs return ERROR/2 with their type named. |

The rows are mutually exclusive and exhaustive over the declared `runGate().testCmd` domain.

### §3.2 missing-command matrix

| Row | Implementation result |
|---|---|
| M7 | Correct: hotfix detection occurs before flow-state and test-command resolution. |
| M5 | Correct: missing/unreadable flow-state returns ERROR/2 before test-command resolution. |
| M3 | Correct: id-pattern is resolved before archived short-circuit or projection construction; failures return ERROR/2. |
| M4 | Correct: any non-empty builder errors or falsy trustworthy texts return ERROR/2 before C7 or later checks. |
| M8 | Correct: archived stage resolves id-pattern but calls no projection builder; C1 is skipped and C7 is `n/a`. |
| M6 | Correct: readable but illegal flow-state reaches C3, which blocks; the aggregate is BLOCKED/1. |
| M2 | Correct: any blocked C2–C7 check wins over skipped C1 and produces BLOCKED/1. |
| M1 | Correct: with no blocks, skipped C1 produces INCOMPLETE/3. |

No matrix row is unreachable, misordered, or implemented with a different result. M4 cannot arise after the archived short-circuit because no builder is called there, which is consistent with M8’s precondition and intent.

## Advisories

- `GT-30b` and `SR-73b` do not bind to GT-30 or SR-73: `leadId` deliberately rejects an alphanumeric character immediately after the numeric ID. They also do not falsely bind to any unrelated scenario, and both tests still execute normally, so this is not a behavioral gap. Renaming them to start with exact `GT-30 ` and `SR-73 ` would make their supplemental coverage mechanically attributable.
- The current truth documents still describe state A, including “seven checks,” the old gate outcome domain, and “no external shared state” in spec-runner. That is the expected pre-STEP6 state because the runbook assigns KB reconciliation and source-stamp refresh to P9. It must not be treated as final after archive.
- The reported 12 store-only ORPHANs are the nine added gate IDs GT-30..GT-38 plus SR-73..SR-75. GT-11 and DR-07 already exist in the living store because they are modified scenarios. This is the expected in-flight state and should disappear when the delta is archived.
- Local test execution degraded because the read-only sandbox denied child spawning with `EPERM`. Per the review instructions, this is not a finding.

## Ledger delta

Append these exact rows:

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| IMPL-1 | DR-07 says an unreadable process-config produces a D5 config finding, but doctor classifies it first as an id-pattern problem and returns D5 n/a, as the existing CF-11 test confirms | med | STEP5·r1 | open |
| IMPL-2 | SR-75 and AC-GD-09 promise byte-identical configured behavior, output, and exits, but no test compares configured verify or gate against a state-A golden or exercises the test-runner default after clear | med | STEP5·r1 | open |
| IMPL-3 | SR-73 compares only errors for the no-delta-files fixture, omitting the required full projection-object equivalence for the sixth fixture | low | STEP5·r1 | open |
| IMPL-4 | GT-33 has no no-flag unreadable-config fixture, leaving §3.1 T4’s ERROR-versus-absent boundary untested | low | STEP5·r1 | open |
| IMPL-5 | GT-11’s exact six-key JSON contract is asserted only for INCOMPLETE, not for every outcome class and the separate strict-parser error serializer | low | STEP5·r1 | open |
| IMPL-6 | The troubleshooting docs incorrectly claim missing test-cmd yields INCOMPLETE/3 for every change, contradicting BLOCKED and ERROR precedence | med | STEP5·r1 | open |

VERDICT: 6 issues open
