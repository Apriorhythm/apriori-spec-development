# Migrating

The 3.0.0 stability promise: CLI surface & flags, `--json` shapes, the delta format, the flow-state schema and the `apriori/` layout only break in a major. Everything below is either additive or a declared fail-closed tightening.

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
no consumer, so the dynamic caps they claimed to set are gone. STEP5's `/goal` recipe in
RUNBOOK §6 still carries a fixed **25-turn safety bound** — it is simply no longer configurable:
reaching turn 25 with any success condition unmet means stop and report the failing evidence,
never a pass. STEP6's recipe has no bound and stops on its exit conditions.

**What still stops a review loop** is exactly what slice 2 made mechanical: the derived
per-family review round (`gate` C8), archive readiness R4, and the human gates. Those govern
**review rounds only** — they do not govern, and never terminate, STEP5's implementation/test
turns.

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
  - 2026-08-23T10:00 gate⑤ (owner): reframe spec-review round 2 split — the change is two changes
```

Legal decisions are `split`, `tests` and `redo`; at round 5 the owner also has `accept-risk`.
The entry names the family AND the round it answers, so it never silently pre-authorizes the
next round or another family's loop. It does not waive evidence problems — those are fixed.

**Your existing review documents almost certainly already pass.** The verdict vocabulary accepts
`N issues open` and `N issues found`, singular or plural, any case, with or without a trailing
period, plus the accept and revise phrasings and the hotfix lane's `role=`/`digest=`/`boundary=`
trailers. `0 issues open` reads as an accept. A document whose body was pasted twice with the
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

`fast` means the same thing to the CLI that `trivial` did — `tasks.md` and `review/issues.md`
may be absent (gate C2/C4 `n/a`, archive readiness R2/R3 `n/a`). What it means to *you* is
narrower: a reproducible defect, a local fix, and no public contract / data shape / permission
/ deploy / cross-system surface touched. Anything else is `standard`.

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
