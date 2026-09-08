<!-- apriori-base: sha256:dbdd9f0687f4de2fbb09339b99549a63ba37a70517fef850052556bc2f7fccc3 -->
# Delta — new (change-bundle)

## RENAMED Requirements
- the scaffold points at the prefixed requirement path -> the scaffold builds the bundle skeleton

## MODIFIED Requirements

### Requirement: the scaffold builds the bundle skeleton
`apriori new <name>` SHALL scaffold the bundle skeleton: `flow-state.md` plus empty `requirement/` and `review/` directories under `apriori/changes/<name>/`, with the flow-state `next-action` line reading `draft apriori/changes/<name>/requirement/req-v1.md (or the intent card on the explore track)` — the change's own name substituted, no legacy-root literal emitted. The next-action is advisory text; no behavior depends on the empty dirs existing.

#### Scenario: NW-05 the scaffold is a bundle
- WHEN `apriori new my-change` runs
- THEN `apriori/changes/my-change/` contains flow-state.md plus empty `requirement/` and `review/` dirs, the next-action line reads `draft apriori/changes/my-change/requirement/req-v1.md (or the intent card on the explore track)`, and the flow-state contains no standalone legacy-root literal
