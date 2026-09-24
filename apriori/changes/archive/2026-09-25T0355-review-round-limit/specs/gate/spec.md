<!-- apriori-base: sha256:abc8a0d5b3b074e055a5fe24052f825e1b1e156e0eac5ad0d29dceef148b9d19 -->
# Delta — gate (review-round-limit)

## ADDED Requirements

### Requirement: C8 governs the review loop by the human-held round limit, not by fixed control points
C8 SHALL derive each review family's round from the review evidence exactly as before, and SHALL judge the loop against ONE human-held number: the `review-round-limit` row of `apriori/process-config.md` (missing row = 7; an explicit value must be an integer >= 1). There SHALL be no fixed round-2 stop and no fixed round-5 escalation: a `revise` verdict below the effective limit never stops the loop on its own. The loop SHALL stop for the owner in exactly two cases — a `revise` verdict AT the effective limit (`accept` at the limit proceeds), or an `escalate` verdict at any round — and both SHALL be reported as an escalation that only a recorded owner `reframe <family> round <n> <split|tests|redo|accept-risk> — <reason>` acknowledges; the cumulative count never resets. Before round n >= 3 is opened, the producer SHALL have logged a progress record in `gates:` — `- <YYYY-MM-DDTHH:MM> note: review-progress <family> round <n> — issues: <ID[, ID…]|none>; actions: <text>; evidence: <path or ref>[, …]; approach: <kept|changed> — <reason>` — whose grammar is exact: a real timestamp (range-checked by the same rule as the owner entry: month 01-12, day 01-31, hour 00-23, minute 00-59) and the actor (`note:`, or `owner:` per GT-56) are required, the four labels are recognised only where a part begins (the start of the payload or right after a `;`), and `approach:` must read `kept — <reason>` or `changed — <reason>` with a non-empty reason. C8 SHALL check the record structurally: the family and target round match, all four labelled parts are present and non-empty, `issues:` covers every issue ID (`<UPPERCASE tag>-<digits>[<one lowercase letter>]`, e.g. `R-02`, `GT-54`, `RRL-01a`) that opens a Markdown list item (`-`, `*`, `+`, or an ordered `1.` / `1)`) or a table row of the family's previous round summary, and every `evidence:` reference that looks like a path is an existing REGULAR FILE INSIDE the project — relative to the project root, never absolute, never escaping by `..`, its real path confined too (a symlink to the outside does not count), and only stat'ed, never read. A missing record or a failed check blocks the round's submission and is repaired by the producer, never by the owner; `apriori archive` SHALL consume the same findings as non-forceable R4 evidence blockers, reading the configuration of the project it was invoked in (a custom changes directory never makes it guess another root). An invalid `review-round-limit` row SHALL block C8 naming the key, the offending value and the legal range, and no default SHALL be substituted silently.

#### Scenario: GT-50 no configured limit means 7, and rounds 2 to 6 at revise never stop the loop
- WHEN a project carries no `review-round-limit` row and a family's rounds 1..6 are all `revise`, each round from 3 on preceded by a complete `review-progress` record
- THEN C8 reports the floor (the review has not resolved) but no `stops here` note, no escalation and no owner line; the family's `stopped` is false and `status --escalation` exits 0

#### Scenario: GT-51 a revise verdict at the effective limit stops for the owner; accept at the limit proceeds
- WHEN `| review-round-limit | 3 |` is configured and a family reaches round 3 with `revise`, and separately reaches round 3 with `accept`
- THEN the first is an escalation (`round 3 reached the review-round limit (3)`), C8 blocked, `status --escalation` exit 3, the printed cure being the owner `reframe … round 3 <split|tests|redo|accept-risk>` line; the second passes C8 with nothing escalated

#### Scenario: GT-52 the owner reframe acknowledges the limit stop and the count never resets
- WHEN the owner records `reframe <family> round 3 redo — …` against a limit-3 stop and the family then lands round 4 with `revise`
- THEN round 3 is reported acknowledged (not a hard stop), round 4 is a fresh escalation at round 4 needing its own owner entry (or a raised limit), and the family's round is 4 — nothing was reset by the reframe

#### Scenario: GT-53 escalate stops at any round, whatever the limit
- WHEN a family's round 1 verdict is `VERDICT: escalate` under the default limit
- THEN C8 reports an escalation (`the reviewer escalated`) and blocks until an owner reframe is recorded — exactly as before this change

#### Scenario: GT-54 the review-progress record is required from round 3 and checked structurally
- WHEN a family lands round 3 with no `review-progress` record; then with a record whose `issues:` omits an ID that opens a list item in the round-2 summary (`- R-02 …`); then with an `evidence:` path that does not exist; then with all four parts present, every listed ID covered and an existing path
- THEN the first three block C8 naming the family, the target round and the missing/unsatisfied part, with a cure the producer applies (no owner line is printed), and the fourth passes the record check — the review floor alone deciding whether the change ships

#### Scenario: GT-55 an invalid limit blocks at consumption and names the range
- WHEN `review-round-limit` is `0`, `-1`, `abc` or `2.5`, and a family has landed any round
- THEN C8 is blocked with a detail naming `review-round-limit`, the offending value and `an integer >= 1 (missing row = 7)`; `apriori archive` refuses under R4 as non-forceable; a conflicting pair of rows is the same kind of block naming the conflict

#### Scenario: GT-56 the progress record is a note entry, not an owner decision
- WHEN a `review-progress` line is written with the `owner:` actor, or a `reframe` line is written with the `note:` actor
- THEN the first counts as a progress record but authorizes nothing (it is not a reframe); the second is neither a reframe nor a progress record — the owner vocabulary and the producer vocabulary never trade places

#### Scenario: GT-57 evidence references are confined to the project
- WHEN a record's `evidence:` names an absolute path to an existing file outside the project, a `../` path escaping it, a symlink inside the project whose target lies outside, or a directory; and separately a relative path to a regular file inside the project, or a symlink inside whose target is inside
- THEN each of the first four blocks C8 with `'<ref>' is not an existing regular file inside the project` (the file is never read), and each of the last two satisfies the record

#### Scenario: GT-58 the record grammar is exact
- WHEN `transactions:` stands where `actions:` should; when `approach: kept` carries no reason; when the line lacks its timestamp or its actor (or carries `agent:`), or its timestamp is out of range (`2026-99-99T99:99`, `2026-13-01T10:00`, `2026-09-25T24:00`, `2026-09-25T10:60`); when `issues:` omits an ID that opens an ordered item (`1. R-02`), a `+` item or a table row of the previous summary (a prose mention `see R-99` opening nothing)
- THEN the first blocks as `incomplete: actions missing`, the second as `approach must read …`, the third (every form) as a missing record — exactly the stamps `lib/flow.js` refuses for an owner entry, the fourth as `does not cover R-02, R-03, R-04` without naming `R-99`; the same content in the exact form passes the record check

#### Scenario: GT-59 archive consumes the same loop
- WHEN a round-3 `accept` stands on a record that is missing, uncovered or names a bad path; when a family is stopped at its limit with no owner decision; when the owner then answers `accept-risk`; and when the change lives in a custom `--changes-dir` under a project whose limit row is `0`
- THEN readiness reports each record failure as an R4 `evidence` blocker with `forceable: false` and `archive` refuses with and without `--force`; the unanswered stop is reported `forceable: false` with its reframe cure, `archive` prints that cure (with `--force` it says the decision must be pre-recorded); the answered stop is `forceable: true` and `--force` archives it; and the custom-dir archive refuses under R4 naming `review-round-limit` and `'0'`
