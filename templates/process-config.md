# process-config — supervision parameters (HUMAN-HELD)

<!-- Lives at `apriori/process-config.md` (scaffolded there by `apriori init`).
     Governance: this file is owned by a human; the agent READS it and never writes it (RUNBOOK §1 R3).
     Missing file → the defaults printed in RUNBOOK §4 apply.
     Invalid value (< 1, or unparsable) → the default applies, with a warning.
     Every review-stage cap has a hard floor of 1 — no review stage ever goes to zero. -->

| Field | Value | Legal range | Default |
|---|---|---|---|
| language | auto | auto (match the human) / any language name, e.g. `中文`, `English` | auto |
| cas | required | required = archive denies unstamped mutation deltas / optional = warn only (waiver visible) | required |
| step0-cap | 5 | ≥ 1 | 5 |
| step2-cap | 4 | ≥ 1 | 4 |
| step5-cap | 25 | ≥ 1 | 25 |
| step6-cap | 4 | ≥ 1 | 4 |
| spike-cap | 10 | ≥ 1 | 10 |
| extraction-review-cap | 2 | ≥ 1 | 2 |
| shrink-state | none | none / <stage>: <new-cap> entries, human-approved only | none |
| rejected-ratio-guard | 50% | 0–100%; above it, shrinking is blocked | 50% |
| shrink-proposal-freq | 5 | ≥ 1 — a proposal every N changes | 5 |
| post-merge-review-freq | 1 in 5 | ≥ 1 in N merged changes (sampling rate) | 1 in 5 |

<!-- shrink-state is written only after a human gate approves a shrink proposal (RUNBOOK §6),
     e.g. `shrink-state: step2-cap: 2 (approved 2026-07-04, gates log)`.
     A post-merge re-review that finds a high-risk miss restores the previous cap. -->
