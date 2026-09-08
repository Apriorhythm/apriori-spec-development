<!-- reconstructed fixture — not an original artefact; no base stamp, this never ran -->

## MODIFIED Requirements

### Requirement: mainboard fallback attribution

#### Scenario: BR-007 a mainboard fallback is attributed unless the conflict is genuine
- WHEN an order falls back to the mainboard and the machine has a recorded swap
- THEN the order is attributed to the rebuilt machine, not held as a conflict
