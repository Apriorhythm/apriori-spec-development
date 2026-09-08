# Proposal — delta-consumption

**WHY.** parseDeltaStrict splits on known headings only: a misspelled `## ADDDED` section's requirements get silently absorbed into the previous bucket with problems=[] (reproduced verbatim; GPT-5.6 second review, defect #1 — "最值得优先修的代码问题"). A parser feeding two fail-closed gates must consume its whole input.

**WHAT.** Sequential fully-consuming parser: every line belongs to a legal construct or is a line-numbered problem (unrecognized h2s never absorbed; structure never re-homed; stamp problems gain line numbers). Rider: README cheat-sheet archive row gains "(up to the commit point)" (P0-5).

**OUT OF SCOPE.** TAP plan validation (P0-2), store-parser changes, new delta syntax.

Requirement: requirement/req-final.md (3 P1 rounds; DC-1..3 verified).
