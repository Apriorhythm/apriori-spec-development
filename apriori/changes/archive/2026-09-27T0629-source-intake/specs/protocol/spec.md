<!-- apriori-base: sha256:0dfeb82e139b1c9b6dff1171d8bef821b998c93c3756d751c9f8ffb7773f1292 -->
# Delta — protocol (source-intake)

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

#### Scenario: PR-07 discuss-first is a short stance entered via P6, with no prescribed choreography
- WHEN the runbook describes what to do with an idea not yet stateable as one change
- THEN it offers a Discuss-first stance (a stance, not a tracked phase) entered via P6 in which the agent reads the real codebase, surfaces risks and unknowns and presents candidate approaches with their tradeoffs; nothing durable is written before the human's explicit approval (no code, no spec or design file, no `apriori new`, no flow-state), stated in one plain sentence; a task already stateable as one change starts directly and nobody is talked out of a task they already stated; and no diverge→converge ritual, one-question-per-message rule, coverage checklist or mockup-variant quota survives in either edition or the handbook (retired by 6.2-sub-doc)

#### Scenario: PR-08 the four phases and the five decision points bind in both editions
- WHEN the runbook's flow and hard-rule sections are read in either language
- THEN §4 names exactly the four phases (Ground / Specify / Build & Test / Review & Deliver) with no numbered-step vocabulary, the state's `phase` key carries those four words plus `done` and `abandoned`, and §1 R1 names exactly five things that stop for a human — an escalation, an `## Open` item that cannot be resolved (critical evidence blocked, a pending item), a review family at its round limit (`reframe`), an external side effect, and abandonment — while stating that no consolidation authorization exists

#### Scenario: PR-09 discuss-first ends in two separate approvals and seeds the ONE state
- WHEN a discussion reaches its conclusion
- THEN nothing durable is written before the human approves; saving the conclusion and starting development are two separate approvals whose implication runs one way only (approval to develop carries the write development depends on, approval to save never reaches development); on approval the conclusion lands in the state's `## Reality Check` as the three Ground kinds — `decision` for what they approved, `observed` for what was actually read, `assumption` for what the slice leans on — with open questions as `## Open` items, `apriori new` run only when the change does not already exist, and a save-only approval stops before Ground

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

#### Scenario: PR-14 `/apriori` routes by intent, and the entry positions carry the same meanings
- WHEN a human uses `/apriori` with no arguments, with an explicit ask to discuss, with free text that does not identify a change to work on, or naming a change to work on
- THEN the scaffolded command routes on what the human asked for, not on whether the argument line is empty: work starts or resumes only when the text identifies one change to work on and does not limit the request to discussion, every other input enters Discuss first via P6, mentioning an existing change while discussing grants no development, and the exhaustiveness clause is the template's last routing rule; the runbook's §0, both READMEs and `apriori init`'s closing hint carry the same routing meanings

#### Scenario: PR-15 abandonment is a legal exit at any point, on the human's word only
- WHEN the human decides mid-change to drop a change (any phase)
- THEN the runbook prescribes: the human's verbatim reason recorded in `gates:`, the change dir archived with flow-state `phase: abandoned`, nothing written to KB or spec store, touched code disposed only as the human directs; the agent may never propose abandonment as an escape from failing reviews; whatever the change already wrote is kept as a recorded decision

#### Scenario: PR-16 legacy-project clarity clauses from the inherited-poll lab
- WHEN an agent runs the protocol on a legacy project or resumes a dead session
- THEN the runbook states: the KB pre-check is part of Ground and usually runs FIRST on a legacy kickoff; the `gates:` label vocabulary is exactly `owner` and `note`; the KB capture prompt declares capture is NOT a defect audit; the state's `## Next` carries at most three actions; R2's transcription mechanism covers the review doc itself; the guarantee-claim discipline warns that chmod-based fault injection silently fails under root (inject via the I/O primitive); and the archive prose names `--changes-dir` for the dir move plus the resumed-session-looks-under-`archive/` sequencing

## ADDED Requirements

### Requirement: the contract is checked against its sources, and a discussion held elsewhere is source material
Both runbook editions SHALL carry, in P2's Specify part, a source check before the producer stops: every requirement in the sources being delivered lands somewhere (a scenario, an explicit out-of-scope line, or an `## Open` item); every scenario traces to a source (a requirement section, a prototype, an owner decision); every condition is clear enough to test; and a disagreement between sources is settled by a recorded decision or left open. A choice the sources leave to the producer is recorded as `decision: producer — <choice>`; a user-visible behavior no source settles is the owner's question and becomes an `## Open` item, never the producer's choice; only an unproven fact is an `assumption`. Both editions' Ground SHALL treat a design document, spec draft or prototype produced by a discussion held outside this workflow as source material, registered as `observed` with its path, its version or date and what the owner approved in it (`unknown` when unknown); it becomes a `decision` only as far as the owner approved it, in their words, and draft sections, options not chosen and anything of unknown approval stay material; it authorizes neither `apriori new` nor development by itself, and its own next steps (a plan, an execution skill) are not chained on automatically, while a plan the owner did authorize is not forbidden. Discuss first (both editions) and P6 SHALL let a human who points at such a document ask to save it without re-running the discussion, under the same two approvals and faithfulness rules; the `/apriori-discuss` template, held under its thin-shell limit, points at that rule by section rather than restating it. The `/apriori` template SHALL treat a request to build a design concluded elsewhere, the document pointed at, as identifying the work even without a change name, without moving or weakening its exhaustiveness clause; §0's two-doors paragraph (both editions) SHALL say the same. Evidence: 5.9's C1/C5 requirements were missed by the producer and recovered only by spec-review (ONR-25, ONE-10), C3/C7 user-visible behaviors were set by the producer, and none of 50 real bundles registered an external design document (2026-09-26 diagnosis).

#### Scenario: PR-53 P2 carries the four-question source check in both editions
- WHEN the P2 prompt of `RUNBOOK.md` and `RUNBOOK_cn.md` is read
- THEN its Specify part asks the four questions (requirements landed, scenarios traced, conditions testable, source conflicts settled or open), names `decision: producer` for a choice the sources leave open, sends a user-visible behavior no source settles to `## Open` as the owner's question, and keeps `assumption` for unproven facts; the P3 block of both editions stays byte-identical to its frozen form (RIB-10)

#### Scenario: PR-54 Ground registers a discussion held elsewhere as source material
- WHEN §4 Ground of either edition is read
- THEN it says a design document, spec draft or prototype from a discussion outside this workflow is registered as `observed` with path, version or date and approval scope (`unknown` when unknown), becomes a `decision` only as far as the owner approved it, keeps drafts, unchosen options and unknown-approval content as material, authorizes neither `apriori new` nor development by itself, and does not chain its own next steps automatically while leaving an owner-authorized plan usable

#### Scenario: PR-55 a discussion held elsewhere can be saved from its document
- WHEN Discuss first and P6 of both editions and `templates/discuss.md` are read
- THEN Discuss first and P6 each say that when the human points at a design document from a discussion held elsewhere and asks to save it, the save proceeds from the document without re-running the discussion — the document registered as source material, only approved choices recorded as `decision`, the rest `assumption` or `## Open` — under the same two approvals; and the discuss template's section pointer names saving from a document discussed elsewhere while the shell stays under its thin-shell limit

#### Scenario: PR-56 building a design concluded elsewhere identifies the work
- WHEN `templates/command.md` and §0's two-doors paragraph of both editions are read
- THEN they say a request to build a design concluded elsewhere, the document pointed at, identifies the work even without a change name (the agent names the change and registers the document in Ground as source material), while the template's exhaustiveness clause remains its last routing rule and every earlier routing guard still holds

## Notes

Why: PR-07, PR-09 and PR-14 still described the 6.0 brainstorm ritual and the old two-doors routing that 6.2-sub-doc and the explore-min landing replaced; their tests already assert the current behavior, so only the scenario wording is brought back to it. The ADDED requirement closes two gaps the 2026-09-26 real-project diagnosis found: requirements from the sources missed until review, and discussion products from outside the workflow that never reached the change state (Claude × Astra consensus NI-CONSENSUS §一 A).
