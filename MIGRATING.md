# Migrating

The 3.0.0 stability promise — CLI surface & flags, `--json` shapes, the delta format, the flow-state schema and the `apriori/` layout only break in a major — holds for the released 5.x line. **6.x is an unreleased development line** (npm has never shipped a 6.x; `package.json` says `6.2.0-rc.0`, both runbooks `runbook-version: 6.2`): within it the `gate --review-ready` item ids (`tests`, `open`) and the flow-state fields (`## Evidence` gone, `mode:` inert) changed in 6.2, and further changes before a 6.x release are declared here rather than promised away. Everything below is either additive or a declared fail-closed tightening.

## 6.2 code layer (Unreleased) — one mechanism of risk acceptance

**What moved where.** The `## Evidence` row table, its status vocabulary (`done | blocked |
owner-accepted | n/a` and the completion synonyms), the reserved `producer-diff` and
`contract-mutation` rows, the `standard`-owes-one-row quota, the `mode:` upgrade and the issue
ledger reader are gone. What remains is ONE mechanism, read by gate C9, archive R5, the archive
declaration and `status` through one function:

```markdown
## Open                  # substantive unresolved items — one line each, stable id first
- R-01: could not verify restart recovery in the target runtime; this delivery still depends on that evidence.
- R-02: <a defect the review found and nobody has closed>

gates:
  - <YYYY-MM-DDTHH:MM> owner: evidence-accept R-01 — <the owner's verbatim reason>
```

An item is `- <ID>: <text>` (the id is one token in front of the colon — `R-01`, `data-schema`,
`producer-diff` are all legal). It is PENDING until the owner records `evidence-accept <ID>` —
the grammar, parser and last-write-wins revoke are exactly 6.0's — and a pending item blocks and
is never forceable. An accepted item does not block, but it is reported as `accepted, still
present` (gate detail, archive note, `status`) and nothing deletes it: remove the line when the
risk is actually resolved. A line without an id is still an open item — it blocks and cannot be
accepted (`give it a stable id to accept it, or close it`). Duplicate ids are refused, both lines
named. An empty or absent section owes nothing: **the "no rows is a refusal" rule is gone.**

**The legacy `## Evidence` section, in an in-flight bundle.** A row reading `blocked` blocks with
`legacy Evidence row '<name>' is blocked — move it to ## Open as an item (or accept it via
evidence-accept <name>)`; a row claiming `owner-accepted` with no valid acceptance for its name
blocks the same way (a self-signed claim may not make a risk disappear); a row whose name
already carries a valid acceptance is treated as an accepted item; every other row (`done`, `n/a`, `fixed`, an unfilled scaffold row, …) is ignored
with one note. Move what is still unresolved to `## Open` and delete the section. Archived bundles
are recorded, never re-judged — nothing to migrate there.

**The flow-state reader is one Markdown subset, fail-closed on the rest (`lib/flow.js`).**
Still read exactly as before: annotated headings (`## Open # …`, `### Open`), `*` bullets,
indented continuation lines, CRLF, case-different titles, `T1100` and `T11:00` stamps, a reason
in any script, and a 31st of February (the stamp is range-checked, not calendar-checked). Now a
STRUCTURAL DEFECT naming its line — blocking C9/R5 and review-ready `open`, never read as an
empty section: a numbered or bare line under `## Open` / `## Reality Check` (rewrite it as
`- <ID>: <text>`), a section written twice, a scalar set twice with different values (C3/R1
refuse it too), an unclosed fence or comment. Fenced or commented content is inert everywhere —
an example `evidence-accept` inside a code block authorizes nothing. Archived bundles: reported,
never refused, never migrated.

**`mode:` is optional and inert.** Delete the line or leave it: absent is fine, `fast` and
`standard` are accepted and echoed, anything else (the unfilled placeholder included) still blocks
C3. There is no upgrade any more — a mutating delta is reported as `risk: contract-mutation: …`
and demands nothing. `apriori new` writes no `mode:` line and no `## Evidence` section.

**`--review-ready` has two items:** `tests` (C1 really ran) and `open` (every item carries a
stable id, no id duplicated, no Reality Check `assumption` still standing, no kind-less Reality
Check line). A pending item does not fail it — that is what the review is for.
The `evidence` and `producer-diff` items are gone; the JSON shape `{change, ready, items}` is
unchanged, only the ids changed.

**Compat placeholders, kept for `--json` shapes:** gate `C2` (`retired in 6.2 — nothing is
read`) and `C4` (`ledger retired in 6.2 — open items live in ## Open`) stay in `checks[]` as
`n/a` and read nothing; `status --json` keeps `openLedger` (always `[]`), `effectiveMode` (equal
to `mode`, or `null`) and `evidence` (legacy rows only — `{rows:[], blocked:[], recorded:[]}`
when there are none), and ADDS `openItems: [{id, text, accepted, acceptedAt}]`. `review/issues.md`
and `tasks.md` are never opened. Archive readiness has no R2 and no R3; an `archive-force ledger`
record is parsed and reported as `note: archive-force has nothing left to force in 6.2`, and
`--force` still opens exactly one thing — an answered round-5 escalation.

## 6.0 slice 4 → slice 5 (Unreleased) — the artifact family is gone

> **Read with the 6.2 section above:** the `## Evidence` rows, the ledger rule (R3 / C4) and the
> mode upgrade described below were retired in 6.2. This section is kept as the 5.x → 6.0 record.

**This is the subtraction the 6.0 blueprint is for.** 5.x demanded a requirement doc, a
proposal, a design doc, a gap report and a task list of every change; the practices that fed
this design show the cost landing on reviewers rather than on defects. Slice 5 removes the
obligation from the runtime, the living specs, the tests and both doc editions at once — a
half-removed state would leave old and new running side by side.

**1. `current-step` → `phase`.** The seven numbered steps are gone; the four phases are the
state:

```diff
 change: add-playback
 mode: standard
 lineage: main
-current-step: STEP5
-next-action: implement task 3
+phase: build
+
+## Reality Check
+- observed: src/player.js has no seek handler — read 2026-08-23
+- decision: seek is in scope
+
+## Evidence
+- producer-diff: done — read the whole diff, known P0/P1 zero
+
+## Next
+- write the failing test for AP-04
```

- `STEP0`/`STEP1` → `phase: ground` · `STEP2`/`STEP3` → `phase: specify` · `STEP4`/`STEP5` →
  `phase: build` · `STEP6` → `phase: review` · `DONE` → `done` · `ABANDONED` → `abandoned`
- `next-action:` becomes the `## Next` section (at most three entries; the first is the resume point)
- optional new keys: `delivery: released | pending-external-acceptance` (the third state an
  archive declares) and `escalation: none | <what a human must decide>`

`current-step` now refuses the same way `tier`/`track`/`round` do: a bundle that still spells
it is named by `gate` C3, `archive` (RESULT: NOT READY) and `status`, never silently read.
Archiving happens at `phase: review`.

**2. No document family, in either mode.** `apriori new` scaffolds `flow-state.md` plus empty
`specs/` and `review/` — it no longer creates `requirement/` and names no document to draft.
Readiness rule **R2** (the task list) does not exist. `gate` C2 can only report `–`: a
`tasks.md` a 5.x bundle still carries is read as a diagnostic, its unchecked boxes named, and
it can never block. An absent ledger is `n/a` in **both** modes.

**3. The ledger blocks on one thing.** A row still reading `open` refuses a delivery. An
unknown status token, a reasonless rejection, a `waived` with no `gates:` record, and an
archive-stage `fixed` that never became `verified` are printed as **bookkeeping notes** and
never refuse. 5.x refused archives over those, on changes whose product tests were already
green. The `archive-force` grammar keeps one class, `ledger`; an `archive-force tasks` record
is inert.

**4. One new refusal, and it is about reality.** The flow-state's `## Evidence` section holds
one row per risk the change actually hits:

```markdown
## Evidence
- producer-diff: done — read the whole diff, known P0/P1 zero
- data-schema: blocked — the staging DB is offline
```

A `blocked` row blocks delivery (gate **C9**, archive **R5**) until the owner decides. An
`owner-accepted` row blocks unless the owner's OWN decision is on record, in a closed grammar:

```markdown
gates:
  - 2026-08-23T11:00 owner: evidence-accept data-schema — the staging DB is offline until Q4
```

Every part is load-bearing — a real timestamp, the actor spelled exactly `owner`, the lowercase
keyword opening the payload, the row id whole and case-sensitive, the em dash, and a reason.
`producer:`, `note:`, a `gate⑤ (owner):` prefix, an undated line, a missing dash or reason, a
near-miss id, and generic accept prose authorize nothing — a producer may not grant itself the
owner's exit. Revoke by APPENDING `evidence-accept-revoke <id> — <reason>`; the last decision
wins. `--force` cannot substitute for the decision, and acceptance never changes the change's
mode.

Two more things C9/R5 read. A delta that MUTATES a published requirement makes a row named
exactly `contract-mutation` owe `done` or a recorded acceptance — `n/a` contradicts a proven
fact. A `standard` change owes at least one substantive row that is not `producer-diff`; a
`fast` change with no machine risk may answer with the binding run plus `producer-diff`. **No
`## Evidence` section at all now blocks** — in 5.x there was nothing to answer; in 6.0 silence
is not an answer, and a bundle you carry over needs at least
`- producer-diff: done — <what you checked>`.

**5. Review-ready, and a third verdict.** `apriori gate --change <name> --review-ready` prints
a transient admission view over the same run's facts — tests really executed, evidence
complete or explicitly blocked/accepted, the producer's own `producer-diff` row, and the
reviewer's default context — and writes nothing. Reviewers gained `VERDICT: escalate`: the
approach is wrong rather than the details, and it escalates at whatever round it happened.
`apriori status --change <name> --escalation` prints every reason a human is being waited on
and exits **3** — that exit code is the whole hard-stop mechanism; this repository still ships
no hook.

**6. The numbered gates are gone.** There is no gate ①–⑤ ladder and no consolidation
authorization. Four things stop for a human: an escalation, critical evidence still `blocked`,
an external side effect, and abandonment. The `gates:` block stays, with two labels — `owner`
and `note`. **A `gate⑤ (owner):` prefix no longer authorizes anything.** All three owner
decisions — `evidence-accept`, `archive-force` and `reframe` — now read ONE canonical entry:

```markdown
gates:
  - 2026-08-23T10:00 owner: reframe spec-review round 2 split — the change is two changes
```

A real timestamp, the actor spelled exactly `owner`, the lowercase verb opening the payload, the
target matched whole, an em dash, a reason. `producer:`, `note:`, `agent:`, the retired
`gate⑤ (owner):` prefix, an undated line, a missing dash or reason, and a near-miss target
authorize none of the three. If a bundle you carry over records a decision under the old prefix,
rewrite that line as `owner:` — nothing else about it changes. `note:` entries stay legal as
HISTORY; they simply never authorized anything and now say so.

**7. `verification-profile` is gone.** The `process-config` row had a reader and no consumer —
it scaled evidence by project type, and §6's risk rows are the only list now. Delete the row if
you carry one; nothing read it, so nothing changes. (`apriori init` stopped scaffolding it.)

**8. The archive declares three states.** Implementation complete, critical evidence complete,
released or pending external acceptance — printed in dry-run and `--write` alike. The bundle
is frozen afterwards: a defect found later becomes a short outcome note or a NEW change, never
an edit to the archived record.

**Already-archived bundles are untouched.** Nothing here is applied retroactively.

---

## 6.0 slice 3 → slice 4 — one flow, no parallel lanes

**The hotfix lane and the explore track are gone.** `apriori hotfix` refuses with a pointer
rather than an unknown-command error: new work is `apriori new <name>` with `mode: fast`
(reproduce → fix → regression → one independent review). A directory that still carries
`hotfix-state.md` and no `flow-state.md` cannot be read as a change — `gate` and `status`
diagnose it by name and tell you to convert it (`apriori new <name>`, `mode: fast`) or finish
it with apriori-cli 5.x. An **archived** lane record is frozen history and is told so: it is
never handed a write-back instruction. `hotfix-state.md` sitting beside a readable
`flow-state.md` is residue, and the change is gated as the change it is.

The explore track's positions (`INTENT-CARD`, `SPIKE`, `EXTRACTION`) stopped being legal steps
in the same slice; slice 5 retired the whole numbered vocabulary that contained them.

---

## 6.0 slice 2b → slice 3 — fast owes one review, and a contract-mutating delta is standard

**Two tightenings, both fail-closed, both declared.**

**1. Every in-flight change needs one completed review round — `fast` and `standard` alike.**
`gate` C8 blocks without it, `archive` reports `RESULT: NOT READY` (R4), and `status` names it.
`--force` does not help: it authorizes *progress*, not a review that did not happen. The round
you already write satisfies this — a summary whose verdict line is in the known vocabulary,
with its `<stem>-raw.*` transcript beside it. Nothing new to author, no matrix to fill in.

**The review must also have closed** — a change whose latest round still says `gaps found` or
`N issues open` (N > 0) is refused; the ledger-driven variant of this rule is gone, see the 6.2
section above.

**Evidence `gate` cannot read, `archive` no longer merges.** A symlinked review summary, or a
verdict document with no `-raw` archive, now refuses the merge (R4) exactly as it refuses the
gate (C5). Neither is forceable. Before this, `gate` said `C5 BLOCKED` and `archive` said
`RESULT: MERGED` about the same bundle.

**What to do:** if you have an in-flight change with an empty `review/`, run the review; if its
last round is still revising, run the next one; if a review file is a symlink, land the real
bytes. That is the entire migration. There is no lane that exempts work from the outside look:
6.0 has one flow, and both of its modes keep the single independent review.

**2. A delta that MUTATES a published requirement makes the change standard.** If
`apriori/changes/<name>/specs/**.md` carries a `## MODIFIED`, `## REMOVED` or
`## RENAMED Requirements` section, the fast lane closes automatically and every surface prints
the same reason, e.g.:

```text
✓ C3 legal (mode fast → standard (contract-mutation: kv/spec.md MODIFIED 'Alpha'), build)
```

You do not edit `mode:` — the tool judges by the effective mode and reports both. **No new
document is required and no extra review round is added.** An `## ADDED`-only delta is
untouched and stays fast. *(Slice 5 removed the artifacts the upgrade used to withdraw, so the
upgrade is now a reported judgement: `gate`, `status` and `archive` all state it, and an
upgraded change with no `## Evidence` row is not review-ready.)*

There is deliberately **no override**. The signal is not a heuristic that could be a
misjudgement — it is the delta grammar restating what the change itself declares — so the
blueprint's "only when the signal is proven wrong" escape hatch has nothing to open.

**The other five §6 risk rows are not implemented**, on purpose: UI/prototype,
data/transaction, config/deploy/environment, permission/security and the source-diff half of
migration/compatibility all need files this CLI does not read. Choosing `fast` when one of them
applies is still a rule only you can keep; RUNBOOK §2 says so in as many words.

**Already-archived changes are unaffected.** Neither rule is applied retroactively: a frozen
bundle keeps its declared mode, no risk is derived from its already-merged delta, and it is
never told it owed a review round. Evidence-integrity checks still apply at every stage.

**One reporting fix rides along.** `status` used to mark a *frozen* review loop "(loop
stopped)" while `gate` said the stop rule does not apply retroactively. They now agree:
`stopped` is `false` on an archived bundle in both, and the round history is still reported.

---

## 6.0 slice 2 → slice 2b — the parameters nothing reads are gone

Eight rows leave `templates/process-config.md`: `step5-cap`, `step6-cap`, `spike-cap`,
`extraction-review-cap`, `shrink-state`, `rejected-ratio-guard`, `shrink-proposal-freq` and
`post-merge-review-freq`. **No command ever read one of them, at any exit.** The CLI reaches
that file through a single reader, and every call site asks for a literal key: `id-pattern`,
`verification-profile`, `cas`, `test-cmd`. The eight were never wired to anything — they were
prose that looked like configuration, which is worse than no configuration, because a number
in a config table reads as a control someone is honouring. In one real change `step5-cap = 25`
was hit and then exceeded by seven turns, and nothing reported it.

**What to do:** delete the rows from your `apriori/process-config.md` if you carry them. The
file is human-held and the CLI never rewrites it; an unread row was always inert, so this is
tidying, not a break. Leaving them costs nothing but confusion.

**The shrink governance is deleted, not replaced.** RUNBOOK §6's metabolism rule — the
every-N-changes shrink/expand proposal, its data pack, the rejected-ratio guard, the post-merge
re-review sampling rate and the cap restoration it triggered — governed caps that no longer
exist through a loop no code ran. Nothing takes its place: no ledger, no metric store, no
dynamic cap, no shrink engine, no new gate.

**What was removed is the *configurable* cap, not every bound.** The `process-config` rows had
no consumer, so the dynamic caps they claimed to set are gone. The implement-and-test `/goal`
recipe in RUNBOOK §6 still carries a fixed **25-turn safety bound** — it is simply no longer
configurable: reaching turn 25 with any success condition unmet means stop and report the
failing evidence, never a pass. The deliver recipe has no bound and stops on its exit conditions.

**What still stops a review loop** is exactly what slice 2 made mechanical: the derived
per-family review round (`gate` C8), archive readiness R4, and the human decisions of §1 R1.
Those govern **review rounds only** — they do not govern, and never terminate, the
implementation/test turns.

**Two consequences worth knowing before you re-read the runbook.** Gate consolidation used to
name three gates it could never cover — the shrink decision, the KB sign-off,
`intent-card sign-off`; the shrink decision is gone, so two remain. And gate ⑤ no longer lists
"turn-cap hit" among its triggers: a stopped review loop, an escalation and a reopened ledger
ID still trigger it.

---

## 6.0 slice 1 → slice 2 — the review round is derived, per family

`step0-cap` and `step2-cap` are gone from `templates/process-config.md`. Nothing ever read
them: they were prose caps on the STEP0 and STEP2 review loops, and 6.0 governs those loops
mechanically instead (`gate` C8, archive readiness R4, runbook §1 R4). If your
`apriori/process-config.md` still carries the two rows, delete them — the file is human-held and
the CLI never rewrites it; an unread row is inert, so this is tidying, not a break.

The eight remaining supervision parameters were left for slice 2b, which deletes them on the
same finding — see the section above.

**What to write instead of a round number.** Nothing — each review family's round is counted
from its review docs and their raw transcripts. The one thing you write by hand is the answer
when a family's loop stops, as a `gates:` entry naming that family:

```text
gates:
  - 2026-08-23T10:00 owner: reframe spec-review round 2 split — the change is two changes
```

Legal decisions are `split`, `tests` and `redo`; at round 5 the owner also has `accept-risk`.
The entry names the family AND the round it answers, so it never silently pre-authorizes the
next round or another family's loop. The prefix is binding — the actor must be spelled exactly
`owner` and the timestamp must be real, as for every owner decision (see above). It does not waive evidence problems — those are fixed.

**Your existing review documents almost certainly already pass.** The verdict vocabulary accepts
`N issues open` and `N issues found`, singular or plural, any case, with or without a trailing
period, plus the accept and revise phrasings. `0 issues open` reads as an accept. A document whose body was pasted twice with the
same verdict both times is an advisory, not a refusal, and a stray transcript like
`kb-check-raw.txt` is an advisory too.

**What does need fixing**, because each one can hide a round: a verdict phrased outside that
vocabulary; one document declaring two *different* outcomes; two documents claiming the same
family and round; a `<stem>-raw.*` whose `<stem>.md` lost its verdict line or is missing while
the name claims a round; and a gap in a family's `v1..vN` sequence.

**Archiving past round 5** needs both halves of archive's usual human authorization: the
`reframe … accept-risk` decision recorded in `gates:` and an explicit `--force`.

**Already-archived changes are not judged retroactively.** The round-2 stop and the round-5
escalation govern a change in flight; on a bundle the resolver finds under
`apriori/changes/archive/`, `gate` C8 reports the rounds and any escalation as history and
does not block on them. Evidence-integrity checks still apply at every stage — a frozen
bundle whose evidence does not add up is misreporting its own past, so an unclassifiable or
conflicting verdict, a duplicated family/round claim, a missing summary or verdict, or a gap
in a family's ordinals still refuses.

---

## 5.x → 6.0 — one identity field

`flow-state.md` carried four identity fields. Reality-checking the CLI found that three of
them decided nothing: `round` was written and then discarded (no code path read it), `track`
was only ever required to be *present* (no branch ever read `harden` vs `explore`), and
`track-rationale` was prose. Only `tier` decided anything — four times, always
`trivial` → relax a requirement. 6.0 replaces all four with `mode`:

```diff
 change: add-playback
-tier: medium
-track: harden
-track-rationale: goal and acceptance are stateable
-round: 0
+mode: standard
 lineage: main
 current-step: STEP5
```

- `tier: trivial` → `mode: fast` · `tier: medium` / `tier: large` → `mode: standard`
- delete `track`, `track-rationale` and `round` outright

At the time, `fast` meant to the CLI what `trivial` did: `tasks.md` and `review/issues.md
` could be absent. Slice 5 removed both obligations from **both** modes, so what `fast` means
now is only what it always meant to *you*: a reproducible defect, a local fix, and no public
contract / data shape / permission / deploy / cross-system surface touched. Anything else is
`standard`. (`current-step` in the diff above is itself retired — see the slice-5 section.)

**There is no compatibility window, and a legal `mode` does not buy one.** Any of the four
keys refuses on its own — even standing next to a correct `mode` line — because a stale row
that rides along is exactly how a bundle comes to *look* migrated without being it. `gate`
(C3), `archive` (RESULT: NOT READY) and `status` all name the keys they found; `doctor`
reports it as a D7 finding without blocking its other diagnostics. Edit the file: one line in,
four lines out.

---

## 3.4.x → 4.0.0 — the change bundle

Everything a change produces now lives in ONE directory: `apriori/changes/<name>/`. The five pre-4.0 scattered roots cease to exist: `requirement/`, `spike/`, `apriori/review/`, `apriori/design/`, `apriori/explore/`.

**Detection.** `apriori doctor` (D8) and `apriori update` name any legacy root they find. A project that still carries them after a CLI upgrade is in a MIXED layout — the protocol files speak 4.0 while the artifacts sit in 3.x paths; migrate before starting the next change.

**Manual migration mapping** (per change; `<name>-` prefixes are stripped, collisions mean stop and resolve by hand):

| legacy | bundle home |
|---|---|
| `requirement/<name>-req-v{N}.md` / `-req-final.md` / `-intent-card.md` | `apriori/changes/<name>/requirement/req-v{N}.md` / `req-final.md` / `intent-card.md` |
| `apriori/review/<name>-issues.md` | `…/<name>/review/issues.md` |
| `apriori/review/<name>-req-review-vN(.md/-raw.*)` | `…/review/req-review-vN(.md/-raw.*)` |
| `apriori/design/<name>-review-vN.md` (+ its raws) | `…/review/spec-review-vN.md` (+ `-raw.*`) |
| `apriori/review/<name>-{impl,p8,step5}-review-vN(…)` | `…/review/step5-review-vN(…)` |
| `apriori/explore/<name>-gap-report.md` | `…/<name>/gap-report.md` |
| `spike/` (explore track) | `…/<name>/spike/` — or delete it (it is disposable by protocol) |
| anything else `<name>-X` under review/design | `…/review/X` (prefix stripped, basename kept) |

Archived changes get the same treatment inside `apriori/changes/archive/<stamp>-<name>/`. Node ≥ 22 is required; the CAS stamp on mutation deltas is now enforced by `archive` (deny by default — `--no-cas` / `| cas | optional |` waive visibly).

## 3.4.0 → 3.4.1

Convention-only (no CLI behavior change): name requirement docs `requirement/<change>-req-v{N}.md` (finalized `<change>-req-final.md`; explore track `<change>-intent-card.md`) instead of the old global names, and at STEP6 copy them into the archived change dir per the runbook's new preservation clause. Existing archived changes keep their old names — nothing parses these filenames.

## 3.3.x → 3.4.0

Nothing on a documented success path changes. Five error-path behaviors are new — all fail-closed tightenings; each names its cure when it fires:

| situation | before | now |
|---|---|---|
| delta with a misspelled section heading / misplaced structure / stray stamp | content silently landed in the wrong bucket or vanished | line-numbered problem; `verify --change` exit 2, `archive` exit 1 |
| test output whose TAP plan doesn't match the parsed results (or duplicate test numbers, or two plans) | could verify GREEN | infra error: verify exit 2, gate ERROR |
| `apriori update` on a file it didn't create, or one you edited | overwritten with the template | reported (`unmanaged` / `modified`) and left byte-identical — delete + `apriori init --tools <t>` to hand a file back |
| ledger row with a status outside the vocabulary; archived change with non-terminal rows | gate C4 passed | C4 blocks naming the row (vocabulary: `open / fixed / rejected+reason / verified / rejected-verified / waived / advisory-acked`) |
| unstamped MODIFIED/REMOVED/RENAMED delta at the gate | passed silently | **C7 blocks by default** — run `apriori stamp <store-file>`, or waive visibly (`gate --no-cas`, or a `| cas | optional |` process-config row). verify/archive only warn this minor; stamps become mandatory in 4.0 |

Additive: `apriori/managed.json` (written by init/update — track it in git), `projection.unstampedMutations` + `projection.notes` in `verify --change --json`, gate C7 in output/`--json`, the runbook's external-side-effect authorization rule and ledger vocabulary sections (both editions), a post-archive `gate` run required at STEP6, and a stamped delta that already fully committed now re-runs cleanly (the CAS rerun repair).

## 3.2.x → 3.3.0

**Strict argument parsing.** Nothing on a documented success path changes. Three error-path behaviors are new, all fail-closed:

| you typed | before | now |
|---|---|---|
| `apriori <sub> --typo-flag` | silently ignored (verify could fall back to the config and verify the WRONG spec set, green) | exit 2 naming the flag |
| `apriori new a b` | `b` silently ignored | exit 2 naming `b` |
| `apriori stamp --foo` | `--foo` treated as the store-file positional | exit 2, unknown flag |
| `apriori verify --specs a -x ...` | `-x` consumed as a spec path | exit 2 naming `-x` |

If a script of yours relied on silent-ignore, the exit-2 message names exactly what to remove. Every subcommand now answers `--help`.

**README/docs layout.** The handbook moved: concepts/workflow/example → `docs/concepts.md`, legacy guidance → `docs/legacy.md`, CI snippets → `docs/ci.md`, CLI reference + configuration → `docs/cli.md`, troubleshooting → `docs/troubleshooting.md` (all with `_cn` mirrors). Old deep links into README sections should point at the docs files.

## 3.0.x → 3.1.0

**Deprecated blocks stop being demanded (the one behavior change).** Before 3.1, a requirement archived via `## REMOVED Requirements` kept demanding its scenarios' tests forever (the deprecated block still carried `#### Scenario:` headings). From 3.1, every `verify` form excludes deprecated blocks; a test still tagged with a removed scenario's ID reports as ORPHAN. **Action:** delete tests for removed scenarios — ORPHAN is the reminder, not a bug.

**New, all opt-in / additive:** `verify --change` (use it as the mid-change STEP5 gate — the runbook was updated accordingly), `archive --change`, CAS base stamps (`apriori stamp`; unstamped deltas behaved exactly as before THEN — since 4.0.1 archive denies unstamped mutation deltas by default), stricter delta hygiene (deltas that were silently collapsing — duplicate requirement names, malformed stamps — now error; they were corrupt input all along).

## 2.x / 1.x → 3.x

The 1.x/2.x lines used the OpenSpec adapter and live on their own branches (`main`, `v2`) — there is no in-place migration; 3.x is a reimplementation of the same artifact interface as a zero-dependency CLI. Start fresh with `apriori init` and copy your spec content into `apriori/specs/` (the Requirement/Scenario format is unchanged).
