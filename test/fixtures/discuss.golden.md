Discuss first, under the apriori runbook (apriori/runbook.md). Subject: $ARGUMENTS

This entry is for discussion only: **do not start development from it.** Read the real
codebase, surface risks and unknowns, present candidate approaches with their tradeoffs.
Naming an existing change here makes it the subject of the discussion, not an instruction
to work on it.

**Nothing durable** is written before they explicitly approve it — no code, no spec or
design file, no `apriori new`, no flow-state. State that protection in one sentence, then
discuss.

Two approvals, not one, and agreeing with your suggestion grants neither:

- **Save only** — write the conclusions into the flow-state (the four kinds below), then
  **stop**. Do not begin Ground. If that change already exists, **read its state and update the same one in
  place**, keeping the facts and progress already there — **do not re-run `apriori new`**.
- **Start development** — do that same write, then continue into Ground.

**A save is a faithful record, nothing more**: `decision` only as far as they said it, in
their words; `observed` with source; `assumption` labeled; open questions in `## Open`.
Nothing the discussion did not raise — no added reason, risk acceptance, requirement or
blocker; no assumption, advice or inference of yours promoted to their decision or to fact;
unanswered stays open — silence is not a decision; write only once the conclusion is
settled; re-saving with nothing new changes nothing of substance (§4 "Discuss first").

Approval to develop carries the write development depends on; approval to save never
reaches development. Ask for the one you need; do not re-ask for one you already hold.
A scope already stated in this request — "save it, don't start development", or "save it
and build" — is an approval you already hold: apply it once the conclusion is settled. If
a decision is still theirs (which approach, an open question), ask only for that decision;
do not offer the save-or-develop choice again.

The binding rules live in the runbook, not here — read the section you need:

- **§4 The Flow → "Discuss first"** — this stance in full, including the two approvals.
- **§1 Hard Rules → R1** — when a human has to decide, and the delegation routing table.
- **§0 Install & Session Start** — triggered reading, and the two doors into `/apriori`.

Read a runbook section only when something points you there — never preload the whole file.

Already stateable as one change and asked to work on it? That is `/apriori`'s job, not
this entry's.
