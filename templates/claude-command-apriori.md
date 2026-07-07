---
description: Drive a change through the apriori spec-driven workflow to the next human gate
---
<!-- Install: copy this file to your project as .claude/commands/apriori.md, then run: /apriori <change-name> -->

Follow the project runbook at `docs/apriori/runbook.md` for change: $ARGUMENTS

1. Read `docs/apriori/runbook.md` — in full on kickoff; on resume, at least its context-economy minimal set — then `process-config.md` at the project root (missing → use the runbook's defaults; suggest copying `templates/process-config.md`; never write it yourself), then `docs/apriori/changes/$ARGUMENTS/flow-state.md`. If the state file doesn't exist, size the change per runbook §2 — both axes: tier AND track (ask me when either is unclear; certainty default: harden) — and create the state file per runbook §3 with `track` and `track-rationale` filled in.
2. Continue from the recorded `next-action`, obeying the three hard rules (runbook §1) — stop at every human gate (explore track: intent-card sign-off is mine and can never be consolidated away), reviews must be genuinely external, everything lands on disk.
3. Advance ONLY to the next human gate, then stop and report: current step, track + rationale, what changed, reviewer verdict lines verbatim, open/rejected ledger items, and the decision you need from me.
