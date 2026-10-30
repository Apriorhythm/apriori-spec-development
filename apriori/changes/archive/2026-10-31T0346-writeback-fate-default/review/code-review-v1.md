<!-- provenance: provider=openai model=gpt-6-astra session=01a18e56-ee39-7f50-99e2-15fe98b4ceb1 date=2026-10-31 — codex exec read-only (R2: heterogeneous session, not the producer); the reviewer printed the review and the producer landed it verbatim; prompt = P3 with placeholders filled + repository pointer (prompt-v1.txt); raw log code-review-v1-raw.txt -->

Review for `apriori/changes/writeback-fate-default/review/code-review-v1.md`

Reviewed `git diff v6-dev...HEAD` at `48ca1e3aba14f22b4eebf7d1e5d73d865a669d34`, the PR-77 contract, flow-state, and repository-local gate output.

**Substantive findings: none.**

The rule covers changes to an existing adapter without requiring modification of the write-back function. It distinguishes observed destructive behavior from authorization, requires preservation of structure and meaning, and permits refusal before destructive writes when preservation cannot be made reliable. It explicitly prevents read-only behavior from satisfying a source that requires editability.

Specify and P2 reference that default. Both Build & Test instructions require unrepresentable stored content to traverse the edit path through an independent re-read; conversion tests, success responses, and refreshes alone are expressly insufficient. The bilingual documentation agrees. P3 is unchanged in the diff.

The guard tests inspect the actual documentation named by their scenarios, retain PR-76’s tracing assertions, and reject the former narrow trigger in Ground and P1. The installation and update implementations use the same package RUNBOOK as their source. One repeatable evidence chain can establish this documentation change; SPLIT is unnecessary.

**Examined risk surfaces**

- Data-loss authorization, semantic preservation, refusal timing, unchanged storage after refusal, and required editability.
- Ground/P1 and Specify/P2 consistency, evidence requirements, bilingual documentation, and guard-test assertions.
- RUNBOOK distribution through init/update, test discovery, and declared scope.
- Open items and gate results: `## Open` is empty; C9 passes. C1 was skipped without a test command. C8 blocks because this review’s summary has not yet landed; that is not a product defect.

Validation: PR-76 and PR-77 both passed with:

```text
node --test --test-isolation=none --test-reporter=tap test/writeback-fate-default.test.js test/ground-writeback-trace.test.js
```

**Unexamined boundaries**

No downstream application edit/save flow or agent evaluation was executed. These guards establish the wording of the shipped rule, not that an agent will always follow it. The producer’s reported full-suite results were not independently reproduced. Unchanged authentication, injection, credential handling, and runtime storage implementations were not audited. Prohibited files and external evaluation material were not read. Sandbox subprocess restrictions were treated as environment artifacts, not findings.

**Advisory**

P1 abbreviates the default and references §4 Ground for its complete meaning. Including the semantic-preservation and required-editability qualifications directly in P1 would make standalone use clearer; the existing reference keeps this nonblocking.

VERDICT: no spec-vs-code gaps