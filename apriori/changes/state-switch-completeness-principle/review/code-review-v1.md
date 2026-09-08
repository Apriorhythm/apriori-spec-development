<!-- provenance: provider=anthropic model=claude-opus-5 session=unknown date=2026-08-29 -->

# Independent review — state-switch-completeness-principle (round 1)

Reviewer: independent session, read-only posture. No RUNBOOK, source, test or implementation
file was modified; nothing was committed, pushed, released or archived.

## What was reviewed

The diff is exactly two lines: one appended clause at the end of the P2 `[Build & Test]`
paragraph in `RUNBOOK.md`, and its Chinese counterpart in `RUNBOOK_cn.md`. No code, no CLI
surface, no schema, no template, no test.

Added (EN):

> That test must prove all three: the new state has taken over, the old state has actually
> exited, and the old state produces no more conflicting behavior or side effects — a menu
> item or keyboard shortcut left wired to the old path, a worker still consuming the old
> queue, a write path or permission still active, all count as the old state not exiting.

## Findings against the review targets

**1. Generality — PASS.** The rule frame ("cross-component operation", "state") carries no
domain. The four exemplars span UI wiring (menu item / keyboard shortcut), async consumers
(worker still consuming the old queue), persistence (write path) and authority/side effects
(permission still active). Backend, async worker, write path and permission/side-effect
surfaces are all named explicitly. This is not a frontend-only rule.

**2. Semantics — PASS.** The three obligations map one-to-one onto takeover / exit /
no-residual-conflict, and the exemplar list defines "exit" behaviorally (still wired, still
consuming, still active) rather than by internal state flags. That is the correct framing:
it makes the property observable from outside.

**3. Test-boundary connection — PASS, with a wording observation (P2-a).** The clause binds
by anaphora to the immediately preceding "one full user-flow test in the highest common
container over the transition". Because a single test must now observe both takeover and
exit, the boundary requirement follows by derivation rather than by restatement — a sound
design that avoids duplicating the container rule. The observation is that the antecedent
sentence is modal ("Prefer …"), so a producer who declines the preferred shape has no
stated referent for "That test". Behaviorally minor; see P2.

**4. Overfitting — PASS.** `grep -niE "actual budget|actualbudget|selected-tags|selectedtags|managetags|R03|oracle"`
over both runbooks returns nothing. No experiment-specific artifact, product name, tag
vocabulary or scenario ID leaked into normative text.

**5. Process complexity — PASS.** No new phase, gate, config key, schema, template, checker
or mandatory field. The change extends an existing sentence in an existing prompt, in place.
`grep -rln "highest common container|最高共同容器"` over the whole repo (excluding `.git`,
`node_modules`) matches only `RUNBOOK.md` and `RUNBOOK_cn.md`, so the rule stays
single-sourced — it was not also copied into `templates/`, `docs/` or the §4 narrative.

**6. EN/CN sync — PASS.** The Chinese clause is placed at the same position in the same
sentence and is semantically equivalent, obligation for obligation, exemplar for exemplar.
Two harmless renderings: CN prefixes 旧 to the menu-item and write-path/permission exemplars
where EN leaves them unmarked, and CN adds 同时 where EN says "all three". Neither changes
what is required. No drift worth acting on.

**7. Docs-only, no delta spec — REASONABLE.** The added text is prompt prose. It creates no
executable behavior, and no module under `apriori/specs/` owns "the runbook's own wording".
Writing a delta spec here would either (a) restate prose as a requirement no TAP test can
bind — which `archive` would then merge permanently into `apriori/specs`, polluting the
store with an unverifiable requirement — or (b) require inventing a new `check --self`
assertion, i.e. exactly the new checker this change is scoped to avoid. The contrast with
the archived `2026-07-12T1701-runbook-version-sync` is instructive: that runbook change
carried a spec precisely because it shipped an executable CK-11 assertion. This one does
not. The producer's decision is correct, and RUNBOOK.md's own carve-out ("docs-only
projects: `apriori check` stands in for `npm test`" … "the independent review is the
instrument there — that is not a downgrade") is the governing text.

## The open issue: `gate --review-ready` exit 2

Reproduced independently, and the blast radius is wider than the producer recorded:

| command | exit |
|---|---|
| `apriori gate --change … --review-ready --test-cmd "apriori check"` | 2 |
| `apriori gate --change … --json` (full) | 2, `result: ERROR` |
| `apriori verify --change … --test-cmd "apriori check"` | 2, `RESULT: ERROR` |
| `apriori archive --change … --changes-dir apriori/changes` (dry run) | 2 |

All four fail on the same root: `lib/archive-merge.js:344` classifies a `specs/` directory
with zero `*.md` as a VALIDATION error, and `verify`/`gate`/`archive` all route through
`discoverDeltas`. So this change cannot pass review-ready *and* cannot archive.

**Judgement: this is an acceptable, pre-existing process limitation — not a P0/P1 against
this diff.** Reasons:

1. It is not caused by the diff. Any prose-only runbook change on this repo hits it
   identically; the gap predates this change and is a property of the tool's spec-centric
   admission rule meeting the runbook's own docs-only carve-out.
2. The only ways to make the gate exit 0 are to fabricate a scenario (misrepresenting what
   was tested, and permanently polluting `apriori/specs` at merge) or to add a docs-only
   mode to `gate`/`archive` (a new mechanism, out of this change's scope and a separate
   change's work). Both are worse than the honest record.
3. Substituted evidence is real and was verified independently, not taken on the producer's
   word: `apriori check` → `RESULT: PASS`; `node scripts/run-tests.mjs` → **611 pass / 0
   fail**, including the EN/CN runbook consistency assertions. Per RUNBOOK §4, the
   independent review is the instrument where no executable one exists — this review is it.
4. Precedent exists on disk: `2026-07-11T0303-release-docs` and `2026-07-11T0308-python-example`
   are archived with empty `specs/`.
5. The producer left it in `## Open` for the reviewer instead of working around it. That is
   the correct behavior and is what a REVISE would otherwise be enforcing.

**But it is not free, and the record should not pretend otherwise.** The consequence carries
past review: `apriori archive --write` will also exit 2, so the runbook's normal four-action
close cannot execute for this change as the tooling stands. That is an owner decision, not a
reviewer or producer one — see P2-b. It does not make the *content* of this change wrong.

## P0

None.

## P1

None.

## P2 (observations — none blocking, none requiring rework)

- **P2-a — anaphoric anchor.** "That test" leans on a "Prefer …" sentence. If a future edit
  ever revisits this paragraph, anchoring the obligation to the test boundary itself (e.g.
  "the test boundary chosen must be high enough to prove all three") would make the
  requirement independent of whether the producer took the preferred shape. Not worth an
  edit on its own.
- **P2-b — closeout path is an owner call.** Since `gate` and `archive` both exit 2 here,
  closing this change requires the owner to choose: record the substitution in `gates:` and
  close outside the tool, or open a separate change that gives `gate`/`archive` a docs-only
  admission mode. Do **not** fabricate a delta spec to make the exit code green.
- **P2-c — exemplar balance.** Two of the four exemplars are UI-shaped (menu item, keyboard
  shortcut) and two are server-shaped (queue consumer, write path/permission). The balance is
  adequate; no change needed. Noting it only so a future edit does not drift further toward UI.
- **P2-d — "component" in "cross-component operation"** reads UI-ish to some readers. This is
  pre-existing wording, untouched by this diff, and out of scope here.

## Risk surfaces examined / not examined

Examined: the complete diff; both runbooks' surrounding §4 Build & Test and §5 P2/P3 context;
repo-wide single-sourcing of the rule; EN/CN semantic parity; overfitting term sweep;
`lib/archive-merge.js` `discoverDeltas` and `lib/gate.js` C6 mapping; archived-change
precedent for empty `specs/`; the full test suite and `apriori check`.

Not examined: runtime behavior of `verify`'s TAP binding beyond the exit-2 path (no delta
specs exist to bind); the E2E/visual layer (none applies to a prose change); `apriori/truth/`
(no module contract is touched, so no KB write is owed).

## Commands run

```
git status --short
git diff -- RUNBOOK.md RUNBOOK_cn.md
node scripts/run-tests.mjs                                  # 611 pass / 0 fail
node bin/apriori.js check                                   # RESULT: PASS
node bin/apriori.js gate  --change … --review-ready --test-cmd "node bin/apriori.js check"   # exit 2
node bin/apriori.js gate  --change … --json                 # exit 2, result ERROR
node bin/apriori.js verify --change … --test-cmd "…"        # exit 2, RESULT: ERROR
node bin/apriori.js archive --change … --changes-dir apriori/changes   # dry run, exit 2
grep -niE "actual budget|selected-tags|managetags|R03|oracle" RUNBOOK.md RUNBOOK_cn.md   # no matches
grep -rln "highest common container|最高共同容器" . --exclude-dir=.git --exclude-dir=node_modules
```

VERDICT: ACCEPT
