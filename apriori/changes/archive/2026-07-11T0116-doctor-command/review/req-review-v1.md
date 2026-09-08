**Issues By Dimension**

**1. Target State B Clarity**

DREQ-1 — D5 test-command failure taxonomy is incomplete.

Description: D5 defines spawn failure, zero-TAP output, and parsed TAP, but does not define command signal kill, TAP bailout, or non-zero exit with no parsed TAP failure. State A exposes these distinctions through `runTestCommand`, `parseTap`, `zeroTapParsed`, and `verify`’s fail-closed taxonomy.

Risk: Implementations can disagree on whether a broken/truncated test command is healthy, finding, or unusable.

Suggested fix: Define D5 classification for every `runTestCommand`/TAP edge: spawn error, signal, bailout, non-zero exit with no parsed TAP failure, non-zero exit with parsed failures, empty output, TAP plan with zero results.

DREQ-2 — D7 “unparseable flow-state” is not concrete against the status parser.

Description: The requirement says active changes with “unparseable/missing flow-state” are findings, but `parseFlowState` does not throw on malformed prose; it returns an object with missing keys. The only concrete D7 rule is `change:` matching the dir name.

Risk: A junk `flow-state.md` can be treated inconsistently, including as healthy.

Suggested fix: Define the minimal D7 validity rule, e.g. readable file, `parseFlowState` returns a non-empty `change`, `change === dir`, and optionally which other keys are required or only informational.

**2. Edge Cases And Exception Paths**

DREQ-3 — Missing `apriori/specs/` is not classified.

Description: D6 says `apriori/specs/` is scanned and “zero scenario files or zero scenarios” is `–`, but does not say what happens when the `specs/` directory itself is missing. This matters because the goal explicitly includes half-initialized projects, and `init` normally creates `specs/`.

Risk: A half-initialized project may be reported as normal empty store instead of a missing scaffold artifact.

Suggested fix: Explicitly classify missing `apriori/specs/`: either D2 finding as missing init scaffold, or D6 finding/n/a with exact detail and fix hint.

DREQ-4 — D3 status when `apriori/runbook.md` is missing is ambiguous.

Description: D2 flags missing runbook as a finding, while D3 reuses `checkRunbookFreshness`, which returns `[]` when the scaffolded runbook is missing. The requirement does not say whether D3 should be `–`, omitted, or also finding when D2 already caught the absence.

Risk: Implementations can show contradictory output, such as D2 finding and D3 fresh/pass.

Suggested fix: State D3 behavior when the runbook copy is absent, preferably `–` with “runbook missing; freshness not checkable” because D2 owns the finding.

**3. Undeclared State Changes Or Side Effects**

No formal issue. The requirement declares the only side effect as D5 executing the test command, and `--no-run` removes it.

**4. Acceptance Criteria Testability**

DREQ-5 — A8’s “unparseable flow-state” acceptance criterion is not testable as written.

Description: A8 requires “an active change with unparseable flow-state → finding”, but no malformed example or parsing rule is defined. With State A, most malformed content is parseable as missing fields.

Risk: Tests can satisfy the ID while asserting different malformed inputs and different outcomes.

Suggested fix: Add concrete if/then cases, e.g. missing file, unreadable file, file without `change:`, and file with `change:` mismatching the directory.

**5. Conflicts With Current State A**

No additional formal conflict beyond DREQ-1/DREQ-2, which stem from relying on current parser/runner surfaces without fully declaring their edge classifications.

**6. Lineage**

No issue. Target lineage is declared as v3 branch and matches the repo’s current change line. The out-of-scope section exists.

**Advisories**

D4 would be clearer if it explicitly said a detected tool with a missing rules file is a finding, not just a rules file “lost its pointer.”

The `--id-pattern` limitation is documented, but D6 should make its default-ID behavior visible in output so custom-ID projects understand why findings appear.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DREQ-1 | D5 test-command failure taxonomy omits signal kill, TAP bailout, and non-zero/truncated TAP cases. | Broken test plumbing can be classified inconsistently or reported healthy. | STEP0·r1 | open |
| DREQ-2 | D7 “unparseable flow-state” is not concrete against `parseFlowState`, which rarely errors. | Junk flow-state files can pass or fail inconsistently. | STEP0·r1 | open |
| DREQ-3 | Missing `apriori/specs/` is not classified. | Half-initialized projects can be treated as normal empty stores. | STEP0·r1 | open |
| DREQ-4 | D3 behavior when `apriori/runbook.md` is missing is ambiguous. | Output can contradict itself between D2 and D3. | STEP0·r1 | open |
| DREQ-5 | A8’s unparseable-flow-state criterion lacks a concrete test input. | Acceptance tests can assert weaker or divergent behavior. | STEP0·r1 | open |
| ADV-D1 | Advisory batch: clarify D4 missing rules-file handling and surface default-ID limitation in D6 output. | Low; precision/readability only. | STEP0·r1 | advisory |

VERDICT: 5 issues open
tokens used
909,148
**Issues By Dimension**

**1. Target State B Clarity**

DREQ-1 — D5 test-command failure taxonomy is incomplete.

Description: D5 defines spawn failure, zero-TAP output, and parsed TAP, but does not define command signal kill, TAP bailout, or non-zero exit with no parsed TAP failure. State A exposes these distinctions through `runTestCommand`, `parseTap`, `zeroTapParsed`, and `verify`’s fail-closed taxonomy.

Risk: Implementations can disagree on whether a broken/truncated test command is healthy, finding, or unusable.

Suggested fix: Define D5 classification for every `runTestCommand`/TAP edge: spawn error, signal, bailout, non-zero exit with no parsed TAP failure, non-zero exit with parsed failures, empty output, TAP plan with zero results.

DREQ-2 — D7 “unparseable flow-state” is not concrete against the status parser.

Description: The requirement says active changes with “unparseable/missing flow-state” are findings, but `parseFlowState` does not throw on malformed prose; it returns an object with missing keys. The only concrete D7 rule is `change:` matching the dir name.

Risk: A junk `flow-state.md` can be treated inconsistently, including as healthy.

Suggested fix: Define the minimal D7 validity rule, e.g. readable file, `parseFlowState` returns a non-empty `change`, `change === dir`, and optionally which other keys are required or only informational.

**2. Edge Cases And Exception Paths**

DREQ-3 — Missing `apriori/specs/` is not classified.

Description: D6 says `apriori/specs/` is scanned and “zero scenario files or zero scenarios” is `–`, but does not say what happens when the `specs/` directory itself is missing. This matters because the goal explicitly includes half-initialized projects, and `init` normally creates `specs/`.

Risk: A half-initialized project may be reported as normal empty store instead of a missing scaffold artifact.

Suggested fix: Explicitly classify missing `apriori/specs/`: either D2 finding as missing init scaffold, or D6 finding/n/a with exact detail and fix hint.

DREQ-4 — D3 status when `apriori/runbook.md` is missing is ambiguous.

Description: D2 flags missing runbook as a finding, while D3 reuses `checkRunbookFreshness`, which returns `[]` when the scaffolded runbook is missing. The requirement does not say whether D3 should be `–`, omitted, or also finding when D2 already caught the absence.

Risk: Implementations can show contradictory output, such as D2 finding and D3 fresh/pass.

Suggested fix: State D3 behavior when the runbook copy is absent, preferably `–` with “runbook missing; freshness not checkable” because D2 owns the finding.

**3. Undeclared State Changes Or Side Effects**

No formal issue. The requirement declares the only side effect as D5 executing the test command, and `--no-run` removes it.

**4. Acceptance Criteria Testability**

DREQ-5 — A8’s “unparseable flow-state” acceptance criterion is not testable as written.

Description: A8 requires “an active change with unparseable flow-state → finding”, but no malformed example or parsing rule is defined. With State A, most malformed content is parseable as missing fields.

Risk: Tests can satisfy the ID while asserting different malformed inputs and different outcomes.

Suggested fix: Add concrete if/then cases, e.g. missing file, unreadable file, file without `change:`, and file with `change:` mismatching the directory.

**5. Conflicts With Current State A**

No additional formal conflict beyond DREQ-1/DREQ-2, which stem from relying on current parser/runner surfaces without fully declaring their edge classifications.

**6. Lineage**

No issue. Target lineage is declared as v3 branch and matches the repo’s current change line. The out-of-scope section exists.

**Advisories**

D4 would be clearer if it explicitly said a detected tool with a missing rules file is a finding, not just a rules file “lost its pointer.”

The `--id-pattern` limitation is documented, but D6 should make its default-ID behavior visible in output so custom-ID projects understand why findings appear.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DREQ-1 | D5 test-command failure taxonomy omits signal kill, TAP bailout, and non-zero/truncated TAP cases. | Broken test plumbing can be classified inconsistently or reported healthy. | STEP0·r1 | open |
| DREQ-2 | D7 “unparseable flow-state” is not concrete against `parseFlowState`, which rarely errors. | Junk flow-state files can pass or fail inconsistently. | STEP0·r1 | open |
| DREQ-3 | Missing `apriori/specs/` is not classified. | Half-initialized projects can be treated as normal empty stores. | STEP0·r1 | open |
| DREQ-4 | D3 behavior when `apriori/runbook.md` is missing is ambiguous. | Output can contradict itself between D2 and D3. | STEP0·r1 | open |
| DREQ-5 | A8’s unparseable-flow-state criterion lacks a concrete test input. | Acceptance tests can assert weaker or divergent behavior. | STEP0·r1 | open |
| ADV-D1 | Advisory batch: clarify D4 missing rules-file handling and surface default-ID limitation in D6 output. | Low; precision/readability only. | STEP0·r1 | advisory |

VERDICT: 5 issues open
