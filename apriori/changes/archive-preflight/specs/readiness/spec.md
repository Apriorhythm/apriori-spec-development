<!-- apriori-base: new -->

## ADDED Requirements

### Requirement: one shared implementation of the bundle predicates, with an archive-only overlay above it
The predicates that judge a change bundle — the ledger status vocabulary, the `gates:` waiver evidence, the review-root guard, and the tasks / flow-state / ledger checks — SHALL live in ONE module that both `gate` and `archive` depend on, reachable without a dependency cycle. That module's BASE layer SHALL be the behaviour `gate` had before this change, unchanged down to its file-existence semantics and diagnostic text: moving code must not silently make `gate` stricter. Everything `archive` needs beyond that — the `STEP6` narrowing and the structural safety guard — SHALL live in a separate OVERLAY that only `archive` calls, and the overlay SHALL only ever be stricter than the base, never looser.

#### Scenario: RY-01 the base layer and gate agree, item by item
- WHEN the same set of change bundles is judged by the base-layer checks and by `gate`'s C2, C3 and archived-stage C4
- THEN every verdict and detail string agrees — they are one implementation, not two that happen to match today

#### Scenario: RY-02 gate's existing behaviour survives the move
- WHEN `gate` runs against bundles whose tasks, ledger or `review/` are structurally odd — a symlink, the wrong file type — in the cases that do NOT raise
- THEN its returned check objects and detail bytes are identical to their pre-change values; and in the cases that DO raise, the stable surface (error class, code, message) is identical, while stack file names and line numbers are explicitly outside the compatibility promise, because moving a function between files must change them

#### Scenario: RY-03 the archive overlay guards before it reads, and guards the evidence ROOT before the ledger leaf
- WHEN the overlay judges tasks, the ledger or the flow-state
- THEN it completes the structural safety check on that path BEFORE the base layer performs any content read, so a symlink is never followed and a read error never escapes unstructured; a defect found by the guard is reported as structural and is never forcible
- AND WHEN it judges the ledger specifically THEN it guards the `review/` ROOT before it looks at `review/issues.md` — a `review/` that is itself a symlink to another directory INSIDE the bundle leaves the leaf file perfectly normal and contained, so guarding only the leaf would let archive pass while gate's C4 blocks on the root, breaking the whole archive-pass-implies-gate-passes promise

#### Scenario: RY-04 the step narrowing belongs to archive alone
- WHEN the flow-state is legal but its `current-step` is any value other than `STEP6`
- THEN the archive flow-state check blocks while `gate`'s C3 passes — the two are deliberately different; and for every input, an archive pass implies a gate C3 pass, so the overlay can only tighten

#### Scenario: RY-05 each side calls only its own layer
- WHEN the source of `gate` and of `archive-merge` is inspected
- THEN `gate` names only the base-layer checks and never the archive overlay, `archive-merge` reaches the base layer only through the overlay, and neither re-implements the resolver's namespace rules
