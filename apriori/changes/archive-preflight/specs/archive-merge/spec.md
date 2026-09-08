<!-- apriori-base: sha256:606fc080d3f86c6d689983ad3323c42ca95df4fa7a4873371e03e4ba5d9a8721 -->

## MODIFIED Requirements

### Requirement: high-level archive merges a whole change transactionally
`apriori archive --change <name>` SHALL discover every `.md` delta file under `<changes-dir>/<name>/specs/` (`--changes-dir` defaults to `apriori/changes` and sets both the discovery root and the move root), map each to its store target `apriori/specs/<suffix>` by path suffix, dry-run the whole set by default, and on `--write` commit in four phases — preflight (validate, parse, CAS-check, merge in memory, then READINESS-check the change bundle; any failure anywhere → nothing written), stage (write every `<store>.tmp-archive`), commit (rename each temp in sorted path order), move (only when `--changes-dir` was explicitly passed, only after all stores committed). The guarantee is failure-atomicity up to the commit point; crash durability is not claimed.

#### Scenario: AM-13 a READY change's dry-run reports the whole change and writes nothing
- WHEN `apriori archive --change <name>` runs without `--write` on a READY change spanning several modules
- THEN it prints per-module merged/modified/deprecated/renamed/no-op requirement names and a result line, and no file on disk changes

#### Scenario: AM-48 an unready change's dry-run does not claim a merge
- WHEN the same dry-run runs on a change that fails the readiness preflight
- THEN the readiness failures are reported, the `RESULT: MERGED (dry-run…)` line is NOT printed, the exit code is 1, and still no file on disk changes — a dry-run's whole purpose is to say what `--write` would do

#### Scenario: AM-14 any preflight failure means nothing is written
- WHEN any module's merge reports a conflict, any delta file fails a hygiene guard, or any CAS stamp mismatches during `--write`
- THEN every failure across all modules is reported, no store file changes, and the exit code is 1

#### Scenario: AM-15 a mid-commit failure is reported exactly
- WHEN a rename in the commit phase fails after earlier renames succeeded
- THEN archive reports exactly which modules committed, which did not, and which temp files remain for manual completion, and exits 1 — already-committed renames are not rolled back

#### Scenario: AM-16 a pre-existing temp file blocks the run
- WHEN any target `<store>.tmp-archive` already exists at preflight
- THEN archive exits 1 naming that file, writes nothing, and leaves the pre-existing file untouched (it may be another run in flight or a manual-recovery artifact)

#### Scenario: AM-17 zero discovered delta files fail closed
- WHEN `<changes-dir>/<name>/specs/` exists but contains no `.md` delta files, or the change dir itself is missing
- THEN archive exits 2 naming the searched path

#### Scenario: AM-18 the change-dir move waits for every store commit
- WHEN `--write --changes-dir <dir>` succeeds
- THEN the change dir moves to `<dir>/archive/<stamp>-<name>/` only after ALL stores committed; without an explicit `--changes-dir` no move happens; a move failure leaves the committed stores in place and exits 1

#### Scenario: AM-19 high-level and single-file forms are mutually exclusive
- WHEN `--change` is combined with `--store` or `--delta`
- THEN archive exits 2 with usage; the single-file DISPATCH itself is unchanged, and a single-file call whose inputs are genuinely surgical keeps its previous behavior — but a call whose `--delta` attributes to a formal bundle, or which moves one, is governed by the attribution and readiness requirements below, so the old blanket "single-file behaviour is unchanged" no longer holds

#### Scenario: AM-20 per-file delta hygiene guards the whole set
- WHEN any discovered delta file is empty/whitespace-only, parses to zero operations despite content, or carries duplicate requirement names (within a section or across sections)
- THEN the run refuses naming the file (and requirement, for duplicates), nothing is written, and no partial projection or merge survives

#### Scenario: AM-21 duplicate requirement names in the store are corruption
- WHEN the store text handed to any merge contains the same requirement name twice
- THEN the merge reports it as a conflict instead of silently keeping the last block

#### Scenario: AM-22 realpath containment governs every participating path
- WHEN the change dir, a delta file, a mapped store target, or the move destination (`<changes-dir>/archive/…` — e.g. an `archive/` that is a symlink pointing outside) — each followed through symlinks — resolves outside its root (changes dir / `apriori/specs/`), or a not-yet-existing path's nearest existing ancestor resolves outside its root
- THEN the command exits 2 naming the offending path, and nothing is read as spec input, written, or moved

## ADDED Requirements

### Requirement: archive refuses the irreversible write when the change is not ready
Before staging anything, and after every existing preflight guard has passed, `apriori archive` SHALL evaluate the change bundle's READINESS against the SAME predicates the post-archive gate will apply — gate's full C2 (tasks), C3 (flow-state legality) and ARCHIVED-stage C4 (ledger), reused as one shared implementation rather than reimplemented — plus an archive-only narrowing: `current-step` must be exactly `STEP6`, and the three artifacts must be read through a structural safety guard before any content read. A readiness failure SHALL report through the existing `RESULT: FAILED PREFLIGHT — nothing written` path with exit code 1 and SHALL name the specific object (which key, how many unchecked boxes and the first one's text, which ledger rows and their statuses, which path and which defect). Readiness SHALL be evaluated only after the existing guards; when both fail, the existing guards' diagnostics are the ones reported and readiness is not evaluated at all.

#### Scenario: AM-49 unchecked tasks, non-terminal ledger rows and a wrong step each refuse the write
- WHEN the bundle's `tasks.md` still holds a `- [ ]` box, or its ledger holds a row that is not archive-terminal (`open` / `fixed` / a `rejected` lacking reviewer concurrence), or its flow-state `current-step` is any legal value other than `STEP6`
- THEN archive exits 1 with `RESULT: FAILED PREFLIGHT — nothing written`, naming the count and the first unchecked task, or each offending row ID with its status, or the current value against the allowed set; the store is byte-identical afterwards and the bundle has not moved
- AND WHEN `current-step` is `DONE` THEN the diagnostic says an in-flight bundle contradicts a DONE state — it never asserts the bundle is already archived

#### Scenario: AM-50 flow-state is judged first because it decides the tier
- WHEN the flow-state is missing, structurally unsafe, or illegal (a missing required key, an unfilled placeholder, a value outside the legal vocabulary, or a `change` that does not equal the requested name)
- THEN ONLY that failure is reported — tasks and ledger draw no conclusion, because their missing-file handling is tier-sensitive and the tier is unknowable; and WHEN the flow-state is legal but tasks AND ledger both fail THEN both are reported in one run, never one-at-a-time

#### Scenario: AM-51 a trivial-tier bundle may legitimately lack tasks and a ledger
- WHEN the flow-state declares `tier: trivial` and `tasks.md` or the ledger is absent
- THEN readiness treats that absence as not-applicable exactly as gate C2/C4 do; on medium/large the same absence refuses the write

#### Scenario: AM-52 a structurally unsafe artifact is refused, and is never forcible
- WHEN `tasks.md`, the ledger, or `review/` is a symlink, is the wrong file type, sits behind a bad ancestor, escapes the bundle, or raises a read error after the guard passed
- THEN archive refuses naming the path and the defect kind, `--force` does NOT waive it, and no unstructured exception escapes — broken is not the same thing as unfinished

#### Scenario: AM-53 readiness never disturbs the existing preflight
- WHEN a delta is malformed, a merge conflicts, a CAS stamp has diverged, a temp file pre-exists, or a path escapes containment — with or without a readiness failure also present
- THEN the reported diagnostics, wording and exit code are exactly what they were before this change, and readiness is not evaluated

### Requirement: the resolution namespace must still lead to the bundle this run archives
An archive that moves a bundle SHALL capture its archive timestamp ONCE in preflight and pass that same value to the move, and SHALL refuse — never forcibly — any namespace layout under which the following `apriori gate --change <name>` would resolve to something other than the bundle just moved. It SHALL judge that with the resolver's OWN shared predicate rather than a copy of its rules, covering both trust roots (`<changes-dir>` and `<changes-dir>/archive`), the active entry being moved, and every same-name archived candidate. These checks SHALL run only for invocations that will move a bundle — a dry-run carrying `--changes-dir` included, since it predicts that move — and SHALL be skipped otherwise, so that a no-move invocation can never be blocked by a namespace it does not touch.

#### Scenario: AM-54 the timestamp the check used is the timestamp the move uses
- WHEN the clock advances across a minute boundary, or is rolled back, between the readiness check and the move
- THEN the archived directory that is actually created carries the SAME basename the check compared against — both consume one captured value

#### Scenario: AM-55 a same-name archived directory that would out-sort this run is refused
- WHEN `<changes-dir>/archive/` already holds a directory for this change whose basename sorts at or after the one this run would create (a future timestamp, a rollback-induced inversion, or an exact clash)
- THEN archive exits 1 naming that directory, `--force` does NOT waive it, and nothing is written — otherwise the resolver would answer with the older bundle, or the destination would collide

#### Scenario: AM-56 every structure the resolver would refuse is refused here too
- WHEN either trust root is a symlink pointing inside the changes tree, is not a directory, or escapes; or the active entry being moved is itself a symlink to a real directory inside the changes root, or is not a directory; or a same-name archived candidate is a legal-stamp symlink (sorting either side) or a stamp-shaped directory whose date is not a real calendar date
- THEN archive exits 1 naming the object and the defect, not forcibly, judged by the ONE shared namespace predicate — the resolver shares its smaller private predicates rather than calling the composite scan itself, so the two can never drift and resolution keeps its own fast path

#### Scenario: AM-57 a no-move invocation is never blocked by the namespace
- WHEN `--write` runs without an explicit `--changes-dir`, or a dry-run runs without one
- THEN the namespace checks are not evaluated at all; WHEN a dry-run carries `--changes-dir` THEN they are, because it predicts the same move

#### Scenario: AM-58 a custom changes root gets no post-archive gate promise
- WHEN the move targets a `--changes-dir` other than the canonical `<cwd>/apriori/changes`
- THEN readiness still runs, but the output states that this path carries no post-archive gate guarantee — `apriori gate --change <name>` only ever looks in the canonical root, so the namespace checks cannot promise it will find this bundle

### Requirement: a delta that belongs to a formal bundle is judged as that bundle, and so is the bundle actually moved
The single-file form SHALL decide whether readiness applies by ATTRIBUTING its `--delta`, never by whether `--changes-dir` was passed — that flag governs the move, not the ownership, and a call without it still writes the living store. Attribution SHALL compute BOTH a lexical claim (the normalized path, symlinks unresolved) and a realpath answer, for EVERY delta, against EVERY candidate changes root in play (the default root and any explicit `--changes-dir`, which may be nested inside another root's bundle). Each hit is an IDENTITY of `{root, stage, name, bundle directory}` — a bare change name is not enough, because the same name exists in more than one root and in both stages — and the outcome is decided from the SET of identities both measures produce, not from a pairwise comparison. Candidate roots are the canonical default root and any explicit `--changes-dir`. Each root keeps BOTH forms: its resolved absolute real path, used for identity equality and deduplication so that spelling one root two ways is never a source of ambiguity, AND every absolute LEXICAL spelling it was named by, because the lexical measure deliberately does not resolve symlinks and would otherwise fail to match a delta named through a symlinked root — a fail-open path, since a leaf whose realpath escapes would then attribute to nothing and be waved through as surgical input. Identities compare by resolved absolute bundle directory, never by the caller's spelling. The disposition is an ORDERED, mutually exclusive ladder — the first rule that matches decides, so no input can satisfy two outcomes:

1. the path lexically claims a bundle but its realpath cannot corroborate containment in that same bundle (it escapes, or cannot be resolved) → REFUSE. This safety rule outranks everything below it, so a lexically-attributable delta whose target sits outside its bundle can never be judged "one clean active bundle";
2. otherwise, the set contains ANY identity whose stage is ARCHIVED → REFUSE, whatever else it contains;
3. otherwise, count the DISTINCT active bundle directories in the set: zero → surgical input, previous behavior; exactly one → that bundle's readiness governs, and its name must equal `--change` or the call is refused; more than one → REFUSE as ambiguous. The ambiguous case is reachable within a SINGLE measure when one changes root is nested inside another root's bundle, so a rule comparing only lexical-against-realpath cannot catch it.

Independently of the delta, a single-file call carrying `--changes-dir` SHALL also MOVE `<changes-dir>/<change>`. That MOVE TARGET is a formal bundle in its own right: it SHALL pass the full readiness and namespace checks whatever the delta's attribution says, and when the delta does attribute to a formal bundle, the two SHALL be the same directory or the call is refused. The single captured archive timestamp SHALL feed this move exactly as it feeds the high-level one.

#### Scenario: AM-59 a bundle's delta is judged even when nothing moves
- WHEN `archive --store <store> --delta apriori/changes/X/specs/m/spec.md --change X --write` runs with no `--changes-dir`, and `X` is not ready (for instance `current-step: ABANDONED`)
- THEN archive refuses with the readiness diagnostic and writes nothing — an ABANDONED change may never reach the store, and `--changes-dir` was never the right discriminator

#### Scenario: AM-60 one measure naming a bundle is enough to attribute it
- WHEN the `--delta` path lies lexically outside every changes root but its realpath resolves to an active formal bundle's delta (an external symlink)
- THEN the identity set holds exactly that one active bundle and its readiness governs — the two measures need not AGREE, they need to produce exactly one active answer between them; a delta genuinely COPIED out of a bundle produces an empty set and stays caller responsibility, but a symlink's target does not
- AND WHEN the path lexically claims a bundle while its realpath escapes it THEN it is refused

#### Scenario: AM-70 the same root spelled two ways is one root, and neither spelling is lost
- WHEN the explicit `--changes-dir` resolves to the same directory as the canonical default root — a relative spelling, a trailing separator, or a path through a symlink
- THEN the two collapse to ONE candidate root for identity purposes, so an identical delta yields one identity rather than an ambiguous pair
- AND WHEN the changes root itself is a symlink and the caller names a delta through that symlinked spelling, while the delta leaf's own realpath escapes its bundle
- THEN the lexical measure STILL matches — every lexical spelling of a root stays available to it — so the escape is caught by the ladder's first rule rather than falling through to "attributable to nothing" and being waved past as surgical input

#### Scenario: AM-69 a delta that names two different bundles at once is refused
- WHEN one changes root is nested inside another root's bundle — an explicit `--changes-dir` under `<default-root>/A/specs/…` — so that a single delta path is simultaneously bundle `A`'s delta in the default root and bundle `X`'s delta in the explicit root
- THEN archive refuses as ambiguous rather than picking one: judging `X` while consuming `A`'s delta would let an unchecked (possibly `ABANDONED`) `A` reach the store through the back door

#### Scenario: AM-61 identity must agree on root, stage and directory — a name is not an identity
- WHEN the attributed bundle is not the one `--change` names; or the two measures disagree on root, stage, or directory (a lexically-active path whose realpath lands in the ARCHIVED copy of the same name; the same name under two different changes roots); or EITHER measure lands under `<changes-dir>/archive/<stamp>-X/specs/…` — reached directly or through an external symlink
- THEN archive refuses; every archived case is refused whatever that bundle's flow-state says, so an archived delta can never re-enter the store through an alias

#### Scenario: AM-66 the bundle that gets moved is judged even when the delta is surgical
- WHEN a single-file call passes a genuinely surgical `--delta` together with `--write --changes-dir <dir>`, so the successful path will still move `<dir>/<change>`
- THEN that move target is put through the full readiness and namespace checks on its own account, and an unready or `ABANDONED` move target refuses the whole call with nothing written and nothing moved — otherwise a surgical delta would be cover for archiving a bundle nobody checked

#### Scenario: AM-67 the delta's bundle and the moved bundle must be the same bundle
- WHEN the `--delta` attributes to a formal bundle under one changes root while `--changes-dir` names a DIFFERENT root holding a same-named bundle
- THEN archive refuses rather than checking one directory and moving another

#### Scenario: AM-68 the single-file move consumes the same captured timestamp
- WHEN a single-file call moves a bundle and the clock advances across a minute boundary, or rolls back, between the namespace check and that move
- THEN the directory actually created carries the basename the check compared against — both move paths consume the one captured value, not their own clock reads

### Requirement: --force waives only unfinished work, only with human evidence that already exists
`--force` SHALL waive ONLY the progress classes — unchecked tasks, and ledger rows that are non-terminal but well-formed — and SHALL never waive a structural or format failure, an `ABANDONED` or `DONE` or otherwise illegal `current-step`, a namespace defect, or any pre-existing preflight guard. It SHALL require evidence that ALREADY EXISTS in that bundle's flow-state `gates:` block: the exact token `archive-preflight-waiver` plus the exact class token(s) being waived (`tasks` / `ledger`), matched on token boundaries and case-insensitively, in one entry that may cover several classes. `--force` SHALL NOT write anything into the flow-state — the tool never signs for the human. A waived run SHALL print what it waived, quote the evidence entry, and name the consequence.

#### Scenario: AM-62 force without pre-existing evidence changes nothing
- WHEN `--force` is passed but the flow-state carries no such entry, or carries the waiver token without the class token, or the entry lives in a different bundle
- THEN archive still exits 1 and the diagnostic says which part of the evidence is missing

#### Scenario: AM-63 class tokens match on boundaries, never as substrings
- WHEN the evidence entry contains `tasks-later` or `myledger` rather than the bare class tokens
- THEN it does NOT authorize the `tasks` or `ledger` class; the bare tokens in any letter case do

#### Scenario: AM-64 a waived run says what it waived and what it costs
- WHEN `--force` proceeds on valid evidence
- THEN stdout carries a `WAIVED (--force):` line naming each waived class and quoting the evidence entry's first line, and a `NOTE:` line naming exactly the checks that will now block afterwards — C2 for a tasks waiver, C4 for a ledger waiver, both only when both were waived

#### Scenario: AM-65 the non-forcible classes stay non-forcible
- WHEN `--force` is passed with valid-looking evidence against an `ABANDONED` or `DONE` step, an illegal or unsafe flow-state, a structurally unsafe artifact, a malformed ledger row, a namespace defect, or an existing preflight failure
- THEN each still refuses, and the diagnostic says that class cannot be waived — `ABANDONED` especially, because the runbook forbids that change reaching the store at all
