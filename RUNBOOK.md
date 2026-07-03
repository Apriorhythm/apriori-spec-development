<p align="center">
  Languages:
  <a href="./RUNBOOK.md">English</a> ·
  <a href="./RUNBOOK_cn.md">中文</a>
</p>

# Apriori RUNBOOK — the Executable Protocol for AI Agents

> `runbook-version: 1.1` · upstream: `https://github.com/Apriorhythm/apriori-spec-development`
> Local state lives ONLY in `process-config.md` and the flow-state file — this file is stateless, so **upgrading = overwriting it with the upstream version**.

> **Audience: AI agents** (plus §6 for the human operating them). This file is self-contained: everything an agent needs at runtime is here — hard rules, state machine, artifact paths, prompts.
> The **why** — concepts, tool setup, worked example — lives in the human handbook ([README.md](./README.md)); agents do not need it. Where the two disagree on operational detail, **this runbook is canonical**.

---

## 0. Install & Session Start

**Install (human, once per project):**

1. Copy this file into the project, e.g. `docs/apriori-runbook.md`.
2. Add one line to the project's rules file (`CLAUDE.md` / `AGENTS.md` / `.cursor/rules/*.mdc` / `.github/copilot-instructions.md`):
   > Development follows `docs/apriori-runbook.md`. At session start, read it and `doc/changes/<change>/flow-state.md`, then continue from the recorded position.
3. Copy `templates/process-config.md` to the project root as `process-config.md` — **human-held; the agent treats it as read-only** (R3). Without it, the defaults printed in §4 apply.
4. If the project has no OpenSpec yet: `openspec init` (handbook §3.3); `templates/config.yaml` is a ready-made starting `openspec/config.yaml`. (OpenSpec is optional — see the no-OpenSpec mapping at the end of §4.)
5. Optional (Claude Code): copy `templates/claude-command-apriori.md` to `.claude/commands/apriori.md` to get `/apriori <change>` as a starter.

**Session start (agent, every session):**

1. Read this runbook in full.
2. Read `doc/changes/<change>/flow-state.md`. If it doesn't exist and you were asked to start a change: size the change (§2), create the state file (§3), then begin at the tier's first step.
3. Continue from `next-action`. The state file is authoritative — never reconstruct progress from memory or guesswork.

**Kickoff prompt (human — copy and fill in):**

```text
Follow the apriori runbook (docs/apriori-runbook.md) for change <change-name>, tier <trivial|medium|large>, track <harden|explore> (unsure: harden).
Read the runbook and doc/changes/<change-name>/flow-state.md first and continue from the recorded position.
(If the artifact root is externalized: artifact-root=<path>. Otherwise omit — project root.)
Advance ONLY to the next human gate, then stop and report.
```

> On the **harden** track, this kickoff (or the sign-off of the requirement doc) *is* the human intent acknowledgment — the intent card exists only on the **explore** track (§4). When the artifact root is externalized, the kickoff prompt must state it, because the flow-state file itself lives under it.

---

## 1. Hard Rules

**R1 — Stop at every human gate.** The gates are: ① STEP0 verdict at round cap ② gap-report sign-off (Large tier only) ③ STEP3 technical review ④ STEP6 KB-diff approval ⑤ any cap hit or oscillation (a reopened ledger ID). The explore track (§4) adds three **named decision points** with gate status: `intent-card sign-off`, `extraction review`, `STEP2 full review`. At a gate: update the state file, report — current step, reviewer verdict lines **verbatim**, open/rejected ledger items, the decision you need — then stop. Never approve a gate yourself; never treat "the human hasn't answered" as approval.

**Gate consolidation (explicit authorization).** The default is stop-at-every-gate. A human may explicitly consolidate intermediate gates into a later one (e.g. "run to the final merge review"); the decision must be recorded in `gates:` (scope + how to revoke) and is revocable at any time. Three gates can NEVER be covered by such an authorization: the **shrink decision** (§6), the **KB sign-off** (gate ④), and **`intent-card sign-off`**.

**R2 — Reviews must be genuinely external.** The producing session never issues a review verdict. Spawn a heterogeneous reviewer: `codex exec -s read-only "<prompt>"` (rounds 2+: `codex exec resume -c sandbox_mode="read-only" <session-id> "..."` — codex CLIs ≥0.14x reject `-s` on `resume`; on older versions use `-s read-only` before the session id), or — without Codex — a **fresh** `claude` session on a different tier, fed the artifacts plus the issue ledger (P0). Paste the reviewer's verdict line back verbatim. Reviewers usually run in read-only sandboxes and cannot write the ledger: the reviewer ends its output with a **ledger delta** (new rows + status flips), and the producer lands it verbatim, marked "recorded on behalf of the reviewer"; the reviewer's raw output is archived in full at `doc/review/<change>-<stage>-raw.*` so the recorded delta can always be diffed against its source. If you cannot actually spawn a reviewer, stop and say so — **do not simulate one**.

**R3 — Everything lands on disk; `/goal` belongs to the human; the config belongs to the human too.** Artifacts go to the exact paths in §4's table; the state file is updated after every step and every review round. All round caps are read from the project's `process-config.md` — **human-held; the agent never writes it**; if it is missing, the defaults printed in §4 apply. **Every review stage's cap has a hard floor of 1 per change: a configured value below 1, or an unparsable one, falls back to the default with a warning — no review stage ever goes to zero.** `/goal` is a command the human runs (§6) — never claim to run it or imitate its evaluator. Loops you drive inside a session still obey the caps.

---

## 2. Size the Change (once, at kickoff)

| Tier | Typical shape | Steps to run |
|---|---|---|
| **Trivial** | Bugfix / single file; no new user-visible behavior; no shared-state change | Light explore (facts only) → STEP5 with tests + one consistency review → STEP6 writeback if any KB fact changed |
| **Medium** | One module; new user-visible behavior | STEP0 (1–2 rounds) → STEP1 → STEP2 (1–2 rounds) → STEP5 → STEP6; STEP3 shrinks to an async design look-over |
| **Large** | Cross-module / external shared state / data migration / new subsystem | Full STEP0–STEP6, every gate included |

Anything touching external shared state or crossing module boundaries is **Large**, regardless of diff size. When unsure, start one tier lower and escalate on the first surprise; record the tier — and any escalation — in the state file.

**Second axis — goal certainty** (decided at kickoff; recorded as `track` + `track-rationale` in the state file; reported at the next human gate):

| Situation | Track |
|---|---|
| Goal and acceptance are stateable, even roughly | **harden** — the STEP0 loop refines them |
| Goal clear, technical approach unknown | **harden** — approach uncertainty is design work, not goal uncertainty |
| Neither the goal nor its acceptance can be stated | **explore** (§4's explore track) |
| Exploration reveals the goal is actually clear | switch to **harden** immediately |

**Tripwires outrank the certainty axis**: anything touching external shared state / production data / module boundaries / migrations is barred from the explore track no matter how vague — run it on the harden track, optionally with a **research spike** (the STEP1 variant, §4). Default when unsure: **harden** — the opposite direction from the size axis, because the risks point the opposite way.

---

## 3. The State File

`doc/changes/<change>/flow-state.md`:

```markdown
change: <change-name>
tier: trivial | medium | large
track: harden | explore
track-rationale: <one line: why this track — reported at the next human gate>
current-step: STEP0 | STEP1 | STEP2 | STEP3 | STEP4 | STEP5 | STEP6 |
              INTENT-CARD | SPIKE | EXTRACTION |     # explore-track positions
              DONE | ABANDONED
round: 0                # review round / apply turn within the current step
next-action: <one concrete line, e.g. "spawn P1 reviewer on req-v2.md">
artifact-root: .        # optional; default = project root (v1.0 paths unchanged verbatim).
                        # Applies ONLY to process artifacts: requirement/, doc/review/,
                        # doc/explore/, doc/changes/. NEVER to docs/truth/ (same-repo
                        # atomicity) or openspec/ (tool-owned). When externalized, the
                        # kickoff prompt must state it — this file itself lives under it.
gates:                  # append-only log of human decisions
  - <date> <gate>: <the human's decision, verbatim>
```

Update it immediately after each step and each round; append every gate decision; a new session trusts this file over its own inference.

---

## 4. State Machine

**Artifact paths** (every step writes here — never invent paths):

| Artifact | Path |
|---|---|
| Requirement doc | `requirement/req-v{N}.md` → finalized `requirement/req-final.md` |
| Requirement review | `doc/review/<change>-req-review-v{N}.md` |
| Issue ledger | `doc/review/<change>-issues.md` |
| Gap report | `doc/explore/<change>-gap-report.md` |
| Spec / design / tasks | `openspec/changes/<change>/specs/`, `…/design.md`, `…/tasks.md` |
| Spec evaluation | `doc/design/<change>-review-v{N}.md` |
| Knowledge base (TRUTH-DOC) | `docs/truth/<module>.md` — `source-commit` stamp required (covers the Contract section only, §5 P9/P10) |
| Flow state | `doc/changes/<change>/flow-state.md` |
| Intent card (explore track) | `requirement/intent-card.md` |
| Extraction review (explore track) | `doc/review/<change>-extraction-review-v{N}.md` |
| Prototype (explore track) | `spike/` — deleted or quarantined at archive; never referenced by tasks.md |
| Reviewer raw output | `doc/review/<change>-<stage>-raw.*` |

### STEP0 — requirement refinement · adversarial loop · cap: `step0-cap` (default 5)

- **In:** `requirement/req-v{N}.md`; KB if any.
- **Each round:** (1) if a review exists, revise per it → `req-v{N+1}.md`, noting accept/reject + reason per issue and updating the ledger; (2) spawn the reviewer with **P1** (R2) → review doc + ledger; (3) record the verdict line.
- **Exit:** verdict = "no major issues" → copy to `requirement/req-final.md`, advance. Cap hit → **gate ①**. Goal turns out unstateable → propose harden→explore (a human gate confirms the switch).

### EXPLORE track — when §2 routes the change here

0. **Intent card first (non-waivable):** ≤15 lines at `requirement/intent-card.md` — goal hypothesis / success criteria / the questions the spike must answer. Requires **human sign-off** (`intent-card sign-off`; a heterogeneous review may inform it, but cannot replace it). On this track the intent card is the independent review baseline — the extracted spec is never judged against the prototype alone.
1. **Spike (bounded):** prototype freely under `spike/`; cap: `spike-cap` (default 10) turns; exit = every intent-card question answered. Cap hit → **gate ⑤**.
2. **P11 — spec extraction:** inputs = intent card + prototype + spike findings; outputs = `requirement/req-final.md` + spec drafts (OpenSpec projects: `openspec/changes/<change>/specs/`; without OpenSpec: `doc/changes/<change>/specs/`).
3. **P12 — extraction review (heterogeneous, R2):** cap: `extraction-review-cap` (default 2). Verdict `extraction accepted` → step 4. `extraction rejected` + unfaithful extraction → redo P11; `extraction rejected` + intent hypothesis falsified → back to SPIKE, or `ABANDONED` (archive the intent card + findings; log in the ledger).
4. **Merge:** enter STEP2's full P5/P6 loop — from here the tracks are identical.
5. **The prototype is disposable, machine-checkably:** STEP5 rebuilds from failing tests; tasks.md must not reference `spike/`; `spike/` is deleted (or quarantined) at archive.
6. **Track transitions:** explore→harden (extraction accepted, or the goal turns out clear); harden→explore (STEP0 finds the goal unstateable — via a human gate); explore→ABANDONED (hypothesis falsified). Each transition keeps the intent card, findings and ledger; only `spike/` is dropped.

### KB pre-check — before STEP1, whenever the project already has code

KB docs have two sections with **opposite truth directions** (§5 P9/P10): `Contract (code-is-truth)` and `Decisions (doc-is-truth)`.

- **Contract section:** does `docs/truth/<module>.md` have one, and is it fresh — is `git log --oneline <source-commit>..HEAD -- <module-dir>` empty? (`source-commit` covers the Contract section only.) Fresh → STEP1. Stale → reconcile the Contract section with **P10** (there, code is truth), refresh the stamp. Missing → reverse-capture with **P10**; the produced doc must be checked by a human or a heterogeneous model **before** anything downstream consumes it.
- **Decisions section:** never reconciled from code. If code violates an `active` invariant recorded there, that is a **bug to report, not a doc to update**; a decision expires only when a newer decision supersedes it (`superseded-by: <id>`).

### STEP1 — explore

- **Do:** `/opsx:explore` with **P3**. **Out:** the gap report.
- **Research-spike variant** (vague-but-tripwired changes, §2): probe code is allowed under `spike/` — the explore track's full isolation rules apply — capped by `spike-cap` (default 10); findings land as a "research conclusions" appendix to the gap report. P3 carries the matching variant clause.
- **Exit:** Large tier → **gate ②** (human skims the gap report). Other tiers: fold the report's top risks into your next report and proceed.

### STEP2 — propose · adversarial loop · cap: `step2-cap` (default 4)

- **Do:** `/opsx:propose` with **P4**; then loop: reviewer **P5** (R2) → producer revises with **P6** (spec/design only — never source); ledger every round.
- **Exit:** verdict = "no major issues, ready to proceed to execution" → advance. Cap hit or oscillation → **gate ⑤**.

### STEP3 — technical review — **gate ③ (human)**

- **Agent's job:** assemble the packet — design doc, spec, ledger with rejections on top — present it, stop. Record the outcome as DESIGN-REVIEW-DOC and in `gates:`. Major design change → back to STEP2.
- Medium tier: an async look-over replaces the meeting — the outcome still gets recorded. Solo developer: the decision record must still come from outside the producer's context (fresh-session review).

### STEP4 — update docs

- Apply the DESIGN-REVIEW-DOC changes to spec/design; optionally one more P5/P6 round. Skip if STEP3 changed nothing.

### STEP5 — apply · cap: `step5-cap` (default 25)

- **Do, in order:** (1) one failing test per spec scenario, test names carry scenario IDs — show the failing run; (2) implement in tasks.md order with **P7**, marking `[x]` as you go; (3) run until green; (4) heterogeneous consistency review **P8** (R2); ledger.
- **Verification matrix by project type:** backend/library — unit + property tests, mutation spot-checks; UI — plus E2E/visual regression; deployed service — plus runtime contracts, canary + rollback; **docs-only project — `python3 scripts/check_docs.py` green + example-command static checks + the P8 consistency review replace `npm test` as the exit condition.** Where an executable instrument doesn't exist for the project type, the LLM review is the primary instrument there — that is not a downgrade.
- **Exit — ALL of:** tests green (per the matrix above); every scenario ID appears in ≥1 test name (docs-only: the checker's structural checks stand in); tasks.md all `[x]`; consistency verdict = "no spec-vs-code gaps". Design infeasible → back to STEP2; requirement itself wrong → back to STEP0 (both: update the state file and tell the human). Cap hit → **gate ⑤**.

### STEP6 — archive + KB writeback

- **Do:** `/opsx:archive` with **P9**; update `docs/truth/<module>.md` (Contract section from the final implementation + refreshed `source-commit`; Decisions section appends this change's new decisions/invariants); list exactly which files/sections changed. Explore-track changes: delete or quarantine `spike/` here.
- **Exit:** delta specs merged + KB updated → **gate ④**: the human approves the KB diff (same-repo layout: that's just PR review). Then set `current-step: DONE`.

**Without OpenSpec** (any project type): `/opsx:explore` → author the gap report directly per P3; `/opsx:propose` → author spec/design docs directly (P4's requirements still bind), spec drafts under `doc/changes/<change>/specs/`; `/opsx:archive` → merge specs into the project's agreed spec directory. Installing OpenSpec is not required.

---

## 5. Prompts

### P0 — issue ledger (every prompt below reads/writes it)

`doc/review/<change>-issues.md`:

```markdown
| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-3 | `ttlMs<=0` behavior undefined | med | 1 | fixed (v2) |
| SPEC-1 | cleanup moment missing for the in-memory map | high | 1 | verified |
| SPEC-2 | rename `del` to `delete` | low | 2 | rejected — cosmetic, out of scope |
```

- **Reviewer**: appends new rows; flips `fixed → verified` after confirming a fix landed; a re-found issue **reopens its old ID** — never a new row.
- **Producer**: flips `open → fixed` or `open → rejected`; a rejection MUST carry a reason — human gates read rejections first.

### P1 — STEP0 reviewer (heterogeneous, R2)

```text
You are a senior requirements reviewer. Review the requirement doc; the goal is to make it precise enough to hand straight to an AI for implementation.
[Input]
* Requirement doc: requirement/req-v{N}.md
* System knowledge base (if any): docs/truth/<module>.md
* Issue ledger (if any): doc/review/<change>-issues.md
[Review dimensions, give a verdict on each]
1. Is target state B clear and unambiguous
2. Are edge cases and exception paths covered (null, out-of-range, concurrency, timeout, failure rollback)
3. Are there "implied but undeclared" state changes or side effects
4. Is each acceptance criterion testable (expressible as "if … then …")
5. Does it conflict with current state A (if a KB was provided)
[Output]
Produce doc/review/<change>-req-review-v{N}.md: an issue list by dimension (description / risk / suggested fix).
Mirror every issue into the ledger per its rules. End with a verdict line: "no major issues" or not.
Do not modify the requirement doc itself.
```

### P2 — STEP0 revise (producer)

```text
Revise the requirement doc per doc/review/<change>-req-review-v{N}.md and output requirement/req-v{N+1}.md.
For each issue, state how you handled it (accept/reject + reason), and update its Status in the ledger (fixed / rejected + reason).
```

### P3 — STEP1 explore

```text
/opsx:explore
Align all known facts first — do not write code.
[Input]
* Requirement doc: requirement/req-final.md
* System knowledge base: docs/truth/ (module: <module>; new project: note "none")
* Detailed design doc: design.md (if any)
* Code: this repo
[Output]
doc/explore/<change>-gap-report.md: current state A, target state B, and the gaps and risks between them.
[Research-spike variant — ONLY for vague-but-tripwired changes routed here by §2]
Probe code is allowed under spike/ (explore-track isolation rules apply), capped by spike-cap;
findings land as a "research conclusions" appendix of the gap report. Otherwise: do not write code.
```

### P4 — STEP2 propose (producer)

```text
/opsx:propose
Based on the aligned facts, write the proposal, all spec docs and the design doc.
* Every user-visible output gets its own scenario with a stable ID (e.g. KV-03); never merge visible side-effects;
* Any external shared state (Redis / DB field / global singleton / in-memory cache) must describe three moments: init / runtime update / cleanup-invalidation.
Stop when done and wait for review.
```

### P5 — STEP2 reviewer (heterogeneous, R2)

```text
You are a technical reviewer. Hunt for issues that would cause rework or a production incident.
[Input]
* SPEC-DOC: openspec/changes/<change>/specs/   * DESIGN-DOC: openspec/changes/<change>/design.md
* KB: docs/truth/   * Requirement doc: requirement/req-final.md   * Ledger: doc/review/<change>-issues.md
[Checklist]
1. Do scenarios cover every visible behavior; any missing failure/edge scenarios
2. Are the three moments of external shared state complete
3. Conflicts with current state A, or broken existing conventions
4. Spec'd but not designed, or designed behavior the spec never declared
5. Security, where the change touches external input or permissions: unvalidated input, missing authz, secrets/PII in logs, injection surfaces
[Output]
doc/design/<change>-review-v{N}.md: issues (description/risk/suggestion); mirror into the ledger per its rules.
End with a verdict line: "no major issues, ready to proceed to execution" or not.
```

### P6 — STEP2 revise (producer)

```text
A different model reviewed your spec and design: doc/design/<change>-review-v{N}.md.
Handle each item (accept/reject + reason), modifying spec and design files only — never source.
Update each issue's Status in the ledger, then request review round v{N+1}.
```

### P7 — STEP5 apply (producer)

```text
/opsx:apply
Tests first: derive one failing test per spec scenario, named with its scenario ID (e.g. test('KV-03 …')), and show the failing run.
Then implement strictly in tasks.md order; mark each task [x] immediately on completion.
* Scenario coverage is the hard bar: every scenario has ≥1 test carrying its ID. Line coverage is a signal, never a target — no assertion-free padding;
* Log at key branches and function entries per the project convention;
* For any continue/skip/silently-ignored branch, re-check the spec for required user-visibility.
(Docs-only projects: the "test suite" is `python3 scripts/check_docs.py` + example-command static checks — same failing-first discipline where feasible.)
Run the tests until green; stop and wait for archive.
```

### P8 — STEP5 consistency reviewer (heterogeneous, R2)

```text
Review the implementation against the SPEC-DOC:
1. Mechanical first: list every scenario ID that appears in no test name;
2. Behavior the spec requires but the code doesn't implement;
3. continue/skip/silently-ignored branches — does the spec require them to be user-visible;
4. Do the tests assert real outcomes (not merely "it runs");
5. Where external input or permissions are touched: unvalidated input, missing authz, secrets/PII in logs.
List each inconsistency with a suggested fix; end with your ledger delta (P0 rules).
(Docs-only projects: item 1's mechanical check = the checker script's output; read "tests" as the doc checks.)
End with a verdict line: "no spec-vs-code gaps" or not.
```

### P9 — STEP6 archive (producer)

```text
/opsx:archive
Archive this change, then update the knowledge base in lockstep. KB docs have two sections with opposite truth directions:
* "## Contract (code-is-truth)": update it from the final implementation; refresh the source-commit stamp (it covers this section only);
* "## Decisions (doc-is-truth)": append decisions/invariants/rejected alternatives made in this change, each with status (active / superseded-by: <id>). NEVER rewrite an active invariant to match code — if the code violates one, file a bug instead;
List exactly which KB files and sections you updated.
```

### P10 — KB reverse-capture / reconcile (legacy projects)

```text
You are a system knowledge-base engineer. Read the module's code and produce/reconcile its KB doc.
[Input] Code scope: <dirs/files>. Existing KB (if any): docs/truth/<module>.md
[Task] Abstract: public responsibilities/interfaces, core data flow, key state and side effects (the three moments), dependencies, conventions and pitfalls. If a KB exists, flag every mismatched/stale/missing point and revise — per the section rules below.
[Output] docs/truth/<module>.md on the change branch (so the PR diff is where it gets reviewed), structured as two fixed sections with opposite truth directions:
* "## Contract (code-is-truth)" — interfaces, three moments, code-derived pitfalls; here code IS the sole source of truth: reconcile from it and stamp with the source-commit you read (the stamp covers this section only);
* "## Decisions (doc-is-truth)" — decisions, invariants, rejected alternatives, each with status (active / superseded-by: <id>); NEVER reconcile this section from code — where code contradicts an active invariant, flag it as a bug in your output instead of editing the entry.
[Constraints] Contract: only facts present in the code. Decisions: only explicitly confirmed intent. Mark uncertainties "needs human confirmation"; never invent abstract intent.
```

### P11 — explore track: spec extraction (producer)

```text
[Input] requirement/intent-card.md; the prototype under spike/; the spike findings.
[Task] Extract the specification implied by the prototype's *validated* behaviors — never invent behavior that neither the intent card nor an observed spike run supports. Produce:
* requirement/req-final.md — goal + acceptance criteria, each traceable to the intent card;
* spec drafts with scenario IDs (OpenSpec projects: openspec/changes/<change>/specs/; without OpenSpec: doc/changes/<change>/specs/).
[Constraints] Mark unvalidated assumptions "needs confirmation". The prototype is a source of observations, not of authority: where intent and prototype disagree, the intent card wins and the disagreement is listed explicitly.
Stop and wait for the extraction review (P12).
```

### P12 — explore track: extraction review (heterogeneous, R2)

```text
[Input] requirement/intent-card.md; P11's outputs; the issue ledger.
[Checklist] P1's five dimensions, plus:
6. Intent-card conformance — every goal and success criterion appears in the extracted spec;
7. No invention — every spec line traces to the intent card or an observed spike behavior (spot-check the tracing).
[Output] doc/review/<change>-extraction-review-v{N}.md — issues per P0; end with your ledger delta,
then exactly one verdict line: "extraction accepted" or "extraction rejected".
Cap: extraction-review-cap (default 2). Rejected + unfaithful extraction → producer redoes P11;
rejected + intent hypothesis falsified → back to SPIKE or ABANDONED (the state machine's failure branches).
```

---

## 6. Human Operator Appendix

> Everything in this section is **run by the human**. The agent must never execute or simulate `/goal` (R3). Architecture and caveats: handbook §4.10.
> All caps in the recipes below are **defaults** — `process-config.md` overrides them (floor: 1 per review stage).

**STEP0 loop:**
```text
/goal "Goal: requirement/req-final.md exists and the latest review pass reports 'no major issues'. Cap: step0-cap rounds (default 5).
Each round:
1. If doc/review/<change>-req-review-v{N}.md exists, revise requirement/req-v{N}.md per it, bump to v{N+1}, note accept/reject+reason per issue, and update those issues' Status in doc/review/<change>-issues.md.
2. Run the reviewer with a DIFFERENT model on the current version and save its output to doc/review/<change>-req-review-v{N}.md, e.g.:
   codex exec -s read-only \"<the P1 prompt> — target: requirement/req-v{N}.md\"
   (no Codex? open a fresh `claude` and hand it P1 plus the issue ledger)
3. Paste the reviewer's final verdict line back into this conversation.
Stop when the verdict is 'no major issues' (then copy to requirement/req-final.md) or at the cap."
```

**STEP2 loop:**
```text
/goal "Goal: openspec/changes/<change>/ has SPEC-DOC+DESIGN-DOC and the latest review verdict is 'no major issues, ready to proceed to execution'. Cap: step2-cap rounds (default 4).
Each round:
1. Revise the spec/design files per the latest review — never touch source code — and update the handled issues' Status in doc/review/<change>-issues.md.
2. Re-run the heterogeneous reviewer with the P5 prompt (round 1: codex exec, note the printed session id; later rounds: codex exec resume -c sandbox_mode=\"read-only\" <session-id> — codex ≥0.14x rejects -s on resume; older CLIs: -s read-only before the id), producing doc/design/<change>-review-v{N}.md and updating the ledger.
3. Surface the reviewer's verdict line here.
Stop on 'no major issues, ready to proceed to execution' or at the cap."
```

**STEP5 loop:**
```text
/goal "Goal — ALL must hold: `npm test` exits 0; every scenario ID in openspec/changes/<change>/specs/ appears in at least one test name (list any missing IDs); every item in openspec/changes/<change>/tasks.md is [x]; (UI projects only) the Playwright E2E suite passes and screenshot diffs are within threshold; AND a consistency review by a DIFFERENT model (the P8 prompt) reports no spec-vs-code gaps. Cap: step5-cap turns (default 25).
Turn 1: derive one failing test per spec scenario, named with its scenario ID, and SHOW the failing run. Each later turn: implement the next tasks.md item in order, then run `npm test` (and the Playwright run for UI projects) and SHOW the output so the result is in the transcript. When the code is complete, run the consistency reviewer (codex exec / fresh claude) and paste its verdict.
Stop when every condition holds or at the cap."
```
> Docs-only projects: replace `npm test` with `python3 scripts/check_docs.py`, drop the Playwright clause, keep the consistency review.

**STEP6:**
```text
/goal "Goal: the change is archived (delta specs merged into openspec/specs/) AND the KB file for module <module> reflects this change's new/changed facts with a refreshed source-commit stamp. Cap: step6-cap turns (default 4).
Run /opsx:archive, then update docs/truth/<module>.md and list exactly which files/sections changed.
Stop when both hold."
```

**Gate checklist (what you personally decide):** ① STEP0 finalization when the cap is hit ② gap-report skim (Large) ③ STEP3 technical review ④ KB-diff approval ⑤ any cap hit / reopened ledger ID — escalation, never quietly lowering the bar. Explore track adds: `intent-card sign-off` and the `extraction review` outcome. Gate consolidation (§1) is yours to grant — but never over the shrink decision, the KB sign-off, or `intent-card sign-off`.

**Shrink governance (the metabolism rule).** Every N changes (default 5, `shrink-proposal-freq`) the agent **reports — never applies** — a shrink/expand proposal whose data pack MUST contain: verified count, rejected count (with sampled reasons), reopened-ID count. Shrinking a review stage is a **human gate decision**, blocked outright when the rejected ratio exceeds `rejected-ratio-guard` (default 50%) or the change class is tripwired (shared state / migration / security / production data). Shrinking means lowering a stage's round cap — **floor 1; no stage ever reaches zero**. Post-merge re-review (sampling rate `post-merge-review-freq`, default 1 in 5 merged changes) finding ≥1 high-risk miss → restore the stage's previous cap, logged the same way. Beware both directions: producers can zero the metric by rejecting findings (that's what the rejected-ratio guard is for); reviewers can inflate it by careless verifies (which merely delays shrinking).

---

> This runbook distills handbook §4 (workflow), §6 (knowledge base) and §7 (prompts). The handbook explains *why*; this file is *what*. For execution, this file wins.
