<!-- provenance: provider=codex model=gpt-6-astra session=01a0dff1-8b1b-7a72-9784-a019b75c5c5d date=2026-09-27 -->
# code-review — status-last-recorded (round 2)

> recorded on behalf of the reviewer (read-only sandbox, R2): body below is verbatim from the raw transcript.

Round 2 review of `status-last-recorded`. Intended path: `apriori/changes/status-last-recorded/review/code-review-v2.md`.

Read-only handoff: the producer should land this report verbatim, recorded on behalf of the reviewer.

**Round-1 findings**

1. **ADDRESSED — timestamp-only first lines.**  
   `lastRecorded` now validates the first token directly, without `DATED_RE`. The continuation-payload regression asserts both owner-reader recognition and the correct latest timestamp, with an older entry present. A separate assertion covers a bare day-only stamp. These assertions would fail against the round-1 implementation. `lastGate` and its existing filter remain unchanged.

2. **ADDRESSED — missing time on legacy detail paths.**  
   `formatOne` now includes the shared last-recorded line before both legacy-path early returns, and on the ordinary no-state and normal-state paths. The new entry-point test checks successful active and archived legacy detail views, their existing messages, the unknown-time/source line, and the active legacy JSON object.

**Affected scope reviewed**

Re-read the committed comparison and working-tree changes, including the untracked test and delta spec. Traced the fixes through shared gates parsing, status construction, resolution, formatting, and JSON output. Date/time bounds and ordering remain intact; continuation text cannot supply a replacement timestamp. No gate, archive, authorization, or clock-comparison behavior changed.

The delta and EN/CN documentation agree with the fixes. LG-1 and JP-1 remain independent follow-ups; neither is needed to complete this delivery.

**New substantive findings:** none.  
**Advisories:** none.

This verdict rests on static inspection of implementation and test assertions. I did not rerun the reported 857-test suite, verify/check commands, or corpus comparison; those results remain producer-reported. No credentials, human-note files, or raw review transcripts were read.

VERDICT: no spec-vs-code gaps
