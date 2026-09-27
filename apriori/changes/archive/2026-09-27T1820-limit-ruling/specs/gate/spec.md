<!-- apriori-base: sha256:5eafd3cc271ed35deea7940d0e53750b1b7c8329950e50cd7ac9d8dcd75a6635 -->
# Delta — gate (limit-ruling)

## MODIFIED Requirements

### Requirement: C8 governs the review loop by the human-held round limit, not by fixed control points
C8 SHALL derive each review family's round from the review evidence exactly as before, and SHALL judge the loop against ONE human-held number: the `review-round-limit` row of `apriori/process-config.md` (missing row = 8; an explicit value must be an integer >= 1). There SHALL be no fixed round-2 stop and no fixed round-5 escalation: a `revise` verdict below the effective limit never stops the loop on its own, and neither does a `revise` AT the limit: there the producer rules on every open finding and ONE independent re-review follows (the ruling requirement below; `accept` at the limit proceeds). The loop SHALL stop for the owner in exactly two cases — an `escalate` verdict at any round, or a round opened past that one automatic re-review without an owner release — and both SHALL be reported as an escalation that only a recorded owner `reframe <family> round <n> <split|tests|redo|accept-risk> — <reason>` acknowledges. An owner who answers the limit round itself with a reframe takes the family out of the automatic path: from then on every `revise` at or past the limit needs the owner's own reframe, as before. The cumulative count never resets. Before round n >= 3 is opened, the producer SHALL have logged a progress record in `gates:` — `- <YYYY-MM-DDTHH:MM> note: review-progress <family> round <n> — issues: <ID[, ID…]|none>; actions: <text>; evidence: <path or ref>[, …]; approach: <kept|changed> — <reason>` — whose grammar is exact: a real timestamp (range-checked by the same rule as the owner entry: month 01-12, day 01-31, hour 00-23, minute 00-59) and the actor (`note:`, or `owner:` per GT-56) are required, the four labels are recognised only where a part begins (the start of the payload or right after a `;`), and `approach:` must read `kept — <reason>` or `changed — <reason>` with a non-empty reason. C8 SHALL check the record structurally: the family and target round match, all four labelled parts are present and non-empty, `issues:` covers every issue ID (`<UPPERCASE tag>-<digits>[<one lowercase letter>]`, e.g. `R-02`, `GT-54`, `RRL-01a`) that opens a Markdown list item (`-`, `*`, `+`, or an ordered `1.` / `1)`) or a table row of the family's previous round summary, and every `evidence:` reference that looks like a path is an existing REGULAR FILE INSIDE the project — relative to the project root, never absolute, never escaping by `..`, its real path confined too (a symlink to the outside does not count), and only stat'ed, never read. The automatic re-review round needs no such record — the rulings stand in for it. A missing record or a failed check blocks the round's submission and is repaired by the producer, never by the owner; `apriori archive` SHALL consume the same findings as non-forceable R4 evidence blockers, reading the configuration of the project it was invoked in (a custom changes directory never makes it guess another root). An invalid `review-round-limit` row SHALL block C8 naming the key, the offending value and the legal range, and no default SHALL be substituted silently.

#### Scenario: GT-50 no configured limit means 8, and rounds 2 to 7 at revise never stop the loop
- WHEN a project carries no `review-round-limit` row and a family's rounds 1..7 are all `revise`, each round from 3 on preceded by a complete `review-progress` record
- THEN C8 reports the floor (the review has not resolved) but no `stops here` note, no escalation and no owner line; the family's `stopped` is false and `status --escalation` exits 0

#### Scenario: GT-51 a revise verdict at the effective limit asks the producer for rulings, not the owner; accept at the limit proceeds
- WHEN `| review-round-limit | 3 |` is configured and a family reaches round 3 with `revise`, and separately reaches round 3 with `accept`
- THEN the first is not an escalation: C8 is blocked naming the rulings owed for that family's round 3 with the producer's `note: ruling …` line as the cure (no owner line), the family's `stopped` is false and `status --escalation` exits 0; the second passes C8 with nothing escalated

#### Scenario: GT-52 an owner reframe at the limit takes the family out of the automatic path, and the count never resets
- WHEN the owner records `reframe <family> round 3 redo — …` against a limit-3 `revise` (no rulings recorded) and the family then lands round 4 with `revise`
- THEN no ruling is asked for, round 4 is an escalation at round 4 needing its own owner entry (or a raised limit), and the family's round is 4 — nothing was reset by the reframe

#### Scenario: GT-53 escalate stops at any round, whatever the limit
- WHEN a family's round 1 verdict is `VERDICT: escalate` under the default limit
- THEN C8 reports an escalation (`the reviewer escalated`) and blocks until an owner reframe is recorded — exactly as before this change

#### Scenario: GT-54 the review-progress record is required from round 3 and checked structurally
- WHEN a family lands round 3 with no `review-progress` record; then with a record whose `issues:` omits an ID that opens a list item in the round-2 summary (`- R-02 …`); then with an `evidence:` path that does not exist; then with all four parts present, every listed ID covered and an existing path
- THEN the first three block C8 naming the family, the target round and the missing/unsatisfied part, with a cure the producer applies (no owner line is printed), and the fourth passes the record check — the review floor alone deciding whether the change ships

#### Scenario: GT-55 an invalid limit blocks at consumption and names the range
- WHEN `review-round-limit` is `0`, `-1`, `abc` or `2.5`, and a family has landed any round
- THEN C8 is blocked with a detail naming `review-round-limit`, the offending value and `an integer >= 1 (missing row = 8)`; `apriori archive` refuses under R4 as non-forceable; a conflicting pair of rows is the same kind of block naming the conflict

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
- WHEN a round-3 `accept` stands on a record that is missing, uncovered or names a bad path; when a family is stopped by an `escalate` verdict with no owner decision; when the owner then answers `accept-risk`; and when the change lives in a custom `--changes-dir` under a project whose limit row is `0`
- THEN readiness reports each record failure as an R4 `evidence` blocker with `forceable: false` and `archive` refuses with and without `--force`; the unanswered stop is reported `forceable: false` with its reframe cure, `archive` prints that cure (with `--force` it says the decision must be pre-recorded); the answered stop is `forceable: true` and `--force` archives it; and the custom-dir archive refuses under R4 naming `review-round-limit` and `'0'`

## ADDED Requirements

### Requirement: at the limit the producer rules on every open finding and one independent re-review decides what reaches the owner
At the effective limit, the first round R at or past it whose verdict is `revise`, when the owner has not answered round R with a reframe, SHALL NOT stop the loop. C8 SHALL require one ruling per finding still open in round R's summary, each a `gates:` entry `- <YYYY-MM-DDTHH:MM> note: ruling <family> round <R> — <ID>: <fixed|rejected|follow-up|owner> — <basis>` (a real timestamp and the actor exactly `note:` — a ruling written with any other actor is not a ruling), and SHALL check that at least one ruling exists, that each names a legal kind and carries a basis, that the rulings cover every id opening a list item or table row of round R's summary, and that no id carries two different kinds. Exactly ONE independent re-review SHALL follow as round R+1, answering each ruled id on its own line — `- <ID>: ADDRESSED — <basis>` or `- <ID>: NOT ADDRESSED — <basis>` (the id and the status may be wrapped in `**` or backticks; the id, the status and the em dash match exactly). After it, every ruled id SHALL either carry an ADDRESSED line or be a pending `## Open` item (an item with that id that is not a follow-up line; an owner-accepted item counts); an id with both conclusions blocks; the id of an `owner` ruling SHALL be a pending item whatever the re-review says; the id of a `follow-up` ruling marked ADDRESSED SHALL be a registered follow-up; when the re-review's verdict is not an accept, every id that opens a list item or table row of its summary and was not ruled SHALL be a pending item; and when the re-review's provenance session is missing, `unknown` or not round R's session, the id of every `rejected` and `follow-up` ruling SHALL be a pending item. Until the rulings pass, C8 blocks naming the rulings owed; once they pass and before round R+1 lands, C8 blocks naming the one re-review owed. Every such finding is the producer's to repair — never an owner gate, never an escalation — and `apriori archive` reads them as non-forceable R4 evidence blockers. A family that passes these checks is closed: it no longer counts against the review floor, whatever the re-review's verdict, and its residuals are pending items that R5 holds for the owner. A round R+2 or later opened without an owner reframe for this family at a round from R+1 on SHALL be an escalation (`the one automatic re-review is spent`) and SHALL never count as convergence; after such a reframe, a later `accept` converges and a later `revise` needs its own reframe. A ruling cycle, once its next round has landed, SHALL be checked this way whatever the limit says now: raising the limit permits more review and releases the rounds after the re-review, but never closes what that re-review left open. Rulings recorded at any other round whose verdict was `revise` are held to the same checks once the next round lands, and only a re-review whose checks all pass — or the current automatic one — is exempt from the `review-progress` record. A later review round that answers an id `ADDRESSED` in the same fixed form discharges that id's residual — the latest later round that answers it decides, and the re-review's own verdict stays on record — except an `owner` ruling's id, which stays the owner's; the validity of the rulings and conflicting conclusions in the re-review are evidence integrity and are checked at every later round; the current cycle is checked from R on whatever its ruling record holds — rulings that are missing or unreadable are never waived by a later owner release or a later accept. A family whose re-review escalated is not closed by its rulings: it stays on the review floor on the current and the established path alike, unless the owner answered with `accept-risk`.

#### Scenario: GT-60 rulings are required at the limit, one per open finding, in the exact grammar
- WHEN the limit is 3 and round 3 is `revise` with a summary opening R-01, R-02 and R-03; first with no ruling; then with rulings for R-01 and R-02 only; then with a ruling of kind `parked`; then with a ruling whose basis is empty; then with R-01 ruled both `fixed` and `rejected`; then with the rulings written under the `owner:` actor; then with a complete, well-formed set
- THEN each of the first six blocks C8 naming the family, round 3 and the unmet part, prints no owner line and leaves `status --escalation` at exit 0; the last blocks only as the one re-review owed

#### Scenario: GT-61 the re-review decides per id, and a ruled id never disappears
- WHEN complete rulings (R-01 `fixed`, R-02 `rejected`, R-03 `follow-up` registered in `## Open`) are followed by a round-4 re-review in the same session whose verdict is an accept and which marks only R-01 and R-02 ADDRESSED; then also R-03; then R-02 both ADDRESSED and NOT ADDRESSED
- THEN the first blocks naming R-03; the second passes C8 with the family closed; the third blocks naming the conflicting conclusions for R-02

#### Scenario: GT-62 what the re-review leaves unresolved goes to the owner as a pending item
- WHEN the round-4 re-review says `VERDICT: 1 issues open`, marks R-02 NOT ADDRESSED and opens a new finding R-04; first with neither R-02 nor R-04 in `## Open`, then with both as pending items
- THEN the first blocks naming R-02 and R-04; the second passes C8 with the family closed (never reported as an accept), while gate C9 and archive R5 refuse on the pending items and `status --escalation` exits 3 on them

#### Scenario: GT-63 an owner ruling belongs to the owner whatever the re-review says
- WHEN R-01 is ruled `owner` and the re-review marks it ADDRESSED; first with R-01 absent from `## Open`, then as a pending item
- THEN the first blocks naming R-01; the second passes

#### Scenario: GT-64 a re-review whose session is not proven the same hands rejections and follow-ups to the owner
- WHEN the re-review's provenance session differs from round 3's, and separately when round 3 carries no provenance, while R-01 `fixed`, R-02 `rejected` and R-03 `follow-up` are all marked ADDRESSED
- THEN C8 blocks naming R-02 and R-03 until both are pending items, and R-01 stands on its ADDRESSED line

#### Scenario: GT-65 a round past the one re-review needs the owner
- WHEN round 5 lands with an accept after rulings at round 3 and the re-review at round 4, with no owner reframe; then the owner records `reframe <family> round 4 tests — …`; then round 6 lands with `revise`
- THEN the first is an escalation (`the one automatic re-review is spent`) that does not count as convergence and makes `status --escalation` exit 3; with the reframe the round-5 accept converges; the round-6 revise is an escalation needing its own reframe

#### Scenario: GT-66 the re-review round needs no review-progress record
- WHEN rulings at round 3 are followed by a round-4 re-review that marks every ruled id ADDRESSED and no `review-progress` record exists for round 4, and then the owner raises the limit to 6
- THEN C8 reports no progress finding for round 4 and passes, before and after the limit changes

#### Scenario: GT-67 raising the limit permits more review but never closes what the re-review left open
- WHEN a fresh-session re-review at round 4 marks R-01, R-02 and R-03 ADDRESSED with R-02 `rejected` and R-03 `follow-up` not pending, and the owner then raises the limit to 6; then R-02 and R-03 become pending items; then a round 5 accept lands with its `review-progress` record
- THEN C8 still blocks naming R-02 and R-03 after the raise; with both pending it passes; the round-5 accept is no escalation — the raised limit released it

#### Scenario: GT-68 a ruling note below the limit buys no exemption and is held to the ruling checks
- WHEN the limit is 8, rounds 1-2 are `revise` and round 3 an accept with no `review-progress` record for round 3, and one note reads `ruling spec-review round 2 — R-01: parked — x`
- THEN C8 blocks naming the illegal kind at round 2 and the missing `review-progress` record for round 3

#### Scenario: GT-69 a later review the owner released can discharge a residual; the historical verdict stands
- WHEN round 4 leaves R-01 NOT ADDRESSED and R-01 is a pending item, the owner raises the limit, and round 5 lands; first without an R-01 line with the pending line removed, then answering `- R-01: ADDRESSED — …`; and separately when R-01 was ruled `owner` and round 5 answers it ADDRESSED
- THEN the first blocks naming R-01; the second passes with round 4's NOT ADDRESSED unchanged; the owner ruling still has to be an `## Open` item

#### Scenario: GT-70 the current cycle is still checked once the family is past its re-review
- WHEN rounds 4 and 5 accept after a limit-3 revise at round 3 and the owner released round 5 with a reframe for round 4, while round 3's rulings are conflicting (R-01 both `fixed` and `rejected`), absent altogether, or present only as unreadable ruling lines
- THEN C8 blocks naming the conflict, the rulings owed, or the unreadable line respectively, and archive readiness reports each as a non-forceable R4 blocker

#### Scenario: GT-71 an escalated re-review keeps the family on the floor, also after a limit raise
- WHEN rulings at round 3 are followed by a round-4 re-review that escalates, the owner answers `reframe … round 4 tests`, and then raises the limit to 6
- THEN C8 blocks on the unresolved review floor, archive readiness reports a non-forceable R4 review blocker, and `archive --force` refuses — before and after the raise

## Notes

Why: the human approved the at-limit ruling of `work/astra-discuss/d-approval/DA-CONSENSUS.md` §三 (Claude × Astra, 2026-09-27) with the default limit raised to 8: at the limit the loop no longer waits for the owner; the producer rules, one re-review decides, and only what the re-review leaves unresolved, an `escalate` verdict or a round past the re-review reaches the owner. GT-51 and GT-52 keep their ids with the new meaning; GT-59's stopped family is now one stopped by `escalate`.
