**Resolution Checks**

DREQ-1 is reopened. The v2 D5 taxonomy resolves the original signal, bailout, empty output, zero-TAP, and unexplained non-zero cases, but it still does not classify TAP reporter output with a TAP version or nonzero plan line and zero parsed result lines, such as `TAP version 13` alone or `1..3` with no `ok` / `not ok` lines. This is reachable because State A’s `zeroTapParsed` treats any `TAP version` or `1..N` plan as not zero-TAP.

DREQ-2 is verified. D7 now defines a concrete validity rule against `parseFlowState`: file exists/readable, `change` is non-empty, and `change` equals the active change directory name.

DREQ-3 is verified. Missing `apriori/specs/` is now a D2 finding, and D6 becomes `–` with “see D2.”

DREQ-4 is verified. D3 now reports `–` when the runbook copy is absent, leaving D2 as the only finding for absence.

DREQ-5 is verified. A8 now gives concrete inputs for missing flow-state, missing `change:`, mismatched `change:`, healthy active change, and archived pending info.

ADV-D1 is resolved. D4 now covers a fully missing rules file, and D6 detail names the default ID pattern.

**Issues By Dimension**

**1. Target State B Clarity**

DREQ-1 — D5 taxonomy still omits TAP version / nonzero-plan output with zero parsed results.

Description: D5 says it classifies every `runTestCommand` / TAP edge, but only blesses `1..0` as “empty suite — plumbing OK.” It does not classify `TAP version 13` with no plan/results, or `1..3` with no result lines. State A’s `zeroTapParsed` returns false for any TAP version or plan line, so this edge will not naturally fall into the existing non-TAP finding path.

Risk: A truncated or malformed TAP stream can be reported healthy by one implementation and as a finding by another.

Suggested fix: Add an explicit rule: `1..0` with zero parsed results is `✓`; any other TAP version/plan output with zero parsed results is a finding unless a specific alternative classification is intended.

DREQ-6 — Positional arguments are forbidden but not classified.

Description: The CLI contract says `apriori doctor [--test-cmd ...] [--no-run] [--cwd <dir>] [--json]` and “No positional args,” but it only defines behavior for unknown flags, which are silently ignored. It does not say whether `apriori doctor foo` is a usage error, silently ignored, or a finding.

Risk: CLI behavior and tests can diverge; accidental extra arguments may be ignored in one implementation and fail in another.

Suggested fix: Define an if/then rule for positional args, preferably exit 2 usage error with pure JSON under `--json`, or explicitly say positional args are silently ignored like unknown flags.

**2. Edge Cases And Exception Paths**

Covered except DREQ-1’s remaining TAP boundary and DREQ-6’s positional-argument path.

**3. Undeclared State Changes Or Side Effects**

No formal issue. The side-effect model remains declared: no writes; D5 test execution is the only side effect and `--no-run` removes it.

**4. Acceptance Criteria Testability**

A6 remains incomplete until DREQ-1’s TAP version / nonzero-plan case is classified. The positional-argument rule has no acceptance criterion because the behavior is not declared.

**5. Conflicts With Current State A**

No direct conflict, but DREQ-1 is specifically a current-helper boundary: `zeroTapParsed` does not treat TAP version or plan lines as zero-TAP, so the requirement must classify that case explicitly.

**6. Lineage**

No issue. Target lineage is declared and matches the repo’s v3 branch reality. The out-of-scope section exists.

**Advisories**

A11 should include `parseTap` in the reuse list, since D5’s classifications require parsed TAP results, untagged failures, and bailout detection.

D7’s archived-change info would be clearer with an exact scan rule: directory root, archive basename pattern, symlink behavior, and unreadable archived flow-state behavior. Since D7 archived state is informational only, this is advisory.

D2 should define whether `.gitignore` requires an exact `tmp/` line or merely any line containing `tmp/`.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DREQ-1 | D5 taxonomy still omits TAP version / nonzero-plan output with zero parsed result lines. | Truncated or malformed TAP output can be classified inconsistently or reported healthy. | STEP0·r1 | open |
| DREQ-2 | D7 validity rule now concretely requires readable flow-state, non-empty `change`, and `change` matching the active dir. | Previously junk flow-state files could pass or fail inconsistently. | STEP0·r1 | verified |
| DREQ-3 | Missing `apriori/specs/` is now a D2 finding, with D6 reporting `–` and pointing to D2. | Previously half-initialized projects could be treated as normal empty stores. | STEP0·r1 | verified |
| DREQ-4 | D3 now reports `–` when the runbook copy is absent, leaving D2 to own the finding. | Previously output could contradict itself between D2 and D3. | STEP0·r1 | verified |
| DREQ-5 | A8 now gives concrete flow-state inputs and expected outcomes. | Previously acceptance tests could assert divergent malformed inputs. | STEP0·r1 | verified |
| DREQ-6 | Positional arguments are forbidden but not classified. | CLI behavior and tests can diverge on `apriori doctor foo`. | STEP0·r2 | open |
| ADV-D1 | Advisory batch from round 1 resolved: missing rules files and default ID pattern visibility are now specified. | Low; precision/readability only. | STEP0·r1 | advisory-verified |
| ADV-D2 | Advisory batch: add `parseTap` to A11 reuse list; specify archived-change scan/symlink details; define exact `.gitignore` `tmp/` matching. | Low; precision/readability only. | STEP0·r2 | advisory |

VERDICT: 2 issues open
tokens used
922,476
**Resolution Checks**

DREQ-1 is reopened. The v2 D5 taxonomy resolves the original signal, bailout, empty output, zero-TAP, and unexplained non-zero cases, but it still does not classify TAP reporter output with a TAP version or nonzero plan line and zero parsed result lines, such as `TAP version 13` alone or `1..3` with no `ok` / `not ok` lines. This is reachable because State A’s `zeroTapParsed` treats any `TAP version` or `1..N` plan as not zero-TAP.

DREQ-2 is verified. D7 now defines a concrete validity rule against `parseFlowState`: file exists/readable, `change` is non-empty, and `change` equals the active change directory name.

DREQ-3 is verified. Missing `apriori/specs/` is now a D2 finding, and D6 becomes `–` with “see D2.”

DREQ-4 is verified. D3 now reports `–` when the runbook copy is absent, leaving D2 as the only finding for absence.

DREQ-5 is verified. A8 now gives concrete inputs for missing flow-state, missing `change:`, mismatched `change:`, healthy active change, and archived pending info.

ADV-D1 is resolved. D4 now covers a fully missing rules file, and D6 detail names the default ID pattern.

**Issues By Dimension**

**1. Target State B Clarity**

DREQ-1 — D5 taxonomy still omits TAP version / nonzero-plan output with zero parsed results.

Description: D5 says it classifies every `runTestCommand` / TAP edge, but only blesses `1..0` as “empty suite — plumbing OK.” It does not classify `TAP version 13` with no plan/results, or `1..3` with no result lines. State A’s `zeroTapParsed` returns false for any TAP version or plan line, so this edge will not naturally fall into the existing non-TAP finding path.

Risk: A truncated or malformed TAP stream can be reported healthy by one implementation and as a finding by another.

Suggested fix: Add an explicit rule: `1..0` with zero parsed results is `✓`; any other TAP version/plan output with zero parsed results is a finding unless a specific alternative classification is intended.

DREQ-6 — Positional arguments are forbidden but not classified.

Description: The CLI contract says `apriori doctor [--test-cmd ...] [--no-run] [--cwd <dir>] [--json]` and “No positional args,” but it only defines behavior for unknown flags, which are silently ignored. It does not say whether `apriori doctor foo` is a usage error, silently ignored, or a finding.

Risk: CLI behavior and tests can diverge; accidental extra arguments may be ignored in one implementation and fail in another.

Suggested fix: Define an if/then rule for positional args, preferably exit 2 usage error with pure JSON under `--json`, or explicitly say positional args are silently ignored like unknown flags.

**2. Edge Cases And Exception Paths**

Covered except DREQ-1’s remaining TAP boundary and DREQ-6’s positional-argument path.

**3. Undeclared State Changes Or Side Effects**

No formal issue. The side-effect model remains declared: no writes; D5 test execution is the only side effect and `--no-run` removes it.

**4. Acceptance Criteria Testability**

A6 remains incomplete until DREQ-1’s TAP version / nonzero-plan case is classified. The positional-argument rule has no acceptance criterion because the behavior is not declared.

**5. Conflicts With Current State A**

No direct conflict, but DREQ-1 is specifically a current-helper boundary: `zeroTapParsed` does not treat TAP version or plan lines as zero-TAP, so the requirement must classify that case explicitly.

**6. Lineage**

No issue. Target lineage is declared and matches the repo’s v3 branch reality. The out-of-scope section exists.

**Advisories**

A11 should include `parseTap` in the reuse list, since D5’s classifications require parsed TAP results, untagged failures, and bailout detection.

D7’s archived-change info would be clearer with an exact scan rule: directory root, archive basename pattern, symlink behavior, and unreadable archived flow-state behavior. Since D7 archived state is informational only, this is advisory.

D2 should define whether `.gitignore` requires an exact `tmp/` line or merely any line containing `tmp/`.

**Ledger Delta**

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| DREQ-1 | D5 taxonomy still omits TAP version / nonzero-plan output with zero parsed result lines. | Truncated or malformed TAP output can be classified inconsistently or reported healthy. | STEP0·r1 | open |
| DREQ-2 | D7 validity rule now concretely requires readable flow-state, non-empty `change`, and `change` matching the active dir. | Previously junk flow-state files could pass or fail inconsistently. | STEP0·r1 | verified |
| DREQ-3 | Missing `apriori/specs/` is now a D2 finding, with D6 reporting `–` and pointing to D2. | Previously half-initialized projects could be treated as normal empty stores. | STEP0·r1 | verified |
| DREQ-4 | D3 now reports `–` when the runbook copy is absent, leaving D2 to own the finding. | Previously output could contradict itself between D2 and D3. | STEP0·r1 | verified |
| DREQ-5 | A8 now gives concrete flow-state inputs and expected outcomes. | Previously acceptance tests could assert divergent malformed inputs. | STEP0·r1 | verified |
| DREQ-6 | Positional arguments are forbidden but not classified. | CLI behavior and tests can diverge on `apriori doctor foo`. | STEP0·r2 | open |
| ADV-D1 | Advisory batch from round 1 resolved: missing rules files and default ID pattern visibility are now specified. | Low; precision/readability only. | STEP0·r1 | advisory-verified |
| ADV-D2 | Advisory batch: add `parseTap` to A11 reuse list; specify archived-change scan/symlink details; define exact `.gitignore` `tmp/` matching. | Low; precision/readability only. | STEP0·r2 | advisory |

VERDICT: 2 issues open
