<p align="center">
  Languages:
  <a href="./RUNBOOK.md">English</a> ·
  <a href="./RUNBOOK_cn.md">中文</a>
</p>

# Apriori RUNBOOK — the Executable Protocol for AI Agents

> **Audience: AI agents** (plus §6 for the human operating them). This file is self-contained: everything an agent needs at runtime is here — hard rules, state machine, artifact paths, prompts.
> The **why** — concepts, tool setup, worked example — lives in the human handbook ([README.md](./README.md)); agents do not need it. Where the two disagree on operational detail, **this runbook is canonical**.

---

## 0. Install & Session Start

**Install (human, once per project):**

1. Copy this file into the project, e.g. `docs/apriori/runbook.md`.
2. Add one line to the project's rules file (`CLAUDE.md` / `AGENTS.md` / `.cursor/rules/*.mdc` / `.windsurf/rules` / `.github/copilot-instructions.md`):
   > Development follows `docs/apriori/runbook.md`. At session start, read it and `docs/apriori/changes/<change>/flow-state.md`, then continue from the recorded position.
3. If the project has no OpenSpec yet: `openspec init` (handbook §3.3); `templates/config.yaml` is a ready-made starting `openspec/config.yaml`.
4. Optional (Claude Code): copy `templates/claude-command-apriori.md` to `.claude/commands/apriori.md` to get `/apriori <change>` as a starter.

**Session start (agent, every session):**

1. Read this runbook in full.
2. Read `docs/apriori/changes/<change>/flow-state.md`. If it doesn't exist and you were asked to start a change: size the change (§2), create the state file (§3), then begin at the tier's first step.
3. Continue from `next-action`. The state file is authoritative — never reconstruct progress from memory or guesswork.

**Kickoff prompt (human — copy and fill in):**

```text
Follow the apriori runbook (docs/apriori/runbook.md) for change <change-name>, tier <trivial|medium|large>.
Read the runbook and docs/apriori/changes/<change-name>/flow-state.md first and continue from the recorded position.
Advance ONLY to the next human gate, then stop and report.
```

---

## 1. Hard Rules

**R1 — Stop at every human gate.** The gates are: ① STEP0 verdict at round cap ② gap-report sign-off (Large tier only) ③ STEP3 technical review ④ STEP6 KB-diff approval ⑤ any cap hit or oscillation (a reopened ledger ID). At a gate: update the state file, report — current step, reviewer verdict lines **verbatim**, open/rejected ledger items, the decision you need — then stop. Never approve a gate yourself; never treat "the human hasn't answered" as approval.

**R2 — Reviews must be genuinely external.** The producing session never issues a review verdict. Spawn a heterogeneous reviewer: `codex exec -s read-only "<prompt>"` (rounds 2+: `codex exec resume -c sandbox_mode="read-only" <session-id> "..."` — codex CLIs ≥0.14x reject `-s` on `resume`; older versions use `-s read-only` before the id; non-interactive invocations must close stdin with `< /dev/null` or codex hangs), or — without Codex — a **fresh** `claude` session on a different tier, fed the artifacts plus the issue ledger (P0). Paste the reviewer's verdict line back verbatim. Read-only sandboxes cannot write the ledger: the reviewer ends its output with a ledger delta, the producer lands it verbatim (marked as recorded on the reviewer's behalf) and archives the raw output **in full at `docs/apriori/review/<change>-<stage>-raw.*`** for diffing. If the reviewer dies before its verdict line lands (network/provider failure mid-review), **resume the same session** and have it finish — never fill in the verdict yourself. A read-only reviewer's **dynamic observations are untrustworthy** — test runs, builds, anything needing writes can degrade inside its sandbox and produce phantom findings; only its static reads count, and the producer rejects sandbox-artifact findings with evidence from the real environment. If you cannot actually spawn a reviewer, stop and say so — **do not simulate one**.

**R3 — Everything lands on disk; `/goal` belongs to the human.** Artifacts go to the exact paths in §4's table; the state file is updated after every step and every review round. `/goal` is a command the human runs (§6) — never claim to run it or imitate its evaluator. Loops you drive inside a session still obey the round caps in §4.

---

## 2. Size the Change (once, at kickoff)

| Tier | Typical shape | Steps to run |
|---|---|---|
| **Trivial** | Bugfix / single file; no new user-visible behavior; no shared-state change | Light explore (facts only) → STEP5 with tests + one consistency review (P8; R2 applies as always — raw archived, findings ledgered) → STEP6 writeback if any KB fact changed |
| **Medium** | One module; new user-visible behavior | STEP0 (1–2 rounds) → STEP1 → STEP2 (1–2 rounds) → STEP5 → STEP6; STEP3 shrinks to an async design look-over |
| **Large** | Cross-module / external shared state / data migration / new subsystem | Full STEP0–STEP6, every gate included |

Anything touching external shared state or crossing module boundaries is **Large**, regardless of diff size. When unsure, start one tier lower and escalate on the first surprise; record the tier — and any escalation — in the state file.

---

## 3. The State File

`docs/apriori/changes/<change>/flow-state.md`:

```markdown
change: <change-name>
tier: trivial | medium | large
current-step: STEP0 | STEP1 | STEP2 | STEP3 | STEP4 | STEP5 | STEP6 | DONE
round: 0                # review round / apply turn within the current step
next-action: <one concrete line, e.g. "spawn P1 reviewer on <change>-req-v2.md">
gates:                  # append-only log of human decisions
  - <date> <gate>: <the human's decision, verbatim>
```

Update it immediately after each step and each round; append every gate decision; a new session trusts this file over its own inference.

---

## 4. State Machine

**Artifact paths** (every step writes here — never invent paths):

| Artifact | Path |
|---|---|
| Requirement doc | `docs/apriori/requirement/<change>-req-v{N}.md` → finalized `docs/apriori/requirement/<change>-req-final.md` |
| Requirement review | `docs/apriori/review/<change>-req-review-v{N}.md` |
| Issue ledger | `docs/apriori/review/<change>-issues.md` |
| Gap report | `docs/apriori/explore/<change>-gap-report.md` |
| Spec / design / tasks | `openspec/changes/<change>/specs/`, `…/design.md`, `…/tasks.md` |
| Spec evaluation | `docs/apriori/design/<change>-review-v{N}.md` |
| Technical review record (DESIGN-REVIEW-DOC) | `docs/apriori/design/<change>-design-review.md` |
| Knowledge base (TRUTH-DOC) | `docs/apriori/truth/<module>.md` — `source-commit` stamp required |
| Flow state | `docs/apriori/changes/<change>/flow-state.md` |

### STEP0 — requirement refinement · adversarial loop · cap 5 rounds

- **In:** `docs/apriori/requirement/<change>-req-v{N}.md`; KB if any.
- **Each round:** (1) if a review exists, revise per it → `<change>-req-v{N+1}.md`, noting accept/reject + reason per issue and updating the ledger; (2) spawn the reviewer with **P1** (R2) → review doc + ledger; (3) record the verdict line.
- **Exit:** verdict = "no major issues" → copy to `docs/apriori/requirement/<change>-req-final.md`, advance. Cap hit → **gate ①**.

### KB pre-check — before STEP1, whenever the project already has code

> Greenfield (no module code yet): this check is **N/A** — skip it; never reverse-capture a KB from code that doesn't exist.

- For each touched module: does `docs/apriori/truth/<module>.md` exist? If yes, is it fresh — is `git log --oneline <source-commit>..HEAD -- <module-dir>` empty?
- Fresh → STEP1. Stale → reconcile with **P10** (code is truth), refresh the stamp. Missing → reverse-capture with **P10**; the produced KB doc must be checked by a human or a heterogeneous model **before** anything downstream consumes it.

### STEP1 — explore

- **Do:** produce the gap report by following **P3 directly**. **Out:** the gap report. (Current OpenSpec's `/opsx:explore` is a free-form thinking mode with *no required output* — it does NOT produce the gap report; use it as an optional thinking aid at most.)
- **Exit:** Large tier → **gate ②** (human skims the gap report). Other tiers: fold the report's top risks into your next report and proceed.

### STEP2 — propose · adversarial loop · cap 4 rounds

- **Do:** `/opsx:propose` with **P4**; then loop: reviewer **P5** (R2) → producer revises with **P6** (spec/design only — never source); ledger every round. (OpenSpec's own guidance treats design.md as conditional; this runbook requires it regardless — the runbook wins.)
- **Exit:** verdict = "no major issues, ready to proceed to execution" → advance. Cap hit or oscillation → **gate ⑤**.

### STEP3 — technical review — **gate ③ (human)**

- **Agent's job:** assemble the packet — design doc, spec, ledger with rejections on top — present it, stop. Record the outcome as DESIGN-REVIEW-DOC (`docs/apriori/design/<change>-design-review.md`) and in `gates:`. Major design change → back to STEP2.
- Medium tier: an async look-over replaces the meeting — the outcome still gets recorded. Solo developer: the decision record must still come from outside the producer's context (fresh-session review).

### STEP4 — update docs

- Apply the DESIGN-REVIEW-DOC changes to spec/design; optionally one more P5/P6 round. Skip if STEP3 changed nothing.

### STEP5 — apply · cap 25 turns

- **Do, in order:** (1) one failing test per spec scenario, test names carry scenario IDs — show the failing run; (2) implement in tasks.md order with **P7**, marking `[x]` as you go; (3) run until green; (4) heterogeneous consistency review **P8** (R2); ledger.
- **Exit — ALL of:** tests green; every scenario ID appears in ≥1 test name; tasks.md all `[x]`; consistency verdict = "no spec-vs-code gaps". Design infeasible → back to STEP2; requirement itself wrong → back to STEP0 (both: update the state file and tell the human). Cap hit → **gate ⑤**.

### STEP6 — archive + KB writeback

- **Before P9:** make sure the change's work is **committed** — `source-commit` must reference a real commit containing the implementation (greenfield repos included: commit first, then stamp).
- **Do:** archive with **P9** — autonomous agents use the non-interactive CLI `openspec archive <change> --yes` (the `/opsx:archive` command is an interactive flow); after archiving, fill in the generated `Purpose: TBD` placeholder in the store spec. Then update `docs/apriori/truth/<module>.md`, refresh `source-commit`; list exactly which files/sections changed.
- **Exit:** delta specs merged + KB updated → **gate ④**: the human approves the KB diff (same-repo layout: that's just PR review). Then set `current-step: DONE`.

---

## 5. Prompts

### P0 — issue ledger (every prompt below reads/writes it)

`docs/apriori/review/<change>-issues.md`:

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
* Requirement doc: docs/apriori/requirement/<change>-req-v{N}.md
* System knowledge base (if any): docs/apriori/truth/<module>.md
* Issue ledger (if any): docs/apriori/review/<change>-issues.md
[Review dimensions, give a verdict on each]
1. Is target state B clear and unambiguous
2. Are edge cases and exception paths covered (null, out-of-range, concurrency, timeout, failure rollback)
3. Are there "implied but undeclared" state changes or side effects
4. Is each acceptance criterion testable (expressible as "if … then …")
5. Does it conflict with current state A (if a KB was provided)
[Output]
Produce docs/apriori/review/<change>-req-review-v{N}.md: an issue list by dimension (description / risk / suggested fix).
Mirror every issue into the ledger per its rules. End with a verdict line: "no major issues" or not.
Do not modify the requirement doc itself.
```

### P2 — STEP0 revise (producer)

```text
Revise the requirement doc per docs/apriori/review/<change>-req-review-v{N}.md and output docs/apriori/requirement/<change>-req-v{N+1}.md.
For each issue, state how you handled it (accept/reject + reason), and update its Status in the ledger (fixed / rejected + reason).
```

### P3 — STEP1 explore

```text
# NOTE: current OpenSpec's /opsx:explore is a free-form thinking mode and does NOT produce this artifact — follow this prompt directly
Align all known facts first — do not write code.
[Input]
* Requirement doc: docs/apriori/requirement/<change>-req-final.md
* System knowledge base: docs/apriori/truth/ (module: <module>; new project: note "none")
* Detailed design doc: any existing one, e.g. a previous change round's openspec/changes/<change>/design.md (none: say so)
* Code: this repo
[Output]
docs/apriori/explore/<change>-gap-report.md: current state A, target state B, and the gaps and risks between them.
```

### P4 — STEP2 propose (producer)

```text
/opsx:propose
Based on the aligned facts, write the proposal, all spec docs and the design doc.
* Every user-visible output gets its own scenario with a stable ID (e.g. KV-03) — embed it as the scenario-name prefix (`#### Scenario: KV-03 …`), since OpenSpec's spec format has no separate ID field; never merge visible side-effects;
* Any external shared state (Redis / DB field / global singleton / in-memory cache) must describe three moments: init / runtime update / cleanup-invalidation.
Stop when done and wait for review.
```

### P5 — STEP2 reviewer (heterogeneous, R2)

```text
You are a technical reviewer. Hunt for issues that would cause rework or a production incident.
[Input]
* SPEC-DOC: openspec/changes/<change>/specs/   * DESIGN-DOC: openspec/changes/<change>/design.md
* KB: docs/apriori/truth/   * Requirement doc: docs/apriori/requirement/<change>-req-final.md   * Ledger: docs/apriori/review/<change>-issues.md
[Checklist]
1. Do scenarios cover every visible behavior; any missing failure/edge scenarios
2. Are the three moments of external shared state complete
3. Conflicts with current state A, or broken existing conventions
4. Spec'd but not designed, or designed behavior the spec never declared
5. Security, where the change touches external input or permissions: unvalidated input, missing authz, secrets/PII in logs, injection surfaces
[Output]
docs/apriori/design/<change>-review-v{N}.md: issues (description/risk/suggestion); mirror into the ledger per its rules.
End with a verdict line: "no major issues, ready to proceed to execution" or not.
```

### P6 — STEP2 revise (producer)

```text
A different model reviewed your spec and design: docs/apriori/design/<change>-review-v{N}.md.
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
* For any continue/skip/silently-ignored branch, re-check the spec for required user-visibility — and if the spec requires it, produce that user-visible record; never satisfy only the "exclude the main path" half while dropping the display side.
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
List each inconsistency with a suggested fix; mirror into the ledger.
End with a verdict line: "no spec-vs-code gaps" or not.
```

### P9 — STEP6 archive (producer)

```text
/opsx:archive
Archive this change, then update the knowledge base in lockstep:
* Write this change's new/changed facts to docs/apriori/truth/<module>.md;
* Refresh the doc's source-commit stamp to the current code commit;
List exactly which KB files and sections you updated.
```

### P10 — KB reverse-capture / reconcile (legacy projects)

```text
You are a system knowledge-base engineer. Read the module's code and produce/reconcile its KB doc.
[Input] Code scope: <dirs/files>. Existing KB (if any): docs/apriori/truth/<module>.md
[Task] Treat the code as the sole source of truth. Abstract: public responsibilities/interfaces, core data flow, key state and side effects (the three moments), dependencies, conventions and pitfalls. If a KB exists, flag every mismatched/stale/missing point and revise.
[Output] docs/apriori/truth/<module>.md on the change branch (so the PR diff is where it gets reviewed), with a source-commit stamp of the commit you read.
[Constraints] Only facts present in the code; mark uncertainties "needs human confirmation"; never invent abstract intent.
```

---

## 6. Human Operator Appendix

> Everything in this section is **run by the human**. The agent must never execute or simulate `/goal` (R3). Architecture and caveats: handbook §4.10.

**STEP0 loop:**
```text
/goal "Goal: docs/apriori/requirement/<change>-req-final.md exists and the latest review pass reports 'no major issues'. Cap: 5 rounds.
Each round:
1. If docs/apriori/review/<change>-req-review-v{N}.md exists, revise docs/apriori/requirement/<change>-req-v{N}.md per it, bump to v{N+1}, note accept/reject+reason per issue, and update those issues' Status in docs/apriori/review/<change>-issues.md.
2. Run the reviewer with a DIFFERENT model on the current version and save its output to docs/apriori/review/<change>-req-review-v{N}.md, e.g.:
   codex exec -s read-only \"<the P1 prompt> — target: docs/apriori/requirement/<change>-req-v{N}.md\"
   (no Codex? open a fresh `claude` and hand it P1 plus the issue ledger)
3. Paste the reviewer's final verdict line back into this conversation.
Stop when the verdict is 'no major issues' (then copy to docs/apriori/requirement/<change>-req-final.md) or after 5 rounds."
```

**STEP2 loop:**
```text
/goal "Goal: openspec/changes/<change>/ has SPEC-DOC+DESIGN-DOC and the latest review verdict is 'no major issues, ready to proceed to execution'. Cap: 4 rounds.
Each round:
1. Revise the spec/design files per the latest review — never touch source code — and update the handled issues' Status in docs/apriori/review/<change>-issues.md.
2. Re-run the heterogeneous reviewer with the P5 prompt (round 1: codex exec, note the printed session id; later rounds: codex exec resume -c sandbox_mode=\"read-only\" <session-id>), producing docs/apriori/design/<change>-review-v{N}.md and updating the ledger.
3. Surface the reviewer's verdict line here.
Stop on 'no major issues, ready to proceed to execution' or after 4 rounds."
```

**STEP5 loop:**
```text
/goal "Goal — ALL must hold: `npm test` exits 0; every scenario ID in openspec/changes/<change>/specs/ appears in at least one test name (list any missing IDs); every item in openspec/changes/<change>/tasks.md is [x]; (UI projects only) the Playwright E2E suite passes and screenshot diffs are within threshold; AND a consistency review by a DIFFERENT model (the P8 prompt) reports no spec-vs-code gaps. Cap: 25 turns.
Turn 1: derive one failing test per spec scenario, named with its scenario ID, and SHOW the failing run. Each later turn: implement the next tasks.md item in order, then run `npm test` (and the Playwright run for UI projects) and SHOW the output so the result is in the transcript. When the code is complete, run the consistency reviewer (codex exec / fresh claude) and paste its verdict.
Stop when every condition holds or after 25 turns."
```

**STEP6:**
```text
/goal "Goal: the change is archived (delta specs merged into openspec/specs/) AND the KB file for module <module> reflects this change's new/changed facts with a refreshed source-commit stamp. Cap: 4 turns.
Run /opsx:archive, then update docs/apriori/truth/<module>.md and list exactly which files/sections changed.
Stop when both hold."
```

**Gate checklist (what you personally decide):** ① STEP0 finalization when the cap is hit ② gap-report skim (Large) ③ STEP3 technical review ④ KB-diff approval ⑤ any cap hit / reopened ledger ID — escalation, never quietly lowering the bar.

**Cap tuning:** track *accepted issues per review round* (the ledger gives it to you for free). Round 2 already ~0 → shorten caps; round 5 still finding real ones → fix requirement quality upstream, don't raise the cap.

---

> This runbook distills handbook §4 (workflow), §6 (knowledge base) and §7 (prompts). The handbook explains *why*; this file is *what*. For execution, this file wins.
