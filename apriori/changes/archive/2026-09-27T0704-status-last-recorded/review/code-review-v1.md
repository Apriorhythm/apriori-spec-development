<!-- provenance: provider=codex model=gpt-6-astra session=01a0dff1-8b1b-7a72-9784-a019b75c5c5d date=2026-09-27 -->
# code-review — status-last-recorded (round 1)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript.

Review target: `feature/status-last-recorded`, including uncommitted changes. Intended report: `apriori/changes/status-last-recorded/review/code-review-v1.md`.

Not saved: this session is read-only. Per RUNBOOK §1 R2, the producer can land this output verbatim, recorded on behalf of the reviewer.

**Substantive findings**

1. **Timestamp-only first lines are incorrectly excluded.**  
   [lib/flow.js:256](/root/terra/wt-e/lib/flow.js:256) applies `DATED_RE`, which requires additional text after the timestamp **on the first line**. The contract requires a qualifying first token, without that restriction. For example:

   ```text
   gates:
     - 2026-09-27T11:00
       owner: evidence-accept X
   ```

   The existing structured reader joins the continuation and recognizes the owner entry. `lastRecorded` nevertheless returns `null`; with an older ordinary entry present, it reports that older time instead. This affects list, detail, and JSON output.

   **Risk:** valid recorded entries silently disappear from the latest-time calculation. ST-41..43 only exercise timestamps with same-line payloads and miss this boundary.

   **Suggested fix:** validate the first token directly without importing `lastGate`’s same-line payload requirement. Preserve existing `lastGate` behavior.

2. **Successful legacy-bundle detail views omit the required unknown time.**  
   [lib/status.js:126](/root/terra/wt-e/lib/status.js:126) returns early for a leftover `hotfix-state.md` bundle without flow-state, before the new line at [lib/status.js:162](/root/terra/wt-e/lib/status.js:162). `guardedResolve` explicitly permits this case, so it is a successful detail view, not an error envelope.

   Its list and JSON views carry `unknown (no flow-state)` and the corresponding object, but `--change` prints neither the time nor its source. Archived legacy bundles have the same early return.

   **Risk:** the promised cross-surface behavior fails precisely on a missing-flow-state boundary.

   **Suggested fix:** include the last-recorded line on successful legacy detail paths while preserving their migration/history messages and judgments.

**Surfaces examined**

- Shared structural parsing: fences, comments, continuations, block termination, and repeated gates blocks. Repeated blocks are read by both readers and separately diagnosed; this change introduces no distinct bypass.
- Date/time bounds, compact-time normalization, lexical ordering, and day-only ordering.
- List/detail formatting; JSON success, resolver, strict-parser, and exception constructors; F5/JC assertions.
- EN/CN additions agree. No new clock comparison, staleness judgment, gate/archive/authorization change, or RUNBOOK/template modification found.
- LG-1 is independent because `lastGate` remains unchanged. JP-1’s immediate-exit mechanism also exists at `v6-dev`; neither follow-up requires changing this approach.

**Limits and advisories**

The findings follow from static code paths. I did not compile, add tests, rerun the reported 856-test suite, or independently inspect the real-corpus snapshot. The attempted in-memory probe was prevented by the sandbox’s heredoc temporary-file restriction; that is not a product finding. Credentials, human-note files, and raw review transcripts were not read.

No separate advisory findings. The approach does not require escalation or splitting; the two implementation gaps require correction.

VERDICT: 2 issues open
