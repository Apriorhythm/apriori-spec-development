# P8 implementation review — delta-consumption (round 1)

Reviewer: codex (gpt-5.5), session 019f4b30-68f9-7222-9b64-17f52a333b4c. Raw: apriori/review/delta-consumption-impl-review-v1-raw.txt

**Implementation Issues**

**DCIMPL-1 — A stamp under a skipped unrecognized section can still become the delta stamp**

Description: In `parseDeltaStrict`, stamp attempts are checked before `state === 'SKIP_UNRECOGNIZED'` is honored. If an illegal h2 appears before the first legal section, a valid stamp underneath it is accepted as `stamp`:

```md
## ADDDED Requirements

<!-- apriori-base: new -->

## ADDED Requirements
### Requirement: Good
...
```

The parser reports the bad heading, but also returns `stamp: "new"`. The design says lines under an unrecognized h2 are skipped until the next legal heading and “attributed to NOTHING”; only a well-formed stamp in `FILE_PREAMBLE` should become the stamp.

Risk: The return shape violates the no-rehome/no-attribution rule. Production surfaces fail closed because `problems[]` is nonempty, but exported parser consumers or future code that inspect `stamp` before checking problems can observe a stamp from skipped content.

Suggested fix: Keep detecting stamp attempts in every state, but only accept a valid stamp when `state === 'FILE_PREAMBLE'` and no illegal section skip is active. In `SKIP_UNRECOGNIZED`, consume/ignore the line as covered by the h2 problem; after a real section, keep reporting late stamps as line-numbered problems.

**DCIMPL-2 — Lines inside an illegal RENAMED requirement block can still become rename operations**

Description: A `### Requirement:` inside `## RENAMED Requirements` is reported as a problem, but the walker remains in the RENAMED section. A following line like `- Old -> New` is then parsed into `delta.RENAMED`:

```md
## RENAMED Requirements

### Requirement: Bad
- Old -> New
```

This means the body of the illegal requirement block is reinterpreted as legal RENAMED syntax. The spec describes this case as “a requirement block inside RENAMED,” not merely a bad heading line, and the design goal is that misplaced structure is not silently re-homed.

Risk: Production archive/verify fail closed on the problem, but the parser return shape contains operations derived from inside invalid structure. This is a test blind spot in AM-29.

Suggested fix: After a requirement heading in RENAMED, enter a skip mode for that illegal block until the next legal/illegal `##` section heading, or at least until the next structure boundary, so body lines cannot populate `RENAMED`. Add an AM-29 assertion that a rename-looking line under the illegal requirement is absent from `delta.RENAMED`.

**Advisories**

- AM-30’s CRLF case checks no problems and key equality, but not block text equality against the LF parse. Add a direct assertion if the intended contract is “CRLF parses identically to LF” for full block content.
- AM-30b’s corpus test silently returns if `apriori/changes/archive` is absent. That is acceptable for packaged test environments, but the repo’s self-check should run it with the archive present.
- README and README_cn cheat-sheet rows contain the requested “up to the commit point” wording.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DCIMPL-1 | A valid stamp under `SKIP_UNRECOGNIZED` before the first legal section can still become the returned delta stamp. | Skipped content is attributed into parser state, violating the no-rehome rule. | STEP5·r1 | open |
| DCIMPL-2 | Body lines under an illegal `### Requirement:` inside RENAMED can still be parsed as rename operations. | Invalid structure can still populate operation buckets despite being reported as a problem. | STEP5·r1 | open |
| DCIMPL-ADV-1 | CRLF block-text equality and corpus-test presence could be asserted more strongly. | Advisory test blind spots. | STEP5·r1 | open |

VERDICT: 2 issues open
