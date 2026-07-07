---
description: Drive a change through the apriori spec-driven workflow to the next human gate
---
<!-- Install: copy this file to your project as .claude/commands/apriori.md, then run: /apriori <change-name> -->

Follow the project runbook at `docs/apriori/runbook.md` for change: $ARGUMENTS

1. Read `docs/apriori/runbook.md` in full, then `docs/apriori/changes/$ARGUMENTS/flow-state.md`. If the state file doesn't exist, size the change per runbook §2 (ask me for the tier if it's unclear) and create the state file per runbook §3.
2. Continue from the recorded `next-action`, obeying the three hard rules (runbook §1) — stop at every human gate, reviews must be genuinely external, everything lands on disk.
3. Advance ONLY to the next human gate, then stop and report: current step, what changed, reviewer verdict lines verbatim, open/rejected ledger items, and the decision you need from me.
