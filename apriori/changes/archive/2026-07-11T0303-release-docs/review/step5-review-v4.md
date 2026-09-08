**Resolution Check**

RD-1 is verified. `SECURITY.md` now states the per-command behavior accurately, and `lib/doctor.js` now containment-checks every D7 `flow-state.md` read before reading it:

- Active changes: `containsReal(changesRoot, fp)` runs before `readFileSync`; escaping `flow-state.md` becomes a D7 finding and is not read.
- Archived changes: both the archived directory and its `flow-state.md` are checked against `archRoot`; escaping entries are reported as skip notes and not read.
- The added test proves a symlinked active `flow-state.md` containing `leak-me` does not leak into doctor output.

**New Gaps**

No new spec-vs-code or doc-vs-code inaccuracies found.

**Advisories**

No new advisory items.

| ID | Issue | Risk | Round found | Status |
|---|---|---|---|---|
| RD-1 | SECURITY.md overstated containment; later reopened for doctor skip-vs-exit wording and then per-file doctor `flow-state.md` reads. | Over-claiming in a security document. | STEP5·r1 | verified |

VERDICT: no spec-vs-code gaps
