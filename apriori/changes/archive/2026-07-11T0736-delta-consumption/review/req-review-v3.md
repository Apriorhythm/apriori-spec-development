**Round-2 Confirmations**

DC-1: **verified**. The stale tail wording is gone. D3 says there is no tail category, and DD-2 now enumerates free-text legality by location: file preamble, section preambles, and requirement bodies.

DC-3: **verified**. Section-preamble prose is now classified: legal free text between a legal section heading and the first `### Requirement:`, except a misplaced `#### Scenario:` marker is a problem with a line number. D3 also includes that case in the exhaustive problem set.

**Dimension Verdicts**

1. Target state B: **clear enough**. The parser target is sequential, fully-consuming, and the legal constructs are now exhaustive.
2. Edge and exception paths: **covered for this requirement stage**. The main malformed-structure cases, fences, stamp diagnostics, duplicates, RENAMED misuse, and archived-corpus regression are declared.
3. Implied side effects: **no issue**. The requirement keeps the change scoped to delta parsing plus the declared README rider.
4. Acceptance criteria testability: **testable**. Each D criterion can be expressed as an if/then parser or command-surface case.
5. Conflicts with state A: **no issue found**. The archived delta corpus shape matches the intended legal constructs.
6. Target lineage: **declared and matches repo reality**.

**Formal Issues**

None.

**Advisories**

- The phrase “requirement body runs to the next heading/EOF” is understandable in context because it says “as today,” but the implementation spec should preferably spell this as “next `### Requirement:` heading, legal/illegal `##` section heading, or EOF” so nobody accidentally treats `#### Scenario:` as ending the requirement body.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DC-1 | Tail category was deleted in D3 but still referenced as legal in DD-2. | Implementer could preserve ambiguous tail handling. | STEP0·r1 | verified |
| DC-3 | Section-preamble prose was neither a legal construct nor an error. | Full-consumption parser behavior remained inconsistent and under-testable. | STEP0·r2 | verified |
| ADV-3 | Implementation spec should avoid the broad phrase “next heading” for requirement-body termination. | Advisory precision hardening. | STEP0·r3 | open |

VERDICT: no major issues
