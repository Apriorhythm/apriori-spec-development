<!-- apriori-base: sha256:eb17d01a655c2a663724f4b739b25d03c9d14d91870d07471b94482e57a27d12 -->
# Delta — protocol (protocol-text-consistency)

## MODIFIED Requirements

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

#### Scenario: PR-08 the four phases and the five decision points bind in both editions
- WHEN the runbook's flow and hard-rule sections are read in either language
- THEN §4 names exactly the four phases (Ground / Specify / Build & Test / Review & Deliver) with no numbered-step vocabulary, the state's `phase` key carries those four words plus `done` and `abandoned`, and §1 R1 names exactly five things that stop for a human — an escalation, an `## Open` item that cannot be resolved (critical evidence blocked, a pending item), a review family at its round limit (`reframe`), an external side effect, and abandonment — while stating that no consolidation authorization exists

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
- THEN its default input is exactly the behavior contract, the diff, the `## Open` items and the uncovered boundaries; raw review transcripts, closed issues and other changes' documents are explicitly excluded; it asks for behavior the contract requires that the code implements only on the happy path, for the uncovered boundaries the `## Open` items themselves name, and for scope one evidence chain cannot prove; and it forbids the reviewer from compiling the code, adding the producer's missing tests one by one, or rewriting the approach — the answer to needing any of those is that the change was not review-ready

#### Scenario: PR-14 two entry doors — a bare /apriori opens the Brainstorm stance
- WHEN a human has only a fuzzy idea (no change name yet)
- THEN the scaffolded `/apriori` command with NO arguments enters the Brainstorm stance via P6 (thinking only, nothing durable until the approved exit), the runbook's §0 names the two doors explicitly (fuzzy idea → Brainstorm; stateable change → kickoff prompt), the with-a-name door advances only to the next point where a human has to decide, and `apriori init`'s closing hint presents both doors

#### Scenario: PR-15 abandonment is a legal exit at any point, on the human's word only
- WHEN the human decides mid-change to drop a change (any phase)
- THEN the runbook prescribes: the human's verbatim reason recorded in `gates:`, the change dir archived with flow-state `phase: abandoned`, nothing written to KB or spec store, touched code disposed only as the human directs; the agent may never propose abandonment as an escape from failing reviews; whatever the change already wrote is kept as a recorded decision

#### Scenario: PR-16 legacy-project clarity clauses from the inherited-poll lab
- WHEN an agent runs the protocol on a legacy project or resumes a dead session
- THEN the runbook states: the KB pre-check is part of Ground and usually runs FIRST on a legacy kickoff; the `gates:` label vocabulary is exactly `owner` and `note`; the KB capture prompt declares capture is NOT a defect audit; the state's `## Next` carries at most three actions; R2's transcription mechanism covers the review doc itself; the guarantee-claim discipline warns that chmod-based fault injection silently fails under root (inject via the I/O primitive); and the archive prose names `--changes-dir` for the dir move plus the resumed-session-looks-under-`archive/` sequencing

## ADDED Requirements

### Requirement: the runbook's current-state descriptions match the code and the effective rulings
Wherever the runbook (both editions), the concepts handbook or VISION describes a mechanism that exists in the CLI, the description SHALL match the code's current behaviour and the recorded rulings, and the two runbook editions SHALL carry the same obligations. Specifically: §4's archive sentence SHALL name the readiness predicates the code runs — flow-state legal at `phase: review` with no legacy `review/issues.md` still carrying `open` rows (the one-shot migration), review evidence complete and every family converged, no pending `## Open` item and no standing assumption — as `gate`'s C3/C5/C8/C9, SHALL say that `--force` overrides progress only where the owner's decision is already in `gates:` (an answered `reframe`, a fingerprint-bound `archive-drop`) and that an `archive-force ledger` record forces nothing; it SHALL NOT describe a kept ledger's `open` row or a `blocked` evidence row as an archive predicate. The CN edition SHALL mirror the EN obligations: the kickoff sentence names no requirement-document sign-off, R3 updates the state after every phase change and every review round (no retired step vocabulary), the Reality Check bullet carries the assumption lifecycle once, and the follow-up bullet says creating the change follows the delegation (委托). The EN Specify bullet SHALL attribute "contract only — never source" to the producer's revisions, not to the reviewer. The handbook SHALL describe cross-round review memory as `## Open` stable ids plus the reviewer session and the review-progress record — never a cumulative issue ledger the CLI reads — SHALL name P3's default inputs as contract, diff, `## Open` items and uncovered boundaries, and SHALL list the same archive refusals as §4; VISION's paving table SHALL not present a machine-read issue ledger, a verification matrix or test names carrying ids as current mechanisms. Nothing in this requirement adds or removes an obligation of the agent.

#### Scenario: PR-50 the archive sentence names the predicates the code runs, in both editions
- WHEN §4's delta-grammar-and-archive bullet is read in either language
- THEN it names C3/C5/C8/C9 (never C4), says an `open` row of a legacy `review/issues.md` is the migration refusal, says `--force` covers only an answered `reframe` and a named `archive-drop`, says an `archive-force ledger` record forces nothing, and does not mention a `blocked` evidence row or a kept ledger as a predicate

#### Scenario: PR-51 the two editions carry the same obligations at the four drifted sentences
- WHEN the kickoff sentence, R3, the Reality Check bullet, the Specify bullet and the follow-up bullet are read in both editions
- THEN the CN kickoff names no requirement-document sign-off, CN R3 says every phase change and every review round with no `步` vocabulary, the CN Reality Check bullet states the assumption lifecycle exactly once, the CN follow-up bullet says 委托, and the EN Specify bullet says the producer's revisions touch the contract only — with the reviewer's own source inspection left intact

#### Scenario: PR-52 the handbook and VISION describe the current mechanisms
- WHEN docs/concepts.md, docs/concepts_cn.md, VISION.md and VISION_cn.md are read
- THEN the handbook's cross-round-memory paragraph and tip name `## Open`, the reviewer session and review-progress (no cumulative ledger the CLI reads), P3's default inputs are contract / diff / `## Open` items / uncovered boundaries (no "evidence summary" / "证据摘要"), the archive-refusal list matches §4, the "become rows" sentence says pending items, the producer's revise pass touches the contract (no "design"), and VISION's paving table carries no machine-read issue ledger, verification matrix or test-name row while keeping its historical trigger narrative

## Notes

Why: the §4 archive sentence, one R1 clause of PR-08, three CN sentences and one EN sentence lag behind decisions already taken in code (6.2 ledger retirement, 166af35, c1ed978, c63a466) — see the change's Reality Check for each old text, its basis and the affected checks. No obligation is added or removed; only the description is brought back to what the code and the effective rulings say. P3 is untouched (RIB-10).
