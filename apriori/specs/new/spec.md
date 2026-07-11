### Requirement: new scaffolds an in-flight change
`apriori new <name>` SHALL create `apriori/changes/<name>/` with a flow-state skeleton (STEP0, placeholders for tier/track/lineage, a scaffold note in gates) and a `specs/` staging dir, enforcing the bare-name discipline.

#### Scenario: NW-01 scaffolds flow-state skeleton and specs dir
- WHEN `apriori new add-playback` runs in a project
- THEN `apriori/changes/add-playback/flow-state.md` exists with `change: add-playback`, `current-step: STEP0`, placeholders for tier/track/lineage, and a dated scaffold note in gates; `apriori/changes/add-playback/specs/` exists

#### Scenario: NW-02 refuses an existing change or the reserved archive name
- WHEN the target change dir already exists, or the name is `archive`
- THEN it refuses with a clear error and exit 1, writing nothing

#### Scenario: NW-03 enforces bare kebab-case names
- WHEN the name is not bare kebab-case (uppercase, spaces, a `2026-…` date prefix, or empty)
- THEN it refuses (exit non-zero) and the error explains dates are stamped at archive time, not at creation

#### Scenario: NW-04 the skeleton carries the full flow-state schema
- WHEN `apriori new` scaffolds flow-state.md
- THEN every field of the runbook §3 schema is present — including `reviewer-session: n/a` and `artifact-root: .` — so the scaffold never drifts behind the schema

### Requirement: the scaffold builds the bundle skeleton
`apriori new <name>` SHALL scaffold the bundle skeleton: `flow-state.md` plus empty `requirement/` and `review/` directories under `apriori/changes/<name>/`, with the flow-state `next-action` line reading `draft apriori/changes/<name>/requirement/req-v1.md (or the intent card on the explore track)` — the change's own name substituted, no legacy-root literal emitted. The next-action is advisory text; no behavior depends on the empty dirs existing.

#### Scenario: NW-05 the scaffold is a bundle
- WHEN `apriori new my-change` runs
- THEN `apriori/changes/my-change/` contains flow-state.md plus empty `requirement/` and `review/` dirs, the next-action line reads `draft apriori/changes/my-change/requirement/req-v1.md (or the intent card on the explore track)`, and the flow-state contains no standalone legacy-root literal
