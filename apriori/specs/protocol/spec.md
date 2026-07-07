### Requirement: executable specs shrink verification and drop the OpenSpec adapter
The V3 runbook SHALL make scenario-to-test binding a deterministic gate, narrow the heterogeneous consistency review to what binding cannot prove, implement archive natively, and remove the OpenSpec adapter so the interface is single-path plain-files.

#### Scenario: PR-01 STEP5 exit adds a deterministic spec-runner gate
- WHEN a change reaches STEP5 exit
- THEN "spec-runner reports GREEN (every scenario BOUND-GREEN)" is a required exit condition, alongside the existing test/lint conditions

#### Scenario: PR-02 P8 scope narrows to semantic faithfulness
- WHEN the consistency review (P8) runs on a change whose spec-runner is already GREEN
- THEN P8's mandate is narrowed to whether each test faithfully exercises its scenario's intent (binding/coverage is now mechanical, per the v2.2 judge-bias caveat), not re-checking coverage

#### Scenario: PR-03 archive action is native plain-files, no adapter
- WHEN STEP6 archive runs
- THEN it uses archive-merge (AM-01..06) directly; there is no `openspec/` path and no `/opsx:` adapter command

#### Scenario: PR-04 the interface is single-path plain-files
- WHEN any runbook/README section references artifact paths
- THEN it names only the `apriori/` plain-files layout; no `(adapter: openspec/…)` dual-path parentheticals remain (CK-05 enforces this)

#### Scenario: PR-05 the disposable prototype rule still holds
- WHEN an explore-track change archives
- THEN `spike/` is deleted or quarantined and STEP5 is rebuilt from failing tests (unchanged from v2)

#### Scenario: PR-06 a configurable language governs human-facing prose, machine tokens stay English
- WHEN the runbook describes output language
- THEN human-facing prose follows `process-config.md`'s `language` (unset/`auto` → match the human), while machine tokens (verdict lines, scenario IDs, ADDED/MODIFIED/REMOVED, file paths) stay English regardless

#### Scenario: PR-07 the brainstorm stance is a structured diverge→converge→funnel, entered via P13
- WHEN the runbook describes what to do with a still-fuzzy idea
- THEN it offers a **Brainstorm** stance (a stance, not a tracked step; no required output; entered via a P13 kickoff prompt) with three movements: **diverge** — open threads not interrogations, codebase-grounded, ASCII sketches including 2-3 UI-mockup variants for anything user-facing, risks surfaced unprompted; **converge** — exactly one question per message with concrete options, a coverage checklist (purpose, target users, core scenarios, UI shape, data & content, constraints, non-goals, success criteria) where every item is answered or explicitly deferred by the human, mid-conversation additions probed as observed-need vs speculation (cost stated, staged path offered first), human fatigue collapsing the remaining checklist into batch-approved recommended defaults, and 2-3 candidate approaches with tradeoffs before any exit; **funnel** — into STEP0 when the human approves a stateable goal, or the explore-track intent card when it cannot be stated ("no third resting place")

#### Scenario: PR-08 proposal.md is a STEP2 artifact
- WHEN STEP2 (propose / P4) runs
- THEN `proposal.md` (a human-readable why/what/out-of-scope one-pager) is listed in §4's artifact table and produced by P4, and the STEP3 gate packet includes it

#### Scenario: PR-09 brainstorm's exit is human-gated, artifact-free until approval, and carries a requirement seed
- WHEN a brainstorm session runs and approaches its end
- THEN nothing durable is written before the human approves the exit (no code, no requirement/spec/proposal/design files, no `apriori new`, no flow-state), and that protection is stated to the human in one plain-language sentence, never as protocol internals; the agent may only *propose* exiting after presenting the approaches comparison; "stateable" is the human's judgment, never the agent's; and on approval the crystallized understanding is written as the kickoff requirement draft (goal, users, chosen approach, success criteria, constraints, non-goals with the reasons they were cut, open questions) that becomes STEP0's `req-v1` starting material

#### Scenario: PR-10 UI projects render-and-look during implementation; the E2E layer sits above the binding gate
- WHEN a change with a UI reaches STEP5
- THEN P7 instructs the producer to render the built UI and inspect it while implementing (e.g. Playwright screenshots and simulated clicks along core flows), with images going to the gitignored `apriori/tmp/` and only the textual observation persisting; and the verification matrix states that scenario IDs bind to `apriori verify` via unit/component tests (verify speaks TAP, which Playwright does not emit), the Playwright E2E/visual layer being an additional exit condition above the binding gate whose visual checks emit a textual pass/fail, with baseline images belonging to the project's own test suite

#### Scenario: PR-11 a hard guarantee in the spec must be exercised by a fault-injecting test
- WHEN a spec or KB asserts a hard guarantee — crash durability ("a success response means the write is persisted"), atomicity, or an invariant qualified "always" / "under concurrency" / "after restart"
- THEN the verification matrix (§4.8) requires a test that injects the adversarial condition (kill-after-ack, concurrent writers, corrupt/rename-interrupted file) and observes the guarantee hold, or the wording is scoped down to what is verified; and P8's mandate lists the unexercised-guarantee case as a spec-vs-code gap (never advisory)

#### Scenario: PR-12 flow-state persists the reviewer's resumable session id
- WHEN a heterogeneous review starts and round 1 prints the reviewer's session id
- THEN the flow-state schema (§3) carries a `reviewer-session` field that records it immediately (so even a first-round interruption on either side resumes the SAME session per R2 rather than reconstructing it), and R2 names this field as the persistence point
