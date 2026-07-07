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
