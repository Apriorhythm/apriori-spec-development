<!-- apriori-base: sha256:13b5a4059b26503786281f36f9a828fd857dbb29a397376eca04cf9ed8145421 -->
# Delta — archive-merge (protocol-text-consistency)

## MODIFIED Requirements

### Requirement: archive refuses to merge a change that is not ready
`apriori archive --change <name>` SHALL, in dry-run and with `--write` alike, evaluate the bundle's readiness AFTER every existing preflight guard and BEFORE the MODIFIED integrity section, and refuse with `RESULT: NOT READY — nothing written` (exit 1, nothing written and nothing moved) unless: R1 the flow-state is structurally sound, passes the C3 legality checks, and declares `phase: review`; R4 the review root is a real contained directory and the review loop has converged; R5 no open item is still pending (6.2: the one substantive state predicate). There SHALL be no R2 and no R3: 6.0 asks for no task list and `tasks.md` is never read; `review/issues.md` is opened by exactly one thing — R1's one-shot legacy migration (LM-01, the same helper C3 runs): a still-`open` row is a structural, non-forceable refusal until it is moved into `## Open`, an unreadable or unparseable ledger is a migration error (LM-05), and a closed-only or absent ledger changes nothing — no rule of readiness judges the change by it. The predicates SHALL be the SAME code the gate's C3/C8/C9 run. Reads of the flow-state SHALL go through an archive-only safe layer that classifies `lstat`/`realpath` failures by `e.code` in a SINGLE pass — only a true `ENOENT` reaches the absent branch; every other code is a structural defect. Evaluation order is: structural → C3 legality → the phase overlay → R4/R5.

#### Scenario: AM-74 the safe layer classifies every flow-state defect
- WHEN `flow-state.md` is in turn missing, a symlink, a non-file or escaping the bundle, with and without a (inert) `mode:` line — and separately when `review/issues.md` takes the same shapes
- THEN every flow-state defect refuses, non-forceably, whatever the mode says; a ledger that is not a readable file (not-file, symlink) refuses as R1's structural migration error — a ledger that cannot be read cannot be proven closed (LM-05) — while an absent ledger is nothing

#### Scenario: AM-75 an external phase file cannot launder an abandoned bundle
- WHEN a bundle whose real flow-state says `phase: abandoned` has its `flow-state.md` replaced by a symlink pointing at a `phase: review` file outside the bundle
- THEN archive refuses as a structural defect without following the link, and `--force` does not change the outcome

#### Scenario: AM-76 the review root is guarded, and the guard is R4's
- WHEN `review/` is itself a symlink pointing at another directory inside the bundle that holds a perfectly good review round
- THEN archive refuses under R4 as a structural, non-forceable defect — the directory the loop reads is never read through a link

#### Scenario: AM-77 a read that fails after the guard is a structural defect
- WHEN the flow-state guard passes and the subsequent `readFileSync` throws (race or permission)
- THEN archive refuses, the diagnosis carries the original `e.code`, and the failure is non-forceable

#### Scenario: AM-107 a non-ENOENT failure at any of the five probe points refuses, in every mode
- WHEN a non-`ENOENT` error (`EACCES`/`EIO`/`ELOOP`) is injected at the flow-state `lstat`, at its ancestor walk, at the review-root `lstat`, at the flow-state realpath stage, or at the review-root realpath stage
- THEN each one refuses as `io-error` with the original `e.code`, non-forceable — with and without a `mode:` line, because the mode decides nothing

#### Scenario: AM-108 a true ENOENT is benign
- WHEN `tasks.md` or `review/issues.md` genuinely does not exist
- THEN nothing is refused and nothing is `n/a` — neither file has a rule left to be absent from

#### Scenario: AM-115 an ENOENT raised at the realpath stage is not a structural defect either
- WHEN the `lstat` succeeds but the containment check's realpath reports `ENOENT` — for the flow-state, and separately for the review root
- THEN the flow-state case takes the ancestor walk and ends as `missing` (R1's own refusal, never an io-error), and the review-root case reports nothing, exactly as the earlier `lstat` ENOENT would have — the containment check has no third answer of its own

#### Scenario: AM-112 a completely normal bundle stays archivable
- WHEN `review/` is an ordinary directory holding one review round and the flow-state is at `phase: review`
- THEN readiness passes and the archive completes — a file-type rule applied to the review DIRECTORY would have failed every well-formed bundle

#### Scenario: AM-113 an absent review directory is not a structural defect
- WHEN `review/` does not exist at all
- THEN the review-root check reports nothing structural — R4 reports the missing round — and nothing is `n/a`

#### Scenario: AM-78 an unready change is refused with nothing written
- WHEN the flow-state is at the wrong phase, or `## Open` holds a pending item
- THEN archive prints `RESULT: NOT READY — nothing written`, exits 1, writes no store byte and moves no directory

#### Scenario: AM-79 R1 reports first and alone, the later rules report together
- WHEN a bundle fails R1 as well as R4 and R5
- THEN only the first R1 hit is reported; when R1 passes, every later blocker is listed in one report

#### Scenario: AM-80 abandoned and done carry their own wording
- WHEN `phase` is `abandoned`, or is `done`
- THEN the first cites the runbook's hard rule and the second reads `in-flight bundle declares done; archiving happens at 'phase: review'` — never claiming the change was already archived — and neither is forceable

#### Scenario: AM-81 a broken flow-state reports the C3 diagnosis, not the phase wording
- WHEN a bundle declares `abandoned` and also fails another C3 check (missing key, placeholder, name mismatch)
- THEN the C3 diagnosis is reported verbatim and the abandoned wording is not used

#### Scenario: AM-82 an absent artifact is not an obligation, and R5 is never forceable
- WHEN `tasks.md` and `review/issues.md` are absent, and then present with an unchecked box / a closed row (an `open` row is R1's one-shot migration refusal, not a readiness rule) — and separately when `## Open` holds a pending item beside an `archive-force ledger` record
- THEN the archive proceeds in the first four cases (neither file is read), and the pending item refuses with `--force` unable to buy it

#### Scenario: AM-83 existing preflight failures keep their diagnosis and never reach readiness
- WHEN any existing guard fails — discovery, validation, CAS denial, hygiene, base mismatch, conflict, a pre-existing temp file, or the archive-destination containment check
- THEN the diagnosis and exit code are unchanged from before this change and the readiness evaluator is never called

#### Scenario: AM-84 the integrity section is not printed for an unready change
- WHEN readiness fails
- THEN no MODIFIED INTEGRITY section appears; when readiness passes it appears in its existing position

#### Scenario: AM-85 dry-run predicts what --write would do
- WHEN an unready change is dry-run
- THEN `RESULT: MERGED (dry-run…)` is not printed, the exit code is 1 and nothing is written

#### Scenario: AM-114 readiness is a single look, not a commit-time guarantee
- WHEN the bundle is modified inside the hook that fires after readiness completes and before the first store write
- THEN archive neither re-reads the readiness artifacts nor detects the change — the guarantee is one evaluation, and the caller must not modify the bundle across the run

### Requirement: --force overrides progress only, on pre-recorded human authority
`--force` SHALL belong to the high-level form alone and SHALL override ONLY progress blockers, which are exactly two things: a review family's escalation the owner already answered (its `reframe` record), and — since archive-drop-guard — the dropping of store scenarios the owner already named through a fingerprint-bound `archive-drop` record. Everything else is non-forceable: an ambiguous MODIFIED replacement, a drop with no decision or with a decision whose fingerprint no longer matches the input, every R1 outcome (`abandoned` above all), every structural defect (`io-error`, `symlink`, `not-file`, `not-dir`, `escape`, `bad-ancestor`), a review family stopped at its round limit (or by an `escalate` verdict) with no owner decision on record (readiness reports it `forceable: false` while still naming the reframe cure; it turns forceable only once the decision is recorded), an invalid `review-round-limit` configuration, a `review-progress` record that is missing or fails its structural check, an unmet review floor, and every R5 refusal — an open item nobody accepted is not progress, and owner acceptance for it is spent in the state, not at the command line. There is no `tasks` force class and no live `ledger` class: the `archive-force ledger` grammar is still PARSED — the SAME entry, and the same parser, the item acceptance and the `reframe` decision use — but a grant is reported as `note: archive-force has nothing left to force in 6.2` and overrides nothing. Revocation is by APPENDING `archive-force-revoke ledger <reason>` and the last decision wins, for that note alone. The limit-stop DOUBLE action is preserved: the recorded `reframe` alone is not a `--force`, and `--force` alone is not a decision.

#### Scenario: AM-89 an archive-force record is inert: nothing is forced, and the note says so
- WHEN a bundle records the canonical `archive-force ledger — <reason>` beside a closed ledger row, with and without `--force`, and then a revoked grant, an `archive-force tasks` record, a `note:` near miss and no record at all
- THEN the first archives either way with `note: archive-force has nothing left to force in 6.2` and no `forced:` line, the unread row never reaches the report, and the other four print nothing about `archive-force`

#### Scenario: AM-87 nothing but the answered limit escalation and the named drop is forceable
- WHEN the blocker is any R1 outcome, a structural flow-state defect, or a pending open item — each beside a standing `archive-force ledger` record
- THEN `--force` does not change the refusal, no force advice is printed for the item, and readiness reports it `forceable: false` with nothing forced

#### Scenario: AM-110 the kept parser is anchored: only the canonical entry is a grant
- WHEN the entry reads `archive-force ledger — cleanup deferred`, or `archive-force ledger2 …`, or `archive-force-2 ledger …`, or `do not archive-force ledger — 还没做完`, or the canonical payload under a `note:` / `producer:` / `agent:` / `gate⑤ (owner):` actor, or with no timestamp, or with no em dash, or with no reason
- THEN `forceGrant` answers a grant for the first only — the class word inside a reason never authorizes, a keyword preceded by free text never authorizes, and the entry's PREFIX is as binding as its payload; a Chinese reason is a reason

#### Scenario: AM-111 revocation appends and the last decision wins — in the parser and in the note
- WHEN `archive-force ledger <reason>` is followed by `archive-force-revoke ledger <reason>` and later by another `archive-force ledger <reason>`, each carrying a reason
- THEN the parser answers granted, then not, then granted again, in the order the entries appear, and the archive prints the nothing-left-to-force note exactly when the parser answers granted; a revoke with no grant before it grants nothing, and a revoke carrying no reason is ignored exactly as a reasonless grant is

#### Scenario: AM-91 the single-file form does not take --force
- WHEN `--force` accompanies `--store`/`--delta`
- THEN archive exits 2 with usage

#### Scenario: AM-116 one canonical owner entry supplies the payload for every decision verb
- WHEN `ownerPayload` is applied to the canonical entry for each of the three verbs, and then to the same payloads under a `note:` / `producer:` / `agent:` / `gate⑤ (owner):` / `ownership:` actor, with no timestamp, and with a timestamp-shaped non-timestamp (a 13th month, a 24th hour, a 60th minute)
- THEN the canonical forms yield their payload and every other form yields `null`, so the verb patterns below never see a non-owner entry; a NEGATED verb still yields a payload, because refusing it is the verb pattern's job — the keyword has to open the payload

#### Scenario: AM-117 the usage lines say which flags belong to which form
- WHEN `apriori archive` is run with no arguments
- THEN the single-file line carries neither `--changes-dir` nor `--force`, and the high-level line carries both — the two forms are no longer symmetric and the usage must not pretend otherwise

### Requirement: the single-file form never touches a change bundle
The single-file form `apriori archive --store <f> --delta <f>` SHALL NOT accept `--changes-dir` (and therefore SHALL never move a directory), and SHALL refuse any `--delta` that resolves inside the canonical changes root. Containment is judged by TWO measures — the `path.resolve` lexical spelling and the realpath — with segment boundaries, not string prefixes; either measure hitting is a refusal. A measure whose realpath cannot be taken produces no hit. The judgement happens before any store or delta CONTENT is read; path metadata reads needed for the judgement are excepted. A delta outside every changes root keeps its existing behaviour byte for byte.

#### Scenario: AM-92 the single-file form no longer takes --changes-dir
- WHEN `--changes-dir` accompanies `--store`/`--delta`
- THEN archive exits 2 with usage, writes nothing and moves nothing

#### Scenario: AM-93 a delta spelled inside the changes root is refused
- WHEN `--delta` is `apriori/changes/X/specs/a.md`, or `./apriori/changes/X/specs/a.md`, or a `..`-containing path that resolves to the same place
- THEN archive refuses and the diagnosis names the high-level form as the way to do this

#### Scenario: AM-94 a sibling directory sharing a prefix is not inside
- WHEN `--delta` is `apriori/changes-other/X/specs/a.md`
- THEN archive proceeds — containment is judged by path segments

#### Scenario: AM-95 an external symlink into a bundle is refused
- WHEN `--delta` is a symlink outside the changes root whose realpath lands inside it
- THEN archive refuses on the realpath measure

#### Scenario: AM-96 a symlinked root is caught by the lexical measure
- WHEN the changes root itself is a symlink and the caller spells the delta lexically inside it, so the realpath measure misses
- THEN archive still refuses

#### Scenario: AM-97 an unresolvable path produces no hit and no new failure
- WHEN the changes root does not exist, or the delta is dangling, or realpath fails on permissions
- THEN that measure produces no hit; if the lexical measure also misses, the call falls through to the pre-existing behaviour with its original exit code and diagnosis

#### Scenario: AM-98 surgery outside the changes root is untouched
- WHEN `--delta` lies outside every changes root, including the `--write` success path
- THEN the behaviour is byte-for-byte what it was before this change

#### Scenario: AM-120 an archive may not succeed while its own declaration says INCOMPLETE
- WHEN the readiness step is driven to READY — the state a softened or bypassed R5 would produce — on a bundle whose state records an open issue or a standing assumption, in dry-run and with `--write`
- THEN the run still exits 1 with `RESULT: NOT READY — nothing written`, names the INCOMPLETE declaration as the reason, writes nothing to the store and moves no bundle; a clean bundle declares exactly the three states and merges

#### Scenario: AM-121 the owner exit keeps its double action, and the printed cure is copyable
- WHEN an `archive-force ledger` record sits beside a closed ledger row, and separately when a family stopped at the owner's review-round limit faces the recorded `reframe` alone, `--force` alone, both together, and then each near miss of the canonical entry in place of the decision
- THEN the first archives with the nothing-left-to-force note; for the escalation only "both together, canonically recorded" archives; AND WHEN the refusal's ONE copyable template (no `archive-force` template is offered) is filled in and pasted into the `gates:` block THEN the next run archives — a template the tool prints must authorize what it was printed to cure

#### Scenario: AM-122 the declaration reads the readiness predicate, and "complete" means accepted or absent
- WHEN a bundle records pending or id-less open items, or assumptions, in any heading form, and separately when `## Open` is empty, holds one canonically accepted item, one pending item, or one item with a producer's self-acceptance
- THEN the implementation counts come from the SAME predicate readiness refuses on (the two can never disagree about one bundle), and the evidence state reads `complete` for the empty section, `complete, N risk(s) accepted by the owner (<ids>), still present` for the accepted one, and `N open item(s) still pending` for the other two

#### Scenario: OI-08 the archive declaration derives its three lines from the open items
- WHEN the declaration is computed for an empty `## Open`, for pending and id-less items beside an assumption, for two accepted items with `delivery: released`, for one accepted and one pending item, and for a legacy `blocked` row — and separately when readiness is driven to READY over a pending item
- THEN the three lines read `complete` / `INCOMPLETE — N pending open item(s), M unverified assumption(s)` / `complete, N risk(s) accepted by the owner (<ids>), still present` / `N open item(s) still pending` / `N legacy Evidence row(s) still blocked — move them to ## Open` accordingly, and the backstop still refuses the pending item with `RESULT: NOT READY — nothing written`

#### Scenario: OI-10 an unaccepted open item is never forceable, with or without an archive-force record
- WHEN a pending item sits beside an `archive-force ledger` record and `--force`, and separately when a five-round family carries the owner's `reframe … accept-risk` beside an accepted item
- THEN the first refuses (`R5 open item <ID> is pending`, no force advice, nothing forced) while the second still needs both the record and `--force` and then prints `forced: R4 …` — the round-5 path never depended on the ledger class

## Notes

Why: three scenario WHEN clauses still describe an `open` ledger row archiving and a "round-5 escalation"; since c63a466 an `open` row is R1's migration refusal and since 166af35 the owner limit replaced round 5. The tests already exercise the current behaviour; only the scenario wording is corrected.
