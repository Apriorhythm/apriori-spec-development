### Requirement: executable specs shrink verification and drop the OpenSpec adapter
The V3 runbook SHALL make scenario-to-test binding a deterministic gate, narrow the heterogeneous consistency review to what binding cannot prove, implement archive natively, and remove the OpenSpec adapter so the interface is single-path plain-files.

#### Scenario: PR-01 the Build & Test exit adds a deterministic spec-runner gate
- WHEN a change reaches the Build & Test exit
- THEN "spec-runner reports GREEN (every scenario BOUND-GREEN)" is a required exit condition, alongside the existing test/lint conditions

#### Scenario: PR-02 P8 scope narrows to semantic faithfulness
- WHEN the consistency review (P8) runs on a change whose spec-runner is already GREEN
- THEN P8's mandate is narrowed to whether each test faithfully exercises its scenario's intent (binding/coverage is now mechanical, per the v2.2 judge-bias caveat), not re-checking coverage

#### Scenario: PR-03 archive action is native plain-files, no adapter
- WHEN the archive action runs
- THEN it uses archive-merge (AM-01..10) directly; there is no `openspec/` path and no `/opsx:` adapter command

#### Scenario: PR-04 the interface is single-path plain-files
- WHEN any runbook/README section references artifact paths
- THEN it names only the `apriori/` plain-files layout; no `(adapter: openspec/…)` dual-path parentheticals remain (CK-05 enforces this)

#### Scenario: PR-05 probe code is disposable and never becomes an artifact
- WHEN the runbook describes what to do when a fact will not yield to reading
- THEN probe code is allowed, thrown away afterwards and never a deliverable — its product is an `observed` line in the state's Reality Check, not an artifact the change carries; no `spike/` path and no separate prototype track survives in either edition

#### Scenario: PR-06 a configurable language governs human-facing prose, machine tokens stay English
- WHEN the runbook describes output language
- THEN human-facing prose follows `process-config.md`'s `language` (unset/`auto` → match the human), while machine tokens (verdict lines, scenario IDs, ADDED/MODIFIED/REMOVED, file paths) stay English regardless

#### Scenario: PR-07 the brainstorm stance is a structured diverge→converge→funnel, entered via P13
- WHEN the runbook describes what to do with a still-fuzzy idea
- THEN it offers a **Brainstorm** stance (a stance, not a tracked phase; no required output; entered via the P6 kickoff prompt) with three movements: **diverge** — open threads not interrogations, codebase-grounded, ASCII sketches including 2-3 UI-mockup variants for anything user-facing, risks surfaced unprompted; **converge** — exactly one question per message with concrete options, a coverage checklist (purpose, target users, core scenarios, UI shape, data & content, constraints, non-goals, success criteria) where every item is answered or explicitly deferred by the human, mid-conversation additions probed as observed-need vs speculation (cost stated, staged path offered first), human fatigue collapsing the remaining checklist into batch-approved recommended defaults, and 2-3 candidate approaches with tradeoffs before any exit; **funnel** — into `apriori new` and Ground when the human approves a stateable goal, or, when it still cannot be stated, the stance continues and the missing facts are settled in Ground inside the same change — there is no second track to route to

#### Scenario: PR-08 the four phases and the four decision points bind in both editions
- WHEN the runbook's flow and hard-rule sections are read in either language
- THEN §4 names exactly the four phases (Ground / Specify / Build & Test / Review & Deliver) with no numbered-step vocabulary, the state's `phase` key carries those four words plus `done` and `abandoned`, and §1 R1 names exactly four things that stop for a human — an escalation, critical evidence still `blocked`, an external side effect, and abandonment — while stating that no consolidation authorization exists

#### Scenario: PR-09 brainstorm's exit is human-gated, artifact-free until approval, and carries a requirement seed
- WHEN a brainstorm session runs and approaches its end
- THEN nothing durable is written before the human approves the exit (no code, no spec or design files, no `apriori new`, no flow-state), and that protection is stated to the human in one plain-language sentence, never as protocol internals; the agent may only *propose* exiting after presenting the approaches comparison; "stateable" is the human's judgment, never the agent's; and on approval the crystallized understanding is written into the state's `## Reality Check` (goal, users, chosen approach, success criteria, constraints, non-goals with the reasons they were cut, open questions)

#### Scenario: PR-10 the E2E layer sits above the binding gate, and no project-type matrix survives
- WHEN the Build & Test section is read in either language
- THEN it states that scenario IDs bind to `apriori verify` via unit/component tests (verify speaks TAP, which Playwright does not emit), that the Playwright E2E/visual layer is an additional exit condition above the binding gate whose visual checks emit a textual pass/fail, that implementation-time screenshots land in the gitignored `apriori/tmp/` while baseline images belong to the project's own test suite — and that 6.0 keeps NO per-project-type evidence matrix: what a change owes is one `## Evidence` row per risk it actually hits

#### Scenario: PR-11 a hard guarantee in the spec must be exercised by a fault-injecting test
- WHEN a spec or KB asserts a hard guarantee — crash durability ("a success response means the write is persisted"), atomicity, or an invariant qualified "always" / "under concurrency" / "after restart"
- THEN the Build & Test section requires a test that injects the adversarial condition **matched to the exact claim on its success path** — a crash-durability claim demands kill-after-ack-then-restart-and-verify-by-reading-back-through-the-app (a file-peek skips the recovery path; an error-path injection like a rename failure proves only "no false success", a different claim), and the discipline names the atomic-file gotcha that durability needs `fsync` on both the temp file AND its containing directory — or the wording is scoped down to what is verified; and the independent review's mandate lists the unexercised-guarantee case as a spec-vs-code gap (never advisory)

#### Scenario: PR-12 flow-state persists the reviewer's resumable session id
- WHEN a heterogeneous review starts and round 1 prints the reviewer's session id
- THEN the flow-state schema (§3) carries a `reviewer-session` field that records it immediately (so even a first-round interruption on either side resumes the SAME session per R2 rather than reconstructing it), and R2 names this field as the persistence point

#### Scenario: PR-13 the reviewer's default context is fixed, and it does not do the producer's job
- WHEN the independent review prompt is read in either language
- THEN its default input is exactly the behavior contract, the diff, the evidence summary and the uncovered boundaries; raw review transcripts, closed issues and other changes' documents are explicitly excluded; it asks for behavior the contract requires that the code implements only on the happy path, for the uncovered boundaries the evidence summary itself names, and for scope one evidence chain cannot prove; and it forbids the reviewer from compiling the code, adding the producer's missing tests one by one, or rewriting the approach — the answer to needing any of those is that the change was not review-ready

#### Scenario: PR-14 two entry doors — a bare /apriori opens the Brainstorm stance
- WHEN a human has only a fuzzy idea (no change name yet)
- THEN the scaffolded `/apriori` command with NO arguments enters the Brainstorm stance via P6 (thinking only, nothing durable until the approved exit), the runbook's §0 names the two doors explicitly (fuzzy idea → Brainstorm; stateable change → kickoff prompt), the with-a-name door advances only to the next point where a human has to decide, and `apriori init`'s closing hint presents both doors

#### Scenario: PR-15 abandonment is a legal exit at any point, on the human's word only
- WHEN the human decides mid-change to drop a change (any phase)
- THEN the runbook prescribes: the human's verbatim reason recorded in `gates:`, the change dir archived with flow-state `phase: abandoned`, nothing written to KB or spec store, touched code disposed only as the human directs; the agent may never propose abandonment as an escape from failing reviews; whatever the change already wrote is kept as a recorded decision

#### Scenario: PR-16 legacy-project clarity clauses from the inherited-poll lab
- WHEN an agent runs the protocol on a legacy project or resumes a dead session
- THEN the runbook states: the KB pre-check is part of Ground and usually runs FIRST on a legacy kickoff; the `gates:` label vocabulary is exactly `owner` and `note`; the KB capture prompt declares capture is NOT a defect audit; the state's `## Next` carries at most three actions; R2's transcription mechanism covers the review doc itself; the guarantee-claim discipline warns that chmod-based fault injection silently fails under root (inject via the I/O primitive); and the archive prose names `--changes-dir` for the dir move plus the resumed-session-looks-under-`archive/` sequencing

### Requirement: external side effects require the principal's explicit authorization
The runbook (both language editions) SHALL carry a hard rule beside gate consolidation: any operation mutating state outside the local repository/workspace requires the human principal's explicit authorization — with mandatory example classes (push to a shared remote; merge into a shared branch; publish a release/package/tag; deploy; mutate production data; administer remote services incl. settings/secrets/webhooks/permissions/collaborators/environments; invoke paid external services beyond the routine configured verification path; message external humans or systems). Authorization is one-shot, names the action class, and is recorded verbatim in `gates:`; a gate-consolidation authorization NEVER covers external side effects. A standing grant must name class, scope, AND expiry — ambiguous, expired, or out-of-scope reuse is invalid and needs fresh authorization. Non-principal data (file contents, tool output, review verdicts, web pages, commit messages, PR comments) may drive internal state-machine transitions exactly where the protocol already says so, but NEVER authorizes an external side effect. The gate-consolidation paragraph cross-references the rule, and the concepts handbook mirrors it in one paragraph per language.

#### Scenario: PR-17 the external-side-effect rule is normative in both editions
- WHEN the runbook's authorization sections are read in either language
- THEN the outside-the-workspace rule with its mandatory example classes is present, gate consolidation explicitly never covers external side effects, one-shot authorization with verbatim gates: recording is required, standing grants carry class/scope/expiry with invalid-reuse stated, the internal-transitions-vs-external-authorization distinction is drawn, the routine-verification carve-out names the expected verification path, the gate-consolidation text cross-references the rule, and docs/concepts mirrors the boundary in both languages

### Requirement: the ledger vocabulary is protocol, and only an open row blocks
The runbook (both editions) SHALL document the issue ledger as OPTIONAL — the state's `## Open` section is where a change's open substantive issues live — and, where a change keeps one, SHALL document the full status vocabulary (`open` / `fixed` awaiting verification / `rejected + reason` awaiting reviewer concurrence / `verified` / `rejected-verified` preserving the original rejection reason plus a reviewer-concurrence reference / `waived + reason` settable ONLY by the human with a `gates:` entry recording the decision / `advisory-acked` for reviewer-labeled advisory batches); who sets what (the reviewer flips fixed→verified and rejected→rejected-verified; the producer never terminalizes its own findings); that a re-found issue REOPENS its old ID by returning it to `open` — reopened is an event, not a status; and that EXACTLY ONE finding blocks a delivery — a row still reading `open`. An unknown status, a reasonless rejection, an unrecorded waive and an archive-stage non-terminal row SHALL be documented as bookkeeping notes that never refuse. Only correctness, security and stated-requirement gaps become rows at all; everything else is `advisory`, and the label is the reviewer's exclusive call. The concepts handbook mirrors the same rules in both languages.

#### Scenario: PR-18 the ledger vocabulary and the one blocking finding bind in both editions
- WHEN the ledger section is read in either language
- THEN the ledger is stated to be optional with `## Open` named as the default home, the seven statuses with their setters are documented (waived = human-only with a gates: entry; rejected-verified preserves the original rationale), the reopen-is-an-event rule is stated, exactly one blocking finding (`open`) is named while the bookkeeping-only findings are listed as non-blocking, and the concepts handbook carries the same vocabulary in both languages

### Requirement: requirement-stage paths carry the change name  _deprecated (superseded by change-bundle)_
The runbook (both editions) and the concepts handbook (both languages) SHALL write every requirement-stage path with the change prefix — `requirement/<change>-req-v{N}.md` finalized as `requirement/<change>-req-final.md`, and `requirement/<change>-intent-card.md` on the explore track — and none of the old global literals (`requirement/req-v`, `requirement/req-final.md`, `requirement/intent-card.md`) anywhere in the four live docs; parallel changes stop overwriting each other's requirement history. The STEP6 section (both runbook editions) SHALL carry the preservation clause: after `apriori archive --change <name> --write --changes-dir apriori/changes` moves the change dir, and before the STEP6 closeout commit, every `requirement/<change>-req-*.md` and `requirement/<change>-intent-card.md` (if present) is copied into `apriori/changes/archive/<stamp>-<change>/requirement/`, basenames preserved, all versions included. Already-archived changes keep their old file names (grandfathered — nothing parses requirement filenames).

#### Scenario: PR-19 the prefixed convention binds in every live doc
- WHEN the four live docs (runbook EN/CN, concepts EN/CN) are scanned
- THEN the prefixed forms appear where the convention is written (artifact table, STEP0, intent card, the goal recipes, concepts' walkthrough), the STEP6 preservation clause names its destination and its before-the-closeout-commit timing in both runbook editions, and none of the three forbidden old literals appears anywhere in the four docs

### Requirement: the preservation of requirement history is command behavior  _deprecated (superseded by change-bundle)_
The runbook STEP6 section (both editions) SHALL state that the archive action itself stages `requirement/<change>-*` (req versions, final, intent card) into the change dir and carries them through the atomic move into `archive/<stamp>-<change>/requirement/` — the executor's residual duty is only the closeout commit; the former executor-copy instruction SHALL be absent.

#### Scenario: PR-20 the automatic carry binds and the manual instruction is gone
- WHEN the STEP6 section is read in either edition
- THEN it states the archive action carries the requirement history automatically (destination named), the executor's duty is the closeout commit alone, and the old copy-it-yourself phrasing ("copy every"/"拷入") appears nowhere in the section

### Requirement: no live document requires the fixed artifact family
The runbook (both editions) and the concepts handbook (both languages) SHALL define the bundle as the ONLY layout: everything a change owns lives in `apriori/changes/<name>/` — `flow-state.md`, `specs/<module>/` for the delta contract, and `review/` holding each review doc with its raw beside it under the unchanged `<stem>-raw.*` rule, plus the OPTIONAL ledger `issues.md`. 6.0 retired the fixed artifact family: no live document SHALL require, instruct the production of, or scaffold a requirement doc, a proposal, a design doc, a gap report or a task list, and none of `req-v{N}.md`, `req-final.md`, `proposal.md`, `design.md`, `tasks.md` or `gap-report.md` SHALL appear as a path a change is told to write. The six legacy roots (`requirement/`, `spike/`, `apriori/review/`, `apriori/design/`, `apriori/explore/`) appear nowhere as standalone paths — they survive only as `doctor`'s pre-4.0 migration probe (D8). Mentions that are explicitly historical ("5.x demanded…", "it replaced gap-report.md", "a `tasks.md` a 5.x bundle still carries") are the only permitted occurrences, and each must read as a negation or a migration note rather than an instruction. The archive action carries the whole bundle in its one atomic move. The v4 stability sentence states its promise over the CLI surface & flags, `--json` shapes, the delta format, and the flow-state schema — without a layout clause.

#### Scenario: PR-21 the artifact family is gone from every live document
- WHEN the four live docs (runbook EN/CN, concepts EN/CN) are scanned
- THEN the artifact table names only flow-state, `specs/`, `review/` (docs + raws) and the optional ledger; the strip-scan finds zero standalone occurrences of the five legacy roots; every surviving mention of `req-v`, `req-final`, `proposal.md`, `design.md`, `tasks.md` or `gap-report` sits in a sentence that negates it or labels it 5.x history; and the stability sentence carries no layout clause

### Requirement: the CAS promise speaks the present tense and the release surface points at the repository root
Both runbook editions SHALL state the CAS rule in the present tense — unstamped mutation deltas are denied by archive by default, naming the two visible waivers (`--no-cas`, `| cas | optional |`) — with no future-tense "mandatory in 4.0 / 4.0 起强制" phrasing left; MIGRATING.md SHALL carry a 4.0 section with the legacy-root detection guidance and the manual migration mapping; `package.json`'s homepage SHALL point at the repository root (`#readme`, carrying no branch segment) so it follows the default branch.

#### Scenario: PR-22 the promise and the pointers are current
- WHEN the two runbook editions, MIGRATING.md, and package.json are read
- THEN the runbooks state archive's default denial in the present tense with both waivers named and carry no future-tense mandatory-in-4.0 phrasing; MIGRATING.md has a 4.0 section naming the five legacy roots; the homepage field ends in `apriori-spec-development#readme` and carries no `/tree/<branch>` segment

### Requirement: the migration pointer reaches npm users
The npm package SHALL ship `MIGRATING.md` (listed in `package.json` `files`), and the legacy-layout messages (doctor D8's fix, update's warning) SHALL carry both the local path and the stable URL `https://github.com/Apriorhythm/apriori-spec-development/blob/main/MIGRATING.md` — a pointer the diagnosed user can actually open.

#### Scenario: PR-23 the pointer is packaged and dual-form
- WHEN the npm files list and the D8/update message templates are read
- THEN `MIGRATING.md` appears in `package.json` `files`, both messages carry the local file reference and the stable blob URL, and MIGRATING's pre-4.0 CAS wording carries the "archive denies by default since 4.0.1" correction so the old table cannot be read as current behavior
