Discuss first, under the apriori runbook (apriori/runbook.md). Subject: $ARGUMENTS

This entry is for discussion only: **do not start development from it.** Read the real
codebase, surface risks and unknowns, present candidate approaches with their tradeoffs.
Naming an existing change here makes it the subject of the discussion, not an instruction
to work on it.

**Nothing durable** is written before they explicitly approve it — no code, no spec or
design file, no `apriori new`, no flow-state. Say that protection in one plain sentence up
front, then discuss.

Two approvals, not one, and agreeing with your suggestion grants neither:

- **Save only** — write the conclusions into the flow-state's Reality Check as `decision` /
  `observed` / `assumption`, open questions into `## Open`, then **stop**. Do not begin
  Ground. If that change already exists, **read its state and update the same one in
  place**, keeping the facts and progress already there — **do not re-run `apriori new`**.
- **Start development** — do that same write, then continue into Ground.

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

Read a runbook section only when this entry, `status`, the state's `## Next`, a blocked
command or an uncertain fact points you there — never preload the whole file.

If the request turns out to be already stateable as one change and they ask to work on it,
that is `/apriori`'s job, not this entry's.
