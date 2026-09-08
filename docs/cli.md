# CLI Reference

Every subcommand answers `--help` (exit 0); unknown flags and stray arguments exit 2 — nothing is silently ignored. The synopses below are the exact strings `--help` prints.

## apriori init

scaffold apriori/ + per-tool runbook pointers (interactive multiselect without --tools)

```text
usage: apriori init [--tools <a,b,...>] [--test-cmd "<cmd>"] [--language <lang>] [--yes]
```

Example: `apriori init --tools claude,cursor --test-cmd "npm test" --yes`

Exit: 0 done/aborted-by-you · 1 empty selection · 2 non-interactive without --tools, or a `--test-cmd` / `--language` value the config table cannot carry.

**`--tools` is validated as a whole before anything is written (6.2).** One unknown key — `claud`, `Claude`, `claude,claud` alike — is exit 2 with `unknown tool '…' — known tools: claude, codex, cursor, copilot, opencode, windsurf`, and nothing is created, not the `apriori/` root either. A rules file that already carries an OLD tool-written pointer paragraph (an exact previous generation) gets that paragraph upgraded in place (`pointer updated`); a current or hand-edited pointer is left as it is (`skipped`).

**`--test-cmd` round-trips byte-for-byte (6.2).** The command is written into `apriori/process-config.md` through the serializer twin of the reader (`config.encodeCell` / `splitCells`): a `|` is stored as `\|`, backslashes stay literal, `$&`, `$1` and any other replacement-pattern lookalike are written verbatim (callback replacement, never a template string), unicode untouched — `getConfig(root, 'test-cmd')` returns exactly what you passed, so `verify` runs exactly that. Refused with a clear error BEFORE anything is written (exit 2): an empty value (omit the flag to inherit nothing), a command containing a newline (a config row is one line — wrap it in a script and name that), and the one shape the cell grammar cannot represent, an odd run of backslashes directly before a pipe. Leading and trailing whitespace is trimmed. `--language` goes through the same pair.

## apriori doctor

diagnose the project↔apriori seam: Node floor, scaffold, runbook freshness, tool pointers, TAP plumbing probe (`--no-run` skips), store health, changes overview — findings name their fixer. D7 reads every active change's state and lists the archives: an archive frozen at `phase: review` is the normal state and is not mentioned; one archived BEFORE review is surfaced as information (`archived <stamp>-<name> @ build — archived before review; frozen as is`), never as a finding. A 5.x bundle that recorded its own closure (`current-step:` at DONE/SUPERSEDED/ABANDONED, or a `next-action:` naming SUPERSEDED) and was kept in place as precedent is the same frozen history: reported as information (`frozen precedent (recorded, not re-judged)`), never as a finding — a 5.x bundle still in flight keeps the migration finding.

```text
usage: apriori doctor [--test-cmd "<cmd>"] [--no-run] [--cwd <dir>] [--json]
```

Example: `apriori doctor`

Exit: 0 HEALTHY · 1 findings · 2 unusable (uninitialized / old Node / an argument error such as `--test-cmd ""`).

**The `--json` envelope** is `{result: 'HEALTHY'|'FINDINGS'|'UNUSABLE', findings: number, checks: [{id, status, detail, fix?}], errors: string[]}` in every class, argument errors included. `--test-cmd ""` is refused (`empty --test-cmd — pass a command or omit the flag`), never a config fallback.

D6 scans the store with the `id-pattern` row (no flag; detail names the source, `config` or `default`). An invalid or terminated row is a D6 finding and the D5 probe is skipped — the test command never runs under a broken id-pattern (§8.0).

## apriori new

scaffold a change dir + flow-state skeleton

```text
usage: apriori new <change-name>   (bare kebab-case, e.g. add-playback)
```

Example: `apriori new add-playback`

Exit: 0 created · 1 name/exists error · 2 usage.

## apriori status

where each change is: phase, Reality Check, open items, next actions, the derived review round and any escalation

```text
usage: apriori status [--change <name>] [--json] [--escalation]
```

Example: `apriori status --change add-playback --json`

Exit: 0 on success paths (status reports, never gates) — except `--escalation`, which exits **3** when a human is being waited on; **2** on a resolve or argument error.

**The `--json` envelopes (6.2)**, each fixed for success and error, all carrying `errors: string[]`: the single view (the fields below, plus `errors: []`; on a resolve, name or argument error `{change, errors: [msg]}` — read `errors.length` first), the list view `{changes: [...], errors: []}`, and `--escalation` `{change, escalations, acknowledged, historical, errors}` (`escalations` is the pending list a Stop hook reads; on error the three lists are empty and `errors` says why). Every error under `--json` is JSON, exit 2.

**The one state, read back.** `--change` reports what the flow-state carries: `phase`; `reality` — the `## Reality Check` split into `observed` / `decision` / `assumption` plus any entry naming no kind (reported as unreadable, never dropped); `openIssues` — the `## Open` lines, raw; `openItems` — the same lines parsed as `{id, text, accepted, acceptedAt}` (6.2: `id` is the token before the colon, `null` when the line carries none; `accepted` is true when the owner's `evidence-accept <id>` is on record, and `acceptedAt` is that entry's stamp as written — verbatim, never normalized); `evidence` — legacy `## Evidence` rows only (`{rows, blocked, recorded}`, all empty when the section is gone); `next` — the `## Next` actions, of which the state carries at most three (a longer list prints the first three and says how many there were); and `delivery`. Every unverified `assumption` gets its own line: it is the one Reality Check kind that still owes something.

**`--escalation` is the hard stop, and escalation is DERIVED (6.2): stage × decision status.** Every escalation of a change is in one of three states. **`pending`** — the bundle is active and nobody answered: a review family at its round 5 or with a `VERDICT: escalate` and no `reframe` on record, everything gate C9 / archive R5 refuse on (a pending open item, an item without an id, a standing assumption, a legacy blocked row, an unreadable delta, a structural defect), a legacy ledger still carrying open rows (its migration refusal, see C3), and a leftover hand-written `escalation:` field still carrying content (its migration refusal — see below). These print as `ESCALATION: …` and the command exits **3**; a pending open item IS the owner's control point — R1's "critical evidence still blocked" — so it belongs here until the owner accepts it or the producer closes it. **`acknowledged`** — the owner's `reframe` is on record: printed as `acknowledged: … — owner decision on record: <exit>`, never removed from the report, and not a reason to wait on a human by itself (gate C8 / archive R4 still judge convergence on their own terms — only `accept-risk` closes the floor, and archive still wants `--force`). **`historical`** — the bundle is ARCHIVED: its escalations and its declared field print as `historical: … (archived history)`, its state findings as `recorded, not re-judged`, its deltas are not re-scanned — a frozen record is reported, never turned into a debt somebody is asked to pay; evidence corruption in an archive is still an error at C5/C8. Exit **0** when nothing is pending (`ESCALATION: none`). `--json` gives `{change, escalations: [pending…], acknowledged: […], historical: […]}` — `escalations` is the list a Stop hook reads. That exit code is the whole mechanism: wire it into a Stop hook or a CI step if you want one. This repository ships no hook of its own.

**The `escalation:` field is retired.** Absent, `none` or `n/a` is fine. Any other content in an ACTIVE bundle is a pending decision the machine has no reading for, and it may neither be echoed as decoration nor dropped: gate C3, archive R1 and `--review-ready` refuse with `escalation: carries a pending decision ('…') — move it to ## Open as \`- <ID>: …\` (or record the owner's reframe if it answers a review round), then delete the field`, and `--escalation` exits 3 on the same words until the migration is done. In an archived bundle the field is history. `apriori new` no longer writes it.

**Review rounds and escalation.** `--change` adds two derived fields — nothing here is read off a hand-written `round:`. `review.families` carries one entry **per review family** (`spec-review`, `code-review`, …): `{family, round, verdict, issuesOpen, stopped, escalating}`. Rounds are counted inside a family and never summed across families, so three families at 2 + 2 + 1 rounds is exactly that, not "round 5". `verdict` comes from the family's highest ordinal — a `0 issues open` / `0 issues found` count is an accept — `issuesOpen` is the number when the verdict used a counted form and `null` otherwise, and `stopped` is true while gate's C8 blocks that family. `review.problems` lists evidence that refuses to be read as a round and blocks: a verdict outside the vocabulary, one document declaring two different outcomes, a duplicated family/round claim, a summary whose verdict was removed while its transcript remains, a round-named transcript with no summary, an ordinal gap. `review.advisories` lists what is merely worth mentioning and never blocks: a document whose body was pasted twice with the same verdict both times, and a transcript that was never a review round (`kb-check-raw.txt`). `review.defect` is set instead when the `review/` directory itself is a symlink, escapes the bundle or is not a directory — status names it and refuses to read through it, exactly as gate does. `escalation` is `null` until a family escalates — either a reviewer returned `VERDICT: escalate` at any round, or the family reached its round 5 — and then an array of `{family, round, verdict, reason, acknowledged, decision}`; an owner decision in `gates:` flips `acknowledged`, and a malformed document elsewhere never removes the entry. There is no per-round trend of newly-found issues: the evidence carries an open count, not a delta. A bundle with no readable flow-state gets `null` for both fields. Runbook §1 R4 is the rule these fields report.

## apriori verify

confirms tests actually ran and nothing attributable is failing — the Build & Test gate; scenario-ID binding gaps (UNBOUND/ORPHAN/UNIDENTIFIED) are reported as diagnostics, not gates — naming a test with its scenario ID is advisory, for traceability, never required; `--change` verifies against the projected (post-merge) store, the mid-change form

```text
usage: apriori verify --specs <dir...> --test-cmd "<cmd>" [--id-pattern <re>] [--cwd <dir>] [--json]
   or: apriori verify --change <name> --test-cmd "<cmd>" [--id-pattern <re>] [--cwd <dir>] [--json]
(--test-cmd may be omitted when apriori/process-config.md has a test-cmd row;
 --id-pattern may be omitted when apriori/process-config.md has an id-pattern row)
```

Example: `apriori verify --change add-playback --test-cmd "npm test"`

Exit: 0 GREEN · 1 gaps · 2 untrustworthy run (missing inputs, non-TAP output, crash, merge conflict, CAS mismatch, a structural refusal of the projection, an argument error).

**The `--json` envelope (6.2)** is ONE shape for GREEN, GAPS and every ERROR — an argument error, a config error, a broken projection, a strict-parser rejection all print it, exit 2: `{clean: boolean, result: 'GREEN'|'GAPS'|'ERROR', errors: string[], specFiles: number, exec: {status: number|null, signal: string|null, error: string|null}, duplicates: [], boundGreen: [{id, pass, fail, skip}], boundRed: [...], unbound: string[], orphan: [...], unidentified: [{file, title}], unattributedFailures: {count: number, lines: string[]}, stderr: string}`; a `--change` run adds `projection`, and a judged `--change` run adds `storeReport`, `changeScope` and `modifiedIntegrity`. `clean` is a boolean and equals `result === 'GREEN'` — a removal-only or empty-scope run is `clean: true`, never the vacuous-note string. `--test-cmd ""` (or blanks) is refused at the argument layer — omit the flag to inherit the config row.

`--change` runs are **change-scoped**: the verdict (exit 0/1) judges only this change's requirement blocks (their scenarios bound green, no scoped duplicate/unidentified, no unprovable failure signal — an ID-less failure or a failing ID that no sibling active change declares still blocks, fail-closed); a red bound to an out-of-scope scenario, or one attributed to a sibling change's cleanly-parsed delta (only its ADDED/MODIFIED block scenarios grant the exemption), never blocks. The same run prints an informative **store report** (whole projection, six classes) so parallel changes go green independently while historical gaps stay visible. `--change --json` adds `storeReport`, `changeScope` and `modifiedIntegrity` on GREEN/GAPS (absent on every ERROR); `--specs` output is byte-identical to before. `modifiedIntegrity` reports every MODIFIED block's replacement fidelity (retained/titleChanged/dropped/added/ambiguous scenarios plus lost lines, requirement prose included) — informative only, never a verdict change; the human `— MODIFIED INTEGRITY —` section prints when a risk class is non-empty.

## apriori archive

merge a change's delta specs into the living store; `--change` discovers the whole change, dry-runs by default, commits failure-atomically on `--write`

```text
usage: apriori archive --store <f> --delta <f> --change <name> [--write] [--no-cas]
   or: apriori archive --change <name> [--write] [--changes-dir <dir>] [--no-cas] [--force]
```

Example: `apriori archive --change add-playback --write --changes-dir apriori/changes`

**The structural preflight (6.2).** Before anything is written — in dry-run and `--write` alike, in the single-file form too — every scenario the delta ADDS or MODIFIES (the change scope; a REMOVED or deprecated block is out of it) must carry one stable id that nothing else carries, under the controlled id matcher (`--id-pattern` / the config row / the default, batched through the terminable channel — never an in-process RegExp over a config pattern). Refused, listed per DELTA file:line, with `RESULT: FAILED PREFLIGHT — nothing written` (exit 1): a scenario with no bindable id (`kv/spec.md:8: scenario without a bindable id: '…' — this change adds or modifies it; give it a leading id`), an id introduced twice by this change (every line named), an id that collides with the store outside the blocks this change replaces (the store file named). A matcher that cannot run (an invalid or terminated config pattern) is a refusal too — `the structural check could not run — …` — never a skipped check. Historical debt outside the scope (an old store scenario with no id, an id the store already carries twice) is a note (`note: store debt outside this change (reported, not a block): …`), never a block on this change — `apriori check` still owns it. The binding of an identified scenario to a test stays advisory: a native test command with no scenario-named tests is legal. `verify --change` refuses the same projection the same way (`structural: …` errors, exit 2) before any test command runs, so `check → verify → gate → archive` can no longer archive a store that `check` then fails.

**The walk.** Delta discovery and the store walk judge a directory BEFORE entering it: a symlinked directory that resolves outside the walk root is refused (`specs dir cannot be walked: symlinked directory escapes the walk root: …`, exit 2 — never silently skipped, never entered), and a directory already visited is not entered again, so a symlink loop terminates. `risk.scanDeltas` reports any lstat or read failure that is not plain absence as `unreadable-delta` (fail-closed), never as "no risk found".

**Readiness.** The high-level form refuses a change that is not finished, in dry-run and `--write` alike, and prints `RESULT: NOT READY — nothing written` (exit 1): **R1** the flow-state must be structurally sound, pass the same legality checks `gate`'s C3 runs, and say `phase: review`; **R4** every review family's loop must have converged or carry its recorded reframe (the same derivation gate's C8 reads — see below), and the `review/` root must be a real contained directory; **R5** the one substantive state predicate, the same code and the same input (the delta scan) `gate` runs at C9 — no open item the owner has not accepted, no item without an id, no duplicated id, no legacy `## Evidence` row still `blocked`, no unreadable delta, no standing assumption. R5 is never forceable: `--force` overrides progress, and missing reality is not progress. **There is no R2 and no R3** — 6.0 asked for no task list and 6.2 reads no issue ledger, so no archive is ever stopped by either file, and neither is read. R1 reports its first hit alone; the later rules report together. An absent `review/` is not a defect (R4 then reports the missing round) — but an *unreadable* review root never is: only a true `ENOENT` takes the absent branch, and every other error code (EACCES, EIO, ELOOP …) is a structural refusal. Readiness is evaluated after every other preflight guard, so existing diagnoses and exit codes are unchanged, and it is one look rather than a lock — nothing is re-read between the check and the commit.

**The archive declaration.** It is also a BACKSTOP: a run whose own declaration would read `implementation: INCOMPLETE` is refused (`RESULT: NOT READY — nothing written`) even if readiness let it through, so a successful archive can never declare the work unfinished. A ready run prints three states and nothing else — whether the implementation is complete (pending open items and unverified assumptions counted), whether the critical evidence is complete (no unaccepted open item; the accepted ones are named and reported as still present), and whether the change is released or still pending external acceptance (`delivery:`). The run also prints the predicate's notes — the open-item summary, an acceptance that matches no item, the `contract-mutation` signal, an ignored legacy section. An archived bundle is FROZEN: a defect found later becomes a short outcome note or a new change, never an edit to the archive.

**`--force`** belongs to the high-level form and overrides **progress only**, which since 6.2 is exactly one thing: a round-5 escalation the owner already answered (its `reframe` record plus the flag). It never overrides R1 (`abandoned` above all), a structural defect, a stalled round-2 loop, an unmet review floor, or an R5 refusal — an open item nobody accepted is not progress. The `archive-force` grammar is still parsed, because it is the same owner-entry shape as `evidence-accept` and `reframe`:

```text
  - <YYYY-MM-DDTHH:MM> owner: archive-force ledger — <the human's reason, verbatim>
```

That is the SAME canonical owner entry the acceptance exit and the loop's `reframe` decision use, and it is read by one parser: a real timestamp, the actor spelled exactly `owner`, the lowercase verb opening the payload, the target matched whole, an em dash, and a reason. `producer:`, `note:`, `agent:` and a `gate⑤ (owner):` prefix authorise nothing, in any of the three grammars. But the one class the grammar spells, `ledger`, has no consumer any more: a standing `archive-force` record is reported as `note: archive-force has nothing left to force in 6.2` and changes no verdict, with or without `--force`. Revocation appends `archive-force-revoke ledger — <reason>` and the last decision wins — for the note, and for nothing else. Every overridden R4 blocker is printed with the record's raw first line.

**Single-file form.** `--store/--delta` is one-module surgery on a store file. It does not accept `--changes-dir` (and therefore never moves a change dir) or `--force`, and it refuses any `--delta` that resolves inside `apriori/changes` — judged by both the lexical spelling and the realpath, at path-segment boundaries. A change bundle is archived whole, by name.

Exit: 0 merged/no-op · 1 conflict/CAS/malformed/not-ready/out-of-scope delta/stage-commit-move failure · 2 usage/not-found/containment.

## apriori stamp

print the CAS base-stamp line for a store file — paste it atop a delta; verify/archive then refuse if the store diverged

```text
usage: apriori stamp <store-file>
```

Example: `apriori stamp apriori/specs/kv/spec.md`

Exit: 0 printed (absent file → the `new` form) · 2 usage/directory/unreadable.

## apriori gate

aggregate the mechanical gate checks for one change into one exit code (binding verify, flow-state, verdict evidence, KB freshness, review-loop convergence, the open items); PASS ≠ a human decision

```text
usage: apriori gate --change <name> [--test-cmd "<cmd>"] [--id-pattern <re>] [--cwd <dir>] [--json] [--no-cas] [--review-ready]
```

Example: `apriori gate --change add-playback --json`

**The `--json` envelope** is `{change: string|null, stage: 'in-flight'|'archived'|null, checks: [{id, status, detail}], result: 'PASS'|'BLOCKED'|'INCOMPLETE'|'ERROR', blocked: number, errors: string[]}` in every class, argument errors included; the exit code is the mapping, never a field. **Every command:** an UNCAUGHT exception is an untrustworthy run — exit **2**, and under `--json` still JSON: `{result: 'ERROR', errors: [message]}`.

Exit: 0 PASS · 1 BLOCKED · 2 untrustworthy evaluation · 3 INCOMPLETE.

**C2 and C4 are placeholders.** Both ids stay in `checks[]` so a `--json` consumer indexing by id keeps working, and both always report `–`: C2 (`retired in 6.2 — nothing is read`) read a 5.x task list as a diagnostic; C4 (`ledger retired in 6.2 — open items live in ## Open`) read the issue ledger. Neither file is opened any more, present or absent, whatever it contains.

**C3 — flow-state legality, plus the two 6.2 migrations.** The flow-state is resolved through the SAME trust root archive's R1 uses: a symlinked, escaping or non-regular `flow-state.md` is `C3 BLOCKED — flow-state.md: symlink at …`, never read through, and C8/C9 then report `flow-state not read — see C3` rather than a second opinion (`status` refuses it the same way). An ACTIVE bundle's legacy `review/issues.md` with `open` rows (old table contract: first cell id, last cell status, `open` as the leading token, case-insensitive) is refused — `legacy ledger has N open row(s) — move each into ## Open as \`- <ID>: <text>\` and delete it from review/issues.md (or delete the file): line 3: Q-1 (…)` — at C3, archive R1 and review-ready, and the same message is a `status --escalation` stop; a spaced legacy id is told to re-key (`data schema` → `data-schema`). Closed-only or missing is nothing; unreadable, or content with no readable row, is a structural error (a ledger that cannot be read cannot be proven closed). The gate is one-shot: it never fires again once no open row remains — MOVE the rows, never copy. Frozen archives are never scanned, and the tool never rewrites the file. The other migration is the retired `escalation:` field (see `status`). **ID rules the docs state and the CLI cannot prove:** a closed id is never reused for a different risk within the same bundle; an `evidence-accept` whose id later names a different item is therefore a documentation violation, not something the tool detects. `change`, `lineage` and `phase` are required; `mode:` is OPTIONAL and INERT since 6.2 — absent or empty is fine, `fast` / `standard` are accepted and echoed (`legal (mode fast, build)`), anything else, the unfilled `<fast | standard>` placeholder included, blocks as before. Nothing derives a decision from the word: there is no upgrade, no quota, no lane.

**C9 — the one substantive state predicate.** One check, one question: does this change's own state still owe something real? Gate C9, archive R5, the archive declaration and `status` all call ONE function on the same input, and there is no second state.

*The `## Open` items* (`- <ID>: <text>`, the id being one token in front of the colon). An item is PENDING until the owner's decision is on record in the append-only `gates:` log, in a CLOSED grammar: `- <YYYY-MM-DDTHH:MM> owner: evidence-accept <ID> — <reason>` (revoke by APPENDING `evidence-accept-revoke <ID> — <reason>`; the last decision wins). A pending item blocks. An ACCEPTED item does not block, but it is reported as `accepted, still present` — in C9's detail, as an archive note and in `status` — and nothing deletes the line; the producer removes it when the risk is actually resolved. A line WITHOUT an id is still an open item: it blocks, and it cannot be accepted (`give it a stable id to accept it, or close it`). A duplicated id is refused, both lines named. An empty or absent section owes nothing. Every part of the acceptance line is load-bearing — a timestamp (RANGE-checked: month 01-12, day 01-31, hour 00-23, minute 00-59, `T11:00` or `T1100`; NOT calendar-checked — a 31st of February is a typo, not a forgery, and this tool ships no calendar), the actor spelled exactly `owner`, the lowercase keyword OPENING the payload, the id whole and case-sensitive, the em dash, and a reason carrying a letter or digit in any script. `producer:`, `note:`, a `gate⑤ (owner):` prefix, an undated line, a missing dash or reason, a superstring id (`R-011` for `R-01`) and generic accept prose authorize **nothing**: a producer may not grant itself the owner's exit. An acceptance whose id matches no item is a note (`acceptance R-09 matches no open item`), not a block.

*The state's structure (6.2).* One reader, `lib/flow.js`, reads the whole file for every surface, and it accepts ONE Markdown subset: `key: value` scalars at column 0 (lowercase kebab keys, optional `# comment`), `## Title` sections (any level, optional trailing `# annotation`, title matched whole and case-insensitively), `- `/`* ` items with INDENTED continuation lines, CRLF or LF. Fenced code and HTML comments are inert anywhere — never an item, never a fact, never an authorization. What it cannot read is a STRUCTURAL DEFECT naming its line, and it blocks C9/R5 and review-ready `open` on an active bundle: a numbered or bare line under `## Open` / `## Reality Check` (`line 6: open section line is not a list item — write \`- R-1: …\``), a section written twice (both lines named), a scalar set twice with different values (both lines named; C3/R1 refuse it too), an unclosed fence or comment (the rest of the file is unreadable — it never reads GREEN). An archived bundle's defects are recorded, never a refusal and never migrated; the reader rewrites nothing.

*What the CLI already PROVED about the delta.* A delta that mutates a published requirement (`## MODIFIED` / `## REMOVED` / `## RENAMED`) is reported as a signal — `risk: contract-mutation: <file> <op> '<requirement>'` in C9's detail, `risk[]` in `status --json` — and demands nothing by itself. A delta the scanner could not read (`specs/` that does not resolve, resolves outside the bundle, or a delta file that escapes or cannot be read) is **fail-closed**: no open item and no acceptance cures it, because a scan that could not rule the risk out may never read as "no risk found".

*The state's own claims.* A Reality Check `assumption` still standing, or a Reality Check line naming no kind — each is the producer saying, in its own words, that the work is unfinished, and each is read verbatim. `## Next` carrying more than three actions is reported by `status` and never blocks.

*A legacy `## Evidence` section* (6.0's row table, which has no reader any more) migrates by rule in an in-flight bundle: a row reading `blocked` blocks with `legacy Evidence row '<name>' is blocked — move it to ## Open as an item (or accept it via evidence-accept <name>)`; a row claiming `owner-accepted` with no valid acceptance for its name blocks too (`… claims owner acceptance with no canonical gates: entry — move it to ## Open, or record: <template>` — a self-signed claim may not make a risk disappear); a row whose name carries a valid acceptance is treated as an accepted item; every other row (`done`, `n/a`, `fixed`, an unfilled scaffold row, …) is ignored, with one note: `legacy ## Evidence section ignored (6.2: risks live in ## Open)`. An ARCHIVED bundle is reported, never re-judged — its findings are `recorded`.

**`--review-ready`** re-faces the SAME evaluation as an admission answer and writes nothing — no receipt file, no state field, no cached verdict; the next run recomputes it. TWO items, each a fact this run measured: `tests` (the real test/binding result, C1) and `open` (the state is readable and claims nothing unresolved of its own — every item carries a stable id, no id is duplicated, no Reality Check `assumption` is still standing and no Reality Check line names no kind, each refused with C9's own wording). A PENDING item does not fail review-ready: it is what the review is for, and the item's detail says so. Two earlier items are gone (6.2): `evidence` left with the row table, and `producer-diff` — a self-certification nothing could observe — with it; the P2 instruction to read the complete diff stays as an instruction, and nothing checks it. What the run already holds is printed instead: the delta specs it projected, and C1's own binding counts. The JSON envelope is ONE shape for the judged view, an evaluation error and an argument error (6.2): `{change: string|null, ready: boolean|null, items: [{id, ok, detail}], errors: string[]}` — `ready: null` with `errors[]` (and no items) is an error, exit 2; a judged view carries `errors: []`. The earlier `{reviewReady: null, errors}` and gate-envelope error forms are gone. Exit 0 when every item holds, 1 when any does not — and an unready change goes back to Build & Test rather than into a review round. A skipped C1 never reads as ready: the reviewer must not be the first to run the suite.

With no test command anywhere (no `--test-cmd`, no `test-cmd` config row) C1 is reported `skipped` and the other checks still run — the aggregate is `GATE: INCOMPLETE` with exit code 3. A BROKEN test-command source (conflicting or unreadable config, an empty `--test-cmd`) stays exit 2: broken is not absent. A confirmed block outranks a skip, so exit 1 still wins over exit 3.

**C5 — raw evidence.** Every verdict document needs its transcript beside it: a `<stem>-raw.*` sibling that is NON-EMPTY — a 0-byte file is a missing raw, named as `<stem>.md (<stem>-raw.txt is empty)` — or the self-contained provenance form, which needs no sibling. The tool judges the shape and presence of evidence, not the independence of whoever produced it.

**C8 — the review loop, per family.** Rounds are derived from the review evidence (the same scan C5 uses) and counted inside each family, never summed across families. The derivation runs in two phases: verdict MEANING is read leniently from a closed vocabulary (accept/revise phrasings plus `N issues open` / `N issues found`, `0` being an accept — but never by prefix, so an accept phrase with a contradicting tail is refused rather than misread), while evidence COMPLETENESS is judged strictly. C8 is `n/a` before the first complete round anywhere; it blocks when a family is still `revise` after ITS round 2 with no `reframe <family> round <n> <split|tests|redo> — <reason>` entry in `gates:`, when a family escalates — a reviewer's `VERDICT: escalate` at any round, or ITS round 5 — until the owner answers with `reframe <family> round <n> <split|tests|redo|accept-risk> — <reason>`, and on any evidence **problem** — an unreadable verdict, one document declaring two different outcomes, two documents claiming the same family and round, a summary whose verdict was deleted while its transcript remains, a round-named transcript with no summary, or a gap in a family's 1..N ordinals. Problems are fail-closed and no reframe waives them: the cure is fixing the evidence, not deciding about it. **Advisories never block** — a body pasted twice with the same verdict, or a transcript that was never a review round. An acknowledged escalation passes and still prints its ESCALATION line. An unreadable `review/` leaves C8 `n/a`: C5 already blocks on it.

`apriori archive` consults the same loop through readiness rule **R4**, so a stopped loop or an evidence problem refuses the archive with nothing written and nothing moved, while advisories pass. A stalled round-2 loop is not forceable; the round-5 stop-loss needs both the owner's recorded `reframe` decision and an explicit `--force`.

In-flight C1 consumes the change-scoped verdict (detail `verify GREEN (in-flight, change-scoped)` with a six-count store summary suffix) — parallel changes' gates go green independently; the archived stage still verifies the whole store.

## apriori check

structural consistency (scenario IDs bindable; `--self` adds the apriori repo's own handbook checks)

```text
usage: apriori check [--specs <dir>] [--self]
```

Example: `apriori check`

Exit: 0 PASS · 1 FAIL(n) · 2 missing store path or invalid/terminated `id-pattern` config (`RESULT: ERROR`).

CK-04 recognizes scenario IDs with the project's `id-pattern` row (no flag — a CI gate consumes the project constant; see §8.0), through the same recognition contract as verify.

## apriori update

refresh tool-owned files (runbook copy, command pointers) after a CLI upgrade — never touches yours

```text
usage: apriori update [--dry-run]
```

Example: `apriori update --dry-run`

Exit: 0 done · 1 uninitialized.

**What one run does (6.2).** The runbook copy and each tool's command file are refreshed only when `apriori/managed.json` proves the tool wrote them and you did not modify them since (`updated` / `up-to-date`); a locally modified one is `modified (skipped — …)`, an unrecognised one `unmanaged (skipped — …)`. Protocol scaffolding is re-established piece by piece and never modified: a missing `apriori/.gitignore` is created, and a missing `apriori/tmp/` is created on its own too (`apriori/tmp/  (created)`; something else sitting at that path is reported, never replaced). **Rules files are yours**; the one thing update may change in `CLAUDE.md` / `AGENTS.md` / `.cursor/rules/apriori.mdc` / … is the pointer paragraph this tool wrote, and only when it is verbatim one of the previous shipped generations — that paragraph is replaced by the current one (`pointer updated`), the rest of the file byte-for-byte untouched; a hand-edited pointer is reported (`pointer (skipped — not a shipped generation; hand-edited, left alone)`) and never rewritten; a file with no pointer, or with the current one, is not an action. **The summary is honest:** `N file(s) refreshed`, or `N modified (skipped) — locally modified, not refreshed; …` when anything was declined, or `everything already matches` only when nothing was. **The one adoption exception, stated:** a project initialised by a CLI older than `managed.json` has no manifest; its `apriori/runbook.md` is adopted and overwritten once on the first `update` (a command file only when its bytes match a shipped generation), and from then on both are protected like any managed file — if you customised that old runbook, copy your notes out before the first `update`.

## 8. Configuration Reference

### 8.0 process-config keys: id-pattern

`| id-pattern | <bare JS regex source> |` in `apriori/process-config.md` declares the project's scenario-ID shape once, for every consumer. Resolution order: the `--id-pattern` flag (verify and gate only; judged by presence — an empty flag is an error, never a fallback) > the config row > the built-in default `[A-Z]+(?:-[A-Z]+){0,}-\d+[a-z]{0,}` — which already recognises multi-segment (`AC-BIS-01`) and lowercase-suffixed (`AC-30f`) IDs, so most projects never need the row at all. Its quantifiers are written `{0,}` rather than the equivalent `*` so that the scaffolded table row survives a markdown formatter (a bare `*` pair in a table cell reads as emphasis and gets rewritten to `_`). `check` (CK-04) and `doctor` (D6) consume the row with no flag. All four consumers recognize IDs through the same contract: the match starts at the title's first character, a following letter/digit/underscore rejects it, no `\b` is appended, the source compiles as written.

Pipe escaping has two layers — never conflate them: inside a table cell every pipe belonging to the value is written `\|` (so an alternation cell `(AC\|BR)-\d+` parses to the regex source `(AC|BR)-\d+`, where the bare `|` is alternation); a regex that must MATCH a literal pipe character uses a character class, written `[\|]` in the cell and parsing to `[|]`. This escape rule applies to every config key uniformly.

Errors are consumption-time and fail closed, naming their origin (`--id-pattern` or `process-config`): verify and gate exit 2 through their existing text/JSON error shapes, check prints `RESULT: ERROR` (exit 2), doctor reports a D6 finding and skips the D5 probe (result FINDINGS, exit 1) — never a silent fallback to the default. A config-sourced pattern is repository input that CI consumes automatically, so its matching runs inside a terminable child process (killed on budget — a catastrophic-backtracking row cannot hang CI); the flag is operator-interactive input and runs in-process.

### 8.1 Spec-authoring rules

These are the spec-quality rules the Specify and Build & Test phases enforce. In V3 they live in your **project rules file** (§8.2) — there is no separate tool config. Below is a general baseline — add or remove per project:

```yaml
# Spec-authoring rules — fold these into your project rules file (§8.2)
context: |
  Language: English
  All artifacts must be written in English.

rules:
  specify:
    - Only write the behavior contract (delta specs under the change's specs/); do not modify any source files
    - Stop when done and wait for review, then Build & Test
    - Every "user-visible output" must have its own scenario; if one requirement has multiple visible side-effects (e.g. "filtering" and "showing the filtered-out results"), write them as two separate scenarios, never merged into one sentence
    - Give every scenario a stable ID (e.g. KV-03) — `apriori check` rejects an ID-less scenario. Genuine coverage is Build & Test's own job, not `verify`'s: `verify` only confirms tests ran with no real failure (UNBOUND is advisory); naming a test with its scenario ID is a suggestion, never a requirement
    - |
      For any spec involving "external shared state" (Redis, DB fields, global singletons, etc.),
      you MUST additionally describe behavior at these three moments:
      1. Initialization (how it's written at run/session/request start)
      2. Update at runtime
      3. Cleanup/invalidation (how it's handled on run end, timeout, reset)
      Missing any one of these moments means the spec is incomplete.
  build:
    - The contract's scenarios are the work — there is no task list to follow
    - Stop when `apriori verify` is GREEN, every ## Open item carries a stable id, and `apriori gate --review-ready` exits 0
    - For any continue / silent-ignore / skip branch in the code, re-check the spec to confirm whether that branch must be user-visible; if the spec requires it, produce the corresponding record — don't satisfy only the "exclude the main path" while dropping the "display side"
    - Every scenario needs real, passing test evidence; naming a test after its scenario ID (e.g. `test('KV-03 …')`) is a suggestion for cheap traceability, never a requirement — `apriori verify` blocks on a real failure or on the run leaving no evidence at all, not on the name alone
    - Every key branch or function entry in the code must log; the log format is `[UUID]-description,XXX:[{}],YYY:[{}]` (this format is an example — swap in your own team's logging convention from the rules file, §8.2)
```

### 8.2 Project Rules File (CLAUDE.md and Per-Tool Equivalents)

The rules file is the Agent's "always-on global convention." Each tool puts it in a different place, but **the content is the same**:

| Tool | Rules file location |
|---|---|
| Claude Code | `CLAUDE.md` (project root) |
| Cursor | `.cursor/rules/*.mdc` |
| Windsurf | `.windsurf/rules` (or workflow files) |
| Copilot | `.github/copilot-instructions.md` |
| Codex | `AGENTS.md` |

> Whichever tools you use, also add one line to each rules file referencing your project's copy of the runbook (`apriori/runbook.md`, install steps in [RUNBOOK.md](../RUNBOOK.md) §0) — that line is what makes every session load the protocol automatically.

> **Land the same convention in all the tools your team uses**, so behavior is consistent across tools. The content of the rules file is **highly stack-specific** and should be written by you for your own project. Below is a **language-agnostic skeleton template** — fill in your team's real conventions (the example entries are placeholders, please replace).

````markdown
# Basics

* Reply in English throughout, including your reasoning
* Ask first when unsure; don't guess

# Project Architecture

## Directory / Module Structure

* `<dir-A>`: <responsibility>
* `<dir-B>`: <responsibility>
* … (list the key directories and their responsibilities, so the Agent knows "where code goes")

## Module Dependencies and Conventions

* <how modules reference each other; build/publish caveats>
* <operations to do in lockstep when changing across modules>

# Coding Conventions

* Naming: <naming convention>
* Library choices: <preferred standard/util libraries and their common methods, e.g. emptiness checks, time handling, random numbers>
* Layering constraints: <e.g. DB access only in the data-access layer, not the business layer>
* Dependency injection / resource management: <team preference>
* Other team habits: <list, one by one, the conventions people keep having to remind each other of>

# Logging Convention

A unified format, for global search and pinpointing:

```text
[UUID]-description,XXX:[{}],YYY:[{}]
```

* `UUID` is a genuinely-generated unique string used as a code tag, guaranteeing global uniqueness in the code
* Wrap the UUID and the printed object in `[]` for easy copying
* Print objects via JSON serialization; print non-objects directly
* For large collections, extract the key IDs first to avoid log explosions
* Log at key branches and function entries; no method may be entirely without logs

# Testing Convention

* Test file location: <convention>
* Base class / framework: <convention>
* Mock strategy: <what to mock (e.g. external remote calls), what to avoid mocking (e.g. local data access — operate for real where possible)>
* Test numbering / naming: <convention, e.g. numbering ranges for success vs failure scenarios>
* Coverage requirement: <scenario coverage with real test evidence is the hard bar — every spec scenario genuinely exercised by a test; naming/binding it to its ID is advisory, for traceability, never required; treat line/branch coverage as a signal to investigate (e.g. anything below 85%), never a target to chase — a model told to hit a number will pad with assertion-free tests>
* Test method-body template: <give an empty-shell example to unify the style>
````

> Tip: deposit, one by one, the conventions your team keeps having to remind each other of into the rules file — grow it from observed needs, never front-load an encyclopedia and never auto-generate it (auto-generated instruction files measurably *hurt*: ≈−2% success, +23% cost, versus ≈+4% for human-written ones). Aim for single-digit kilobytes, and prune ruthlessly with the official test: *"would removing this line cause the agent to make mistakes? If not, cut it"* — bloated files cause instructions to be ignored. Six content categories consistently earn their keep: build/test commands, code-style rules that differ from defaults, project structure, testing instructions, git conventions, and boundaries. **The more specific and executable the rules, the more stable the Agent's output.**

---
