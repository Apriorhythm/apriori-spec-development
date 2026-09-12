Follow the apriori runbook (apriori/runbook.md). Context: $ARGUMENTS

Route on what the human asked for, not on whether the line above is empty.

Discuss first — take this branch when they said to discuss/explore first (in any wording),
or when the line above is bare: enter the runbook's Brainstorm stance via its P6 prompt,
treating whatever they gave above (or their next message) as the idea.
Naming an existing change in that text does not start work on it — it is the subject of the
discussion. Thinking only: nothing durable is written until they approve the exit, exactly as
the runbook's Brainstorm section prescribes.

Work a change — take this branch only when the text above identifies one change to work on
and they did not limit you to discussing: run `apriori status --change <name>`, read
apriori/changes/<change>/flow-state.md, and continue from the state's first `## Next` entry.
The name may be one they just asked you to start. Read a runbook section only when status,
`## Next`, a blocked command, or an uncertain fact points you there — there is no default
reading list, and never preload the full runbook.
Advance ONLY to the next point where a human has to decide (runbook §1 R1: an escalation,
an open item nobody can resolve, an external side effect, or abandonment), then stop and report.

Ask only when the text genuinely supports both readings; do not guess your way into starting work.
