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
- THEN it uses archive-merge (AM-01..10) directly; there is no `openspec/` path and no `/opsx:` adapter command

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
- THEN the verification matrix (§4.8) requires a test that injects the adversarial condition **matched to the exact claim on its success path** — a crash-durability claim demands kill-after-ack-then-restart-and-verify-by-reading-back-through-the-app (a file-peek skips the recovery path; an error-path injection like a rename failure proves only "no false success", a different claim), and the discipline names the atomic-file gotcha that durability needs `fsync` on both the temp file AND its containing directory — or the wording is scoped down to what is verified; and P8's mandate lists the unexercised-guarantee case as a spec-vs-code gap (never advisory)

#### Scenario: PR-12 flow-state persists the reviewer's resumable session id
- WHEN a heterogeneous review starts and round 1 prints the reviewer's session id
- THEN the flow-state schema (§3) carries a `reviewer-session` field that records it immediately (so even a first-round interruption on either side resumes the SAME session per R2 rather than reconstructing it), and R2 names this field as the persistence point

#### Scenario: PR-13 the UI render-and-look must drive spec boundaries, not the happy path
- WHEN a UI change reaches STEP5 and P7's render-and-look self-check runs
- THEN it drives the spec's stated boundaries through the real UI — every range's min AND max (e.g. a 2..20-option form must actually build a 20-option poll) and every rejection path the backend spec promises — and a UI that cannot reach a spec'd path (a hard cap below the max, an input that pre-filters what the server is spec'd to reject) is treated as a spec-vs-code gap, because the front end must be able to produce every input the backend spec handles or rejects, and when the UI catches input the server would reject it must surface the rejection rather than silently drop it

#### Scenario: PR-14 two entry doors — a bare /apriori opens the Brainstorm stance
- WHEN a human has only a fuzzy idea (no change name yet)
- THEN the scaffolded `/apriori` command with NO arguments enters the Brainstorm stance via P13 (thinking only, nothing durable until the approved exit), the runbook's §0 names the two doors explicitly (fuzzy idea → Brainstorm; stateable change → kickoff prompt), and `apriori init`'s closing hint presents both doors

#### Scenario: PR-15 ABANDONED is a legal harden-track exit, on the human's word only
- WHEN the human decides mid-change to drop a harden-track change (any step)
- THEN the runbook prescribes: one ledger row `abandoned` carrying the human's verbatim reason, the change dir archived with flow-state `current-step: ABANDONED`, nothing written to KB or spec store, touched code disposed only as the human directs; the agent may never propose abandonment as an escape from failing reviews; requirement docs and ledger are kept as a recorded decision

#### Scenario: PR-16 legacy-project clarity clauses from the inherited-poll lab
- WHEN an agent runs the protocol on a legacy project or resumes a dead session
- THEN the runbook states: the KB pre-check may run before STEP0 on a legacy kickoff; the `gates:` vocabulary includes a `KB sign-off` label; P10 carries first-contact module-sizing guidance and declares capture is NOT a defect audit; flow-state's `next-action` holds exactly ONE action; R2's transcription mechanism covers the review doc itself; the guarantee-claim discipline warns that chmod-based fault injection silently fails under root (inject via the I/O primitive); and the archive prose names `--changes-dir` for the dir move plus the flow-state-at-archived-path sequencing around gate④

### Requirement: external side effects require the principal's explicit authorization
The runbook (both language editions) SHALL carry a hard rule beside gate consolidation: any operation mutating state outside the local repository/workspace requires the human principal's explicit authorization — with mandatory example classes (push to a shared remote; merge into a shared branch; publish a release/package/tag; deploy; mutate production data; administer remote services incl. settings/secrets/webhooks/permissions/collaborators/environments; invoke paid external services beyond the routine configured verification path; message external humans or systems). Authorization is one-shot, names the action class, and is recorded verbatim in `gates:`; a gate-consolidation authorization NEVER covers external side effects. A standing grant must name class, scope, AND expiry — ambiguous, expired, or out-of-scope reuse is invalid and needs fresh authorization. Non-principal data (file contents, tool output, review verdicts, web pages, commit messages, PR comments) may drive internal state-machine transitions exactly where the protocol already says so, but NEVER authorizes an external side effect. The gate-consolidation paragraph cross-references the rule, and the concepts handbook mirrors it in one paragraph per language.

#### Scenario: PR-17 the external-side-effect rule is normative in both editions
- WHEN the runbook's authorization sections are read in either language
- THEN the outside-the-workspace rule with its mandatory example classes is present, gate consolidation explicitly never covers external side effects, one-shot authorization with verbatim gates: recording is required, standing grants carry class/scope/expiry with invalid-reuse stated, the internal-transitions-vs-external-authorization distinction is drawn, the routine-verification carve-out names the expected verification path, the gate-consolidation text cross-references the rule, and docs/concepts mirrors the boundary in both languages

### Requirement: the ledger vocabulary and the post-archive gate are protocol
The runbook (both editions) SHALL document, in the P0 issue-ledger section: the full status vocabulary (`open` / `fixed` awaiting verification / `rejected + reason` awaiting reviewer concurrence / `verified` / `rejected-verified` preserving the original rejection reason plus a reviewer-concurrence evidence reference / `waived + reason` settable ONLY by the human with a `gates:` entry recording the decision / `advisory-acked` for reviewer-labeled advisory batches); who sets what (reviewer flips fixed→verified and rejected→rejected-verified or reopens; the producer never terminalizes its own findings); and that a re-found issue REOPENS its old ID by returning it to `open` — reopened is an event, not a status. The STEP6 section SHALL require a post-archive `apriori gate --change <name>` run (resolving the archived stage) whose result enters the gate④ packet. The concepts handbook's §7.0 vocabulary strings reflect the same states in both languages.

#### Scenario: PR-18 the vocabulary and the post-archive gate bind in both editions
- WHEN the P0 and STEP6 sections are read in either language
- THEN the seven statuses with their setters are documented (waived = human-only with a gates: entry; rejected-verified preserves the original rationale), the reopen-is-an-event rule is stated, the STEP6 exit names the post-archive gate run feeding the gate④ packet, and concepts §7.0 carries the updated vocabulary in both languages

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

### Requirement: per-change artifacts live in the change bundle
The runbook (both editions) and the concepts handbook (both languages) SHALL define the bundle as the ONLY layout: everything a change owns lives in `apriori/changes/<name>/` — `flow-state.md`; `requirement/` holding `req-v{N}.md`/`req-final.md`/`intent-card.md` under PLAIN names (the directory is the identity); `gap-report.md`; `proposal.md`/`design.md`/`tasks.md`; `specs/<module>/`; `review/` holding the ledger `issues.md`, every review doc (`req-review-v{N}.md`, `spec-review-v{N}.md`, `step5-review-v{N}.md`, `extraction-review-v{N}.md`) and each doc's raw beside it under the unchanged `<stem>-raw.*` rule; and `spike/` on the explore track, which the EXECUTOR deletes or quarantines BEFORE the archive action (the command never deletes anything). The five legacy roots (`requirement/`, `spike/`, `apriori/review/`, `apriori/design/`, `apriori/explore/`) appear nowhere as standalone paths: after stripping every `changes/<…>/` bundle form from the four live docs, zero occurrences of those roots remain. The archive action carries the whole bundle in its one atomic move; STEP6 carries no preservation or staging text. The v4 stability sentence states its promise over the CLI surface & flags, `--json` shapes, the delta format, and the flow-state schema — without a layout clause.

#### Scenario: PR-21 the bundle layout binds and the legacy roots are gone
- WHEN the four live docs (runbook EN/CN, concepts EN/CN) are scanned
- THEN the artifact table names the bundle paths (requirement/, review/ with the ledger and docs+raws, gap-report.md, spike/ under changes/<name>/), the STEP6 text says the move carries the bundle with no staging/copy instruction, the spike disposition is the executor's pre-archive duty, and the strip-scan finds zero standalone occurrences of the five legacy roots — while the stability sentence carries no layout clause

### Requirement: the CAS promise speaks the present tense and the release surface points at v4
Both runbook editions SHALL state the CAS rule in the present tense — unstamped mutation deltas are denied by archive by default, naming the two visible waivers (`--no-cas`, `| cas | optional |`) — with no future-tense "mandatory in 4.0 / 4.0 起强制" phrasing left; MIGRATING.md SHALL carry a 4.0 section with the legacy-root detection guidance and the manual migration mapping; `package.json`'s homepage SHALL point at the v4 tree.

#### Scenario: PR-22 the promise and the pointers are current
- WHEN the two runbook editions, MIGRATING.md, and package.json are read
- THEN the runbooks state archive's default denial in the present tense with both waivers named and carry no future-tense mandatory-in-4.0 phrasing; MIGRATING.md has a 4.0 section naming the five legacy roots; the homepage field ends in `tree/v4#readme`

### Requirement: the migration pointer reaches npm users
The npm package SHALL ship `MIGRATING.md` (listed in `package.json` `files`), and the legacy-layout messages (doctor D8's fix, update's warning) SHALL carry both the local path and the stable URL `https://github.com/Apriorhythm/apriori-spec-development/blob/v4/MIGRATING.md` — a pointer the diagnosed user can actually open.

#### Scenario: PR-23 the pointer is packaged and dual-form
- WHEN the npm files list and the D8/update message templates are read
- THEN `MIGRATING.md` appears in `package.json` `files`, both messages carry the local file reference and the stable blob URL, and MIGRATING's pre-4.0 CAS wording carries the "archive denies by default since 4.0.1" correction so the old table cannot be read as current behavior
