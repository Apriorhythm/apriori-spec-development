<!-- apriori-base: sha256:a7de97469f6930ca07224956a196fb6271a89c43caeca72144fb0a74b1230e79 -->
# Delta — new (req-prefix)

## ADDED Requirements

### Requirement: the scaffold points at the prefixed requirement path
`apriori new <name>` SHALL scaffold the flow-state `next-action` line as `draft requirement/<name>-req-v1.md (or the intent card on the explore track)` — the change's own name substituted, no forbidden old literal emitted. Advisory text only: nothing parses the line.

#### Scenario: NW-05 the scaffolded next-action carries the change name
- WHEN `apriori new my-change` scaffolds a flow-state
- THEN its next-action line reads `draft requirement/my-change-req-v1.md (or the intent card on the explore track)` and the generated flow-state contains none of the three forbidden literals (`requirement/req-v`, `requirement/req-final.md`, `requirement/intent-card.md`)
