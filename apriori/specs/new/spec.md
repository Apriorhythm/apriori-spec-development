### Requirement: new scaffolds an in-flight change
`apriori new <name>` SHALL create `apriori/changes/<name>/` with a flow-state skeleton (`phase: ground`, a placeholder for `lineage` — 6.2 writes no `mode:` line, the field being optional and inert, and neither `tier`, `track` nor `current-step` is emitted; a scaffold note in gates) and a `specs/` staging dir, enforcing the bare-name discipline.

#### Scenario: NW-01 scaffolds flow-state skeleton and specs dir
- WHEN `apriori new add-playback` runs in a project
- THEN `apriori/changes/add-playback/flow-state.md` exists with `change: add-playback`, `phase: ground` and a `lineage` placeholder — and neither a `mode:`, a `tier:`, a `track:`, a retired `current-step:` nor any lane/track wording anywhere in it — plus a dated scaffold note in gates; `apriori/changes/add-playback/specs/` exists

#### Scenario: NW-02 refuses an existing change or the reserved archive name
- WHEN the target change dir already exists, or the name is `archive`
- THEN it refuses with a clear error and exit 1, writing nothing

#### Scenario: NW-03 enforces bare kebab-case names
- WHEN the name is not bare kebab-case (uppercase, spaces, a `2026-…` date prefix, or empty)
- THEN it refuses (exit non-zero) and the error explains dates are stamped at archive time, not at creation

#### Scenario: NW-04 the skeleton carries the full flow-state schema
- WHEN `apriori new` scaffolds flow-state.md
- THEN every field of the runbook §3 schema is present — the keys `lineage`/`phase`/`reviewer-session`/`delivery`, and the three short sections `## Reality Check`, `## Open` (its comment showing `- <ID>: <text>`), `## Next` — and neither `mode:`, `## Evidence` nor the retired `artifact-root:` (legacy files carrying it stay readable), so the scaffold never drifts behind the schema

### Requirement: the scaffold builds the bundle skeleton and no document family
`apriori new <name>` SHALL scaffold exactly `flow-state.md` plus empty `specs/` and `review/` directories under `apriori/changes/<name>/`. It SHALL NOT create `requirement/`, and it SHALL NOT write or name any fixed per-change document — no requirement doc, proposal, design, gap report, task list or issue ledger — because 6.0 produces material on demand rather than by obligation. The state's `## Next` line is advisory text; no behavior depends on the empty dirs existing.

#### Scenario: NW-05 the scaffold is a two-directory bundle with no artifact obligations
- WHEN `apriori new my-change` runs
- THEN `apriori/changes/my-change/` contains flow-state.md plus empty `specs/` and `review/` dirs and nothing else; no `requirement/` dir exists; and neither the created tree nor the flow-state text names `req-v1.md`, `req-final.md`, `proposal.md`, `design.md`, `tasks.md`, `gap-report.md` or `issues.md`

#### Scenario: NW-06 the scaffold states the split test rather than a first document to write
- WHEN `apriori new my-change` prints its next step
- THEN it points at Ground and the Reality Check, and states the one-result / one-evidence-chain split test — it never instructs the human to draft a fixed artifact
