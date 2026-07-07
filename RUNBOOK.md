<p align="center">
  Languages:
  <a href="./RUNBOOK.md">English</a> ·
  <a href="./RUNBOOK_cn.md">中文</a>
</p>

# Apriori RUNBOOK — the Executable Protocol for AI Agents

> `runbook-version: 3.0` · upstream: `https://github.com/Apriorhythm/apriori-spec-development`
> Local state lives ONLY in `apriori/process-config.md` and the flow-state file — this file is stateless, so **upgrading = overwriting it with the upstream version**.

> **Audience: AI agents** (plus §6 for the human operating them). This file is self-contained: everything an agent needs at runtime is here — hard rules, state machine, artifact paths, prompts.
> The **why** — concepts, tool setup, worked example — lives in the human handbook ([README.md](./README.md)); agents do not need it. Where the two disagree on operational detail, **this runbook is canonical**.

---

## 0. Install & Session Start

**Install (human, once per project):**

```shell
npm i -g apriori-cli     # or run any command below via `npx apriori-cli …`
cd your-project && apriori init  # interactive: pick the AI tools to configure
```

`apriori init` scaffolds the single `apriori/` root (this runbook at `apriori/runbook.md`, `apriori/process-config.md`, and the `specs/ changes/ review/ truth/` working dirs) and writes a thin pointer to the runbook in each selected tool's native location — `CLAUDE.md` + `.claude/commands/apriori.md`, `AGENTS.md` (Codex/OpenCode), `.cursor/rules/apriori.mdc`, `.github/copilot-instructions.md`, `.windsurf/…`. The protocol lives once; tools just point at it. It is additive and never overwrites; re-run it any time to add a tool.

`apriori/process-config.md` is **human-held; the agent treats it as read-only** (R3). Without it, the defaults printed in §4 apply. The three deterministic gates run as CLI commands: `apriori verify` (STEP5), `apriori archive` (STEP6), `apriori check` (CI) — all zero-dependency Node, detailed in §4/§6.

**Language.** Human-facing prose — requirement docs, spec scenario descriptions, gap/design/review docs, ledger descriptions, `flow-state` notes, and every message to the human — uses the `language` field in `apriori/process-config.md`. If it is unset or `auto`, **match the language the human is using** (their kickoff and messages). Machine tokens are ALWAYS English, whatever the language: verdict lines (§5 phrase table), scenario IDs (`KV-03`), the delta keywords `ADDED`/`MODIFIED`/`REMOVED`, file paths, and this runbook. So a Chinese kickoff yields Chinese artifacts with English IDs and verdict lines — `apriori verify`/`check` keep working unchanged.

**Session start (agent, every session):**

1. Kickoff session: read this runbook in full. Resume session: read at least the minimal set listed in the **Context economy** block below.
2. Read `apriori/changes/<change>/flow-state.md`. If it doesn't exist and you were asked to start a change: size the change (§2), create the state file (§3), then begin at the tier's first step.
3. Continue from `next-action`. The state file is authoritative — never reconstruct progress from memory or guesswork.

**Kickoff prompt (human — copy and fill in):**

```text
Follow the apriori runbook (apriori/runbook.md) for change <change-name>, tier <trivial|medium|large>, track <harden|explore> (unsure: harden).
Read the runbook and apriori/changes/<change-name>/flow-state.md first and continue from the recorded position.
(If the artifact root is externalized: artifact-root=<path>. Otherwise omit — project root.)
Advance ONLY to the next human gate, then stop and report.
```

> On the **harden** track, this kickoff (or the sign-off of the requirement doc) *is* the human intent acknowledgment — the intent card exists only on the **explore** track (§4). When the artifact root is externalized, the kickoff prompt must state it, because the flow-state file itself lives under it.

**Context economy.** The context window is the agent's scarcest resource — performance degrades as it fills, so manage it deliberately:

- **Session hygiene:** on Medium+ changes, each STEP may run in a fresh session — the state file (§3) guarantees lossless resume, so accumulating one giant session is a cost, not a safety feature.
- **Resume minimal set** (the single source of this list — §0's session-start rule references it): §1 hard rules; §3 state-file rules; §5's P0 ledger rules; the prompt(s) of the step `flow-state` points at; and that step's §4 state-machine entry (including its exit conditions; for STEP6, the archive algorithm).
- **Just-in-time knowledge:** load KB docs per touched module (P3 already scopes this way) — never preload the whole store.

---

## 1. Hard Rules

**R1 — Stop at every human gate.** The gates are: ① STEP0 verdict at round cap ② gap-report sign-off (Large tier only) ③ STEP3 technical review ④ STEP6 KB-diff approval ⑤ any cap hit or oscillation (a reopened ledger ID). The explore track (§4) adds three **named decision points** with gate status: `intent-card sign-off`, `extraction review`, `STEP2 full review`. At a gate: update the state file, report — current step, reviewer verdict lines **verbatim**, open/rejected ledger items, the decision you need — then stop. Never approve a gate yourself; never treat "the human hasn't answered" as approval.

**Gate consolidation (explicit authorization).** The default is stop-at-every-gate. A human may explicitly consolidate intermediate gates into a later one (e.g. "run to the final merge review"); the decision must be recorded in `gates:` (scope + how to revoke) and is revocable at any time. Three gates can NEVER be covered by such an authorization: the **shrink decision** (§6), the **KB sign-off** (gate ④), and **`intent-card sign-off`**.

> The protection forbids *silent coverage by a blanket authorization* — not the owner's explicit choice. A protected gate may still be decided by **explicit proxy**, under all of the following: ① the agent first presents the pending gate — **each protected gate itemized independently** (numbered, what is being approved, artifact path, the decision options) — never bundled into a progress question; ② the human's delegating reply comes *after* that presentation and is recorded **verbatim** in `gates:`, one entry per gate; ③ the proxy is **one-shot** — it covers exactly the gates itemized in that presentation and never inherits to future gates of the same kind. A reply may cover several protected gates only if each was itemized; a pre-existing blanket authorization never qualifies. An itemized *multi-step end-to-end run* does **not** implicitly cover protected gates nested inside it: when an un-itemized protected gate surfaces mid-run, stop and present it — the interruption itself is logged in `gates:`; gates that were itemized up front are unaffected.

**R2 — Reviews must be genuinely external.** The producing session never issues a review verdict. Spawn a heterogeneous reviewer: `codex exec -s read-only "<prompt>"` (rounds 2+: `codex exec resume -c sandbox_mode="read-only" <session-id> "..."` — codex CLIs ≥0.14x reject `-s` on `resume`; on older versions use `-s read-only` before the session id), or — without Codex — a **fresh** `claude` session on a different tier, fed the artifacts plus the issue ledger (P0). Paste the reviewer's verdict line back verbatim. Reviewers usually run in read-only sandboxes and cannot write the ledger: the reviewer ends its output with a **ledger delta** (new rows + status flips), and the producer lands it verbatim, marked "recorded on behalf of the reviewer"; the reviewer's raw output is archived in full at `apriori/review/<change>-<stage>-raw.*` so the recorded delta can always be diffed against its source. When invoking codex non-interactively (background/scripted), close stdin — append `< /dev/null` — or it prints "Reading additional input from stdin..." and hangs. If you cannot actually spawn a reviewer, stop and say so — **do not simulate one**.

**R3 — Everything lands on disk; `/goal` belongs to the human; the config belongs to the human too.** Artifacts go to the exact paths in §4's table; the state file is updated after every step and every review round. All round caps are read from the project's `process-config.md` — **human-held; the agent never writes it**; if it is missing, the defaults printed in §4 apply. **Every review stage's cap has a hard floor of 1 per change: a configured value below 1, or an unparsable one, falls back to the default with a warning — no review stage ever goes to zero.** `/goal` is a command the human runs (§6) — never claim to run it or imitate its evaluator. Loops you drive inside a session still obey the caps.

**Enforcement layers** (examples, not exhaustive; the deterministic items below are *available to configure*, not active by default in this repo). Advisory text gets ignored under pressure — classify each rule by how it can be enforced: ① **deterministically enforceable now** — `process-config.md` read-only (a hook blocking agent writes), `apriori check` as a required pre-commit/CI check, `apriori verify` as the STEP5 binding gate, and the **verdict-evidence check**: every verdict line must have a matching raw archive file (`apriori/review/<change>-<stage>-raw.*`) — a mechanical backstop against simulated reviews; ② **gate-level** — Stop hooks and `/goal` conditions; ③ **inherently advisory** — a reviewer's independent judgment quality, semantic adherence to the P prompts. Reference implementation is Claude Code hooks; any CI can enforce the same checks. Example (a PreToolUse hook blocking config writes — illustrative sketch; exact schema in the Claude Code hooks docs):

```text
# pseudo-config: PreToolUse matcher on Write|Edit runs a guard command;
# the command exits non-zero when the target is process-config.md, denying the call
```

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

`apriori/changes/<change>/flow-state.md`:

```markdown
change: <change-name>
tier: trivial | medium | large
track: harden | explore
track-rationale: <one line: why this track — reported at the next human gate>
lineage: <target branch/line + its merge taboo, e.g. "v2 (never merge to main)">
                        # copied from the requirement at kickoff; a lineage
                        # conflict discovered mid-change is an immediate stop
current-step: STEP0 | STEP1 | STEP2 | STEP3 | STEP4 | STEP5 | STEP6 |
              INTENT-CARD | SPIKE | EXTRACTION |     # explore-track positions
              DONE | ABANDONED
round: 0                # review round / apply turn; log round-started/round-ended
                        # timestamps (ISO, minute precision) when it changes
next-action: <one concrete line, e.g. "spawn P1 reviewer on req-v2.md">
                        # append an ISO timestamp comment on every update;
                        # a missing duration is recorded as n/a — NEVER estimated
artifact-root: .        # optional; default = project root.
                        # Applies ONLY to process artifacts: requirement/, apriori/review/,
                        # apriori/explore/, apriori/changes/. NEVER to apriori/truth/ or
                        # apriori/specs/ (same-repo atomicity). When externalized, the
                        # kickoff prompt must state it — this file itself lives under it.
gates:                  # append-only log of human decisions
  - <YYYY-MM-DDTHH:MM> <label>: <the human's decision, verbatim>
                        # label from the fixed vocabulary: gate① … gate⑤ |
                        # intent-card sign-off | extraction review |
                        # STEP2 full review | consolidation | note
                        # (note = non-decision events: degradations, closeout, …)
                        # the format constrains the prefix ONLY — the decision text
                        # stays verbatim free text; the fixed prefix is what lets
                        # §6's wall-clock duration fields be machine-extracted
```

Update it immediately after each step and each round; append every gate decision; a new session trusts this file over its own inference.

---

## 4. State Machine

**Artifact paths** (every step writes here — never invent paths):

| Artifact | Path |
|---|---|
| Requirement doc | `requirement/req-v{N}.md` → finalized `requirement/req-final.md` |
| Requirement review | `apriori/review/<change>-req-review-v{N}.md` |
| Issue ledger | `apriori/review/<change>-issues.md` |
| Gap report | `apriori/explore/<change>-gap-report.md` |
| Spec / design / tasks | `apriori/changes/<change>/specs/`, `…/design.md`, `…/tasks.md` |
| Living spec store | `apriori/specs/` |
| Spec evaluation | `apriori/design/<change>-review-v{N}.md` |
| Knowledge base (TRUTH-DOC) | `apriori/truth/<module>.md` — `source-commit` stamp required (covers the Contract section only, §5 P9/P10) |
| Flow state | `apriori/changes/<change>/flow-state.md` |
| Intent card (explore track) | `requirement/intent-card.md` |
| Extraction review (explore track) | `apriori/review/<change>-extraction-review-v{N}.md` |
| Prototype (explore track) | `spike/` — deleted or quarantined at archive; never referenced by tasks.md |
| Reviewer raw output | `apriori/review/<change>-<stage>-raw.*` |

**The artifact interface (normative).** The paths above are plain files — no external SDD tool, no tool-owned spec directory. The `apriori` CLI acts on them directly.

- **Layout:** a change stages its artifacts under `apriori/changes/<change>/` (`specs/`, `design.md`, `tasks.md`); accepted specs live in the store `apriori/specs/`. The `artifact-root` rule (§3) covers the staging area only.
- **Spec structure:** Requirement blocks containing Scenario blocks with **stable IDs** (the quality rules in README §8.1). Every scenario MUST carry a leading ID (e.g. `#### Scenario: KV-03 …`) — an ID-less scenario can never be bound to a test (`apriori check` flags it).
- **Archive algorithm:** `apriori archive` merges a change's delta specs into the store by stable Requirement ID — `## ADDED` → append; `## MODIFIED` → replace the whole block; `## REMOVED` → keep the store block, marked `deprecated (superseded by <change>)`; `## RENAMED` (`- Old -> New`) → rename the block's ID in place, content preserved. A same-ID conflict with a change merged since branching → **stop, open a ledger issue, a human resolves** (§4.11's serialize-per-module rule). The command lists every merged / modified / deprecated / renamed ID and, on `--write`, moves the in-flight change dir to `apriori/changes/archive/<YYYY-MM-DDThhmm>-<name>/` (date-time stamped by the CLI).

### STEP0 — requirement refinement · adversarial loop · cap: `step0-cap` (default 5)

- **In:** `requirement/req-v{N}.md`; KB if any. The requirement must state its **target lineage** (mainline / which branch line) — in multi-lineage repos a missing lineage is a fourth interview trigger. If the requirement lacks any of the three essentials — goal / out-of-scope / testable acceptance — **interview the human first** with structured questions, then draft req-v1.
- **Each round:** (1) if a review exists, revise per it → `req-v{N+1}.md`, noting accept/reject + reason per issue and updating the ledger; (2) spawn the reviewer with **P1** (R2) → review doc + ledger; (3) record the verdict line.
- **Exit:** verdict line = `VERDICT: no major issues` → copy to `requirement/req-final.md`, advance. Cap hit → **gate ①**. Goal turns out unstateable → propose harden→explore (a human gate confirms the switch).

### EXPLORE track — when §2 routes the change here

0. **Intent card first (non-waivable):** ≤15 lines at `requirement/intent-card.md` — goal hypothesis / success criteria / the questions the spike must answer. Requires **human sign-off** (`intent-card sign-off`; a heterogeneous review may inform it, but cannot replace it). On this track the intent card is the independent review baseline — the extracted spec is never judged against the prototype alone.
1. **Spike (bounded):** prototype freely under `spike/`; cap: `spike-cap` (default 10) turns; exit = every intent-card question answered. Cap hit → **gate ⑤**.
2. **P11 — spec extraction:** inputs = intent card + prototype + spike findings; outputs = spec drafts under `apriori/changes/<change>/specs/` as the **sole intent-side authority**, plus `requirement/req-final.md` as a thin index over them (§5 P11 — never a second acceptance narrative). Declared extraction-time decisions (`EXT-n`) get their final ruling at the `extraction review` decision point.
3. **P12 — extraction review (heterogeneous, R2):** cap: `extraction-review-cap` (default 2). Verdict line `VERDICT: extraction accepted` → step 4. `VERDICT: extraction rejected` + unfaithful extraction → redo P11; `VERDICT: extraction rejected` + intent hypothesis falsified → back to SPIKE, or `ABANDONED` (archive the intent card + findings; log in the ledger).
4. **Merge:** enter STEP2's full P5/P6 loop — from here the tracks are identical.
5. **The prototype is disposable, machine-checkably:** STEP5 rebuilds from failing tests; tasks.md must not reference `spike/`; `spike/` is deleted (or quarantined) at archive.
6. **Track transitions:** explore→harden (extraction accepted, or the goal turns out clear); harden→explore (STEP0 finds the goal unstateable — via a human gate); explore→ABANDONED (hypothesis falsified). Each transition keeps the intent card, findings and ledger; only `spike/` is dropped.

### KB pre-check — before STEP1, whenever the project already has code

KB docs have two sections with **opposite truth directions** (§5 P9/P10): `Contract (code-is-truth)` and `Decisions (doc-is-truth)`.

- **Contract section:** does `apriori/truth/<module>.md` have one, and is it fresh — is `git log --oneline <source-commit>..HEAD -- <module-dir>` empty? (`source-commit` covers the Contract section only.) Fresh → STEP1. Stale → reconcile the Contract section with **P10** (there, code is truth), refresh the stamp. Missing → reverse-capture with **P10**; the produced doc must be checked by a human or a heterogeneous model **before** anything downstream consumes it.
- **Decisions section:** never reconciled from code. If code violates an `active` invariant recorded there, that is a **bug to report, not a doc to update**; a decision expires only when a newer decision supersedes it (`superseded-by: <id>`).

### STEP1 — explore

- **Do:** the **explore action** with **P3**. **Out:** the gap report.
- **Research-spike variant** (vague-but-tripwired changes, §2): probe code is allowed under `spike/` — the explore track's full isolation rules apply — capped by `spike-cap` (default 10); findings land as a "research conclusions" appendix to the gap report. P3 carries the matching variant clause.
- **Exit:** Large tier → **gate ②** (human skims the gap report). Other tiers: fold the report's top risks into your next report and proceed.

### STEP2 — propose · adversarial loop · cap: `step2-cap` (default 4)

- **Do:** the **propose action** with **P4**; then loop: reviewer **P5** (R2) → producer revises with **P6** (spec/design only — never source); ledger every round.
- **Exit:** verdict line = `VERDICT: no major issues, ready to proceed to execution` → advance. Cap hit or oscillation → **gate ⑤**.

### STEP3 — technical review — **gate ③ (human)**

- **Agent's job:** assemble the packet — design doc, spec, ledger with rejections on top — present it, stop. Record the outcome as DESIGN-REVIEW-DOC and in `gates:`. Major design change → back to STEP2.
- Medium tier: an async look-over replaces the meeting — the outcome still gets recorded. Solo developer: the decision record must still come from outside the producer's context (fresh-session review).

### STEP4 — update docs

- Apply the DESIGN-REVIEW-DOC changes to spec/design; optionally one more P5/P6 round. Skip if STEP3 changed nothing.

### STEP5 — apply · cap: `step5-cap` (default 25)

- **Do, in order:** (1) one failing test per spec scenario, test names carry scenario IDs — show the failing run; (2) implement in tasks.md order with **P7**, marking `[x]` as you go; (3) run until green; (4) `apriori verify` GREEN (the deterministic binding gate); (5) heterogeneous consistency review **P8** (R2); ledger.
- **The spec-runner gate (`apriori verify`).** `apriori verify --specs apriori/specs --test-cmd "<your test command>"` enumerates every scenario ID, runs the project's own test command (TAP output), and binds each scenario to its test: BOUND-GREEN / BOUND-RED / UNBOUND (scenario with no test) / ORPHAN (test with no scenario) / UNIDENTIFIED (scenario with no ID). GREEN (exit 0) means every scenario has a passing test and there are no orphans — this is what used to be P8's mechanical coverage check, now deterministic.
- **Verification matrix by project type:** all code projects — `apriori verify` GREEN + lint/static analysis green (plus SAST where security-sensitive) — where configured; backend/library — unit + property tests, mutation spot-checks; UI — plus E2E/visual regression; deployed service — plus runtime contracts, canary + rollback; **docs-only project — `apriori check` green + the P8 consistency review stand in for `npm test`.** Where an executable instrument doesn't exist for the project type, the LLM review is the primary instrument there — that is not a downgrade.
- **Exit — ALL of:** tests green (per the matrix above); `apriori verify` GREEN (docs-only: `apriori check` green); lint/static analysis green (where configured); tasks.md all `[x]`; consistency verdict line = `VERDICT: no spec-vs-code gaps`. Design infeasible → back to STEP2; requirement itself wrong → back to STEP0 (both: update the state file and tell the human). Cap hit → **gate ⑤**.

### STEP6 — archive + KB writeback

- **Do:** the **archive action** with **P9** — merge per the interface's archive algorithm above; update `apriori/truth/<module>.md` (Contract section from the final implementation + refreshed `source-commit`; Decisions section appends this change's new decisions/invariants); list exactly which files/sections changed. Explore-track changes: delete or quarantine `spike/` here.
- **Exit:** delta specs merged + KB updated → **gate ④**: the human approves the KB diff (same-repo layout: that's just PR review). Then set `current-step: DONE`.


---

## 5. Prompts

**Verdict-line phrase table.** Every review prompt ends with exactly one `VERDICT:` line drawn from this table — these are the machine-greppable strings that `/goal` conditions and the exit rules in §4 match against. CN documents quote the English strings verbatim (a CN gloss in prose is fine; the verdict line itself is never translated).

| Prompt | Pass | Fail |
|---|---|---|
| P1 | `VERDICT: no major issues` | `VERDICT: <N> issues open` |
| P5 | `VERDICT: no major issues, ready to proceed to execution` | `VERDICT: <N> issues open` |
| P8 | `VERDICT: no spec-vs-code gaps` | `VERDICT: <N> issues open` |
| P12 | `VERDICT: extraction accepted` | `VERDICT: extraction rejected` |

`<N>` = the total count of formal ledger rows with status `open` at the end of that review round (whole ledger, no stage filtering — mechanically decidable; a positive integer; advisory/rejected/fixed rows don't count). P12 uses fixed phrases only, never the count form.

### P0 — issue ledger (every prompt below reads/writes it)

`apriori/review/<change>-issues.md`:

```markdown
| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| REQ-3 | `ttlMs<=0` behavior undefined | med | 1 | fixed (v2) |
| SPEC-1 | cleanup moment missing for the in-memory map | high | 1 | verified |
| SPEC-2 | rename `del` to `delete` | low | 2 | rejected — cosmetic, out of scope |
```

- **Reviewer**: appends new rows; flips `fixed → verified` after confirming a fix landed; a re-found issue **reopens its old ID** — never a new row.
- **Producer**: flips `open → fixed` or `open → rejected`; a rejection MUST carry a reason — human gates read rejections first.
- **Advisory findings (scope discipline):** only gaps affecting **correctness, security, or the stated requirements** enter as formal rows; everything else the reviewer labels `advisory`. Labeling is the **reviewer's exclusive call** — the producer may never downgrade an open row to advisory. Per-item advisory lists live in the review doc; the ledger takes **one batch row per round** (`advisory batch acknowledged (n items)`), terminal state `advisory-acked`; "ignoring" advisories means no per-item handling — the batch row still lands. A reviewer may later **upgrade** an advisory to open (with a reason, new row tagged `upgraded-from-advisory`): it counts in the data pack's reopened statistic but does **not** by itself trip gate ⑤ (only a closed formal ID re-reopening does). **Correctness and security findings can never be advisory.** Mislabel handling: sampled at STEP3 (Medium+), gate ④, or the pre-merge PR review (Trivial); a real gap found mislabeled → upgrade + log; one that slips past merge counts as a post-merge miss (triggers cap restoration, §6).

### P1 — STEP0 reviewer (heterogeneous, R2)

```text
You are a senior requirements reviewer. Review the requirement doc; the goal is to make it precise enough to hand straight to an AI for implementation.
[Input]
* Requirement doc: requirement/req-v{N}.md
* System knowledge base (if any): apriori/truth/<module>.md
* Issue ledger (if any): apriori/review/<change>-issues.md
[Review dimensions, give a verdict on each]
1. Is target state B clear and unambiguous
2. Are edge cases and exception paths covered (null, out-of-range, concurrency, timeout, failure rollback)
3. Are there "implied but undeclared" state changes or side effects
4. Is each acceptance criterion testable (expressible as "if … then …")
5. Does it conflict with current state A (if a KB was provided)
6. Is the target lineage declared, and does it match the repo's reality (multi-lineage repos: which branch/line this lands on)
[Scope] Count toward the verdict only: ambiguous target state, untestable acceptance criteria, missing edge/boundary coverage, conflicts with state A. Everything else — label advisory (P0 rules). Also check an explicit out-of-scope ("won't do") section exists.
[Output]
Produce apriori/review/<change>-req-review-v{N}.md: an issue list by dimension (description / risk / suggested fix); advisories listed separately.
Mirror formal issues into the ledger per its rules. End with the verdict line (§5 phrase table): "VERDICT: no major issues" or "VERDICT: <N> issues open".
Do not modify the requirement doc itself.
```

### P2 — STEP0 revise (producer)

```text
Revise the requirement doc per apriori/review/<change>-req-review-v{N}.md and output requirement/req-v{N+1}.md.
For each formal issue, state how you handled it (accept/reject + reason), and update its Status in the ledger (fixed / rejected + reason).
Advisories may be batch-acknowledged or ignored without per-item reasons — only rejections of formal findings need justification.
```

### P3 — STEP1 explore

```text
Align all known facts first — do not write code.
[Input]
* Requirement doc: requirement/req-final.md
* System knowledge base: apriori/truth/ (module: <module>; new project: note "none")
* Detailed design doc: design.md (if any)
* Code: this repo
[Output]
apriori/explore/<change>-gap-report.md: current state A, target state B, and the gaps and risks between them.
[Research-spike variant — ONLY for vague-but-tripwired changes routed here by §2]
Probe code is allowed under spike/ (explore-track isolation rules apply), capped by spike-cap;
findings land as a "research conclusions" appendix of the gap report. Otherwise: do not write code.
```

### P4 — STEP2 propose (producer)

```text
Based on the aligned facts, write the proposal, all spec docs and the design doc.
* Every user-visible output gets its own scenario with a stable ID (e.g. KV-03); never merge visible side-effects;
* State explicitly what is out of scope for this change;
* Any external shared state (Redis / DB field / global singleton / in-memory cache) must describe three moments: init / runtime update / cleanup-invalidation.
Stop when done and wait for review.
```

### P5 — STEP2 reviewer (heterogeneous, R2)

```text
You are a technical reviewer. Hunt for issues that would cause rework or a production incident.
[Input]
* SPEC-DOC: apriori/changes/<change>/specs/   * DESIGN-DOC: apriori/changes/<change>/design.md
* KB: apriori/truth/   * Requirement doc: requirement/req-final.md   * Ledger: apriori/review/<change>-issues.md
[Checklist]
1. Do scenarios cover every visible behavior; any missing failure/edge scenarios
2. Are the three moments of external shared state complete
3. Conflicts with current state A, or broken existing conventions
4. Spec'd but not designed, or designed behavior the spec never declared
5. Security, where the change touches external input or permissions: unvalidated input, missing authz, secrets/PII in logs, injection surfaces
[Scope] Count toward the verdict only gaps that would cause rework or a production incident. Everything else — label advisory (P0 rules).
[Output]
apriori/design/<change>-review-v{N}.md: issues (description/risk/suggestion), advisories listed separately; mirror formal issues into the ledger per its rules.
End with the verdict line (§5 phrase table): "VERDICT: no major issues, ready to proceed to execution" or "VERDICT: <N> issues open".
```

### P6 — STEP2 revise (producer)

```text
A different model reviewed your spec and design: apriori/design/<change>-review-v{N}.md.
Handle each formal item (accept/reject + reason), modifying spec and design files only — never source.
Advisories may be batch-acknowledged or ignored without per-item reasons — only rejections of formal findings need justification.
Update each issue's Status in the ledger, then request review round v{N+1}.
```

### P7 — STEP5 apply (producer)

```text
Tests first: derive one failing test per spec scenario, named with its scenario ID (e.g. test('KV-03 …')), and show the failing run.
Then implement strictly in tasks.md order; mark each task [x] immediately on completion.
* Scenario coverage is the hard bar: every scenario has ≥1 test carrying its ID. Line coverage is a signal, never a target — no assertion-free padding;
* Log at key branches and function entries per the project convention;
* Before declaring green, run the project's linter/static analysis (where configured);
* For any continue/skip/silently-ignored branch, re-check the spec for required user-visibility.
(Docs-only projects: the "test suite" is `apriori check` — same failing-first discipline where feasible.)
Run the tests until green; stop and wait for archive.
```

### P8 — STEP5 consistency reviewer (heterogeneous, R2)

```text
Review the implementation against the SPEC-DOC. `apriori verify` has already proven the mechanical
binding (every scenario has a passing test, no orphans); your job is what binding cannot prove —
whether each test faithfully exercises its scenario's INTENT:
1. Semantic faithfulness: for each scenario, does its test actually assert the behavior the scenario
   describes, or merely share its ID while asserting something weaker/nothing (a green test can be empty);
2. Behavior the spec requires but the code doesn't implement (that a bound test failed to catch);
3. continue/skip/silently-ignored branches — does the spec require them to be user-visible;
4. Where external input or permissions are touched: unvalidated input, missing authz, secrets/PII in logs.
[Scope] Count toward the verdict only spec-vs-code gaps. Style, taste and nice-to-haves — label advisory (P0 rules).
List each inconsistency with a suggested fix; end with your ledger delta (P0 rules), advisories listed separately.
(Docs-only projects: read "tests" as the doc checks; `apriori check` stands in for the binding gate.)
End with the verdict line (§5 phrase table): "VERDICT: no spec-vs-code gaps" or "VERDICT: <N> issues open".
```

### P9 — STEP6 archive (producer)

```text
Archive this change per the interface's archive algorithm (§4) — list every merged/modified/deprecated/renamed ID; on a same-ID conflict, stop and open a ledger issue. Then update the knowledge base in lockstep. KB docs have two sections with opposite truth directions:
* "## Contract (code-is-truth)": update it from the final implementation; refresh the source-commit stamp (it covers this section only);
* "## Decisions (doc-is-truth)": append decisions/invariants/rejected alternatives made in this change, each with status (active / superseded-by: <id>). NEVER rewrite an active invariant to match code — if the code violates one, file a bug instead;
List exactly which KB files and sections you updated.
```

### P10 — KB reverse-capture / reconcile (legacy projects)

```text
You are a system knowledge-base engineer. Read the module's code and produce/reconcile its KB doc.
[Input] Code scope: <dirs/files>. Existing KB (if any): apriori/truth/<module>.md
[Task] Abstract: public responsibilities/interfaces, core data flow, key state and side effects (the three moments), dependencies, conventions and pitfalls. If a KB exists, flag every mismatched/stale/missing point and revise — per the section rules below.
[Output] apriori/truth/<module>.md on the change branch (so the PR diff is where it gets reviewed), structured as two fixed sections with opposite truth directions:
* "## Contract (code-is-truth)" — interfaces, three moments, code-derived pitfalls; here code IS the sole source of truth: reconcile from it and stamp with the source-commit you read (the stamp covers this section only);
* "## Decisions (doc-is-truth)" — decisions, invariants, rejected alternatives, each with status (active / superseded-by: <id>); NEVER reconcile this section from code — where code contradicts an active invariant, flag it as a bug in your output instead of editing the entry.
[Constraints] Contract: only facts present in the code. Decisions: only explicitly confirmed intent. Mark uncertainties "needs human confirmation"; never invent abstract intent.
```

### P11 — explore track: spec extraction (producer)

```text
[Input] requirement/intent-card.md; the prototype under spike/; the spike findings.
[Task] Extract the specification implied by the prototype's *validated* behaviors — never invent behavior that neither the intent card nor an observed spike run supports. Produce:
* spec drafts with scenario IDs under apriori/changes/<change>/specs/ — the SOLE intent-side authority;
* requirement/req-final.md — a THIN INDEX only: one goal line citing the intent card + acceptance = a reference to the spec scenario-ID list. Never write a second acceptance narrative there — two prose versions of the same intent drift apart.
[Constraints] Mark unvalidated assumptions "needs confirmation". Behavior that neither the intent card nor an observed spike run supports, but the spec needs for completeness, MUST be declared as an explicit extraction-time decision — an `EXT-n` entry (content + reasoning) in a dedicated section, never mixed into extracted facts; EXT-n entries are ruled on at the extraction review. The prototype is a source of observations, not of authority: where intent and prototype disagree, the intent card wins and the disagreement is listed explicitly.
Stop and wait for the extraction review (P12).
```

### P12 — explore track: extraction review (heterogeneous, R2)

```text
[Input] requirement/intent-card.md; P11's outputs; the issue ledger.
[Checklist] P1's five dimensions, plus:
6. Intent-card conformance — every goal and success criterion appears in the extracted specs/ (the sole authority; the req-final thin index is checked only for being thin and consistent);
7. No invention — every spec line traces to the intent card or an observed spike behavior (spot-check the tracing), EXCEPT declared EXT-n entries, which are reviewed as proposals: recommend each as accepted / rejected / needs-human.
[EXT-n semantics] Your verdict line judges extraction faithfulness only (invention outside declared EXT-n, intent conformance) — EXT-n recommendations never change it. Final EXT-n rulings belong to the `extraction review` decision point (the existing human gate): human-rejected → the producer deletes those spec lines, deletion confirmed mechanically (grep: the EXT-n scenario IDs are gone) with no P12 rerun; human-accepted → the entry is back-noted on the intent card. Unruled EXT-n block the decision point, not your verdict line — list them explicitly before it.
[Scope] Count toward the verdict only unfaithful extraction or a falsified intent hypothesis; advisory findings never land in either rejected branch (P0 rules).
[Output] apriori/review/<change>-extraction-review-v{N}.md — issues per P0, advisories listed separately, EXT-n recommendations; end with your ledger delta,
then exactly one verdict line (§5 phrase table): "VERDICT: extraction accepted" or "VERDICT: extraction rejected".
Cap: extraction-review-cap (default 2). Rejected + unfaithful extraction → producer redoes P11;
rejected + intent hypothesis falsified → back to SPIKE or ABANDONED (the state machine's failure branches).
```

---

## 6. Human Operator Appendix

> Everything in this section is **run by the human**. The agent must never execute or simulate `/goal` (R3). Architecture and caveats: handbook §4.10.
> All caps in the recipes below are **defaults** — `process-config.md` overrides them (floor: 1 per review stage).

**STEP0 loop:**
```text
/goal "Goal: requirement/req-final.md exists and the latest review pass reports 'VERDICT: no major issues'. Cap: step0-cap rounds (default 5).
Each round:
1. If apriori/review/<change>-req-review-v{N}.md exists, revise requirement/req-v{N}.md per it, bump to v{N+1}, note accept/reject+reason per issue, and update those issues' Status in apriori/review/<change>-issues.md.
2. Run the reviewer with a DIFFERENT model on the current version and save its output to apriori/review/<change>-req-review-v{N}.md, e.g.:
   codex exec -s read-only \"<the P1 prompt> — target: requirement/req-v{N}.md\"
   (no Codex? open a fresh `claude` and hand it P1 plus the issue ledger)
3. Paste the reviewer's final verdict line back into this conversation.
Stop when the verdict line is 'VERDICT: no major issues' (then copy to requirement/req-final.md) or at the cap."
```

**STEP2 loop:**
```text
/goal "Goal: apriori/changes/<change>/ has SPEC-DOC+DESIGN-DOC and the latest review verdict line is 'VERDICT: no major issues, ready to proceed to execution'. Cap: step2-cap rounds (default 4).
Each round:
1. Revise the spec/design files per the latest review — never touch source code — and update the handled issues' Status in apriori/review/<change>-issues.md.
2. Re-run the heterogeneous reviewer with the P5 prompt (round 1: codex exec, note the printed session id; later rounds: codex exec resume -c sandbox_mode=\"read-only\" <session-id> — codex ≥0.14x rejects -s on resume; older CLIs: -s read-only before the id), producing apriori/design/<change>-review-v{N}.md and updating the ledger.
3. Surface the reviewer's verdict line here.
Stop on 'VERDICT: no major issues, ready to proceed to execution' or at the cap."
```

**STEP5 loop:**
```text
/goal "Goal — ALL must hold: `npm test` exits 0; lint/static analysis green (where configured); every scenario ID in apriori/changes/<change>/specs/ appears in at least one test name (list any missing IDs); every item in apriori/changes/<change>/tasks.md is [x]; (UI projects only) the Playwright E2E suite passes and screenshot diffs are within threshold; AND a consistency review by a DIFFERENT model (the P8 prompt) reports 'VERDICT: no spec-vs-code gaps'. Cap: step5-cap turns (default 25).
Turn 1: derive one failing test per spec scenario, named with its scenario ID, and SHOW the failing run. Each later turn: implement the next tasks.md item in order, then run `npm test` (and the Playwright run for UI projects) and SHOW the output so the result is in the transcript. When the code is complete, run the consistency reviewer (codex exec / fresh claude) and paste its verdict.
Stop when every condition holds or at the cap."
```
> Docs-only projects: replace `npm test` with `apriori check`, drop the Playwright clause, keep the consistency review.

**STEP6:**
```text
/goal "Goal: the change is archived (`apriori archive` merges the delta specs into the living store apriori/specs/) AND the KB file for module <module> reflects this change's new/changed facts with a refreshed source-commit stamp. Cap: step6-cap turns (default 4).
Run the archive action, then update apriori/truth/<module>.md and list exactly which files/sections changed.
Stop when both hold."
```

**Gate checklist (what you personally decide):** ① STEP0 finalization when the cap is hit ② gap-report skim (Large) ③ STEP3 technical review ④ KB-diff approval ⑤ any cap hit / reopened ledger ID — escalation, never quietly lowering the bar. Explore track adds: `intent-card sign-off` and the `extraction review` outcome. Gate consolidation (§1) is yours to grant — but never over the shrink decision, the KB sign-off, or `intent-card sign-off`.

**Shrink governance (the metabolism rule).** Every N changes (default 5, `shrink-proposal-freq`) the agent **reports — never applies** — a shrink/expand proposal whose data pack MUST contain: verified count; rejected count (with sampled reasons); reopened-ID count (including `upgraded-from-advisory` rows); advisory ratio (monitoring only — never a decision threshold); total wall-clock per change and per review stage (derived from the state file's timestamps; wall-clock includes human-gate waits — note this so cost curves aren't misread; missing timestamps → `n/a`, never estimated). The rejected ratio for `rejected-ratio-guard` (default 50%) counts **formal findings only — advisories are excluded from both numerator and denominator** (so relabeling can't dilute the guard). Shrinking a review stage is a **human gate decision**, blocked outright when the guard trips or the change class is tripwired (shared state / migration / security / production data). Shrinking means lowering a stage's round cap — **floor 1; no stage ever reaches zero** — and shrunk review rounds can never be traded for fewer deterministic checks: **you may shrink review rounds, you may not substitute them for lint, tests or traceability**. Post-merge re-review (sampling rate `post-merge-review-freq`, default 1 in 5 merged changes) finding ≥1 high-risk miss — including a real gap that had been mislabeled advisory — → restore the stage's previous cap, logged the same way. Beware both directions: producers can zero the metric by rejecting findings (that's what the guard is for); reviewers can inflate it by careless verifies (which merely delays shrinking).

---

> This runbook distills handbook §4 (workflow), §6 (knowledge base) and §7 (prompts). The handbook explains *why*; this file is *what*. For execution, this file wins.
